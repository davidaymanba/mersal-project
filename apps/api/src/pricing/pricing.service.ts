import { Injectable } from '@nestjs/common';
import {
  calculateQuote,
  PricingError,
  PricingRulesSchema,
  type ParcelInput,
  type PricingRules,
  type QuoteCalculation,
  type QuoteRequestSchema,
  type QuoteResponse,
} from '@mersal/shared';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { badRequest, conflict, notFound } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

type QuoteRequest = z.output<typeof QuoteRequestSchema>;

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  /** Finds the active corridor serving two cities, or fails with route_not_served. */
  async resolveRoute(originCityId: string, destinationCityId: string) {
    const [origin, destination] = await Promise.all([
      this.prisma.city.findFirst({ where: { id: originCityId, active: true } }),
      this.prisma.city.findFirst({ where: { id: destinationCityId, active: true } }),
    ]);
    if (!origin || !destination) throw notFound('City not found');
    const corridor = await this.prisma.corridor.findFirst({
      where: {
        originCountry: origin.countryCode,
        destinationCountry: destination.countryCode,
        active: true,
      },
    });
    if (!corridor) throw badRequest('route_not_served', 'This route is not served yet');
    return { origin, destination, corridor };
  }

  async activeVersion(corridorId: string) {
    const version = await this.prisma.pricingVersion.findFirst({
      where: { corridorId, status: 'ACTIVE' },
    });
    if (!version) throw badRequest('no_active_tariff', 'No active tariff for this route');
    return { version, rules: PricingRulesSchema.parse(version.rules) };
  }

  /** Runs the shared pricing engine and maps its errors to API errors. */
  calculate(rules: PricingRules, parcel: ParcelInput): QuoteCalculation {
    try {
      return calculateQuote(rules, parcel);
    } catch (error) {
      if (error instanceof PricingError) throw badRequest(error.code, error.message);
      throw error;
    }
  }

  async quote(request: QuoteRequest, userId?: string): Promise<QuoteResponse> {
    const { corridor } = await this.resolveRoute(request.originCityId, request.destinationCityId);
    const category = await this.prisma.category.findFirst({
      where: { code: request.categoryCode, active: true },
    });
    if (!category) throw notFound('Category not found');
    if (category.maxWeightGrams && request.weightGrams > category.maxWeightGrams) {
      throw badRequest(
        'category_weight_limit',
        `This category is limited to ${category.maxWeightGrams} g`,
        {
          maxWeightGrams: category.maxWeightGrams,
        },
      );
    }

    const { version, rules } = await this.activeVersion(corridor.id);
    const result = this.calculate(rules, request);
    const ttlMinutes = await this.settings.get('quotes.ttlMinutes');

    const quote = await this.prisma.quote.create({
      data: {
        userId,
        corridorId: corridor.id,
        pricingVersionId: version.id,
        inputs: request as unknown as Prisma.InputJsonValue,
        breakdown: result as unknown as Prisma.InputJsonValue,
        total: result.total,
        commission: result.commission,
        travellerEarning: result.travellerEarning,
        currency: result.currency,
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });

    return {
      id: quote.id,
      corridorCode: corridor.code,
      currency: result.currency,
      total: result.total,
      lines: result.lines,
      chargeableGrams: result.chargeableGrams,
      volumetricGrams: result.volumetricGrams,
      expiresAt: quote.expiresAt.toISOString(),
    };
  }

  async getQuote(id: string): Promise<QuoteResponse & { inputs: QuoteRequest; used: boolean }> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { corridor: true, shipment: { select: { id: true } } },
    });
    if (!quote) throw notFound('Quote not found');
    const result = quote.breakdown as unknown as QuoteCalculation;
    return {
      id: quote.id,
      corridorCode: quote.corridor.code,
      currency: quote.currency,
      total: quote.total,
      lines: result.lines,
      chargeableGrams: result.chargeableGrams,
      volumetricGrams: result.volumetricGrams,
      expiresAt: quote.expiresAt.toISOString(),
      inputs: quote.inputs as unknown as QuoteRequest,
      used: !!quote.shipment,
    };
  }

  // ─── Admin: versioned tariffs ────────────────────────────────────────────────

  async overview() {
    const corridors = await this.prisma.corridor.findMany({
      orderBy: { code: 'asc' },
      include: {
        pricingVersions: {
          orderBy: { version: 'desc' },
          include: { createdBy: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    return corridors.map(({ pricingVersions, ...corridor }) => ({
      ...corridor,
      versions: pricingVersions.map(({ rules: _rules, ...v }) => v),
    }));
  }

  async getVersion(id: string) {
    const version = await this.prisma.pricingVersion.findUnique({
      where: { id },
      include: { corridor: true },
    });
    if (!version) throw notFound('Tariff version not found');
    return version;
  }

  async createDraft(
    corridorId: string,
    rules: PricingRules,
    notes: string | undefined,
    adminId: string,
    meta: RequestMeta,
  ) {
    const corridor = await this.prisma.corridor.findUnique({ where: { id: corridorId } });
    if (!corridor) throw notFound('Corridor not found');
    this.assertCurrency(corridor.currency, rules);
    const last = await this.prisma.pricingVersion.findFirst({
      where: { corridorId },
      orderBy: { version: 'desc' },
    });
    const draft = await this.prisma.pricingVersion.create({
      data: {
        corridorId,
        version: (last?.version ?? 0) + 1,
        status: 'DRAFT',
        rules: rules as unknown as Prisma.InputJsonValue,
        notes,
        createdById: adminId,
      },
    });
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'pricing.draft_create',
      entityType: 'PricingVersion',
      entityId: draft.id,
      after: { corridor: corridor.code, version: draft.version },
      meta,
    });
    return draft;
  }

  async updateDraft(
    id: string,
    rules: PricingRules,
    notes: string | undefined,
    adminId: string,
    meta: RequestMeta,
  ) {
    const version = await this.getVersion(id);
    if (version.status !== 'DRAFT')
      throw conflict('invalid_status', 'Only draft tariffs can be edited');
    this.assertCurrency(version.corridor.currency, rules);
    const updated = await this.prisma.pricingVersion.update({
      where: { id },
      data: { rules: rules as unknown as Prisma.InputJsonValue, notes },
    });
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'pricing.draft_update',
      entityType: 'PricingVersion',
      entityId: id,
      before: version.rules,
      after: rules,
      meta,
    });
    return updated;
  }

  /** Makes a draft the live tariff; the previous active version is archived. Quotes keep their version. */
  async activate(id: string, adminId: string, meta: RequestMeta) {
    const version = await this.getVersion(id);
    if (version.status !== 'DRAFT')
      throw conflict('invalid_status', 'Only draft tariffs can be activated');
    PricingRulesSchema.parse(version.rules);

    const previous = await this.prisma.pricingVersion.findFirst({
      where: { corridorId: version.corridorId, status: 'ACTIVE' },
    });
    await this.prisma.$transaction([
      this.prisma.pricingVersion.updateMany({
        where: { corridorId: version.corridorId, status: 'ACTIVE' },
        data: { status: 'ARCHIVED' },
      }),
      this.prisma.pricingVersion.update({
        where: { id },
        data: { status: 'ACTIVE', activatedAt: new Date() },
      }),
    ]);
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'pricing.activate',
      entityType: 'PricingVersion',
      entityId: id,
      before: previous ? { versionId: previous.id, version: previous.version } : null,
      after: { versionId: id, version: version.version, corridor: version.corridor.code },
      meta,
    });
    return this.getVersion(id);
  }

  private assertCurrency(corridorCurrency: string, rules: PricingRules) {
    if (rules.currency !== corridorCurrency) {
      throw badRequest('validation_failed', `Tariff currency must be ${corridorCurrency}`);
    }
  }
}
