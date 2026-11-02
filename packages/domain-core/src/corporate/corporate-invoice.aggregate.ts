import { AggregateRoot } from '../common/aggregate-root';
import { Result } from '../common/result';
import { Money } from '../value-objects/money.vo';

export type CorporateInvoiceLifecycleStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';

export interface CorporateInvoiceLineProp {
  routeId: string;
  billableDistanceMeters: number;
  amount: Money;
}

export interface CorporateInvoiceProps {
  tenantId: string;
  invoiceNumber: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  lines: CorporateInvoiceLineProp[];
  subtotal: Money;
  gstAmount: Money;
  totalAmount: Money;
  gstRatePct: number;
  status: CorporateInvoiceLifecycleStatus;
  voidReason?: string;
  paidAt?: Date;
}

/**
 * CorporateInvoiceAggregate.
 * Domain Aggregate Root enforcing billing period chronology, non-empty invoice lines,
 * and integer paise GST math (zero floating-point arithmetic).
 */
export class CorporateInvoiceAggregate extends AggregateRoot<string> {
  private _props: CorporateInvoiceProps;

  get tenantId(): string {
    return this._props.tenantId;
  }

  get invoiceNumber(): string {
    return this._props.invoiceNumber;
  }

  get billingPeriodStart(): Date {
    return this._props.billingPeriodStart;
  }

  get billingPeriodEnd(): Date {
    return this._props.billingPeriodEnd;
  }

  get lines(): ReadonlyArray<CorporateInvoiceLineProp> {
    return [...this._props.lines];
  }

  get subtotal(): Money {
    return this._props.subtotal;
  }

  get gstAmount(): Money {
    return this._props.gstAmount;
  }

  get totalAmount(): Money {
    return this._props.totalAmount;
  }

  get gstRatePct(): number {
    return this._props.gstRatePct;
  }

  get status(): CorporateInvoiceLifecycleStatus {
    return this._props.status;
  }

  private constructor(id: string, props: CorporateInvoiceProps) {
    super(id);
    this._props = props;
  }

  public static create(
    id: string,
    params: {
      tenantId: string;
      invoiceNumber: string;
      billingPeriodStart: Date;
      billingPeriodEnd: Date;
      lines: CorporateInvoiceLineProp[];
      gstRatePct?: number; // 5 or 18
      status?: CorporateInvoiceLifecycleStatus;
    },
  ): Result<CorporateInvoiceAggregate> {
    // Invariant 1: Billing period validation
    if (params.billingPeriodStart > params.billingPeriodEnd) {
      return Result.fail('billingPeriodStart cannot be after billingPeriodEnd');
    }

    // Invariant 2: Non-empty line items
    if (params.lines.length === 0) {
      return Result.fail('Invoice must contain at least one line item');
    }

    // Invariant 3: Calculate subtotal in integer paise
    let subtotalPaise = 0;
    for (const line of params.lines) {
      subtotalPaise += line.amount.amountInPaise;
    }

    const subtotalMoney = Money.create(subtotalPaise).getValue();
    const gstRatePct = params.gstRatePct === 18 ? 18 : 5;

    // Integer paise GST: (subtotal * rate) / 100
    const gstPaise = Math.round((subtotalPaise * gstRatePct) / 100);
    const gstMoney = Money.create(gstPaise).getValue();

    const totalMoneyResult = subtotalMoney.add(gstMoney);
    if (!totalMoneyResult.isSuccess) {
      return Result.fail(totalMoneyResult.error!);
    }

    const invoice = new CorporateInvoiceAggregate(id, {
      tenantId: params.tenantId,
      invoiceNumber: params.invoiceNumber,
      billingPeriodStart: params.billingPeriodStart,
      billingPeriodEnd: params.billingPeriodEnd,
      lines: params.lines,
      subtotal: subtotalMoney,
      gstAmount: gstMoney,
      totalAmount: totalMoneyResult.getValue(),
      gstRatePct,
      status: params.status || 'DRAFT',
    });

    return Result.ok(invoice);
  }

  public issue(): Result<void> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(`Cannot issue invoice in status ${this._props.status}`);
    }
    this._props.status = 'ISSUED';
    return Result.ok();
  }

  public markPaid(paidAt: Date = new Date()): Result<void> {
    if (this._props.status !== 'ISSUED') {
      return Result.fail(`Cannot mark invoice as paid in status ${this._props.status}`);
    }
    this._props.status = 'PAID';
    this._props.paidAt = paidAt;
    return Result.ok();
  }

  public void(reason: string): Result<void> {
    if (this._props.status === 'PAID') {
      return Result.fail('Cannot void an invoice that has already been paid');
    }
    this._props.status = 'VOID';
    this._props.voidReason = reason;
    return Result.ok();
  }
}
