import { Injectable } from '@nestjs/common';
import type { LocalizedText } from '@mersal/shared';
import type { Shipment, ShipmentStatus } from '@prisma/client';
import { timingSafeEqual } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { badRequest, conflict, notFound, tooMany } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { AppConfig } from '../config/config.module';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../mail/sms.service';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShipmentStateService } from '../shipments/shipment-state.service';
import { WalletService } from '../wallet/wallet.service';

const MAX_CODE_ATTEMPTS = 5;

const sameCode = (expected: string | null, given: string) =>
  !!expected &&
  expected.length === given.length &&
  timingSafeEqual(Buffer.from(expected), Buffer.from(given));

const RECIPIENT_SMS: Record<
  string,
  (v: { reference: string; url: string; code: string }) => string
> = {
  en: (v) =>
    `Mersal: parcel ${v.reference} is on its way to you. Track it: ${v.url} — give code ${v.code} to the traveller on delivery.`,
  fr: (v) =>
    `Mersal : le colis ${v.reference} est en route vers vous. Suivi : ${v.url} — donnez le code ${v.code} au voyageur à la livraison.`,
  ar: (v) =>
    `مرسال: الطرد ${v.reference} في الطريق إليك. التتبع: ${v.url} — أعطِ الرمز ${v.code} للمسافر عند التسليم.`,
};

/**
 * Hand-over steps performed by the traveller. Each step is confirmed with a one-time code
 * held by the other party: the sender's pickup code and the recipient's delivery code.
 */
@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly state: ShipmentStateService,
    private readonly wallet: WalletService,
    private readonly messaging: MessagingService,
    private readonly notifications: NotificationsService,
    private readonly sms: SmsService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  async pickup(traveller: AuthUser, shipmentId: string, code: string, meta: RequestMeta) {
    const shipment = await this.verifyCode(traveller, shipmentId, code, ['MATCHED'], 'pickupCode');
    await this.prisma.$transaction(async (tx) => {
      await this.state.transition(tx, shipment, 'PICKED_UP', { type: 'USER', id: traveller.id });
      if (shipment.tripId) {
        await tx.trip.updateMany({
          where: { id: shipment.tripId, status: 'PUBLISHED' },
          data: { status: 'IN_PROGRESS' },
        });
      }
    });
    await this.messaging.system(shipmentId, 'system.pickedUp');
    await this.audit.record({
      actorId: traveller.id,
      actorType: 'USER',
      action: 'shipment.pickup',
      entityType: 'Shipment',
      entityId: shipmentId,
      meta,
    });
    await this.notifications.notify(
      shipment.senderId,
      'shipment.pickedUp',
      { reference: shipment.reference },
      { link: `/app/shipments/${shipmentId}` },
    );
    await this.informRecipient(shipment);
  }

  async startTransit(traveller: AuthUser, shipmentId: string) {
    const shipment = await this.travellerShipment(traveller, shipmentId);
    await this.prisma.$transaction((tx) =>
      this.state.transition(tx, shipment, 'IN_TRANSIT', { type: 'USER', id: traveller.id }),
    );
    await this.messaging.system(shipmentId, 'system.inTransit');
    await this.notifications.notify(
      shipment.senderId,
      'shipment.inTransit',
      { reference: shipment.reference },
      { link: `/app/shipments/${shipmentId}` },
    );
  }

  async deliver(traveller: AuthUser, shipmentId: string, code: string, meta: RequestMeta) {
    const shipment = await this.verifyCode(
      traveller,
      shipmentId,
      code,
      ['PICKED_UP', 'IN_TRANSIT'],
      'deliveryCode',
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shipmentId}))`;
      await this.state.transition(tx, shipment, 'DELIVERED', { type: 'USER', id: traveller.id });
      await this.wallet.recordEarning(tx, shipment);
    });
    await this.messaging.system(shipmentId, 'system.delivered');
    await this.audit.record({
      actorId: traveller.id,
      actorType: 'USER',
      action: 'shipment.deliver',
      entityType: 'Shipment',
      entityId: shipmentId,
      meta,
    });
    await this.notifications.notify(
      shipment.senderId,
      'shipment.delivered',
      { reference: shipment.reference },
      {
        link: `/app/shipments/${shipmentId}`,
        email: {
          template: 'shipmentDelivered',
          vars: { reference: shipment.reference },
          ctaLabel: shipment.reference,
        },
      },
    );
    await this.notifications.notify(
      traveller.id,
      'wallet.earningHeld',
      { reference: shipment.reference, amount: shipment.travellerEarning ?? 0 },
      { link: '/app/wallet' },
    );
  }

  /** Lets support unblock a hand-over after too many wrong codes. */
  async resetCodeAttempts(adminId: string, shipmentId: string, meta: RequestMeta) {
    await this.prisma.shipment.update({ where: { id: shipmentId }, data: { codeAttempts: 0 } });
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'shipment.reset_code_attempts',
      entityType: 'Shipment',
      entityId: shipmentId,
      meta,
    });
  }

  // ─── Public tracking ─────────────────────────────────────────────────────────

  async track(token: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingToken: token },
      include: {
        originCity: true,
        destinationCity: true,
        traveller: true,
        trip: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!shipment) throw notFound('Shipment not found');
    const showCode = ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'].includes(shipment.status);
    return {
      reference: shipment.reference,
      status: shipment.status,
      originCity: shipment.originCity.names as LocalizedText,
      destinationCity: shipment.destinationCity.names as LocalizedText,
      recipientName: shipment.recipientName,
      traveller: shipment.traveller ? { firstName: shipment.traveller.firstName } : null,
      departureDate: shipment.trip?.departureDate.toISOString().slice(0, 10) ?? null,
      // The tracking link is the recipient's secret: it carries the code they hand to the traveller.
      deliveryCode: showCode ? shipment.deliveryCode : null,
      events: shipment.events
        .filter((e) => e.toStatus !== 'QUOTED')
        .map((e) => ({ status: e.toStatus, createdAt: e.createdAt.toISOString() })),
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async travellerShipment(traveller: AuthUser, shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment || shipment.travellerId !== traveller.id) throw notFound('Shipment not found');
    return shipment;
  }

  private async verifyCode(
    traveller: AuthUser,
    shipmentId: string,
    code: string,
    allowed: ShipmentStatus[],
    field: 'pickupCode' | 'deliveryCode',
  ): Promise<Shipment> {
    const shipment = await this.travellerShipment(traveller, shipmentId);
    if (!allowed.includes(shipment.status))
      throw conflict('invalid_status', 'This step is not available for the shipment right now');
    if (shipment.codeAttempts >= MAX_CODE_ATTEMPTS)
      throw tooMany('too_many_attempts', 'Too many wrong codes. Contact support.');

    if (!sameCode(shipment[field], code.trim())) {
      const updated = await this.prisma.shipment.update({
        where: { id: shipmentId },
        data: { codeAttempts: { increment: 1 } },
      });
      throw badRequest('invalid_code', 'The code is not correct', {
        attemptsLeft: Math.max(0, MAX_CODE_ATTEMPTS - updated.codeAttempts),
      });
    }
    if (shipment.codeAttempts > 0)
      await this.prisma.shipment.update({ where: { id: shipmentId }, data: { codeAttempts: 0 } });
    return shipment;
  }

  /** The recipient gets the tracking link and delivery code once the parcel is on its way. */
  private async informRecipient(shipment: Shipment) {
    const sender = await this.prisma.user.findUniqueOrThrow({ where: { id: shipment.senderId } });
    const locale = ['en', 'fr', 'ar'].includes(sender.locale) ? sender.locale : 'fr';
    const url = `${this.config.env.WEB_ORIGIN}/${locale}/track/${shipment.trackingToken}`;
    const vars = { reference: shipment.reference, url, code: shipment.deliveryCode ?? '' };
    await this.sms.send(shipment.recipientPhone, RECIPIENT_SMS[locale]!(vars));
    if (shipment.recipientEmail) {
      await this.mail.send({
        to: shipment.recipientEmail,
        template: 'recipientOnTheWay',
        locale,
        vars: { name: shipment.recipientName, reference: shipment.reference },
        code: shipment.deliveryCode ?? undefined,
        cta: { label: shipment.reference, url },
      });
    }
  }
}
