import { IDomainEvent } from '../../common/domain-event';
import { Money } from '../../value-objects/money.vo';
import { GeoPoint } from '../../value-objects/geo-point.vo';

export class RequirementCreatedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName = 'marketplace.requirement.created';

  constructor(
    public readonly aggregateId: string,
    public readonly requesterId: string,
    public readonly pickupLocation: GeoPoint,
    public readonly dropLocation: GeoPoint,
    public readonly pricingMode: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

export class RequirementAssignedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName = 'marketplace.requirement.assigned';

  constructor(
    public readonly aggregateId: string,
    public readonly driverId: string,
    public readonly finalFare?: Money,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

export class RequirementCompletedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName = 'marketplace.requirement.completed';

  constructor(
    public readonly aggregateId: string,
    public readonly driverId: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
