import { AggregateRoot } from '../../common/aggregate-root';
import { Result } from '../../common/result';
import { GeoPoint } from '../../value-objects/geo-point.vo';
import { H3Index } from '../../value-objects/h3-index.vo';
import {
  DriverWentOnlineDomainEvent,
  DriverWentOfflineDomainEvent,
  DriverSuspendedDomainEvent,
  DriverVerifiedDomainEvent,
} from '../events/fleet.events';

export type DriverVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type DriverDutyStatus = 'OFFLINE' | 'ONLINE' | 'BUSY';

export interface DriverProps {
  userId: string;
  verificationStatus: DriverVerificationStatus;
  dutyStatus: DriverDutyStatus;
  licenseNumber: string;
  licenseExpiry: Date;
  currentLocation?: GeoPoint;
  currentH3Index?: H3Index;
  activeTripId?: string;
  trustScore: number;
  suspensionReason?: string;
  createdAt: Date;
}

/**
 * DriverAggregate.
 * Encapsulates driver compliance, verification, duty lifecycle,
 * and dispatch eligibility invariants.
 */
export class DriverAggregate extends AggregateRoot<string> {
  private _props: DriverProps;

  get userId(): string {
    return this._props.userId;
  }

  get verificationStatus(): DriverVerificationStatus {
    return this._props.verificationStatus;
  }

  get dutyStatus(): DriverDutyStatus {
    return this._props.dutyStatus;
  }

  get licenseNumber(): string {
    return this._props.licenseNumber;
  }

  get licenseExpiry(): Date {
    return this._props.licenseExpiry;
  }

  get currentLocation(): GeoPoint | undefined {
    return this._props.currentLocation;
  }

  get currentH3Index(): H3Index | undefined {
    return this._props.currentH3Index;
  }

  get activeTripId(): string | undefined {
    return this._props.activeTripId;
  }

  get trustScore(): number {
    return this._props.trustScore;
  }

  get suspensionReason(): string | undefined {
    return this._props.suspensionReason;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  private constructor(id: string, props: DriverProps) {
    super(id);
    this._props = props;
  }

  public static create(id: string, props: DriverProps): Result<DriverAggregate> {
    if (!id || id.trim().length === 0) {
      return Result.fail('Driver ID cannot be empty');
    }
    if (!props.userId) {
      return Result.fail('User ID is required');
    }
    if (!props.licenseNumber || props.licenseNumber.trim().length === 0) {
      return Result.fail('Driver license number is required');
    }

    return Result.ok(new DriverAggregate(id, { ...props }));
  }

  public static reconstitute(id: string, props: DriverProps): DriverAggregate {
    return new DriverAggregate(id, props);
  }

  /**
   * Check if driver's commercial license is currently active.
   */
  public isLicenseValid(currentDate: Date = new Date()): boolean {
    return this._props.licenseExpiry.getTime() >= currentDate.getTime();
  }

  /**
   * Evaluates if driver is compliant and eligible to receive trip offers.
   * Invariant: Driver must be VERIFIED, license unexpired, and not SUSPENDED.
   */
  public canAcceptOffers(currentDate: Date = new Date()): boolean {
    return (
      this._props.verificationStatus === 'VERIFIED' &&
      this._props.dutyStatus === 'ONLINE' &&
      this.isLicenseValid(currentDate) &&
      !this._props.activeTripId
    );
  }

  /**
   * Driver goes online to receive offers.
   * Invariant: Cannot go online if unverified, suspended, or license expired.
   */
  public goOnline(location: GeoPoint, h3Index: H3Index, currentDate: Date = new Date()): Result<void> {
    if (this._props.verificationStatus !== 'VERIFIED') {
      return Result.fail(
        `Driver cannot go online while verification status is '${this._props.verificationStatus}'. Must be VERIFIED.`,
      );
    }
    if (!this.isLicenseValid(currentDate)) {
      return Result.fail('Driver commercial license has expired. Compliance blocked.');
    }

    this._props.dutyStatus = 'ONLINE';
    this._props.currentLocation = location;
    this._props.currentH3Index = h3Index;

    this.addDomainEvent(new DriverWentOnlineDomainEvent(this.id, location, h3Index.index));
    return Result.ok();
  }

  /**
   * Driver goes offline.
   * Invariant: Cannot go offline if currently BUSY on an active trip.
   */
  public goOffline(): Result<void> {
    if (this._props.dutyStatus === 'BUSY' || this._props.activeTripId) {
      return Result.fail('Cannot go offline while actively engaged on a trip');
    }

    this._props.dutyStatus = 'OFFLINE';
    this.addDomainEvent(new DriverWentOfflineDomainEvent(this.id));
    return Result.ok();
  }

  /**
   * Lock driver to an active trip.
   */
  public assignTrip(tripId: string): Result<void> {
    if (this._props.dutyStatus === 'BUSY' || this._props.activeTripId) {
      return Result.fail(`Driver is already assigned to active trip '${this._props.activeTripId}'`);
    }

    this._props.dutyStatus = 'BUSY';
    this._props.activeTripId = tripId;
    return Result.ok();
  }

  /**
   * Release driver from active trip upon completion or cancellation.
   */
  public releaseTrip(): Result<void> {
    this._props.activeTripId = undefined;
    this._props.dutyStatus = 'ONLINE';
    return Result.ok();
  }

  /**
   * Suspend driver for compliance or safety violations.
   */
  public suspend(reason: string): Result<void> {
    this._props.verificationStatus = 'SUSPENDED';
    this._props.dutyStatus = 'OFFLINE';
    this._props.suspensionReason = reason;

    this.addDomainEvent(new DriverSuspendedDomainEvent(this.id, reason));
    return Result.ok();
  }

  /**
   * Verify driver KYC and compliance.
   */
  public verify(): Result<void> {
    this._props.verificationStatus = 'VERIFIED';
    this.addDomainEvent(new DriverVerifiedDomainEvent(this.id));
    return Result.ok();
  }

  /**
   * Adjust trust score with bounds [0, 100].
   */
  public adjustTrustScore(delta: number): void {
    const next = this._props.trustScore + delta;
    this._props.trustScore = Math.max(0, Math.min(100, Math.round(next)));
  }
}
