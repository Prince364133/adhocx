import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RedisModule } from '../../redis/redis.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { AuditModule } from '../../modules/audit/audit.module';
import { LocationsModule } from '../../modules/locations/locations.module';

// Rosters Sub-Module
import { RosterTemplateService } from './rosters/roster-template.service';
import { RosterIngestionService } from './rosters/roster-ingestion.service';
import { CorporateRosterController } from './rosters/corporate-roster.controller';

// Routing Sub-Module
import { RouteSolverService } from './routing/route-solver.service';
import { CorporateRoutingController } from './routing/corporate-routing.controller';

// Dispatch & DDA Sub-Module
import { CorporateDispatchService } from './dispatch/corporate-dispatch.service';
import { CorporateDispatchController } from './dispatch/corporate-dispatch.controller';

// Trip Execution, 5-Min Timer & OTP Boarding Sub-Module
import { CorporateTripExecutionService } from './execution/corporate-trip-execution.service';
import { CorporateTripExecutionController } from './execution/corporate-trip-execution.controller';

/**
 * Corporate ETS Domain (Bounded Context: Corporate Managed Commute Transportation)
 * Encapsulates Excel roster ingestion, shift templates, OR-Tools CVRPTW route solving,
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
  ],
  providers: [
    RosterTemplateService,
    RosterIngestionService,
    RouteSolverService,
    CorporateDispatchService,
    CorporateTripExecutionService,
  ],
  controllers: [
    CorporateRosterController,
    CorporateRoutingController,
    CorporateDispatchController,
    CorporateTripExecutionController,
  ],
  exports: [
    RosterTemplateService,
    RosterIngestionService,
    RouteSolverService,
    CorporateDispatchService,
    CorporateTripExecutionService,
  ],
})
export class CorporateDomainModule {}
