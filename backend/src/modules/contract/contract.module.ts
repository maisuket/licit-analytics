import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { CorrelationService } from './services/correlation.service';
import { CompanyModule } from '../company/company.module';
import { DataProviderModule } from '../data-provider/data-provider.module';

@Module({
  imports: [DataProviderModule, CompanyModule],
  controllers: [ContractController],
  providers: [ContractService, CorrelationService],
  exports: [ContractService, CorrelationService],
})
export class ContractModule {}
