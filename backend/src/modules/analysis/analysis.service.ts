import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CompanyService } from '../company/company.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { AnalysisSummaryDto } from './dto/analysis-summary.dto';
import { TipoDespesa, Expense, Contract } from '@prisma/client';
import * as crypto from 'crypto'; // Usado para gerar IDs temporários para o frontend
// ATENÇÃO: Ajuste o caminho abaixo conforme sua estrutura
import { DATA_PROVIDER_TOKEN } from '../data-provider/interfaces/data-provider.interface';
import type { IDataProvider } from '../data-provider/interfaces/data-provider.interface';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
    @Inject(DATA_PROVIDER_TOKEN)
    private readonly dataProvider: IDataProvider, // Injeção do provider da Transparência
  ) {}

  async getCompanySummary(cnpj: string): Promise<AnalysisSummaryDto> {
    const company = await this.companyService.findByCnpj(cnpj);

    const aggregations = await this.prisma.expense.groupBy({
      by: ['tipo'],
      where: { companyId: company.id },
      _sum: { valorOriginal: true },
    });

    const totalEmpenhado = Number(
      aggregations.find((a) => a.tipo === TipoDespesa.EMPENHO)?._sum
        .valorOriginal || 0,
    );
    const totalLiquidado = Number(
      aggregations.find((a) => a.tipo === TipoDespesa.LIQUIDACAO)?._sum
        .valorOriginal || 0,
    );
    const totalPago = Number(
      aggregations.find((a) => a.tipo === TipoDespesa.PAGAMENTO)?._sum
        .valorOriginal || 0,
    );

    const topOrgaosData = await this.prisma.expense.groupBy({
      by: ['orgao'],
      where: { companyId: company.id, tipo: TipoDespesa.EMPENHO },
      _sum: { valorOriginal: true },
      orderBy: { _sum: { valorOriginal: 'desc' } },
      take: 5,
    });

    const topOrgaos = topOrgaosData.map((item) => ({
      orgao: item.orgao,
      total: Number(item._sum.valorOriginal || 0),
    }));

    return {
      cnpj,
      totalEmpenhado,
      totalLiquidado,
      totalPago,
      saldoAPagar: totalEmpenhado - totalPago,
      topOrgaos,
    };
  }

  async getDashboardData(cnpj: string): Promise<DashboardResponseDto> {
    this.logger.log(
      `A extrair e formatar dados do Dashboard BI para CNPJ: ${cnpj}`,
    );

    let company;
    try {
      // 1. Tenta buscar no banco local
      company = await this.companyService.findByCnpj(cnpj);
    } catch (error) {
      // 2. FALLBACK: Se não achar, busca direto na API da transparência!
      this.logger.warn(
        `Empresa não encontrada no Postgre. Acionando Fallback da API para CNPJ: ${cnpj}`,
      );
      return this.getDashboardDataFromPortal(cnpj);
    }

    // Busca paralela para otimizar tempo de resposta (Banco Local)
    const [empenhos, contratos] = await Promise.all([
      this.prisma.expense.findMany({
        where: { companyId: company.id, tipo: TipoDespesa.EMPENHO },
        orderBy: { data: 'desc' },
      }),
      this.prisma.contract.findMany({
        where: { companyId: company.id },
        orderBy: { valorFinal: 'desc' },
      }),
    ]);

    const totalEmpenhadoNum = empenhos.reduce(
      (acc, curr) => acc + Number(curr.valorOriginal),
      0,
    );
    const empenhosAtivos = empenhos.length;

    const ultimaAtualizacao =
      empenhos.length > 0
        ? new Date(Math.max(...empenhos.map((e) => e.createdAt.getTime())))
        : new Date();

    const dashboardEmpenhos = empenhos.map((emp) =>
      this.mapExpenseToDashboard(emp, company.name, company.cnpj),
    );
    const dashboardContratos = contratos.map((c) =>
      this.mapContractToDashboard(c),
    );

    return {
      stats: {
        totalEmpenhado: `R$ ${this.formatCurrency(totalEmpenhadoNum)}`,
        empenhosAtivos: empenhosAtivos.toString().padStart(2, '0'),
        ultimaAtualizacao: this.formatDateTime(ultimaAtualizacao),
      },
      empenhos: dashboardEmpenhos,
      contratos: dashboardContratos,
    };
  }

  // ========================================================================
  // FALLBACK API (Busca em Tempo Real no Portal da Transparência)
  // ========================================================================

  private async getDashboardDataFromPortal(
    cnpj: string,
  ): Promise<DashboardResponseDto> {
    const year = new Date().getFullYear();

    // Fazemos apenas 1 requisição da primeira página para retornar rápido ao frontend.
    // O ideal posteriormente é criar um job de importação para salvar tudo no Postgres.
    const [rawExpenses, rawContracts] = await Promise.all([
      this.dataProvider.fetchExpensesByCnpjAndYear(cnpj, year, 1),
      this.dataProvider.fetchContractsByCnpj(cnpj, 1),
    ]);

    const empenhosApi = rawExpenses.filter(
      (e) => e.tipo === TipoDespesa.EMPENHO,
    );

    const totalEmpenhadoNum = empenhosApi.reduce(
      (acc, curr) => acc + Number(curr.valor),
      0,
    );

    const dashboardEmpenhos = empenhosApi.map((emp) => ({
      id: emp.numeroDocumento || crypto.randomUUID(),
      numeroEmpenho: emp.numeroDocumento,
      dataEmissao: this.formatDate(emp.data),
      valorOriginal: this.formatCurrency(Number(emp.valor)),
      processo: emp.numeroProcesso ?? null,
      elemento: emp.elementoDespesa ?? null,
      observacao: emp.descricao ?? null,
      favorecido: {
        nome: 'Razão Social Indisponível (Busca via API)', // API não retorna o nome diretamente nesta rota
        cnpjFormatado: this.formatCnpj(cnpj),
      },
      unidadeGestora: {
        nome: emp.unidadeGestora || emp.orgao,
        orgaoSuperior: emp.orgaoSuperior ?? null,
      },
    }));

    const dashboardContratos = rawContracts.map((c) => {
      const vigenciaInicio = c.dataInicioVigencia
        ? this.formatDate(c.dataInicioVigencia)
        : '?';
      const vigenciaFim = c.dataFimVigencia
        ? this.formatDate(c.dataFimVigencia)
        : '?';

      return {
        id: c.numero || crypto.randomUUID(),
        numero: c.numero,
        objeto: c.objeto,
        dataAssinatura: c.dataAssinatura
          ? this.formatDate(c.dataAssinatura)
          : 'N/A',
        vigencia: `${vigenciaInicio} até ${vigenciaFim}`,
        valorFinal: this.formatCurrency(Number(c.valorFinal)),
        situacao: c.situacao,
        orgao: c.unidadeGestora || 'Órgão não especificado',
      };
    });

    return {
      stats: {
        totalEmpenhado: `R$ ${this.formatCurrency(totalEmpenhadoNum)}`,
        empenhosAtivos: empenhosApi.length.toString().padStart(2, '0'),
        ultimaAtualizacao: this.formatDateTime(new Date()) + ' (API Gov)',
      },
      empenhos: dashboardEmpenhos,
      contratos: dashboardContratos,
    };
  }

  // ========================================================================
  // UTILS & FORMATTERS (Encapsulados para Clean Code)
  // ========================================================================

  private mapExpenseToDashboard(
    emp: Expense,
    companyName: string,
    cnpj: string,
  ) {
    return {
      id: emp.id,
      numeroEmpenho: emp.numeroDocumento,
      dataEmissao: this.formatDate(emp.data),
      valorOriginal: this.formatCurrency(Number(emp.valorOriginal)),
      processo: emp.numeroProcesso ?? null,
      elemento: emp.elementoDespesa ?? null,
      observacao: emp.descricao ?? null,
      favorecido: {
        nome: companyName,
        cnpjFormatado: this.formatCnpj(cnpj),
      },
      unidadeGestora: {
        nome: emp.unidadeGestora || emp.orgao,
        orgaoSuperior: emp.orgaoSuperior ?? null,
      },
    };
  }

  private mapContractToDashboard(c: Contract) {
    const vigenciaInicio = c.dataInicioVigencia
      ? this.formatDate(c.dataInicioVigencia)
      : '?';
    const vigenciaFim = c.dataFimVigencia
      ? this.formatDate(c.dataFimVigencia)
      : '?';

    return {
      id: c.id,
      numero: c.numero,
      objeto: c.objeto,
      dataAssinatura: c.dataAssinatura
        ? this.formatDate(c.dataAssinatura)
        : 'N/A',
      vigencia: `${vigenciaInicio} até ${vigenciaFim}`,
      valorFinal: this.formatCurrency(Number(c.valorFinal)),
      situacao: c.situacao,
      orgao: c.unidadeGestora || 'Órgão não especificado',
    };
  }

  private formatCnpj(v: string): string {
    return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  private formatCurrency(v: number): string {
    return v.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private formatDate(d: Date): string {
    return d.toLocaleDateString('pt-BR');
  }

  private formatDateTime(d: Date): string {
    const isToday = new Date().toDateString() === d.toDateString();
    const time = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return isToday ? `Hoje, ${time}` : `${this.formatDate(d)}, ${time}`;
  }
}
