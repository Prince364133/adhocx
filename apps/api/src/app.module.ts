import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { configs } from './config';

import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './common/storage/storage.module';

// Domain modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { RequirementsModule } from './modules/requirements/requirements.module';
import { OffersModule } from './modules/offers/offers.module';
import { BidsModule } from './modules/bids/bids.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { TripsModule } from './modules/trips/trips.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { LocationsModule } from './modules/locations/locations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { LeadsModule } from './modules/leads/leads.module';
import { AppUpdateModule } from './modules/app-update/app-update.module';

@Module({
  imports: [
    // Configuration — loads .env and structured config objects
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: ['.env.local', '.env'],
    }),

    // Infrastructure
    DatabaseModule,
    RedisModule,
    StorageModule,

    // Global cross-cutting modules
    NotificationsModule,
    AuditModule,
    HealthModule,

    // Domain modules
    AuthModule,
    UsersModule,
    VendorsModule,
    DriversModule,
    VehiclesModule,
    RequirementsModule,
    OffersModule,
    BidsModule,
    AssignmentsModule,
    TripsModule,
    DispatchModule,
    LocationsModule,
    PaymentsModule,
    LedgerModule,
    SettlementsModule,
    PricingModule,
    ReviewsModule,
    DisputesModule,
    AdminModule,
    CouponsModule,
    BlogsModule,
    SubscriptionsModule,
    LeadsModule,
    AppUpdateModule,
  ],
  controllers: [AppController],
})

export class AppModule {}
