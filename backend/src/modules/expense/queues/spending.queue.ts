import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ImportExpenseDto } from '../dto/import-expense.dto';

@Injectable()
export class SpendingQueue {
  constructor(
    @InjectQueue('spending-import') private readonly importQueue: Queue,
  ) {}

  /**
   * Adiciona uma tarefa de importação para processamento assíncrono
   */
  async addImportJob(dto: ImportExpenseDto): Promise<string> {
    const job = await this.importQueue.add('process-import', dto, {
      attempts: 3, // Tenta 3 vezes em caso de falha na API do governo
      backoff: {
        type: 'exponential',
        delay: 5000, // Espera 5s, depois 10s, depois 20s...
      },
      removeOnComplete: true, // Limpa o Redis após o sucesso
    });

    return job.id as string;
  }
}
