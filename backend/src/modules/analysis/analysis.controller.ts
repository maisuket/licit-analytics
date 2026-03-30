import {
  Controller,
  Get,
  Param,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { AnalysisSummaryDto } from './dto/analysis-summary.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@ApiTags('Análise e BI')
@Controller('analysis')
@UseInterceptors(CacheInterceptor) // Aplica o intercetor de cache a todas as rotas deste controlador
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('summary/:cnpj')
  @CacheTTL(300000) // TTL de 5 minutos (300.000 milissegundos) para evitar sobrecarga no PostgreSQL
  @ApiOperation({
    summary: 'Gera um resumo financeiro e ranking de órgãos para uma empresa',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({ status: HttpStatus.OK, type: AnalysisSummaryDto })
  async getSummary(@Param('cnpj') cnpj: string): Promise<AnalysisSummaryDto> {
    return this.analysisService.getCompanySummary(cnpj);
  }

  @Get('dashboard/:cnpj')
  @CacheTTL(300000) // TTL de 5 minutos (300.000 milissegundos)
  @ApiOperation({
    summary: 'Retorna os dados formatados para o Frontend (React/Next.js)',
  })
  @ApiParam({ name: 'cnpj', description: 'CNPJ com 14 dígitos numéricos' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: DashboardResponseDto,
    description:
      'Estatísticas e lista de empenhos prontos para renderização visual.',
  })
  async getDashboardData(
    @Param('cnpj') cnpj: string,
  ): Promise<DashboardResponseDto> {
    return this.analysisService.getDashboardData(cnpj);
  }
}
