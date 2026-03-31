import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CompanyService } from '../company/company.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { AnalysisSummaryDto } from './dto/analysis-summary.dto';
import { TipoDespesa, Expense, Contract } from '@prisma/client';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
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
      take: 5, // Traz apenas o Top 5 órgãos que mais dão receita
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
      company = await this.companyService.findByCnpj(cnpj);
    } catch (error) {
      throw new NotFoundException(
        'Empresa não encontrada ou ainda não importada.',
      );
    }

    // Busca paralela para otimizar tempo de resposta
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

    // Obtém a data mais recente de criação de forma otimizada
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
