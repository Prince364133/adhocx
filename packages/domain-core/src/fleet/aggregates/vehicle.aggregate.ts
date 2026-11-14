import { AggregateRoot } from '../../common/aggregate-root';
import { Result } from '../../common/result';

export type FleetVehicleCategory = string;

export interface VehicleProps {
  driverId: string;
  registrationNumber: string;
  category: FleetVehicleCategory;
  seatingCapacity: number;
  categoryCapacityLimit: number;
  insuranceExpiry: Date;
  rcExpiry: Date;
  fitnessExpiry?: Date;
  isVerified: boolean;
  createdAt: Date;
}

/**
 * VehicleAggregate.
 * Encapsulates commercial fleet compliance: Indian registration validation,
 * category-specific seating limits supplied by the active vehicle catalogue, and RC/insurance
 * road legality.
 */
export class VehicleAggregate extends AggregateRoot<string> {
  private _props: VehicleProps;

  get driverId(): string {
    return this._props.driverId;
  }

  get registrationNumber(): string {
    return this._props.registrationNumber;
  }

  get category(): FleetVehicleCategory {
    return this._props.category;
  }

  get seatingCapacity(): number {
    return this._props.seatingCapacity;
  }

  get insuranceExpiry(): Date {
    return this._props.insuranceExpiry;
  }

  get rcExpiry(): Date {
    return this._props.rcExpiry;
  }

  get fitnessExpiry(): Date | undefined {
    return this._props.fitnessExpiry;
  }

  get isVerified(): boolean {
    return this._props.isVerified;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  private constructor(id: string, props: VehicleProps) {
    super(id);
    this._props = props;
  }

  /**
   * Factory method to create a VehicleAggregate.
   * Invariant: The vehicle's seating capacity cannot exceed its catalogue category limit.
   */
  public static create(id: string, props: VehicleProps): Result<VehicleAggregate> {
    if (!id || id.trim().length === 0) {
      return Result.fail('Vehicle ID cannot be empty');
    }
    if (!props.registrationNumber || props.registrationNumber.trim().length < 5) {
      return Result.fail('Valid commercial vehicle registration number is required');
    }

    if (!Number.isInteger(props.categoryCapacityLimit) || props.categoryCapacityLimit <= 0) {
      return Result.fail('Category capacity limit must be a positive integer');
    }
    if (
      !Number.isInteger(props.seatingCapacity) ||
      props.seatingCapacity <= 0 ||
      props.seatingCapacity > props.categoryCapacityLimit
    ) {
      return Result.fail(
        `Vehicle seating capacity must be between 1 and ${props.categoryCapacityLimit}. Provided: ${props.seatingCapacity}`,
      );
    }
    if (!props.category.trim()) {
      return Result.fail('Vehicle category is required');
    }
    return Result.ok(new VehicleAggregate(id, { ...props }));
  }

  public static reconstitute(id: string, props: VehicleProps): VehicleAggregate {
    return new VehicleAggregate(id, props);
  }

  /**
   * Verifies if vehicle documents (RC, Insurance) are active and unexpired.
   */
  public isRoadLegal(currentDate: Date = new Date()): boolean {
    const isRcValid = this._props.rcExpiry.getTime() >= currentDate.getTime();
    const isInsuranceValid = this._props.insuranceExpiry.getTime() >= currentDate.getTime();
    return isRcValid && isInsuranceValid && this._props.isVerified;
  }

  /**
   * Approve vehicle verification after document audit.
   */
  public verify(): Result<void> {
    if (this._props.isVerified) {
      return Result.ok();
    }
    this._props.isVerified = true;
    return Result.ok();
  }
}

