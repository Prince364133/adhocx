import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { H3Service } from './h3.service';
import { GoogleMapsService } from './google-maps.service';

@Module({
  providers: [LocationsService, H3Service, GoogleMapsService],
  exports: [LocationsService, H3Service, GoogleMapsService],
})
export class LocationsModule {}
