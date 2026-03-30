import { Module } from '@nestjs/common';
import { ContractService } from './contract.service';
import { ContractController } from './contract.controller';
import { CompanyModule } from '../company/company.module';
import { DataProviderModule } from '../data-provider/data-provider.module';

@Module({
  imports: [DataProviderModule, CompanyModule], // Necessário para validar a empresa antes da inferência
  controllers: [ContractController],
  providers: [ContractService],
  exports: [ContractService],
})
export class ContractModule {}
