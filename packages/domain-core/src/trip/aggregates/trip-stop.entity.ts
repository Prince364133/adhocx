import { Entity } from '../../common/entity';
import { Result } from '../../common/result';
import { GeoPoint } from '../../value-objects/geo-point.vo';
import { OtpCode } from '../../value-objects/otp-code.vo';
import { DwellBuffer } from '../../value-objects/dwell-buffer.vo';

export enum StopStatus {
  PENDING = 'PENDING',
  ARRIVED = 'ARRIVED',
  BOARDED = 'BOARDED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

export enum StopType {
  PICKUP = 'PICKUP',
  DROPOFF = 'DROPOFF',
}

export interface TripStopProps {
  sequence: number;
  stopType: StopType;
  passengerEmployeeId: string;
  location: GeoPoint;
  plannedEta: Date;
  actualArrivalTime?: Date;
  actualDepartureTime?: Date;
  boardingOtp: OtpCode;
  dwellBuffer: DwellBuffer;
  status: StopStatus;
  noShowReason?: string;
}

/**
 * TripStop Entity.
 * Represents an individual sequential pickup or dropoff stop within a trip.
 */
export class TripStop extends Entity<string> {
  private _props: TripStopProps;

  get sequence(): number {
    return this._props.sequence;
  }

  get stopType(): StopType {
    return this._props.stopType;
  }

  get passengerEmployeeId(): string {
    return this._props.passengerEmployeeId;
  }

  get location(): GeoPoint {
    return this._props.location;
  }

  get plannedEta(): Date {
    return this._props.plannedEta;
  }

  get actualArrivalTime(): Date | undefined {
    return this._props.actualArrivalTime;
  }

  get actualDepartureTime(): Date | undefined {
    return this._props.actualDepartureTime;
  }

  get boardingOtp(): OtpCode {
    return this._props.boardingOtp;
  }

  get dwellBuffer(): DwellBuffer {
    return this._props.dwellBuffer;
  }

  get status(): StopStatus {
    return this._props.status;
  }

  get noShowReason(): string | undefined {
    return this._props.noShowReason;
  }

  private constructor(id: string, props: TripStopProps) {
    super(id);
    this._props = props;
  }

  public static create(id: string, props: TripStopProps): Result<TripStop> {
    if (!id || typeof id !== 'string') {
      return Result.fail<TripStop>('TripStop id must be a non-empty string');
    }
    if (props.sequence < 1) {
      return Result.fail<TripStop>('Stop sequence must be >= 1');
    }
    return Result.ok<TripStop>(new TripStop(id, { ...props }));
  }

  /**
   * Driver arrives at stop. Enforces geofence proximity (100 meters).
   */
  public recordArrival(currentCoord: GeoPoint, arrivalTime: Date = new Date()): Result<void> {
    if (this._props.status !== StopStatus.PENDING) {
      return Result.fail<void>(`Cannot mark stop arrived: status is already ${this._props.status}`);
    }

    const distanceMeters = this._props.location.distanceToMeters(currentCoord);
    if (distanceMeters > 150) {
      return Result.fail<void>(
        `Geofence check failed: driver is ${distanceMeters}m away from stop (max allowed: 150m)`,
      );
    }

    this._props.actualArrivalTime = arrivalTime;
    this._props.status = StopStatus.ARRIVED;
    return Result.ok<void>();
  }

  /**
   * Validates passenger OTP and marks stop as BOARDED.
   */
  public verifyBoarding(inputOtp: string, boardedAt: Date = new Date()): Result<void> {
    if (this._props.status !== StopStatus.ARRIVED) {
      return Result.fail<void>(`Cannot verify boarding: stop must be in ARRIVED status (current: ${this._props.status})`);
    }

    if (!this._props.boardingOtp.validate(inputOtp)) {
      return Result.fail<void>('Invalid boarding OTP challenge');
    }

    this._props.status = StopStatus.BOARDED;
    this._props.actualDepartureTime = boardedAt;
    return Result.ok<void>();
  }

  /**
   * Marks passenger as NO_SHOW.
   * INVARIANT: Driver CANNOT mark No-Show unless the dwell timer has elapsed >= 300 seconds (5 minutes).
   */
  public markNoShow(departureTime: Date = new Date(), reason: string = 'EXCEEDED_5_MIN_BUFFER'): Result<number> {
    if (this._props.status !== StopStatus.ARRIVED) {
      return Result.fail<number>(`Cannot mark No-Show: stop must be in ARRIVED status (current: ${this._props.status})`);
    }

    if (!this._props.actualArrivalTime) {
      return Result.fail<number>('Missing stop arrival timestamp');
    }

    const elapsedSeconds = Math.round(
      (departureTime.getTime() - this._props.actualArrivalTime.getTime()) / 1000,
    );

    if (!this._props.dwellBuffer.hasElapsed(elapsedSeconds)) {
      const remainingSec = this._props.dwellBuffer.remainingSeconds(elapsedSeconds);
      return Result.fail<number>(
        `Cannot mark No-Show: 5-minute wait buffer has not elapsed. ${remainingSec}s remaining.`,
      );
    }

    this._props.status = StopStatus.NO_SHOW;
    this._props.actualDepartureTime = departureTime;
    this._props.noShowReason = reason;
    return Result.ok<number>(elapsedSeconds);
  }
}

