import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { configs } from './config';

import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './common/storage/storage.module';

// Domain Bounded Contexts (Domain-Driven Design Architecture)
import {
  IdentityDomainModule,
  FleetDomainModule,
  MarketplaceDomainModule,
  DispatchDomainModule,
  TripDomainModule,
  FinanceDomainModule,
  PlatformDomainModule,
  CorporateDomainModule,
} from './domains';
import { DigioModule } from './modules/digio/digio.module';

@Module({
  imports: [
    // Configuration — loads .env and structured config objects
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
      // A test server must never pick up live keys from the repo's .env files (that once sent
      // real OTP SMS from a local E2E run). In NODE_ENV=test only explicitly passed env is used.
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),

    // Infrastructure
    DatabaseModule,
    RedisModule,
    StorageModule,

    // Core Domain Bounded Contexts (DDD)
    IdentityDomainModule,
    FleetDomainModule,
    MarketplaceDomainModule,
    DispatchDomainModule,
    TripDomainModule,
    FinanceDomainModule,
    PlatformDomainModule,
    CorporateDomainModule,
    DigioModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
