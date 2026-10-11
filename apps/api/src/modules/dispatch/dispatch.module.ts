import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { DispatchSchedulerService } from './dispatch-scheduler.service';
import { DriverBehaviorService } from './driver-behavior.service';
import { LocationsModule } from '../locations/locations.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [LocationsModule, RedisModule],
  providers: [DispatchService, DispatchSchedulerService, DriverBehaviorService],
  exports: [DispatchService, DispatchSchedulerService, DriverBehaviorService],
})
export class DispatchModule {}
