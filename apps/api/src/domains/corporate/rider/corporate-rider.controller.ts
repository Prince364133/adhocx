import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@adhocx/contracts';
import { CorporateRiderService } from './corporate-rider.service';
import {
  CreateSupportTicketDto,
  SubmitSafeReachDto,
  SubmitTripFeedbackDto,
} from './corporate-rider.types';

@ApiTags('Corporate Rider Self-Service')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('corporate/me')
export class CorporateRiderController {
  constructor(private readonly riderService: CorporateRiderService) {}

  @Get()
  @Roles(UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get current commuter profile, tenant and office details' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.riderService.getRiderProfile(userId);
  }

  @Get('schedule')
  @Roles(UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get upcoming 7-day shift rides schedule and modification cutoff status' })
  async getSchedule(
    @Req() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.riderService.getRiderSchedule(userId, startDate, endDate);
  }

  @Get('trips')
  @Roles(UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get commuter trip history with driver, vehicle and OTP details' })
  async getTrips(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.riderService.getRiderTrips(
      userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('trips/:id/tracking')
  @Roles(UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Live real-time trip tracking with GPS, ETA, dwell timer and dynamic QR token' })
  async getTripTracking(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id || req.user?.sub;
    return this.riderService.getRiderTripTracking(userId, id);
  }

  @Post('trips/:id/safe-reach')
  @Roles(UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Confirm safe residence entry for late-night female commuters' })
  async submitSafeReach(
    @Req() req: any,
    @Param('id') stopId: string,
    @Body() dto: SubmitSafeReachDto,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.riderService.submitSafeReach(userId, stopId, dto);
  }

  @Post('trips/:id/feedback')
  @Roles(UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Submit 1-5 star rating and feedback for completed ride' })
  async submitFeedback(
    @Req() req: any,
    @Param('id') stopId: string,
    @Body() dto: SubmitTripFeedbackDto,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.riderService.submitTripFeedback(userId, stopId, dto);
  }

  @Post('tickets')
  @Roles(UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Submit commuter support ticket with auto-calculated SLA' })
  async createTicket(@Req() req: any, @Body() dto: CreateSupportTicketDto) {
    const userId = req.user?.id || req.user?.sub;
    return this.riderService.createSupportTicket(userId, dto);
  }

  @Get('tickets')
  @Roles(UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List commuter support tickets' })
  async getTickets(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.riderService.getRiderSupportTickets(userId);
  }

  @Get('notifications')
  @Roles(UserRole.EMPLOYEE, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List commuter notification events' })
  async getNotifications(@Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.riderService.getRiderNotifications(userId);
  }
}
