import { Module } from '@nestjs/common';
import { MatchingModule } from '../matching/matching.module';
import { PricingModule } from '../pricing/pricing.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [PricingModule, MatchingModule],
  controllers: [TripsController],
  providers: [TripsService],
})
export class TripsModule {}
