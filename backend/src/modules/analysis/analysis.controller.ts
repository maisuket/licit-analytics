import {
  Controller,
  Get,
  Param,
  HttpStatus,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { AnalysisSummaryDto } from './dto/analysis-summary.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@ApiTags('Análise e BI')
@Controller('analysis')
@UseInterceptors(CacheInterceptor)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('summary/:cnpj')
  @HttpCode(HttpStatus.OK)
  @CacheTTL(300000) // TTL de 5 minutos (300.000 milissegundos)
  @ApiOperation({
    summary:
      'Gera um resumo financeiro agregado e o ranking de órgãos para uma empresa',
  })
  @ApiParam({
    name: 'cnpj',
    description: 'CNPJ com 14 dígitos numéricos',
    example: '23008295000148',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: AnalysisSummaryDto,
    description: 'Resumo gerado com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Empresa não encontrada na base de dados.',
  })
  async getSummary(@Param('cnpj') cnpj: string): Promise<AnalysisSummaryDto> {
    return this.analysisService.getCompanySummary(cnpj);
  }

  @Get('dashboard/:cnpj')
  @HttpCode(HttpStatus.OK)
  @CacheTTL(300000) // TTL de 5 minutos (300.000 milissegundos)
  @ApiOperation({
    summary:
      'Retorna os dados detalhados formatados para a renderização do Frontend (BI)',
  })
  @ApiParam({
    name: 'cnpj',
    description: 'CNPJ com 14 dígitos numéricos',
    example: '23008295000148',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: DashboardResponseDto,
    description:
      'Estatísticas, empenhos e contratos prontos para visualização.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Empresa não encontrada na base de dados.',
  })
  async getDashboardData(
    @Param('cnpj') cnpj: string,
  ): Promise<DashboardResponseDto> {
    return this.analysisService.getDashboardData(cnpj);
  }
}
