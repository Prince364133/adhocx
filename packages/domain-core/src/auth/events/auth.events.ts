import { IDomainEvent } from '../../common/domain-event';

export class UserSessionCreatedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'Auth.UserSessionCreated';

  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly role: string,
    public readonly channel: string,
    public readonly ipAddress?: string,
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.occurredOn = new Date();
    this.aggregateId = sessionId;
  }
}

export class UserOtpDispatchedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'Auth.UserOtpDispatched';

  constructor(
    public readonly recipient: string,
    public readonly channel: 'SMS' | 'EMAIL',
    public readonly requestId: string,
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.occurredOn = new Date();
    this.aggregateId = requestId;
  }
}

export class UserSessionRevokedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'Auth.UserSessionRevoked';

  constructor(
    public readonly sessionId: string,
    public readonly userId: string,
    public readonly reason: string,
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.occurredOn = new Date();
    this.aggregateId = sessionId;
  }
}

