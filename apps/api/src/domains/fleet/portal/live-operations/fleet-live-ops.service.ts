import { Injectable } from '@nestjs/common';
import {
  FleetLiveOpsQueryDto,
  FleetLiveOpsResponseDto,
  FleetLiveOpsRideDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../../../database/database.service';

const LOCATION_STALE_SECONDS = 120;

@Injectable()
export class FleetLiveOpsService {
  constructor(private readonly db: DatabaseService) {}

  async getLiveOperations(
    fleetId: string,
    query: FleetLiveOpsQueryDto,
  ): Promise<FleetLiveOpsResponseDto> {
    const now = new Date();
    const drivers = await this.db.driver.findMany({
      where: {
        fleetId,
        ...(query.driverId ? { id: query.driverId } : {}),
      },
      select: {
        id: true,
        fullName: true,
        availabilityStatus: true,
        vehiclePlate: true,
        vehicleType: true,
        currentLat: true,
        currentLng: true,
        lastLocationAt: true,
      },
    });

    const driverIds = drivers.map((d) => d.id);
    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    const activeStatuses =
      query.status && query.status !== 'ALL'
        ? [query.status]
        : ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS'];

    const trips = driverIds.length
      ? await this.db.trip.findMany({
          where: {
            driverId: { in: driverIds },
            status: { in: activeStatuses as any },
          },
          orderBy: { updatedAt: 'desc' },
          take: 100,
          select: {
            id: true,
            driverId: true,
            status: true,
            pickupAddress: true,
            dropAddress: true,
            startedAt: true,
            updatedAt: true,
          },
        })
      : [];

    const rides: FleetLiveOpsRideDto[] = trips.map((t) => {
      const drv = driverMap.get(t.driverId);
      const hasLocation =
        drv?.currentLat != null &&
        drv?.currentLng != null &&
        drv?.lastLocationAt != null;
      const ageSec = hasLocation && drv?.lastLocationAt
        ? (now.getTime() - drv.lastLocationAt.getTime()) / 1000
        : Infinity;

      return {
        tripId: t.id,
        driverId: t.driverId,
        driverName: drv?.fullName || 'Fleet Driver',
        vehiclePlate: drv?.vehiclePlate || undefined,
        vehicleType: drv?.vehicleType || undefined,
        status: t.status,
        pickupAddress: t.pickupAddress,
        dropAddress: t.dropAddress,
        startedAt: t.startedAt?.toISOString(),
        lastUpdatedAt: t.updatedAt.toISOString(),
        ...(hasLocation && drv?.lastLocationAt
          ? {
              lastLocation: {
                latitude: Number(drv.currentLat),
                longitude: Number(drv.currentLng),
                recordedAt: drv.lastLocationAt.toISOString(),
                isStale: ageSec > LOCATION_STALE_SECONDS,
              },
            }
          : {}),
      };
    });

    return {
      lastRefreshedAt: now.toISOString(),
      locationStaleAfterSeconds: LOCATION_STALE_SECONDS,
      summary: {
        driversAvailable: drivers.filter((d) => d.availabilityStatus === 'AVAILABLE').length,
        driversOnTrip: drivers.filter((d) => d.availabilityStatus === 'BUSY').length,
        activeRides: rides.length,
      },
      rides,
    };
  }
}
