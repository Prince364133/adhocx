export type GpsTelemetryState = 'LIVE' | 'STALE' | 'OFFLINE';

export interface LiveVehicleTelemetryPayload {
  routeId: string;
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

