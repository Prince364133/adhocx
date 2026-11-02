import { Trip as PrismaTrip } from '@prisma/client';
import { TripAggregate, TripLifecycleStatus } from '@adhocx/domain-core';

export class PrismaTripMapper {
  /**
   * Maps a Prisma Trip record to a domain TripAggregate.
   */
  public static toDomain(raw: PrismaTrip & { events?: any[] }): TripAggregate {
    let lifecycleStatus = TripLifecycleStatus.DRIVER_ASSIGNED;
    switch (raw.status) {
      case 'ASSIGNED':
        lifecycleStatus = TripLifecycleStatus.DRIVER_ASSIGNED;
        break;
      case 'ARRIVED':
        lifecycleStatus = TripLifecycleStatus.DRIVER_ARRIVED;
        break;
      case 'IN_PROGRESS':
        lifecycleStatus = TripLifecycleStatus.IN_PROGRESS;
        break;
      case 'COMPLETED':
        lifecycleStatus = TripLifecycleStatus.COMPLETED;
        break;
      case 'CANCELLED':
        lifecycleStatus = TripLifecycleStatus.CANCELLED;
        break;
    }

    return TripAggregate.reconstitute(raw.id, {
      tenantId: raw.vendorId, // Polymorphic vendor/tenant identifier
      routeId: raw.requirementId,
      driverId: raw.driverId,
      vehicleId: raw.vehicleId ?? undefined,
      status: lifecycleStatus,
      stops: [],
      totalDistanceMeters: 0,
      actualStartTime: raw.startedAt ?? undefined,
      actualEndTime: raw.completedAt ?? undefined,
    });
  }

  /**
   * Maps a domain TripAggregate to Prisma Trip persistence input.
   */
  public static toPersistence(aggregate: TripAggregate): any {
    let prismaStatus = 'ASSIGNED';
    if (aggregate.status === TripLifecycleStatus.DRIVER_ARRIVED) prismaStatus = 'ARRIVED';
    else if (aggregate.status === TripLifecycleStatus.IN_PROGRESS) prismaStatus = 'IN_PROGRESS';
    else if (aggregate.status === TripLifecycleStatus.COMPLETED) prismaStatus = 'COMPLETED';
    else if (aggregate.status === TripLifecycleStatus.CANCELLED) prismaStatus = 'CANCELLED';

    return {
      id: aggregate.id,
      vendorId: aggregate.tenantId,
      requirementId: aggregate.routeId,
      driverId: aggregate.driverId,
      vehicleId: aggregate.vehicleId,
      status: prismaStatus,
      startedAt: aggregate.actualStartTime,
      completedAt: aggregate.actualEndTime,
    };
  }
}
