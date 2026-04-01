import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { CompanyModule } from '../company/company.module';
import { DataProviderModule } from '../data-provider/data-provider.module';

@Module({
  imports: [CompanyModule, DataProviderModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}
