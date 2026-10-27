import { Module } from '@nestjs/common';
import {
  AdminMatchingController,
  OffersController,
  WithdrawController,
} from './matching.controller';
import { MatchingProcessor } from './matching.processor';
import { MatchingService } from './matching.service';

@Module({
  controllers: [OffersController, AdminMatchingController, WithdrawController],
  providers: [MatchingService, MatchingProcessor],
  exports: [MatchingService],
})
export class MatchingModule {}
