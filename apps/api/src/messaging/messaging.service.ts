import { Injectable } from '@nestjs/common';
import { maskContactDetails } from '@mersal/shared';
import type { Prisma, ShipmentStatus } from '@prisma/client';
import type { AuthUser } from '../common/auth-user';
import { conflict, notFound } from '../common/errors';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

/** Chat is open from matching until the parcel is delivered (and during disputes). */
const CHAT_OPEN: ShipmentStatus[] = ['MATCHED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'DISPUTED'];
const NOTIFY_COOLDOWN_MS = 10 * 60_000;

export interface MessageView {
  id: string;
  senderId: string | null;
  body: string;
  /** Only for admins, when masking changed the text. */
  originalBody?: string | null;
  masked: boolean;
  isSystem: boolean;
  readAt: string | null;
  createdAt: string;
}

const toView = (m: Prisma.MessageGetPayload<object>, isAdmin: boolean): MessageView => ({
  id: m.id,
  senderId: m.senderId,
  body: m.body,
  ...(isAdmin && { originalBody: m.originalBody }),
  masked: !!m.originalBody,
  isSystem: m.isSystem,
  readAt: m.readAt?.toISOString() ?? null,
  createdAt: m.createdAt.toISOString(),
});

@Injectable()
export class MessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly notifications: NotificationsService,
  ) {}

  /** System messages store an i18n key (e.g. "system.pickedUp") that clients translate. */
  async system(shipmentId: string, key: string, tx: Prisma.TransactionClient = this.prisma) {
    const conversation = await tx.conversation.upsert({
      where: { shipmentId },
      update: {},
      create: { shipmentId },
    });
    const message = await tx.message.create({
      data: { conversationId: conversation.id, body: key, isSystem: true },
    });
    this.realtime.toShipment(shipmentId, 'message', toView(message, false));
  }

  async list(viewer: AuthUser, shipmentId: string) {
    const shipment = await this.participant(viewer, shipmentId);
    const conversation = await this.prisma.conversation.findUnique({
      where: { shipmentId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 500 } },
    });
    return {
      open: CHAT_OPEN.includes(shipment.status),
      messages: (conversation?.messages ?? []).map((m) => toView(m, viewer.role === 'ADMIN')),
    };
  }

  async send(viewer: AuthUser, shipmentId: string, body: string) {
    const shipment = await this.participant(viewer, shipmentId);
    if (
      viewer.role === 'ADMIN' &&
      viewer.id !== shipment.senderId &&
      viewer.id !== shipment.travellerId
    ) {
      throw conflict('forbidden', 'Admins can read conversations but not post in them');
    }
    if (!CHAT_OPEN.includes(shipment.status))
      throw conflict('invalid_status', 'The conversation is closed');

    const { text, masked } = maskContactDetails(body.trim());
    const conversation = await this.prisma.conversation.upsert({
      where: { shipmentId },
      update: {},
      create: { shipmentId },
    });
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: viewer.id,
        body: text,
        originalBody: masked ? body : null,
      },
    });
    const view = toView(message, false);
    this.realtime.toShipment(shipmentId, 'message', view);

    const recipientId = viewer.id === shipment.senderId ? shipment.travellerId : shipment.senderId;
    if (recipientId) await this.notifyRecipient(recipientId, shipmentId, shipment.reference);
    return view;
  }

  async markRead(viewer: AuthUser, shipmentId: string) {
    await this.participant(viewer, shipmentId);
    await this.prisma.message.updateMany({
      where: { conversation: { shipmentId }, readAt: null, NOT: { senderId: viewer.id } },
      data: { readAt: new Date() },
    });
  }

  /** One notification per burst of messages, not one per message. */
  private async notifyRecipient(recipientId: string, shipmentId: string, reference: string) {
    const recent = await this.prisma.notification.findFirst({
      where: {
        userId: recipientId,
        type: 'message.received',
        link: `/app/shipments/${shipmentId}`,
        createdAt: { gt: new Date(Date.now() - NOTIFY_COOLDOWN_MS) },
      },
    });
    if (!recent)
      await this.notifications.notify(
        recipientId,
        'message.received',
        { reference },
        { link: `/app/shipments/${shipmentId}` },
      );
  }

  private async participant(viewer: AuthUser, shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    const allowed =
      shipment &&
      (viewer.role === 'ADMIN' ||
        shipment.senderId === viewer.id ||
        shipment.travellerId === viewer.id);
    if (!allowed) throw notFound('Shipment not found');
    return shipment;
  }
}
