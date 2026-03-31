import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { OperationService } from './operation.service';
import {
  CreateServiceOrderDto,
  OsStatus,
} from './dto/create-service-order.dto';
import { QueryServiceOrderDto } from './dto/query-service-order.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Gestão Operacional (ERP)')
@Controller('operation')
export class OperationController {
  constructor(private readonly operationService: OperationService) {}

  @Post('os')
  @ApiOperation({
    summary: 'Lança uma nova Ordem de Serviço vinculada a um Empenho',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Ordem de Serviço criada com sucesso.',
  })
  create(@Body() createServiceOrderDto: CreateServiceOrderDto) {
    return this.operationService.create(createServiceOrderDto);
  }

  @Get('os')
  @ApiOperation({
    summary: 'Lista as Ordens de Serviço com paginação, pesquisa e filtros',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada devolvida com sucesso.',
  })
  findAll(@Query() query: QueryServiceOrderDto) {
    // A query agora contém page, limit, search, status, e expenseId validados
    return this.operationService.findAll(query);
  }

  @Patch('os/:id/status')
  @ApiOperation({ summary: 'Avança o status de uma O.S. (Ex: FATURADO, PAGO)' })
  @ApiParam({ name: 'id', description: 'ID da O.S.' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OsStatus,
    @Body('nf') nf?: string,
  ) {
    return this.operationService.updateStatus(id, status, nf);
  }

  @Delete('os/:id')
  @ApiOperation({
    summary: 'Remove uma O.S. e devolve o valor ao saldo do Empenho',
  })
  @ApiParam({ name: 'id', description: 'ID da O.S.' })
  remove(@Param('id') id: string) {
    return this.operationService.remove(id);
  }

  @Post('import-csv/:cnpj/:type')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Importa em lote Empenhos ou Ordens de Serviço via CSV',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ da empresa' })
  @ApiParam({
    name: 'type',
    enum: ['empenho', 'os'],
    description: 'Tipo de ficheiro',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lote importado com sucesso.',
  })
  async importCsv(
    @Param('cnpj') cnpj: string,
    @Param('type') type: 'empenho' | 'os',
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.operationService.importFromCsv(cnpj, type, file);
  }
}
