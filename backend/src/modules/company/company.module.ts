import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService], // Exportado para que o módulo de despesas possa utilizá-lo
})
export class CompanyModule {}
