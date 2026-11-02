import { AggregateRoot } from '../../common/aggregate-root';
import { Result } from '../../common/result';

export type FleetVehicleCategory = 'HATCHBACK' | 'SEDAN' | 'SUV' | 'AUTO';

export interface VehicleProps {
  driverId: string;
  registrationNumber: string;
  category: FleetVehicleCategory;
  seatingCapacity: number;
  insuranceExpiry: Date;
  rcExpiry: Date;
  fitnessExpiry?: Date;
  isVerified: boolean;
  createdAt: Date;
}

/**
 * VehicleAggregate.
 * Encapsulates commercial fleet compliance: Indian registration validation,
 * hard seating limits (Sedan <= 4, SUV <= 6, Auto <= 3), and RC/insurance road legality.
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
   * Invariant: Capacity limits (Sedan <= 4, SUV <= 6, Auto <= 3).
   */
  public static create(id: string, props: VehicleProps): Result<VehicleAggregate> {
    if (!id || id.trim().length === 0) {
      return Result.fail('Vehicle ID cannot be empty');
    }
    if (!props.registrationNumber || props.registrationNumber.trim().length < 5) {
      return Result.fail('Valid commercial vehicle registration number is required');
    }

    // Capacity invariant checks
    if (props.category === 'SEDAN' && props.seatingCapacity > 4) {
      return Result.fail(`Sedan capacity cannot exceed 4 passengers. Provided: ${props.seatingCapacity}`);
    }
    if (props.category === 'SUV' && props.seatingCapacity > 6) {
      return Result.fail(`SUV capacity cannot exceed 6 passengers. Provided: ${props.seatingCapacity}`);
    }
    if (props.category === 'AUTO' && props.seatingCapacity > 3) {
      return Result.fail(`Auto capacity cannot exceed 3 passengers. Provided: ${props.seatingCapacity}`);
    }
    if (props.seatingCapacity <= 0) {
      return Result.fail('Seating capacity must be at least 1');
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

