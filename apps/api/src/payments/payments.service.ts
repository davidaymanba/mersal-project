import { Inject, Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { paginate, type PageQuery, type PaymentStart } from '@mersal/shared';
import { Prisma, type PaymentStatus, type ShipmentStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { badRequest, conflict, forbidden, notFound } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { AppConfig } from '../config/config.module';
import { JobsService } from '../jobs/jobs.module';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { Actor } from '../shipments/shipment-state.service';
import { ShipmentStateService } from '../shipments/shipment-state.service';
import { PAYMENT_PROVIDER, type PaymentProvider, type ProviderEvent } from './payment-provider';
import { StripePaymentProvider } from './stripe.provider';

/** Statuses where a paid shipment can still be cancelled with a full refund. */
const REFUNDABLE_BEFORE_PICKUP: ShipmentStatus[] = ['PAID', 'MATCHING', 'NO_MATCH', 'MATCHED'];
const SENDER_REFUNDABLE: ShipmentStatus[] = ['PAID', 'MATCHING', 'NO_MATCH', 'MATCHED'];

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly state: ShipmentStateService,
    private readonly jobs: JobsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly moduleRef: ModuleRef,
  ) {}

  get providerName() {
    return this.provider.name;
  }

  /** Creates (or reuses) the sender's payment for a quoted shipment. */
  async start(
    user: AuthUser,
    shipmentId: string,
    locale: string,
    meta: RequestMeta,
  ): Promise<PaymentStart> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { category: true },
    });
    if (!shipment || shipment.senderId !== user.id) throw notFound('Shipment not found');
    if (shipment.status !== 'QUOTED' || shipment.price == null)
      throw conflict('invalid_status', 'This shipment is not awaiting payment');
    if (shipment.category.requiresPhotos && shipment.photoKeys.length === 0) {
      throw badRequest('photos_required', 'Add a photo of the contents before paying');
    }

    const open = await this.prisma.payment.findFirst({
      where: { shipmentId, status: 'REQUIRES_PAYMENT', provider: this.provider.name },
      orderBy: { createdAt: 'desc' },
    });
    const payment =
      open ??
      (await this.prisma.payment.create({
        data: {
          shipmentId,
          userId: user.id,
          provider: this.provider.name,
          amount: shipment.price,
          currency: shipment.currency,
        },
      }));

    const shipmentUrl = `${this.config.env.WEB_ORIGIN}/${locale}/app/shipments/${shipmentId}`;
    let checkout: { providerPaymentId: string; redirectUrl?: string };
    try {
      checkout = await this.provider.createCheckout({
        paymentId: payment.id,
        shipmentId,
        amount: payment.amount,
        currency: payment.currency,
        description: `Mersal ${shipment.reference}`,
        customerEmail: user.email,
        successUrl: `${shipmentUrl}?payment=${payment.id}`,
        cancelUrl: `${shipmentUrl}?payment=cancelled`,
      });
    } catch (error) {
      this.logger.error(`Checkout failed for ${payment.id}: ${(error as Error).message}`);
      throw badRequest(
        'payment_provider_error',
        'The payment provider is unavailable. Please try again.',
      );
    }
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: checkout.providerPaymentId, status: 'REQUIRES_PAYMENT' },
    });
    await this.audit.record({
      actorId: user.id,
      actorType: 'USER',
      action: 'payment.start',
      entityType: 'Payment',
      entityId: payment.id,
      after: { amount: payment.amount },
      meta,
    });

    return {
      paymentId: payment.id,
      provider: this.provider.name,
      amount: payment.amount,
      currency: payment.currency,
      redirectUrl: checkout.redirectUrl,
    };
  }

  /** Demo provider only: the sender confirms the simulated card payment. */
  async confirmDemo(user: AuthUser, paymentId: string) {
    if (this.provider.name !== 'demo') throw forbidden('forbidden', 'Demo payments are disabled');
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== user.id) throw notFound('Payment not found');
    await this.handleSucceeded(paymentId, { type: 'USER', id: user.id });
    return { status: 'SUCCEEDED' as PaymentStatus };
  }

  /** Polls the provider when the webhook has not been received (e.g. no tunnel in local dev). */
  async sync(user: AuthUser, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== user.id) throw notFound('Payment not found');
    if (
      payment.status === 'REQUIRES_PAYMENT' &&
      payment.providerPaymentId &&
      payment.provider === this.provider.name
    ) {
      const status = await this.provider.checkoutStatus(payment.providerPaymentId);
      if (status === 'paid') await this.handleSucceeded(paymentId, { type: 'SYSTEM' });
    }
    const updated = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    return { status: updated.status };
  }

  /** Idempotent: marks the payment as paid, moves the shipment to PAID and starts matching. */
  async handleSucceeded(paymentId: string, actor: Actor) {
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { shipment: true },
      });
      if (!payment) throw notFound('Payment not found');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.shipmentId}))`;
      const fresh = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (fresh.status === 'SUCCEEDED') return null;
      if (fresh.status !== 'REQUIRES_PAYMENT')
        throw conflict('payment_not_pending', 'This payment is not pending');
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'SUCCEEDED' } });
      const shipment = await tx.shipment.findUniqueOrThrow({ where: { id: payment.shipmentId } });
      await this.state.transition(tx, shipment, 'PAID', actor);
      return shipment;
    });
    if (!result) return;

    await this.jobs.runMatching(result.id, 'PAYMENT');
    await this.notifications.notify(
      result.senderId,
      'payment.succeeded',
      { reference: result.reference, amount: result.price ?? 0, currency: result.currency },
      {
        link: `/app/shipments/${result.id}`,
        email: {
          template: 'paymentReceipt',
          vars: {
            reference: result.reference,
            amount: formatAmount(result.price ?? 0, result.currency),
          },
          ctaLabel: result.reference,
        },
      },
    );
  }

  // ─── Webhooks ────────────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    if (!(this.provider instanceof StripePaymentProvider))
      throw notFound('Webhooks are not enabled');
    if (!rawBody || !signature) throw badRequest('validation_failed', 'Missing signature');
    let event: ProviderEvent;
    try {
      event = this.provider.parseWebhook(rawBody, signature);
    } catch {
      throw badRequest('validation_failed', 'Invalid signature');
    }

    try {
      await this.prisma.webhookEvent.create({
        data: {
          id: event.id,
          provider: 'stripe',
          type: event.type,
          payload: event.object as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        return { duplicate: true };
      throw error;
    }

    const object = event.object;
    const metadata = (object.metadata ?? {}) as Record<string, string>;
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        if (object.payment_status === 'paid' && metadata.paymentId) {
          if (typeof object.payment_intent === 'string') {
            await this.prisma.payment.updateMany({
              where: { id: metadata.paymentId },
              data: { providerIntentId: object.payment_intent },
            });
          }
          await this.handleSucceeded(metadata.paymentId, { type: 'SYSTEM' });
        }
        break;
      case 'checkout.session.expired':
        if (metadata.paymentId) {
          await this.prisma.payment.updateMany({
            where: { id: metadata.paymentId, status: 'REQUIRES_PAYMENT' },
            data: { status: 'FAILED', failureReason: 'expired' },
          });
        }
        break;
      case 'account.updated': {
        const capabilities = (object.capabilities ?? {}) as Record<string, string>;
        await this.prisma.user.updateMany({
          where: { payoutAccountId: String(object.id) },
          data: {
            payoutsEnabled: capabilities.transfers === 'active' && object.payouts_enabled === true,
          },
        });
        break;
      }
      case 'charge.dispute.created': {
        // Resolved lazily: DisputesService depends on this service for refunds.
        const { DisputesService } = await import('../disputes/disputes.service.js');
        if (typeof object.payment_intent === 'string') {
          await this.moduleRef
            .get(DisputesService, { strict: false })
            .openChargeback(object.payment_intent);
        }
        break;
      }
      default:
        break;
    }
    return { received: true };
  }

  // ─── Cancellation & refunds ──────────────────────────────────────────────────

  /**
   * Cancels a paid shipment before pickup and refunds the sender in full.
   * Senders may cancel until a traveller is assigned; admins also after matching.
   */
  async cancelAndRefund(
    shipmentId: string,
    actor: Actor & { role: 'sender' | 'admin' },
    reason: string | undefined,
    meta: RequestMeta,
  ) {
    const allowed = actor.role === 'admin' ? REFUNDABLE_BEFORE_PICKUP : SENDER_REFUNDABLE;
    const { shipment, payment } = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shipmentId}))`;
      const shipment = await tx.shipment.findUnique({ where: { id: shipmentId } });
      if (!shipment || (actor.role === 'sender' && shipment.senderId !== actor.id))
        throw notFound('Shipment not found');
      if (!allowed.includes(shipment.status))
        throw conflict('not_cancellable', 'This shipment can no longer be cancelled');

      await tx.matchOffer.updateMany({
        where: { shipmentId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      if (shipment.status === 'MATCHED' && shipment.tripId) {
        // Give the traveller their space back.
        await tx.trip.update({
          where: { id: shipment.tripId },
          data: {
            remainingGrams: { increment: shipment.weightGrams },
            itemsAccepted: { decrement: 1 },
          },
        });
      }
      await this.state.transition(tx, shipment, 'CANCELLED', actor, {
        note: reason,
        data: { cancelReason: reason },
      });
      const payment = await tx.payment.findFirst({ where: { shipmentId, status: 'SUCCEEDED' } });
      return { shipment, payment };
    });

    if (payment) {
      await this.refund(
        payment.id,
        payment.amount - payment.refundedAmount,
        reason ?? 'cancelled',
        actor,
      );
      await this.prisma.$transaction((tx) =>
        this.state.transition(tx, { id: shipmentId, status: 'CANCELLED' }, 'REFUNDED', {
          type: 'SYSTEM',
        }),
      );
    }

    await this.audit.record({
      actorId: actor.id,
      actorType: actor.type,
      action: 'shipment.cancel_refund',
      entityType: 'Shipment',
      entityId: shipmentId,
      after: { refunded: payment?.amount ?? 0, reason },
      meta,
    });
    if (actor.role === 'admin') {
      await this.notifications.notify(
        shipment.senderId,
        'shipment.refunded',
        { reference: shipment.reference },
        { link: `/app/shipments/${shipmentId}` },
      );
    }
    if (shipment.travellerId) {
      await this.notifications.notify(
        shipment.travellerId,
        'shipment.cancelled',
        { reference: shipment.reference },
        { link: '/app/trips' },
      );
    }
  }

  /** Refunds part or all of a payment through the provider and records it. */
  async refund(paymentId: string, amount: number, reason: string, actor: Actor) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status === 'REQUIRES_PAYMENT' || payment.status === 'FAILED')
      throw notFound('Payment not found');
    const refundable = payment.amount - payment.refundedAmount;
    if (amount <= 0 || amount > refundable)
      throw badRequest('nothing_to_refund', `At most ${refundable} can be refunded`);

    try {
      await this.provider.refund(payment.providerPaymentId ?? '', amount);
    } catch (error) {
      this.logger.error(`Refund failed for ${paymentId}: ${(error as Error).message}`);
      throw badRequest(
        'payment_provider_error',
        'The refund could not be processed by the payment provider',
      );
    }
    const refundedAmount = payment.refundedAmount + amount;
    const updated = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        refundedAmount,
        status: refundedAmount >= payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    });
    await this.audit.record({
      actorId: actor.id,
      actorType: actor.type,
      action: 'payment.refund',
      entityType: 'Payment',
      entityId: paymentId,
      after: { amount, reason },
    });
    return updated;
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async adminList(status: PaymentStatus | undefined, page: PageQuery) {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        include: {
          shipment: { select: { id: true, reference: true, status: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);
    return paginate(items, total, page);
  }
}

function formatAmount(minor: number, currency: string) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(minor / 100);
}
