import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { ImportExpenseDto } from '../dto/import-expense.dto';

export interface JobStatus {
  id: string;
  state: string;
  progress: number | object;
  result: unknown;
  failedReason: string | undefined;
  attemptsMade: number;
}

@Injectable()
export class SpendingQueue {
  constructor(
    @InjectQueue('spending-import') private readonly importQueue: Queue,
  ) {}

  /**
   * Adiciona uma tarefa de importação para processamento assíncrono.
   * O job não é removido imediatamente do Redis para permitir consultar o status.
   */
  async addImportJob(dto: ImportExpenseDto): Promise<string> {
    const job = await this.importQueue.add('process-import', dto, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { age: 3600 }, // Remove 1h após completar (mantém para status)
      removeOnFail: { age: 86_400 },   // Remove 24h após falha
    });

    return job.id as string;
  }

  /**
   * Consulta o estado atual de um job de importação.
   */
  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const job: Job | undefined = await this.importQueue.getJob(jobId);

    if (!job) return null;

    const state = await job.getState();

    return {
      id: job.id as string,
      state,
      progress: job.progress,
      result: job.returnvalue as unknown,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    };
  }
}
