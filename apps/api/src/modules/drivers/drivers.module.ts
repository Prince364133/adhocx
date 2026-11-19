import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LocationsModule } from '../locations/locations.module';
import { LedgerModule } from '../ledger/ledger.module';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { ReferralsModule } from './referrals/referrals.module';

@Module({
  imports: [AuthModule, LocationsModule, LedgerModule, ReferralsModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService, ReferralsModule],
})
export class DriversModule {}

