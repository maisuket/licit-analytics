import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TipoDespesa } from '@prisma/client';
import {
  IDataProvider,
  RawExpenseData,
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
   * Procura dados reais no Portal da Transparência
   */
  /**
   * NOVO: Aceita o parâmetro de página dinamicamente para Despesas/Empenhos
   */
  async fetchExpensesByCnpjAndYear(
    cnpj: string,
    year: number,
    pagina: number = 1,
  ): Promise<RawExpenseData[]> {
    const apiKey = this.configService.get<string>('PORTAL_API_KEY');
    if (!apiKey)
      throw new HttpException(
        'API Key ausente.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    try {
      this.logger.log(
        `A extrair EMPENHOS do Portal para CNPJ: ${cnpj} (Ano: ${year}) | Página: ${pagina}`,
      );

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/despesas/documentos-por-favorecido`,
          {
            // O parâmetro pagina agora é injetado dinamicamente na requisição
            params: { codigoPessoa: cnpj, ano: year, fase: 1, pagina: pagina },
            headers: { 'chave-api-dados': apiKey },
          },
        ),
      );

      const data = response.data;
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => {
        let tipoDespesa: TipoDespesa = TipoDespesa.EMPENHO;
        if (item.fase === 'Liquidação') tipoDespesa = TipoDespesa.LIQUIDACAO;
        if (item.fase === 'Pagamento') tipoDespesa = TipoDespesa.PAGAMENTO;

        return {
          orgao: item.orgao || 'ÓRGÃO NÃO IDENTIFICADO',
          orgaoSuperior: item.orgaoSuperior || null,
          unidadeGestora: item.ug || null,
          tipo: tipoDespesa,
          valor: this.parseGovernmentValue(item.valor),
          data: this.parseGovernmentDate(item.data),
          descricao: item.observacao || 'SEM DESCRIÇÃO',
          numeroDocumento: item.documentoResumido || item.documento || 'S/N',
          numeroProcesso: item.numeroProcesso || null,
          elementoDespesa: item.elemento || null,
        };
      });
    } catch (error: any) {
      this.logger.error(
        `Erro na integração de empenhos (Página ${pagina}): ${error.message}`,
      );
      // Tal como nos contratos, retornamos array vazio para que o loop de paginação no Service termine em segurança
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

  async fetchContractsByCnpj(cnpj: string, pagina: number = 1): Promise<any[]> {
    const apiKey = this.configService.get<string>('PORTAL_API_KEY');

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

      const data = response.data;
      if (!Array.isArray(data)) return [];

      return data.map((item: any) => ({
        numero: item.numero || 'S/N',
        objeto: item.objeto || 'SEM DESCRIÇÃO',
        dataAssinatura: item.dataAssinatura
          ? new Date(`${item.dataAssinatura}T12:00:00Z`)
          : null,
        dataInicioVigencia: item.dataInicioVigencia
          ? new Date(`${item.dataInicioVigencia}T12:00:00Z`)
          : null,
        dataFimVigencia: item.dataFimVigencia
          ? new Date(`${item.dataFimVigencia}T12:00:00Z`)
          : null,
        valorInicial: item.valorInicialCompra || 0,
        valorFinal: item.valorFinalCompra || 0,
        situacao: item.situacaoContrato || 'Desconhecida',
        unidadeGestora: item.unidadeGestora?.nome || 'ÓRGÃO NÃO IDENTIFICADO',
        orgaoSuperior: item.unidadeGestora?.orgaoMaximo?.nome || null,
      }));
    } catch (error: any) {
      this.logger.error(
        `Erro ao buscar contratos na página ${pagina}: ${error.message}`,
      );
      // Em vez de falhar completamente, retornamos array vazio para encerrar a paginação graciosamente
      return [];
    }
  }
}
