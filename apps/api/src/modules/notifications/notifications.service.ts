import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { RedisService } from '../../redis/redis.service';

export interface RealtimeEvent<T = any> {
  channel: string;
  eventName: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly eventSubject = new Subject<RealtimeEvent>();

  constructor(private readonly redis: RedisService) {}

  /**
   * Send a push notification to a user.
   */
  async sendPush(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    this.logger.log(`[PUSH] To ${userId}: ${title} - ${body}`);
    this.emitEvent(`user:${userId}`, 'NOTIFICATION_PUSH', { title, body, ...data });
  }

  /**
   * Send an SMS notification.
   */
  async sendSms(phone: string, message: string): Promise<void> {
    this.logger.log(`[SMS] To ${phone}: ${message}`);
  }

  /**
   * Send OTP for trip start verification.
   */
  async sendTripOtp(phone: string, otp: string): Promise<void> {
    await this.sendSms(phone, `Your trip OTP is: ${otp}. Share this with the driver to start the trip.`);
  }

  /**
   * Emit a real-time event through in-process SSE subject and distributed Redis pub/sub.
   */
  emitEvent<T = any>(channel: string, eventName: string, data: T): void {
    const payload: RealtimeEvent<T> = {
      channel,
      eventName,
      data,
      timestamp: new Date().toISOString(),
    };

    // Emit to in-memory SSE subscribers
    this.eventSubject.next(payload);

    // Also publish to Redis for multi-instance distributed sync
    this.redis.set(`event:${channel}:${Date.now()}`, JSON.stringify(payload), 300).catch((err) => {
      this.logger.warn(`Failed to store event in Redis: ${err.message}`);
    });

    this.logger.debug(`[REALTIME] Channel ${channel} -> ${eventName}`);
  }

  /**
   * Stream events for a specific channel (or all channels if channel is '*').
   * Used by SSE controllers.
   */
  getEventStream(channel?: string): Observable<{ data: RealtimeEvent }> {
    return this.eventSubject.asObservable().pipe(
      filter((evt) => !channel || channel === '*' || evt.channel === channel || evt.channel.startsWith(channel)),
      map((evt) => ({ data: evt })),
    );
  }
}
