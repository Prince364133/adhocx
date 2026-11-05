import { NotificationDispatch } from '../aggregates/notification-dispatch.aggregate';
import { NotificationChannel } from '../enums/notification-channel.enum';

export interface ISmsProviderPort {
  sendSms(
    mobile: string,
    message: string,
    templateId?: string,
    variables?: Record<string, string>,
  ): Promise<{ success: boolean; messageId: string; response?: any }>;
}

export interface INotificationDispatcherPort {
  dispatch(notification: NotificationDispatch): Promise<{ success: boolean; messageId?: string; error?: string }>;
  supportsChannel(channel: NotificationChannel): boolean;
}
