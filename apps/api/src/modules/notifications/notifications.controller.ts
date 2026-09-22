import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Sse, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import {
  AuthUserDto,
  UserRole,
  RegisterDeviceTokenDto,
  UnregisterDeviceTokenDto,
  AudienceFilterDto,
  BroadcastPushDto,
  TestPushDto,
  UpdateNotificationPreferenceDto,
  NotificationInteractionDto,
} from '@adhocx/contracts';
import { NotificationsService, RealtimeEvent } from './notifications.service';

@ApiTags('Realtime & Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── Realtime Event Stream (SSE) ───────────────────────────────────────────

  @Sse('events')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Subscribe to real-time events stream via Server-Sent Events (SSE)' })
  streamEvents(
    @CurrentUser() user: AuthUserDto,
    @Query('channel') channel?: string,
  ): Observable<{ data: RealtimeEvent }> {
    const targetChannel = channel || `user:${user.id}`;
    return this.notificationsService.getEventStream(targetChannel);
  }

  // ─── Device Token Registration ─────────────────────────────────────────────

  @Post('device-token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Register or update FCM device token for current user' })
  async registerDeviceToken(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(user.id, dto);
  }

  @Delete('device-token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unregister device FCM token upon logout' })
  async unregisterDeviceToken(@Body() dto: UnregisterDeviceTokenDto) {
    return this.notificationsService.unregisterDeviceToken(dto.token);
  }

  // ─── User Notification Preferences ─────────────────────────────────────────

  @Get('preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user notification delivery preferences' })
  async getPreferences(@CurrentUser() user: AuthUserDto) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user notification channel and quiet hours preferences' })
  async updatePreferences(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }

  // ─── In-App Notifications Feed & Interactions ──────────────────────────────

  @Get('in-app')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get in-app notifications feed with unread counter for current user' })
  async getInAppNotifications(
    @CurrentUser() user: AuthUserDto,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationsService.getUserNotifications(user.id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      unreadOnly,
    });
  }

  @Patch('in-app/:id/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark individual in-app notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthUserDto,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Post('in-app/:id/interact')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Track user interaction (click/open) on notification' })
  async trackInteraction(
    @CurrentUser() user: AuthUserDto,
    @Param('id') id: string,
    @Body() _dto?: NotificationInteractionDto,
  ) {
    return this.notificationsService.trackInteraction(user.id, id);
  }

  @Patch('in-app/read-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark all in-app notifications as read for current user' })
  async markAllAsRead(@CurrentUser() user: AuthUserDto) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  // ─── Admin Push Campaign & Analytics Endpoints ─────────────────────────────

  @Post('admin/broadcast')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Dispatch broadcast push notification to filtered audience (Admin Only)' })
  async broadcastPush(
    @CurrentUser() adminUser: AuthUserDto,
    @Body() dto: BroadcastPushDto,
  ) {
    return this.notificationsService.broadcastPush(dto, adminUser.id);
  }

  @Post('admin/audience-estimate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Calculate estimated audience reach for given filters (Admin Only)' })
  async estimateAudience(@Body() filter: AudienceFilterDto) {
    return this.notificationsService.estimateAudience(filter);
  }

  @Post('admin/test-push')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send instant test push notification to specific token or user (Admin Only)' })
  async sendTestPush(@Body() dto: TestPushDto) {
    return this.notificationsService.sendTestPush(dto);
  }

  @Get('admin/campaigns')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List push notification broadcast campaign history (Admin Only)' })
  async getCampaigns(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.notificationsService.getCampaigns({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('admin/metrics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get overall push notification and device telemetry metrics (Admin Only)' })
  async getMetrics() {
    return this.notificationsService.getMetrics();
  }
}

