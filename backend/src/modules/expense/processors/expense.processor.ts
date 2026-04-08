import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ExpenseService } from '../expense.service';
import { ContractService } from '../../contract/contract.service';
import { ImportExpenseDto } from '../dto/import-expense.dto';

interface ProcessResult {
  expenses: number;
  byPhase: Record<string, number>;
  contracts: number;
}

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
   * Executado em background pelo Worker do BullMQ.
   * Retorna contadores para auditoria — acessíveis via GET /expense/import-status/:jobId
   */
  async process(job: Job<ImportExpenseDto, ProcessResult, string>): Promise<ProcessResult> {
    const { cnpj, year } = job.data;
    this.logger.log(`[Job ${job.id}] Iniciando importação para CNPJ: ${cnpj}, Ano: ${year}`);

    // Importação de empenhos/liquidações/pagamentos
    const importResult = await this.expenseService.executeImport(job.data);
    await job.updateProgress(60); // 60% após importar despesas

    this.logger.log(`[Job ${job.id}] Despesas importadas: ${importResult.count}. Importando contratos...`);

    // Importação dos contratos reais da API
    const contractResult = await this.contractService.importRealContracts(cnpj);
    await job.updateProgress(100);

    this.logger.log(
      `[Job ${job.id}] Concluído. Empenhos: ${importResult.count} | Contratos: ${contractResult.count}`,
    );

    return {
      expenses: importResult.count,
      byPhase: importResult.byPhase,
      contracts: contractResult.count,
    };
  }

  // `onFailed` não existe no WorkerHost base — usa o event listener do BullMQ diretamente.
  // Para capturar falhas definitivas, registre um listener no módulo ou use QueueEventsListener.
}
