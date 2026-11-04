import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

export interface RouteCoord {
  lat: number;
  lng: number;
}

export interface RouteLeg {
  durationSeconds: number;
  distanceMeters: number;
  encodedPolyline?: string;
}

export interface ComputedRouteResult {
  durationSeconds: number;
  distanceMeters: number;
  distanceKm: number;
  optimizedIntermediateWaypointIndex: number[];
  legs: RouteLeg[];
  encodedPolyline: string;
  decodedPath: [number, number][]; // [lat, lng] array
  isRealRoad: boolean;
}

export interface RouteRequestOptions {
  routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
}

export function decodeGooglePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([Number((lat / 1e5).toFixed(6)), Number((lng / 1e5).toFixed(6))]);
  }

  return points;
}

export function parseDurationSeconds(duration: string | number | undefined): number {
  if (typeof duration === 'number') return duration;
  if (typeof duration === 'string' && duration.endsWith('s')) {
    return parseFloat(duration.slice(0, -1)) || 0;
  }
  return 0;
}

export function haversineKm(p1: RouteCoord, p2: RouteCoord): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class GoogleRoutesV2Adapter {
  private readonly logger = new Logger(GoogleRoutesV2Adapter.name);
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';
  }

  /**
   * Computes multi-stop traffic-aware route via Google Routes API v2 (Directions).
   */
  async computeRoute(
    origin: RouteCoord,
    stops: RouteCoord[],
    destination: RouteCoord,
    departureTime: Date,
    options: RouteRequestOptions = {},
  ): Promise<ComputedRouteResult> {
    if (!this.apiKey) {
      return this.fallbackMultiStopRoute(origin, stops, destination, departureTime);
    }

    const payload: any = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: 'DRIVE',
      routingPreference: options.routingPreference || 'TRAFFIC_AWARE',
      departureTime: departureTime.toISOString(),
    };

    if (stops && stops.length > 0) {
      payload.intermediates = stops.map((s) => ({
        location: { latLng: { latitude: s.lat, longitude: s.lng } },
      }));
      if (options.routingPreference === 'TRAFFIC_AWARE') {
        payload.optimizeWaypointOrder = false;
      }
    }

    if (options.avoidTolls || options.avoidHighways) {
      payload.routeModifiers = {
        avoidTolls: Boolean(options.avoidTolls),
        avoidHighways: Boolean(options.avoidHighways),
      };
    }

    try {
      const responseData = await this.postJson(
        'routes.googleapis.com',
        '/directions/v2:computeRoutes',
        JSON.stringify(payload),
        {
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask':
            'routes.duration,routes.distanceMeters,routes.optimizedIntermediateWaypointIndex,routes.legs.duration,routes.legs.distanceMeters,routes.polyline.encodedPolyline,routes.legs.polyline.encodedPolyline',
        },
      );

      const routes = responseData?.routes;
      if (!routes || routes.length === 0) {
        throw new Error('Google Routes returned 0 routes');
      }

      const topRoute = routes[0];
      const durationSeconds = parseDurationSeconds(topRoute.duration);
      const distanceMeters = Number(topRoute.distanceMeters || 0);
      const distanceKm = Number((distanceMeters / 1000).toFixed(2));
      const optimizedIntermediateWaypointIndex =
        topRoute.optimizedIntermediateWaypointIndex || Array.from({ length: stops.length }, (_, i) => i);
      const encodedPolyline = topRoute.polyline?.encodedPolyline || '';
      const decodedPath = decodeGooglePolyline(encodedPolyline);

      const legs: RouteLeg[] = (topRoute.legs || []).map((leg: any) => ({
        durationSeconds: parseDurationSeconds(leg.duration),
        distanceMeters: Number(leg.distanceMeters || 0),
        encodedPolyline: leg.polyline?.encodedPolyline,
      }));

      return {
        durationSeconds,
        distanceMeters,
        distanceKm,
        optimizedIntermediateWaypointIndex,
        legs,
        encodedPolyline,
        decodedPath,
        isRealRoad: true,
      };
    } catch (err: any) {
      this.logger.warn(`Google Routes v2 API failed (${err.message}). Using road-factor multi-stop fallback.`);
      return this.fallbackMultiStopRoute(origin, stops, destination, departureTime);
    }
  }

  private fallbackMultiStopRoute(
    origin: RouteCoord,
    stops: RouteCoord[],
    destination: RouteCoord,
    _departureTime: Date,
  ): ComputedRouteResult {
    const allPoints = [origin, ...stops, destination];
    const legs: RouteLeg[] = [];
    let totalMeters = 0;
    let totalSeconds = 0;
    const path: [number, number][] = [];

    for (let i = 0; i < allPoints.length - 1; i++) {
      const p1 = allPoints[i];
      const p2 = allPoints[i + 1];
      const distKm = haversineKm(p1, p2) * 1.25; // 1.25 urban road factor
      const distMeters = Math.round(distKm * 1000);
      // Assume 25 km/h urban speed -> ~144s per km
      const durSec = Math.max(120, Math.round((distKm / 25) * 3600));

      legs.push({
        durationSeconds: durSec,
        distanceMeters: distMeters,
      });

      totalMeters += distMeters;
      totalSeconds += durSec;

      // Interpolate 5 intermediate points for visual map polyline
      path.push([p1.lat, p1.lng]);
      for (let step = 1; step <= 3; step++) {
        const frac = step / 4;
        path.push([
          Number((p1.lat + (p2.lat - p1.lat) * frac).toFixed(6)),
          Number((p1.lng + (p2.lng - p1.lng) * frac).toFixed(6)),
        ]);
      }
    }
    const last = allPoints[allPoints.length - 1];
    path.push([last.lat, last.lng]);

    return {
      durationSeconds: totalSeconds,
      distanceMeters: totalMeters,
      distanceKm: Number((totalMeters / 1000).toFixed(2)),
      optimizedIntermediateWaypointIndex: Array.from({ length: stops.length }, (_, i) => i),
      legs,
      encodedPolyline: '',
      decodedPath: path,
      isRealRoad: false,
    };
  }

  private postJson(
    hostname: string,
    path: string,
    payload: string,
    headers: Record<string, string>,
    timeoutMs = 15000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        req.destroy(new Error(`Routes request exceeded ${timeoutMs}ms`));
      }, timeoutMs);
      deadline.unref();

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
          timeout: timeoutMs,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            clearTimeout(deadline);
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
        clearTimeout(deadline);
        req.destroy();
        reject(new Error('Google Routes request timed out'));
      });
      req.on('error', (err) => {
        clearTimeout(deadline);
        reject(err);
      });

      req.write(payload);
      req.end();
    });
  }
}

