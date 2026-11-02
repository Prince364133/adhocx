/**
 * Base interface for all Domain Events.
 * Domain Events record that something meaningful occurred within the domain.
 */
export interface IDomainEvent {
  readonly eventId: string;
  readonly occurredOn: Date;
  readonly aggregateId: string;
  readonly eventName: string;
}

