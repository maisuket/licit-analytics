import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, Company } from '@prisma/client';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { QueryCompanyDto } from './dto/query-company.dto';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma nova empresa ou retorna a existente se o CNPJ já estiver registado.
   * Usa upsert para ser seguro sob concorrência (dois jobs simultâneos para o mesmo CNPJ).
   */
  async createOrFind(data: CreateCompanyDto): Promise<Company> {
    this.logger.debug(`Upsert de empresa com CNPJ: ${data.cnpj}`);

    return this.prisma.company.upsert({
      where: { cnpj: data.cnpj },
      update: {},
      create: {
        cnpj: data.cnpj,
        name: data.name,
      },
    });
  }

  /**
   * Lista todas as empresas com paginação e pesquisa flexível
   */
  async findAll(query: QueryCompanyDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CompanyWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search } },
      ];
    }

    // Transação paralela para máxima performance no PostgreSQL/SQLite
    const [data, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }, // Ordena alfabeticamente por padrão
        include: {
          _count: {
            select: { expenses: true, contracts: true },
          },
        },
      }),
      this.prisma.company.count({ where }),
    ]);

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

  /**
   * Procura uma empresa pelo CNPJ, incluindo um resumo das suas despesas e contratos
   */
  async findByCnpj(cnpj: string): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { cnpj },
      include: {
        // Incluímos contadores para o resumo
        _count: {
          select: {
            expenses: true,
            contracts: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException(
        `Empresa com CNPJ ${cnpj} não encontrada na nossa base de dados.`,
      );
    }

    return company;
  }
}
