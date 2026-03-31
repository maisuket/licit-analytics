import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ExpenseService } from './expense.service';
import { SpendingQueue } from './queues/spending.queue';
import { ImportExpenseDto } from './dto/import-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@ApiTags('Expenses')
@Controller('expense')
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly spendingQueue: SpendingQueue,
  ) {}

  @Post('import')
  @HttpCode(HttpStatus.ACCEPTED)
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
    const jobId = await this.spendingQueue.addImportJob(importExpenseDto);

    return {
      message: 'Importação iniciada em segundo plano.',
      jobId: jobId,
    };
  }

  @Get(':cnpj')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Lista as despesas/empenhos de uma empresa com paginação e pesquisa',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de despesas devolvida com sucesso.',
  })
  async findCompanyExpenses(
    @Param('cnpj') cnpj: string,
    @Query() query: QueryExpenseDto,
  ) {
    return this.expenseService.findByCompanyCnpj(cnpj, query);
  }
}
