/** Live fleet map helpers (kept out of the page file: Next.js pages may only export the page). */

// Same thresholds as the API (tracking.types.ts): LIVE <= 45 s, STALE <= 180 s, else OFFLINE.
export const GPS_LIVE_MAX_AGE_SEC = 45;
export const GPS_STALE_MAX_AGE_SEC = 180;
/** A cab with no fix for this long is removed from the map. */
export const MARKER_DROP_AFTER_SEC = 15 * 60;
export const ACTIVE_ROUTE_STATUSES = new Set(['IN_TRANSIT', 'ASSIGNED', 'DISPATCHING']);

export function gpsStateOf(recordedAtMs: number, nowMs = Date.now()): 'LIVE' | 'STALE' | 'OFFLINE' {
  const ageSec = Math.max(0, (nowMs - recordedAtMs) / 1000);
  return ageSec <= GPS_LIVE_MAX_AGE_SEC ? 'LIVE' : ageSec <= GPS_STALE_MAX_AGE_SEC ? 'STALE' : 'OFFLINE';
}

export const GPS_COLORS = { LIVE: '#16A34A', STALE: '#EAB308', OFFLINE: '#9CA3AF' } as const;

/** Signed smallest rotation from `from` to `to`, in (-180, 180]. */
export function shortestTurnDeg(from: number, to: number): number {
  const d = (((to - from) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}
