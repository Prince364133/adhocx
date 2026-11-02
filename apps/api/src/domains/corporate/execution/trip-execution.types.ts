export interface ArriveAtStopDto {
  driverLatitude: number;
  driverLongitude: number;
}

export interface VerifyStopOtpDto {
  otpCode: string;
}

export interface VerifyStopQrDto {
  qrPayload: string;
  driverLatitude: number;
  driverLongitude: number;
}

export interface RouteTelemetryDto {
  latitude: number;
  longitude: number;
  speedMps?: number;
  headingDeg?: number;
  accuracyM?: number;
}

export interface MarkNoShowDto {
  reason?: string;
  driverLatitude?: number;
  driverLongitude?: number;
}

export interface StartRouteDto {
  driverId?: string;
  driverLatitude?: number;
  driverLongitude?: number;
}

export interface StartRouteResult {
  routeId: string;
  status: 'IN_TRANSIT';
  startedAt: Date;
  stopEtas: Array<{
    stopId: string;
    stopSequence: number;
    employeeId: string;
    etaMinutes: number;
    etaAt: Date;
  }>;
}

export interface RescheduleRequestDto {
  employeeId: string;
  newShiftTime?: string; // HH:mm
  action: 'CANCEL' | 'RESCHEDULE';
}

export interface AdminRescheduleRequestDto {
  employeeId?: string;
  newShiftTime?: string; // HH:mm
  action: 'CANCEL' | 'RESCHEDULE';
  /** Admin performing the cutoff override (audited). */
  actorUserId: string;
  reason: string;
}

export interface StopExecutionResult {
  stopId: string;
  routeId: string;
  stopSequence: number;
  stopType: string;
  status: 'ARRIVED' | 'BOARDED' | 'NO_SHOW' | 'COMPLETED';
  actualArrivalTime?: Date;
  actualDepartureTime?: Date;
  countdownRemainingSeconds: number;
  message: string;
}

export interface BoardingQrTokenResult {
  stopId: string;
  routeId: string;
  employeeId?: string;
  qrPayload: string;
  expiresAt: Date;
}

export interface RouteWaypointItem {
  stopId: string;
  stopSequence: number;
  stopType: string;
  status: string;
  latitude: number;
  longitude: number;
  addressText: string;
  employeeName?: string;
  plannedEta: Date;
}

export interface RouteWaypointsResult {
  routeId: string;
  direction: string;
  status: string;
  stops: RouteWaypointItem[];
  officeHub: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    addressText: string;
  };
}
