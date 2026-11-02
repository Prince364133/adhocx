import { IDomainEvent } from '../../common/domain-event';
import { GeoPoint } from '../../value-objects/geo-point.vo';

export class DriverWentOnlineDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName = 'fleet.driver.went_online';

  constructor(
    public readonly aggregateId: string,
    public readonly location: GeoPoint,
    public readonly h3Index: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

export class DriverWentOfflineDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName = 'fleet.driver.went_offline';

  constructor(public readonly aggregateId: string) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

export class DriverSuspendedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName = 'fleet.driver.suspended';

  constructor(
    public readonly aggregateId: string,
    public readonly reason: string,
  ) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}

export class DriverVerifiedDomainEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly eventName = 'fleet.driver.verified';

  constructor(public readonly aggregateId: string) {
    this.eventId = crypto.randomUUID();
    this.occurredOn = new Date();
  }
}
