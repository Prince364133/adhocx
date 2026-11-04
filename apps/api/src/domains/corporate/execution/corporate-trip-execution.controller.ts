import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource, CorporateTenantScoped, CorporateDriverSelfScoped } from '../../../common/decorators/corporate-resource.decorator';
import { CorporateTripExecutionService } from './corporate-trip-execution.service';
import { CorporateRiderService } from '../rider/corporate-rider.service';
import {
  LEGACY_TRIP_HISTORY_STATUSES,
  toLegacySchedule,
  toLegacyTripHistory,
} from '../rider/corporate-rider-legacy.mapper';
import {
  ArriveAtStopDto,
  VerifyStopOtpDto,
  VerifyStopQrDto,
  RouteTelemetryDto,
  MarkNoShowDto,
  RescheduleRequestDto,
  StartRouteDto,
  AdminRescheduleRequestDto,
} from './trip-execution.types';

@ApiTags('Corporate ETS - Trip Execution & OTP Boarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/trips')
export class CorporateTripExecutionController {
  constructor(
    private readonly executionService: CorporateTripExecutionService,
    private readonly riderService: CorporateRiderService,
  ) {}

  @Post('routes/:id/start')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('route', 'id')
  @ApiOperation({
    summary:
      'Driver starts driving toward pickup 1 (ASSIGNED -> IN_TRANSIT). Notifies every employee with individual ETA',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        driverId: { type: 'string' },
        driverLatitude: { type: 'number', example: 17.4401 },
        driverLongitude: { type: 'number', example: 78.3489 },
      },
    },
  })
  public async startRoute(@Param('id') routeId: string, @Body() body: StartRouteDto) {
    return this.executionService.startRoute(routeId, body || {});
  }

  @Post('routes/:id/stops/:stopId/arrive')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('stop', 'stopId')
  @ApiOperation({
    summary:
      'Driver marks arrival at pickup stop. Geofence verified (<150m), triggers immutable 5-minute dwell timer',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        driverLatitude: { type: 'number', example: 17.4504 },
        driverLongitude: { type: 'number', example: 78.3808 },
      },
      required: ['driverLatitude', 'driverLongitude'],
    },
  })
  public async arriveAtStop(
    @Param('id') routeId: string,
    @Param('stopId') stopId: string,
    @Body() body: ArriveAtStopDto,
  ) {
    if (body.driverLatitude === undefined || body.driverLongitude === undefined) {
      throw new BadRequestException('driverLatitude and driverLongitude are required');
    }
    return this.executionService.arriveAtStop(routeId, stopId, body);
  }

  @Post('routes/:id/stops/:stopId/verify-otp')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('stop', 'stopId')
  @ApiOperation({
    summary:
      'Driver validates 4-digit numeric boarding OTP presented by employee. Transitions stop to BOARDED',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        otpCode: { type: 'string', example: '4829' },
      },
      required: ['otpCode'],
    },
  })
  public async verifyOtp(
    @Param('id') routeId: string,
    @Param('stopId') stopId: string,
    @Body() body: VerifyStopOtpDto,
  ) {
    if (!body.otpCode) {
      throw new BadRequestException('otpCode is required');
    }
    return this.executionService.verifyBoardingOtp(routeId, stopId, body);
  }

  @Post('routes/:id/stops/:stopId/no-show')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('stop', 'stopId')
  @ApiOperation({
    summary:
      'Driver marks employee as No-Show after 5-minute wait window has elapsed. Departs immediately to next stop',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
      },
    },
  })
  public async markNoShow(
    @Param('id') routeId: string,
    @Param('stopId') stopId: string,
    @Body() body: MarkNoShowDto,
  ) {
    return this.executionService.markNoShow(routeId, stopId, body);
  }

  @Post('routes/:id/complete')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Complete corporate route upon reaching office destination hub' })
  public async completeRoute(@Param('id') routeId: string) {
    return this.executionService.completeRoute(routeId);
  }

  @Get('routes/:id/stops/:stopId/boarding-qr')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  @CorporateResource('stop', 'stopId')
  @ApiOperation({ summary: 'Generate dynamic, time-limited QR boarding token for employee mobile app' })
  public async getBoardingQr(
    @Param('id') routeId: string,
    @Param('stopId') stopId: string,
  ) {
    return this.executionService.generateBoardingQrToken(routeId, stopId);
  }

  @Post('routes/:id/stops/:stopId/verify-qr')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('stop', 'stopId')
  @ApiOperation({ summary: 'Driver scans employee dynamic QR code to verify boarding and departure' })
  public async verifyQr(
    @Param('id') routeId: string,
    @Param('stopId') stopId: string,
    @Body() body: VerifyStopQrDto,
  ) {
    if (!body.qrPayload || body.driverLatitude === undefined || body.driverLongitude === undefined) {
      throw new BadRequestException('qrPayload, driverLatitude, and driverLongitude are required');
    }
    return this.executionService.verifyBoardingQr(routeId, stopId, body);
  }

  @Post('routes/:id/telemetry')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Ingest live driver GPS telemetry and broadcast to Corporate Live Map' })
  public async ingestTelemetry(
    @Param('id') routeId: string,
    @Body() body: RouteTelemetryDto,
  ) {
    if (body.latitude === undefined || body.longitude === undefined) {
      throw new BadRequestException('latitude and longitude are required');
    }
    return this.executionService.ingestRouteTelemetry(routeId, body);
  }

  @Get('routes/:id/waypoints')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Retrieve ordered waypoints and corridor polyline for driver turn-by-turn navigation' })
  public async getWaypoints(@Param('id') routeId: string) {
    return this.executionService.getRouteWaypoints(routeId);
  }

  @Post('requests/:id/reschedule')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.EMPLOYEE)
  @CorporateResource('request', 'id')
  @ApiOperation({
    summary:
      'Employee reschedules shift or cancels transport request. Strictly enforces the 9-hour cutoff rule',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        employeeId: { type: 'string' },
        action: { type: 'string', enum: ['CANCEL', 'RESCHEDULE'] },
        newShiftTime: { type: 'string', example: '09:00' },
        newShiftDate: { type: 'string', example: '2026-11-05' },
      },
      required: ['employeeId', 'action'],
    },
  })
  public async rescheduleOrCancel(
    @Param('id') requestId: string,
    @Body() body: RescheduleRequestDto,
  ) {
    if (!body.employeeId || !body.action) {
      throw new BadRequestException('employeeId and action are required');
    }
    // Employee channel: never honour a cutoff override from the request body.
    return this.executionService.handleRescheduleOrCancel(requestId, {
      employeeId: body.employeeId,
      action: body.action,
      newShiftTime: body.newShiftTime,
      newShiftDate: body.newShiftDate,
    });
  }

  @Post('requests/:id/admin-reschedule')
  @Roles(UserRole.ADMIN)
  @CorporateResource('request', 'id')
  @ApiOperation({
    summary:
      'Corporate admin cancels/reschedules on behalf of an employee, explicitly overriding the 9-hour cutoff (audited)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['CANCEL', 'RESCHEDULE'] },
        newShiftTime: { type: 'string', example: '09:00' },
        newShiftDate: { type: 'string', example: '2026-11-05' },
        employeeId: { type: 'string' },
        actorUserId: { type: 'string' },
        reason: { type: 'string', example: 'Medical emergency approved by HR' },
      },
      required: ['action', 'reason'],
    },
  })
  public async adminRescheduleOrCancel(
    @Param('id') requestId: string,
    @Body() body: AdminRescheduleRequestDto,
    @Req() req?: any,
  ) {
    // The audited override actor is the authenticated admin; a body value is only
    // honoured when no authenticated user is present (direct service-level calls).
    const actorUserId = req?.user?.id ?? body.actorUserId;
    if (!body.action || !actorUserId || !body.reason) {
      throw new BadRequestException('action, actorUserId and reason are required');
    }
    return this.executionService.handleRescheduleOrCancel(
      requestId,
      {
        employeeId: body.employeeId as string,
        action: body.action,
        newShiftTime: body.newShiftTime,
        newShiftDate: body.newShiftDate,
      },
      { override: { actorUserId, reason: body.reason } },
    );
  }

  // ---------------------------------------------------------------------------
  // Deprecated employee aliases. Canonical API: /corporate/me/* (CorporateRiderController).
  // Thin wrappers over CorporateRiderService; the mappers keep the legacy JSON shapes.
  // ---------------------------------------------------------------------------

  @Get('me/schedule')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  @CorporateTenantScoped()
  @ApiOperation({
    deprecated: true,
    summary: 'DEPRECATED: use GET /corporate/me/schedule. Shift schedule of the authenticated employee (EMP-03-01)',
  })
  public async getMySchedule(@Req() req: any) {
    return toLegacySchedule(await this.riderService.getRiderSchedule(req.user.id));
  }

  @Get('me/next-trip')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  @CorporateTenantScoped()
  @ApiOperation({
    deprecated: true,
    summary: 'DEPRECATED: use GET /corporate/me/trips/next. Next upcoming trip card with driver and OTP (EMP-02-01)',
  })
  public async getMyNextTrip(@Req() req: any): Promise<any> {
    return this.riderService.getRiderNextTrip(req.user.id);
  }

  @Get('me/trips')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE)
  @CorporateTenantScoped()
  @ApiOperation({
    deprecated: true,
    summary: 'DEPRECATED: use GET /corporate/me/trips. Past trip history of the authenticated employee (EMP-08-02)',
  })
  public async getMyTrips(@Req() req: any) {
    const trips = await this.riderService.getRiderTrips(req.user.id, 20, 0, {
      stopStatuses: [...LEGACY_TRIP_HISTORY_STATUSES] as any,
    });
    return toLegacyTripHistory(trips);
  }

  @Get('driver/active-route')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateDriverSelfScoped()
  @ApiOperation({ summary: 'View active corporate route assigned to the driver with ordered stops and dwell timers (UI-05-01)' })
  public async getDriverActiveRoute(@Req() req: any) {
    return this.executionService.getDriverActiveRoute(req.user.id);
  }

  @Get('driver/routes')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateDriverSelfScoped()
  @ApiOperation({ summary: 'View all corporate routes assigned to the authenticated driver (UI-05-02)' })
  public async getDriverRoutes(@Req() req: any) {
    return this.executionService.getDriverCorporateTrips(req.user.id);
  }
}
