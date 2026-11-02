import { Module } from '@nestjs/common';
import { RequirementsModule } from '../../modules/requirements/requirements.module';
import { BidsModule } from '../../modules/bids/bids.module';

/**
 * Marketplace Domain (Bounded Context: Adhoc Transport Demand & Bidding)
 * Encapsulates corporate adhoc requirements and driver/vendor bidding lifecycle.
 */
@Module({
  imports: [RequirementsModule, BidsModule],
  exports: [RequirementsModule, BidsModule],
})
export class MarketplaceDomainModule {}
