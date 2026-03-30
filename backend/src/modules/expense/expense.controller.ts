import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ExpenseService } from './expense.service';
import { SpendingQueue } from './queues/spending.queue';
import { ImportExpenseDto } from './dto/import-expense.dto';

@ApiTags('Expenses')
@Controller('expense')
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly spendingQueue: SpendingQueue, // Injetando a Fila para processamento assíncrono
  ) {}

  @Post('import')
  @HttpCode(HttpStatus.ACCEPTED) // <- GARANTE QUE O RETORNO REAL É 202 ACCEPTED
  @ApiOperation({
    summary:
      'Importa e processa despesas de uma fonte pública de forma assíncrona',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Tarefa de importação adicionada à fila com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Requisição inválida.',
  })
  async importExpenses(@Body() importExpenseDto: ImportExpenseDto) {
    // No Passo 9, mudamos para processamento em background via BullMQ
    const jobId = await this.spendingQueue.addImportJob(importExpenseDto);

    return {
      message: 'Importação iniciada em segundo plano.',
      jobId: jobId,
    };
  }

  @Get(':cnpj')
  @ApiOperation({
    summary: 'Lista todas as despesas processadas de uma empresa',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de despesas devolvida com sucesso.',
  })
  async findCompanyExpenses(@Param('cnpj') cnpj: string) {
    return this.expenseService.findByCompanyCnpj(cnpj);
  }
}
