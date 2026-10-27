import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { ErrorCode } from '@mersal/shared';
import type { Response } from 'express';

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  400: 'validation_failed',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  413: 'invalid_file',
  429: 'too_many_requests',
};

/**
 * Keeps the `{ code, message }` error contract for every HTTP error, including those raised by
 * the framework (rate limiting, unknown routes, upload limits) and unexpected crashes, so
 * clients can always show a translated message. Gateways are not affected: Nest does not apply
 * global filters to WebSocket handlers.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return;

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ code: 'internal_error', message: 'Internal server error' });
      return;
    }

    const status = exception.getStatus();
    const body = exception.getResponse();
    if (typeof body === 'object' && body !== null && 'code' in body) {
      res.status(status).json(body);
      return;
    }

    if (status >= 500) this.logger.error(exception.stack);
    const raw = typeof body === 'string' ? body : (body as { message?: unknown }).message;
    const message = Array.isArray(raw) ? raw.join('; ') : String(raw ?? exception.message);
    const code = CODE_BY_STATUS[status] ?? (status >= 500 ? 'internal_error' : 'validation_failed');
    res.status(status).json({ code, message });
  }
}
