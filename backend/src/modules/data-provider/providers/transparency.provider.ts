import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TipoDespesa } from '@prisma/client';
import {
  IDataProvider,
  RawExpenseData,
  RawContractData,
  RawContractDocument,
  DespesaFase,
  DESPESA_FASE_MAP,
} from '../interfaces/data-provider.interface';

@Injectable()
export class TransparencyApiProvider implements IDataProvider {
  private readonly logger = new Logger(TransparencyApiProvider.name);
  private readonly baseUrl =
    'https://api.portaldatransparencia.gov.br/api-de-dados';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Busca documentos de despesa por CNPJ, Ano e Fase.
   * fase=1 → Empenhos | fase=2 → Liquidações | fase=3 → Pagamentos
   */
  async fetchExpensesByCnpjAndYear(
    cnpj: string,
    year: number,
    fase: DespesaFase = 1,
    pagina: number = 1,
  ): Promise<RawExpenseData[]> {
    const apiKey = this.configService.get<string>('TRANSPARENCY_API_KEY');
    if (!apiKey) {
      throw new HttpException(
        'API Key ausente.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const faseName =
      fase === 1 ? 'EMPENHOS' : fase === 2 ? 'LIQUIDAÇÕES' : 'PAGAMENTOS';

    try {
      this.logger.log(
        `Buscando ${faseName} no Portal | CNPJ: ${cnpj} | Ano: ${year} | Página: ${pagina}`,
      );

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/despesas/documentos-por-favorecido`,
          {
            params: { codigoPessoa: cnpj, ano: year, fase, pagina },
            headers: { 'chave-api-dados': apiKey },
          },
        ),
      );

      const data: unknown = response.data;
      if (!Array.isArray(data)) return [];

      // Mapeamento usa `|| undefined` porque RawExpenseData define campos opcionais como
      // `string | undefined`, não `string | null` (padrão TypeScript sem DB null)
      return (data as Record<string, unknown>[]).map((item) => ({
        orgao: (item['orgao'] as string) || 'ÓRGÃO NÃO IDENTIFICADO',
        orgaoSuperior:
          (item['orgaoSuperior'] as string | undefined) || undefined,
        unidadeGestora: (item['ug'] as string | undefined) || undefined,
        tipo: DESPESA_FASE_MAP[fase],
        valor: this.parseGovernmentValue(
          item['valor'] as string | number | undefined,
        ),
        data: this.parseGovernmentDate(item['data'] as string | undefined),
        descricao: (item['observacao'] as string) || 'SEM DESCRIÇÃO',
        numeroDocumento:
          (item['documentoResumido'] as string) ||
          (item['documento'] as string) ||
          'S/N',
        numeroProcesso:
          (item['numeroProcesso'] as string | undefined) || undefined,
        elementoDespesa: (item['elemento'] as string | undefined) || undefined,
      }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Erro ao buscar ${faseName} (Página ${pagina}): ${msg}`,
      );
      return [];
    }
  }

  /**
   * Helper para converter valores monetários da API (ex: "1.250,50" -> 1250.50)
   */
  private parseGovernmentValue(value: string | number | undefined): number {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    // Remove os pontos de milhares e converte a vírgula decimal para ponto
    const stringClean = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(stringClean) || 0;
  }

  /**
   * Helper para converter datas da API (ex: "15/03/2024" -> Date object)
   */
  private parseGovernmentDate(dateStr: string | undefined): Date {
    if (!dateStr) return new Date(); // Fallback de segurança
    const [day, month, year] = dateStr.split('/');
    // Força o horário para meio-dia (UTC) para evitar problemas de fuso horário (-3h no Brasil) que mudariam o dia
    return new Date(`${year}-${month}-${day}T12:00:00Z`);
  }

  async fetchContractsByCnpj(
    cnpj: string,
    pagina: number = 1,
  ): Promise<RawContractData[]> {
    const apiKey = this.configService.get<string>('TRANSPARENCY_API_KEY');
    if (!apiKey) {
      throw new HttpException(
        'API Key ausente.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      this.logger.log(
        `A extrair CONTRATOS do Portal para CNPJ: ${cnpj} | Página: ${pagina}`,
      );

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/contratos/cpf-cnpj`, {
          params: {
            cpfCnpj: cnpj,
            pagina: pagina, // <- Parâmetro dinâmico agora
          },
          headers: { 'chave-api-dados': apiKey },
        }),
      );

      const data: unknown = response.data;
      if (!Array.isArray(data)) return [];

      return (data as Record<string, unknown>[]).map(
        (item): RawContractData => {
          const ug = item['unidadeGestora'] as
            | Record<string, unknown>
            | undefined;
          const orgaoMaximo = ug?.['orgaoMaximo'] as
            | Record<string, unknown>
            | undefined;

          return {
            id: (item['id'] as number) || 0,
            numero: (item['numero'] as string) || 'S/N',
            objeto: (item['objeto'] as string) || 'SEM DESCRIÇÃO',
            dataAssinatura: item['dataAssinatura']
              ? new Date(`${item['dataAssinatura']}T12:00:00Z`)
              : null,
            dataInicioVigencia: item['dataInicioVigencia']
              ? new Date(`${item['dataInicioVigencia']}T12:00:00Z`)
              : null,
            dataFimVigencia: item['dataFimVigencia']
              ? new Date(`${item['dataFimVigencia']}T12:00:00Z`)
              : null,
            valorInicial: (item['valorInicialCompra'] as number) || 0,
            valorFinal: (item['valorFinalCompra'] as number) || 0,
            situacao: (item['situacaoContrato'] as string) || 'Desconhecida',
            unidadeGestora:
              (ug?.['nome'] as string) || 'ÓRGÃO NÃO IDENTIFICADO',
            orgaoSuperior: (orgaoMaximo?.['nome'] as string | null) ?? null,
          };
        },
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao buscar contratos na página ${pagina}: ${msg}`);
      return [];
    }
  }

  /**
   * Busca os documentos (empenhos) vinculados a um contrato pelo seu ID numérico.
   * Endpoint: GET /contratos/documentos-relacionados?id={contractId}
   * Nota: este endpoint devolve todos os documentos de uma só vez (sem paginação).
   */
  async fetchContractDocuments(contractId: number): Promise<RawContractDocument[]> {
    const apiKey = this.configService.get<string>('TRANSPARENCY_API_KEY');
    if (!apiKey) {
      throw new HttpException(
        'API Key ausente.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      this.logger.log(
        `Buscando documentos relacionados ao contrato ID: ${contractId}`,
      );

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/contratos/documentos-relacionados`,
          {
            params: { id: contractId },
            headers: { 'chave-api-dados': apiKey },
          },
        ),
      );

      const data: unknown = response.data;
      if (!Array.isArray(data)) return [];

      return (data as Record<string, unknown>[]).map(
        (item): RawContractDocument => ({
          empenho: (item['empenho'] as string) || '',
          empenhoResumido: (item['empenhoResumido'] as string) || '',
          dataEmissao: (item['dataEmissao'] as string | null) ?? null,
          observacao: (item['observacao'] as string | null) ?? null,
          valor: this.parseGovernmentValue(
            item['valor'] as string | number | undefined,
          ),
        }),
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Erro ao buscar documentos do contrato ${contractId}: ${msg}`,
      );
      return [];
    }
  }
}
