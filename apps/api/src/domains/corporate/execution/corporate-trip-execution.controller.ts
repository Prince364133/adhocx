import {
  Controller,
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
  MarkNoShowDto,
  RescheduleRequestDto,
} from './trip-execution.types';

@ApiTags('Corporate ETS - Trip Execution & OTP Boarding')
@Controller('v1/corporate/trips')
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
    return this.executionService.handleRescheduleOrCancel(requestId, body);
  }
}

