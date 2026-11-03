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
  'ROUTE_COMPLETED',
  'OFFER_SENT',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'OFFER_EXPIRED',
  'STOP_ADDED',
  'STOP_REMOVED',
  'DRIVER_REASSIGNED',
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
