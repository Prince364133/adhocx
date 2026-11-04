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
  status: 'OFFERED' | 'ASSIGNED' | 'NO_DRIVERS_FOUND' | 'ALL_DRIVERS_BUSY' | 'ALREADY_ASSIGNED';
  offeredToDriverId?: string;
  offeredDriverName?: string;
  candidatesCount: number;
  /** Directed offers: when the live offer expires. */
  offerExpiresAt?: Date;
}

/** How a driver offer was priced. */
export interface OfferPricing {
  farePaise: number;
  /** CorporateDriverRateCard used (RATE_CARD only). */
  rateCardId?: string;
  /** RATE_CARD = versioned driver card; FALLBACK = legacy constants (no card); OVERRIDE = caller-supplied fare. */
  source: 'RATE_CARD' | 'FALLBACK' | 'OVERRIDE';
}

/** Options for `CorporateDispatchService.offerRouteToDriver`. */
export interface DirectedOfferOptions {
  /** Fixed fare in paise (e.g. the reassigned route's accepted fare); default = driver rate card. */
  farePaise?: number | null;
  actorUserId?: string;
  actorRole?: string;
  /** Free-text reason, recorded in the audit entry. */
  reason?: string;
  /** Flag on the driver's offer event (default true). */
  directedByOps?: boolean;
  /** How long to wait for the per-route dispatch lock before 409 (default 3000 ms). */
  lockWaitMs?: number;
}

