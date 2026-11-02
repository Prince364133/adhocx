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

