import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DriversModule } from '../../modules/drivers/drivers.module';
import { VehiclesModule } from '../../modules/vehicles/vehicles.module';
import { VendorsModule } from '../../modules/vendors/vendors.module';
import { FleetAdminOperationsController } from './fleet-admin-ops.controller';
import { FleetAdminOperationsService } from './fleet-admin-ops.service';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { FleetAuthController } from './portal/auth/fleet-auth.controller';
import { FleetAuthService } from './portal/auth/fleet-auth.service';
import { FleetCodeController } from './portal/code/fleet-code.controller';
import { FleetCodeService } from './portal/code/fleet-code.service';
import { FleetDashboardController } from './portal/dashboard/fleet-dashboard.controller';
import { FleetDashboardService } from './portal/dashboard/fleet-dashboard.service';
import { FleetDriversController } from './portal/drivers/fleet-drivers.controller';
import { FleetDriversService } from './portal/drivers/fleet-drivers.service';
import { FleetFinanceController } from './portal/earnings-payouts/fleet-finance.controller';
import { FleetFinanceService } from './portal/earnings-payouts/fleet-finance.service';
import { FleetAuthGuard } from './portal/guards/fleet-auth.guard';
import { FleetRolesGuard } from './portal/guards/fleet-roles.guard';
import { FleetIncentivesController } from './portal/incentives/fleet-incentives.controller';
import { FleetIncentivesService } from './portal/incentives/fleet-incentives.service';
import { FleetLiveOpsController } from './portal/live-operations/fleet-live-ops.controller';
import { FleetLiveOpsService } from './portal/live-operations/fleet-live-ops.service';
import { FleetNotificationsController } from './portal/notifications/fleet-notifications.controller';
import { FleetNotificationsService } from './portal/notifications/fleet-notifications.service';
import { FleetShiftsController } from './portal/shifts/fleet-shifts.controller';
import { FleetShiftsService } from './portal/shifts/fleet-shifts.service';
import { FleetSupportController } from './portal/support/fleet-support.controller';
import { FleetSupportService } from './portal/support/fleet-support.service';

/**
 * Fleet Domain (Bounded Context: Fleet Supply, Compliance & Fleet Portal Operations)
 */
@Module({
  imports: [DatabaseModule, DriversModule, VehiclesModule, VendorsModule],
  controllers: [
    FleetAdminOperationsController,
    FleetController,
    FleetAuthController,
    FleetCodeController,
    FleetDashboardController,
    FleetDriversController,
    FleetLiveOpsController,
    FleetFinanceController,
    FleetIncentivesController,
    FleetShiftsController,
    FleetSupportController,
    FleetNotificationsController,
  ],
  providers: [
    FleetAdminOperationsService,
    FleetService,
    FleetAuthGuard,
    FleetRolesGuard,
    FleetAuthService,
    FleetCodeService,
    FleetDashboardService,
    FleetDriversService,
    FleetLiveOpsService,
    FleetFinanceService,
    FleetIncentivesService,
    FleetShiftsService,
    FleetSupportService,
    FleetNotificationsService,
  ],
  exports: [
    FleetAdminOperationsService,
    FleetService,
    FleetAuthService,
    FleetCodeService,
    FleetDashboardService,
    FleetDriversService,
    FleetLiveOpsService,
    FleetFinanceService,
    FleetIncentivesService,
    FleetShiftsService,
    FleetSupportService,
    FleetNotificationsService,
    DriversModule,
    VehiclesModule,
    VendorsModule,
  ],
})
export class FleetDomainModule {}
