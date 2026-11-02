import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CorporateTripExecutionService } from './corporate-trip-execution.service';
import {
  ArriveAtStopDto,
  VerifyStopOtpDto,
  VerifyStopQrDto,
  RouteTelemetryDto,
  MarkNoShowDto,
  RescheduleRequestDto,
  AdminRescheduleRequestDto,
} from './trip-execution.types';

@ApiTags('Corporate ETS - Trip Execution & OTP Boarding')
@Controller('corporate/trips')
export class CorporateTripExecutionController {
  constructor(private readonly executionService: CorporateTripExecutionService) {}

  @Post('routes/:id/stops/:stopId/arrive')
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
  @ApiOperation({ summary: 'Complete corporate route upon reaching office destination hub' })
  public async completeRoute(@Param('id') routeId: string) {
    return this.executionService.completeRoute(routeId);
  }

  @Get('routes/:id/stops/:stopId/boarding-qr')
  @ApiOperation({ summary: 'Generate dynamic, time-limited QR boarding token for employee mobile app' })
  public async getBoardingQr(
    @Param('id') routeId: string,
    @Param('stopId') stopId: string,
  ) {
    return this.executionService.generateBoardingQrToken(routeId, stopId);
  }

  @Post('routes/:id/stops/:stopId/verify-qr')
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
  @ApiOperation({ summary: 'Retrieve ordered waypoints and corridor polyline for driver turn-by-turn navigation' })
  public async getWaypoints(@Param('id') routeId: string) {
    return this.executionService.getRouteWaypoints(routeId);
  }

  @Post('requests/:id/reschedule')
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
    });
  }

  @Post('requests/:id/admin-reschedule')
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
        employeeId: { type: 'string' },
        actorUserId: { type: 'string' },
        reason: { type: 'string', example: 'Medical emergency approved by HR' },
      },
      required: ['action', 'actorUserId', 'reason'],
    },
  })
  public async adminRescheduleOrCancel(
    @Param('id') requestId: string,
    @Body() body: AdminRescheduleRequestDto,
  ) {
    if (!body.action || !body.actorUserId || !body.reason) {
      throw new BadRequestException('action, actorUserId and reason are required');
    }
    return this.executionService.handleRescheduleOrCancel(
      requestId,
      { employeeId: body.employeeId as string, action: body.action, newShiftTime: body.newShiftTime },
      { override: { actorUserId: body.actorUserId, reason: body.reason } },
    );
  }
}

