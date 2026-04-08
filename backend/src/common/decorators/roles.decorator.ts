import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restringe o acesso a um endpoint para papéis específicos.
 *
 * @example
 * @Roles(UserRole.ADMIN)
 * @Delete(':id')
 * remove(@Param('id') id: string) { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
