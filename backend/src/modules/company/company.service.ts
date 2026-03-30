import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Company } from '@prisma/client';

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma nova empresa ou retorna a existente se o CNPJ já estiver registado
   */
  async createOrFind(data: CreateCompanyDto): Promise<Company> {
    this.logger.debug(
      `A verificar existência da empresa com CNPJ: ${data.cnpj}`,
    );

    const existingCompany = await this.prisma.company.findUnique({
      where: { cnpj: data.cnpj },
    });

    if (existingCompany) {
      this.logger.debug(
        `Empresa já existente encontrada: ${existingCompany.id}`,
      );
      return existingCompany;
    }

    this.logger.log(`A criar nova empresa: ${data.name} (${data.cnpj})`);
    return this.prisma.company.create({
      data: {
        cnpj: data.cnpj,
        name: data.name,
      },
    });
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
