import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module';
import { RedisModule } from '../../../redis/redis.module';
import { CorporateGpsIngestService } from './corporate-gps-ingest.service';
import { CorporateTelemetryWriter } from './corporate-telemetry-writer.service';
import { CorporateGpsPartitionMaintenance } from './corporate-gps-partition-maintenance.service';
import { TripEventRecorder } from './trip-event-recorder.service';
import { CorporateTrackingService } from './corporate-tracking.service';
import { CorporateTrackingController } from './corporate-tracking.controller';
import { TelemetryStreamHub } from './telemetry-stream-hub';

/**
 * Tracking bounded context (doc 19 WS-B): GPS ingest -> Redis Stream -> batched writer ->
 * corporate_vehicle_positions (daily partitions), freshness-aware tracking reads, playback,
 * and the trip-event / assignment-history recorder used by execution, dispatch and replanning.
 * Depends only on infrastructure modules, so other corporate domains can import it without cycles.
 */
@Module({
  imports: [DatabaseModule, RedisModule],
  providers: [
    CorporateGpsPartitionMaintenance,
    CorporateTelemetryWriter,
    CorporateGpsIngestService,
    TripEventRecorder,
    CorporateTrackingService,
    TelemetryStreamHub,
  ],
  controllers: [CorporateTrackingController],
  exports: [CorporateGpsIngestService, TripEventRecorder, CorporateTrackingService],
})
export class CorporateTrackingModule {}
