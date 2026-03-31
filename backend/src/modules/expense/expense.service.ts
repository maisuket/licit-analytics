import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CacheService } from 'src/shared/cache/cache.service';
import { CompanyService } from '../company/company.service';
import { DATA_PROVIDER_TOKEN } from '../data-provider/interfaces/data-provider.interface';
import type { IDataProvider } from '../data-provider/interfaces/data-provider.interface';
import { ImportExpenseDto } from './dto/import-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    @Inject(DATA_PROVIDER_TOKEN) private readonly dataProvider: IDataProvider,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly companyService: CompanyService,
  ) {}

  async executeImport(dto: ImportExpenseDto) {
    const company = await this.companyService.createOrFind({
      cnpj: dto.cnpj,
      name: 'Empresa em Processamento',
    });

    const rawExpenses = await this.dataProvider.fetchExpensesByCnpjAndYear(
      dto.cnpj,
      dto.year,
    );

    if (!rawExpenses || rawExpenses.length === 0) return { count: 0 };

    const expensesToCreate = rawExpenses.map((raw) => ({
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

    return { count: result.count };
  }

  async findByCompanyCnpj(cnpj: string, query: QueryExpenseDto) {
    const company = await this.companyService.findByCnpj(cnpj);

    // 1. Configuração da Paginação
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    // 2. Construção dinâmica dos filtros
    const where: any = { companyId: company.id };

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
