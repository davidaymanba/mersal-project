import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Global, Injectable, Module } from '@nestjs/common';
import type { MatchTrigger } from '@prisma/client';
import type { Queue } from 'bullmq';
import Redis from 'ioredis';
import { AppConfig } from '../config/config.module';

export const MATCHING_QUEUE = 'matching';
export const WALLET_QUEUE = 'wallet';

export type MatchingJob =
  | { name: 'matching.run'; data: { shipmentId: string; trigger: MatchTrigger } }
  | { name: 'matching.trip'; data: { tripId: string } }
  | { name: 'matching.tick'; data: Record<string, never> };

/** Producer side of the background queues. Consumers live in their domain modules. */
@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(MATCHING_QUEUE) private readonly matching: Queue,
    @InjectQueue(WALLET_QUEUE) readonly wallet: Queue,
  ) {}

  runMatching(shipmentId: string, trigger: MatchTrigger, delayMs = 0) {
    return this.matching.add(
      'matching.run',
      { shipmentId, trigger },
      {
        delay: delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 500,
        removeOnFail: 1000,
      },
    );
  }

  matchNewTrip(tripId: string) {
    return this.matching.add(
      'matching.trip',
      { tripId },
      { attempts: 3, removeOnComplete: 500, removeOnFail: 1000 },
    );
  }

  /** Releases earnings whose hold period has passed. */
  scheduleWalletTick(everyMs: number) {
    return this.wallet.upsertJobScheduler(
      'wallet-tick',
      { every: everyMs },
      { name: 'wallet.tick', data: {} },
    );
  }

  /** Weekly payout run, `weekday` 0 = Sunday … 6 = Saturday, at 09:00 UTC. */
  scheduleWeeklyPayouts(weekday: number) {
    return this.wallet.upsertJobScheduler(
      'payouts-weekly',
      { pattern: `0 9 * * ${weekday}`, tz: 'UTC' },
      { name: 'payouts.weekly', data: {} },
    );
  }

  /** Recurring maintenance (offer expiry, matching window sweep). */
  scheduleMatchingTick(everyMs: number) {
    return this.matching.upsertJobScheduler(
      'matching-tick',
      { every: everyMs },
      { name: 'matching.tick', data: {} },
    );
  }
}

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        connection: new Redis(config.env.REDIS_URL, { maxRetriesPerRequest: null }),
        prefix: 'mersal',
      }),
    }),
    BullModule.registerQueue({ name: MATCHING_QUEUE }, { name: WALLET_QUEUE }),
  ],
  providers: [JobsService],
  exports: [JobsService, BullModule],
})
export class JobsModule {}
