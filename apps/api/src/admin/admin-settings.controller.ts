import { Controller, Get, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PageQuerySchema, paginate, SettingsSchema } from '@mersal/shared';
import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, Roles, type AuthUser } from '../common/auth-user';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody, ZodQuery } from '../common/zod';
import { AppConfig } from '../config/config.module';
import { JobsService } from '../jobs/jobs.module';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService, type SettingKey } from '../settings/settings.service';

const SettingsUpdate = SettingsSchema.partial();

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly jobs: JobsService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  @Get()
  async get() {
    return {
      values: await this.settings.list(),
      demoMode: this.config.demoMode,
      paymentProvider: this.config.env.STRIPE_SECRET_KEY ? 'stripe' : 'demo',
    };
  }

  @Put()
  @ApiZodBody(SettingsUpdate)
  async update(
    @ZodBody(SettingsUpdate) body: z.output<typeof SettingsUpdate>,
    @CurrentUser() admin: AuthUser,
    @Req() req: Request,
  ) {
    const before = await this.settings.list();
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) await this.settings.set(key as SettingKey, value);
    }
    if (body['payouts.weekday'] !== undefined)
      await this.jobs.scheduleWeeklyPayouts(body['payouts.weekday']);
    await this.audit.record({
      actorId: admin.id,
      actorType: 'ADMIN',
      action: 'settings.update',
      entityType: 'AppSetting',
      before,
      after: body,
      meta: requestMeta(req),
    });
    return this.get();
  }
}

const AuditQuery = PageQuerySchema.extend({
  action: z.string().trim().max(60).optional(),
  entityType: z.string().trim().max(60).optional(),
  actorId: z.string().trim().max(40).optional(),
});

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@ZodQuery(AuditQuery) query: z.output<typeof AuditQuery>) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action && { action: { contains: query.action } }),
      ...(query.entityType && { entityType: query.entityType }),
      ...(query.actorId && { actorId: query.actorId }),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(items, total, query);
  }
}
