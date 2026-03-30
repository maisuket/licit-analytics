import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CacheService } from 'src/shared/cache/cache.service';
import { CompanyService } from '../company/company.service';
import { DATA_PROVIDER_TOKEN } from '../data-provider/interfaces/data-provider.interface';
import type { IDataProvider } from '../data-provider/interfaces/data-provider.interface';
import { ImportExpenseDto } from './dto/import-expense.dto';

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

    // CORREÇÃO: Adicionando os campos enriquecidos que vêm do TransparencyApiProvider
    const expensesToCreate = rawExpenses.map((raw) => ({
      companyId: company.id,
      orgao: raw.orgao,
      orgaoSuperior: raw.orgaoSuperior, // <- Adicionado
      unidadeGestora: raw.unidadeGestora, // <- Adicionado
      tipo: raw.tipo,
      valor: raw.valor,
      data: raw.data,
      descricao: raw.descricao,
      numeroDocumento: raw.numeroDocumento,
      numeroProcesso: raw.numeroProcesso, // <- Adicionado
      elementoDespesa: raw.elementoDespesa, // <- Adicionado
    }));

    const result = await this.prisma.expense.createMany({
      data: expensesToCreate,
      skipDuplicates: true,
    });

    // Como importámos novos dados, limpamos o cache do dashboard para esta empresa
    // para que o frontend busque dados frescos na próxima requisição!
    return { count: result.count };
  }

  async findByCompanyCnpj(cnpj: string) {
    const company = await this.companyService.findByCnpj(cnpj);
    return this.prisma.expense.findMany({
      where: { companyId: company.id },
      orderBy: { data: 'desc' },
    });
  }
}
