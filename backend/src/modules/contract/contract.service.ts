import { Injectable, Inject, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CompanyService } from '../company/company.service';
import {
  DATA_PROVIDER_TOKEN,
  RawContractData,
} from '../data-provider/interfaces/data-provider.interface';
// `import type` necessário por causa de isolatedModules + emitDecoratorMetadata
import type {
  IDataProvider,
} from '../data-provider/interfaces/data-provider.interface';
import { QueryContractDto } from './dto/query-contract.dto';

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(
    @Inject(DATA_PROVIDER_TOKEN) private readonly dataProvider: IDataProvider,
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
  ) {}

  /**
   * Helper privado para criar um delay (evita Rate Limit do Governo)
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async importRealContracts(cnpj: string) {
    const company = await this.companyService.findByCnpj(cnpj);

    let allRawContracts: RawContractData[] = [];
    let currentPage = 1;
    let hasMorePages = true;

    this.logger.log(
      `Iniciando varredura paginada de contratos para ${cnpj}...`,
    );

    // LOOP DE PAGINAÇÃO
    while (hasMorePages) {
      // 1. Busca a página atual
      const pageData = await this.dataProvider.fetchContractsByCnpj(
        cnpj,
        currentPage,
      );

      // 2. Se a página vier vazia, significa que chegámos ao fim dos dados
      if (!pageData || pageData.length === 0) {
        this.logger.log(
          `Fim da paginação encontrado na página ${currentPage}.`,
        );
        hasMorePages = false;
        break;
      }

      // 3. Adiciona os dados da página ao nosso array principal
      allRawContracts = allRawContracts.concat(pageData);

      this.logger.log(
        `Página ${currentPage} coletada com sucesso (${pageData.length} contratos).`,
      );

      // 4. Prepara para a próxima página
      currentPage++;

      // 5. THROTTLE (Toque de Sênior): Espera 1 segundo antes do próximo loop
      // para evitar banimento por "429 Too Many Requests" do WAF do Serpro/Governo.
      await this.sleep(1000);
    }

    // Se não encontrou contratos em nenhuma página, encerra.
    if (allRawContracts.length === 0) return { count: 0, linked: 0 };

    // Mapeia RawContractData para o formato esperado pelo Prisma
    const contractsToCreate: Prisma.ContractCreateManyInput[] = allRawContracts.map((raw) => ({
      companyId: company.id,
      externalId: raw.id > 0 ? raw.id : null,
      numero: raw.numero,
      objeto: raw.objeto,
      dataAssinatura: raw.dataAssinatura,
      dataInicioVigencia: raw.dataInicioVigencia,
      dataFimVigencia: raw.dataFimVigencia,
      valorInicial: raw.valorInicial,
      valorFinal: raw.valorFinal,
      situacao: raw.situacao,
      unidadeGestora: raw.unidadeGestora,
      orgaoSuperior: raw.orgaoSuperior,
    }));

    this.logger.log(
      `Atualizando base de dados com ${contractsToCreate.length} contratos coletados no total.`,
    );

    // Transação: Deleta os antigos e insere todos os novos de uma vez
    await this.prisma.$transaction(async (tx) => {
      await tx.contract.deleteMany({ where: { companyId: company.id } });
      await tx.contract.createMany({ data: contractsToCreate });
    });

    // ─── Etapa 2: Vincular empenhos aos contratos via documentos relacionados ───
    this.logger.log(
      `Iniciando vinculação de empenhos via documentos relacionados...`,
    );

    const savedContracts = await this.prisma.contract.findMany({
      where: { companyId: company.id, externalId: { not: null } },
      select: { id: true, externalId: true },
    });

    let linkedCount = 0;

    for (const contract of savedContracts) {
      if (!contract.externalId) continue;

      let docPage = 1;
      let hasMoreDocs = true;

      while (hasMoreDocs) {
        const documents = await this.dataProvider.fetchContractDocuments(
          contract.externalId,
          docPage,
        );

        if (!documents || documents.length === 0) {
          hasMoreDocs = false;
          break;
        }

        for (const doc of documents) {
          if (!doc.empenhoResumido) continue;

          // Correlação exata pelo número resumido do empenho
          const updated = await this.prisma.expense.updateMany({
            where: {
              companyId: company.id,
              numeroDocumento: doc.empenhoResumido,
              contractId: null, // Não sobrescreve vínculos já existentes
            },
            data: {
              contractId: contract.id,
              correlationScore: 1.0,
              correlationStrategy: 'exact_document',
            },
          });

          linkedCount += updated.count;
        }

        docPage++;
        await this.sleep(500); // Throttle entre chamadas de documentos
      }

      await this.sleep(500); // Throttle entre contratos
    }

    this.logger.log(
      `Vinculação concluída: ${linkedCount} empenho(s) correlacionado(s) a contratos.`,
    );

    return { count: contractsToCreate.length, linked: linkedCount };
  }

  async findByCompanyCnpj(cnpj: string, query: QueryContractDto) {
    const company = await this.companyService.findByCnpj(cnpj);

    // 1. Extração da paginação com valores padrão seguros
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    // 2. Construção da cláusula de filtro (garantindo que pertence à empresa alvo)
    const where: Prisma.ContractWhereInput = { companyId: company.id };

    if (search) {
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { objeto: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 3. Transação paralela para contar o total e buscar os registos paginados
    const [data, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { valorFinal: 'desc' }, // Trazemos sempre os contratos de maior valor primeiro
      }),
      this.prisma.contract.count({ where }),
    ]);

    // 4. Retorno no formato padronizado
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
