import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { CompanyModule } from '../company/company.module';
import { ContractModule } from '../contract/contract.module';
import { DataProviderModule } from '../data-provider/data-provider.module';

@Module({
  imports: [
    CompanyModule,
    ContractModule, // Fornece CorrelationService e ContractService
    DataProviderModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
