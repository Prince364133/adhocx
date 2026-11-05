import { IDomainEvent } from '../../common/domain-event';
import { NotificationChannel } from '../enums/notification-channel.enum';

export class NotificationDispatchedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'Notification.Dispatched';

  constructor(
    public readonly dispatchId: string,
    public readonly recipient: string,
    public readonly channel: NotificationChannel,
    public readonly messageId: string,
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.occurredOn = new Date();
    this.aggregateId = dispatchId;
  }
}

export class NotificationFailedEvent implements IDomainEvent {
  public readonly eventId: string;
  public readonly occurredOn: Date;
  public readonly aggregateId: string;
  public readonly eventName = 'Notification.Failed';

  constructor(
    public readonly dispatchId: string,
    public readonly recipient: string,
    public readonly channel: NotificationChannel,
    public readonly error: string,
  ) {
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.occurredOn = new Date();
    this.aggregateId = dispatchId;
  }
}

