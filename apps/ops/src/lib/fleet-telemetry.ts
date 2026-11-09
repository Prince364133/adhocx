/** Live fleet map helpers (kept out of the page file: Next.js pages may only export the page). */
import type { LiveVehicleTelemetryPayload } from '@adhocx/contracts';

// Same thresholds as the API (tracking.types.ts): LIVE <= 45 s, STALE <= 180 s, else OFFLINE.
export const GPS_LIVE_MAX_AGE_SEC = 45;
export const GPS_STALE_MAX_AGE_SEC = 180;
/** A cab with no fix for this long is removed from the map. */
export const MARKER_DROP_AFTER_SEC = 15 * 60;
export const ACTIVE_ROUTE_STATUSES = new Set(['IN_TRANSIT', 'ASSIGNED', 'DISPATCHING']);
/** Marker icon is only re-rotated when the drawn heading is off by at least this much. */
export const ICON_ROTATION_STEP_DEG = 2;

export type GpsState = 'LIVE' | 'STALE' | 'OFFLINE';
export type VehicleKind = 'CORPORATE_ROUTE' | 'TRIP';

/**
 * Telemetry as the map uses it. `kind` / `vehicleNumber` are optional on the wire (older API
 * builds do not send them), so they are read through this local extension.
 */
export type FleetFix = LiveVehicleTelemetryPayload & { kind?: VehicleKind; vehicleNumber?: string };

export function gpsStateOf(recordedAtMs: number, nowMs = Date.now()): GpsState {
  const ageSec = Math.max(0, (nowMs - recordedAtMs) / 1000);
  return ageSec <= GPS_LIVE_MAX_AGE_SEC ? 'LIVE' : ageSec <= GPS_STALE_MAX_AGE_SEC ? 'STALE' : 'OFFLINE';
}

export const GPS_COLORS = { LIVE: '#16A34A', STALE: '#EAB308', OFFLINE: '#9CA3AF' } as const;
/** Stroke colour per vehicle kind, so on-demand trips stand apart from corporate routes. */
export const KIND_STROKE = { CORPORATE_ROUTE: '#FFFFFF', TRIP: '#2563EB' } as const;

/** Signed smallest rotation from `from` to `to`, in (-180, 180]. */
export function shortestTurnDeg(from: number, to: number): number {
  const d = (((to - from) % 360) + 360) % 360;
  return d > 180 ? d - 360 : d;
}

export function kindOf(fix: Pick<FleetFix, 'kind'> | null | undefined): VehicleKind {
  return fix?.kind === 'TRIP' ? 'TRIP' : 'CORPORATE_ROUTE';
}

/** Short operator-facing label: RT-xxxxxx for corporate routes, TR-xxxxxx for on-demand trips. */
export function vehicleLabel(fix: Pick<FleetFix, 'kind' | 'routeId'>): string {
  return `${kindOf(fix) === 'TRIP' ? 'TR' : 'RT'}-${fix.routeId.slice(0, 6).toUpperCase()}`;
}

/** A frame is usable only with an id and finite coordinates / device time. */
export function isValidFix(f: unknown): f is FleetFix {
  const x = f as FleetFix;
  return (
    !!x &&
    typeof x.routeId === 'string' &&
    x.routeId.length > 0 &&
    Number.isFinite(x.lat) &&
    Number.isFinite(x.lng) &&
    Number.isFinite(x.recordedAt)
  );
}

/** Parses an SSE data payload: one fix or an array of fixes. Malformed input yields []. */
export function parseFixFrame(data: string): FleetFix[] {
  try {
    const parsed = JSON.parse(data);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    return list.filter(isValidFix);
  } catch {
    return [];
  }
}

/**
 * Merges a newer fix over the previous one. Stream frames may omit descriptive fields
 * (driverName, vehicleNumber, tenantId, kind, status...) that the snapshot carried, so those keep
 * their previous values; positional fields always come from the new fix.
 */
export function mergeFix(prev: FleetFix | undefined, next: FleetFix): FleetFix {
  if (!prev) return next;
  const merged: FleetFix = { ...prev, ...next };
  (Object.keys(prev) as (keyof FleetFix)[]).forEach((k) => {
    if (next[k] === undefined || next[k] === null || next[k] === '') (merged as any)[k] = prev[k];
  });
  return merged;
}

/** Linear interpolation progress of an animation segment, clamped to [0, 1]. */
export function segmentProgress(nowMs: number, startMs: number, durationMs: number): number {
  if (!(durationMs > 0)) return 1;
  return Math.min(1, Math.max(0, (nowMs - startMs) / durationMs));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Animation length for a new segment: the gap between fixes, clamped to 0.5 s .. 5 s. */
export function segmentDurationMs(prevRecordedAt: number, nextRecordedAt: number): number {
  return Math.min(Math.max(nextRecordedAt - prevRecordedAt, 500), 5000);
}

/** One heading easing step toward the target, normalised to [0, 360). */
export function stepHeading(current: number, target: number, factor = 0.15): number {
  const turn = shortestTurnDeg(current, target);
  if (Math.abs(turn) <= 0.5) return ((target % 360) + 360) % 360;
  return (((current + turn * factor) % 360) + 360) % 360;
}

/** True when the drawn icon rotation is far enough from the heading to be worth a setIcon. */
export function needsRotationUpdate(drawnDeg: number, headingDeg: number, step = ICON_ROTATION_STEP_DEG): boolean {
  return Math.abs(shortestTurnDeg(drawnDeg, headingDeg)) >= step;
}

export interface LatLngBoundsLiteral {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Whether a point is inside the (padded) viewport. Only such markers are animated; the rest snap
 * to their target, so thousands of off-screen cabs cost nothing per frame. Handles bounds that
 * cross the antimeridian (west > east). No bounds yet → animate everything.
 */
export function isInViewport(lat: number, lng: number, b: LatLngBoundsLiteral | null, padFraction = 0.15): boolean {
  if (!b) return true;
  const latPad = (b.north - b.south) * padFraction;
  if (lat < b.south - latPad || lat > b.north + latPad) return false;
  const width = b.east >= b.west ? b.east - b.west : b.east + 360 - b.west;
  const lngPad = width * padFraction;
  if (width + 2 * lngPad >= 360) return true;
  const west = b.west - lngPad;
  const rel = (((lng - west) % 360) + 360) % 360;
  return rel <= width + 2 * lngPad;
}

// ─── Vehicle list (side panel) ────────────────────────────────────────────────

export type GpsFilter = 'ALL' | GpsState;
export type KindFilter = 'ALL' | VehicleKind;

export interface VehicleListItem {
  routeId: string;
  kind: VehicleKind;
  label: string;
  driverName?: string;
  vehicleNumber?: string;
  status?: string;
  gpsState: GpsState;
  speedKph: number;
  recordedAt: number;
}

export function toListItem(fix: FleetFix, nowMs = Date.now()): VehicleListItem {
  return {
    routeId: fix.routeId,
    kind: kindOf(fix),
    label: vehicleLabel(fix),
    driverName: fix.driverName,
    vehicleNumber: fix.vehicleNumber,
    status: fix.status,
    gpsState: gpsStateOf(fix.recordedAt, nowMs),
    speedKph: Number.isFinite(fix.speedKph) ? fix.speedKph : 0,
    recordedAt: fix.recordedAt,
  };
}

export function countByState(items: VehicleListItem[]): Record<GpsState, number> {
  const c: Record<GpsState, number> = { LIVE: 0, STALE: 0, OFFLINE: 0 };
  items.forEach((i) => c[i.gpsState]++);
  return c;
}

const STATE_ORDER: Record<GpsState, number> = { LIVE: 0, STALE: 1, OFFLINE: 2 };

/** Filters by GPS state / kind / free text (driver, route id, label, vehicle number), freshest first. */
export function filterVehicles(
  items: VehicleListItem[],
  opts: { gps: GpsFilter; kind: KindFilter; query: string },
  limit = 200,
): { rows: VehicleListItem[]; total: number } {
  const q = opts.query.trim().toLowerCase();
  const matched = items.filter((i) => {
    if (opts.gps !== 'ALL' && i.gpsState !== opts.gps) return false;
    if (opts.kind !== 'ALL' && i.kind !== opts.kind) return false;
    if (!q) return true;
    return [i.driverName, i.routeId, i.label, i.vehicleNumber].some((v) => v && v.toLowerCase().includes(q));
  });
  matched.sort((a, b) => STATE_ORDER[a.gpsState] - STATE_ORDER[b.gpsState] || b.recordedAt - a.recordedAt);
  return { rows: matched.slice(0, limit), total: matched.length };
}
