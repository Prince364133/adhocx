import { IDomainEvent } from '../../common/domain-event';
import { GeoPoint } from '../../value-objects/geo-point.vo';
import { Money } from '../../value-objects/money.vo';

export class TripAssignedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'trip.assigned';

  constructor(
    public readonly tripId: string,
    public readonly driverId: string,
    public readonly vehicleId: string,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${tripId}-${occurredOn.getTime()}-assigned`;
    this.occurredOn = occurredOn;
    this.aggregateId = tripId;
  }
}

export class DriverArrivedAtStopEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'driver.arrived_at_stop';

  constructor(
    public readonly tripId: string,
    public readonly stopId: string,
    public readonly stopSequence: number,
    public readonly passengerEmployeeId: string,
    public readonly arrivalCoord: GeoPoint,
    public readonly dwellBufferSeconds: number,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${tripId}-${stopId}-arrived`;
    this.occurredOn = occurredOn;
    this.aggregateId = tripId;
  }
}

export class PassengerBoardedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'passenger.boarded';

  constructor(
    public readonly tripId: string,
    public readonly stopId: string,
    public readonly stopSequence: number,
    public readonly passengerEmployeeId: string,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${tripId}-${stopId}-boarded`;
    this.occurredOn = occurredOn;
    this.aggregateId = tripId;
  }
}

export class PassengerNoShowEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'passenger.no_show';

  constructor(
    public readonly tripId: string,
    public readonly stopId: string,
    public readonly stopSequence: number,
    public readonly passengerEmployeeId: string,
    public readonly elapsedDwellSeconds: number,
    public readonly reason: string,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${tripId}-${stopId}-no_show`;
    this.occurredOn = occurredOn;
    this.aggregateId = tripId;
  }
}

export class TripStartedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'trip.started';

  constructor(
    public readonly tripId: string,
    public readonly driverId: string,
    public readonly startCoord: GeoPoint,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${tripId}-${occurredOn.getTime()}-started`;
    this.occurredOn = occurredOn;
    this.aggregateId = tripId;
  }
}

export class TripCompletedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'trip.completed';

  constructor(
    public readonly tripId: string,
    public readonly driverId: string,
    public readonly totalDistanceMeters: number,
    public readonly tollAmount?: Money,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${tripId}-${occurredOn.getTime()}-completed`;
    this.occurredOn = occurredOn;
    this.aggregateId = tripId;
  }
}

export class TripCancelledEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'trip.cancelled';

  constructor(
    public readonly tripId: string,
    public readonly reason: string,
    public readonly cancelledBy: string,
    occurredOn: Date = new Date(),
  ) {
    this.eventId = `${tripId}-${occurredOn.getTime()}-cancelled`;
    this.occurredOn = occurredOn;
    this.aggregateId = tripId;
  }
}

