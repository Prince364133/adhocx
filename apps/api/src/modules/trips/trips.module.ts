import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { LedgerModule } from '../ledger/ledger.module';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';

@Module({
  imports: [AuthModule, DispatchModule, LedgerModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
