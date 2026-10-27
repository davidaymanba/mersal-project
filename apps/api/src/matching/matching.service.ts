import { Injectable, Logger } from '@nestjs/common';
import {
  MatchingConfigSchema,
  MatchingWeightsSchema,
  rankCandidates,
  type CandidateResult,
  type MatchingConfigInput,
  type MatchRules,
  type MatchShipment,
  type MatchTrip,
} from '@mersal/shared';
import type { MatchRunResult, MatchTrigger, Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { badRequest, conflict, forbidden, notFound } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { AppConfig } from '../config/config.module';
import { JobsService } from '../jobs/jobs.module';
import { MessagingService } from '../messaging/messaging.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReliabilityService } from '../reliability/reliability.service';
import { SettingsService } from '../settings/settings.service';
import { ShipmentStateService } from '../shipments/shipment-state.service';

const DAY = 86_400_000;
/** A trip keeps taking parcels until departure, even after a first pickup. */
const OPEN_TRIP: ('PUBLISHED' | 'IN_PROGRESS')[] = ['PUBLISHED', 'IN_PROGRESS'];

type Tx = Prisma.TransactionClient;

interface RunOutcome {
  result: MatchRunResult | 'SKIPPED';
  offer?: { id: string; travellerId: string; shipmentReference: string };
  noMatch?: { senderId: string; shipmentId: string; reference: string };
}

const startOfTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const sixDigits = () => randomInt(0, 1_000_000).toString().padStart(6, '0');

/**
 * Automated matching: proposes a paid shipment to one traveller at a time, best score first.
 * Every run is recorded (MatchRun) with all candidates and why ineligible trips were skipped.
 */
@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly state: ShipmentStateService,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    private readonly jobs: JobsService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
    private readonly messaging: MessagingService,
    private readonly reliability: ReliabilityService,
  ) {}

  // ─── Configuration ───────────────────────────────────────────────────────────

  async getConfig(
    corridorId?: string | null,
    tx: Tx = this.prisma,
  ): Promise<MatchingConfigInput & { id: string }> {
    const row =
      (corridorId && (await tx.matchingConfig.findUnique({ where: { corridorId } }))) ||
      (await tx.matchingConfig.findFirst({ where: { corridorId: null } }));
    if (!row) throw new Error('Matching config missing — run the seed');
    return {
      id: row.id,
      offerTtlMinutes: row.offerTtlMinutes,
      maxAttempts: row.maxAttempts,
      dateToleranceDays: row.dateToleranceDays,
      minReliability: row.minReliability,
      weights: MatchingWeightsSchema.parse(row.weights),
    };
  }

  async updateConfig(input: MatchingConfigInput, adminId: string, meta: RequestMeta) {
    const current = await this.getConfig();
    const parsed = MatchingConfigSchema.parse(input);
    await this.prisma.matchingConfig.update({
      where: { id: current.id },
      data: { ...parsed, weights: parsed.weights, updatedById: adminId },
    });
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'matching.config_update',
      entityType: 'MatchingConfig',
      entityId: current.id,
      before: current,
      after: parsed,
      meta,
    });
    return this.getConfig();
  }

  private async offerTtlMs(configured: number): Promise<number> {
    const minutes = this.config.demoMode
      ? await this.settings.get('matching.demoOfferTtlMinutes')
      : configured;
    return minutes * 60_000;
  }

  // ─── Running the engine ──────────────────────────────────────────────────────

  async run(shipmentId: string, trigger: MatchTrigger): Promise<RunOutcome> {
    const ttlConfig = await this.getConfig();
    const ttlMs = await this.offerTtlMs(ttlConfig.offerTtlMinutes);

    const outcome = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, shipmentId);
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
        include: { category: true },
      });
      if (!shipment) return { result: 'SKIPPED' as const };

      if (
        shipment.status === 'PAID' ||
        (shipment.status === 'NO_MATCH' && (trigger === 'RETRY' || trigger === 'ADMIN'))
      ) {
        await this.state.transition(tx, shipment, 'MATCHING', { type: 'SYSTEM' });
        shipment.status = 'MATCHING';
      }
      if (shipment.status !== 'MATCHING') return { result: 'SKIPPED' as const };
      if (await tx.matchOffer.findFirst({ where: { shipmentId, status: 'PENDING' } }))
        return { result: 'SKIPPED' as const };

      const config = await this.getConfig(shipment.corridorId, tx);
      const roundStart = await this.currentRoundStart(tx, shipmentId);
      const offers = await tx.matchOffer.findMany({
        where: { shipmentId },
        select: { travellerId: true, createdAt: true },
      });
      const attemptsThisRound = offers.filter((o) => o.createdAt >= roundStart).length;
      const snapshot = { ...config, trigger } as unknown as Prisma.InputJsonValue;

      if (attemptsThisRound >= config.maxAttempts) {
        await tx.matchRun.create({
          data: {
            shipmentId,
            trigger,
            configSnapshot: snapshot,
            candidates: [],
            result: 'EXHAUSTED',
          },
        });
        await this.state.transition(
          tx,
          shipment,
          'NO_MATCH',
          { type: 'SYSTEM' },
          { note: 'max_attempts' },
        );
        return {
          result: 'EXHAUSTED' as const,
          noMatch: { senderId: shipment.senderId, shipmentId, reference: shipment.reference },
        };
      }

      const trips = await tx.trip.findMany({
        where: {
          corridorId: shipment.corridorId,
          status: { in: OPEN_TRIP },
          departureDate: { gte: startOfTodayUtc() },
        },
        include: { traveller: true, categories: { include: { category: true } } },
      });
      const rules: MatchRules = {
        dateToleranceDays: config.dateToleranceDays,
        minReliability: config.minReliability,
        weights: config.weights,
      };
      const ranked = rankCandidates(
        this.toMatchShipment(shipment),
        trips.map((t) => this.toMatchTrip(t)),
        rules,
        new Set(offers.map((o) => o.travellerId)),
      );
      const best = ranked.find((c) => c.eligible);

      const run = await tx.matchRun.create({
        data: {
          shipmentId,
          trigger,
          configSnapshot: snapshot,
          candidates: ranked as unknown as Prisma.InputJsonValue,
          result: best ? 'OFFERED' : 'NO_CANDIDATES',
        },
      });
      if (!best) return { result: 'NO_CANDIDATES' as const };

      const offer = await this.createOffer(tx, { shipmentId, best, runId: run.id, ttlMs });
      return {
        result: 'OFFERED' as const,
        offer: {
          id: offer.id,
          travellerId: best.travellerId,
          shipmentReference: shipment.reference,
        },
      };
    });

    await this.afterRun(outcome);
    return outcome;
  }

  /** Re-runs matching for parcels waiting on a corridor when a new trip is published. */
  async onTripPublished(tripId: string): Promise<number> {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.status !== 'PUBLISHED') return 0;
    const waiting = await this.prisma.shipment.findMany({
      where: {
        corridorId: trip.corridorId,
        destinationCityId: trip.destinationCityId,
        status: 'MATCHING',
        matchOffers: { none: { status: 'PENDING' } },
      },
      select: { id: true },
    });
    for (const shipment of waiting) await this.jobs.runMatching(shipment.id, 'NEW_TRIP');
    return waiting.length;
  }

  // ─── Traveller responses ─────────────────────────────────────────────────────

  async accept(travellerId: string, offerId: string) {
    const offer = await this.prisma.matchOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.travellerId !== travellerId) throw notFound('Offer not found');

    const shipment = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, offer.shipmentId);
      const current = await tx.matchOffer.findUniqueOrThrow({
        where: { id: offerId },
        include: { shipment: true, trip: true },
      });
      if (current.status !== 'PENDING')
        throw conflict('offer_not_pending', 'This proposal is no longer open');
      if (current.expiresAt < new Date())
        throw conflict('offer_expired', 'This proposal has expired');

      const reserved = await tx.trip.updateMany({
        where: {
          id: current.tripId,
          status: { in: OPEN_TRIP },
          remainingGrams: { gte: current.shipment.weightGrams },
          itemsAccepted: { lt: current.trip.maxItems },
        },
        data: {
          remainingGrams: { decrement: current.shipment.weightGrams },
          itemsAccepted: { increment: 1 },
        },
      });
      if (reserved.count === 0)
        throw conflict('trip_full', 'This trip no longer has room for the parcel');

      await tx.matchOffer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });
      await this.state.transition(
        tx,
        current.shipment,
        'MATCHED',
        { type: 'USER', id: travellerId },
        {
          data: {
            travellerId,
            tripId: current.tripId,
            pickupCode: sixDigits(),
            deliveryCode: sixDigits(),
            codeAttempts: 0,
          },
        },
      );
      await tx.user.update({
        where: { id: travellerId },
        data: { offersAnswered: { increment: 1 } },
      });
      return current.shipment;
    });
    await this.reliability.recompute(travellerId);

    await this.messaging.system(shipment.id, 'system.matched');
    await this.notifications.notify(
      shipment.senderId,
      'shipment.matched',
      { reference: shipment.reference },
      {
        link: `/app/shipments/${shipment.id}`,
        email: {
          template: 'shipmentMatched',
          vars: { reference: shipment.reference },
          ctaLabel: shipment.reference,
        },
      },
    );
    return { shipmentId: shipment.id };
  }

  async reject(travellerId: string, offerId: string, reason?: string) {
    const offer = await this.prisma.matchOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.travellerId !== travellerId) throw notFound('Offer not found');
    const updated = await this.prisma.matchOffer.updateMany({
      where: { id: offerId, status: 'PENDING' },
      data: { status: 'REJECTED', respondedAt: new Date(), rejectReason: reason },
    });
    if (updated.count === 0) throw conflict('offer_not_pending', 'This proposal is no longer open');
    await this.prisma.user.update({
      where: { id: travellerId },
      data: { offersAnswered: { increment: 1 } },
    });
    await this.reliability.recompute(travellerId);
    await this.jobs.runMatching(offer.shipmentId, 'OFFER_REJECTED');
  }

  /**
   * The traveller gives back a parcel they accepted, before pickup. The parcel returns to
   * matching (this traveller is skipped) and the withdrawal counts against their reliability.
   */
  async withdraw(traveller: { id: string }, shipmentId: string, reason: string) {
    const shipment = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, shipmentId);
      const current = await tx.shipment.findUnique({ where: { id: shipmentId } });
      if (!current || current.travellerId !== traveller.id) throw notFound('Shipment not found');
      if (current.status !== 'MATCHED')
        throw conflict('invalid_status', 'You can only withdraw before pickup');
      if (current.tripId) {
        await tx.trip.update({
          where: { id: current.tripId },
          data: {
            remainingGrams: { increment: current.weightGrams },
            itemsAccepted: { decrement: 1 },
          },
        });
      }
      await this.state.transition(
        tx,
        current,
        'MATCHING',
        { type: 'USER', id: traveller.id },
        {
          note: reason,
          data: {
            travellerId: null,
            tripId: null,
            pickupCode: null,
            deliveryCode: null,
            codeAttempts: 0,
            matchedAt: null,
          },
        },
      );
      return current;
    });
    await this.reliability.recompute(traveller.id);
    await this.messaging.system(shipmentId, 'system.withdrawn');
    await this.notifications.notify(
      shipment.senderId,
      'shipment.withdrawn',
      { reference: shipment.reference },
      { link: `/app/shipments/${shipmentId}` },
    );
    await this.jobs.runMatching(shipmentId, 'RETRY');
  }

  // ─── Maintenance (scheduled) ─────────────────────────────────────────────────

  /** Expires unanswered offers and moves each parcel on to the next candidate. */
  async expireOffers(): Promise<number> {
    const due = await this.prisma.matchOffer.findMany({
      where: { status: 'PENDING', expiresAt: { lt: new Date() } },
    });
    for (const offer of due) {
      const updated = await this.prisma.matchOffer.updateMany({
        where: { id: offer.id, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });
      if (updated.count === 0) continue;
      await this.reliability.recompute(offer.travellerId);
      await this.notifications.notify(
        offer.travellerId,
        'offer.expired',
        {},
        { link: '/app/offers' },
      );
      await this.jobs.runMatching(offer.shipmentId, 'OFFER_EXPIRED');
    }
    return due.length;
  }

  /** Parcels whose departure window has passed without a traveller become NO_MATCH. */
  async sweepExpiredWindows(): Promise<number> {
    const config = await this.getConfig();
    const cutoff = new Date(startOfTodayUtc().getTime() - config.dateToleranceDays * DAY);
    const stale = await this.prisma.shipment.findMany({
      where: {
        status: 'MATCHING',
        latestDate: { lt: cutoff },
        matchOffers: { none: { status: 'PENDING' } },
      },
    });
    for (const shipment of stale) {
      await this.prisma
        .$transaction((tx) =>
          this.state.transition(
            tx,
            shipment,
            'NO_MATCH',
            { type: 'SYSTEM' },
            { note: 'window_passed' },
          ),
        )
        .then(() =>
          this.notifyNoMatch({
            senderId: shipment.senderId,
            shipmentId: shipment.id,
            reference: shipment.reference,
          }),
        )
        .catch((error: unknown) =>
          this.logger.warn(`Sweep skipped ${shipment.id}: ${(error as Error).message}`),
        );
    }
    return stale.length;
  }

  /** Trips whose departure has passed and that carry nothing anymore are completed. */
  async completeFinishedTrips(): Promise<number> {
    const result = await this.prisma.trip.updateMany({
      where: {
        status: { in: OPEN_TRIP },
        departureDate: { lt: new Date(startOfTodayUtc().getTime() - DAY) },
        shipments: { none: { status: { in: ['MATCHED', 'PICKED_UP', 'IN_TRANSIT'] } } },
      },
      data: { status: 'COMPLETED' },
    });
    return result.count;
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  /** Proposes a parcel to a specific trip, replacing any open proposal. Capacity rules still apply. */
  async adminPropose(adminId: string, shipmentId: string, tripId: string, meta: RequestMeta) {
    const config = await this.getConfig();
    const ttlMs = await this.offerTtlMs(config.offerTtlMinutes);
    const outcome = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, shipmentId);
      const shipment = await tx.shipment.findUnique({
        where: { id: shipmentId },
        include: { category: true },
      });
      if (!shipment) throw notFound('Shipment not found');
      if (shipment.status === 'NO_MATCH' || shipment.status === 'PAID') {
        await this.state.transition(tx, shipment, 'MATCHING', { type: 'ADMIN', id: adminId });
        shipment.status = 'MATCHING';
      }
      if (shipment.status !== 'MATCHING')
        throw conflict('invalid_status', 'Only parcels waiting for a traveller can be proposed');

      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        include: { traveller: true, categories: { include: { category: true } } },
      });
      if (!trip || trip.corridorId !== shipment.corridorId)
        throw badRequest('validation_failed', 'Trip is not on this route');

      const [candidate] = rankCandidates(this.toMatchShipment(shipment), [this.toMatchTrip(trip)], {
        dateToleranceDays: config.dateToleranceDays,
        minReliability: 0,
        weights: config.weights,
      });
      const hardBlock = [
        'own_shipment',
        'traveller_not_verified',
        'traveller_suspended',
        'insufficient_capacity',
        'max_items_reached',
      ];
      if (
        !candidate ||
        (candidate.excludedReason && hardBlock.includes(candidate.excludedReason))
      ) {
        throw badRequest(
          'validation_failed',
          `Trip cannot take this parcel: ${candidate?.excludedReason}`,
        );
      }

      await tx.matchOffer.updateMany({
        where: { shipmentId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      const run = await tx.matchRun.create({
        data: {
          shipmentId,
          trigger: 'ADMIN',
          configSnapshot: { ...config, adminId } as unknown as Prisma.InputJsonValue,
          candidates: [candidate] as unknown as Prisma.InputJsonValue,
          result: 'OFFERED',
        },
      });
      const offer = await this.createOffer(tx, {
        shipmentId,
        best: { ...candidate, eligible: true },
        runId: run.id,
        ttlMs,
      });
      return {
        result: 'OFFERED' as const,
        offer: {
          id: offer.id,
          travellerId: trip.travellerId,
          shipmentReference: shipment.reference,
        },
      };
    });
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'matching.propose',
      entityType: 'Shipment',
      entityId: shipmentId,
      after: { tripId },
      meta,
    });
    await this.afterRun(outcome);
    return outcome;
  }

  async shipmentMatchingLog(shipmentId: string) {
    const [runs, offers] = await Promise.all([
      this.prisma.matchRun.findMany({
        where: { shipmentId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.matchOffer.findMany({
        where: { shipmentId },
        orderBy: { createdAt: 'desc' },
        include: {
          traveller: { select: { id: true, firstName: true, lastName: true } },
          trip: { select: { id: true, departureDate: true } },
        },
      }),
    ]);
    return { runs, offers };
  }

  /** Trips on the shipment's route an admin could propose it to. */
  async candidateTrips(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw notFound('Shipment not found');
    return this.prisma.trip.findMany({
      where: {
        corridorId: shipment.corridorId,
        status: { in: OPEN_TRIP },
        departureDate: { gte: startOfTodayUtc() },
      },
      orderBy: { departureDate: 'asc' },
      include: {
        traveller: {
          select: { id: true, firstName: true, lastName: true, reliabilityScore: true },
        },
        destinationCity: true,
        originCity: true,
      },
      take: 50,
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async createOffer(
    tx: Tx,
    args: { shipmentId: string; best: CandidateResult; runId: string; ttlMs: number },
  ) {
    const offer = await tx.matchOffer.create({
      data: {
        shipmentId: args.shipmentId,
        tripId: args.best.tripId,
        travellerId: args.best.travellerId,
        matchRunId: args.runId,
        rank: 1,
        score: args.best.score,
        expiresAt: new Date(Date.now() + args.ttlMs),
      },
    });
    await tx.user.update({
      where: { id: args.best.travellerId },
      data: { offersReceived: { increment: 1 } },
    });
    return offer;
  }

  private async afterRun(outcome: RunOutcome) {
    if (outcome.offer) {
      await this.notifications.notify(
        outcome.offer.travellerId,
        'offer.received',
        { reference: outcome.offer.shipmentReference },
        {
          link: '/app/offers',
          email: {
            template: 'offerReceived',
            vars: { reference: outcome.offer.shipmentReference },
            ctaLabel: outcome.offer.shipmentReference,
          },
        },
      );
    }
    if (outcome.noMatch) await this.notifyNoMatch(outcome.noMatch);
  }

  private async notifyNoMatch({
    senderId,
    shipmentId,
    reference,
  }: {
    senderId: string;
    shipmentId: string;
    reference: string;
  }) {
    await this.notifications.notify(
      senderId,
      'shipment.noMatch',
      { reference },
      {
        link: `/app/shipments/${shipmentId}`,
        email: { template: 'shipmentNoMatch', vars: { reference }, ctaLabel: reference },
      },
    );
    await this.notifications.notifyAdmins(
      'admin.noMatch',
      { reference },
      `/admin/shipments/${shipmentId}`,
    );
  }

  /** Serialises matching per shipment so concurrent triggers can't create two offers. */
  private async lock(tx: Tx, shipmentId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${shipmentId}))`;
  }

  private async currentRoundStart(tx: Tx, shipmentId: string): Promise<Date> {
    const event = await tx.shipmentEvent.findFirst({
      where: { shipmentId, toStatus: 'MATCHING' },
      orderBy: { createdAt: 'desc' },
    });
    return event?.createdAt ?? new Date(0);
  }

  private toMatchShipment(s: {
    senderId: string;
    originCityId: string;
    destinationCityId: string;
    category: { code: string };
    weightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    urgency: 'STANDARD' | 'EXPRESS';
    earliestDate: Date;
    latestDate: Date;
  }): MatchShipment {
    return {
      senderId: s.senderId,
      originCityId: s.originCityId,
      destinationCityId: s.destinationCityId,
      categoryCode: s.category.code,
      weightGrams: s.weightGrams,
      longestSideCm: Math.max(s.lengthCm, s.widthCm, s.heightCm),
      urgency: s.urgency,
      earliestDate: s.earliestDate,
      latestDate: s.latestDate,
    };
  }

  private toMatchTrip(
    t: Prisma.TripGetPayload<{
      include: { traveller: true; categories: { include: { category: true } } };
    }>,
  ): MatchTrip {
    return {
      tripId: t.id,
      travellerId: t.travellerId,
      originCityId: t.originCityId,
      destinationCityId: t.destinationCityId,
      departureDate: t.departureDate,
      remainingGrams: t.remainingGrams,
      itemsAccepted: t.itemsAccepted,
      maxItems: t.maxItems,
      maxLengthCm: t.maxLengthCm,
      categoryCodes: t.categories.map((c) => c.category.code),
      traveller: {
        verified: t.traveller.travellerStatus === 'APPROVED',
        active: t.traveller.status === 'ACTIVE',
        reliabilityScore: t.traveller.reliabilityScore,
        ratingAvg: t.traveller.ratingAvg,
        ratingCount: t.traveller.ratingCount,
        offersReceived: t.traveller.offersReceived,
        offersAnswered: t.traveller.offersAnswered,
      },
    };
  }

  /** Guard used by trips: only verified travellers publish trips and receive proposals. */
  static assertTraveller(user: { travellerStatus: string }) {
    if (user.travellerStatus !== 'APPROVED') {
      throw forbidden(
        'traveller_not_verified',
        'Verify your identity before travelling with parcels',
      );
    }
  }
}
