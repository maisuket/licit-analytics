import { Module } from '@nestjs/common';
import { OperationService } from './operation.service';
import { OperationController } from './operation.controller';

@Module({
  // O PrismaService é provido globalmente pelo DatabaseModule,
  // portanto não precisamos importá-lo aqui.
  controllers: [OperationController],
  providers: [OperationService],
  exports: [OperationService],
})
export class OperationModule {}
