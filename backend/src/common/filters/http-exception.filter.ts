import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ValidationErrorDetail {
  field: string;
  messages: string[];
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationErrorDetail[];
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Ocorreu um erro interno no servidor.';
    let details: ValidationErrorDetail[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Mapeia status HTTP para código semântico
      code = this.mapStatusToCode(status);

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        message = (body['message'] as string) || message;

        // Tratamento de erros de validação do class-validator (array de mensagens)
        if (Array.isArray(body['message'])) {
          message = 'Dados de entrada inválidos.';
          details = (body['message'] as string[]).map((msg) => ({
            field: msg.split(' ')[0] ?? 'unknown',
            messages: [msg],
          }));
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Exceção não tratada em ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    }

    const errorBody: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    };

    response.status(status).json(errorBody);
  }

  private mapStatusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] ?? 'UNKNOWN_ERROR';
  }
}
