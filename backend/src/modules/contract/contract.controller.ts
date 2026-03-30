import {
  Controller,
  Post,
  Get,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ContractService } from './contract.service';
import { ContractResponseDto } from './dto/contract.dto';

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
  @ApiOperation({
    summary:
      'Lista os contratos salvos na base de dados local para uma empresa',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de contratos devolvida com sucesso.',
    type: [ContractResponseDto], // O Swagger agora sabe exatamente o que esta rota devolve!
  })
  async findCompanyContracts(@Param('cnpj') cnpj: string) {
    // O GET agora faz o que um GET deve fazer: Apenas ler a base de dados.
    return this.contractService.findByCompanyCnpj(cnpj);
  }
}
