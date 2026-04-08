import { Injectable, Logger } from '@nestjs/common';
import { Contract, Expense } from '@prisma/client';
import { PrismaService } from '../../../shared/infra/database/prisma.service';
import { SimilarityUtil } from '../../../shared/utils/similarity.util';

/**
 * Estratégias de correlação, em ordem de confiabilidade.
 * Quanto mais alto o score, mais confiante é o vínculo.
 */
export enum CorrelationStrategy {
  EXACT_PROCESS = 'exact_process',   // numeroProcesso contém o número do contrato → score 1.0
  SUBSTRING     = 'substring',       // número do contrato aparece na descrição → score 0.85
  FUZZY         = 'fuzzy',           // similaridade de bigrams ≥ threshold → score variável
}

export interface CorrelationResult {
  expenseId: string;
  contractId: string;
  strategy: CorrelationStrategy;
  score: number;
}

// Threshold mínimo para aceitar correlação fuzzy (0–1)
const FUZZY_THRESHOLD = 0.75;

@Injectable()
export class CorrelationService {
  private readonly logger = new Logger(CorrelationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa a correlação completa para uma empresa:
   * 1. Busca todos os contratos da empresa
   * 2. Busca todos os empenhos sem contractId
   * 3. Tenta correlacionar via 3 estratégias (Exact → Substring → Fuzzy)
   * 4. Persiste os vínculos encontrados no banco
   *
   * @returns Resumo com total de vínculos criados por estratégia
   */
  async correlateForCompany(companyId: string): Promise<{
    total: number;
    byStrategy: Record<CorrelationStrategy, number>;
  }> {
    this.logger.log(`Iniciando correlação para empresa: ${companyId}`);

    const [contracts, expenses] = await Promise.all([
      this.prisma.contract.findMany({ where: { companyId } }),
      this.prisma.expense.findMany({
        where: { companyId, contractId: null },
        select: {
          id: true,
          numeroDocumento: true,
          numeroProcesso: true,
          descricao: true,
          orgao: true,
        },
      }),
    ]);

    if (contracts.length === 0 || expenses.length === 0) {
      this.logger.warn(
        `Correlação ignorada: ${contracts.length} contratos / ${expenses.length} empenhos sem vínculo`,
      );
      return { total: 0, byStrategy: this.emptyByStrategy() };
    }

    this.logger.log(
      `Correlacionando ${expenses.length} empenhos contra ${contracts.length} contratos`,
    );

    const results: CorrelationResult[] = [];

    for (const expense of expenses) {
      const best = this.findBestMatch(expense, contracts);
      if (best) results.push(best);
    }

    if (results.length === 0) {
      this.logger.warn('Nenhuma correlação encontrada.');
      return { total: 0, byStrategy: this.emptyByStrategy() };
    }

    // Persistência em batch — evita N queries individuais
    await this.prisma.$transaction(
      results.map((r) =>
        this.prisma.expense.update({
          where: { id: r.expenseId },
          data: { contractId: r.contractId },
        }),
      ),
    );

    const byStrategy = this.emptyByStrategy();
    for (const r of results) byStrategy[r.strategy]++;

    this.logger.log(
      `Correlação concluída: ${results.length} vínculos | ` +
        `Exact=${byStrategy.exact_process} | ` +
        `Substring=${byStrategy.substring} | ` +
        `Fuzzy=${byStrategy.fuzzy}`,
    );

    return { total: results.length, byStrategy };
  }

  /**
   * Tenta encontrar o melhor contrato para um empenho usando as 3 estratégias.
   * Retorna o primeiro match encontrado (do mais confiável ao menos confiável).
   */
  private findBestMatch(
    expense: Pick<Expense, 'id' | 'numeroDocumento' | 'numeroProcesso' | 'descricao'>,
    contracts: Contract[],
  ): CorrelationResult | null {
    // --- Estratégia 1: Exact match via numeroProcesso ---
    if (expense.numeroProcesso) {
      const normalizedProcess = this.normalizeContractNumber(expense.numeroProcesso);

      for (const contract of contracts) {
        const normalizedContrato = this.normalizeContractNumber(contract.numero);

        if (
          normalizedProcess.includes(normalizedContrato) ||
          normalizedContrato.includes(normalizedProcess)
        ) {
          return {
            expenseId: expense.id,
            contractId: contract.id,
            strategy: CorrelationStrategy.EXACT_PROCESS,
            score: 1.0,
          };
        }
      }
    }

    // --- Estratégia 2: Substring match na descrição ---
    if (expense.descricao) {
      const descUpper = expense.descricao.toUpperCase();

      for (const contract of contracts) {
        const contratoNumNormalized = this.normalizeContractNumber(contract.numero).toUpperCase();
        const contratoNum = contract.numero.replace(/\s/g, '').toUpperCase();

        if (
          descUpper.includes(contratoNumNormalized) ||
          descUpper.includes(contratoNum)
        ) {
          return {
            expenseId: expense.id,
            contractId: contract.id,
            strategy: CorrelationStrategy.SUBSTRING,
            score: 0.85,
          };
        }
      }
    }

    // --- Estratégia 3: Fuzzy match pelo objeto do contrato vs descrição ---
    if (expense.descricao) {
      let bestScore = FUZZY_THRESHOLD;
      let bestContract: Contract | null = null;

      for (const contract of contracts) {
        const score = SimilarityUtil.calculate(
          expense.descricao,
          contract.objeto,
        );

        if (score > bestScore) {
          bestScore = score;
          bestContract = contract;
        }
      }

      if (bestContract) {
        return {
          expenseId: expense.id,
          contractId: bestContract.id,
          strategy: CorrelationStrategy.FUZZY,
          score: bestScore,
        };
      }
    }

    return null;
  }

  /**
   * Normaliza número de contrato removendo formatação e espaços.
   * Ex: "057/2022" → "0572022" | "CONT-057/2022" → "CONT0572022"
   */
  private normalizeContractNumber(value: string): string {
    return value.replace(/[\s\-\/\.]/g, '').toUpperCase();
  }

  private emptyByStrategy(): Record<CorrelationStrategy, number> {
    return {
      [CorrelationStrategy.EXACT_PROCESS]: 0,
      [CorrelationStrategy.SUBSTRING]: 0,
      [CorrelationStrategy.FUZZY]: 0,
    };
  }
}
