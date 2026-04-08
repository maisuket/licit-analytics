import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { ImportExpenseDto } from '../dto/import-expense.dto';

export interface JobStatus {
  id: string;
  state: string;
  // `JobProgress` no BullMQ pode ser string | number | object — normalizamos para number | object
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

  async addImportJob(dto: ImportExpenseDto): Promise<string> {
    const job = await this.importQueue.add('process-import', dto, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86_400 },
    });

    return job.id as string;
  }

  async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const job: Job | undefined = await this.importQueue.getJob(jobId);

    if (!job) return null;

    const state = await job.getState();

    // Normaliza o progress: string vira 0, number/object passam direto
    const rawProgress = job.progress;
    const progress: number | object =
      typeof rawProgress === 'string'
        ? 0
        : (rawProgress as number | object);

    return {
      id: job.id as string,
      state,
      progress,
      result: job.returnvalue as unknown,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    };
  }
}
