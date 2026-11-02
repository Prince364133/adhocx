import { AggregateRoot } from '../../common/aggregate-root';
import { Result } from '../../common/result';
import { Money } from '../../value-objects/money.vo';
import { GeoPoint } from '../../value-objects/geo-point.vo';
import {
  RequirementCreatedDomainEvent,
  RequirementAssignedDomainEvent,
  RequirementCompletedDomainEvent,
} from '../events/marketplace.events';

export type RequirementLifecycleStatus =
  | 'DRAFT'
  | 'OPEN_FOR_BIDDING'
  | 'DIRECT_DISPATCH'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'NO_DRIVER_AVAILABLE';

export type MarketplacePricingMode = 'DIRECT_DISPATCH' | 'BIDDING';
export type MarketplaceVehicleCategory = 'HATCHBACK' | 'SEDAN' | 'SUV' | 'AUTO';

export interface RequirementProps {
  requesterId: string;
  pickupLocation: GeoPoint;
  dropLocation: GeoPoint;
  pickupTime: Date;
  pricingMode: MarketplacePricingMode;
  vehicleCategory: MarketplaceVehicleCategory;
  estimatedDistanceMeters: number;
  status: RequirementLifecycleStatus;
  baseBudget?: Money;
  maxBudget?: Money;
  finalFare?: Money;
  winningBidId?: string;
  assignedDriverId?: string;
  cancellationReason?: string;
  createdAt: Date;
}

/**
 * RequirementAggregate.
 * The Domain Aggregate Root for marketplace transport demand.
 * Enforces pricing mode state machines (Direct Dispatch vs Reverse Bidding),
 * distance validity, coordinate consistency, and assignment invariants.
 */
export class RequirementAggregate extends AggregateRoot<string> {
  private _props: RequirementProps;

  get requesterId(): string {
    return this._props.requesterId;
  }

  get pickupLocation(): GeoPoint {
    return this._props.pickupLocation;
  }

  get dropLocation(): GeoPoint {
    return this._props.dropLocation;
  }

  get pickupTime(): Date {
    return this._props.pickupTime;
  }

  get pricingMode(): MarketplacePricingMode {
    return this._props.pricingMode;
  }

  get vehicleCategory(): MarketplaceVehicleCategory {
    return this._props.vehicleCategory;
  }

  get estimatedDistanceMeters(): number {
    return this._props.estimatedDistanceMeters;
  }

  get status(): RequirementLifecycleStatus {
    return this._props.status;
  }

  get baseBudget(): Money | undefined {
    return this._props.baseBudget;
  }

  get maxBudget(): Money | undefined {
    return this._props.maxBudget;
  }

  get finalFare(): Money | undefined {
    return this._props.finalFare;
  }

  get winningBidId(): string | undefined {
    return this._props.winningBidId;
  }

  get assignedDriverId(): string | undefined {
    return this._props.assignedDriverId;
  }

  get cancellationReason(): string | undefined {
    return this._props.cancellationReason;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  private constructor(id: string, props: RequirementProps) {
    super(id);
    this._props = props;
  }

  /**
   * Factory method to create a new RequirementAggregate.
   * Invariant: Distance must be > 0, locations must be valid GeoPoints.
   */
  public static create(id: string, props: RequirementProps): Result<RequirementAggregate> {
    if (!id || id.trim().length === 0) {
      return Result.fail('Requirement ID cannot be empty');
    }
    if (!props.requesterId) {
      return Result.fail('Requester ID is required');
    }
    if (!props.pickupLocation || !props.dropLocation) {
      return Result.fail('Pickup and drop locations are required');
    }
    if (props.estimatedDistanceMeters <= 0) {
      return Result.fail('Estimated trip distance must be strictly greater than 0 meters');
    }
    if (props.baseBudget && props.maxBudget && props.baseBudget.amountInPaise > props.maxBudget.amountInPaise) {
      return Result.fail('Base budget cannot exceed maximum budget ceiling');
    }

    const requirement = new RequirementAggregate(id, { ...props });
    requirement.addDomainEvent(
      new RequirementCreatedDomainEvent(
        id,
        props.requesterId,
        props.pickupLocation,
        props.dropLocation,
        props.pricingMode,
      ),
    );
    return Result.ok(requirement);
  }

  /**
   * Reconstitute from persistence.
   */
  public static reconstitute(id: string, props: RequirementProps): RequirementAggregate {
    return new RequirementAggregate(id, props);
  }

  /**
   * Initiate Reverse Bidding for this requirement.
   * Invariant: Can only transition from DRAFT when pricing mode is BIDDING.
   */
  public openForBidding(): Result<void> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(`Cannot open bidding from status '${this._props.status}'. Must be DRAFT.`);
    }
    if (this._props.pricingMode !== 'BIDDING') {
      return Result.fail("Cannot open bidding for a requirement with pricingMode !== 'BIDDING'");
    }

    this._props.status = 'OPEN_FOR_BIDDING';
    return Result.ok();
  }

  /**
   * Initiate Direct Dispatch wave broadcast.
   * Invariant: Can only transition from DRAFT or NO_DRIVER_AVAILABLE when pricing mode is DIRECT_DISPATCH.
   */
  public startDirectDispatch(): Result<void> {
    if (this._props.status !== 'DRAFT' && this._props.status !== 'NO_DRIVER_AVAILABLE') {
      return Result.fail(
        `Cannot start direct dispatch from status '${this._props.status}'. Must be DRAFT or NO_DRIVER_AVAILABLE.`,
      );
    }
    if (this._props.pricingMode !== 'DIRECT_DISPATCH') {
      return Result.fail("Cannot start direct dispatch for requirement with pricingMode !== 'DIRECT_DISPATCH'");
    }

    this._props.status = 'DIRECT_DISPATCH';
    return Result.ok();
  }

  /**
   * Assign a winning bid or direct dispatch driver.
   * Invariant: Can only assign from OPEN_FOR_BIDDING or DIRECT_DISPATCH.
   */
  public assign(driverId: string, bidId?: string, fare?: Money): Result<void> {
    if (this._props.status !== 'OPEN_FOR_BIDDING' && this._props.status !== 'DIRECT_DISPATCH') {
      return Result.fail(`Cannot assign driver from status '${this._props.status}'`);
    }
    if (!driverId) {
      return Result.fail('driverId is required for assignment');
    }

    this._props.status = 'ASSIGNED';
    this._props.assignedDriverId = driverId;
    this._props.winningBidId = bidId;
    this._props.finalFare = fare;

    this.addDomainEvent(new RequirementAssignedDomainEvent(this.id, driverId, bidId, fare));
    return Result.ok();
  }

  /**
   * Complete the requirement after trip execution.
   */
  public complete(): Result<void> {
    if (this._props.status !== 'ASSIGNED' && this._props.status !== 'IN_PROGRESS') {
      return Result.fail(`Cannot complete requirement from status '${this._props.status}'`);
    }

    this._props.status = 'COMPLETED';
    if (this._props.assignedDriverId) {
      this.addDomainEvent(new RequirementCompletedDomainEvent(this.id, this._props.assignedDriverId));
    }
    return Result.ok();
  }

  /**
   * Cancel the requirement.
   */
  public cancel(reason: string = 'Cancelled by user'): Result<void> {
    if (this._props.status === 'COMPLETED') {
      return Result.fail('Cannot cancel an already completed requirement');
    }

    this._props.status = 'CANCELLED';
    this._props.cancellationReason = reason;
    return Result.ok();
  }

  /**
   * Flag when no eligible driver is available in radius.
   */
  public markNoDriverAvailable(): Result<void> {
    if (this._props.status !== 'DIRECT_DISPATCH') {
      return Result.fail(`Cannot mark NO_DRIVER_AVAILABLE from status '${this._props.status}'`);
    }

    this._props.status = 'NO_DRIVER_AVAILABLE';
    return Result.ok();
  }
}

