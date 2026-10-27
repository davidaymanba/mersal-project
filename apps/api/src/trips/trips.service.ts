import { Injectable } from '@nestjs/common';
import { type LocalizedText, type TripInputSchema, type TripView } from '@mersal/shared';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { toCatalogCity } from '../catalog/catalog.service';
import type { AuthUser } from '../common/auth-user';
import { badRequest, conflict, notFound } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { JobsService } from '../jobs/jobs.module';
import { MatchingService } from '../matching/matching.service';
import { PricingService } from '../pricing/pricing.service';
import { PrismaService } from '../prisma/prisma.service';

type TripInput = z.output<typeof TripInputSchema>;

const tripInclude = {
  corridor: true,
  originCity: true,
  destinationCity: true,
  categories: { include: { category: true } },
  shipments: {
    select: {
      id: true,
      reference: true,
      status: true,
      weightGrams: true,
      travellerEarning: true,
      currency: true,
    },
  },
} as const;

type TripWithRelations = Prisma.TripGetPayload<{ include: typeof tripInclude }>;

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const ACTIVE_SHIPMENT = ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'];

export function toTripView(t: TripWithRelations): TripView {
  return {
    id: t.id,
    status: t.status,
    corridorCode: t.corridor.code,
    originCity: toCatalogCity(t.originCity),
    destinationCity: toCatalogCity(t.destinationCity),
    departureDate: isoDay(t.departureDate),
    arrivalDate: t.arrivalDate ? isoDay(t.arrivalDate) : null,
    capacityGrams: t.capacityGrams,
    remainingGrams: t.remainingGrams,
    maxItems: t.maxItems,
    itemsAccepted: t.itemsAccepted,
    maxLengthCm: t.maxLengthCm,
    categories: t.categories.map((c) => ({
      code: c.category.code,
      names: c.category.names as LocalizedText,
    })),
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
    shipments: t.shipments,
  };
}

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly jobs: JobsService,
    private readonly audit: AuditService,
  ) {}

  async create(user: AuthUser, input: TripInput, meta: RequestMeta): Promise<TripView> {
    MatchingService.assertTraveller(user);
    const { corridor } = await this.pricing.resolveRoute(
      input.originCityId,
      input.destinationCityId,
    );

    const departure = new Date(`${input.departureDate}T00:00:00Z`);
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    if (departure < today) throw badRequest('invalid_dates', 'Departure must be today or later');

    const categories = input.categoryCodes.length
      ? await this.prisma.category.findMany({ where: { code: { in: input.categoryCodes } } })
      : [];

    const trip = await this.prisma.trip.create({
      data: {
        travellerId: user.id,
        corridorId: corridor.id,
        originCityId: input.originCityId,
        destinationCityId: input.destinationCityId,
        departureDate: departure,
        arrivalDate: input.arrivalDate ? new Date(`${input.arrivalDate}T00:00:00Z`) : null,
        capacityGrams: input.capacityGrams,
        remainingGrams: input.capacityGrams,
        maxItems: input.maxItems,
        maxLengthCm: input.maxLengthCm,
        notes: input.notes,
        categories: { create: categories.map((c) => ({ categoryId: c.id })) },
      },
      include: tripInclude,
    });

    await this.audit.record({
      actorId: user.id,
      actorType: 'USER',
      action: 'trip.publish',
      entityType: 'Trip',
      entityId: trip.id,
      after: { corridor: corridor.code, departure: input.departureDate },
      meta,
    });
    await this.jobs.matchNewTrip(trip.id);
    return toTripView(trip);
  }

  async listMine(userId: string): Promise<TripView[]> {
    const trips = await this.prisma.trip.findMany({
      where: { travellerId: userId },
      orderBy: [{ status: 'asc' }, { departureDate: 'asc' }],
      include: tripInclude,
    });
    return trips.map(toTripView);
  }

  async get(viewer: Pick<AuthUser, 'id' | 'role'>, id: string): Promise<TripView> {
    const trip = await this.prisma.trip.findUnique({ where: { id }, include: tripInclude });
    if (!trip || (trip.travellerId !== viewer.id && viewer.role !== 'ADMIN'))
      throw notFound('Trip not found');
    return toTripView(trip);
  }

  /** Cancels a trip that carries nothing yet; open proposals on it move to the next traveller. */
  async cancel(user: AuthUser, id: string, meta: RequestMeta): Promise<TripView> {
    const trip = await this.prisma.trip.findUnique({ where: { id }, include: { shipments: true } });
    if (!trip || trip.travellerId !== user.id) throw notFound('Trip not found');
    if (trip.status !== 'PUBLISHED')
      throw conflict('invalid_status', 'Only published trips can be cancelled');
    if (trip.shipments.some((s) => ACTIVE_SHIPMENT.includes(s.status))) {
      throw conflict(
        'trip_has_shipments',
        'This trip already carries parcels. Contact support to cancel it.',
      );
    }

    const pending = await this.prisma.matchOffer.findMany({
      where: { tripId: id, status: 'PENDING' },
    });
    await this.prisma.$transaction([
      this.prisma.trip.update({ where: { id }, data: { status: 'CANCELLED' } }),
      this.prisma.matchOffer.updateMany({
        where: { tripId: id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      }),
    ]);
    for (const offer of pending) await this.jobs.runMatching(offer.shipmentId, 'RETRY');

    await this.audit.record({
      actorId: user.id,
      actorType: 'USER',
      action: 'trip.cancel',
      entityType: 'Trip',
      entityId: id,
      meta,
    });
    return this.get(user, id);
  }
}
