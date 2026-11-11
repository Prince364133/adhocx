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
// WS-F: corporate roles, policy, departments / cost centers
import { CorporateTenantPolicyService } from './tenants/corporate-tenant-policy.service';
import { CorporateOrgStructureService } from './tenants/corporate-org-structure.service';
import { CorporateTenantUsersService } from './tenants/corporate-tenant-users.service';

// Rosters Sub-Module
import { RosterTemplateService } from './rosters/roster-template.service';
import { RosterIngestionService } from './rosters/roster-ingestion.service';
import { CorporateRosterController } from './rosters/corporate-roster.controller';
import { RosterLifecycleService } from './rosters/roster-lifecycle.service';

// WS-F: Scheduling (shift templates, holidays, autonomous planner)
import { CorporateShiftTemplateService } from './scheduling/corporate-shift-template.service';
import { CorporateAutoPlannerService } from './scheduling/corporate-auto-planner.service';
import { CorporateSchedulingController } from './scheduling/corporate-scheduling.controller';

// Routing Sub-Module
import { RouteSolverService } from './routing/route-solver.service';
import { CorporateRoutePlannerService } from './routing/corporate-route-planner.service';
import { GoogleGeocodingAdapter } from './routing/google-geocoding.adapter';
import { GoogleRoutesV2Adapter } from './routing/google-routes-v2.adapter';
import { CorporateRoutingController } from './routing/corporate-routing.controller';
import { TRAVEL_TIME_MATRIX_PORT } from './routing/travel-time-matrix.port';
import { HaversineTravelTimeMatrix } from './routing/haversine-travel-time-matrix';
import {
  GoogleTravelTimeMatrixAdapter,
  RedisMatrixCache,
} from './routing/google-travel-time-matrix.adapter';

// Dispatch & DDA Sub-Module
import { CorporateDispatchService } from './dispatch/corporate-dispatch.service';
import { DriverEligibilityService } from './supply/driver-eligibility.service';
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
import { CorporateSosEscalationScheduler } from './safety/corporate-sos-escalation.scheduler';
import { CorporateSupportTicketService } from './safety/corporate-support-ticket.service';
import { CorporateSupportTicketController, OpsSupportTicketController } from './safety/corporate-support-ticket.controller';

// Dual Financial Ledgers, Invoicing & Driver Settlements Sub-Module
import { CorporateBillingService } from './billing/corporate-billing.service';
import { RateCardService } from './billing/rate-card.service';
import { CorporateBillingController } from './billing/corporate-billing.controller';
// wire/billing-payouts: rate-card admin, payout execution, disputes / credit notes
import { CorporateRateCardAdminService } from './billing/corporate-rate-card-admin.service';
import { CorporateRateCardController } from './billing/corporate-rate-card.controller';
import { CorporatePayoutService } from './billing/corporate-payout.service';
import { CorporatePayoutWebhookController } from './billing/corporate-payout-webhook.controller';
import { CorporateInvoiceDisputeService } from './billing/corporate-invoice-dispute.service';
import { CORPORATE_PAYOUT_PROVIDER, createPayoutProviderFromEnv } from './billing/payout-provider.port';

// ===== WS-D ===== Command centre operations + corporate analytics
import { CorporateOperationsService } from './operations/corporate-operations.service';
import {
  CorporateOperationsController,
  CorporateRouteCancellationController,
} from './operations/corporate-operations.controller';
import { CorporateAnalyticsService } from './analytics/corporate-analytics.service';
import { CorporateAnalyticsController } from './analytics/corporate-analytics.controller';

// ===== WS-C ===== Rider Self-Service API, SOS FSM & Support Tickets
import { CorporateRiderService } from './rider/corporate-rider.service';
import { CorporateRiderController } from './rider/corporate-rider.controller';

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
    DriverEligibilityService,
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
    GoogleGeocodingAdapter,
    GoogleRoutesV2Adapter,
    CorporateRoutePlannerService,
    GoogleTrafficEstimatorAdapter,
    { provide: TRAFFIC_ESTIMATOR_PORT, useExisting: GoogleTrafficEstimatorAdapter },
    CorporateDispatchService,
    CorporateDispatchSchedulerService,
    CorporateTripExecutionService,
    CorporateRiderNotifier,
    CorporateReplanningService,
    CorporateSafetyService,
    CorporateSosEscalationScheduler,
    CorporateSupportTicketService,
    CorporateBillingService,
    RateCardService, // driver rate cards, shared by billing payouts and dispatch offer pricing
    // wire/billing-payouts
    { provide: CORPORATE_PAYOUT_PROVIDER, useFactory: () => createPayoutProviderFromEnv() },
    CorporatePayoutService,
    CorporateRateCardAdminService,
    CorporateInvoiceDisputeService,
    CorporateOperationsService, // WS-D
    CorporateAnalyticsService, // WS-D
    CorporateRiderService, // WS-C
    // WS-F
    CorporateTenantPolicyService,
    CorporateOrgStructureService,
    CorporateTenantUsersService,
    RosterLifecycleService,
    CorporateShiftTemplateService,
    CorporateAutoPlannerService,
  ],
  controllers: [
    CorporateTenantController,
    CorporateRosterController,
    CorporateRoutingController,
    CorporateDispatchController,
    CorporateTripExecutionController,
    CorporateSafetyController,
    CorporateSupportTicketController,
    OpsSupportTicketController,
    CorporateBillingController,
    CorporateRateCardController, // wire/billing-payouts
    CorporatePayoutWebhookController, // wire/billing-payouts (HMAC-signed, no JWT)
    CorporateOperationsController, // WS-D
    CorporateRouteCancellationController, // admin-ops: POST corporate/trips/routes/:id/cancel
    CorporateAnalyticsController, // WS-D
    CorporateRiderController, // WS-C
    CorporateSchedulingController, // WS-F
  ],
  exports: [
    DriverEligibilityService,
    CorporateTenantService,
    RosterTemplateService,
    RosterIngestionService,
    RouteSolverService,
    GoogleGeocodingAdapter,
    GoogleRoutesV2Adapter,
    CorporateRoutePlannerService,
    CorporateDispatchService,
    CorporateDispatchSchedulerService,
    CorporateTripExecutionService,
    CorporateRiderNotifier,
    CorporateReplanningService,
    CorporateSafetyService,
    CorporateSupportTicketService,
    CorporateBillingService,
    RateCardService,
    CorporatePayoutService, // wire/billing-payouts
    CorporateRiderService, // WS-C
    // WS-F
    CorporateTenantPolicyService,
    RosterLifecycleService,
    CorporateAutoPlannerService,
  ],
})
export class CorporateDomainModule {}
