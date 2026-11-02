import { AggregateRoot } from '../../common/aggregate-root';
import { Result } from '../../common/result';
import { Money } from '../../value-objects/money.vo';
import { BidSubmittedDomainEvent, BidAcceptedDomainEvent } from '../events/marketplace.events';

export type BidStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'WITHDRAWN';

export interface BidProps {
  requirementId: string;
  driverId: string;
  vehicleId: string;
  amount: Money;
  status: BidStatus;
  expiresAt: Date;
  rejectionReason?: string;
  createdAt: Date;
}

/**
 * BidAggregate.
 * Encapsulates driver quotation submission, price positivity invariant,
 * expiration verification, and status transitions within the marketplace reverse bidding context.
 */
export class BidAggregate extends AggregateRoot<string> {
  private _props: BidProps;

  get requirementId(): string {
    return this._props.requirementId;
  }

  get driverId(): string {
    return this._props.driverId;
  }

  get vehicleId(): string {
    return this._props.vehicleId;
  }

  get amount(): Money {
    return this._props.amount;
  }

  get status(): BidStatus {
    return this._props.status;
  }

  get expiresAt(): Date {
    return this._props.expiresAt;
  }

  get rejectionReason(): string | undefined {
    return this._props.rejectionReason;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  private constructor(id: string, props: BidProps) {
    super(id);
    this._props = props;
  }

  /**
   * Factory method to create a new BidAggregate.
   * Invariant: Bid amount must be strictly greater than zero (no free or negative bids).
   */
  public static create(id: string, props: BidProps): Result<BidAggregate> {
    if (!id || id.trim().length === 0) {
      return Result.fail('Bid id cannot be empty');
    }
    if (!props.requirementId) {
      return Result.fail('Requirement ID is mandatory for a bid');
    }
    if (!props.driverId) {
      return Result.fail('Driver ID is mandatory for a bid');
    }
    if (!props.amount || props.amount.isZero() || props.amount.amountInPaise <= 0) {
      return Result.fail('Bid quotation amount must be strictly positive');
    }
    if (props.expiresAt && props.expiresAt.getTime() <= props.createdAt.getTime()) {
      return Result.fail('Bid expiry must be strictly in the future of its creation');
    }

    const bid = new BidAggregate(id, { ...props });
    bid.addDomainEvent(
      new BidSubmittedDomainEvent(id, props.requirementId, props.driverId, props.amount),
    );
    return Result.ok(bid);
  }

  /**
   * Reconstitutes an existing BidAggregate from persistence.
   */
  public static reconstitute(id: string, props: BidProps): BidAggregate {
    return new BidAggregate(id, props);
  }

  /**
   * Check if the bid has passed its expiration timestamp.
   */
  public isExpired(currentTime: Date = new Date()): boolean {
    return currentTime.getTime() > this._props.expiresAt.getTime();
  }

  /**
   * Accept this bid as the winning quotation.
   * Invariant: Can only accept PENDING, non-expired bids.
   */
  public accept(currentTime: Date = new Date()): Result<void> {
    if (this._props.status !== 'PENDING') {
      return Result.fail(`Cannot accept bid in status '${this._props.status}'. Must be PENDING.`);
    }
    if (this.isExpired(currentTime)) {
      this._props.status = 'EXPIRED';
      return Result.fail('Cannot accept an expired bid quotation');
    }

    this._props.status = 'ACCEPTED';
    this.addDomainEvent(
      new BidAcceptedDomainEvent(this.id, this._props.requirementId, this._props.driverId, this._props.amount),
    );
    return Result.ok();
  }

  /**
   * Reject the bid.
   */
  public reject(reason: string = 'Outcompeted or rejected by requester'): Result<void> {
    if (this._props.status !== 'PENDING') {
      return Result.fail(`Cannot reject bid in status '${this._props.status}'. Must be PENDING.`);
    }

    this._props.status = 'REJECTED';
    this._props.rejectionReason = reason;
    return Result.ok();
  }

  /**
   * Mark bid as expired.
   */
  public markExpired(): Result<void> {
    if (this._props.status === 'ACCEPTED') {
      return Result.fail('Cannot expire an already ACCEPTED bid');
    }
    this._props.status = 'EXPIRED';
    return Result.ok();
  }
}
