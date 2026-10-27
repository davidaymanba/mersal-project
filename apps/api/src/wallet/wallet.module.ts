import { Global, Module } from '@nestjs/common';
import { AdminPayoutsController, WalletController } from './wallet.controller';
import { WalletProcessor } from './wallet.processor';
import { WalletService } from './wallet.service';

@Global()
@Module({
  controllers: [WalletController, AdminPayoutsController],
  providers: [WalletService, WalletProcessor],
  exports: [WalletService],
})
export class WalletModule {}
