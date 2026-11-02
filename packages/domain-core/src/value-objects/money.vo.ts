import { ValueObject } from '../common/value-object';
import { Result } from '../common/result';

interface MoneyProps {
  amountInPaise: number;
  currency: string;
}

/**
 * Money Value Object.
 * Enforces zero floating-point arithmetic.
 * All internal values are stored in integer minor units (INR Paise: 1 Rupee = 100 Paise).
 */
export class Money extends ValueObject<MoneyProps> {
  get amountInPaise(): number {
    return this.props.amountInPaise;
  }

  get amountInRupees(): number {
    return this.props.amountInPaise / 100;
  }

  get currency(): string {
    return this.props.currency;
  }

  private constructor(props: MoneyProps) {
    super(props);
  }

  public static create(amountInPaise: number, currency: string = 'INR'): Result<Money> {
    if (!Number.isInteger(amountInPaise)) {
      return Result.fail<Money>('Money amount in paise must be a strict integer minor unit');
    }
    if (amountInPaise < 0) {
      return Result.fail<Money>('Money amount cannot be negative');
    }
    return Result.ok<Money>(new Money({ amountInPaise, currency }));
  }

  public static fromRupees(rupees: number, currency: string = 'INR'): Result<Money> {
    if (rupees < 0) {
      return Result.fail<Money>('Money amount cannot be negative');
    }
    // Round to nearest integer paise to eliminate floating point imprecision
    const amountInPaise = Math.round(rupees * 100);
    return Result.ok<Money>(new Money({ amountInPaise, currency }));
  }

  public static zero(currency: string = 'INR'): Money {
    return new Money({ amountInPaise: 0, currency });
  }

  public add(other: Money): Result<Money> {
    if (this.currency !== other.currency) {
      return Result.fail<Money>(`Cannot add money of different currencies: ${this.currency} vs ${other.currency}`);
    }
    return Money.create(this.amountInPaise + other.amountInPaise, this.currency);
  }

  public subtract(other: Money): Result<Money> {
    if (this.currency !== other.currency) {
      return Result.fail<Money>(`Cannot subtract money of different currencies: ${this.currency} vs ${other.currency}`);
    }
    if (this.amountInPaise < other.amountInPaise) {
      return Result.fail<Money>('Resulting money amount cannot be negative');
    }
    return Money.create(this.amountInPaise - other.amountInPaise, this.currency);
  }

  public multiply(factor: number): Result<Money> {
    if (factor < 0) {
      return Result.fail<Money>('Multiplication factor cannot be negative');
    }
    const scaled = Math.round(this.amountInPaise * factor);
    return Money.create(scaled, this.currency);
  }

  public isZero(): boolean {
    return this.amountInPaise === 0;
  }

  public formatINR(): string {
    const rupees = (this.amountInPaise / 100).toFixed(2);
    return `₹${rupees}`;
  }
}

