import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DriversModule } from '../../modules/drivers/drivers.module';
import { VehiclesModule } from '../../modules/vehicles/vehicles.module';
import { VendorsModule } from '../../modules/vendors/vendors.module';
import { FleetService } from './fleet.service';
import { FleetController } from './fleet.controller';

/**
 * Fleet Domain (Bounded Context: Fleet Supply & Compliance)
 * Encapsulates centralized fleet management, driver-to-fleet associations,
 * commercial vehicle compliance, and verification.
 */
@Module({
  imports: [DatabaseModule, DriversModule, VehiclesModule, VendorsModule],
  controllers: [FleetController],
  providers: [FleetService],
  exports: [FleetService, DriversModule, VehiclesModule, VendorsModule],
})
export class FleetDomainModule {}
