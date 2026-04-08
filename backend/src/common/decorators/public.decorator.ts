import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca um endpoint como público, ignorando o JwtAuthGuard global.
 * Use em rotas de consulta de dados do governo, que não exigem login.
 *
 * @example
 * @Public()
 * @Get('dashboard/:cnpj')
 * getDashboard(@Param('cnpj') cnpj: string) { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
