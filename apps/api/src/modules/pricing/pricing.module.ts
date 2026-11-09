import { Module, forwardRef } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { DistancePricingService } from './distance-pricing.service';
import { AdminPricingController } from './admin-pricing.controller';
import { VendorQuoteController } from './vendor-quote.controller';
import { DriverQuoteController } from './driver-quote.controller';
import { LocationsModule } from '../locations/locations.module';
import { RequirementsModule } from '../requirements/requirements.module';

@Module({
  imports: [LocationsModule, forwardRef(() => RequirementsModule)],
  controllers: [
    PricingController,
    AdminPricingController,
    VendorQuoteController,
    DriverQuoteController,
  ],
  providers: [PricingService, DistancePricingService],
  exports: [PricingService, DistancePricingService],
})
export class PricingModule {}
