import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CompanyService } from '../company/company.service';
import { AnalysisSummaryDto } from './dto/analysis-summary.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { TipoDespesa } from '@prisma/client';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
  ) {}

  /**
   * Mantemos o método original para relatórios BI / Excel
   */
  async getCompanySummary(cnpj: string): Promise<AnalysisSummaryDto> {
    this.logger.log(`A gerar resumo analítico para o CNPJ: ${cnpj}`);

    const company = await this.companyService.findByCnpj(cnpj);

    // 1. Agregações de Valores por Tipo
    const aggregations = await this.prisma.expense.groupBy({
      by: ['tipo'],
      where: { companyId: company.id },
      _sum: {
        valor: true,
      },
    });

    const getSum = (tipo: TipoDespesa) =>
      Number(aggregations.find((a) => a.tipo === tipo)?._sum.valor || 0);

    const totalEmpenhado = getSum(TipoDespesa.EMPENHO);
    const totalLiquidado = getSum(TipoDespesa.LIQUIDACAO);
    const totalPago = getSum(TipoDespesa.PAGAMENTO);

    // 2. Ranking de Órgãos (Top 5)
    const topOrgaosRaw = await this.prisma.expense.groupBy({
      by: ['orgao'],
      where: {
        companyId: company.id,
        tipo: TipoDespesa.EMPENHO, // Ranking baseado no valor empenhado (contratado)
      },
      _sum: {
        valor: true,
      },
      orderBy: {
        _sum: {
          valor: 'desc',
        },
      },
      take: 5,
    });

    const topOrgaos = topOrgaosRaw.map((item) => ({
      orgao: item.orgao,
      total: Number(item._sum.valor || 0),
    }));

    return {
      cnpj: company.cnpj,
      totalEmpenhado,
      totalLiquidado,
      totalPago,
      saldoAPagar: totalEmpenhado - totalPago,
      topOrgaos,
    };
  }

  /**
   * NOVO: Retorna os dados perfeitamente formatados para o frontend Next.js (App.tsx)
   */
  async getDashboardData(cnpj: string): Promise<DashboardResponseDto> {
    this.logger.log(`A gerar dados do Dashboard para CNPJ: ${cnpj}`);

    let company;
    try {
      company = await this.companyService.findByCnpj(cnpj);
    } catch (error) {
      throw new NotFoundException(
        'Empresa não encontrada ou ainda não importada.',
      );
    }

    // Busca Empenhos
    const empenhos = await this.prisma.expense.findMany({
      where: { companyId: company.id, tipo: TipoDespesa.EMPENHO },
      orderBy: { data: 'desc' },
    });

    // NOVO: Busca Contratos (Ordenados pelo maior valor)
    const contratos = await this.prisma.contract.findMany({
      where: { companyId: company.id },
      orderBy: { valorFinal: 'desc' },
    });

    // Cálculos de Estatísticas
    const totalEmpenhadoNum = empenhos.reduce(
      (acc, curr) => acc + Number(curr.valor),
      0,
    );
    const empenhosAtivos = empenhos.length;
    const ultimaAtualizacao =
      empenhos.length > 0
        ? empenhos.reduce((a, b) => (a.data > b.data ? a : b)).data
        : new Date();

    // Utilitários de Formatação
    const formatCnpj = (v: string) =>
      v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    const formatCurrency = (v: number) =>
      v.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    const formatDate = (d: Date) => d.toLocaleDateString('pt-BR');
    const formatDateTime = (d: Date) => {
      const isToday = new Date().toDateString() === d.toDateString();
      const time = d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return isToday ? `Hoje, ${time}` : `${formatDate(d)}, ${time}`;
    };

    // Mapeamento dos Empenhos
    const dashboardEmpenhos = empenhos.map((emp) => ({
      id: emp.id,
      numeroEmpenho: emp.numeroDocumento,
      dataEmissao: formatDate(emp.data),
      valorOriginal: formatCurrency(Number(emp.valor)),
      processo: emp.numeroProcesso ?? null,
      elemento: emp.elementoDespesa ?? null,
      observacao: emp.descricao ?? null,
      favorecido: {
        nome: company.name,
        cnpjFormatado: formatCnpj(company.cnpj),
      },
      unidadeGestora: {
        nome: emp.unidadeGestora || emp.orgao,
        orgaoSuperior: emp.orgaoSuperior ?? null,
      },
    }));

    // Mapeamento dos Contratos
    const dashboardContratos = contratos.map((c) => ({
      id: c.id,
      numero: c.numero,
      objeto: c.objeto,
      dataAssinatura: c.dataAssinatura ? formatDate(c.dataAssinatura) : 'N/A',
      vigencia: `${c.dataInicioVigencia ? formatDate(c.dataInicioVigencia) : '?'} até ${c.dataFimVigencia ? formatDate(c.dataFimVigencia) : '?'}`,
      valorFinal: formatCurrency(Number(c.valorFinal)),
      situacao: c.situacao,
      orgao: c.unidadeGestora,
    }));

    return {
      stats: {
        totalEmpenhado: `R$ ${formatCurrency(totalEmpenhadoNum)}`,
        empenhosAtivos: empenhosAtivos.toString().padStart(2, '0'),
        ultimaAtualizacao: formatDateTime(ultimaAtualizacao),
      },
      empenhos: dashboardEmpenhos,
      contratos: dashboardContratos, // RETORNA PARA O FRONTEND
    };
  }
}
