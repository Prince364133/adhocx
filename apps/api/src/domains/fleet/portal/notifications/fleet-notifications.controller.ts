import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateFleetAnnouncementDto,
  FleetAdminRole,
  FleetNotificationQueryDto,
} from '@adhocx/contracts';
import { FleetAuthGuard } from '../guards/fleet-auth.guard';
import { FleetRolesGuard } from '../guards/fleet-roles.guard';
import {
  CurrentFleetUser,
  FleetRequestContext,
  FleetRoles,
} from '../guards/fleet.decorators';
import { FleetNotificationsService } from './fleet-notifications.service';

@ApiTags('Fleet Portal Notifications')
@ApiBearerAuth()
@UseGuards(FleetAuthGuard, FleetRolesGuard)
@Controller('fleet/notifications')
export class FleetNotificationsController {
  constructor(private readonly notificationsService: FleetNotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List fleet-scoped notifications with unread count' })
  async list(
    @CurrentFleetUser() user: FleetRequestContext,
    @Query() query: FleetNotificationQueryDto,
  ) {
    return this.notificationsService.listNotifications(user.fleetId, query);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a single fleet notification as read' })
  async markRead(
    @CurrentFleetUser() user: FleetRequestContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.notificationsService.markRead(user.fleetId, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all unread fleet notifications as read' })
  async markAllRead(@CurrentFleetUser() user: FleetRequestContext) {
    return this.notificationsService.markAllRead(user.fleetId);
  }

  @Post('announcements')
  @FleetRoles(FleetAdminRole.FLEET_OWNER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Publish a fleet-wide announcement notification (Fleet Owner only)' })
  async createAnnouncement(
    @CurrentFleetUser() user: FleetRequestContext,
    @Body() dto: CreateFleetAnnouncementDto,
  ) {
    return this.notificationsService.publishAnnouncement(user, dto);
  }
}
