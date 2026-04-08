import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { OsStatus } from '@prisma/client';
import { PaginationDto } from '../../../shared/pagination/pagination.dto';

// A classe herda as propriedades 'page' e 'limit' do PaginationDto
export class QueryServiceOrderDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Buscar por unidade escolar ou número da O.S.' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: OsStatus, description: 'Filtrar ordens por Status' })
  @IsOptional()
  @IsEnum(OsStatus, { message: 'O status fornecido não é válido.' })
  status?: OsStatus;

  @ApiPropertyOptional({ description: 'Filtrar O.S. originadas de um Empenho específico' })
  @IsOptional()
  @IsString()
  expenseId?: string;
}
