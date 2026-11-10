import * as h3 from 'h3-js';

/**
 * The pickup-radius invariant (docs/23_DISPATCH_PICKUP_RADIUS_RCA_AND_PLAN.md):
 *
 *   An offer is created only for a driver whose KNOWN, FRESH location is within the configured
 *   pickup radius.
 *
 * Every candidate source (H3 cells, Redis GEO, Postgres) and every fallback goes through
 * `evaluateDispatchLocation` before an offer exists, so no search path can bypass it.
 */

const num = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

export const PickupRadiusConfig = {
  /** Maximum straight-line distance (km) between a driver and the pickup. Single source of truth. */
  get maxPickupRadiusKm(): number {
    return Math.max(0.5, num(process.env.DISPATCH_MAX_PICKUP_RADIUS_KM, 10));
  },
  /**
   * Optional cap on the ROAD distance (km) from the Google road matrix, applied after the road-ETA
   * re-rank. Unset or 0 = off (the straight-line radius still applies).
   */
  get maxPickupRoadKm(): number | null {
    const v = num(process.env.DISPATCH_MAX_PICKUP_ROAD_KM, 0);
    return v > 0 ? v : null;
  },
  /** A location older than this is not trusted for dispatch (seconds). */
  get maxLocationAgeSec(): number {
    return Math.max(30, num(process.env.DISPATCH_MAX_LOCATION_AGE_SEC, 600));
  },
  /** Fixes reported with worse accuracy than this (metres) are not used for dispatch. */
  get maxLocationAccuracyM(): number {
    return Math.max(10, num(process.env.DISPATCH_MAX_LOCATION_ACCURACY_M, 500));
  },
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Search radius for a wave: grows linearly from radius/maxWaves to the full radius on the last
 * wave, and never exceeds the radius.
 */
export function waveSearchRadiusKm(waveNumber: number, maxWaves: number, maxRadiusKm: number): number {
  const waves = Math.max(1, maxWaves);
  const w = Math.min(Math.max(1, waveNumber), waves);
  return Math.min(maxRadiusKm, (maxRadiusKm * w) / waves);
}

/**
 * Smallest H3 k-ring whose disk covers `radiusKm` around the origin cell. Neighbouring cell centres
 * are √3 × edge apart, so a k-disk reaches about k × √3 × edge (+ one edge for the origin cell).
 * At resolution 8 (edge ≈ 0.46 km) 10 km needs k ≈ 13.
 */
export function kRingForRadiusKm(radiusKm: number, resolution = 8): number {
  const edgeKm = h3.getHexagonEdgeLengthAvg(resolution, h3.UNITS.km);
  // 30 % margin: hexagons are smaller than average at some latitudes, so an average-sized ring can
  // stop short of the radius (load test: a 9.5 km driver in Ahmedabad fell outside k = 11). The exact
  // distance filter still trims every hit to the radius.
  return Math.max(1, Math.ceil((radiusKm * 1.3) / (Math.sqrt(3) * edgeKm)));
}

export type DispatchLocationVerdict =
  | { eligible: true; distanceKm: number }
  | { eligible: false; reason: 'NO_LOCATION' | 'STALE_LOCATION' | 'OUT_OF_RADIUS'; distanceKm: number | null };

/** The invariant itself. `lastLocationAt` null/invalid = unknown age = not dispatchable. */
export function evaluateDispatchLocation(
  driver: { currentLat: unknown; currentLng: unknown; lastLocationAt?: Date | string | null },
  pickup: { lat: number; lng: number },
  nowMs: number = Date.now(),
  maxRadiusKm: number = PickupRadiusConfig.maxPickupRadiusKm,
  maxAgeSec: number = PickupRadiusConfig.maxLocationAgeSec,
): DispatchLocationVerdict {
  const lat = driver.currentLat === null || driver.currentLat === undefined ? NaN : Number(driver.currentLat);
  const lng = driver.currentLng === null || driver.currentLng === undefined ? NaN : Number(driver.currentLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { eligible: false, reason: 'NO_LOCATION', distanceKm: null };
  const distanceKm = haversineKm(pickup.lat, pickup.lng, lat, lng);
  const at = driver.lastLocationAt ? new Date(driver.lastLocationAt).getTime() : NaN;
  if (!Number.isFinite(at) || nowMs - at > maxAgeSec * 1000) return { eligible: false, reason: 'STALE_LOCATION', distanceKm };
  if (distanceKm > maxRadiusKm) return { eligible: false, reason: 'OUT_OF_RADIUS', distanceKm };
  return { eligible: true, distanceKm };
}
