import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty({ example: 'uuid-do-usuario' })
  id!: string;

  @ApiProperty({ example: 'admin@licitanalytics.com' })
  email!: string;

  @ApiProperty({ example: 'Admin LicitAnalytics' })
  name!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role!: UserRole;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT de acesso (válido por 15 minutos)' })
  accessToken!: string;

  @ApiProperty({ description: 'Dados básicos do usuário autenticado' })
  user!: AuthUserDto;
}
