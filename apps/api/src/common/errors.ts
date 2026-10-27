import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@mersal/shared';

/** Error with a machine-readable `code` the clients translate. Body: `{ code, message }`. */
export class AppError extends HttpException {
  constructor(
    status: HttpStatus,
    code: ErrorCode,
    message: string,
    extra?: Record<string, unknown>,
  ) {
    super({ code, message, ...extra }, status);
  }
}

export const badRequest = (code: ErrorCode, message: string, extra?: Record<string, unknown>) =>
  new AppError(HttpStatus.BAD_REQUEST, code, message, extra);
export const unauthorized = (code: ErrorCode, message: string) =>
  new AppError(HttpStatus.UNAUTHORIZED, code, message);
export const forbidden = (code: ErrorCode, message: string) =>
  new AppError(HttpStatus.FORBIDDEN, code, message);
export const notFound = (message = 'Not found') =>
  new AppError(HttpStatus.NOT_FOUND, 'not_found', message);
export const conflict = (code: ErrorCode, message: string) =>
  new AppError(HttpStatus.CONFLICT, code, message);
export const tooMany = (code: ErrorCode, message: string) =>
  new AppError(HttpStatus.TOO_MANY_REQUESTS, code, message);
