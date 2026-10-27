import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type ActorType } from '@prisma/client';
import type { RequestMeta } from '../common/request-meta';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorId?: string | null;
  actorType: ActorType;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: RequestMeta;
}

const toJson = (value: unknown) =>
  value === undefined
    ? undefined
    : value === null
      ? Prisma.JsonNull
      : (value as Prisma.InputJsonValue);

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Records an audit entry. Never throws — auditing must not break the business action. */
  async record(entry: AuditEntry, tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    try {
      await tx.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          actorType: entry.actorType,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          before: toJson(entry.before),
          after: toJson(entry.after),
          ip: entry.meta?.ip,
          userAgent: entry.meta?.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log for ${entry.action}`, error as Error);
    }
  }
}
