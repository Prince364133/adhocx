import { Entity } from '../../common/entity';
import { Result } from '../../common/result';
import { Money } from '../../value-objects/money.vo';

export type LedgerAccountType =
  | 'DRIVER_WALLET'
  | 'VENDOR_ESCROW'
  | 'PLATFORM_REVENUE'
  | 'TAX_PAYABLE_TDS'
  | 'TAX_PAYABLE_GST';

export interface LedgerAccountProps {
  accountType: LedgerAccountType;
  ownerId?: string;
  balance: Money;
  currency: string;
  isLocked: boolean;
  createdAt: Date;
}

/**
 * LedgerAccount.
 * Domain Entity maintaining financial integrity for platform wallets, escrow, and taxes.
 * Enforces zero-overdraft invariants and integer-paise math.
 */
export class LedgerAccount extends Entity<string> {
  private _props: LedgerAccountProps;

  get accountType(): LedgerAccountType {
    return this._props.accountType;
  }

  get ownerId(): string | undefined {
    return this._props.ownerId;
  }

  get balance(): Money {
    return this._props.balance;
  }

  get currency(): string {
    return this._props.currency;
  }

  get isLocked(): boolean {
    return this._props.isLocked;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  private constructor(id: string, props: LedgerAccountProps) {
    super(id);
    this._props = props;
  }

  public static create(id: string, props: LedgerAccountProps): Result<LedgerAccount> {
    if (!id || id.trim().length === 0) {
      return Result.fail('LedgerAccount ID cannot be empty');
    }
    if (!props.balance) {
      return Result.fail('Initial balance Money VO is required');
    }

    return Result.ok(new LedgerAccount(id, { ...props }));
  }

  public static reconstitute(id: string, props: LedgerAccountProps): LedgerAccount {
    return new LedgerAccount(id, props);
  }

  /**
   * Credit an incoming amount to the account.
   */
  public credit(amount: Money): Result<void> {
    if (this._props.isLocked) {
      return Result.fail(`Cannot credit locked account '${this.id}'`);
    }
    if (amount.isZero() || amount.amountInPaise <= 0) {
      return Result.fail('Credit amount must be strictly positive');
    }

    const nextBalance = this._props.balance.add(amount);
    if (nextBalance.isFailure) {
      return Result.fail(nextBalance.error!);
    }

    this._props.balance = nextBalance.getValue();
    return Result.ok();
  }

  /**
   * Debit an outgoing amount from the account.
   * Invariant: Driver wallets and escrow accounts cannot overdraft below zero.
   */
  public debit(amount: Money): Result<void> {
    if (this._props.isLocked) {
      return Result.fail(`Cannot debit locked account '${this.id}'`);
    }
    if (amount.isZero() || amount.amountInPaise <= 0) {
      return Result.fail('Debit amount must be strictly positive');
    }

    // Overdraft check for wallets and escrow
    if (
      (this._props.accountType === 'DRIVER_WALLET' || this._props.accountType === 'VENDOR_ESCROW') &&
      this._props.balance.amountInPaise < amount.amountInPaise
    ) {
      return Result.fail(
        `Insufficient funds. Current balance: ${this._props.balance.formatINR()}, required: ${amount.formatINR()}`,
      );
    }

    const nextBalance = this._props.balance.subtract(amount);
    if (nextBalance.isFailure) {
      return Result.fail(nextBalance.error!);
    }

    this._props.balance = nextBalance.getValue();
    return Result.ok();
  }

  public lock(): void {
    this._props.isLocked = true;
  }

  public unlock(): void {
    this._props.isLocked = false;
  }
}
