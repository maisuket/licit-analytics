import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ExpenseService } from './expense.service';
import { SpendingQueue } from './queues/spending.queue';
import { ImportExpenseDto } from './dto/import-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Expenses')
@Controller('expense')
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly spendingQueue: SpendingQueue,
  ) {}

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Importa despesas de forma assíncrona (requer auth)' })
  @ApiResponse({ status: HttpStatus.ACCEPTED, description: 'Job adicionado à fila.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED })
  async importExpenses(@Body() dto: ImportExpenseDto) {
    const jobId = await this.spendingQueue.addImportJob(dto);
    return { message: 'Importação iniciada em segundo plano.', jobId };
  }

  @Get('import-status/:jobId')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Consulta o status de um job de importação (requer auth)' })
  @ApiParam({ name: 'jobId', description: 'ID do job retornado pelo endpoint de import' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status do job.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job não encontrado.' })
  async getImportStatus(@Param('jobId') jobId: string) {
    const status = await this.spendingQueue.getJobStatus(jobId);

    if (!status) {
      throw new NotFoundException(`Job ${jobId} não encontrado. Pode já ter expirado no Redis.`);
    }

    return status;
  }

  @Get(':cnpj')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista despesas de uma empresa com paginação e pesquisa' })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista paginada de despesas.' })
  async findCompanyExpenses(
    @Param('cnpj') cnpj: string,
    @Query() query: QueryExpenseDto,
  ) {
    return this.expenseService.findByCompanyCnpj(cnpj, query);
  }
}
