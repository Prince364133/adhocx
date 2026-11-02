import { Injectable, Logger, Optional } from '@nestjs/common';
import { createHash } from 'crypto';
import { GoogleMapsService } from '../../../../modules/locations/google-maps.service';
import { RedisService } from '../../../../redis/redis.service';
import {
  ITrafficEstimatorPort,
  TrafficEstimateHints,
  TrafficRouteEstimate,
  TrafficWaypoint,
} from './traffic-estimator.port';
import { estimateRoadDistanceMeters, heuristicTrafficDelay } from './heuristic-traffic';

const URBAN_SPEED_KMH = 25;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined && raw !== '' ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Google Routes API adapter for {@link ITrafficEstimatorPort}.
 *
 * - Traffic-aware (TRAFFIC_AWARE_OPTIMAL, BEST_GUESS) multi-stop routing for the departure time.
 * - Redis cache keyed by (rounded waypoints, departure bucket). With the default 15-minute bucket a
 *   route polled every 30 s costs at most one Google call per bucket, and identical routes share it.
 * - In-process de-duplication of concurrent identical requests (cache stampede guard).
 * - Hard request timeout; any failure / missing key degrades to the legacy peak-hour heuristic
 *   (source = 'HEURISTIC', logged). Failures are negative-cached briefly so an outage does not
 *   turn every scheduler tick into a fresh timed-out call.
 */
@Injectable()
export class GoogleTrafficEstimatorAdapter implements ITrafficEstimatorPort {
  private readonly logger = new Logger(GoogleTrafficEstimatorAdapter.name);
  private readonly inFlight = new Map<string, Promise<TrafficRouteEstimate>>();

  readonly bucketMinutes = envNumber('CORPORATE_DDA_CACHE_BUCKET_MINUTES', 15);
  readonly timeoutMs = envNumber('CORPORATE_DDA_GOOGLE_TIMEOUT_MS', 3000);
  readonly failureCacheSeconds = envNumber('CORPORATE_DDA_FAILURE_CACHE_SECONDS', 120);

  constructor(
    private readonly googleMaps: GoogleMapsService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async estimateRouteDuration(
    waypoints: TrafficWaypoint[],
    departureTime: Date,
    hints: TrafficEstimateHints = {},
  ): Promise<TrafficRouteEstimate> {
    if (waypoints.length < 2) {
      return this.heuristic(waypoints, departureTime, hints, 'fewer than 2 waypoints');
    }
    if (!this.googleMaps.hasApiKey()) {
      return this.heuristic(waypoints, departureTime, hints, 'GOOGLE_MAPS_API_KEY not configured');
    }

    const key = this.cacheKey(waypoints, departureTime);
    const cached = await this.readCache(key);
    if (cached) return { ...cached, cached: true };

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const task = this.fetchAndCache(key, waypoints, departureTime, hints).finally(() =>
      this.inFlight.delete(key),
    );
    this.inFlight.set(key, task);
    return task;
  }

  /** Exposed for tests/observability: `corporate:dda:traffic:v1:<sha1(waypoints)>:<bucket>`. */
  cacheKey(waypoints: TrafficWaypoint[], departureTime: Date): string {
    const path = waypoints
      .map((w) => `${Number(w.latitude).toFixed(4)},${Number(w.longitude).toFixed(4)}`)
      .join('|');
    const hash = createHash('sha1').update(path).digest('hex').slice(0, 20);
    const bucket = Math.floor(departureTime.getTime() / (this.bucketMinutes * 60_000));
    return `corporate:dda:traffic:v1:${hash}:${bucket}`;
  }

  private async fetchAndCache(
    key: string,
    waypoints: TrafficWaypoint[],
    departureTime: Date,
    hints: TrafficEstimateHints,
  ): Promise<TrafficRouteEstimate> {
    try {
      const r = await this.googleMaps.computeTrafficAwareRoute(waypoints, departureTime, this.timeoutMs);
      const estimate: TrafficRouteEstimate = {
        durationInTrafficSec: r.durationSeconds,
        staticDurationSec: r.staticDurationSeconds,
        distanceMeters: r.distanceMeters,
        source: 'GOOGLE',
      };
      await this.writeCache(key, estimate, this.bucketMinutes * 60);
      return estimate;
    } catch (err: any) {
      const estimate = this.heuristic(
        waypoints,
        departureTime,
        hints,
        `Google Routes call failed: ${err?.message ?? err}`,
      );
      await this.writeCache(key, estimate, this.failureCacheSeconds);
      return estimate;
    }
  }

  private heuristic(
    waypoints: TrafficWaypoint[],
    departureTime: Date,
    hints: TrafficEstimateHints,
    why: string,
  ): TrafficRouteEstimate {
    const distanceMeters = hints.distanceMetersHint ?? estimateRoadDistanceMeters(waypoints);
    const staticDurationSec =
      hints.staticDurationSecHint ?? Math.round((distanceMeters / (URBAN_SPEED_KMH * 1000)) * 3600);
    const { delayMinutes } = heuristicTrafficDelay(distanceMeters, departureTime);
    this.logger.warn(`[DDA] Using HEURISTIC traffic estimate (${why}); +${delayMinutes}m`);
    return {
      durationInTrafficSec: staticDurationSec + delayMinutes * 60,
      staticDurationSec,
      distanceMeters,
      source: 'HEURISTIC',
    };
  }

  private async readCache(key: string): Promise<TrafficRouteEstimate | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(key);
      return raw ? (JSON.parse(raw) as TrafficRouteEstimate) : null;
    } catch {
      return null;
    }
  }

  private async writeCache(key: string, value: TrafficRouteEstimate, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(key, JSON.stringify(value), Math.max(1, Math.round(ttlSeconds)));
    } catch (err: any) {
      this.logger.debug(`[DDA] Traffic cache write failed: ${err?.message ?? err}`);
    }
  }
}
