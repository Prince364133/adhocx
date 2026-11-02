import { AggregateRoot } from '../../common/aggregate-root';
import { Result } from '../../common/result';
import { Money } from '../../value-objects/money.vo';
import { SettlementBatchDisbursedDomainEvent } from '../events/finance.events';

export type SettlementBatchStatus = 'DRAFT' | 'PROCESSING' | 'SETTLED' | 'FAILED';

export interface SettlementBatchItem {
  driverId: string;
  tripId?: string;
  grossAmount: Money;
  tdsDeduction: Money; // 1% Section 194C
  platformFee: Money;
  netPayout: Money;
}

export interface SettlementBatchProps {
  batchNumber: string;
  status: SettlementBatchStatus;
  items: SettlementBatchItem[];
  totalGrossAmount: Money;
  totalTdsDeduction: Money;
  totalPlatformFee: Money;
  totalNetDisbursed: Money;
  failureReason?: string;
  createdAt: Date;
}

/**
 * SettlementBatchAggregate.
 * Encapsulates driver commute and marketplace weekly/daily payout aggregation,
 * Section 194C mandatory 1% TDS calculation, and atomic settlement transitions.
 */
export class SettlementBatchAggregate extends AggregateRoot<string> {
  private _props: SettlementBatchProps;

  get batchNumber(): string {
    return this._props.batchNumber;
  }

  get status(): SettlementBatchStatus {
    return this._props.status;
  }

  get items(): ReadonlyArray<SettlementBatchItem> {
    return this._props.items;
  }

  get totalGrossAmount(): Money {
    return this._props.totalGrossAmount;
  }

  get totalTdsDeduction(): Money {
    return this._props.totalTdsDeduction;
  }

  get totalPlatformFee(): Money {
    return this._props.totalPlatformFee;
  }

  get totalNetDisbursed(): Money {
    return this._props.totalNetDisbursed;
  }

  get failureReason(): string | undefined {
    return this._props.failureReason;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  private constructor(id: string, props: SettlementBatchProps) {
    super(id);
    this._props = props;
  }

  /**
   * Factory method to create a new SettlementBatchAggregate.
   * Invariant: Total Net must exactly equal Total Gross - Total TDS - Total Platform Fee.
   */
  public static create(id: string, props: SettlementBatchProps): Result<SettlementBatchAggregate> {
    if (!id || id.trim().length === 0) {
      return Result.fail('Settlement batch ID cannot be empty');
    }
    if (!props.batchNumber) {
      return Result.fail('batchNumber is required');
    }
    if (!props.items || props.items.length === 0) {
      return Result.fail('Settlement batch must contain at least one item');
    }

    // Verify mathematical integrity: Gross - TDS - PlatformFee == Net
    const expectedNetPaise =
      props.totalGrossAmount.amountInPaise -
      props.totalTdsDeduction.amountInPaise -
      props.totalPlatformFee.amountInPaise;

    if (props.totalNetDisbursed.amountInPaise !== expectedNetPaise) {
      return Result.fail(
        `Financial invariant failed: totalNetDisbursed (${props.totalNetDisbursed.amountInPaise}) !== gross (${props.totalGrossAmount.amountInPaise}) - tds (${props.totalTdsDeduction.amountInPaise}) - fee (${props.totalPlatformFee.amountInPaise})`,
      );
    }

    return Result.ok(new SettlementBatchAggregate(id, { ...props }));
  }

  public static reconstitute(id: string, props: SettlementBatchProps): SettlementBatchAggregate {
    return new SettlementBatchAggregate(id, props);
  }

  /**
   * Transition batch to PROCESSING for IMPS/RazorpayX bank file dispatch.
   */
  public markProcessing(): Result<void> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(`Cannot mark processing from status '${this._props.status}'. Must be DRAFT.`);
    }

    this._props.status = 'PROCESSING';
    return Result.ok();
  }

  /**
   * Mark batch as SETTLED upon successful bank webhook reconciliation.
   */
  public markSettled(): Result<void> {
    if (this._props.status !== 'PROCESSING') {
      return Result.fail(`Cannot mark settled from status '${this._props.status}'. Must be PROCESSING.`);
    }

    this._props.status = 'SETTLED';
    this.addDomainEvent(
      new SettlementBatchDisbursedDomainEvent(
        this.id,
        this._props.batchNumber,
        this._props.totalNetDisbursed,
        this._props.items.length,
      ),
    );
    return Result.ok();
  }

  /**
   * Mark batch as FAILED if bank settlement webhook rejects transfer.
   */
  public markFailed(reason: string): Result<void> {
    if (this._props.status === 'SETTLED') {
      return Result.fail('Cannot mark an already SETTLED batch as FAILED');
    }

    this._props.status = 'FAILED';
    this._props.failureReason = reason;
    return Result.ok();
  }
}

