import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { DispatchSchedulerService } from './dispatch-scheduler.service';
import { DriverBehaviorService } from './driver-behavior.service';
import { LocationsModule } from '../locations/locations.module';
import { RedisModule } from '../../redis/redis.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [LocationsModule, RedisModule, PricingModule],
  providers: [DispatchService, DispatchSchedulerService, DriverBehaviorService],
  exports: [DispatchService, DispatchSchedulerService, DriverBehaviorService],
})
export class DispatchModule {}
