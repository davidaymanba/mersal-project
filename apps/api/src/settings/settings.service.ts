import { Global, Injectable, Module } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Defaults used when a setting has not been saved yet. Values are editable by admins. */
export const SETTING_DEFAULTS = {
  'wallet.holdHours': 48,
  'wallet.demoHoldMinutes': 2,
  'payouts.weekday': 1,
  'matching.demoOfferTtlMinutes': 3,
  'quotes.ttlMinutes': 30,
  'disputes.windowHours': 48,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

const CACHE_MS = 15_000;

@Injectable()
export class SettingsService {
  private cache: { at: number; values: Map<string, unknown> } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async get<K extends SettingKey>(key: K): Promise<(typeof SETTING_DEFAULTS)[K]> {
    const values = await this.all();
    return (values.get(key) ?? SETTING_DEFAULTS[key]) as (typeof SETTING_DEFAULTS)[K];
  }

  async list(): Promise<Record<SettingKey, unknown>> {
    const values = await this.all();
    return Object.fromEntries(
      (Object.keys(SETTING_DEFAULTS) as SettingKey[]).map((key) => [
        key,
        values.get(key) ?? SETTING_DEFAULTS[key],
      ]),
    ) as Record<SettingKey, unknown>;
  }

  async set(key: SettingKey, value: unknown): Promise<void> {
    await this.prisma.appSetting.upsert({
      where: { key },
      update: { value: value as Prisma.InputJsonValue },
      create: { key, value: value as Prisma.InputJsonValue },
    });
    this.cache = null;
  }

  private async all(): Promise<Map<string, unknown>> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.values;
    const rows = await this.prisma.appSetting.findMany();
    this.cache = { at: Date.now(), values: new Map(rows.map((r) => [r.key, r.value])) };
    return this.cache.values;
  }
}

@Global()
@Module({ providers: [SettingsService], exports: [SettingsService] })
export class SettingsModule {}
