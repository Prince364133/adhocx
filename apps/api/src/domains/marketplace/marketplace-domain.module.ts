import { Module } from '@nestjs/common';
import { RequirementsModule } from '../../modules/requirements/requirements.module';

/**
 * Marketplace Domain (Bounded Context: Adhoc Transport Demand & Direct Dispatch)
 * Encapsulates corporate adhoc requirements and driver dispatch lifecycle.
 */
@Module({
  imports: [RequirementsModule],
  exports: [RequirementsModule],
})
export class MarketplaceDomainModule {}
