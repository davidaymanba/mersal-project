import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AppConfig } from '../config/config.module';
import { JobsService, WALLET_QUEUE } from '../jobs/jobs.module';
import { SettingsService } from '../settings/settings.service';
import { WalletService } from './wallet.service';

@Processor(WALLET_QUEUE)
export class WalletProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(WalletProcessor.name);

  constructor(
    private readonly wallet: WalletService,
    private readonly jobs: JobsService,
    private readonly settings: SettingsService,
    private readonly config: AppConfig,
  ) {
    super();
  }

  async onApplicationBootstrap() {
    await this.jobs.scheduleWalletTick(this.config.demoMode ? 15_000 : 5 * 60_000);
    await this.jobs.scheduleWeeklyPayouts(await this.settings.get('payouts.weekday'));
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case 'wallet.tick': {
        const released = await this.wallet.releaseDueHolds();
        if (released) this.logger.log(`released ${released} holds`);
        return { released };
      }
      case 'payouts.weekly': {
        const summary = await this.wallet.runPayouts({ type: 'SYSTEM' });
        this.logger.log(`weekly payouts: ${JSON.stringify(summary)}`);
        return summary;
      }
      default:
        return null;
    }
  }
}
