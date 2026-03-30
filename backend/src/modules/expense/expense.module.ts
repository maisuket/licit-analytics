import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { ExpenseProcessor } from './processors/expense.processor';
import { SpendingQueue } from './queues/spending.queue';
import { CompanyModule } from '../company/company.module';
import { ContractModule } from '../contract/contract.module';
import { DataProviderModule } from '../data-provider/data-provider.module';

@Module({
  imports: [
    // Configuração da fila no Redis
    BullModule.registerQueue({
      name: 'spending-import',
    }),
    CompanyModule,
    ContractModule,
    DataProviderModule,
  ],
  controllers: [ExpenseController],
  providers: [ExpenseService, ExpenseProcessor, SpendingQueue],
  exports: [ExpenseService, SpendingQueue],
})
export class ExpenseModule {}
