import { IDomainEvent } from '../../common/domain-event';
import { Money } from '../../value-objects/money.vo';

export class DriverOfferSentEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'driver_offer.sent';

  constructor(
    public readonly offerId: string,
    public readonly driverId: string,
    public readonly routeId: string,
    public readonly payout: Money,
    public readonly expiresAt: Date,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${offerId}-sent`;
    this.occurredOn = occurredOn;
    this.aggregateId = offerId;
  }
}

export class DriverOfferAcceptedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'driver_offer.accepted';

  constructor(
    public readonly offerId: string,
    public readonly driverId: string,
    public readonly routeId: string,
    public readonly acceptedAt: Date,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${offerId}-accepted`;
    this.occurredOn = occurredOn;
    this.aggregateId = offerId;
  }
}

export class DriverOfferRejectedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'driver_offer.rejected';

  constructor(
    public readonly offerId: string,
    public readonly driverId: string,
    public readonly routeId: string,
    public readonly reason?: string,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${offerId}-rejected`;
    this.occurredOn = occurredOn;
    this.aggregateId = offerId;
  }
}

export class DriverOfferExpiredEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'driver_offer.expired';

  constructor(
    public readonly offerId: string,
    public readonly driverId: string,
    public readonly routeId: string,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${offerId}-expired`;
    this.occurredOn = occurredOn;
    this.aggregateId = offerId;
  }
}

