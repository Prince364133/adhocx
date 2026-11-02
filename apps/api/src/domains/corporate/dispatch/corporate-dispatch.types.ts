export interface CorporateRouteOfferData {
  routeId: string;
  driverId: string;
  tenantName: string;
  shiftDate: string;
  shiftTime: string;
  direction: 'LOGIN' | 'LOGOUT';
  passengerCount: number;
  totalDistanceMeters: number;
  targetPickup1Time: Date;
  farePaise: number;
  offerExpiresAt: Date;
  stopsCount: number;
  originAddress: string;
  destinationAddress: string;
}

export interface TrafficAdvancerResult {
  routeId: string;
  originalPickup1Time: Date;
  standardDispatchTime: Date;
  adjustedDispatchTime: Date;
  trafficDelayMinutes: number;
  isAdvanced: boolean;
  congestionLevel: 'NORMAL' | 'MODERATE' | 'SEVERE';
  reason: string;
  /** Pickup-1 time the driver must hit after traffic adjustment (== original when not advanced). */
  adjustedPickup1Time?: Date;
  /** Where the delay estimate came from. */
  trafficSource?: 'GOOGLE' | 'HEURISTIC';
  durationInTrafficSeconds?: number;
  staticDurationSeconds?: number;
  /** True when the advanced pickup-1 / stop ETAs were written back to the route. */
  persisted?: boolean;
}

export interface CorporateDispatchWaveResult {
  routeId: string;
  waveNumber: number;
  searchRadiusKm: number;
  status: 'OFFERED' | 'ASSIGNED' | 'NO_DRIVERS_FOUND' | 'ALREADY_ASSIGNED';
  offeredToDriverId?: string;
  offeredDriverName?: string;
  candidatesCount: number;
}

