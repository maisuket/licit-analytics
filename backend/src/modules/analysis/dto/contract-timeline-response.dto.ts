import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExpenseTimelineItemDto {
  @ApiProperty({ example: 'uuid-123' })
  id!: string;

  @ApiProperty({ example: '2026NE0000503' })
  numeroDocumento!: string;

  @ApiProperty({ example: 'EMPENHO', enum: ['EMPENHO', 'LIQUIDACAO', 'PAGAMENTO'] })
  tipo!: string;

  @ApiProperty({ example: 'SEDUC' })
  orgao!: string;

  @ApiPropertyOptional({ example: 'MEC' })
  orgaoSuperior!: string | null;

  @ApiPropertyOptional({ example: 'Fundo Nacional de Educação' })
  unidadeGestora!: string | null;

  @ApiProperty({ example: 45757.00 })
  valorOriginal!: number;

  @ApiProperty({ example: '2026-01-15T00:00:00.000Z' })
  data!: Date;

  @ApiPropertyOptional({ example: '01.01.028101.005520/2026-90' })
  numeroProcesso!: string | null;

  @ApiPropertyOptional({ example: '33.90.39' })
  elementoDespesa!: string | null;

  @ApiPropertyOptional({ example: 'Serviços de manutenção de equipamentos' })
  descricao!: string;
}

export class ContractTimelineFinancialSummaryDto {
  @ApiProperty({ example: 150000.00, description: 'Soma dos empenhos vinculados ao contrato' })
  totalEmpenhado!: number;

  @ApiProperty({ example: 120000.00, description: 'Soma das liquidações' })
  totalLiquidado!: number;

  @ApiProperty({ example: 100000.00, description: 'Soma dos pagamentos' })
  totalPago!: number;

  @ApiProperty({ example: 50000.00, description: 'Valor empenhado ainda não pago' })
  saldoAReceber!: number;

  @ApiProperty({ example: 0.67, description: 'Percentual já liquidado (0 a 1)' })
  percentualLiquidado!: number;

  @ApiProperty({ example: 0.56, description: 'Percentual já pago (0 a 1)' })
  percentualPago!: number;
}

export class ContractTimelineItemDto {
  @ApiProperty({ example: 'uuid-contract-123' })
  id!: string;

  @ApiProperty({ example: '057/2022' })
  numero!: string;

  @ApiProperty({ example: 'Prestação de serviços de manutenção de equipamentos' })
  objeto!: string;

  @ApiPropertyOptional({ example: '2022-03-01T00:00:00.000Z' })
  dataAssinatura!: Date | null;

  @ApiPropertyOptional({ example: '2022-03-15T00:00:00.000Z' })
  dataInicioVigencia!: Date | null;

  @ApiPropertyOptional({ example: '2023-03-14T00:00:00.000Z' })
  dataFimVigencia!: Date | null;

  @ApiProperty({ example: 200000.00 })
  valorInicial!: number;

  @ApiProperty({ example: 250000.00 })
  valorFinal!: number;

  @ApiProperty({ example: 'Vigente' })
  situacao!: string;

  @ApiProperty({ example: 'SEDUC-AM' })
  unidadeGestora!: string;

  @ApiPropertyOptional({ example: 'MEC' })
  orgaoSuperior!: string | null;

  @ApiProperty({ type: ContractTimelineFinancialSummaryDto })
  resumoFinanceiro!: ContractTimelineFinancialSummaryDto;

  @ApiProperty({ type: [ExpenseTimelineItemDto] })
  empenhos!: ExpenseTimelineItemDto[];

  @ApiProperty({ type: [ExpenseTimelineItemDto] })
  liquidacoes!: ExpenseTimelineItemDto[];

  @ApiProperty({ type: [ExpenseTimelineItemDto] })
  pagamentos!: ExpenseTimelineItemDto[];
}

export class ContractTimelineResponseDto {
  @ApiProperty({ example: '23008295000148' })
  cnpj!: string;

  @ApiProperty({ example: 'EMPRESA TECNOLOGIA LTDA' })
  empresa!: string;

  @ApiProperty({ example: 3 })
  totalContratos!: number;

  @ApiProperty({ example: 15 })
  totalEmpenhos!: number;

  @ApiProperty({ description: 'Número de empenhos sem contrato correlacionado', example: 2 })
  empenhosSemContrato!: number;

  @ApiProperty({ type: [ContractTimelineItemDto] })
  contratos!: ContractTimelineItemDto[];
}
