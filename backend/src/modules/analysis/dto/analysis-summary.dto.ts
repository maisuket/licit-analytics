import { ApiProperty } from '@nestjs/swagger';

class TopOrgaoDto {
  @ApiProperty({ example: 'MINISTÉRIO DA SAÚDE' })
  orgao: string;

  @ApiProperty({ example: 150000.5 })
  total: number;
}

export class AnalysisSummaryDto {
  @ApiProperty({ example: '23008295000148' })
  cnpj: string;

  @ApiProperty({ example: 500000.0, description: 'Soma de todos os empenhos' })
  totalEmpenhado: number;

  @ApiProperty({
    example: 450000.0,
    description: 'Soma de todas as liquidações',
  })
  totalLiquidado: number;

  @ApiProperty({
    example: 400000.0,
    description: 'Soma de todos os pagamentos realizados',
  })
  totalPago: number;

  @ApiProperty({
    example: 100000.0,
    description: 'Diferença entre Empenhado e Pago',
  })
  saldoAPagar: number;

  @ApiProperty({
    type: [TopOrgaoDto],
    description: 'Ranking dos 5 órgãos que mais empenharam valores',
  })
  topOrgaos: TopOrgaoDto[];
}
