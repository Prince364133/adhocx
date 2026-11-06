import { CorporateSosStatus, SafetyIncidentSeverity, SafetyIncidentType, SafeDropStatus } from '../../enums';

export interface TriggerSosAlertDto {
  routeId: string;
  stopId?: string;
  latitude: number;
  longitude: number;
  batteryPct?: number;
  audioUrl?: string;
  triggerReason?: string;
}

export interface ResolveSosAlertDto {
  alertId: string;
  status: CorporateSosStatus;
  resolutionNotes: string;
}

export interface SosAlertResponseDto {
  id: string;
  routeId: string;
  triggeredById: string;
  triggeredByRole: string;
  latitude: number;
  longitude: number;
  status: CorporateSosStatus;
  createdAt: Date;
}

export interface SafeDropEventDto {
  routeId: string;
  stopId: string;
  status: SafeDropStatus;
  droppedAt?: Date;
  confirmedAt?: Date;
  notes?: string;
}

export interface ConfirmSafeDropDto {
  confirmedByRole: 'DRIVER' | 'EMPLOYEE';
  notes?: string;
}

export interface ConfirmSafeReachDto {
  stopId: string;
  routeId: string;
  employeeId?: string;
  confirmedSafely: boolean;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface EmergencyBoardingFallbackDto {
  routeId: string;
  stopId: string;
  supervisorUserId: string;
  reason:
    | 'EMPLOYEE_PHONE_BATTERY_DEAD'
    | 'CARRIER_SMS_DELAY'
    | 'MOBILE_APP_NETWORK_OUTAGE'
    | 'PHYSICAL_BADGE_VERIFIED'
    | 'SUPERVISOR_DIRECT_AUTHORIZATION';
  verificationEvidence?: string;
  notes?: string;
}

export interface TelemetrySafetyAlertDto {
  routeId: string;
  type: 'OVERSPEEDING' | 'ROUTE_DEVIATION' | 'UNPLANNED_STOP' | 'TRACKING_LOSS';
  severity: SafetyIncidentSeverity;
  latitude: number;
  longitude: number;
  speedKph?: number;
  deviationMeters?: number;
  stoppedDurationSeconds?: number;
  message: string;
  timestamp: Date;
}

export interface TrackingLossAlertDto {
  routeId: string;
  tenantId: string;
  driverId?: string | null;
  lastKnownCoordinates?: { latitude: number; longitude: number };
  lastFixAgeSeconds: number;
  severity: SafetyIncidentSeverity;
  isNightShift: boolean;
  timestamp: Date;
}

export interface CreateSafetyIncidentDto {
  tenantId: string;
  routeId?: string;
  stopId?: string;
  type: SafetyIncidentType;
  severity: SafetyIncidentSeverity;
  title: string;
  description: string;
  reportedById?: string;
  reportedByRole?: 'EMPLOYEE' | 'DRIVER' | 'COMMAND_CENTER' | 'SYSTEM_AUTONOMOUS';
}


