import { Injectable, Logger, Inject } from '@nestjs/common';
import { Prisma, TipoDespesa, Expense, Contract } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { CompanyService } from '../company/company.service';
import { CorrelationService } from '../contract/services/correlation.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { AnalysisSummaryDto } from './dto/analysis-summary.dto';
import {
  ContractTimelineResponseDto,
  ContractTimelineItemDto,
  ExpenseTimelineItemDto,
  ContractTimelineFinancialSummaryDto,
} from './dto/contract-timeline-response.dto';
import { DATA_PROVIDER_TOKEN } from '../data-provider/interfaces/data-provider.interface';
import type { IDataProvider } from '../data-provider/interfaces/data-provider.interface';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
    private readonly correlationService: CorrelationService,
    @Inject(DATA_PROVIDER_TOKEN)
    private readonly dataProvider: IDataProvider,
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

    // Tenta buscar no banco local; se não existir faz fallback para a API
    let company: Prisma.CompanyGetPayload<Record<string, never>> | null = null;
    try {
      company = await this.companyService.findByCnpj(cnpj);
    } catch {
      this.logger.warn(
        `Empresa não encontrada localmente. Acionando fallback da API para CNPJ: ${cnpj}`,
      );
      return this.getDashboardDataFromPortal(cnpj);
    }

    // Busca paralela com take máximo de 500 para evitar estouro de memória
    const MAX_RECORDS = 500;
    const [empenhos, contratos] = await Promise.all([
      this.prisma.expense.findMany({
        where: { companyId: company.id, tipo: TipoDespesa.EMPENHO },
        orderBy: { data: 'desc' },
        take: MAX_RECORDS,
      }),
      this.prisma.contract.findMany({
        where: { companyId: company.id },
        orderBy: { valorFinal: 'desc' },
        take: MAX_RECORDS,
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

  // ========================================================================
  // CONTRACT TIMELINE
  // ========================================================================

  /**
   * Retorna a linha do tempo completa por contrato para um CNPJ:
   * Contratos → Empenhos vinculados → Liquidações → Pagamentos
   *
   * Se ainda houver empenhos sem contractId, executa a correlação automática antes.
   */
  async getContractTimeline(
    cnpj: string,
  ): Promise<ContractTimelineResponseDto> {
    this.logger.log(`Construindo contract-timeline para CNPJ: ${cnpj}`);

    const company = await this.companyService.findByCnpj(cnpj);

    // Verifica se há empenhos sem vínculo e tenta correlacionar
    const unlinkedCount = await this.prisma.expense.count({
      where: { companyId: company.id, contractId: null },
    });

    if (unlinkedCount > 0) {
      this.logger.log(
        `${unlinkedCount} empenho(s) sem contrato — executando correlação automática`,
      );
      await this.correlationService.correlateForCompany(company.id);
    }

    // Busca contratos com todos os empenhos/liquidações/pagamentos vinculados
    const contracts = await this.prisma.contract.findMany({
      where: { companyId: company.id },
      orderBy: { valorFinal: 'desc' },
      include: {
        expenses: {
          orderBy: { data: 'asc' },
        },
      },
    });

    // Conta empenhos ainda sem correlação após o processo
    const remainingUnlinked = await this.prisma.expense.count({
      where: { companyId: company.id, contractId: null },
    });

    const totalExpenses = await this.prisma.expense.count({
      where: { companyId: company.id },
    });

    const contratosDto: ContractTimelineItemDto[] = contracts.map(
      (contract) => {
        const empenhos = contract.expenses.filter(
          (e) => e.tipo === TipoDespesa.EMPENHO,
        );
        const liquidacoes = contract.expenses.filter(
          (e) => e.tipo === TipoDespesa.LIQUIDACAO,
        );
        const pagamentos = contract.expenses.filter(
          (e) => e.tipo === TipoDespesa.PAGAMENTO,
        );

        const totalEmpenhado = empenhos.reduce(
          (acc, e) => acc + Number(e.valorOriginal),
          0,
        );
        const totalLiquidado = liquidacoes.reduce(
          (acc, e) => acc + Number(e.valorOriginal),
          0,
        );
        const totalPago = pagamentos.reduce(
          (acc, e) => acc + Number(e.valorOriginal),
          0,
        );

        const resumoFinanceiro: ContractTimelineFinancialSummaryDto = {
          totalEmpenhado,
          totalLiquidado,
          totalPago,
          saldoAReceber: totalEmpenhado - totalPago,
          percentualLiquidado:
            totalEmpenhado > 0
              ? Math.min(1, totalLiquidado / totalEmpenhado)
              : 0,
          percentualPago:
            totalEmpenhado > 0 ? Math.min(1, totalPago / totalEmpenhado) : 0,
        };

        return {
          id: contract.id,
          numero: contract.numero,
          objeto: contract.objeto,
          dataAssinatura: contract.dataAssinatura,
          dataInicioVigencia: contract.dataInicioVigencia,
          dataFimVigencia: contract.dataFimVigencia,
          valorInicial: Number(contract.valorInicial),
          valorFinal: Number(contract.valorFinal),
          situacao: contract.situacao,
          unidadeGestora: contract.unidadeGestora,
          orgaoSuperior: contract.orgaoSuperior,
          resumoFinanceiro,
          empenhos: empenhos.map(this.mapExpenseToTimelineItem),
          liquidacoes: liquidacoes.map(this.mapExpenseToTimelineItem),
          pagamentos: pagamentos.map(this.mapExpenseToTimelineItem),
        };
      },
    );

    return {
      cnpj,
      empresa: company.name,
      totalContratos: contracts.length,
      totalEmpenhos: totalExpenses,
      empenhosSemContrato: remainingUnlinked,
      contratos: contratosDto,
    };
  }

  private mapExpenseToTimelineItem(expense: Expense): ExpenseTimelineItemDto {
    return {
      id: expense.id,
      numeroDocumento: expense.numeroDocumento,
      tipo: expense.tipo,
      orgao: expense.orgao,
      orgaoSuperior: expense.orgaoSuperior ?? null,
      unidadeGestora: expense.unidadeGestora ?? null,
      valorOriginal: Number(expense.valorOriginal),
      data: expense.data,
      numeroProcesso: expense.numeroProcesso ?? null,
      elementoDespesa: expense.elementoDespesa ?? null,
      descricao: expense.descricao,
    };
  }
}
