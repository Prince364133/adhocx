import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../redis/redis.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { AuditModule } from '../../modules/audit/audit.module';
import { LocationsModule } from '../../modules/locations/locations.module';
import { GoogleMapsService } from '../../modules/locations/google-maps.service';
import { RedisService } from '../../redis/redis.service';
import { CorporateTrackingModule } from './tracking/corporate-tracking.module';

// Tenants, Offices & Employees Sub-Module
import { CorporateTenantService } from './tenants/corporate-tenant.service';
import { CorporateTenantController } from './tenants/corporate-tenant.controller';

// Rosters Sub-Module
import { RosterTemplateService } from './rosters/roster-template.service';
import { RosterIngestionService } from './rosters/roster-ingestion.service';
import { CorporateRosterController } from './rosters/corporate-roster.controller';

// Routing Sub-Module
import { RouteSolverService } from './routing/route-solver.service';
import { CorporateRoutingController } from './routing/corporate-routing.controller';
import { TRAVEL_TIME_MATRIX_PORT } from './routing/travel-time-matrix.port';
import { HaversineTravelTimeMatrix } from './routing/haversine-travel-time-matrix';
import {
  GoogleTravelTimeMatrixAdapter,
  RedisMatrixCache,
} from './routing/google-travel-time-matrix.adapter';

// Dispatch & DDA Sub-Module
import { CorporateDispatchService } from './dispatch/corporate-dispatch.service';
import { CorporateDispatchSchedulerService } from './dispatch/corporate-dispatch-scheduler.service';
import { CorporateDispatchController } from './dispatch/corporate-dispatch.controller';
import { GoogleTrafficEstimatorAdapter } from './dispatch/traffic/google-traffic-estimator.adapter';
import { TRAFFIC_ESTIMATOR_PORT } from './dispatch/traffic/traffic-estimator.port';

// Trip Execution, 5-Min Timer & OTP Boarding Sub-Module
import { CorporateTripExecutionService } from './execution/corporate-trip-execution.service';
import { CorporateTripExecutionController } from './execution/corporate-trip-execution.controller';
import { CorporateRiderNotifier } from './execution/corporate-rider-notifier.service';

// Cancel / Reschedule Route Re-planning Sub-Module
import { CorporateReplanningService } from './replanning/corporate-replanning.service';

// Safety SOS, Route Deviation & Command Centre Sub-Module
import { CorporateSafetyService } from './safety/corporate-safety.service';
import { CorporateSafetyController } from './safety/corporate-safety.controller';

// Dual Financial Ledgers, Invoicing & Driver Settlements Sub-Module
import { CorporateBillingService } from './billing/corporate-billing.service';
import { CorporateBillingController } from './billing/corporate-billing.controller';

/**
 * Corporate ETS Domain (Bounded Context: Corporate Managed Commute Transportation)
 * Encapsulates Excel roster ingestion, shift templates, capacitated route planning on road travel times (sweep + local search heuristic),
 * H3 autonomous dispatch, 60-second atomic driver offers, 5-minute stop wait buffer timers,
 * 4-digit boarding OTP exchange, 9-hour cancellation cutoff policies, and corporate attendance tracking.
 */
@Module({
  imports: [
    DatabaseModule,
    RedisModule,
    NotificationsModule,
    AuditModule,
    LocationsModule,
    CorporateTrackingModule,
  ],
  providers: [
    CorporateTenantService,
    RosterTemplateService,
    RosterIngestionService,
    {
      provide: TRAVEL_TIME_MATRIX_PORT,
      useFactory: (maps: GoogleMapsService, redis: RedisService) =>
        new GoogleTravelTimeMatrixAdapter(maps, new RedisMatrixCache(redis), new HaversineTravelTimeMatrix()),
      inject: [GoogleMapsService, RedisService],
    },
    RouteSolverService,
    GoogleTrafficEstimatorAdapter,
    { provide: TRAFFIC_ESTIMATOR_PORT, useExisting: GoogleTrafficEstimatorAdapter },
    CorporateDispatchService,
    CorporateDispatchSchedulerService,
    CorporateTripExecutionService,
    CorporateRiderNotifier,
    CorporateReplanningService,
    CorporateSafetyService,
    CorporateBillingService,
  ],
  controllers: [
    CorporateTenantController,
    CorporateRosterController,
    CorporateRoutingController,
    CorporateDispatchController,
    CorporateTripExecutionController,
    CorporateSafetyController,
    CorporateBillingController,
  ],
  exports: [
    CorporateTenantService,
    RosterTemplateService,
    RosterIngestionService,
    RouteSolverService,
    CorporateDispatchService,
    CorporateDispatchSchedulerService,
    CorporateTripExecutionService,
    CorporateRiderNotifier,
    CorporateReplanningService,
    CorporateSafetyService,
    CorporateBillingService,
  ],
})
export class CorporateDomainModule {}
