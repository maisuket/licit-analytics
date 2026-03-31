import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/pagination/pagination.dto';

export class QueryCompanyDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Buscar por nome ou parte do CNPJ da empresa',
    example: 'TECNOLOGIA',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
