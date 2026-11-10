import { Injectable, Logger, Optional } from '@nestjs/common';
import { PickupRadiusConfig } from '../dispatch/pickup-radius';
import { VehicleType, VerificationStatus, DriverAvailability } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import { H3Service } from './h3.service';

export interface NearbyDriverResult {
  driverId: string;
  distanceKm: number;
  h3Cell?: string;
  /** Position the distance was computed from, and when it was reported (epoch ms). */
  lat?: number;
  lng?: number;
  locationAtMs?: number;
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
/** lat/lng box enclosing a circle (Prisma where fragment); padded 5% for spherical error. */
function boundingBox(lat: number, lng: number, radiusKm: number) {
  const dLat = (radiusKm * 1.05) / 111.32;
  const dLng = (radiusKm * 1.05) / (111.32 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  return {
    AND: [
      { currentLat: { gte: lat - dLat, lte: lat + dLat } },
      { currentLng: { gte: lng - dLng, lte: lng + dLng } },
    ],
  };
}

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
   * Live index metadata for a driver, or null when it expired (driver silent longer than the meta
   * TTL) or is older than the dispatch location age limit. Such drivers are not dispatchable.
   */
  private parseLiveMeta(
    raw: unknown,
    nowMs: number,
  ): { lat: number; lng: number; h3Cell?: string; vehicleType?: string; updatedAt?: number } | null {
    if (typeof raw !== 'string') return null;
    try {
      const meta = JSON.parse(raw);
      if (!Number.isFinite(Number(meta?.lat)) || !Number.isFinite(Number(meta?.lng))) return null;
      const updatedAt = Number(meta.updatedAt);
      if (Number.isFinite(updatedAt) && nowMs - updatedAt > PickupRadiusConfig.maxLocationAgeSec * 1000) return null;
      return {
        lat: Number(meta.lat),
        lng: Number(meta.lng),
        h3Cell: meta.h3Cell,
        vehicleType: meta.vehicleType,
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : undefined,
      };
    } catch {
      return null;
    }
  }

  private vehicleMatches(metaVehicle: string | undefined, wanted?: VehicleType): boolean {
    return !wanted || !metaVehicle || metaVehicle === 'DEFAULT' || metaVehicle === wanted;
  }

  /**
   * H3 cell search (resolution 8) over the k-disk around the pickup.
   *
   * Cell-set membership is only a hint: a member counts when its live metadata exists, is fresh,
   * places it in a cell of this disk and within `maxRadiusKm`. Members whose metadata expired or who
   * moved to another cell are stale (their old cell set was never cleaned) and are removed lazily
   * (docs/23 RC4). With no cell hits it falls back to a GEO/DB search with the SAME radius.
   */
  async findNearbyDriversByH3(
    latitude: number,
    longitude: number,
    kRing: number = 2,
    vehicleType?: VehicleType,
    maxRadiusKm: number = PickupRadiusConfig.maxPickupRadiusKm,
  ): Promise<NearbyDriverResult[]> {
    const originCell = this.h3.latLngToCell(latitude, longitude, H3Service.DEFAULT_RESOLUTION);
    const diskCells = this.h3.gridDisk(originCell, kRing);
    const diskSet = new Set(diskCells);
    const nowMs = Date.now();

    this.logger.debug(
      `H3 search near (${latitude}, ${longitude}) in cell ${originCell}: ${diskCells.length} cells (k=${kRing}), radius ${maxRadiusKm} km`,
    );

    const client = this.redis?.getClient();
    if (client) {
      try {
        const pipeline = client.pipeline();
        for (const cell of diskCells) pipeline.smembers(`${this.H3_CELL_PREFIX}${cell}`);
        const cellMembersResults = await pipeline.exec();

        const foundIn = new Map<string, string>(); // driverId -> cell set it was found in
        cellMembersResults?.forEach(([err, members], i) => {
          if (err || !Array.isArray(members)) return;
          for (const id of members) if (typeof id === 'string' && !foundIn.has(id)) foundIn.set(id, diskCells[i]);
        });

        if (foundIn.size > 0) {
          const driverIdList = [...foundIn.keys()];
          const metaPipeline = client.pipeline();
          for (const dId of driverIdList) metaPipeline.get(`${this.DRIVER_META_KEY}${dId}`);
          const metaResults = await metaPipeline.exec();

          const results: NearbyDriverResult[] = [];
          const cleanup = client.pipeline();
          let stale = 0;
          driverIdList.forEach((driverId, i) => {
            const [mErr, mData] = metaResults?.[i] ?? [null, null];
            const meta = mErr ? null : this.parseLiveMeta(mData, nowMs);
            const cellOfMember = foundIn.get(driverId)!;
            if (!meta || (meta.h3Cell && meta.h3Cell !== cellOfMember)) {
              cleanup.srem(`${this.H3_CELL_PREFIX}${cellOfMember}`, driverId);
              stale++;
              if (!meta) return;
            }
            if (meta.h3Cell && !diskSet.has(meta.h3Cell)) return;
            if (!this.vehicleMatches(meta.vehicleType, vehicleType)) return;
            const dist = this.calculateDistanceKm(latitude, longitude, meta.lat, meta.lng);
            if (dist > maxRadiusKm) return;
            results.push({ driverId, distanceKm: dist, h3Cell: meta.h3Cell ?? cellOfMember, lat: meta.lat, lng: meta.lng, locationAtMs: meta.updatedAt });
          });
          if (stale > 0) {
            await cleanup.exec().catch(() => undefined);
            this.logger.debug(`Removed ${stale} stale H3 cell membership(s) near ${originCell}`);
          }
          if (results.length > 0) return results.sort((a, b) => a.distanceKm - b.distanceKm);
        }
      } catch (err: any) {
        this.logger.warn(`H3 cellular driver lookup failed (${err.message}). Falling back to radial search.`);
      }
    }

    return this.findNearbyDrivers(latitude, longitude, maxRadiusKm, vehicleType);
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
    this.logger.debug(`Searching drivers near (${latitude}, ${longitude}) within ${radiusKm}km (vehicleType: ${vehicleType || 'ANY'})`);

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
          // GEO members never expire: a hit counts only with live, fresh metadata (the driver is still
          // reporting). Members without it are stale and are removed lazily (docs/23 RC4).
          const nowMs = Date.now();
          const metaPipeline = client.pipeline();
          for (const [dId] of rawResults) metaPipeline.get(`${this.DRIVER_META_KEY}${dId}`);
          const metaResults = await metaPipeline.exec();
          const results: NearbyDriverResult[] = [];
          const staleIds: string[] = [];
          rawResults.forEach(([driverId], i) => {
            const [mErr, mData] = metaResults?.[i] ?? [null, null];
            const meta = mErr ? null : this.parseLiveMeta(mData, nowMs);
            if (!meta) {
              staleIds.push(driverId);
              return;
            }
            if (!this.vehicleMatches(meta.vehicleType, vehicleType)) return;
            const dist = this.calculateDistanceKm(latitude, longitude, meta.lat, meta.lng);
            if (dist > radiusKm) return;
            results.push({
              driverId,
              distanceKm: dist,
              h3Cell: meta.h3Cell ?? this.h3.latLngToCell(meta.lat, meta.lng, H3Service.DEFAULT_RESOLUTION),
              lat: meta.lat,
              lng: meta.lng,
              locationAtMs: meta.updatedAt,
            });
          });
          if (staleIds.length) {
            const cleanup = client.pipeline();
            for (const id of staleIds) cleanup.zrem(this.GEO_KEY, id);
            await cleanup.exec().catch(() => undefined);
          }
          results.sort((a, b) => a.distanceKm - b.distanceKm);
          // Enough live supply indexed in Redis: skip the DB scan.
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
      // Only drivers whose position is recent enough to trust (docs/23 RC6).
      lastLocationAt: { gte: new Date(Date.now() - PickupRadiusConfig.maxLocationAgeSec * 1000) },
      // Bounding box around the search circle: Postgres returns only nearby rows instead of every
      // available driver (exact distance is still checked below).
      ...boundingBox(latitude, longitude, radiusKm),
    };

    if (vehicleType) {
      where.OR = [
        { vehicleType: vehicleType as any },
        { vehicleType: null },
        { vehicles: { some: { vehicleType: vehicleType as any } } },
      ];
    }

    const drivers = await this.db.driver.findMany({ where });

    // The DB row can lag the Redis index (Postgres writes are throttled): use whichever position is
    // newer, so a driver who has since moved away is measured where they are now (docs/23 RC4).
    const liveMeta = new Map<string, { lat: number; lng: number; updatedAt?: number }>();
    if (client && drivers.length) {
      try {
        const metaPipeline = client.pipeline();
        for (const d of drivers) metaPipeline.get(`${this.DRIVER_META_KEY}${d.id}`);
        const metaResults = await metaPipeline.exec();
        const nowMs = Date.now();
        drivers.forEach((d, i) => {
          const [mErr, mData] = metaResults?.[i] ?? [null, null];
          const meta = mErr ? null : this.parseLiveMeta(mData, nowMs);
          if (meta) liveMeta.set(d.id, meta);
        });
      } catch {
        // DB positions only
      }
    }

    const results: NearbyDriverResult[] = [];
    for (const d of drivers) {
      if (d.currentLat === null || d.currentLng === null) continue;
      let lat = Number(d.currentLat);
      let lng = Number(d.currentLng);
      let locationAtMs = d.lastLocationAt ? new Date(d.lastLocationAt).getTime() : undefined;
      const meta = liveMeta.get(d.id);
      if (meta?.updatedAt && (!locationAtMs || meta.updatedAt > locationAtMs)) {
        lat = meta.lat;
        lng = meta.lng;
        locationAtMs = meta.updatedAt;
      }
      const dist = this.calculateDistanceKm(latitude, longitude, lat, lng);
      if (dist <= radiusKm) {
        results.push({
          driverId: d.id,
          distanceKm: dist,
          h3Cell: this.h3.latLngToCell(lat, lng, H3Service.DEFAULT_RESOLUTION),
          lat,
          lng,
          locationAtMs,
        });
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
