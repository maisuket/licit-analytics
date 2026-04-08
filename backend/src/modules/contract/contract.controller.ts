import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ContractService } from './contract.service';
import { QueryContractDto } from './dto/query-contract.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Contratos')
@Controller('contract')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post('sync/:cnpj')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sincroniza os contratos de um CNPJ via API da Transparência (requer auth)' })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contratos sincronizados com sucesso.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Token JWT ausente ou inválido.' })
  async syncContracts(@Param('cnpj') cnpj: string) {
    return this.contractService.importRealContracts(cnpj);
  }

  @Get(':cnpj')
  @Public() // Leitura de contratos é pública
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista contratos salvos localmente com paginação' })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista paginada de contratos.' })
  async findCompanyContracts(
    @Param('cnpj') cnpj: string,
    @Query() query: QueryContractDto,
  ) {
    return this.contractService.findByCompanyCnpj(cnpj, query);
  }
}
