import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { DeliveryModule } from './delivery/delivery.module';
import { DisputesModule } from './disputes/disputes.module';
import { JwtAuthGuard, RolesGuard } from './auth/guards';
import { AppConfig, ConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { JobsModule } from './jobs/jobs.module';
import { MailModule } from './mail/mail.module';
import { MatchingModule } from './matching/matching.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PricingModule } from './pricing/pricing.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { ReliabilityModule } from './reliability/reliability.service';
import { ReviewsModule } from './reviews/reviews.module';
import { RedisModule } from './redis/redis.module';
import { SettingsModule } from './settings/settings.service';
import { ShipmentStateModule } from './shipments/shipment-state.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { StorageModule } from './storage/storage.module';
import { TripsModule } from './trips/trips.module';
import { UsersModule } from './users/users.module';
import { VerificationModule } from './verification/verification.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ ttl: 60_000, limit: 300 }],
        skipIf: (context) => {
          const key = config.env.E2E_BYPASS_KEY;
          if (config.isProduction || !key || context.getType() !== 'http') return false;
          return (
            context.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>()
              .headers['x-e2e-key'] === key
          );
        },
      }),
    }),
    AuditModule,
    SettingsModule,
    JobsModule,
    ShipmentStateModule,
    ReliabilityModule,
    PaymentsModule,
    WalletModule,
    MailModule,
    StorageModule,
    RealtimeModule,
    NotificationsModule,
    MessagingModule,
    AuthModule,
    UsersModule,
    VerificationModule,
    CatalogModule,
    PricingModule,
    ShipmentsModule,
    MatchingModule,
    TripsModule,
    DeliveryModule,
    DisputesModule,
    ReviewsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate limit → authenticate → authorise.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
  ],
})
export class AppModule {}
