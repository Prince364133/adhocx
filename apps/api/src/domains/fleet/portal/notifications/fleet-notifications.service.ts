import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateFleetAnnouncementDto,
  FleetNotificationDto,
  FleetNotificationEventType,
  FleetNotificationQueryDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../../../database/database.service';
import { FleetRequestContext } from '../guards/fleet.decorators';

@Injectable()
export class FleetNotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async listNotifications(
    fleetId: string,
    query: FleetNotificationQueryDto,
  ): Promise<{
    items: FleetNotificationDto[];
    unreadCount: number;
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { fleetId };
    if (query.unreadOnly === 'true') {
      where.isRead = false;
    }

    const [rows, total, unreadCount] = await Promise.all([
      this.db.fleetNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.fleetNotification.count({ where }),
      this.db.fleetNotification.count({ where: { fleetId, isRead: false } }),
    ]);

    return {
      items: rows.map((r) => this.mapToDto(r)),
      unreadCount,
      total,
      page,
      limit,
    };
  }

  async markRead(fleetId: string, id: string): Promise<FleetNotificationDto> {
    const existing = await this.db.fleetNotification.findFirst({
      where: { id, fleetId },
    });
    if (!existing) {
      throw new NotFoundException({
        errorCode: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification does not exist in your fleet.',
      });
    }

    if (existing.isRead) {
      return this.mapToDto(existing);
    }

    const updated = await this.db.fleetNotification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return this.mapToDto(updated);
  }

  async markAllRead(fleetId: string): Promise<{ updatedCount: number }> {
    const result = await this.db.fleetNotification.updateMany({
      where: { fleetId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updatedCount: result.count };
  }

  async publishAnnouncement(
    ctx: FleetRequestContext,
    dto: CreateFleetAnnouncementDto,
  ): Promise<FleetNotificationDto> {
    return this.createNotification({
      fleetId: ctx.fleetId,
      eventType: FleetNotificationEventType.FLEET_ANNOUNCEMENT,
      title: dto.title.trim(),
      message: dto.message.trim(),
      entityType: 'FLEET',
      entityId: ctx.fleetId,
      actionUrl: dto.actionUrl?.trim() || '/dashboard',
    });
  }

  async createNotification(input: {
    fleetId: string;
    eventType: FleetNotificationEventType;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
    actionUrl?: string;
  }): Promise<FleetNotificationDto> {
    const created = await this.db.fleetNotification.create({
      data: {
        fleetId: input.fleetId,
        eventType: input.eventType,
        title: input.title,
        message: input.message,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        actionUrl: input.actionUrl ?? null,
      },
    });
    return this.mapToDto(created);
  }

  private mapToDto(r: any): FleetNotificationDto {
    return {
      id: r.id,
      fleetId: r.fleetId,
      eventType: r.eventType as FleetNotificationEventType,
      title: r.title,
      message: r.message,
      entityType: r.entityType || undefined,
      entityId: r.entityId || undefined,
      actionUrl: r.actionUrl || undefined,
      isRead: Boolean(r.isRead),
      readAt: r.readAt ? new Date(r.readAt).toISOString() : undefined,
      createdAt: new Date(r.createdAt).toISOString(),
    };
  }
}
