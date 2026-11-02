import { TripAggregate, TripLifecycleStatus } from '../aggregates/trip.aggregate';

/**
 * ITripRepository Port.
 * Pure domain interface defining persistence operations for TripAggregate.
 * Implemented by infrastructure layer (Prisma ORM).
 */
export interface ITripRepository {
  findById(tripId: string): Promise<TripAggregate | null>;
  findByRouteId(routeId: string): Promise<TripAggregate | null>;
  findActiveByDriverId(driverId: string): Promise<TripAggregate | null>;
  findByTenantId(tenantId: string, status?: TripLifecycleStatus[]): Promise<TripAggregate[]>;
  save(trip: TripAggregate): Promise<void>;
  delete(tripId: string): Promise<void>;
}
