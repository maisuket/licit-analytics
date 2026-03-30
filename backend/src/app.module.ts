import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

// Infraestrutura
import { DatabaseModule } from './shared/infra/database/prisma.module';
import { CacheModule } from './shared/cache/cache.module';

// Domínios
import { CompanyModule } from './modules/company/company.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { ContractModule } from './modules/contract/contract.module';
import { DataProviderModule } from './modules/data-provider/data-provider.module';
import { AnalysisModule } from './modules/analysis/analysis.module';

@Module({
  imports: [
    // 1. Configuração de Ambiente
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 2. Configuração do BullMQ (Redis para Filas)
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // 3. Infraestrutura Core (Compartilhada)
    DatabaseModule,
    CacheModule, // ESTA IMPORTAÇÃO É ESSENCIAL PARA RESOLVER O ERRO DO CACHESERVICE
    DataProviderModule,

    // 4. Módulos de Negócio
    CompanyModule,
    ExpenseModule,
    ContractModule,
    AnalysisModule,
  ],
})
export class AppModule {}
