export interface ArriveAtStopDto {
  driverLatitude: number;
  driverLongitude: number;
}

export interface VerifyStopOtpDto {
  otpCode: string;
}

export interface MarkNoShowDto {
  reason?: string;
  driverLatitude?: number;
  driverLongitude?: number;
}

export interface RescheduleRequestDto {
  employeeId: string;
  newShiftTime?: string; // HH:mm
  action: 'CANCEL' | 'RESCHEDULE';
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

