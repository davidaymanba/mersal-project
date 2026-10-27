import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PageQuerySchema, paginate, PayoutAccountSchema, PayoutStatus } from '@mersal/shared';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser, Roles, type AuthUser } from '../common/auth-user';
import { badRequest } from '../common/errors';
import { requestMeta } from '../common/request-meta';
import { ZodQuery } from '../common/zod';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  view(@CurrentUser() user: AuthUser) {
    return this.wallet.view(user.id);
  }

  /** Demo: body with holder name and IBAN. Stripe: no body, returns a hosted onboarding URL. */
  @Post('payout-account')
  @HttpCode(200)
  setup(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
    @Query('locale') locale: string | undefined,
    @Req() req: Request,
  ) {
    const parsed =
      body && typeof body === 'object' && Object.keys(body).length
        ? PayoutAccountSchema.safeParse(body)
        : null;
    if (parsed && !parsed.success)
      throw badRequest('validation_failed', 'Invalid bank details', {
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          code: i.code,
          message: i.message,
        })),
      });
    return this.wallet.setupPayoutAccount(
      user,
      parsed?.data,
      locale ?? user.locale,
      requestMeta(req),
    );
  }

  @Post('payout-account/refresh')
  @HttpCode(200)
  refresh(@CurrentUser() user: AuthUser) {
    return this.wallet.refreshPayoutAccount(user.id);
  }
}

const PayoutsQuery = PageQuerySchema.extend({
  status: z.enum(Object.values(PayoutStatus) as [PayoutStatus, ...PayoutStatus[]]).optional(),
});

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/payouts')
export class AdminPayoutsController {
  constructor(
    private readonly wallet: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async list(@ZodQuery(PayoutsQuery) query: z.output<typeof PayoutsQuery>) {
    const where = query.status ? { status: query.status } : {};
    const [items, total, available] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          traveller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              payoutAccountLabel: true,
            },
          },
        },
      }),
      this.prisma.payout.count({ where }),
      this.prisma.ledgerEntry.aggregate({ where: { bucket: 'AVAILABLE' }, _sum: { amount: true } }),
    ]);
    return { ...paginate(items, total, query), availableToPay: available._sum.amount ?? 0 };
  }

  /** Runs the weekly payout now (it also runs automatically on schedule). */
  @Post('run')
  @HttpCode(200)
  run(@CurrentUser() admin: AuthUser) {
    return this.wallet.runPayouts({ type: 'ADMIN', id: admin.id });
  }

  @Post(':id/retry')
  @HttpCode(200)
  retry(@Param('id') id: string, @CurrentUser() admin: AuthUser, @Req() req: Request) {
    return this.wallet.retryPayout(id, admin.id, requestMeta(req));
  }

  /** Forces the hold release check (demo convenience). */
  @Post('release-holds')
  @HttpCode(200)
  async release() {
    return { released: await this.wallet.releaseDueHolds() };
  }
}
