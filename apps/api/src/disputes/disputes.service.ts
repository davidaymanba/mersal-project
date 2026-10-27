import { Injectable, Logger } from '@nestjs/common';
import {
  paginate,
  type DisputeView,
  type OpenDisputeSchema,
  type PageQuery,
  type ResolveDisputeSchema,
} from '@mersal/shared';
import type { Dispute, DisputeStatus, Prisma, Shipment } from '@prisma/client';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { badRequest, conflict, notFound } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { ShipmentStateService } from '../shipments/shipment-state.service';
import { StorageService, type UploadedFileLike } from '../storage/storage.service';
import { WalletService } from '../wallet/wallet.service';

type Tx = Prisma.TransactionClient;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Before delivery a sender may only report non-delivery or delay. */
const IN_TRANSIT_REASONS = ['NOT_DELIVERED', 'LATE'];

const fileUrl = (key: string) => `/files?key=${encodeURIComponent(key)}`;

export function toDisputeView(d: Dispute): DisputeView {
  return {
    id: d.id,
    shipmentId: d.shipmentId,
    reason: d.reason,
    description: d.description,
    evidence: d.evidenceKeys.map(fileUrl),
    status: d.status,
    resolution: d.resolution,
    refundAmount: d.refundAmount,
    resolutionNote: d.resolutionNote,
    createdAt: d.createdAt.toISOString(),
    resolvedAt: d.resolvedAt?.toISOString() ?? null,
  };
}

/**
 * Disputes freeze the traveller's earning (HELD → BLOCKED) until an admin resolves them:
 * full refund, partial refund (the traveller keeps the rest) or release to the traveller.
 */
@Injectable()
export class DisputesService {
  private readonly logger = new Logger(DisputesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly state: ShipmentStateService,
    private readonly wallet: WalletService,
    private readonly payments: PaymentsService,
    private readonly storage: StorageService,
    private readonly messaging: MessagingService,
    private readonly notifications: NotificationsService,
    private readonly reliability: ReliabilityService,
    private readonly audit: AuditService,
  ) {}

  async open(
    sender: AuthUser,
    shipmentId: string,
    input: z.output<typeof OpenDisputeSchema>,
    files: UploadedFileLike[],
    meta: RequestMeta,
  ) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment || shipment.senderId !== sender.id) throw notFound('Shipment not found');
    if (
      await this.prisma.dispute.findFirst({ where: { shipmentId, status: { not: 'RESOLVED' } } })
    ) {
      throw conflict('dispute_exists', 'A problem is already being reviewed for this shipment');
    }
    const allowed =
      shipment.status === 'DELIVERED' ||
      (['PICKED_UP', 'IN_TRANSIT'].includes(shipment.status) &&
        IN_TRANSIT_REASONS.includes(input.reason));
    if (!allowed)
      throw conflict(
        'dispute_window_closed',
        'Problems can be reported until the complaint window closes',
      );

    const evidenceKeys = await Promise.all(
      files
        .slice(0, 4)
        .map((f) => this.storage.save(`shipments/${shipmentId}/disputes`, f, PHOTO_TYPES)),
    );
    const dispute = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shipmentId}))`;
      if (await tx.dispute.findFirst({ where: { shipmentId, status: { not: 'RESOLVED' } } })) {
        throw conflict('dispute_exists', 'A problem is already being reviewed for this shipment');
      }
      const created = await tx.dispute.create({
        data: {
          shipmentId,
          openedById: sender.id,
          reason: input.reason,
          description: input.description,
          evidenceKeys,
        },
      });
      await this.freeze(tx, shipment, { type: 'USER', id: sender.id });
      return created;
    });

    await this.messaging.system(shipmentId, 'system.disputed');
    await this.audit.record({
      actorId: sender.id,
      actorType: 'USER',
      action: 'dispute.open',
      entityType: 'Dispute',
      entityId: dispute.id,
      after: { reason: input.reason },
      meta,
    });
    if (shipment.travellerId) {
      await this.notifications.notify(
        shipment.travellerId,
        'dispute.opened',
        { reference: shipment.reference },
        { link: `/app/shipments/${shipmentId}` },
      );
    }
    await this.notifications.notifyAdmins(
      'admin.disputeOpened',
      { reference: shipment.reference },
      `/admin/disputes/${dispute.id}`,
    );
    return toDisputeView(dispute);
  }

  /** Bank chargeback reported by the payment provider. */
  async openChargeback(paymentIntentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { providerIntentId: paymentIntentId },
      include: { shipment: true },
    });
    if (!payment)
      return this.logger.warn(`Chargeback for unknown payment intent ${paymentIntentId}`);
    const shipment = payment.shipment;
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shipment.id}))`;
      if (
        await tx.dispute.findFirst({
          where: { shipmentId: shipment.id, status: { not: 'RESOLVED' } },
        })
      )
        return;
      await tx.dispute.create({
        data: {
          shipmentId: shipment.id,
          reason: 'CHARGEBACK',
          description: 'Card payment disputed with the bank.',
          evidenceKeys: [],
        },
      });
      await this.freeze(tx, shipment, { type: 'SYSTEM' });
    });
    await this.notifications.notifyAdmins(
      'admin.chargeback',
      { reference: shipment.reference },
      '/admin/disputes',
    );
  }

  async forShipment(viewer: AuthUser, shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    const allowed =
      shipment &&
      (viewer.role === 'ADMIN' ||
        shipment.senderId === viewer.id ||
        shipment.travellerId === viewer.id);
    if (!allowed) throw notFound('Shipment not found');
    const disputes = await this.prisma.dispute.findMany({
      where: { shipmentId },
      orderBy: { createdAt: 'desc' },
    });
    return disputes.map(toDisputeView);
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async list(status: DisputeStatus | undefined, page: PageQuery) {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        orderBy: { createdAt: status === 'RESOLVED' ? 'desc' : 'asc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        include: {
          shipment: {
            select: {
              id: true,
              reference: true,
              price: true,
              travellerEarning: true,
              currency: true,
              status: true,
            },
          },
          openedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.dispute.count({ where }),
    ]);
    return paginate(
      items.map((d) => ({ ...toDisputeView(d), shipment: d.shipment, openedBy: d.openedBy })),
      total,
      page,
    );
  }

  async get(id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        shipment: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, email: true } },
            traveller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                reliabilityScore: true,
              },
            },
            originCity: true,
            destinationCity: true,
          },
        },
        resolvedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!dispute) throw notFound('Dispute not found');
    const [blocked, payment] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: { shipmentId: dispute.shipmentId, bucket: 'BLOCKED' },
        _sum: { amount: true },
      }),
      this.prisma.payment.findFirst({
        where: {
          shipmentId: dispute.shipmentId,
          status: { in: ['SUCCEEDED', 'PARTIALLY_REFUNDED'] },
        },
      }),
    ]);
    return {
      ...toDisputeView(dispute),
      shipment: dispute.shipment,
      resolvedBy: dispute.resolvedBy,
      blockedAmount: blocked._sum.amount ?? 0,
      refundable: payment ? payment.amount - payment.refundedAmount : 0,
    };
  }

  async startReview(adminId: string, id: string) {
    await this.prisma.dispute.updateMany({
      where: { id, status: 'OPEN' },
      data: { status: 'UNDER_REVIEW' },
    });
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'dispute.review',
      entityType: 'Dispute',
      entityId: id,
    });
    return this.get(id);
  }

  async resolve(
    adminId: string,
    id: string,
    input: z.output<typeof ResolveDisputeSchema>,
    meta: RequestMeta,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { shipment: true },
    });
    if (!dispute) throw notFound('Dispute not found');
    if (dispute.status === 'RESOLVED')
      throw conflict('invalid_status', 'This dispute is already resolved');
    const shipment = dispute.shipment;
    const payment = await this.prisma.payment.findFirst({
      where: { shipmentId: shipment.id, status: { in: ['SUCCEEDED', 'PARTIALLY_REFUNDED'] } },
    });
    const refundable = payment ? payment.amount - payment.refundedAmount : 0;
    const refund =
      input.resolution === 'FULL_REFUND'
        ? refundable
        : input.resolution === 'PARTIAL_REFUND'
          ? (input.refundAmount ?? 0)
          : 0;
    if (refund > refundable)
      throw badRequest('nothing_to_refund', `At most ${refundable} can be refunded`);

    // Money to the sender first: if the provider refuses, nothing else changes.
    if (refund > 0 && payment)
      await this.payments.refund(payment.id, refund, input.note, { type: 'ADMIN', id: adminId });

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shipment.id}))`;
      const blocked = await this.ensureBlockedEarning(tx, shipment);
      const reversed = Math.min(refund, blocked);
      if (reversed > 0)
        await this.wallet.move(tx, {
          userId: shipment.travellerId!,
          from: 'BLOCKED',
          to: 'REVERSED',
          amount: reversed,
          currency: shipment.currency,
          type: 'DISPUTE_REVERSED',
          shipmentId: shipment.id,
        });
      if (blocked - reversed > 0)
        await this.wallet.move(tx, {
          userId: shipment.travellerId!,
          from: 'BLOCKED',
          to: 'AVAILABLE',
          amount: blocked - reversed,
          currency: shipment.currency,
          type: 'DISPUTE_RELEASED',
          shipmentId: shipment.id,
        });

      await tx.dispute.update({
        where: { id },
        data: {
          status: 'RESOLVED',
          resolution: input.resolution,
          refundAmount: refund || null,
          resolutionNote: input.note,
          resolvedById: adminId,
          resolvedAt: new Date(),
        },
      });
      const current = await tx.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
      if (current.status === 'DISPUTED') {
        await this.state.transition(
          tx,
          current,
          input.resolution === 'FULL_REFUND' ? 'REFUNDED' : 'COMPLETED',
          { type: 'ADMIN', id: adminId },
          { note: input.resolution },
        );
      }
    });

    if (shipment.travellerId) await this.reliability.recompute(shipment.travellerId);
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'dispute.resolve',
      entityType: 'Dispute',
      entityId: id,
      after: { ...input, refund },
      meta,
    });
    await this.messaging.system(shipment.id, 'system.disputeResolved');
    const data = { reference: shipment.reference, resolution: input.resolution };
    await this.notifications.notify(shipment.senderId, 'dispute.resolved', data, {
      link: `/app/shipments/${shipment.id}`,
    });
    if (shipment.travellerId)
      await this.notifications.notify(shipment.travellerId, 'dispute.resolved', data, {
        link: `/app/shipments/${shipment.id}`,
      });
    return this.get(id);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Moves the shipment to DISPUTED and freezes any earning still on hold. */
  private async freeze(
    tx: Tx,
    shipment: Shipment,
    actor: { type: 'USER' | 'SYSTEM'; id?: string },
  ) {
    if (['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(shipment.status)) {
      await this.state.transition(tx, shipment, 'DISPUTED', actor);
    }
    if (!shipment.travellerId) return;
    const held = await tx.ledgerEntry.aggregate({
      where: { shipmentId: shipment.id, bucket: 'HELD' },
      _sum: { amount: true },
    });
    const amount = held._sum.amount ?? 0;
    if (amount > 0) {
      await this.wallet.move(tx, {
        userId: shipment.travellerId,
        from: 'HELD',
        to: 'BLOCKED',
        amount,
        currency: shipment.currency,
        type: 'DISPUTE_BLOCKED',
        shipmentId: shipment.id,
      });
    }
  }

  /** Disputes opened before delivery have no earning yet; create it frozen so resolution can split it. */
  private async ensureBlockedEarning(tx: Tx, shipment: Shipment): Promise<number> {
    if (!shipment.travellerId || !shipment.travellerEarning) return 0;
    const blocked = await tx.ledgerEntry.aggregate({
      where: { shipmentId: shipment.id, bucket: 'BLOCKED' },
      _sum: { amount: true },
    });
    if ((blocked._sum.amount ?? 0) > 0) return blocked._sum.amount ?? 0;
    const earned = await tx.ledgerEntry.findFirst({
      where: { shipmentId: shipment.id, type: 'EARNING_CREATED' },
    });
    if (earned) return 0;
    await this.wallet.move(tx, {
      userId: shipment.travellerId,
      to: 'BLOCKED',
      amount: shipment.travellerEarning,
      currency: shipment.currency,
      type: 'EARNING_CREATED',
      shipmentId: shipment.id,
    });
    return shipment.travellerEarning;
  }
}
