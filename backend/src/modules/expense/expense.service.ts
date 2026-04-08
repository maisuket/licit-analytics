import { Injectable, Inject, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CompanyService } from '../company/company.service';
import {
  DATA_PROVIDER_TOKEN,
  DespesaFase,
  RawExpenseData,
} from '../data-provider/interfaces/data-provider.interface';
import type { IDataProvider } from '../data-provider/interfaces/data-provider.interface';
import { ImportExpenseDto } from './dto/import-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

const ALL_PHASES: DespesaFase[] = [1, 2, 3];

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    @Inject(DATA_PROVIDER_TOKEN) private readonly dataProvider: IDataProvider,
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
  ) {}

  /**
   * Busca todas as páginas de uma fase até a API retornar vazio.
   */
  private async fetchAllPagesForPhase(
    cnpj: string,
    year: number,
    fase: DespesaFase,
  ): Promise<RawExpenseData[]> {
    const all: RawExpenseData[] = [];
    let page = 1;

    while (true) {
      const chunk = await this.dataProvider.fetchExpensesByCnpjAndYear(
        cnpj,
        year,
        fase,
        page,
      );

      if (!chunk || chunk.length === 0) break;

      all.push(...chunk);
      page++;

      // Throttle para evitar rate limiting da API do governo
      await new Promise((r) => setTimeout(r, 500));
    }

    return all;
  }

  /**
   * Importa Empenhos, Liquidações e Pagamentos para um CNPJ/Ano.
   * Busca todas as páginas de cada fase e persiste no banco (skipDuplicates).
   */
  async executeImport(dto: ImportExpenseDto): Promise<{ count: number; byPhase: Record<string, number> }> {
    const company = await this.companyService.createOrFind({
      cnpj: dto.cnpj,
      name: 'Empresa em Processamento',
    });

    const byPhase: Record<string, number> = { empenhos: 0, liquidacoes: 0, pagamentos: 0 };
    const phaseNames: Record<DespesaFase, string> = { 1: 'empenhos', 2: 'liquidacoes', 3: 'pagamentos' };
    let totalCount = 0;

    for (const fase of ALL_PHASES) {
      this.logger.log(`Importando fase=${fase} para CNPJ: ${dto.cnpj} (${dto.year})`);

      const rawExpenses = await this.fetchAllPagesForPhase(dto.cnpj, dto.year, fase);

      if (rawExpenses.length === 0) {
        this.logger.log(`Nenhum registro na fase=${fase}`);
        continue;
      }

      const expensesToCreate: Prisma.ExpenseCreateManyInput[] = rawExpenses.map((raw) => ({
        companyId: company.id,
        orgao: raw.orgao,
        orgaoSuperior: raw.orgaoSuperior,
        unidadeGestora: raw.unidadeGestora,
        tipo: raw.tipo,
        valorOriginal: raw.valor,
        data: raw.data,
        descricao: raw.descricao,
        numeroDocumento: raw.numeroDocumento,
        numeroProcesso: raw.numeroProcesso,
        elementoDespesa: raw.elementoDespesa,
      }));

      const result = await this.prisma.expense.createMany({
        data: expensesToCreate,
        skipDuplicates: true,
      });

      byPhase[phaseNames[fase]] = result.count;
      totalCount += result.count;

      this.logger.log(`Fase=${fase}: ${result.count} registros salvos.`);
    }

    return { count: totalCount, byPhase };
  }

  async findByCompanyCnpj(cnpj: string, query: QueryExpenseDto) {
    const company = await this.companyService.findByCnpj(cnpj);

    // 1. Configuração da Paginação
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    // 2. Construção dinâmica dos filtros
    const where: Prisma.ExpenseWhereInput = { companyId: company.id };

    if (search) {
      where.OR = [
        { numeroDocumento: { contains: search, mode: 'insensitive' } },
        { orgao: { contains: search, mode: 'insensitive' } },
        { descricao: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 3. Execução paralela para alta performance
    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { data: 'desc' }, // Despesas mais recentes primeiro
      }),
      this.prisma.expense.count({ where }),
    ]);

    // 4. Retorno formatado
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
