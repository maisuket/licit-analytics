import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { QueryCompanyDto } from './dto/query-company.dto';

@ApiTags('Companies')
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @ApiOperation({ summary: 'Regista uma nova empresa ou retorna a existente' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Empresa criada ou retornada com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados de entrada inválidos (ex: CNPJ malformado).',
  })
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.createOrFind(createCompanyDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista todas as empresas com paginação e pesquisa' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de empresas devolvida com sucesso.',
  })
  async findAll(@Query() query: QueryCompanyDto) {
    return this.companyService.findAll(query);
  }

  @Get(':cnpj')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtém os detalhes e resumo de uma empresa pelo CNPJ',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalhes da empresa retornados com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Empresa não encontrada na base de dados.',
  })
  async findOne(@Param('cnpj') cnpj: string) {
    return this.companyService.findByCnpj(cnpj);
  }
}
