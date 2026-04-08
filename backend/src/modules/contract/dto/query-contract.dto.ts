import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../shared/pagination/pagination.dto';

export class QueryContractDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Buscar por número do contrato ou parte do objeto/descrição',
    example: '057/2022',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
