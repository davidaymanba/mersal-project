import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AdminAnalytics } from '@mersal/shared';
import type { Response } from 'express';
import { Roles } from '../common/auth-user';
import { badRequest } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

const toNumber = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminAnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('analytics')
  async analytics(): Promise<AdminAnalytics> {
    const p = this.prisma;
    const [
      payments,
      commission,
      paidShipments,
      matchedShipments,
      avgMatch,
      activeTrips,
      openDisputes,
      pendingVerifications,
      ledger,
      users,
      verifiedTravellers,
      byStatus,
      byCorridor,
      daily,
    ] = await Promise.all([
      p.payment.aggregate({
        where: { status: { in: ['SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED'] } },
        _sum: { amount: true, refundedAmount: true },
      }),
      p.shipment.aggregate({
        where: { status: { in: ['DELIVERED', 'COMPLETED'] } },
        _sum: { commission: true },
      }),
      p.shipment.count({ where: { paidAt: { not: null } } }),
      p.shipment.count({ where: { paidAt: { not: null }, matchedAt: { not: null } } }),
      p.$queryRaw<
        { hours: number | null }[]
      >`SELECT AVG(EXTRACT(EPOCH FROM ("matchedAt" - "paidAt"))) / 3600 AS hours FROM "Shipment" WHERE "matchedAt" IS NOT NULL AND "paidAt" IS NOT NULL`,
      p.trip.count({ where: { status: { in: ['PUBLISHED', 'IN_PROGRESS'] } } }),
      p.dispute.count({ where: { status: { not: 'RESOLVED' } } }),
      p.identityVerification.count({ where: { status: 'PENDING' } }),
      p.ledgerEntry.groupBy({ by: ['bucket'], _sum: { amount: true } }),
      p.user.count({ where: { role: 'USER' } }),
      p.user.count({ where: { travellerStatus: 'APPROVED' } }),
      p.shipment.groupBy({ by: ['status'], _count: true }),
      p.$queryRaw<{ corridor: string; shipments: bigint; gmv: bigint | null }[]>`
          SELECT c.code AS corridor, COUNT(s.id) AS shipments, SUM(s.price) AS gmv
          FROM "Shipment" s JOIN "Corridor" c ON c.id = s."corridorId"
          WHERE s."paidAt" IS NOT NULL GROUP BY c.code ORDER BY shipments DESC`,
      p.$queryRaw<{ date: Date; created: bigint; paid: bigint; delivered: bigint }[]>`
          SELECT d::date AS date,
            (SELECT COUNT(*) FROM "Shipment" WHERE "createdAt"::date = d::date) AS created,
            (SELECT COUNT(*) FROM "Shipment" WHERE "paidAt"::date = d::date) AS paid,
            (SELECT COUNT(*) FROM "Shipment" WHERE "deliveredAt"::date = d::date) AS delivered
          FROM generate_series(current_date - interval '29 days', current_date, interval '1 day') AS d
          ORDER BY d`,
    ]);
    const bucket = (name: string) => toNumber(ledger.find((l) => l.bucket === name)?._sum.amount);
    const refunds = payments._sum.refundedAmount ?? 0;

    return {
      currency: 'EUR',
      kpis: {
        gmv: (payments._sum.amount ?? 0) - refunds,
        commission: commission._sum.commission ?? 0,
        refunds,
        paidShipments,
        matchRate: paidShipments ? matchedShipments / paidShipments : null,
        avgHoursToMatch:
          avgMatch[0]?.hours === null || avgMatch[0]?.hours === undefined
            ? null
            : Math.round(Number(avgMatch[0].hours) * 10) / 10,
        activeTrips,
        openDisputes,
        pendingVerifications,
        heldFunds: bucket('HELD') + bucket('BLOCKED'),
        availableToPay: bucket('AVAILABLE'),
        users,
        verifiedTravellers,
      },
      byStatus: byStatus
        .map((s) => ({ status: s.status, count: s._count }))
        .sort((a, b) => b.count - a.count),
      byCorridor: byCorridor.map((c) => ({
        corridor: c.corridor,
        shipments: toNumber(c.shipments),
        gmv: toNumber(c.gmv),
      })),
      daily: daily.map((d) => ({
        date: d.date.toISOString().slice(0, 10),
        created: toNumber(d.created),
        paid: toNumber(d.paid),
        delivered: toNumber(d.delivered),
      })),
    };
  }

  /** CSV exports for finance and operations. `from` / `to` are YYYY-MM-DD (inclusive). */
  @Get('reports/:type')
  async report(
    @Param('type') file: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const type = file.replace(/\.csv$/, '');
    const range = {
      gte: from ? new Date(`${from}T00:00:00Z`) : new Date(Date.now() - 30 * 86_400_000),
      lt: to
        ? new Date(new Date(`${to}T00:00:00Z`).getTime() + 86_400_000)
        : new Date(Date.now() + 86_400_000),
    };
    let rows: (string | number | null)[][];

    if (type === 'shipments') {
      const items = await this.prisma.shipment.findMany({
        where: { createdAt: range },
        orderBy: { createdAt: 'asc' },
        include: {
          corridor: true,
          originCity: true,
          destinationCity: true,
          category: true,
          sender: true,
          traveller: true,
        },
      });
      rows = [
        [
          'reference',
          'created_at',
          'status',
          'corridor',
          'origin',
          'destination',
          'category',
          'weight_kg',
          'price',
          'commission',
          'traveller_earning',
          'currency',
          'sender_email',
          'traveller_email',
          'paid_at',
          'delivered_at',
        ],
        ...items.map((s) => [
          s.reference,
          s.createdAt.toISOString(),
          s.status,
          s.corridor.code,
          s.originCity.slug,
          s.destinationCity.slug,
          s.category.code,
          s.weightGrams / 1000,
          cents(s.price),
          cents(s.commission),
          cents(s.travellerEarning),
          s.currency,
          s.sender.email,
          s.traveller?.email ?? null,
          s.paidAt?.toISOString() ?? null,
          s.deliveredAt?.toISOString() ?? null,
        ]),
      ];
    } else if (type === 'payments') {
      const items = await this.prisma.payment.findMany({
        where: { createdAt: range },
        orderBy: { createdAt: 'asc' },
        include: { shipment: true, user: true },
      });
      rows = [
        [
          'payment_id',
          'created_at',
          'shipment',
          'payer_email',
          'provider',
          'status',
          'amount',
          'refunded',
          'currency',
        ],
        ...items.map((p) => [
          p.id,
          p.createdAt.toISOString(),
          p.shipment.reference,
          p.user.email,
          p.provider,
          p.status,
          cents(p.amount),
          cents(p.refundedAmount),
          p.currency,
        ]),
      ];
    } else if (type === 'payouts') {
      const items = await this.prisma.payout.findMany({
        where: { createdAt: range },
        orderBy: { createdAt: 'asc' },
        include: { traveller: true },
      });
      rows = [
        [
          'payout_id',
          'created_at',
          'traveller_email',
          'account',
          'status',
          'amount',
          'currency',
          'paid_at',
          'failure_reason',
        ],
        ...items.map((p) => [
          p.id,
          p.createdAt.toISOString(),
          p.traveller.email,
          p.traveller.payoutAccountLabel,
          p.status,
          cents(p.amount),
          p.currency,
          p.paidAt?.toISOString() ?? null,
          p.failureReason,
        ]),
      ];
    } else {
      throw badRequest('validation_failed', 'Unknown report');
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="mersal-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    // BOM so spreadsheet apps read accents and Arabic correctly.
    res.send('﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n'));
  }
}

const cents = (minor: number | null) => (minor === null ? null : (minor / 100).toFixed(2));

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  // Neutralise spreadsheet formulas and quote when needed.
  const safe = /^[=+\-@]/.test(text) && Number.isNaN(Number(text)) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
