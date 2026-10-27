import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AdminTravellersQuerySchema,
  paginate,
  type AdminTravellerRow,
  type AdminTravellersResponse,
} from '@mersal/shared';
import type { Prisma, ShipmentStatus } from '@prisma/client';
import type { z } from 'zod';
import { Roles } from '../common/auth-user';
import { startOfTodayUtc } from '../common/duration';
import { ZodQuery } from '../common/zod';
import { PrismaService } from '../prisma/prisma.service';

const DELIVERED: ShipmentStatus[] = ['DELIVERED', 'COMPLETED'];
const ACTIVE: ShipmentStatus[] = ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'];
const OPEN_TRIP = ['PUBLISHED', 'IN_PROGRESS'] as const;

const ORDER: Record<
  z.output<typeof AdminTravellersQuerySchema>['sort'],
  Prisma.UserOrderByWithRelationInput
> = {
  recent: { createdAt: 'desc' },
  reliability: { reliabilityScore: 'desc' },
  parcels: { shipmentsCarried: { _count: 'desc' } },
};

/** Travellers (anyone who started identity verification) with their operating figures. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin/travellers')
export class AdminTravellersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(
    @ZodQuery(AdminTravellersQuerySchema) query: z.output<typeof AdminTravellersQuerySchema>,
  ): Promise<AdminTravellersResponse> {
    const where: Prisma.UserWhereInput = {
      travellerStatus: query.status ?? { not: 'NOT_STARTED' },
      ...(query.q && {
        OR: [
          { email: { contains: query.q, mode: 'insensitive' } },
          { firstName: { contains: query.q, mode: 'insensitive' } },
          { lastName: { contains: query.q, mode: 'insensitive' } },
          { phone: { contains: query.q } },
        ],
      }),
    };

    const [users, total, summary] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [ORDER[query.sort], { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
      this.summary(),
    ]);
    const ids = users.map((u) => u.id);

    const [parcels, trips, ledger] = await Promise.all([
      this.prisma.shipment.groupBy({
        by: ['travellerId', 'status'],
        where: { travellerId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.trip.groupBy({
        by: ['travellerId'],
        where: {
          travellerId: { in: ids },
          status: { in: [...OPEN_TRIP] },
          departureDate: { gte: startOfTodayUtc() },
        },
        _count: { _all: true },
        _min: { departureDate: true },
      }),
      this.prisma.ledgerEntry.groupBy({
        by: ['userId', 'bucket'],
        where: { userId: { in: ids }, bucket: { in: ['HELD', 'AVAILABLE', 'BLOCKED'] } },
        _sum: { amount: true },
      }),
    ]);

    const parcelCount = (id: string, statuses: ShipmentStatus[]) =>
      parcels
        .filter((p) => p.travellerId === id && statuses.includes(p.status))
        .reduce((sum, p) => sum + p._count._all, 0);
    const balance = (id: string, bucket: string) =>
      ledger.find((l) => l.userId === id && l.bucket === bucket)?._sum.amount ?? 0;

    const items = users.map((u): AdminTravellerRow => {
      const trip = trips.find((t) => t.travellerId === u.id);
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        travellerStatus: u.travellerStatus,
        accountStatus: u.status,
        reliabilityScore: u.reliabilityScore,
        ratingAvg: u.ratingAvg,
        ratingCount: u.ratingCount,
        responseRate: u.offersReceived ? u.offersAnswered / u.offersReceived : null,
        parcels: {
          delivered: parcelCount(u.id, DELIVERED),
          active: parcelCount(u.id, ACTIVE),
          disputed: parcelCount(u.id, ['DISPUTED']),
        },
        trips: {
          open: trip?._count._all ?? 0,
          nextDeparture: trip?._min.departureDate?.toISOString().slice(0, 10) ?? null,
        },
        wallet: {
          held: balance(u.id, 'HELD'),
          available: balance(u.id, 'AVAILABLE'),
          blocked: balance(u.id, 'BLOCKED'),
        },
        payoutsEnabled: u.payoutsEnabled,
        joinedAt: u.createdAt.toISOString(),
      };
    });

    return { ...paginate(items, total, query), summary };
  }

  private async summary(): Promise<AdminTravellersResponse['summary']> {
    const [byStatus, withOpenTrips, reliability] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['travellerStatus'],
        where: { travellerStatus: { not: 'NOT_STARTED' } },
        _count: { _all: true },
      }),
      this.prisma.trip.findMany({
        where: {
          status: { in: [...OPEN_TRIP] },
          departureDate: { gte: startOfTodayUtc() },
          traveller: { travellerStatus: 'APPROVED' },
        },
        distinct: ['travellerId'],
        select: { travellerId: true },
      }),
      this.prisma.user.aggregate({
        where: { travellerStatus: 'APPROVED' },
        _avg: { reliabilityScore: true },
      }),
    ]);
    const count = (status: string) =>
      byStatus.find((s) => s.travellerStatus === status)?._count._all ?? 0;
    return {
      approved: count('APPROVED'),
      pending: count('PENDING'),
      rejected: count('REJECTED'),
      withOpenTrips: withOpenTrips.length,
      avgReliability: reliability._avg.reliabilityScore,
    };
  }
}
