import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AppConfig } from '../config/config.module';
import { JobsService, MATCHING_QUEUE, type MatchingJob } from '../jobs/jobs.module';
import { MatchingService } from './matching.service';

@Processor(MATCHING_QUEUE)
export class MatchingProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(MatchingProcessor.name);

  constructor(
    private readonly matching: MatchingService,
    private readonly jobs: JobsService,
    private readonly config: AppConfig,
  ) {
    super();
  }

  async onApplicationBootstrap() {
    // Demo mode runs maintenance often so short offer windows expire on time.
    await this.jobs.scheduleMatchingTick(this.config.demoMode ? 15_000 : 60_000);
  }

  async process(job: Job<MatchingJob['data'], unknown, MatchingJob['name']>): Promise<unknown> {
    switch (job.name) {
      case 'matching.run': {
        const { shipmentId, trigger } = job.data as Extract<
          MatchingJob,
          { name: 'matching.run' }
        >['data'];
        const outcome = await this.matching.run(shipmentId, trigger);
        this.logger.log(`run ${shipmentId} (${trigger}) → ${outcome.result}`);
        return outcome.result;
      }
      case 'matching.trip': {
        const { tripId } = job.data as Extract<MatchingJob, { name: 'matching.trip' }>['data'];
        return this.matching.onTripPublished(tripId);
      }
      case 'matching.tick': {
        const expired = await this.matching.expireOffers();
        const swept = await this.matching.sweepExpiredWindows();
        const tripsDone = await this.matching.completeFinishedTrips();
        if (expired || swept || tripsDone)
          this.logger.log(
            `tick: ${expired} offers expired, ${swept} parcels without match, ${tripsDone} trips completed`,
          );
        return { expired, swept, tripsDone };
      }
      default:
        this.logger.warn(`Unknown job ${job.name as string}`);
        return null;
    }
  }
}
