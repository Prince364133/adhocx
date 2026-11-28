import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FleetNotificationEventType } from '../../enums';
import { PaginationQueryDto } from '../common.dto';

export class FleetNotificationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  unreadOnly?: string;
}

export class CreateFleetAnnouncementDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;
}

export class FleetNotificationDto {
  id!: string;
  fleetId!: string;
  eventType!: FleetNotificationEventType;
  title!: string;
  message!: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  isRead!: boolean;
  readAt?: string;
  createdAt!: string;
}
