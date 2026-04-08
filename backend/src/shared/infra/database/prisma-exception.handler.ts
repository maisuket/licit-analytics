import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Mapeia PrismaClientKnownRequestError para exceções NestJS adequadas.
 * Deve ser chamado nos blocos catch dos Services ao invés de relançar o erro bruto.
 *
 * Códigos mapeados:
 *  P2002 — Unique constraint violation → 409 ConflictException
 *  P2025 — Record not found           → 404 NotFoundException
 *  P2003 — Foreign key constraint     → 409 ConflictException
 *
 * @example
 * try {
 *   return await this.prisma.user.create({ data });
 * } catch (error) {
 *   handlePrismaError(error);
 * }
 */
export function handlePrismaError(error: unknown, entityName = 'Registro'): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': {
        const fields = Array.isArray(error.meta?.['target'])
          ? (error.meta['target'] as string[]).join(', ')
          : 'campos únicos';
        throw new ConflictException(
          `${entityName} já existe. Campos duplicados: ${fields}.`,
        );
      }
      case 'P2025':
        throw new NotFoundException(`${entityName} não encontrado.`);
      case 'P2003':
        throw new ConflictException(
          `Operação violaria a integridade referencial de ${entityName}.`,
        );
      default:
        throw new InternalServerErrorException(
          `Erro de banco de dados (${error.code}): ${error.message}`,
        );
    }
  }

  // Relança outros tipos de erro sem mascarar
  throw error;
}
