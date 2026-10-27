import { Module } from '@nestjs/common';
import {
  AdminDeliveryController,
  DeliveryController,
  TrackingController,
} from './delivery.controller';
import { DeliveryService } from './delivery.service';

@Module({
  controllers: [DeliveryController, TrackingController, AdminDeliveryController],
  providers: [DeliveryService],
})
export class DeliveryModule {}
