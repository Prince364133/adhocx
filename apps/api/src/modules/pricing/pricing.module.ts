import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { ZonalPricingService } from './zonal-pricing.service';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [LocationsModule],
  controllers: [PricingController],
  providers: [PricingService, ZonalPricingService],
  exports: [PricingService, ZonalPricingService],
})
export class PricingModule {}
