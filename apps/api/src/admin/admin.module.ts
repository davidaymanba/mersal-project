import { Module } from '@nestjs/common';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminOverviewController } from './admin-overview.controller';
import { AdminAuditController, AdminSettingsController } from './admin-settings.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminTravellersController } from './admin-travellers.controller';

@Module({
  controllers: [
    AdminOverviewController,
    AdminAnalyticsController,
    AdminSettingsController,
    AdminAuditController,
    AdminUsersController,
    AdminTravellersController,
  ],
})
export class AdminModule {}
