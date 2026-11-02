import { Module } from '@nestjs/common';
import { TripsModule } from '../../modules/trips/trips.module';
import { LocationsModule } from '../../modules/locations/locations.module';
import { ReviewsModule } from '../../modules/reviews/reviews.module';
import { AssignmentsModule } from '../../modules/assignments/assignments.module';

/**
 * Trip Domain (Bounded Context: Live Ride Execution & Deboarding)
 * Encapsulates live trip state transitions, GPS telemetry tracking, boarding verification, and passenger reviews.
 */
@Module({
  imports: [TripsModule, LocationsModule, ReviewsModule, AssignmentsModule],
  exports: [TripsModule, LocationsModule, ReviewsModule, AssignmentsModule],
})
export class TripDomainModule {}
