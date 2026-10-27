import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PayoutAccountSchema, WalletView } from '@mersal/shared';
import type { LedgerBucket, LedgerEntryType, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { badRequest, notFound } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { AppConfig } from '../config/config.module';
import { NotificationsService } from '../notifications/notifications.service';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../payments/payment-provider';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { ShipmentStateService } from '../shipments/shipment-state.service';

type Tx = Prisma.TransactionClient;

export interface Movement {
  userId: string;
  /** Omit for money entering the wallet. */
  from?: LedgerBucket;
  to: LedgerBucket;
  amount: number;
  currency: string;
  type: LedgerEntryType;
  shipmentId?: string;
  payoutId?: string;
  releaseAt?: Date;
  note?: string;
}

const PAYOUT_HOUR_UTC = 9;

/** Next occurrence of the weekly payout (weekday 0 = Sunday … 6 = Saturday) at 09:00 UTC. */
export function nextPayoutDate(weekday: number, from = new Date()): Date {
  const next = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), PAYOUT_HOUR_UTC),
  );
  const daysAhead = (weekday - next.getUTCDay() + 7) % 7;
  next.setUTCDate(next.getUTCDate() + daysAhead);
  if (next <= from) next.setUTCDate(next.getUTCDate() + 7);
  return next;
}

/**
 * Traveller wallet as an append-only, double-entry ledger. A movement is a pair of entries
 * sharing a transactionId (−amount out of one bucket, +amount into another); balances are sums.
 *
 *   delivery confirmed ─► HELD ──(hold period, no dispute)──► AVAILABLE ──(weekly)──► PAID_OUT
 *                           └──(dispute)──► BLOCKED ──► AVAILABLE or REVERSED
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly state: ShipmentStateService,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async move(tx: Tx, m: Movement): Promise<string> {
    if (m.amount <= 0) throw new Error('Ledger movements must be positive');
    const transactionId = randomUUID();
    const base = {
      userId: m.userId,
      transactionId,
      type: m.type,
      currency: m.currency,
      shipmentId: m.shipmentId,
      payoutId: m.payoutId,
      note: m.note,
    };
    await tx.ledgerEntry.createMany({
      data: [
        ...(m.from ? [{ ...base, bucket: m.from, amount: -m.amount }] : []),
        { ...base, bucket: m.to, amount: m.amount, releaseAt: m.releaseAt },
      ],
    });
    return transactionId;
  }

  async holdDurationMs(): Promise<number> {
    return this.config.demoMode
      ? (await this.settings.get('wallet.demoHoldMinutes')) * 60_000
      : (await this.settings.get('wallet.holdHours')) * 3_600_000;
  }

  /** Credits the traveller when delivery is confirmed. Idempotent per shipment. */
  async recordEarning(
    tx: Tx,
    shipment: {
      id: string;
      travellerId: string | null;
      travellerEarning: number | null;
      currency: string;
    },
  ) {
    if (!shipment.travellerId || !shipment.travellerEarning) return;
    const existing = await tx.ledgerEntry.findFirst({
      where: { shipmentId: shipment.id, type: 'EARNING_CREATED' },
    });
    if (existing) return;
    await this.move(tx, {
      userId: shipment.travellerId,
      to: 'HELD',
      amount: shipment.travellerEarning,
      currency: shipment.currency,
      type: 'EARNING_CREATED',
      shipmentId: shipment.id,
      releaseAt: new Date(Date.now() + (await this.holdDurationMs())),
    });
  }

  /** Moves earnings whose complaint window has passed to AVAILABLE and completes the shipment. */
  async releaseDueHolds(): Promise<number> {
    const due = await this.prisma.ledgerEntry.findMany({
      where: {
        type: 'EARNING_CREATED',
        bucket: 'HELD',
        releaseAt: { lte: new Date() },
        shipment: { status: 'DELIVERED' },
      },
      include: { shipment: true },
    });
    let released = 0;
    for (const entry of due) {
      const done = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${entry.shipmentId}))`;
        const shipment = await tx.shipment.findUniqueOrThrow({ where: { id: entry.shipmentId! } });
        const alreadyReleased = await tx.ledgerEntry.findFirst({
          where: { shipmentId: shipment.id, type: 'HOLD_RELEASED' },
        });
        if (alreadyReleased || shipment.status !== 'DELIVERED') return false;
        await this.move(tx, {
          userId: entry.userId,
          from: 'HELD',
          to: 'AVAILABLE',
          amount: entry.amount,
          currency: entry.currency,
          type: 'HOLD_RELEASED',
          shipmentId: shipment.id,
        });
        await this.state.transition(tx, shipment, 'COMPLETED', { type: 'SYSTEM' });
        return true;
      });
      if (done) {
        released++;
        await this.notifications.notify(
          entry.userId,
          'wallet.released',
          { reference: entry.shipment?.reference ?? '' },
          { link: '/app/wallet' },
        );
      }
    }
    return released;
  }

  async balances(userId: string, tx: Tx = this.prisma): Promise<Record<LedgerBucket, number>> {
    const rows = await tx.ledgerEntry.groupBy({
      by: ['bucket'],
      where: { userId },
      _sum: { amount: true },
    });
    const result = {
      PENDING: 0,
      HELD: 0,
      AVAILABLE: 0,
      BLOCKED: 0,
      PAID_OUT: 0,
      REVERSED: 0,
    } as Record<LedgerBucket, number>;
    for (const row of rows) result[row.bucket] = row._sum.amount ?? 0;
    return result;
  }

  async view(userId: string): Promise<WalletView> {
    const [balances, expected, entries, payouts, user, holdMs, weekday] = await Promise.all([
      this.balances(userId),
      this.prisma.shipment.aggregate({
        where: { travellerId: userId, status: { in: ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'] } },
        _sum: { travellerEarning: true },
      }),
      this.prisma.ledgerEntry.findMany({
        where: { userId, amount: { gt: 0 } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { shipment: { select: { id: true, reference: true } } },
      }),
      this.prisma.payout.findMany({
        where: { travellerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.holdDurationMs(),
      this.settings.get('payouts.weekday'),
    ]);

    return {
      currency: 'EUR',
      balances: {
        expected: expected._sum.travellerEarning ?? 0,
        held: balances.HELD,
        available: balances.AVAILABLE,
        blocked: balances.BLOCKED,
        paidOut: balances.PAID_OUT,
      },
      holdHours: Math.round((holdMs / 3_600_000) * 100) / 100,
      nextPayoutAt: nextPayoutDate(weekday).toISOString(),
      payoutAccount: {
        provider: this.provider.name,
        ready: user.payoutsEnabled,
        label: user.payoutAccountLabel,
      },
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        bucket: e.bucket,
        amount: e.amount,
        currency: e.currency,
        releaseAt: e.releaseAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
        shipment: e.shipment,
      })),
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        failureReason: p.failureReason,
        createdAt: p.createdAt.toISOString(),
        paidAt: p.paidAt?.toISOString() ?? null,
      })),
    };
  }

  // ─── Payout account ──────────────────────────────────────────────────────────

  async setupPayoutAccount(
    user: AuthUser,
    details: z.output<typeof PayoutAccountSchema> | undefined,
    locale: string,
    meta: RequestMeta,
  ) {
    const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const web = `${this.config.env.WEB_ORIGIN}/${locale}/app/wallet`;
    if (this.provider.name === 'demo' && !details)
      throw badRequest('validation_failed', 'Bank details are required');

    const { accountId, onboardingUrl } = await this.provider.createPayoutAccount({
      userId: user.id,
      email: user.email,
      country: 'FR',
      existingAccountId: record.payoutAccountId,
      returnUrl: `${web}?payout=return`,
      refreshUrl: `${web}?payout=refresh`,
    });
    const ready = await this.provider.payoutAccountReady(accountId);
    const label = details
      ? `${details.holderName} · ••${details.iban.slice(-4)}`
      : record.payoutAccountLabel;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { payoutAccountId: accountId, payoutAccountLabel: label, payoutsEnabled: ready },
    });
    await this.audit.record({
      actorId: user.id,
      actorType: 'USER',
      action: 'wallet.payout_account',
      entityType: 'User',
      entityId: user.id,
      after: { provider: this.provider.name, ready },
      meta,
    });
    return { ready, onboardingUrl };
  }

  /** Re-checks a hosted onboarding (Stripe) after the traveller returns. */
  async refreshPayoutAccount(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.payoutAccountId) return { ready: false };
    const ready = await this.provider.payoutAccountReady(user.payoutAccountId);
    if (ready !== user.payoutsEnabled)
      await this.prisma.user.update({ where: { id: userId }, data: { payoutsEnabled: ready } });
    return { ready };
  }

  // ─── Weekly payouts ──────────────────────────────────────────────────────────

  /** Pays every traveller's AVAILABLE balance in one transfer each. */
  async runPayouts(actor: { type: 'SYSTEM' | 'ADMIN'; id?: string }) {
    const rows = await this.prisma.ledgerEntry.groupBy({
      by: ['userId', 'currency'],
      where: { bucket: 'AVAILABLE' },
      _sum: { amount: true },
    });
    const summary = { paid: 0, failed: 0, skipped: 0, total: 0 };
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 7 * 86_400_000);

    for (const row of rows) {
      const amount = row._sum.amount ?? 0;
      if (amount <= 0) continue;
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: row.userId } });
      if (!user.payoutsEnabled || !user.payoutAccountId) {
        summary.skipped++;
        continue;
      }
      const payout = await this.prisma.$transaction(async (tx) => {
        const created = await tx.payout.create({
          data: {
            travellerId: user.id,
            amount,
            currency: row.currency,
            status: 'PROCESSING',
            periodStart,
            periodEnd,
            attempts: 1,
          },
        });
        await this.move(tx, {
          userId: user.id,
          from: 'AVAILABLE',
          to: 'PAID_OUT',
          amount,
          currency: row.currency,
          type: 'PAYOUT_SENT',
          payoutId: created.id,
        });
        return created;
      });
      const ok = await this.sendTransfer(payout.id, user.payoutAccountId);
      summary[ok ? 'paid' : 'failed']++;
      if (ok) summary.total += amount;
    }

    await this.audit.record({
      actorId: actor.id,
      actorType: actor.type,
      action: 'payouts.run',
      entityType: 'Payout',
      after: summary,
    });
    return summary;
  }

  async retryPayout(payoutId: string, adminId: string, meta: RequestMeta) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: { traveller: true },
    });
    if (!payout) throw notFound('Payout not found');
    if (payout.status !== 'FAILED')
      throw badRequest('invalid_status', 'Only failed payouts can be retried');
    if (!payout.traveller.payoutAccountId)
      throw badRequest('payout_account_required', 'Traveller has no payout account');

    await this.prisma.$transaction(async (tx) => {
      await tx.payout.update({
        where: { id: payoutId },
        data: { status: 'PROCESSING', attempts: { increment: 1 }, failureReason: null },
      });
      await this.move(tx, {
        userId: payout.travellerId,
        from: 'AVAILABLE',
        to: 'PAID_OUT',
        amount: payout.amount,
        currency: payout.currency,
        type: 'PAYOUT_SENT',
        payoutId,
      });
    });
    const ok = await this.sendTransfer(payoutId, payout.traveller.payoutAccountId);
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'payout.retry',
      entityType: 'Payout',
      entityId: payoutId,
      after: { ok },
      meta,
    });
    return this.prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
  }

  /** Calls the provider; on failure the money goes back to AVAILABLE for the next run. */
  private async sendTransfer(payoutId: string, accountId: string): Promise<boolean> {
    const payout = await this.prisma.payout.findUniqueOrThrow({ where: { id: payoutId } });
    try {
      const { transferId } = await this.provider.transfer({
        accountId,
        amount: payout.amount,
        currency: payout.currency,
        payoutId,
      });
      await this.prisma.payout.update({
        where: { id: payoutId },
        data: { status: 'PAID', paidAt: new Date(), providerTransferId: transferId },
      });
      await this.notifications.notify(
        payout.travellerId,
        'payout.paid',
        { amount: payout.amount, currency: payout.currency },
        { link: '/app/wallet' },
      );
      return true;
    } catch (error) {
      const reason = (error as Error).message.slice(0, 300);
      this.logger.warn(`Payout ${payoutId} failed: ${reason}`);
      await this.prisma.$transaction(async (tx) => {
        await tx.payout.update({
          where: { id: payoutId },
          data: { status: 'FAILED', failureReason: reason },
        });
        await this.move(tx, {
          userId: payout.travellerId,
          from: 'PAID_OUT',
          to: 'AVAILABLE',
          amount: payout.amount,
          currency: payout.currency,
          type: 'PAYOUT_FAILED',
          payoutId,
        });
      });
      await this.notifications.notify(
        payout.travellerId,
        'payout.failed',
        {},
        { link: '/app/wallet' },
      );
      await this.notifications.notifyAdmins('admin.payoutFailed', { reason }, '/admin/payouts');
      return false;
    }
  }
}
