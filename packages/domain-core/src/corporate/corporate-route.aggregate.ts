import { AggregateRoot } from '../common/aggregate-root';
import { Result } from '../common/result';

export type CorporateVehicleCategory = 'SEDAN' | 'SUV';
export type CorporateRouteDirection = 'LOGIN' | 'LOGOUT';
export type CorporateRouteLifecycleStatus =
  | 'PLANNED'
  | 'DISPATCHING'
  | 'ASSIGNED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CorporateRouteStopItem {
  id: string;
  stopSequence: number;
  stopType: 'PICKUP' | 'DROPOFF';
  latitude: number;
  longitude: number;
  employeeId?: string;
  plannedEta: Date;
  status: 'PENDING' | 'ARRIVED' | 'BOARDED' | 'NO_SHOW' | 'CANCELLED';
  boardingOtp: string;
}

export interface CorporateRouteProps {
  tenantId: string;
  officeId: string;
  shiftDate: Date;
  shiftTime: string;
  direction: CorporateRouteDirection;
  vehicleCategory: CorporateVehicleCategory;
  capacityLimit: number;
  status: CorporateRouteLifecycleStatus;
  stops: CorporateRouteStopItem[];
  estDistanceMeters: number;
  targetPickup1Time: Date;
  driverId?: string;
  vehicleId?: string;
  cancellationReason?: string;
}

/**
 * CorporateRouteAggregate.
 * The Domain Aggregate Root enforcing CVRPTW passenger capacity constraints (Sedan <= 4, SUV <= 6),
 * stop ordering, autonomous dispatch transitions, and trip completion invariants.
 */
export class CorporateRouteAggregate extends AggregateRoot<string> {
  private _props: CorporateRouteProps;

  get tenantId(): string {
    return this._props.tenantId;
  }

  get officeId(): string {
    return this._props.officeId;
  }

  get shiftDate(): Date {
    return this._props.shiftDate;
  }

  get shiftTime(): string {
    return this._props.shiftTime;
  }

  get direction(): CorporateRouteDirection {
    return this._props.direction;
  }

  get vehicleCategory(): CorporateVehicleCategory {
    return this._props.vehicleCategory;
  }

  get capacityLimit(): number {
    return this._props.capacityLimit;
  }

  get status(): CorporateRouteLifecycleStatus {
    return this._props.status;
  }

  get stops(): ReadonlyArray<CorporateRouteStopItem> {
    return [...this._props.stops];
  }

  get estDistanceMeters(): number {
    return this._props.estDistanceMeters;
  }

  get targetPickup1Time(): Date {
    return this._props.targetPickup1Time;
  }

  get driverId(): string | undefined {
    return this._props.driverId;
  }

  get vehicleId(): string | undefined {
    return this._props.vehicleId;
  }

  private constructor(id: string, props: CorporateRouteProps) {
    super(id);
    this._props = props;
  }

  public static create(
    id: string,
    props: Omit<CorporateRouteProps, 'capacityLimit' | 'status'> & {
      capacityLimit?: number;
      status?: CorporateRouteLifecycleStatus;
    },
  ): Result<CorporateRouteAggregate> {
    const capacityLimit =
      props.vehicleCategory === 'SEDAN' ? 4 : 6;

    // Invariant 1: Passenger capacity enforcement
    const passengerStops = props.stops.filter((s) => s.stopType === 'PICKUP');
    if (passengerStops.length > capacityLimit) {
      return Result.fail(
        `Capacity violation: ${props.vehicleCategory} cannot seat more than ${capacityLimit} passengers (received ${passengerStops.length})`,
      );
    }

    if (props.stops.length === 0) {
      return Result.fail('Route must contain at least one stop');
    }

    // Invariant 2: Sequences must start from 1 and be contiguous
    const sequences = props.stops.map((s) => s.stopSequence).sort((a, b) => a - b);
    for (let i = 0; i < sequences.length; i++) {
      if (sequences[i] !== i + 1) {
        return Result.fail(`Invalid stop sequences: must be contiguous 1..N`);
      }
    }

    const route = new CorporateRouteAggregate(id, {
      ...props,
      capacityLimit,
      status: props.status || 'PLANNED',
    });

    return Result.ok(route);
  }

  public dispatch(): Result<void> {
    if (this._props.status !== 'PLANNED') {
      return Result.fail(`Cannot dispatch route in status ${this._props.status}`);
    }
    this._props.status = 'DISPATCHING';
    return Result.ok();
  }

  public assignDriver(driverId: string, vehicleId?: string): Result<void> {
    if (this._props.status !== 'PLANNED' && this._props.status !== 'DISPATCHING') {
      return Result.fail(`Cannot assign driver to route in status ${this._props.status}`);
    }
    this._props.driverId = driverId;
    this._props.vehicleId = vehicleId;
    this._props.status = 'ASSIGNED';
    return Result.ok();
  }

  public startTransit(): Result<void> {
    if (this._props.status !== 'ASSIGNED') {
      return Result.fail(`Cannot start transit for route in status ${this._props.status}`);
    }
    this._props.status = 'IN_TRANSIT';
    return Result.ok();
  }

  public complete(): Result<void> {
    if (this._props.status !== 'IN_TRANSIT') {
      return Result.fail(`Cannot complete route in status ${this._props.status}`);
    }

    // Invariant: All stops must be processed (BOARDED, NO_SHOW, CANCELLED, or DROPOFF)
    const unprocessed = this._props.stops.filter(
      (s) => s.stopType === 'PICKUP' && s.status === 'PENDING',
    );
    if (unprocessed.length > 0) {
      return Result.fail(
        `Cannot complete route: ${unprocessed.length} passenger stops remain unprocessed`,
      );
    }

    this._props.status = 'COMPLETED';
    return Result.ok();
  }

  public cancel(reason: string): Result<void> {
    if (this._props.status === 'COMPLETED') {
      return Result.fail('Cannot cancel a completed corporate route');
    }
    this._props.status = 'CANCELLED';
    this._props.cancellationReason = reason;
    return Result.ok();
  }
}
