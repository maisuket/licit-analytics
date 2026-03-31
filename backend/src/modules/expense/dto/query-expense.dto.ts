import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/pagination/pagination.dto';

export class QueryExpenseDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'Buscar por número do documento (NE), órgão ou palavras na descrição',
    example: '2024NE000123',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
