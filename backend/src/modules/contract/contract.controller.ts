import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ContractService } from './contract.service';
import { ContractResponseDto } from './dto/contract.dto';
import { QueryContractDto } from './dto/query-contract.dto';

@ApiTags('Contracts')
@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post('sync/:cnpj')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Sincroniza manualmente os contratos reais de uma empresa via API da Transparência',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Contratos atualizados e salvos na base de dados com sucesso.',
  })
  async syncContracts(@Param('cnpj') cnpj: string) {
    // Agora temos uma rota explícita de escrita (POST) se quisermos forçar a atualização manual
    return this.contractService.importRealContracts(cnpj);
  }

  @Get(':cnpj')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Lista os contratos salvos na base de dados local para uma empresa com paginação e pesquisa',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de contratos devolvida com sucesso.',
  })
  async findCompanyContracts(
    @Param('cnpj') cnpj: string,
    @Query() query: QueryContractDto,
  ) {
    return this.contractService.findByCompanyCnpj(cnpj, query);
  }
}
