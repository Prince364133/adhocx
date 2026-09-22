import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import {
  StartTripDto,
  CompleteTripDto,
  CancelTripDto,
  TripLocationUpdateDto,
  TripQueryDto,
  TripResponseDto,
  TripDetailResponseDto,
  TripEventResponseDto,
  AuthUserDto,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../common';
import { TripsService } from './trips.service';

@ApiTags('Trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get trips for current user (driver or vendor) with filters' })
  @SwaggerResponse({ status: 200, type: [TripResponseDto] })
  async getTrips(
    @CurrentUser() user: AuthUserDto,
    @Query() query: TripQueryDto,
  ) {
    if (user.role === UserRole.VENDOR) {
      return this.tripsService.getTripsForVendor(user.id, query);
    }
    return this.tripsService.getTripsForDriver(user.id, query);
  }

  @Get(':id')
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get full trip details with driver info, vehicle, and events' })
  @SwaggerResponse({ status: 200, type: TripDetailResponseDto })
  async getTrip(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.tripsService.getTripById(id, user.id, user.role);
  }

  @Get(':id/events')
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get GPS breadcrumbs and tracking telemetry history for route playback' })
  @SwaggerResponse({ status: 200, type: [TripEventResponseDto] })
  async getTripEvents(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.tripsService.getTripEvents(id, user.id, user.role);
  }

  @Post([':id/arrive', ':id/arrived'])
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Mark driver arrival at pickup location' })
  @SwaggerResponse({ status: 200, type: TripResponseDto })
  async markArrived(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.tripsService.markArrived(id, user.id);
  }

  @Post(':id/start')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Start trip with OTP verification' })
  @SwaggerResponse({ status: 200, type: TripResponseDto })
  async startTrip(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
    @Body() dto: StartTripDto,
  ) {
    return this.tripsService.startTrip(id, user.id, dto);
  }

  @Post(':id/complete')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Complete trip, compute earnings, and release driver' })
  @SwaggerResponse({ status: 200, type: TripResponseDto })
  async completeTrip(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
    @Body() dto: CompleteTripDto,
  ) {
    return this.tripsService.completeTrip(id, user.id, dto);
  }

  @Post(':id/cancel')
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a trip (pre-start cancellation automatically redispatches requirement)' })
  @SwaggerResponse({ status: 200, type: TripResponseDto })
  async cancelTrip(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
    @Body() dto: CancelTripDto,
  ) {
    return this.tripsService.cancelTrip(id, user.id, user.role, dto);
  }

  @Post(':id/no-show')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Report passenger no-show after driver arrival' })
  @SwaggerResponse({ status: 200, type: TripResponseDto })
  async reportNoShow(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
  ) {
    return this.tripsService.reportNoShow(id, user.id);
  }

  @Patch(':id/location')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Stream driver GPS telemetry update during active trip' })
  async updateLocation(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
    @Body() dto: TripLocationUpdateDto,
  ) {
    await this.tripsService.updateLocation(id, user.id, dto);
    return { success: true };
  }

  @Post(':id/sos')
  @Roles(UserRole.DRIVER, UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Trigger emergency SOS alert for an active trip' })
  async triggerSos(
    @Param('id') id: string,
    @CurrentUser() user: AuthUserDto,
    @Body() body?: { latitude?: number; longitude?: number; note?: string },
  ) {
    return this.tripsService.triggerEmergencySos(id, user.id, user.role, body);
  }
}
