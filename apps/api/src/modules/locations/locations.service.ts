import { Injectable, Logger } from '@nestjs/common';
import { VehicleType, VerificationStatus, DriverAvailability } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';

export interface NearbyDriverResult {
  driverId: string;
  distanceKm: number;
}

@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Update a driver's current location.
   */
  async updateDriverLocation(driverId: string, latitude: number, longitude: number): Promise<void> {
    await this.db.driver.update({
      where: { id: driverId },
      data: {
        currentLat: latitude,
        currentLng: longitude,
        lastLocationAt: new Date(),
      },
    });

    this.logger.debug(`Updated location for driver ${driverId}: ${latitude}, ${longitude}`);
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
   * sorted by proximity. Uses PostGIS when available with spherical Haversine fallback.
   */
  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusKm: number,
    vehicleType?: VehicleType,
  ): Promise<NearbyDriverResult[]> {
    this.logger.log(`Searching drivers near (${latitude}, ${longitude}) within ${radiusKm}km (vehicleType: ${vehicleType || 'ANY'})`);

    try {
      // Attempt PostGIS spatial query if raw query supported
      const rawResults: any[] = await this.db.$queryRawUnsafe(`
        SELECT id,
          (ST_DistanceSphere(
            ST_MakePoint(current_lng::float, current_lat::float),
            ST_MakePoint(${longitude}::float, ${latitude}::float)
          ) / 1000.0) AS distance_km
        FROM drivers
        WHERE availability_status = 'AVAILABLE'
          AND verification_status = 'VERIFIED'
          AND current_lat IS NOT NULL
          AND current_lng IS NOT NULL
          ${vehicleType ? `AND vehicle_type = '${vehicleType}'` : ''}
          AND ST_DWithin(
            ST_MakePoint(current_lng::float, current_lat::float)::geography,
            ST_MakePoint(${longitude}::float, ${latitude}::float)::geography,
            ${radiusKm * 1000}
          )
        ORDER BY distance_km ASC
      `);

      if (Array.isArray(rawResults)) {
        return rawResults.map((r) => ({
          driverId: r.id,
          distanceKm: Number(Number(r.distance_km).toFixed(2)),
        }));
      }
    } catch {
      // Fallback to in-memory Haversine filtering (e.g. for mock test environments or SQLite)
      this.logger.debug('PostGIS raw query fallback to programmatic Haversine calculation');
    }

    const where: any = {
      availabilityStatus: DriverAvailability.AVAILABLE,
      verificationStatus: VerificationStatus.VERIFIED,
      currentLat: { not: null },
      currentLng: { not: null },
    };

    if (vehicleType) {
      where.vehicleType = vehicleType as any;
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
