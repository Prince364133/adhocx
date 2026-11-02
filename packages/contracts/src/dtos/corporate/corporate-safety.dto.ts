import { CorporateSosStatus } from '../../enums';

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

export interface ConfirmSafeDropDto {
  confirmedByRole: 'DRIVER' | 'EMPLOYEE';
  notes?: string;
}

