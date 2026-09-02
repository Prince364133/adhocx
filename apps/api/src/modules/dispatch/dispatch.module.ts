import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [LocationsModule],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
