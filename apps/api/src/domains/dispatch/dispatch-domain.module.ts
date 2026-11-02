import { Module } from '@nestjs/common';
import { DispatchModule } from '../../modules/dispatch/dispatch.module';
import { OffersModule } from '../../modules/offers/offers.module';

/**
 * Dispatch Domain (Bounded Context: Spatial Allocation & Offer Engine)
 * Encapsulates H3 spatial candidate matching, 60s atomic driver offers, and allocation waves.
 */
@Module({
  imports: [DispatchModule, OffersModule],
  exports: [DispatchModule, OffersModule],
})
export class DispatchDomainModule {}

