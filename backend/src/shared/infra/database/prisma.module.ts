import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // O @Global() permite que o PrismaService seja injetado em qualquer módulo sem necessidade de reimportar o DatabaseModule
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
