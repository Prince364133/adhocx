import { Module } from '@nestjs/common';
import { DriversModule } from '../../modules/drivers/drivers.module';
import { VehiclesModule } from '../../modules/vehicles/vehicles.module';
import { VendorsModule } from '../../modules/vendors/vendors.module';

/**
 * Fleet Domain (Bounded Context: Fleet Supply & Compliance)
 * Encapsulates driver onboarding, commercial vehicle compliance, and verification.
 */
@Module({
  imports: [DriversModule, VehiclesModule, VendorsModule],
  exports: [DriversModule, VehiclesModule, VendorsModule],
})
export class FleetDomainModule {}

