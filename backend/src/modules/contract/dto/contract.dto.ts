import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContractResponseDto {
  @ApiProperty({ example: 'uuid-do-banco-de-dados' })
  id!: string;

  @ApiProperty({ example: '102014' })
  numero!: string;

  @ApiProperty({ example: 'Contratação de empresa especializada para serviços...' })
  objeto!: string;

  @ApiProperty({ example: '2014-05-23T12:00:00.000Z', required: false, nullable: true })
  dataAssinatura!: Date | null;

  @ApiProperty({ example: '2014-05-23T12:00:00.000Z', required: false, nullable: true })
  dataInicioVigencia!: Date | null;

  @ApiProperty({ example: '2015-05-22T12:00:00.000Z', required: false, nullable: true })
  dataFimVigencia!: Date | null;

  @ApiProperty({ example: 14828.0 })
  valorInicial!: number;

  @ApiProperty({ example: 14828.0 })
  valorFinal!: number;

  @ApiProperty({ example: 'Publicado' })
  situacao!: string;

  @ApiProperty({ example: 'IFAM - CAMPUS MANAUS CENTRO' })
  unidadeGestora!: string;

  @ApiPropertyOptional({ example: 'Ministério da Educação', nullable: true })
  orgaoSuperior!: string | null;
}
