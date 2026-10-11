import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RoadRouteResult {
  distanceKm: number;
  distanceMeters: number;
  durationMinutes: number;
  durationSeconds: number;
  routeDescription?: string;
  encodedPolyline?: string;
  isRealRoad: boolean;
}

export interface DriverEtaResult {
  etaMinutes: number;
  distanceKm: number;
  isRealRoad: boolean;
}

@Injectable()
export class GoogleMapsService {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly apiKey: string;
  private readonly routeCache = new Map<string, { result: RoadRouteResult; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour in-memory cache

  // Driver->pickup ETA matrix: short cache (traffic changes) + circuit breaker for quota/outages
  private readonly etaCache = new Map<string, { result: DriverEtaResult; expiresAt: number }>();
  private readonly ETA_CACHE_TTL_MS = 2 * 60 * 1000;
  private readonly MATRIX_TIMEOUT_MS = 1500;
  private matrixFailures: number[] = [];
  private circuitOpenUntil = 0;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  }

  /**
   * Batched traffic-aware driver->pickup ETA for many drivers in ONE Routes API call.
   * Never throws: every origin without a valid route gets the road-factor estimate.
   * Result array is index-aligned with `origins`.
   */
  async computeDriverEtaMatrix(origins: LatLng[], destination: LatLng): Promise<DriverEtaResult[]> {
    const results: (DriverEtaResult | null)[] = origins.map(() => null);
    const keyOf = (o: LatLng) =>
      `${Number(o.latitude).toFixed(3)},${Number(o.longitude).toFixed(3)}->${Number(destination.latitude).toFixed(3)},${Number(destination.longitude).toFixed(3)}`;

    const now = Date.now();
    const pending: number[] = [];
    origins.forEach((o, i) => {
      const cached = this.etaCache.get(keyOf(o));
      if (cached && cached.expiresAt > now) results[i] = cached.result;
      else pending.push(i);
    });

    if (pending.length > 0 && this.apiKey && now >= this.circuitOpenUntil) {
      try {
        const payload = JSON.stringify({
          origins: pending.map((i) => ({
            waypoint: { location: { latLng: { latitude: Number(origins[i].latitude), longitude: Number(origins[i].longitude) } } },
          })),
          destinations: [
            { waypoint: { location: { latLng: { latitude: Number(destination.latitude), longitude: Number(destination.longitude) } } } },
          ],
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
        });
        const elements = await this.postJson(
          'routes.googleapis.com',
          '/distanceMatrix/v2:computeRouteMatrix',
          payload,
          {
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition',
          },
          this.MATRIX_TIMEOUT_MS,
        );
        for (const el of Array.isArray(elements) ? elements : []) {
          if (el?.condition && el.condition !== 'ROUTE_EXISTS') continue;
          const idx = pending[Number(el?.originIndex ?? -1)];
          if (idx === undefined) continue;
          const seconds = el.duration ? parseFloat(String(el.duration).replace('s', '')) : NaN;
          const meters = Number(el.distanceMeters);
          if (!Number.isFinite(seconds) || !Number.isFinite(meters)) continue;
          const result: DriverEtaResult = {
            etaMinutes: Math.max(1, Math.round(seconds / 60)),
            distanceKm: Number((meters / 1000).toFixed(2)),
            isRealRoad: true,
          };
          results[idx] = result;
          this.etaCache.set(keyOf(origins[idx]), { result, expiresAt: now + this.ETA_CACHE_TTL_MS });
        }
        this.matrixFailures = [];
      } catch (err: any) {
        this.recordMatrixFailure(err);
      }
    }

    return results.map((r, i) => {
      if (r) return r;
      const fb = this.calculateFallbackRoadRoute(
        Number(origins[i].latitude),
        Number(origins[i].longitude),
        Number(destination.latitude),
        Number(destination.longitude),
      );
      return { etaMinutes: fb.durationMinutes, distanceKm: fb.distanceKm, isRealRoad: false };
    });
  }

  isCircuitOpen(): boolean {
    return Date.now() < this.circuitOpenUntil;
  }

  private recordMatrixFailure(err: Error): void {
    const now = Date.now();
    this.matrixFailures = this.matrixFailures.filter((t) => now - t < 60_000);
    this.matrixFailures.push(now);
    if (this.matrixFailures.length >= 5) {
      this.circuitOpenUntil = now + 120_000;
      this.matrixFailures = [];
      this.logger.warn(`[GoogleMapsService] Route matrix circuit OPEN for 120s after repeated failures (${err.message})`);
    } else {
      this.logger.warn(`[GoogleMapsService] Route matrix failed (${err.message}); using road-factor estimate`);
    }
  }

  /**
   * Computes the real road driving distance and traffic-aware ETA between two coordinates
   * using Google Routes API (New).
   *
   * Automatically falls back to high-fidelity road-factor calculation if API network call fails.
   */
  async computeRoadRoute(origin: LatLng, destination: LatLng): Promise<RoadRouteResult> {
    const originLat = Number(origin.latitude);
    const originLng = Number(origin.longitude);
    const destLat = Number(destination.latitude);
    const destLng = Number(destination.longitude);

    // Cache key rounded to ~100m (3 decimal places) for lightning-fast repeated queries
    const cacheKey = `${originLat.toFixed(3)},${originLng.toFixed(3)}->${destLat.toFixed(3)},${destLng.toFixed(3)}`;
    const cached = this.routeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    if (!this.apiKey) {
      return this.calculateFallbackRoadRoute(originLat, originLng, destLat, destLng);
    }

    try {
      const payload = JSON.stringify({
        origin:{ location: { latLng: { latitude: originLat, longitude: originLng } } },
        destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      });

      const responseData = await this.postJson(
        'routes.googleapis.com',
        '/directions/v2:computeRoutes',
        payload,
        {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.description,routes.polyline.encodedPolyline',
        },
      );

      if (responseData?.routes && responseData.routes.length > 0) {
        const topRoute = responseData.routes[0];
        const distanceMeters = Number(topRoute.distanceMeters || 0);
        const distanceKm = Number((distanceMeters / 1000).toFixed(2));
        const rawDurationSec = topRoute.duration ? parseFloat(topRoute.duration.replace('s', '')) : 0;
        const durationSeconds = Math.round(rawDurationSec);
        const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

        const result: RoadRouteResult = {
          distanceKm,
          distanceMeters,
          durationMinutes,
          durationSeconds,
          routeDescription: topRoute.description,
          encodedPolyline: topRoute.polyline?.encodedPolyline,
          isRealRoad: true,
        };

        this.routeCache.set(cacheKey, { result, expiresAt: Date.now() + this.CACHE_TTL_MS });
        this.logger.debug(
          `[GoogleMapsService] Route computed: ${distanceKm} km, ${durationMinutes} mins (via ${topRoute.description || 'Road'})`,
        );
        return result;
      }
    } catch (err: any) {
      this.logger.warn(`[GoogleMapsService] Google Routes API call failed (${err.message}). Using road-factor fallback.`);
    }

    // High-fidelity fallback: Haversine * 1.25 urban winding factor with ~30 km/h city speed
    return this.calculateFallbackRoadRoute(originLat, originLng, destLat, destLng);
  }

  /**
   * Computes driver ETA and road distance to pickup location.
   */
  async computeDriverEta(driverLoc: LatLng, pickupLoc: LatLng): Promise<DriverEtaResult> {
    const route = await this.computeRoadRoute(driverLoc, pickupLoc);
    return {
      etaMinutes: route.durationMinutes,
      distanceKm: route.distanceKm,
      isRealRoad: route.isRealRoad,
    };
  }

  /**
   * High-accuracy fallback when offline or API limit reached.
   * Incorporates urban road winding factor (1.25x) and average traffic speed.
   */
  calculateFallbackRoadRoute(lat1: number, lon1: number, lat2: number, lon2: number): RoadRouteResult {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDist = R * c;

    // Apply 1.25x road tortuosity factor to approximate actual road network
    const roadKm = Math.max(1, Number((straightDist * 1.25).toFixed(2)));
    const distanceMeters = Math.round(roadKm * 1000);

    // Assume average city traffic speed of ~25 km/h
    const durationMinutes = Math.max(2, Math.round((roadKm / 25) * 60));
    const durationSeconds = durationMinutes * 60;

    return {
      distanceKm: roadKm,
      distanceMeters,
      durationMinutes,
      durationSeconds,
      routeDescription: 'Estimated via Road Factor',
      isRealRoad: false,
    };
  }

  private postJson(
    hostname: string,
    path: string,
    payload: string,
    headers: Record<string, string>,
    totalTimeoutMs: number = 5000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Hard wall-clock deadline (socket `timeout` alone only covers idle time)
      const deadline = setTimeout(() => {
        req.destroy(new Error(`Request exceeded ${totalTimeoutMs}ms`));
      }, totalTimeoutMs);
      deadline.unref();
      const done = <T>(fn: (v: T) => void) => (v: T) => {
        clearTimeout(deadline);
        fn(v);
      };
      resolve = done(resolve);
      reject = done(reject);

      const req = https.request(
        {
          hostname,
          path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            ...headers,
          },
          timeout: 5000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(JSON.parse(data));
              } else {
                reject(new Error(`HTTP ${res.statusCode}: ${data}`));
              }
            } catch (e) {
              reject(e);
            }
          });
        },
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }
}
