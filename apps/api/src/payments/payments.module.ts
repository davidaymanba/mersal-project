import { Global, Module } from '@nestjs/common';
import { AppConfig } from '../config/config.module';
import { DemoPaymentProvider } from './demo.provider';
import { PAYMENT_PROVIDER } from './payment-provider';
import { AdminPaymentsController, PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripePaymentProvider } from './stripe.provider';

@Global()
@Module({
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [
    {
      provide: PAYMENT_PROVIDER,
      inject: [AppConfig],
      useFactory: (config: AppConfig) =>
        config.env.STRIPE_SECRET_KEY
          ? new StripePaymentProvider(
              config.env.STRIPE_SECRET_KEY,
              config.env.STRIPE_WEBHOOK_SECRET,
            )
          : new DemoPaymentProvider(),
    },
    PaymentsService,
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER],
})
export class PaymentsModule {}
