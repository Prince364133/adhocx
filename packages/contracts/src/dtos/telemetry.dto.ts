export type GpsTelemetryState = 'LIVE' | 'STALE' | 'OFFLINE';

/** What a live-map vehicle is serving: a corporate ETS route or an on-demand (B2B/B2C) trip. */
export type LiveVehicleKind = 'CORPORATE_ROUTE' | 'TRIP';

export interface LiveVehicleTelemetryPayload {
  /** Corporate route id, or the trip id when kind is TRIP. Unique across both (UUIDs). */
  routeId: string;
  /** Absent on payloads from older API builds; treat absent as CORPORATE_ROUTE. */
  kind?: LiveVehicleKind;
  /** Registration / plate number when cheaply known. */
  vehicleNumber?: string;
  driverId: string;
  driverName?: string;
  tripId?: string;
  tenantId?: string;
  lat: number;
  lng: number;
  speedKph: number;
  heading: number;
  /** Reported GPS accuracy; absent when the device did not report one. */
  accuracyM?: number;
  batteryPct?: number;
  /** Device time of the fix (epoch ms). */
  recordedAt: number;
  receivedAt?: number;
  /** Freshness at the time the server sent it; clients re-derive it from recordedAt as time passes. */
  gpsState: GpsTelemetryState;
  delayMinutes?: number;
  status?: string;
}

export interface FleetLiveStreamQueryDto {
  tenantId?: string;
  routeId?: string;
  bbox?: string;
  zoom?: number;
}

