import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { ZonalPricingService } from './zonal-pricing.service';
import { H3Service } from '../locations/h3.service';

@Module({
  controllers: [PricingController],
  providers: [PricingService, ZonalPricingService, H3Service],
  exports: [PricingService, ZonalPricingService],
})
export class PricingModule {}
