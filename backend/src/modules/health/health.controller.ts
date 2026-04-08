import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../shared/infra/database/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Verifica a saúde da aplicação: banco de dados e memória' })
  @ApiResponse({ status: 200, description: 'Todos os serviços estão saudáveis.' })
  @ApiResponse({ status: 503, description: 'Um ou mais serviços estão degradados.' })
  check() {
    return this.health.check([
      // Banco de dados: executa um SELECT 1 no Postgres
      () => this.prismaHealth.pingCheck('database', this.prisma),

      // Heap: alerta se ultrapassar 512MB (ajuste conforme seu ambiente)
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }
}
