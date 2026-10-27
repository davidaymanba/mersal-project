import { Injectable } from '@nestjs/common';
import {
  generateShipmentReference,
  paginate,
  QuoteRequestSchema,
  type CreateShipmentSchema,
  type PageQuery,
  type ShipmentView,
} from '@mersal/shared';
import { Prisma, type ShipmentStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { badRequest, conflict, forbidden, notFound } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, type UploadedFileLike } from '../storage/storage.service';
import { shipmentInclude, toShipmentSummary, toShipmentView } from './shipment.mapper';
import { ShipmentStateService } from './shipment-state.service';

type CreateShipmentInput = z.output<typeof CreateShipmentSchema>;

const MAX_PHOTOS = 4;
const MAX_WINDOW_DAYS = 60;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Statuses a sender can cancel from without involving a traveller. */
export const SENDER_CANCELLABLE: ShipmentStatus[] = ['DRAFT', 'QUOTED'];

const pickContact = (u: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  phone: u.phone,
});

const startOfTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly state: ShipmentStateService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly payments: PaymentsService,
  ) {}

  async create(
    user: AuthUser,
    input: CreateShipmentInput,
    meta: RequestMeta,
  ): Promise<ShipmentView> {
    if (!user.emailVerified) throw forbidden('email_not_verified', 'Confirm your email first');

    const quote = await this.prisma.quote.findUnique({
      where: { id: input.quoteId },
      include: { shipment: true },
    });
    if (!quote || (quote.userId && quote.userId !== user.id)) throw notFound('Quote not found');
    if (quote.shipment) throw conflict('quote_used', 'This quote was already used');
    if (quote.expiresAt < new Date())
      throw badRequest('quote_expired', 'This quote has expired. Please get a new price.');

    const earliest = new Date(`${input.earliestDate}T00:00:00Z`);
    const latest = new Date(`${input.latestDate}T00:00:00Z`);
    if (
      earliest < startOfTodayUtc() ||
      latest.getTime() - earliest.getTime() > MAX_WINDOW_DAYS * 86_400_000
    ) {
      throw badRequest(
        'invalid_dates',
        `Dates must start today or later and span at most ${MAX_WINDOW_DAYS} days`,
      );
    }

    const parcel = QuoteRequestSchema.parse(quote.inputs);
    const category = await this.prisma.category.findUniqueOrThrow({
      where: { code: parcel.categoryCode },
    });

    const shipment = await this.createWithUniqueReference(async (reference) =>
      this.prisma.$transaction(async (tx) => {
        const created = await tx.shipment.create({
          data: {
            reference,
            senderId: user.id,
            corridorId: quote.corridorId,
            originCityId: parcel.originCityId,
            destinationCityId: parcel.destinationCityId,
            categoryId: category.id,
            status: 'QUOTED',
            description: input.description,
            weightGrams: parcel.weightGrams,
            lengthCm: parcel.lengthCm,
            widthCm: parcel.widthCm,
            heightCm: parcel.heightCm,
            declaredValue: parcel.declaredValue,
            urgency: parcel.urgency,
            options: parcel.options,
            earliestDate: earliest,
            latestDate: latest,
            restrictedItemsAckAt: new Date(),
            quoteId: quote.id,
            price: quote.total,
            travellerEarning: quote.travellerEarning,
            commission: quote.commission,
            currency: quote.currency,
            recipientName: input.recipientName,
            recipientPhone: input.recipientPhone,
            recipientEmail: input.recipientEmail,
            trackingToken: randomBytes(18).toString('base64url'),
          },
        });
        await tx.shipmentEvent.create({
          data: { shipmentId: created.id, toStatus: 'QUOTED', actorType: 'USER', actorId: user.id },
        });
        if (!quote.userId)
          await tx.quote.update({ where: { id: quote.id }, data: { userId: user.id } });
        return created;
      }),
    );

    await this.audit.record({
      actorId: user.id,
      actorType: 'USER',
      action: 'shipment.create',
      entityType: 'Shipment',
      entityId: shipment.id,
      after: { reference: shipment.reference, price: shipment.price },
      meta,
    });
    return this.view(user, shipment.id);
  }

  async addPhotos(user: AuthUser, id: string, files: UploadedFileLike[]): Promise<ShipmentView> {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment || shipment.senderId !== user.id) throw notFound('Shipment not found');
    if (!SENDER_CANCELLABLE.includes(shipment.status))
      throw conflict('invalid_status', 'Photos can only be added before payment');
    if (!files.length) throw badRequest('invalid_file', 'Add at least one photo');
    if (shipment.photoKeys.length + files.length > MAX_PHOTOS)
      throw badRequest('invalid_file', `At most ${MAX_PHOTOS} photos`);

    const keys = await Promise.all(
      files.map((f) => this.storage.save(`shipments/${id}/photos`, f, PHOTO_TYPES)),
    );
    await this.prisma.shipment.update({ where: { id }, data: { photoKeys: { push: keys } } });
    return this.view(user, id);
  }

  async listForUser(
    userId: string,
    role: 'sender' | 'traveller',
    status: ShipmentStatus[] | undefined,
    page: PageQuery,
  ) {
    const where: Prisma.ShipmentWhereInput = {
      ...(role === 'sender' ? { senderId: userId } : { travellerId: userId }),
      ...(status?.length && { status: { in: status } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        include: { originCity: true, destinationCity: true, category: true, corridor: true },
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return paginate(items.map(toShipmentSummary), total, page);
  }

  async view(viewer: Pick<AuthUser, 'id' | 'role'>, id: string): Promise<ShipmentView> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: shipmentInclude,
    });
    if (!shipment) throw notFound('Shipment not found');
    const role =
      viewer.role === 'ADMIN'
        ? 'admin'
        : shipment.senderId === viewer.id
          ? 'sender'
          : shipment.travellerId === viewer.id
            ? 'traveller'
            : null;
    if (!role) throw notFound('Shipment not found');
    return toShipmentView(shipment, role);
  }

  async cancel(
    user: AuthUser,
    id: string,
    reason: string | undefined,
    meta: RequestMeta,
  ): Promise<ShipmentView> {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment || shipment.senderId !== user.id) throw notFound('Shipment not found');
    if (['PAID', 'MATCHING', 'NO_MATCH', 'MATCHED'].includes(shipment.status)) {
      // Paid, not picked up yet: cancel and refund in full.
      await this.payments.cancelAndRefund(
        id,
        { type: 'USER', id: user.id, role: 'sender' },
        reason,
        meta,
      );
      return this.view(user, id);
    }
    if (!SENDER_CANCELLABLE.includes(shipment.status)) {
      throw conflict(
        'not_cancellable',
        'This shipment can no longer be cancelled from your account',
      );
    }
    await this.prisma.$transaction((tx) =>
      this.state.transition(
        tx,
        shipment,
        'CANCELLED',
        { type: 'USER', id: user.id },
        { note: reason, data: { cancelReason: reason } },
      ),
    );
    await this.audit.record({
      actorId: user.id,
      actorType: 'USER',
      action: 'shipment.cancel',
      entityType: 'Shipment',
      entityId: id,
      meta,
    });
    return this.view(user, id);
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  async adminList(
    filters: { status?: ShipmentStatus; corridorId?: string; q?: string },
    page: PageQuery,
  ) {
    const where: Prisma.ShipmentWhereInput = {
      status: filters.status,
      corridorId: filters.corridorId,
      ...(filters.q && {
        OR: [
          { reference: { contains: filters.q.toUpperCase() } },
          { sender: { email: { contains: filters.q, mode: 'insensitive' } } },
          { recipientName: { contains: filters.q, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        include: {
          originCity: true,
          destinationCity: true,
          category: true,
          corridor: true,
          sender: { select: { id: true, firstName: true, lastName: true, email: true } },
          traveller: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return paginate(
      items.map((s) => ({ ...toShipmentSummary(s), sender: s.sender, traveller: s.traveller })),
      total,
      page,
    );
  }

  async adminView(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        ...shipmentInclude,
        quote: {
          select: {
            id: true,
            breakdown: true,
            pricingVersion: { select: { id: true, version: true } },
          },
        },
      },
    });
    if (!shipment) throw notFound('Shipment not found');
    return {
      ...toShipmentView(shipment, 'admin'),
      travellerEarning: shipment.travellerEarning,
      commission: shipment.commission,
      sender: pickContact(shipment.sender),
      traveller: shipment.traveller ? pickContact(shipment.traveller) : null,
      quote: shipment.quote,
    };
  }

  /** Retries with a fresh reference on the (unlikely) unique collision. */
  private async createWithUniqueReference<T>(
    create: (reference: string) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await create(generateShipmentReference());
      } catch (error) {
        const target = (error as Prisma.PrismaClientKnownRequestError).meta?.target;
        const isReferenceClash =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          (Array.isArray(target)
            ? target.includes('reference')
            : String(target).includes('reference'));
        if (!isReferenceClash) throw error;
      }
    }
    throw conflict('already_exists', 'Could not allocate a shipment reference');
  }
}
