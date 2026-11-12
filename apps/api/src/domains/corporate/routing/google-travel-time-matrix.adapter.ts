import { Logger } from '@nestjs/common';
import * as h3 from 'h3-js';
import {
  ITravelTimeMatrixPort,
  MatrixPoint,
  TravelTimeMatrix,
  TravelTimeSource,
  TravelTimeMatrixOptions,
  combineSources,
} from './travel-time-matrix.port';
import { HaversineTravelTimeMatrix } from './haversine-travel-time-matrix';

/** Subset of GoogleMapsService used by the adapter (kept narrow for testing). */
/** Google Routes API element limit for TRAFFIC_AWARE_OPTIMAL computeRouteMatrix requests. */
export const OPTIMAL_MAX_ELEMENTS_PER_REQUEST = 100;

export interface RouteMatrixClient {
  isRouteMatrixAvailable(): boolean;
  computeRouteMatrixElements(
    origins: MatrixPoint[],
    destinations: MatrixPoint[],
    departureTime?: Date,
    options?: TravelTimeMatrixOptions,
  ): Promise<
    { originIndex?: number; destinationIndex?: number; duration?: string; distanceMeters?: number; condition?: string }[]
  >;
}

/** Key/value cache with batch operations. */
export interface MatrixCache {
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(entries: [string, string][], ttlSeconds: number): Promise<void>;
}

/** Minimal shape of RedisService used by RedisMatrixCache. */
export interface RedisLike {
  getClient(): {
    mget(...keys: string[]): Promise<(string | null)[]>;
    pipeline(): { setex(k: string, ttl: number, v: string): unknown; exec(): Promise<unknown> };
  } | null;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
}

/**
 * Redis-backed cache. Uses MGET / pipelined SETEX when a live client is connected,
 * otherwise falls back to RedisService's own in-memory store via get/set.
 */
export class RedisMatrixCache implements MatrixCache {
  constructor(private readonly redis: RedisLike) {}

  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    const client = this.redis.getClient();
    if (client) {
      try {
        const out: (string | null)[] = [];
        for (let i = 0; i < keys.length; i += 500) {
          out.push(...(await client.mget(...keys.slice(i, i + 500))));
        }
        return out;
      } catch {
        // fall through to per-key path
      }
    }
    return Promise.all(keys.map((k) => this.redis.get(k)));
  }

  async mset(entries: [string, string][], ttlSeconds: number): Promise<void> {
    if (entries.length === 0) return;
    const client = this.redis.getClient();
    if (client) {
      try {
        const p = client.pipeline();
        for (const [k, v] of entries) p.setex(k, ttlSeconds, v);
        await p.exec();
        return;
      } catch {
        // fall through
      }
    }
    await Promise.all(entries.map(([k, v]) => this.redis.set(k, v, ttlSeconds)));
  }
}

export interface GoogleMatrixAdapterOptions {
  /** H3 resolution used to snap points for caching and request de-duplication. Default 8 (~460 m edge). */
  h3Resolution?: number;
  /** Departure-time bucket size in minutes. Default 30. */
  timeBucketMinutes?: number;
  /** Cache TTL. Default 7 days (traffic patterns repeat weekly). */
  cacheTtlSeconds?: number;
  /** Max origins per Google request. Default 25. */
  maxOriginsPerRequest?: number;
  /** Max destinations per Google request. Default 25. */
  maxDestinationsPerRequest?: number;
  /** Max elements (origins x destinations) per request. Google TRAFFIC_AWARE limit is 625. */
  maxElementsPerRequest?: number;
  /** Parallel Google requests. Default 4. */
  concurrency?: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

interface CellValue {
  durationSec: number;
  distanceMeters: number;
  source: TravelTimeSource;
}

/**
 * Google Routes API computeRouteMatrix adapter.
 *
 * Cost control for 500+ employee rosters:
 *  1. Every point is snapped to an H3 cell; only unique cell pairs are priced, and the
 *     cell centroid is what Google is asked about.
 *  2. Results are cached by (cellA, cellB, day-type, departure bucket) with a long TTL,
 *     so the same roster re-planned tomorrow costs nothing.
 *  3. Misses are requested in origin x destination rectangles that respect Google's
 *     element limit; rectangles with no misses are skipped.
 *  4. Same-cell pairs are never sent to Google (haversine on the real coordinates).
 * Any element Google cannot provide (no key, HTTP error, circuit open, no route) falls
 * back to the haversine estimate; fallback values are never cached.
 */
export class GoogleTravelTimeMatrixAdapter implements ITravelTimeMatrixPort {
  private readonly logger = new Logger(GoogleTravelTimeMatrixAdapter.name);
  private readonly res: number;
  private readonly bucketMin: number;
  private readonly ttl: number;
  private readonly maxO: number;
  private readonly maxD: number;
  private readonly maxEl: number;
  private readonly concurrency: number;
  private readonly now: () => number;

  /** Counters, exposed for observability and tests. */
  public readonly stats = { requests: 0, elementsRequested: 0, cacheHits: 0, cacheMisses: 0, fallbacks: 0 };

  constructor(
    private readonly client: RouteMatrixClient,
    private readonly cache: MatrixCache | null,
    private readonly fallback: HaversineTravelTimeMatrix = new HaversineTravelTimeMatrix(),
    options: GoogleMatrixAdapterOptions = {},
  ) {
    this.res = options.h3Resolution ?? 8;
    this.bucketMin = options.timeBucketMinutes ?? 30;
    this.ttl = options.cacheTtlSeconds ?? 7 * 24 * 3600;
    this.maxO = options.maxOriginsPerRequest ?? 25;
    this.maxD = options.maxDestinationsPerRequest ?? 25;
    this.maxEl = options.maxElementsPerRequest ?? 625;
    this.concurrency = Math.max(1, options.concurrency ?? 4);
    this.now = options.now ?? Date.now;
  }

  /** Time bucket: weekday/weekend + IST HH:MM floored to the bucket size (server-timezone independent). */
  timeBucket(departure: Date): string {
    const ist = new Date(departure.getTime() + 330 * 60_000);
    const day = ist.getUTCDay();
    const dayType = day === 0 || day === 6 ? 'we' : 'wd';
    const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    const b = Math.floor(mins / this.bucketMin) * this.bucketMin;
    return `${dayType}${String(Math.floor(b / 60)).padStart(2, '0')}${String(b % 60).padStart(2, '0')}`;
  }

  cacheKey(oCell: string, dCell: string, bucket: string, optionsKey = 'TRAFFIC_AWARE:t0:h0'): string {
    return `corp:ttm:v2:r${this.res}:${bucket}:${optionsKey}:${oCell}:${dCell}`;
  }

  /**
   * Google rejects past departure times for traffic-aware routing. Roll a past time
   * forward by whole weeks so the same weekday/time-of-day traffic profile is used.
   */
  effectiveDeparture(departure: Date): Date {
    const minMs = this.now() + 60_000;
    const t = new Date(departure.getTime());
    // Whole weeks in absolute time (IST has no DST, so the wall-clock time is preserved)
    while (t.getTime() <= minMs) t.setTime(t.getTime() + 7 * 24 * 3600_000);
    return t;
  }

  async getMatrix(
    origins: MatrixPoint[],
    destinations: MatrixPoint[],
    departureTime: Date,
    options: TravelTimeMatrixOptions = {},
  ): Promise<TravelTimeMatrix> {
    const routingOptions: Required<TravelTimeMatrixOptions> = {
      routingPreference: options.routingPreference ?? 'TRAFFIC_AWARE',
      avoidTolls: options.avoidTolls ?? false,
      avoidHighways: options.avoidHighways ?? false,
    };
    const bucket = this.timeBucket(departureTime);
    const optionsKey = `${routingOptions.routingPreference}:t${Number(routingOptions.avoidTolls)}:h${Number(routingOptions.avoidHighways)}`;
    const oCells = origins.map((p) => h3.latLngToCell(Number(p.latitude), Number(p.longitude), this.res));
    const dCells = destinations.map((p) => h3.latLngToCell(Number(p.latitude), Number(p.longitude), this.res));

    // Unique cell pairs (excluding same-cell pairs, which use haversine on real coords)
    const pairValues = new Map<string, CellValue>();
    const pairKeys: string[] = [];
    const seen = new Set<string>();
    for (const oc of oCells) {
      for (const dc of dCells) {
        if (oc === dc) continue;
        const k = `${oc}|${dc}`;
        if (!seen.has(k)) {
          seen.add(k);
          pairKeys.push(k);
        }
      }
    }

    // 1. Cache lookup
    if (this.cache && pairKeys.length > 0) {
      let cached: (string | null)[] = [];
      try {
        cached = await this.cache.mget(
          pairKeys.map((k) => {
            const [oc, dc] = k.split('|');
            return this.cacheKey(oc, dc, bucket, optionsKey);
          }),
        );
      } catch (err: any) {
        this.logger.warn(`Matrix cache read failed (${err.message}); continuing without cache`);
      }
      pairKeys.forEach((k, i) => {
        const raw = cached[i];
        if (!raw) return;
        const [s, m] = raw.split(',').map(Number);
        if (Number.isFinite(s) && Number.isFinite(m)) {
          pairValues.set(k, { durationSec: s, distanceMeters: m, source: 'CACHE' });
        }
      });
    }
    const misses = pairKeys.filter((k) => !pairValues.has(k));
    this.stats.cacheHits += pairKeys.length - misses.length;
    this.stats.cacheMisses += misses.length;

    // 2. Fetch misses from Google in chunked rectangles
    if (misses.length > 0 && this.client.isRouteMatrixAvailable()) {
      const fetched = await this.fetchFromGoogle(misses, this.effectiveDeparture(departureTime), routingOptions);
      const toCache: [string, string][] = [];
      for (const [k, v] of fetched) {
        pairValues.set(k, v);
        const [oc, dc] = k.split('|');
        toCache.push([this.cacheKey(oc, dc, bucket, optionsKey), `${v.durationSec},${v.distanceMeters}`]);
      }
      if (this.cache && toCache.length > 0) {
        try {
          await this.cache.mset(toCache, this.ttl);
        } catch (err: any) {
          this.logger.warn(`Matrix cache write failed (${err.message})`);
        }
      }
    }

    // 3. Assemble, with haversine for same-cell pairs and anything still missing
    const durationSec: number[][] = [];
    const distanceMeters: number[][] = [];
    const sources = new Set<TravelTimeSource>();
    for (let i = 0; i < origins.length; i++) {
      const dRow: number[] = [];
      const mRow: number[] = [];
      for (let j = 0; j < destinations.length; j++) {
        const v = oCells[i] === dCells[j] ? undefined : pairValues.get(`${oCells[i]}|${dCells[j]}`);
        if (v) {
          dRow.push(v.durationSec);
          mRow.push(v.distanceMeters);
          sources.add(v.source);
        } else {
          const e = this.fallback.estimate(origins[i], destinations[j]);
          dRow.push(e.durationSec);
          mRow.push(e.distanceMeters);
          // Same-cell pairs are near-zero legs; only count real misses as fallback
          if (oCells[i] !== dCells[j]) {
            sources.add('HAVERSINE');
            this.stats.fallbacks++;
          }
        }
      }
      durationSec.push(dRow);
      distanceMeters.push(mRow);
    }
    return { durationSec, distanceMeters, source: combineSources(sources) };
  }

  private async fetchFromGoogle(
    missKeys: string[],
    departure: Date,
    options: TravelTimeMatrixOptions,
  ): Promise<Map<string, CellValue>> {
    const out = new Map<string, CellValue>();
    const missSet = new Set(missKeys);
    const oUnique = [...new Set(missKeys.map((k) => k.split('|')[0]))].sort();
    const dUnique = [...new Set(missKeys.map((k) => k.split('|')[1]))].sort();

    // Google caps TRAFFIC_AWARE_OPTIMAL route matrices at 100 elements per request (625 otherwise);
    // larger chunks are rejected and would silently degrade every leg to haversine.
    const isOptimal = options.routingPreference === 'TRAFFIC_AWARE_OPTIMAL';
    const maxElements = isOptimal ? Math.min(this.maxEl, OPTIMAL_MAX_ELEMENTS_PER_REQUEST) : this.maxEl;
    const oChunk = Math.max(
      1,
      Math.min(this.maxO, maxElements, isOptimal ? Math.floor(Math.sqrt(maxElements)) : Number.POSITIVE_INFINITY),
    );
    const dChunk = Math.max(1, Math.min(this.maxD, Math.floor(maxElements / oChunk)));

    const tasks: { oc: string[]; dc: string[] }[] = [];
    for (let i = 0; i < oUnique.length; i += oChunk) {
      const oc = oUnique.slice(i, i + oChunk);
      for (let j = 0; j < dUnique.length; j += dChunk) {
        const dc = dUnique.slice(j, j + dChunk);
        const needed = oc.some((o) => dc.some((d) => missSet.has(`${o}|${d}`)));
        if (needed) tasks.push({ oc, dc });
      }
    }

    const centroid = (cell: string): MatrixPoint => {
      const [latitude, longitude] = h3.cellToLatLng(cell);
      return { latitude, longitude };
    };

    let cursor = 0;
    const worker = async () => {
      while (cursor < tasks.length) {
        const task = tasks[cursor++];
        if (!this.client.isRouteMatrixAvailable()) return;
        this.stats.requests++;
        this.stats.elementsRequested += task.oc.length * task.dc.length;
        try {
          const elements = await this.client.computeRouteMatrixElements(
            task.oc.map(centroid),
            task.dc.map(centroid),
            departure,
            options,
          );
          for (const el of elements) {
            if (el?.condition && el.condition !== 'ROUTE_EXISTS') continue;
            const o = task.oc[Number(el?.originIndex ?? -1)];
            const d = task.dc[Number(el?.destinationIndex ?? -1)];
            if (o === undefined || d === undefined || o === d) continue;
            const seconds = el.duration ? parseFloat(String(el.duration).replace('s', '')) : NaN;
            const meters = Number(el.distanceMeters ?? 0);
            if (!Number.isFinite(seconds)) continue;
            out.set(`${o}|${d}`, {
              durationSec: Math.round(seconds),
              distanceMeters: Number.isFinite(meters) ? Math.round(meters) : 0,
              source: 'GOOGLE',
            });
          }
        } catch (err: any) {
          this.logger.warn(
            `Google route matrix chunk ${task.oc.length}x${task.dc.length} failed (${err.message}); using haversine fallback`,
          );
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(this.concurrency, tasks.length) }, worker));
    return out;
  }
}
