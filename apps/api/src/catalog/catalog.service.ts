import { Injectable } from '@nestjs/common';
import {
  PricingRulesSchema,
  type Catalog,
  type CatalogCity,
  type CategoryInputSchema,
  type CityInputSchema,
  type CorridorInputSchema,
  type LocalizedText,
  type RestrictedItemInputSchema,
} from '@mersal/shared';
import { Prisma, type City } from '@prisma/client';
import type { z } from 'zod';
import { conflict, notFound } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';

export const toCatalogCity = (city: City): CatalogCity => ({
  id: city.id,
  countryCode: city.countryCode,
  slug: city.slug,
  names: city.names as LocalizedText,
});

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function rethrowUnique(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw conflict('already_exists', 'An item with the same identifier already exists');
  }
  throw error;
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /** Everything a sender or traveller form needs, active items only. */
  async publicCatalog(): Promise<Catalog> {
    const [corridors, cities, categories, restrictedItems, policies] = await Promise.all([
      this.prisma.corridor.findMany({
        where: { active: true, pricingVersions: { some: { status: 'ACTIVE' } } },
        include: { pricingVersions: { where: { status: 'ACTIVE' }, take: 1 } },
        orderBy: { code: 'asc' },
      }),
      this.prisma.city.findMany({
        where: { active: true },
        orderBy: [{ countryCode: 'asc' }, { slug: 'asc' }],
      }),
      this.prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.restrictedItem.findMany({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.settings.list(),
    ]);

    return {
      corridors: corridors.map((c) => {
        const rules = PricingRulesSchema.safeParse(c.pricingVersions[0]?.rules);
        return {
          id: c.id,
          code: c.code,
          originCountry: c.originCountry,
          destinationCountry: c.destinationCountry,
          currency: c.currency,
          options: rules.success ? rules.data.options : [],
        };
      }),
      cities: cities.map(toCatalogCity),
      categories: categories.map((c) => ({
        id: c.id,
        code: c.code,
        names: c.names as LocalizedText,
        icon: c.icon,
        requiresPhotos: c.requiresPhotos,
        maxWeightGrams: c.maxWeightGrams,
      })),
      restrictedItems: restrictedItems.map((r) => ({
        id: r.id,
        level: r.level,
        names: r.names as LocalizedText,
      })),
      policies: {
        holdHours: Number(policies['wallet.holdHours']),
        disputeWindowHours: Number(policies['disputes.windowHours']),
        payoutWeekday: Number(policies['payouts.weekday']),
      },
    };
  }

  // ─── Admin ───────────────────────────────────────────────────────────────────

  adminCatalog() {
    return Promise.all([
      this.prisma.corridor.findMany({
        orderBy: { code: 'asc' },
        include: {
          pricingVersions: { where: { status: 'ACTIVE' }, select: { id: true, version: true } },
        },
      }),
      this.prisma.city.findMany({ orderBy: [{ countryCode: 'asc' }, { slug: 'asc' }] }),
      this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.restrictedItem.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]).then(([corridors, cities, categories, restrictedItems]) => ({
      corridors,
      cities,
      categories,
      restrictedItems,
    }));
  }

  async createCorridor(input: z.output<typeof CorridorInputSchema>) {
    const code = `${input.originCountry}-${input.destinationCountry}`;
    // New corridors stay inactive until an admin activates a tariff for them.
    return this.prisma.corridor
      .create({ data: { ...input, code, active: false } })
      .catch(rethrowUnique);
  }

  async setCorridorActive(id: string, active: boolean) {
    return this.prisma.corridor.update({ where: { id }, data: { active } }).catch(() => {
      throw notFound('Corridor not found');
    });
  }

  async createCity(input: z.output<typeof CityInputSchema>) {
    const slug = `${input.countryCode.toLowerCase()}-${slugify(input.names.en)}`;
    return this.prisma.city.create({ data: { ...input, slug } }).catch(rethrowUnique);
  }

  async updateCity(id: string, input: Partial<z.output<typeof CityInputSchema>>) {
    return this.prisma.city.update({ where: { id }, data: input }).catch(rethrowUnique);
  }

  async createCategory(input: z.output<typeof CategoryInputSchema>) {
    const sortOrder = await this.prisma.category.count();
    return this.prisma.category.create({ data: { ...input, sortOrder } }).catch(rethrowUnique);
  }

  async updateCategory(id: string, input: Partial<z.output<typeof CategoryInputSchema>>) {
    return this.prisma.category.update({ where: { id }, data: input }).catch(rethrowUnique);
  }

  async createRestrictedItem(input: z.output<typeof RestrictedItemInputSchema>) {
    const sortOrder = await this.prisma.restrictedItem.count();
    return this.prisma.restrictedItem.create({ data: { ...input, sortOrder } });
  }

  async updateRestrictedItem(
    id: string,
    input: Partial<z.output<typeof RestrictedItemInputSchema>>,
  ) {
    return this.prisma.restrictedItem.update({ where: { id }, data: input });
  }
}
