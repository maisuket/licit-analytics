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
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Análise e BI')
@Public() // Dados do governo são públicos — não exigem autenticação
@Controller('analysis')
@UseInterceptors(CacheInterceptor)
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('summary/:cnpj')
  @HttpCode(HttpStatus.OK)
  @CacheTTL(300_000)
  @ApiOperation({ summary: 'Resumo financeiro agregado e ranking de órgãos' })
  @ApiParam({
    name: 'cnpj',
    description: 'CNPJ com 14 dígitos numéricos',
    example: '23008295000148',
  })
  @ApiResponse({ status: HttpStatus.OK, type: AnalysisSummaryDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Empresa não encontrada.',
  })
  async getSummary(@Param('cnpj') cnpj: string): Promise<AnalysisSummaryDto> {
    return this.analysisService.getCompanySummary(cnpj);
  }

  @Get('dashboard/:cnpj')
  @HttpCode(HttpStatus.OK)
  @CacheTTL(300_000)
  @ApiOperation({ summary: 'Dados detalhados formatados para o Dashboard BI' })
  @ApiParam({
    name: 'cnpj',
    description: 'CNPJ com 14 dígitos numéricos',
    example: '23008295000148',
  })
  @ApiResponse({ status: HttpStatus.OK, type: DashboardResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Empresa não encontrada.',
  })
  async getDashboardData(
    @Param('cnpj') cnpj: string,
  ): Promise<DashboardResponseDto> {
    return this.analysisService.getDashboardData(cnpj);
  }

  @Get('contract-timeline/:cnpj')
  @HttpCode(HttpStatus.OK)
  @CacheTTL(120_000)
  @ApiOperation({
    summary:
      'Linha do tempo completa por contrato: empenhos → liquidações → pagamentos',
    description:
      'Retorna todos os contratos de um CNPJ com os documentos de despesa vinculados, ' +
      'correlacionados automaticamente via número de processo ou similaridade textual. ' +
      'Inclui resumo financeiro por contrato.',
  })
  @ApiParam({
    name: 'cnpj',
    description: 'CNPJ da empresa com 14 dígitos numéricos',
    example: '23008295000148',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ContractTimelineResponseDto })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Empresa não encontrada. Execute a importação primeiro.',
  })
  async getContractTimeline(
    @Param('cnpj') cnpj: string,
  ): Promise<ContractTimelineResponseDto> {
    return this.analysisService.getContractTimeline(cnpj);
  }
}
