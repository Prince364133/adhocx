import { Entity } from './entity';
import { IDomainEvent } from './domain-event';

/**
 * Aggregate Root base class.
 * Aggregates define transactional consistency boundaries around one or more entities and value objects.
 * External actors can only interact through the Aggregate Root.
 */
export abstract class AggregateRoot<TIdentifier> extends Entity<TIdentifier> {
  private _domainEvents: IDomainEvent[] = [];

  get domainEvents(): ReadonlyArray<IDomainEvent> {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: IDomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearDomainEvents(): IDomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}

