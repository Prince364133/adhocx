import { Injectable, Logger, Optional } from '@nestjs/common';
import { VehicleType, VerificationStatus, DriverAvailability } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';

export interface NearbyDriverResult {
  driverId: string;
  distanceKm: number;
}

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);
  private readonly GEO_KEY = 'drivers:geo:available';
  private readonly DRIVER_META_KEY = 'drivers:meta:';

  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  /**
   * Update a driver's current location.
   * Hot path: Redis GEO (sub-millisecond) + Heartbeat key (30s TTL).
   * Cold path: Database update asynchronously for trip persistence.
   */
  async updateDriverLocation(driverId: string, latitude: number, longitude: number, vehicleType?: string): Promise<void> {
    // 1. Hot Path: Write to Redis GEO
    const client = this.redis?.getClient();
    if (client) {
      try {
        const pipeline = client.pipeline();
        pipeline.geoadd(this.GEO_KEY, longitude, latitude, driverId);
        pipeline.setex(
          `${this.DRIVER_META_KEY}${driverId}`,
          30,
          JSON.stringify({
            lat: latitude,
            lng: longitude,
            vehicleType: vehicleType || 'DEFAULT',
            updatedAt: Date.now(),
          }),
        );
        await pipeline.exec();
      } catch (err: any) {
        this.logger.warn(`Redis GEO write error for driver ${driverId}: ${err.message}`);
      }
    }

    // 2. Cold Path: Database persistence (asynchronous / non-blocking)
    this.db.driver
      .update({
        where: { id: driverId },
        data: {
          currentLat: latitude,
          currentLng: longitude,
          lastLocationAt: new Date(),
        },
      })
      .catch((err) => {
        this.logger.debug(`Background DB driver location update error: ${err.message}`);
      });

    this.logger.debug(`Updated location for driver ${driverId}: ${latitude}, ${longitude}`);
  }

  /**
   * Remove driver from available spatial search when offline or busy
   */
  async removeDriverFromAvailable(driverId: string): Promise<void> {
    const client = this.redis?.getClient();
    if (client) {
      try {
        await client.zrem(this.GEO_KEY, driverId);
        await client.del(`${this.DRIVER_META_KEY}${driverId}`);
      } catch (_) {}
    }
  }

  /**
   * Calculate distance between two coordinates in kilometers using the Haversine formula.
   */
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Find available, verified drivers near a coordinate within radiusKm,
   * sorted by proximity. Hot path uses Redis GEO with spherical Haversine DB fallback.
   */
  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusKm: number,
    vehicleType?: VehicleType,
  ): Promise<NearbyDriverResult[]> {
    this.logger.log(`Searching drivers near (${latitude}, ${longitude}) within ${radiusKm}km (vehicleType: ${vehicleType || 'ANY'})`);

    // 1. Hot Path: Redis GEOSEARCH (sub-5ms)
    const client = this.redis?.getClient();
    if (client) {
      try {
        const rawResults: [string, string][] = (await (client as any).geosearch(
          this.GEO_KEY,
          'FROMLONLAT',
          longitude,
          latitude,
          'BYRADIUS',
          radiusKm,
          'km',
          'ASC',
          'WITHDIST',
          'COUNT',
          25,
        )) as any;

        if (rawResults && rawResults.length > 0) {
          const results: NearbyDriverResult[] = [];
          for (const [driverId, distStr] of rawResults) {
            results.push({
              driverId,
              distanceKm: parseFloat(distStr),
            });
          }
          return results;
        }
      } catch (err: any) {
        this.logger.warn(`Redis GEOSEARCH failed (${err.message}). Using database fallback.`);
      }
    }

    // 2. Resilient Database Fallback
    const where: any = {
      availabilityStatus: DriverAvailability.AVAILABLE,
      verificationStatus: VerificationStatus.VERIFIED,
      currentLat: { not: null },
      currentLng: { not: null },
    };

    if (vehicleType) {
      where.OR = [
        { vehicleType: vehicleType as any },
        { vehicleType: null },
      ];
    }

    const drivers = await this.db.driver.findMany({ where });

    const results: NearbyDriverResult[] = [];
    for (const d of drivers) {
      if (d.currentLat && d.currentLng) {
        const dist = this.calculateDistanceKm(
          latitude,
          longitude,
          Number(d.currentLat),
          Number(d.currentLng),
        );
        if (dist <= radiusKm) {
          results.push({
            driverId: d.id,
            distanceKm: dist,
          });
        }
      }
    }

    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }
}
