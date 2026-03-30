import { Controller, Get, Post, Body, Param, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';

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
    description: 'Dados de entrada inválidos.',
  })
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companyService.createOrFind(createCompanyDto);
  }

  @Get(':cnpj')
  @ApiOperation({ summary: 'Obtém os detalhes de uma empresa pelo CNPJ' })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalhes da empresa retornados.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Empresa não encontrada.',
  })
  async findOne(@Param('cnpj') cnpj: string) {
    return this.companyService.findByCnpj(cnpj);
  }
}
