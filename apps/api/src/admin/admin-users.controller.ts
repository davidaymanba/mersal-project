import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { paginate, PageQuerySchema } from '@mersal/shared';
import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../auth/token.service';
import { CurrentUser, Roles, type AuthUser } from '../common/auth-user';
import { badRequest, notFound } from '../common/errors';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody, ZodQuery } from '../common/zod';
import { PrismaService } from '../prisma/prisma.service';
import { toMe } from '../users/user.mapper';

const UsersQuery = PageQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  traveller: z.enum(['NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

const SuspendSchema = z.object({ reason: z.string().trim().min(3).max(500) });

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@ZodQuery(UsersQuery) query: z.output<typeof UsersQuery>) {
    const where: Prisma.UserWhereInput = {
      status: query.status,
      travellerStatus: query.traveller,
      role: query.role,
      ...(query.q && {
        OR: [
          { email: { contains: query.q, mode: 'insensitive' } },
          { firstName: { contains: query.q, mode: 'insensitive' } },
          { lastName: { contains: query.q, mode: 'insensitive' } },
          { phone: { contains: query.q } },
        ],
      }),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          _count: { select: { shipmentsSent: true, shipmentsCarried: true, trips: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(
      users.map((u) => ({
        ...toMe(u),
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        counts: u._count,
      })),
      total,
      query,
    );
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            shipmentsSent: true,
            shipmentsCarried: true,
            trips: true,
            disputesOpened: true,
          },
        },
        verifications: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, status: true, createdAt: true, rejectionReason: true },
        },
      },
    });
    if (!user) throw notFound('User not found');
    const auditTrail = await this.prisma.auditLog.findMany({
      where: { OR: [{ entityType: 'User', entityId: id }, { actorId: id }] },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return {
      ...toMe(user),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      counts: user._count,
      verifications: user.verifications,
      auditTrail,
    };
  }

  @Post(':id/suspend')
  @ApiZodBody(SuspendSchema)
  async suspend(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @ZodBody(SuspendSchema) body: z.output<typeof SuspendSchema>,
    @Req() req: Request,
  ) {
    if (id === admin.id) throw badRequest('forbidden', 'You cannot suspend your own account');
    const user = await this.prisma.user.update({ where: { id }, data: { status: 'SUSPENDED' } });
    await this.tokens.revokeAll(id);
    await this.audit.record({
      actorId: admin.id,
      actorType: 'ADMIN',
      action: 'user.suspend',
      entityType: 'User',
      entityId: id,
      after: { status: 'SUSPENDED', reason: body.reason },
      meta: requestMeta(req),
    });
    return toMe(user);
  }

  @Post(':id/reactivate')
  async reactivate(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Req() req: Request) {
    const user = await this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });
    await this.audit.record({
      actorId: admin.id,
      actorType: 'ADMIN',
      action: 'user.reactivate',
      entityType: 'User',
      entityId: id,
      after: { status: 'ACTIVE' },
      meta: requestMeta(req),
    });
    return toMe(user);
  }
}
