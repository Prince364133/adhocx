import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DevicePlatform,
  NotificationType,
  UserRole,
  DriverAvailability,
  VerificationStatus,
  VehicleType,
} from '../enums';

export class RegisterDeviceTokenDto {
  @IsNotEmpty({ message: 'Device token is required' })
  @IsString()
  token!: string;

  @IsNotEmpty({ message: 'Device platform is required' })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;

  @IsOptional()
  @IsString()
  deviceModel?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class UnregisterDeviceTokenDto {
  @IsNotEmpty({ message: 'Device token is required' })
  @IsString()
  token!: string;
}

export class AudienceFilterDto {
  @IsOptional()
  @IsString()
  role?: 'ALL' | UserRole;

  @IsOptional()
  @IsString()
  availability?: 'ALL' | DriverAvailability;

  @IsOptional()
  @IsString()
  verificationStatus?: 'ALL' | VerificationStatus;

  @IsOptional()
  @IsArray()
  vehicleTypes?: VehicleType[];

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  phones?: string[];

  @IsOptional()
  @IsString()
  topic?: string;
}

export class BroadcastPushDto {
  @IsNotEmpty({ message: 'Notification title is required' })
  @IsString()
  title!: string;

  @IsNotEmpty({ message: 'Notification body is required' })
  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  priority?: 'normal' | 'high';

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  filter?: AudienceFilterDto;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsBoolean()
  bypassQuietHours?: boolean;
}

export class TestPushDto {
  @IsNotEmpty({ message: 'Notification title is required' })
  @IsString()
  title!: string;

  @IsNotEmpty({ message: 'Notification body is required' })
  @IsString()
  body!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  targetToken?: string;

  @IsOptional()
  @IsString()
  targetUserId?: string;

  @IsOptional()
  @IsString()
  targetPhone?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}

export class InAppNotificationDto {
  id!: string;
  userId!: string;
  title!: string;
  body!: string;
  type!: NotificationType;
  data?: Record<string, any>;
  imageUrl?: string;
  isRead!: boolean;
  readAt?: string;
  isClicked?: boolean;
  clickedAt?: string;
  createdAt!: string;
}

export class NotificationCampaignDto {
  id!: string;
  title!: string;
  body!: string;
  imageUrl?: string;
  actionUrl?: string;
  targetRole?: string;
  targetFilter?: Record<string, any>;
  totalTargeted!: number;
  successCount!: number;
  failureCount!: number;
  status!: string;
  sentBy?: string;
  createdAt!: string;
}

export class NotificationMetricsDto {
  totalDelivered!: number;
  totalCampaigns!: number;
  activeDevicesCount!: number;
  devicesByPlatform!: {
    android: number;
    ios: number;
    web: number;
  };
  deliverySuccessRate!: number;
  inAppNotificationsCount!: number;
}

export class AudienceEstimateDto {
  matchingUsers!: number;
  matchingDevices!: number;
  platformBreakdown!: {
    android: number;
    ios: number;
    web: number;
  };
}

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  tripAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingPromos?: boolean;

  @IsOptional()
  @IsString()
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  quietHoursEnd?: string;
}

export class NotificationPreferenceResponseDto {
  id!: string;
  userId!: string;
  pushEnabled!: boolean;
  emailEnabled!: boolean;
  smsEnabled!: boolean;
  tripAlerts!: boolean;
  marketingPromos!: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  updatedAt!: string;
}

export class NotificationInteractionDto {
  @IsOptional()
  @IsString()
  action?: 'CLICK' | 'DISMISS' | 'OPEN';

  @IsOptional()
  @IsString()
  timestamp?: string;
}
