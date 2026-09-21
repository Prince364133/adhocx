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
    const result = await this.notificationsService.registerDeviceToken(user.id, dto);
    return { success: true, data: result };
  }

  @Delete('device-token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unregister device FCM token upon logout' })
  async unregisterDeviceToken(@Body() dto: UnregisterDeviceTokenDto) {
    const result = await this.notificationsService.unregisterDeviceToken(dto.token);
    return { success: true, data: result };
  }

  // ─── User Notification Preferences ─────────────────────────────────────────

  @Get('preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user notification delivery preferences' })
  async getPreferences(@CurrentUser() user: AuthUserDto) {
    const result = await this.notificationsService.getPreferences(user.id);
    return { success: true, data: result };
  }

  @Patch('preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user notification channel and quiet hours preferences' })
  async updatePreferences(
    @CurrentUser() user: AuthUserDto,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    const result = await this.notificationsService.updatePreferences(user.id, dto);
    return { success: true, data: result };
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
    const result = await this.notificationsService.getUserNotifications(user.id, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      unreadOnly,
    });
    return { success: true, data: result };
  }

  @Patch('in-app/:id/read')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark individual in-app notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthUserDto,
    @Param('id') id: string,
  ) {
    const result = await this.notificationsService.markAsRead(user.id, id);
    return { success: true, data: result };
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
    const result = await this.notificationsService.trackInteraction(user.id, id);
    return { success: true, data: result };
  }

  @Patch('in-app/read-all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mark all in-app notifications as read for current user' })
  async markAllAsRead(@CurrentUser() user: AuthUserDto) {
    const result = await this.notificationsService.markAllAsRead(user.id);
    return { success: true, data: result };
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
    const result = await this.notificationsService.broadcastPush(dto, adminUser.id);
    return { success: true, data: result };
  }

  @Post('admin/audience-estimate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Calculate estimated audience reach for given filters (Admin Only)' })
  async estimateAudience(@Body() filter: AudienceFilterDto) {
    const result = await this.notificationsService.estimateAudience(filter);
    return { success: true, data: result };
  }

  @Post('admin/test-push')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Send instant test push notification to specific token or user (Admin Only)' })
  async sendTestPush(@Body() dto: TestPushDto) {
    const result = await this.notificationsService.sendTestPush(dto);
    return { success: true, data: result };
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
    const result = await this.notificationsService.getCampaigns({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
    return { success: true, data: result };
  }

  @Get('admin/metrics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get overall push notification and device telemetry metrics (Admin Only)' })
  async getMetrics() {
    const result = await this.notificationsService.getMetrics();
    return { success: true, data: result };
  }
}

