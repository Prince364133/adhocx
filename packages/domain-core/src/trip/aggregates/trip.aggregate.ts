import { AggregateRoot } from '../../common/aggregate-root';
import { Result } from '../../common/result';
import { GeoPoint } from '../../value-objects/geo-point.vo';
import { Money } from '../../value-objects/money.vo';
import { TripStop, StopStatus } from './trip-stop.entity';
import {
  TripAssignedEvent,
  DriverArrivedAtStopEvent,
  PassengerBoardedEvent,
  PassengerNoShowEvent,
  TripStartedEvent,
  TripCompletedEvent,
  TripCancelledEvent,
} from '../events/trip.events';

export enum TripLifecycleStatus {
  SCHEDULED = 'SCHEDULED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  DRIVER_ARRIVED = 'DRIVER_ARRIVED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface TripAggregateProps {
  tenantId: string;
  routeId: string;
  driverId?: string;
  vehicleId?: string;
  status: TripLifecycleStatus;
  stops: TripStop[];
  totalDistanceMeters: number;
  actualStartTime?: Date;
  actualEndTime?: Date;
  cancellationReason?: string;
}

/**
 * TripAggregate.
 * The primary Aggregate Root governing live trip execution, boarding verification,
 * 5-minute stop wait buffer compliance, and state transitions.
 */
export class TripAggregate extends AggregateRoot<string> {
  private _props: TripAggregateProps;

  get tenantId(): string {
    return this._props.tenantId;
  }

  get routeId(): string {
    return this._props.routeId;
  }

  get driverId(): string | undefined {
    return this._props.driverId;
  }

  get vehicleId(): string | undefined {
    return this._props.vehicleId;
  }

  get status(): TripLifecycleStatus {
    return this._props.status;
  }

  get stops(): ReadonlyArray<TripStop> {
    return this._props.stops;
  }

  get totalDistanceMeters(): number {
    return this._props.totalDistanceMeters;
  }

  get actualStartTime(): Date | undefined {
    return this._props.actualStartTime;
  }

  get actualEndTime(): Date | undefined {
    return this._props.actualEndTime;
  }

  private constructor(id: string, props: TripAggregateProps) {
    super(id);
    this._props = props;
  }

  public static create(id: string, props: TripAggregateProps): Result<TripAggregate> {
    if (!id) {
      return Result.fail<TripAggregate>('Trip id cannot be empty');
    }
    if (!props.tenantId) {
      return Result.fail<TripAggregate>('Trip must be associated with a tenantId');
    }
    if (!props.stops || props.stops.length === 0) {
      return Result.fail<TripAggregate>('Trip must have at least one stop');
    }

    // Sort stops strictly by sequence
    const sortedStops = [...props.stops].sort((a, b) => a.sequence - b.sequence);
    return Result.ok<TripAggregate>(new TripAggregate(id, { ...props, stops: sortedStops }));
  }

  /**
   * Assigns verified driver and vehicle to the route.
   */
  public assignDriver(driverId: string, vehicleId: string): Result<void> {
    if (this._props.status !== TripLifecycleStatus.SCHEDULED) {
      return Result.fail<void>(`Cannot assign driver: trip status is ${this._props.status}`);
    }

    this._props.driverId = driverId;
    this._props.vehicleId = vehicleId;
    this._props.status = TripLifecycleStatus.DRIVER_ASSIGNED;

    this.addDomainEvent(new TripAssignedEvent(this.id, driverId, vehicleId));
    return Result.ok<void>();
  }

  /**
   * Driver arrives at a specific pickup stop.
   * INVARIANT: Driver must complete previous stops before arriving at subsequent stops!
   */
  public driverArrivedAtStop(stopId: string, currentCoord: GeoPoint, arrivalTime: Date = new Date()): Result<void> {
    if (
      this._props.status !== TripLifecycleStatus.DRIVER_ASSIGNED &&
      this._props.status !== TripLifecycleStatus.IN_PROGRESS
    ) {
      return Result.fail<void>(`Cannot record stop arrival in status ${this._props.status}`);
    }

    const stop = this._props.stops.find((s) => s.id === stopId);
    if (!stop) {
      return Result.fail<void>(`Stop ${stopId} not found in trip ${this.id}`);
    }

    // Check stop ordering invariant
    const priorIncomplete = this._props.stops.find(
      (s) => s.sequence < stop.sequence && s.status !== StopStatus.BOARDED && s.status !== StopStatus.NO_SHOW,
    );
    if (priorIncomplete) {
      return Result.fail<void>(
        `Cannot arrive at Stop ${stop.sequence}: Stop ${priorIncomplete.sequence} is not yet completed`,
      );
    }

    const arrivalResult = stop.recordArrival(currentCoord, arrivalTime);
    if (arrivalResult.isFailure) {
      return arrivalResult;
    }

    this._props.status = TripLifecycleStatus.DRIVER_ARRIVED;
    this.addDomainEvent(
      new DriverArrivedAtStopEvent(
        this.id,
        stop.id,
        stop.sequence,
        stop.passengerEmployeeId,
        currentCoord,
        stop.dwellBuffer.bufferSeconds,
        arrivalTime,
      ),
    );
    return Result.ok<void>();
  }

  /**
   * Passenger boards with OTP challenge.
   */
  public verifyPassengerBoarding(stopId: string, inputOtp: string, boardedAt: Date = new Date()): Result<void> {
    const stop = this._props.stops.find((s) => s.id === stopId);
    if (!stop) {
      return Result.fail<void>(`Stop ${stopId} not found in trip ${this.id}`);
    }

    const verifyResult = stop.verifyBoarding(inputOtp, boardedAt);
    if (verifyResult.isFailure) {
      return verifyResult;
    }

    this._props.status = TripLifecycleStatus.IN_PROGRESS;
    if (!this._props.actualStartTime) {
      this._props.actualStartTime = boardedAt;
    }

    this.addDomainEvent(
      new PassengerBoardedEvent(this.id, stop.id, stop.sequence, stop.passengerEmployeeId, boardedAt),
    );
    return Result.ok<void>();
  }

  /**
   * Driver marks passenger as No-Show.
   * INVARIANT: Only allowed if stop dwell buffer (5 minutes) has elapsed!
   */
  public markPassengerNoShow(
    stopId: string,
    departureTime: Date = new Date(),
    reason: string = 'PASSENGER_UNAVAILABLE_AFTER_5_MIN_BUFFER',
  ): Result<void> {
    const stop = this._props.stops.find((s) => s.id === stopId);
    if (!stop) {
      return Result.fail<void>(`Stop ${stopId} not found in trip ${this.id}`);
    }

    const noShowResult = stop.markNoShow(departureTime, reason);
    if (noShowResult.isFailure) {
      return Result.fail<void>(noShowResult.error!);
    }

    const elapsedSeconds = noShowResult.getValue();
    this.addDomainEvent(
      new PassengerNoShowEvent(
        this.id,
        stop.id,
        stop.sequence,
        stop.passengerEmployeeId,
        elapsedSeconds,
        reason,
        departureTime,
      ),
    );
    return Result.ok<void>();
  }

  /**
   * Concludes the trip at destination.
   * INVARIANT: All stops must be processed (BOARDED, NO_SHOW, or CANCELLED).
   */
  public completeTrip(totalDistanceMeters: number, tollAmount?: Money, completedAt: Date = new Date()): Result<void> {
    if (
      this._props.status !== TripLifecycleStatus.IN_PROGRESS &&
      this._props.status !== TripLifecycleStatus.DRIVER_ARRIVED
    ) {
      return Result.fail<void>(`Cannot complete trip in status ${this._props.status}`);
    }

    const pendingStop = this._props.stops.find(
      (s) => s.status === StopStatus.PENDING || s.status === StopStatus.ARRIVED,
    );
    if (pendingStop) {
      return Result.fail<void>(
        `Cannot complete trip: Stop ${pendingStop.sequence} (${pendingStop.passengerEmployeeId}) is still ${pendingStop.status}`,
      );
    }

    this._props.status = TripLifecycleStatus.COMPLETED;
    this._props.actualEndTime = completedAt;
    this._props.totalDistanceMeters = totalDistanceMeters;

    this.addDomainEvent(
      new TripCompletedEvent(this.id, this._props.driverId ?? 'UNKNOWN', totalDistanceMeters, tollAmount, completedAt),
    );
    return Result.ok<void>();
  }

  /**
   * Cancels the trip.
   */
  public cancelTrip(reason: string, cancelledBy: string, cancelledAt: Date = new Date()): Result<void> {
    if (this._props.status === TripLifecycleStatus.COMPLETED) {
      return Result.fail<void>('Cannot cancel an already completed trip');
    }

    this._props.status = TripLifecycleStatus.CANCELLED;
    this._props.cancellationReason = reason;

    this.addDomainEvent(new TripCancelledEvent(this.id, reason, cancelledBy, cancelledAt));
    return Result.ok<void>();
  }
}
