import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ExpenseService } from '../expense.service';
import { ContractService } from '../../contract/contract.service';
import { ImportExpenseDto } from '../dto/import-expense.dto';

@Processor('spending-import')
export class ExpenseProcessor extends WorkerHost {
  private readonly logger = new Logger(ExpenseProcessor.name);

  constructor(
    private readonly expenseService: ExpenseService,
    private readonly contractService: ContractService,
  ) {
    super();
  }

  /**
   * Este método é executado em background pelo Worker do BullMQ
   */
  async process(job: Job<ImportExpenseDto, any, string>): Promise<any> {
    const { cnpj, year } = job.data;
    this.logger.log(
      `[Job ${job.id}] Iniciando processamento pesado para CNPJ: ${cnpj}`,
    );

    try {
      // 1. Executa a importação real (API -> Postgres)
      const importResult = await this.expenseService.executeImport(job.data);

      // 2. AGORA IMPORTA CONTRATOS REAIS DA API (em vez de inferir)
      this.logger.log(
        `[Job ${job.id}] Disparando importação de Contratos Reais...`,
      );
      const contractResult =
        await this.contractService.importRealContracts(cnpj);

      this.logger.log(
        `[Job ${job.id}] Concluído. Empenhos: ${importResult.count} | Contratos: ${contractResult.count}`,
      );

      return { expenses: importResult.count, contracts: contractResult.count };
    } catch (error) {
      this.logger.error(
        `[Job ${job.id}] Falha crítica no processamento: ${error.message}`,
      );
      throw error; // Permite que o BullMQ tente novamente (retry)
    }
  }
}
