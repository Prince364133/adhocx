import { CorporateStopStatus } from '../../enums';

export interface StopArrivalDto {
  driverLatitude: number;
  driverLongitude: number;
}

export interface BoardingOtpVerifyDto {
  otpCode: string;
}

export interface BoardingQrVerifyDto {
  qrPayload: string; // Encrypted or signed token
  driverLatitude?: number;
  driverLongitude?: number;
}

export interface StopNoShowDto {
  reason?: string;
  driverLatitude?: number;
  driverLongitude?: number;
}

export interface RescheduleShiftDto {
  employeeId: string;
  newShiftTime?: string;
  action: 'CANCEL' | 'RESCHEDULE';
}

export interface StopExecutionResponseDto {
  stopId: string;
  routeId: string;
  stopSequence: number;
  stopType: string;
  status: CorporateStopStatus;
  actualArrivalTime?: Date;
  actualDepartureTime?: Date;
  countdownRemainingSeconds: number;
  message: string;
}
