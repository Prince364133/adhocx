import { Injectable, Logger, Optional } from '@nestjs/common';
import { VehicleType, VerificationStatus, DriverAvailability } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import { H3Service } from './h3.service';

export interface NearbyDriverResult {
  driverId: string;
  distanceKm: number;
  h3Cell?: string;
}

/**
 * Production-Grade Hybrid Spatial Location Service.
 *
 * Combines:
 * 1. Uber H3 DGGS (Discrete Global Grid System):
 *    - Spatial partitioning & hexagonal cellular indexing at Resolution 8 (~461m edge)
 *    - Multi-ring progressive wave dispatch (k-ring 1 -> k-ring 2 -> k-ring 3)
 *    - Zero-overlap cellular driver sets in Redis: `drivers:h3:res8:{cellIndex}`
 * 2. Redis GEO (52-bit Geohash):
 *    - Sub-millisecond continuous radial distance queries via GEOSEARCH
 * 3. PostgreSQL Spherical Haversine:
 *    - Resilient database fallback if Redis cache is unavailable
 */
@Injectable()
export class LocationsService {
  private readonly logger = new Logger(LocationsService.name);
  private readonly GEO_KEY = 'drivers:geo:available';
  private readonly DRIVER_META_KEY = 'drivers:meta:';
  private readonly MIN_REDIS_CANDIDATES = 3;
  /** Driver metadata TTL. The driver app reports location on availability changes and trip pings, not on a 30s heartbeat. */
  private readonly metaTtlSeconds = Number(process.env.DRIVER_GEO_META_TTL_SECONDS) > 0 ? Number(process.env.DRIVER_GEO_META_TTL_SECONDS) : 900;
  private readonly H3_CELL_PREFIX = 'drivers:h3:res8:';

  constructor(
    private readonly db: DatabaseService,
    private readonly h3: H3Service,
    @Optional() private readonly redis?: RedisService,
  ) {}

  /**
   * Convert latitude and longitude to Uber H3 hex index string at specified resolution (default 8).
   */
  latLngToH3(latitude: number, longitude: number, resolution = H3Service.DEFAULT_RESOLUTION): string {
    return this.h3.latLngToCell(latitude, longitude, resolution);
  }

  /**
   * Get centroid coordinates for an H3 cell.
   */
  h3ToLatLng(cellIndex: string): { latitude: number; longitude: number } {
    return this.h3.cellToLatLng(cellIndex);
  }

  /**
   * Get all hexagonal cells within k steps from the origin cell (solid disk).
   */
  getH3Disk(originCell: string, kRing: number): string[] {
    return this.h3.gridDisk(originCell, kRing);
  }

  /**
   * Get hollow ring of cells at distance k from origin cell (for non-overlapping wave escalation).
   */
  getH3Ring(originCell: string, kRing: number): string[] {
    return this.h3.gridRing(originCell, kRing);
  }

  /**
   * Update a driver's current location.
   * Hot path:
   *  1. Redis GEO (continuous coordinates)
   *  2. Redis H3 Cellular Set (discrete Res 8 hexagon membership)
   *  3. Metadata key (DRIVER_GEO_META_TTL_SECONDS, default 15 min)
   * Cold path:
   *  Database update asynchronously for trip persistence.
   */
  async updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
    vehicleType?: string,
  ): Promise<void> {
    await this.indexDriverLocation(driverId, latitude, longitude, vehicleType);

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
  }

  /**
   * Redis-only hot-path write (GEO + H3 cell membership + metadata). For callers that already
   * persist the location to the database themselves.
   */
  async indexDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number,
    vehicleType?: string,
  ): Promise<void> {
    // Compute current H3 Cell at Resolution 8
    const currentH3Cell = this.h3.latLngToCell(latitude, longitude, H3Service.DEFAULT_RESOLUTION);

    // 1. Hot Path: Write to Redis GEO + H3 cellular index
    const client = this.redis?.getClient();
    if (client) {
      try {
        // Read previous metadata to remove from previous H3 cell if driver transitioned
        const prevMetaStr = await client.get(`${this.DRIVER_META_KEY}${driverId}`);
        let prevH3Cell: string | null = null;
        if (prevMetaStr) {
          try {
            const prevMeta = JSON.parse(prevMetaStr);
            prevH3Cell = prevMeta.h3Cell || null;
          } catch (_) {}
        }

        const pipeline = client.pipeline();

        // 1a. Redis GEO write
        pipeline.geoadd(this.GEO_KEY, longitude, latitude, driverId);

        // 1b. H3 Cell membership update
        if (prevH3Cell && prevH3Cell !== currentH3Cell) {
          pipeline.srem(`${this.H3_CELL_PREFIX}${prevH3Cell}`, driverId);
        }
        pipeline.sadd(`${this.H3_CELL_PREFIX}${currentH3Cell}`, driverId);
        pipeline.expire(`${this.H3_CELL_PREFIX}${currentH3Cell}`, this.metaTtlSeconds);

        // 1c. Driver metadata & heartbeat
        pipeline.setex(
          `${this.DRIVER_META_KEY}${driverId}`,
          this.metaTtlSeconds,
          JSON.stringify({
            lat: latitude,
            lng: longitude,
            h3Cell: currentH3Cell,
            vehicleType: vehicleType || 'DEFAULT',
            updatedAt: Date.now(),
          }),
        );

        await pipeline.exec();
      } catch (err: any) {
        this.logger.warn(`Redis GEO/H3 write error for driver ${driverId}: ${err.message}`);
      }
    }

    this.logger.debug(`Updated location for driver ${driverId}: (${latitude}, ${longitude}) -> H3: ${currentH3Cell}`);
  }

  /**
   * Remove driver from available spatial search when offline or busy.
   */
  async removeDriverFromAvailable(driverId: string): Promise<void> {
    const client = this.redis?.getClient();
    if (client) {
      try {
        const metaStr = await client.get(`${this.DRIVER_META_KEY}${driverId}`);
        let h3Cell: string | null = null;
        if (metaStr) {
          try {
            const meta = JSON.parse(metaStr);
            h3Cell = meta.h3Cell || null;
          } catch (_) {}
        }

        const pipeline = client.pipeline();
        pipeline.zrem(this.GEO_KEY, driverId);
        if (h3Cell) {
          pipeline.srem(`${this.H3_CELL_PREFIX}${h3Cell}`, driverId);
        }
        pipeline.del(`${this.DRIVER_META_KEY}${driverId}`);
        await pipeline.exec();
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
   * Uber H3 Hexagonal Wave Search.
   *
   * Dispatches across concentric hexagonal rings centered on (latitude, longitude):
   * - kRing=0: 1 hexagon (~460m radius)
   * - kRing=1: 7 hexagons (~1.2 km radius)
   * - kRing=2: 19 hexagons (~2.4 km radius)
   * - kRing=3: 37 hexagons (~3.6 km radius)
   *
   * Gathers drivers from Redis cellular sets and calculates precise distance.
   * If cellular search yields candidates, returns them sorted by proximity.
   * If no candidates in immediate H3 cells, falls back automatically to Redis GEOSEARCH.
   */
  async findNearbyDriversByH3(
    latitude: number,
    longitude: number,
    kRing: number = 2,
    vehicleType?: VehicleType,
  ): Promise<NearbyDriverResult[]> {
    const originCell = this.h3.latLngToCell(latitude, longitude, H3Service.DEFAULT_RESOLUTION);
    const diskCells = this.h3.gridDisk(originCell, kRing);

    this.logger.log(
      `H3 Wave Search near (${latitude}, ${longitude}) in cell ${originCell} across ${diskCells.length} cells (kRing=${kRing})`,
    );

    const client = this.redis?.getClient();
    if (client) {
      try {
        // Pipeline SMEMBERS for all disk cells
        const pipeline = client.pipeline();
        for (const cell of diskCells) {
          pipeline.smembers(`${this.H3_CELL_PREFIX}${cell}`);
        }
        const cellMembersResults = await pipeline.exec();

        const candidateDriverIds = new Set<string>();
        if (cellMembersResults) {
          for (const [err, members] of cellMembersResults) {
            if (!err && Array.isArray(members)) {
              for (const id of members) {
                if (typeof id === 'string') {
                  candidateDriverIds.add(id);
                }
              }
            }
          }
        }

        if (candidateDriverIds.size > 0) {
          // Batch fetch metadata for discovered drivers
          const metaPipeline = client.pipeline();
          const driverIdList = Array.from(candidateDriverIds);
          for (const dId of driverIdList) {
            metaPipeline.get(`${this.DRIVER_META_KEY}${dId}`);
          }
          const metaResults = await metaPipeline.exec();

          const results: NearbyDriverResult[] = [];
          if (metaResults) {
            for (let i = 0; i < driverIdList.length; i++) {
              const [mErr, mData] = metaResults[i];
              if (!mErr && typeof mData === 'string') {
                try {
                  const meta = JSON.parse(mData);
                  if (vehicleType && meta.vehicleType && meta.vehicleType !== 'DEFAULT' && meta.vehicleType !== vehicleType) {
                    continue; // Skip mismatched vehicle types
                  }
                  const dist = this.calculateDistanceKm(latitude, longitude, meta.lat, meta.lng);
                  results.push({
                    driverId: driverIdList[i],
                    distanceKm: dist,
                    h3Cell: meta.h3Cell,
                  });
                } catch (_) {}
              }
            }
          }

          if (results.length > 0) {
            return results.sort((a, b) => a.distanceKm - b.distanceKm);
          }
        }
      } catch (err: any) {
        this.logger.warn(`H3 cellular driver lookup failed (${err.message}). Falling back to radial GEOSEARCH.`);
      }
    }

    // Fallback: Use standard Redis GEOSEARCH with estimated radius based on kRing
    const estimatedRadiusKm = Math.max(5, (kRing + 1) * 1.5);
    return this.findNearbyDrivers(latitude, longitude, estimatedRadiusKm, vehicleType);
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
    let redisResults: NearbyDriverResult[] = [];
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
              h3Cell: this.h3.latLngToCell(latitude, longitude, H3Service.DEFAULT_RESOLUTION),
            });
          }
          // Enough live supply indexed in Redis: skip the DB scan. Dispatch re-validates availability in DB.
          if (results.length >= this.MIN_REDIS_CANDIDATES) return results;
          redisResults = results;
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
            h3Cell: this.h3.latLngToCell(Number(d.currentLat), Number(d.currentLng), H3Service.DEFAULT_RESOLUTION),
          });
        }
      }
    }

    // Merge sparse Redis hits with DB results (drivers online before the index was warm are still found).
    const seen = new Set(results.map((r) => r.driverId));
    for (const r of redisResults) {
      if (!seen.has(r.driverId)) results.push(r);
    }
    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }
}
