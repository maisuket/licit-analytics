import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
// ATENÇÃO: instale com `npm install @nestjs/throttler` e descomente as linhas abaixo
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Infraestrutura
import { DatabaseModule } from './shared/infra/database/prisma.module';
import { CacheModule } from './shared/cache/cache.module';

// Domínios
import { CompanyModule } from './modules/company/company.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { ContractModule } from './modules/contract/contract.module';
import { DataProviderModule } from './modules/data-provider/data-provider.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { OperationModule } from './modules/service-order/operation.module';

@Module({
  imports: [
    // 1. Configuração de Ambiente — validação de variáveis obrigatórias no boot
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 2. BullMQ via ConfigService — sem process.env direto
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    // 3. Rate Limiting global — descomente após instalar @nestjs/throttler
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    // 4. Infraestrutura Core
    DatabaseModule,
    CacheModule,
    DataProviderModule,

    // 5. Módulos de Negócio
    CompanyModule,
    ExpenseModule,
    ContractModule,
    AnalysisModule,
    OperationModule,
  ],
  // providers: [
  //   Descomente após instalar @nestjs/throttler para habilitar rate limiting global
  //   { provide: APP_GUARD, useClass: ThrottlerGuard },
  // ],
})
export class AppModule {}
