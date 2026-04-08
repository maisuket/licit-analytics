import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseModule } from '../../shared/infra/database/prisma.module';

@Module({
  imports: [
    TerminusModule,
    DatabaseModule,
  ],
  controllers: [HealthController],
})
export class HealthModule {}
