import { IDomainEvent } from '../../common/domain-event';
import { Money } from '../../value-objects/money.vo';

export class LedgerAccountCreditedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName = 'finance.ledger.credited';

  constructor(
    public readonly aggregateId: string,
    public readonly amount: Money,
    public readonly newBalance: Money,
    public readonly referenceId?: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

export class LedgerAccountDebitedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName = 'finance.ledger.debited';

  constructor(
    public readonly aggregateId: string,
    public readonly amount: Money,
    public readonly newBalance: Money,
    public readonly referenceId?: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

export class SettlementBatchDisbursedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName = 'finance.settlement.disbursed';

  constructor(
    public readonly aggregateId: string,
    public readonly batchNumber: string,
    public readonly totalNetDisbursed: Money,
    public readonly driverCount: number,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
