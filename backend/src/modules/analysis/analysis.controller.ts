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
import { ContractTimelineResponseDto } from './dto/contract-timeline-response.dto';

@ApiTags('Análise e BI')
@Controller('analysis')
@UseInterceptors(CacheInterceptor)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('summary/:cnpj')
  @HttpCode(HttpStatus.OK)
  @CacheTTL(300000)
  @ApiOperation({
    summary: 'Gera um resumo financeiro agregado e o ranking de órgãos para uma empresa',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos', example: '23008295000148' })
  @ApiResponse({ status: HttpStatus.OK, type: AnalysisSummaryDto, description: 'Resumo gerado com sucesso.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Empresa não encontrada.' })
  async getSummary(@Param('cnpj') cnpj: string): Promise<AnalysisSummaryDto> {
    return this.analysisService.getCompanySummary(cnpj);
  }

  @Get('dashboard/:cnpj')
  @HttpCode(HttpStatus.OK)
  @CacheTTL(300000)
  @ApiOperation({
    summary: 'Retorna dados detalhados formatados para o Frontend (BI)',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos', example: '23008295000148' })
  @ApiResponse({ status: HttpStatus.OK, type: DashboardResponseDto, description: 'Estatísticas, empenhos e contratos prontos para visualização.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Empresa não encontrada.' })
  async getDashboardData(@Param('cnpj') cnpj: string): Promise<DashboardResponseDto> {
    return this.analysisService.getDashboardData(cnpj);
  }

  @Get('contract-timeline/:cnpj')
  @HttpCode(HttpStatus.OK)
  @CacheTTL(120000) // 2 minutos — dados mais dinâmicos que o dashboard
  @ApiOperation({
    summary: 'Linha do tempo completa por contrato: empenhos → liquidações → pagamentos',
    description:
      'Retorna todos os contratos de um CNPJ com os documentos de despesa vinculados ' +
      '(empenhos, liquidações e pagamentos), correlacionados automaticamente via ' +
      'número de processo ou similaridade textual. ' +
      'Inclui resumo financeiro por contrato (total empenhado, liquidado, pago e saldo a receber).',
  })
  @ApiParam({
    name: 'cnpj',
    description: 'CNPJ da empresa com 14 dígitos numéricos',
    example: '23008295000148',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ContractTimelineResponseDto,
    description: 'Linha do tempo gerada com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Empresa não encontrada na base de dados local. Execute a importação primeiro.',
  })
  async getContractTimeline(
    @Param('cnpj') cnpj: string,
  ): Promise<ContractTimelineResponseDto> {
    return this.analysisService.getContractTimeline(cnpj);
  }
}
