import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { LocationsModule } from '../locations/locations.module';
import { RedisModule } from '../../redis/redis.module';

@Module({
  imports: [LocationsModule, RedisModule],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
