import { Injectable, Logger } from '@nestjs/common';
import { Contract, Expense } from '@prisma/client';
import { PrismaService } from '../../../shared/infra/database/prisma.service';
import { SimilarityUtil } from '../../../shared/utils/similarity.util';

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

const FUZZY_THRESHOLD = 0.75;
const UPDATE_BATCH_SIZE = 50; // Evita transações enormes que causam timeout em datasets grandes

@Injectable()
export class CorrelationService {
  private readonly logger = new Logger(CorrelationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa a correlação completa para uma empresa:
   * 1. Busca todos os contratos da empresa
   * 2. Busca todos os empenhos sem contractId
   * 3. Tenta correlacionar via 3 estratégias (Exact → Substring → Fuzzy)
   * 4. Persiste em batches de 50 para não saturar o Postgres
   *
   * @returns Resumo com total de vínculos criados por estratégia
   */
  async correlateForCompany(companyId: string): Promise<{
    total: number;
    byStrategy: Record<CorrelationStrategy, number>;
  }> {
    this.logger.log(`Iniciando correlação para empresa: ${companyId}`);

    const [contracts, expenses] = await Promise.all([
      this.prisma.contract.findMany({ where: { companyId, deletedAt: null } }),
      this.prisma.expense.findMany({
        where: { companyId, contractId: null, deletedAt: null },
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

    // Persistência em batches — evita transações enormes (N pode ser centenas)
    await this.persistInBatches(results);

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
   * Persiste os vínculos em chunks de UPDATE_BATCH_SIZE para não saturar o Postgres.
   * Salva também o score e a estratégia para auditoria futura.
   */
  private async persistInBatches(results: CorrelationResult[]): Promise<void> {
    for (let i = 0; i < results.length; i += UPDATE_BATCH_SIZE) {
      const batch = results.slice(i, i + UPDATE_BATCH_SIZE);

      await this.prisma.$transaction(
        batch.map((r) =>
          this.prisma.expense.update({
            where: { id: r.expenseId },
            data: {
              contractId: r.contractId,
              correlationScore: r.score,
              correlationStrategy: r.strategy,
            },
          }),
        ),
      );

      this.logger.debug(
        `Batch ${Math.ceil((i + 1) / UPDATE_BATCH_SIZE)}: ${batch.length} vínculos persistidos`,
      );
    }
  }

  private findBestMatch(
    expense: Pick<Expense, 'id' | 'numeroDocumento' | 'numeroProcesso' | 'descricao'>,
    contracts: Contract[],
  ): CorrelationResult | null {
    // Estratégia 1: Exact match via numeroProcesso
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

    // Estratégia 2: Substring match na descrição
    if (expense.descricao) {
      const descUpper = expense.descricao.toUpperCase();

      for (const contract of contracts) {
        const contratoNumNormalized = this.normalizeContractNumber(contract.numero).toUpperCase();
        const contratoNum = contract.numero.replace(/\s/g, '').toUpperCase();

        if (descUpper.includes(contratoNumNormalized) || descUpper.includes(contratoNum)) {
          return {
            expenseId: expense.id,
            contractId: contract.id,
            strategy: CorrelationStrategy.SUBSTRING,
            score: 0.85,
          };
        }
      }
    }

    // Estratégia 3: Fuzzy match pelo objeto do contrato vs descrição
    if (expense.descricao) {
      let bestScore = FUZZY_THRESHOLD;
      let bestContract: Contract | null = null;

      for (const contract of contracts) {
        const score = SimilarityUtil.calculate(expense.descricao, contract.objeto);

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
