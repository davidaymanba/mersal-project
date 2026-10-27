import { Global, Module } from '@nestjs/common';
import { ShipmentStateService } from './shipment-state.service';

/** Global so payments, matching and delivery can move shipments without importing each other. */
@Global()
@Module({
  providers: [ShipmentStateService],
  exports: [ShipmentStateService],
})
export class ShipmentStateModule {}
