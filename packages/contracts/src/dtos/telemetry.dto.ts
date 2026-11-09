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
  accuracyM: number;
  batteryPct?: number;
  recordedAt: number;
  receivedAt?: number;
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
