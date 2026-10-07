import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { H3Service } from './h3.service';

@Module({
  providers: [LocationsService, H3Service],
  exports: [LocationsService, H3Service],
})
export class LocationsModule {}
