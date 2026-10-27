import { existsSync } from 'node:fs';
import { Prisma, PrismaClient } from '@prisma/client';
import { PricingRulesSchema } from '@mersal/shared';
import { hashPassword } from '../auth/password';
import {
  categories,
  cities,
  corridorPriceScale,
  corridors,
  defaultMatchingWeights,
  defaultPricingRules,
  defaultSettings,
  restrictedItems,
} from './reference-data';

if (existsSync('.env')) process.loadEnvFile('.env');

const ADMIN_EMAIL = 'admin@mersal.local';
const ADMIN_PASSWORD = 'Mersal!2026';

async function seedReferenceData(prisma: PrismaClient): Promise<void> {
  for (const corridor of corridors) {
    await prisma.corridor.upsert({ where: { code: corridor.code }, update: {}, create: corridor });
  }

  for (const city of cities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      update: { names: city.names },
      create: city,
    });
  }

  for (const [index, category] of categories.entries()) {
    await prisma.category.upsert({
      where: { code: category.code },
      update: { names: category.names, icon: category.icon },
      create: { ...category, sortOrder: index },
    });
  }

  if ((await prisma.restrictedItem.count()) === 0) {
    await prisma.restrictedItem.createMany({
      data: restrictedItems.map((item, index) => ({ ...item, sortOrder: index })),
    });
  }
}

async function seedPricing(prisma: PrismaClient, adminId: string): Promise<void> {
  for (const corridor of await prisma.corridor.findMany()) {
    const existing = await prisma.pricingVersion.findFirst({ where: { corridorId: corridor.id } });
    if (existing) continue;
    const rules = PricingRulesSchema.parse(
      defaultPricingRules(corridorPriceScale[corridor.code] ?? 1),
    );
    await prisma.pricingVersion.create({
      data: {
        corridorId: corridor.id,
        version: 1,
        status: 'ACTIVE',
        rules,
        notes: 'Initial tariff',
        createdById: adminId,
        activatedAt: new Date(),
      },
    });
  }
}

async function seedPlatformConfig(prisma: PrismaClient): Promise<void> {
  const global = await prisma.matchingConfig.findFirst({ where: { corridorId: null } });
  if (!global) {
    await prisma.matchingConfig.create({ data: { weights: defaultMatchingWeights } });
  }
  for (const [key, value] of Object.entries(defaultSettings)) {
    await prisma.appSetting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as Prisma.InputJsonValue },
    });
  }
}

async function seedAdmin(prisma: PrismaClient): Promise<string> {
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      role: 'ADMIN',
      firstName: 'Mersal',
      lastName: 'Admin',
      emailVerifiedAt: new Date(),
    },
  });
  return admin.id;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedReferenceData(prisma);
    const adminId = await seedAdmin(prisma);
    await seedPricing(prisma, adminId);
    await seedPlatformConfig(prisma);
    console.log(`Seed complete. Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
