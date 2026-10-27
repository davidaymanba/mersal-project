import { Controller, Get, Headers, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { CancelShipmentSchema, PageQuerySchema, PaymentStatus, RefundSchema } from '@mersal/shared';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentUser, Public, Roles, type AuthUser } from '../common/auth-user';
import { notFound } from '../common/errors';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody, ZodQuery } from '../common/zod';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';

const LocaleQuery = z.enum(['en', 'fr', 'ar']).catch('en');

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Which provider is active, so the web app shows Stripe Checkout or the demo payment sheet. */
  @Public()
  @Get('payments/config')
  config() {
    return { provider: this.payments.providerName };
  }

  @ApiBearerAuth()
  @Post('shipments/:id/payment')
  start(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('locale') locale: string | undefined,
    @Req() req: Request,
  ) {
    return this.payments.start(
      user,
      id,
      LocaleQuery.parse(locale ?? user.locale),
      requestMeta(req),
    );
  }

  @ApiBearerAuth()
  @Post('payments/:id/confirm-demo')
  @HttpCode(200)
  confirmDemo(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payments.confirmDemo(user, id);
  }

  @ApiBearerAuth()
  @Post('payments/:id/sync')
  @HttpCode(200)
  sync(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payments.sync(user, id);
  }

  /** Stripe webhook endpoint (signature-verified, idempotent). */
  @Public()
  @ApiExcludeEndpoint()
  @Post('payments/webhook')
  @HttpCode(200)
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    return this.payments.handleWebhook(req.rawBody, signature);
  }
}

const PaymentsQuery = PageQuerySchema.extend({
  status: z.enum(Object.values(PaymentStatus) as [PaymentStatus, ...PaymentStatus[]]).optional(),
});

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminPaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('payments')
  list(@ZodQuery(PaymentsQuery) query: z.output<typeof PaymentsQuery>) {
    return this.payments.adminList(query.status, query);
  }

  @Post('payments/:id/refund')
  @ApiZodBody(RefundSchema)
  async refund(
    @Param('id') id: string,
    @ZodBody(RefundSchema) body: z.output<typeof RefundSchema>,
    @CurrentUser() admin: AuthUser,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw notFound('Payment not found');
    return this.payments.refund(
      id,
      body.amount ?? payment.amount - payment.refundedAmount,
      body.reason,
      { type: 'ADMIN', id: admin.id },
    );
  }

  @Get('shipments/:id/payments')
  shipmentPayments(@Param('id') id: string) {
    return this.prisma.payment.findMany({
      where: { shipmentId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Cancels a shipment before pickup (also after matching) and refunds the sender. */
  @Post('shipments/:id/cancel')
  @HttpCode(204)
  @ApiZodBody(CancelShipmentSchema)
  async cancel(
    @Param('id') id: string,
    @ZodBody(CancelShipmentSchema) body: z.output<typeof CancelShipmentSchema>,
    @CurrentUser() admin: AuthUser,
    @Req() req: Request,
  ) {
    await this.payments.cancelAndRefund(
      id,
      { type: 'ADMIN', id: admin.id, role: 'admin' },
      body.reason,
      requestMeta(req),
    );
  }
}
