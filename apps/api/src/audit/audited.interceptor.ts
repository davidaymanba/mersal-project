import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { AuthedRequest } from '../common/auth-user';
import { requestMeta } from '../common/request-meta';
import { AuditService } from './audit.service';

const AUDIT_META = 'audit';
const SENSITIVE_KEY = /password|code|token|secret/i;

function redact(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) return undefined;
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[redacted]' : value,
    ]),
  );
}

interface AuditMeta {
  action: string;
  entityType: string;
}

@Injectable()
export class AuditedInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_META, context.getHandler());
    const request = context.switchToHttp().getRequest<AuthedRequest>();

    return next.handle().pipe(
      tap((result) => {
        const entityId =
          (request.params?.id as string | undefined) ??
          (result && typeof result === 'object' && 'id' in result ? String(result.id) : undefined);
        void this.audit.record({
          actorId: request.user?.id,
          actorType: request.user?.role === 'ADMIN' ? 'ADMIN' : 'USER',
          action: meta.action,
          entityType: meta.entityType,
          entityId,
          after: redact(request.body),
          meta: requestMeta(request),
        });
      }),
    );
  }
}

/** Writes an audit log entry after the handler succeeds (actor, entity id, request body). */
export function Audited(action: string, entityType: string) {
  return applyDecorators(
    SetMetadata(AUDIT_META, { action, entityType }),
    UseInterceptors(AuditedInterceptor),
  );
}
