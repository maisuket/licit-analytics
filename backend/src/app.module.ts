// =============================================================================
// PACOTES NECESSÁRIOS (execute no terminal antes de iniciar):
//   npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt joi @nestjs/terminus
//   npm install -D @types/passport-jwt @types/bcrypt
// =============================================================================
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as path from 'path';
import * as Joi from 'joi';

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
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // 1. Configuração de Ambiente — falha no boot se variável obrigatória faltar
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolve o .env sempre em relação ao diretório raiz do pacote backend/,
      // independente de onde o processo foi iniciado (IDE, Docker, projeto raiz).
      // __dirname aponta para src/ (ts-node) ou dist/ (compilado) — ambos têm
      // o .env um nível acima.
      envFilePath: [
        path.join(__dirname, '..', '.env'), // dist/../.env  ou  src/../.env  → backend/.env
        '.env', // fallback: CWD/.env
      ],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        FRONTEND_URL: Joi.string().required(),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().default('redis://localhost:6379'),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        TRANSPARENCY_API_URL: Joi.string().default(
          'https://api.portaldatransparencia.gov.br',
        ),
        TRANSPARENCY_API_KEY: Joi.string().optional(),
      }),
      validationOptions: { abortEarly: true },
    }),

    // 2. BullMQ via ConfigService
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

    // 3. Rate Limiting global — 60 req/min por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

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

    // 6. Auth + Health
    AuthModule,
    HealthModule,
  ],
  providers: [
    // ThrottlerGuard ativo globalmente — protege todos os controllers
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
