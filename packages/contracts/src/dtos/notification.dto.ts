import { DevicePlatform, NotificationType, UserRole, DriverAvailability, VerificationStatus, VehicleType } from '../enums';

export class RegisterDeviceTokenDto {
  token!: string;
  platform!: DevicePlatform;
  deviceModel?: string;
  appVersion?: string;
}

export class UnregisterDeviceTokenDto {
  token!: string;
}

export class AudienceFilterDto {
  role?: 'ALL' | UserRole;
  availability?: 'ALL' | DriverAvailability;
  verificationStatus?: 'ALL' | VerificationStatus;
  vehicleTypes?: VehicleType[];
  city?: string;
  userIds?: string[];
  phones?: string[];
  topic?: string;
}

export class BroadcastPushDto {
  title!: string;
  body!: string;
  imageUrl?: string;
  actionUrl?: string;
  priority?: 'normal' | 'high';
  filter?: AudienceFilterDto;
  data?: Record<string, string>;
  dryRun?: boolean;
  bypassQuietHours?: boolean;
}

export class TestPushDto {
  title!: string;
  body!: string;
  imageUrl?: string;
  actionUrl?: string;
  targetToken?: string;
  targetUserId?: string;
  targetPhone?: string;
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
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  tripAlerts?: boolean;
  marketingPromos?: boolean;
  quietHoursStart?: string;
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
  action?: 'CLICK' | 'DISMISS' | 'OPEN';
  timestamp?: string;
}
