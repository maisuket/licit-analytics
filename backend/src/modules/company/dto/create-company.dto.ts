import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, IsNotEmpty } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ description: 'CNPJ da empresa (apenas números)', example: '23008295000148' })
  @IsString()
  @IsNotEmpty({ message: 'O CNPJ é obrigatório.' })
  @Length(14, 14, { message: 'O CNPJ deve ter exatamente 14 dígitos.' })
  @Matches(/^\d+$/, { message: 'O CNPJ deve conter apenas números.' })
  cnpj!: string;

  @ApiProperty({ description: 'Nome ou Razão Social da empresa', example: 'EMPRESA TECNOLOGIA LTDA' })
  @IsString()
  @IsNotEmpty({ message: 'O nome da empresa é obrigatório.' })
  name!: string;
}
