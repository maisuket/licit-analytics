import { ApiProperty } from '@nestjs/swagger';

class FavorecidoDto {
  @ApiProperty({ example: 'EMPRESA DO AMIGO LTDA' })
  nome: string;

  @ApiProperty({ example: '12.345.678/0001-00' })
  cnpjFormatado: string;
}

class UnidadeGestoraDto {
  @ApiProperty({ example: 'MINISTÉRIO DA EDUCAÇÃO' })
  nome: string;

  @ApiProperty({ example: 'Ministério da Educação', required: false })
  orgaoSuperior?: string;
}

class DashboardEmpenhoDto {
  @ApiProperty({ example: 'e7b8... (UUID)' })
  id: string;

  @ApiProperty({ example: '2024NE000123' })
  numeroEmpenho: string;

  @ApiProperty({ example: '15/03/2024' })
  dataEmissao: string;

  @ApiProperty({ example: '15.500,00' })
  valorOriginal: string;

  @ApiProperty({ required: false })
  processo?: string;

  @ApiProperty({ required: false })
  elemento?: string;

  @ApiProperty({ required: false })
  observacao?: string;

  @ApiProperty({ type: FavorecidoDto })
  favorecido: FavorecidoDto;

  @ApiProperty({ type: UnidadeGestoraDto })
  unidadeGestora: UnidadeGestoraDto;
}

// NOVO: DTO para os contratos
class DashboardContratoDto {
  @ApiProperty({ example: 'uuid-do-banco' })
  id: string;

  @ApiProperty({ example: '102014' })
  numero: string;

  @ApiProperty({ example: 'Contratação de empresa especializada...' })
  objeto: string;

  @ApiProperty({ example: '23/05/2014' })
  dataAssinatura: string;

  @ApiProperty({ example: '23/05/2014 até 22/05/2015' })
  vigencia: string;

  @ApiProperty({ example: '14.828,00' })
  valorFinal: string;

  @ApiProperty({ example: 'Publicado' })
  situacao: string;

  @ApiProperty({ example: 'IFAM - CAMPUS MANAUS CENTRO' })
  orgao: string;
}

class DashboardStatsDto {
  @ApiProperty({ example: 'R$ 23.700,50' })
  totalEmpenhado: string;

  @ApiProperty({ example: '02' })
  empenhosAtivos: string;

  @ApiProperty({ example: 'Hoje, 09:30' })
  ultimaAtualizacao: string;
}

export class DashboardResponseDto {
  @ApiProperty({ type: DashboardStatsDto })
  stats: DashboardStatsDto;

  @ApiProperty({ type: [DashboardEmpenhoDto] })
  empenhos: DashboardEmpenhoDto[];

  @ApiProperty({ type: [DashboardContratoDto] })
  contratos: DashboardContratoDto[]; // NOVO ARRAY ADICIONADO AO RETORNO
}
