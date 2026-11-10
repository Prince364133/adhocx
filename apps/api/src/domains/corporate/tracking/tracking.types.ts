import type { LiveVehicleTelemetryPayload } from '@adhocx/contracts';
/**
 * Corporate ETS tracking domain (WS-B): GPS freshness, stream contract, trip-event vocabulary.
 */

// ---------------------------------------------------------------------------------------------
// GPS freshness (doc 19 WS-B §3): returned on every tracking read.
// ---------------------------------------------------------------------------------------------

export type GpsState = 'LIVE' | 'STALE' | 'OFFLINE';

/** A fix at most this old (seconds) is LIVE. */
export const GPS_LIVE_MAX_AGE_SEC = 45;
/** A fix at most this old (seconds) is STALE; anything older (or no fix) is OFFLINE. */
export const GPS_STALE_MAX_AGE_SEC = 180;

export interface GpsFreshness {
  gpsState: GpsState;
  /** Whole seconds since the device recorded the last fix; null when there is no fix at all. */
  lastFixAgeSec: number | null;
}

/**
 * Classifies a fix by the age of its device timestamp. Never reports LIVE for a fix older than
 * 45 s. A timestamp in the future (device clock ahead) counts as age 0; ingest already clamps it.
 */
export function classifyGpsFreshness(recordedAt: Date | string | number | null | undefined, now: Date = new Date()): GpsFreshness {
  if (recordedAt === null || recordedAt === undefined) return { gpsState: 'OFFLINE', lastFixAgeSec: null };
  const ms = new Date(recordedAt).getTime();
  if (!Number.isFinite(ms)) return { gpsState: 'OFFLINE', lastFixAgeSec: null };
  const lastFixAgeSec = Math.max(0, Math.floor((now.getTime() - ms) / 1000));
  const gpsState: GpsState =
    lastFixAgeSec <= GPS_LIVE_MAX_AGE_SEC ? 'LIVE' : lastFixAgeSec <= GPS_STALE_MAX_AGE_SEC ? 'STALE' : 'OFFLINE';
  return { gpsState, lastFixAgeSec };
}

// ---------------------------------------------------------------------------------------------
// Redis keys + stream contract
// ---------------------------------------------------------------------------------------------

export const CorporateGpsKeys = {
  STREAM: 'corporate:gps:stream',
  GROUP: 'corporate:gps:writers',
  /** Latest-position cache read by the live map (key kept from the original ingestTelemetry). */
  latest: (routeId: string) => `corporate:route:telemetry:${routeId}`,
  /** Ingest-side de-duplication of device re-uploads of the same fix. */
  seen: (routeId: string, driverId: string, recordedAtMs: number) =>
    `corporate:gps:seen:${routeId}:${driverId}:${recordedAtMs}`,
} as const;

/**
 * TTL of the latest-position key. Longer than the STALE window so a STALE fix is still shown as
 * STALE (not OFFLINE) and the last known position stays available to the live board.
 */
export const GPS_LATEST_TTL_SEC = 900;
/** How long a (route, driver, recordedAt) is remembered for re-upload de-duplication. */
export const GPS_SEEN_TTL_SEC = 600;
/** Device clocks ahead of the server by more than this are clamped to the server receive time. */
export const GPS_MAX_FUTURE_SKEW_MS = 5_000;

/** One GPS fix as carried in the stream (`f` field, JSON) and written to Postgres. */
export interface GpsFixRecord {
  tenantId: string;
  routeId: string;
  driverId: string;
  lat: number;
  lng: number;
  speedKph: number | null;
  heading: number | null;
  accuracyM: number | null;
  batteryPct: number | null;
  /** Device time, epoch ms (clamped to <= receivedAt). */
  recordedAt: number;
  /** Server receive time, epoch ms. Fixed at ingest so re-deliveries stay identical. */
  receivedAt: number;
}

/** Latest-position cache payload (backward compatible with the original `{...dto, recordedAt}`). */
export interface LatestGpsFix {
  latitude: number;
  longitude: number;
  speedMps?: number;
  headingDeg?: number;
  accuracyM?: number;
  batteryPct?: number;
  driverId?: string | null;
  recordedAt: string;
  /**
   * recordedAt as epoch ms. Written since the atomic (Lua) ingest so Redis can compare fixes
   * without parsing ISO dates; absent on entries written by older builds.
   */
  recordedAtMs?: number;
  receivedAt?: string;
}

export interface GpsIngestOutcome {
  recordedAt: Date;
  receivedAt: Date;
  /** True when an older fix arrived after a newer one: stored in history, live position untouched. */
  outOfOrder: boolean;
  /** True when this exact fix was already ingested (device re-upload): nothing new stored. */
  duplicate: boolean;
  /** Where the fix went for persistence. */
  persistence: 'STREAM' | 'LOCAL_BUFFER' | 'NONE';
}

// ---------------------------------------------------------------------------------------------
// Trip events
// ---------------------------------------------------------------------------------------------

export const CorporateTripEventTypes = [
  'ROUTE_STARTED',
  'STOP_ARRIVED',
  'PASSENGER_BOARDED',
  'PASSENGER_NO_SHOW',
  'PASSENGER_DROPPED',
  'SAFE_ARRIVAL_CONFIRMED',
  'OVERSPEEDING_ALERT',
  'ROUTE_DEVIATION_ALERT',
  'TRACKING_LOSS_ALERT',
  'BOARDING_FALLBACK_APPLIED',
  'ROUTE_COMPLETED',
  'OFFER_SENT',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'OFFER_EXPIRED',
  'STOP_ADDED',
  'STOP_REMOVED',
  'DRIVER_REASSIGNED',
  'OFFER_WITHDRAWN',
  'ROUTE_ESCALATED_AT_RISK',
] as const;
export type CorporateTripEventType = (typeof CorporateTripEventTypes)[number];

export interface TripEventInput {
  /** Resolved from the route when omitted (one indexed read). */
  tenantId?: string | null;
  routeId: string;
  stopId?: string | null;
  type: CorporateTripEventType;
  actorId?: string | null;
  actorRole?: string | null;
  payload?: Record<string, unknown>;
  at?: Date;
}

export interface AssignmentEventInput {
  tenantId?: string | null;
  routeId: string;
  fromDriverId?: string | null;
  toDriverId?: string | null;
  /** e.g. OFFER_ACCEPTED, OPS_REASSIGN, DRIVER_REPLACED, UNASSIGNED. */
  reason: string;
  actorId?: string | null;
  at?: Date;
}

// ---------------------------------------------------------------------------------------------
// Read models
// ---------------------------------------------------------------------------------------------

export interface TrackingPosition {
  lat: number;
  lng: number;
  speedKph: number | null;
  heading: number | null;
  accuracyM: number | null;
  batteryPct: number | null;
  recordedAt: Date;
  driverId: string | null;
}

export interface RouteTrackingView extends GpsFreshness {
  routeId: string;
  routeStatus: string;
  driverId: string | null;
  /** True only when gpsState is LIVE. Clients must not render a STALE/OFFLINE position as live. */
  isLive: boolean;
  /** Last known position (any freshness) or null. Check gpsState before showing it as current. */
  position: TrackingPosition | null;
  source: 'CACHE' | 'HISTORY' | 'NONE';
  asOf: Date;
}

export interface TimelineItem {
  kind: 'TRIP_EVENT' | 'ASSIGNMENT';
  id: string;
  at: Date;
  type: string;
  stopId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  payload?: unknown;
  fromDriverId?: string | null;
  toDriverId?: string | null;
}

export interface RouteTimelineView {
  routeId: string;
  items: TimelineItem[];
  assignmentHistory: TimelineItem[];
  truncated: boolean;
}

export interface PlaybackPoint extends TrackingPosition {
  id: string;
}

export interface RoutePlaybackView {
  routeId: string;
  from: Date;
  to: Date;
  points: PlaybackPoint[];
  /** Pass as `cursor` to fetch the next page; null when the window is exhausted. */
  nextCursor: string | null;
}

/** Live map payload for a route's latest fix. Freshness comes from the device timestamp. */
export function toLiveTelemetry(
  route: {
    id: string;
    tenantId: string;
    status?: string | null;
    driverId?: string | null;
    driverName?: string | null;
    vehicleNumber?: string | null;
  },
  fix: LatestGpsFix,
  now: Date = new Date(),
): LiveVehicleTelemetryPayload {
  const recordedAt = Date.parse(fix.recordedAt);
  const receivedAt = fix.receivedAt ? Date.parse(fix.receivedAt) : NaN;
  return {
    routeId: route.id,
    kind: 'CORPORATE_ROUTE',
    tenantId: route.tenantId,
    driverId: fix.driverId ?? route.driverId ?? '',
    ...(route.driverName ? { driverName: route.driverName } : {}),
    ...(route.vehicleNumber ? { vehicleNumber: route.vehicleNumber } : {}),
    lat: fix.latitude,
    lng: fix.longitude,
    speedKph: Number.isFinite(Number(fix.speedMps)) ? Math.round(Number(fix.speedMps) * 3.6) : 0,
    heading: Number.isFinite(Number(fix.headingDeg)) ? Number(fix.headingDeg) : 0,
    ...(Number.isFinite(Number(fix.accuracyM)) ? { accuracyM: Number(fix.accuracyM) } : {}),
    ...(Number.isFinite(Number(fix.batteryPct)) ? { batteryPct: Number(fix.batteryPct) } : {}),
    recordedAt,
    ...(Number.isFinite(receivedAt) ? { receivedAt } : {}),
    gpsState: classifyGpsFreshness(recordedAt, now).gpsState,
    ...(route.status ? { status: route.status } : {}),
  };
}

/** Pub/Sub channels for live telemetry. */
export const TelemetryChannels = {
  opsFleet: 'telemetry:ops:fleet',
  tenantFleet: (tenantId: string) => `telemetry:tenant:${tenantId}:fleet`,
  /** @deprecated no longer published: route streams filter the tenant channel. */
  route: (routeId: string) => `telemetry:route:${routeId}`,
  trip: (tripId: string) => `telemetry:trip:${tripId}`,
};

/** On-demand (B2B/B2C) trips on the live map. */
export const TripTelemetryKeys = {
  /** Latest-position cache for an active on-demand trip (JSON LiveVehicleTelemetryPayload). */
  latest: (tripId: string) => `trip:telemetry:${tripId}`,
  /** Gate that throttles Postgres writes of a trip's location (SET NX EX). */
  persistGate: (tripId: string) => `trip:telemetry:persist:${tripId}`,
} as const;
export const TRIP_LATEST_TTL_SEC = 900;
export const ACTIVE_TRIP_STATUSES = ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS'] as const;

/**
 * Atomic GPS apply (one round trip): de-duplicate, move the latest position forward only, and
 * append to the history stream.
 *
 * KEYS[1] latest key, KEYS[2] seen key, KEYS[3] stream key
 * ARGV[1] recordedAtMs, ARGV[2] latest JSON, ARGV[3] latest TTL s, ARGV[4] seen TTL s,
 * ARGV[5] stream MAXLEN (approximate), ARGV[6] history record JSON ('' = no driver: no dedupe, no history)
 *
 * Returns {status, streamId}: status 0 duplicate, 1 latest updated, 2 out of order (latest kept);
 * streamId '' when no history was written, '!' when XADD failed (caller buffers locally).
 * A latest entry without recordedAtMs (written by an older build) is treated as older.
 */
export const GPS_APPLY_LUA = `
if ARGV[6] ~= '' then
  if not redis.call('SET', KEYS[2], '1', 'EX', ARGV[4], 'NX') then return {0, ''} end
end
local status = 1
local prev = redis.call('GET', KEYS[1])
if prev then
  local ok, d = pcall(cjson.decode, prev)
  if ok and type(d) == 'table' then
    local prevMs = tonumber(d['recordedAtMs'])
    if prevMs and prevMs > tonumber(ARGV[1]) then status = 2 end
  end
end
if status == 1 then redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]) end
local sid = ''
if ARGV[6] ~= '' then
  local r = redis.pcall('XADD', KEYS[3], 'MAXLEN', '~', ARGV[5], '*', 'f', ARGV[6])
  if type(r) == 'string' then sid = r else sid = '!' end
end
return {status, sid}
`;
