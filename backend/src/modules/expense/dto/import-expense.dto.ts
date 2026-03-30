import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportExpenseDto {
  @ApiProperty({
    description: 'CNPJ da empresa para pesquisar despesas (apenas números)',
    example: '23008295000148',
  })
  @IsString()
  @Length(14, 14, { message: 'O CNPJ deve ter exatamente 14 dígitos.' })
  @Matches(/^\d+$/, { message: 'O CNPJ deve conter apenas números.' })
  cnpj: string;

  @ApiProperty({
    description: 'Ano de competência das despesas',
    example: 2024,
  })
  @Type(() => Number)
  @IsInt()
  @Min(2010, { message: 'O ano mínimo permitido é 2010.' })
  @Max(new Date().getFullYear(), {
    message: 'Não é possível procurar despesas em anos futuros.',
  })
  year: number;
}
