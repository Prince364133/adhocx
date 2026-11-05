import { AggregateRoot } from '../../common/aggregate-root';
import { Result } from '../../common/result';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationDispatchedEvent, NotificationFailedEvent } from '../events/notification.events';

export type DispatchStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';

export interface NotificationDispatchProps {
  recipient: string; // Phone, Email, FCM token, or User ID
  channel: NotificationChannel;
  title?: string;
  body: string;
  status: DispatchStatus;
  templateId?: string;
  variables?: Record<string, any>;
  messageId?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NotificationDispatch Aggregate Root.
 * Manages the lifecycle of an outbound notification across SMS, Email, Push, or In-App channels.
 */
export class NotificationDispatch extends AggregateRoot<string> {
  private _props: NotificationDispatchProps;

  get recipient(): string {
    return this._props.recipient;
  }

  get channel(): NotificationChannel {
    return this._props.channel;
  }

  get title(): string | undefined {
    return this._props.title;
  }

  get body(): string {
    return this._props.body;
  }

  get status(): DispatchStatus {
    return this._props.status;
  }

  get messageId(): string | undefined {
    return this._props.messageId;
  }

  get error(): string | undefined {
    return this._props.error;
  }

  private constructor(id: string, props: NotificationDispatchProps) {
    super(id);
    this._props = props;
  }

  public static create(
    id: string,
    props: Omit<NotificationDispatchProps, 'status' | 'createdAt' | 'updatedAt'>,
  ): Result<NotificationDispatch> {
    if (!id) {
      return Result.fail<NotificationDispatch>('Dispatch ID is required');
    }
    if (!props.recipient) {
      return Result.fail<NotificationDispatch>('Recipient is required');
    }
    if (!props.body) {
      return Result.fail<NotificationDispatch>('Notification body is required');
    }

    const dispatch = new NotificationDispatch(id, {
      ...props,
      status: 'QUEUED',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return Result.ok<NotificationDispatch>(dispatch);
  }

  public markSent(messageId: string): void {
    this._props.status = 'SENT';
    this._props.messageId = messageId;
    this._props.updatedAt = new Date();

    this.addDomainEvent(
      new NotificationDispatchedEvent(
        this.id,
        this._props.recipient,
        this._props.channel,
        messageId,
      ),
    );
  }

  public markFailed(error: string): void {
    this._props.status = 'FAILED';
    this._props.error = error;
    this._props.updatedAt = new Date();

    this.addDomainEvent(
      new NotificationFailedEvent(
        this.id,
        this._props.recipient,
        this._props.channel,
        error,
      ),
    );
  }
}
