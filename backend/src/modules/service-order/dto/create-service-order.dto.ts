import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsInt,
  IsDateString,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum OsStatus {
  AGUARDANDO = 'AGUARDANDO',
  FATURADO = 'FATURADO',
  PAGO = 'PAGO',
}

export class CreateServiceOrderDto {
  @ApiProperty({
    description: 'ID da Nota de Empenho (Expense) no banco de dados',
    example: 'uuid-empenho-123',
  })
  @IsString()
  expenseId: string;

  @ApiProperty({
    description: 'Número da Ordem de Serviço',
    example: '022/2026',
  })
  @IsString()
  numeroOS: string;

  @ApiProperty({
    description: 'Unidade/Local de execução',
    example: 'EE ADELAIDE TAVARES DE MACEDO',
  })
  @IsString()
  unidade: string;

  @ApiProperty({
    description: 'Data de execução',
    example: '2026-01-13T00:00:00Z',
  })
  @IsDateString()
  dataExecucao: string;

  @ApiProperty({
    description: 'Quantidade (Ex: número de máquinas)',
    example: 44,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantidade: number;

  @ApiPropertyOptional({
    description: 'Contrato vinculado',
    example: '0057/2022',
  })
  @IsString()
  @IsOptional()
  contrato?: string;

  @ApiPropertyOptional({
    description: 'Descrição / Categoria',
    example: 'CAPITAL',
  })
  @IsString()
  @IsOptional()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Município ou CDE', example: 'CDE 03' })
  @IsString()
  @IsOptional()
  municipio?: string;

  @ApiPropertyOptional({ description: 'Equipe ou Técnico', example: 'THERMAL' })
  @IsString()
  @IsOptional()
  executante?: string;

  @ApiProperty({ description: 'Custo total da operação', example: 4400.0 })
  @Type(() => Number)
  @IsNumber()
  custoTotal: number;

  @ApiProperty({ description: 'Valor Final (Vf) a faturar', example: 45757.0 })
  @Type(() => Number)
  @IsNumber()
  valorFinal: number;

  @ApiProperty({ description: 'Margem de lucro calculada', example: 0.0961 })
  @Type(() => Number)
  @IsNumber()
  margem: number;

  @ApiPropertyOptional({ enum: OsStatus, default: OsStatus.AGUARDANDO })
  @IsEnum(OsStatus)
  @IsOptional()
  status?: OsStatus;

  @ApiPropertyOptional({ description: 'Competência', example: 'JANEIRO' })
  @IsString()
  @IsOptional()
  competencia?: string;

  @ApiPropertyOptional({
    description: 'Número do Processo',
    example: '01.01.028101.005520/2026-90',
  })
  @IsString()
  @IsOptional()
  processo?: string;

  @ApiPropertyOptional({ description: 'Número da Nota Fiscal', example: '32' })
  @IsString()
  @IsOptional()
  nf?: string;
}
