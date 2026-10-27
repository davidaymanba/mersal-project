import { Module } from '@nestjs/common';
import { AdminPricingController, QuotesController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  controllers: [QuotesController, AdminPricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
