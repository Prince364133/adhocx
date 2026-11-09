import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { CorporateSafetyService } from './corporate-safety.service';
import {
  TriggerSosAlertDto,
  ResolveSosAlertDto,
  ConfirmSafeDropDto,
  ConfirmSafeReachDto,
  EmergencyBoardingFallbackDto,
  CorporateSosStatus,
  UserRole,
} from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource, CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';
import { SOS_CLOSE_OUTCOMES, SosCloseOutcome, SosLifecycleNotesDto } from './safety.types';

const NOTES_BODY = {
  schema: {
    type: 'object',
    properties: {
      notes: { type: 'string', example: 'Called driver and commuter; cab stationary at signal' },
    },
  },
} as const;

const requireNotes = (dto: SosLifecycleNotesDto | undefined): string => {
  const notes = typeof dto?.notes === 'string' ? dto.notes.trim() : '';
  if (!notes) throw new BadRequestException('notes are required');
  return notes;
};

@ApiTags('Corporate ETS - Safety SOS & Command Centre')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/safety')
export class CorporateSafetyController {
  constructor(private readonly safetyService: CorporateSafetyService) {}

  @Post('sos')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.DRIVER)
  @CorporateResource('route', 'routeId', { from: 'body' })
  @ApiOperation({
    summary: 'P0 Emergency SOS Trigger. Dispatches instant alerts to Super Admin Command Centre & Corporate Safety Desk',
  })
  @ApiResponse({ status: 201, description: 'Emergency SOS activated' })
  public async triggerSos(@Body() dto: TriggerSosAlertDto, @Req() req: any) {
    if (!dto.routeId || dto.latitude === undefined || dto.longitude === undefined) {
      throw new BadRequestException('routeId, latitude, and longitude are required');
    }

    const userId = req.user?.id || 'anonymous-emergency';
    const userRole = req.user?.role === 'DRIVER' ? 'DRIVER' : 'EMPLOYEE';

    return this.safetyService.triggerSosAlert(userId, userRole, dto);
  }

  @Get('alerts')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'List active and historical corporate SOS emergency alerts for Command Centre' })
  @ApiResponse({ status: 200, description: 'List of emergency alerts' })
  public async listAlerts(
    @Query('status') status?: CorporateSosStatus,
    @Query('routeId') routeId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.safetyService.listSosAlerts({ status, routeId, tenantId });
  }

  @Post('alerts/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('sos', 'id')
  @ApiOperation({ summary: 'SOS stage 2: commander acknowledges a NEW / ACTIVE (or unacknowledged ESCALATED) alert' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { notes: { type: 'string' }, adminName: { type: 'string', example: 'Commander John' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  @ApiResponse({ status: 409, description: 'Illegal transition (already acknowledged or closed)' })
  public async acknowledgeAlert(@Param('id') alertId: string, @Body() dto: SosLifecycleNotesDto, @Req() req: any) {
    const notes = typeof dto?.notes === 'string' ? dto.notes : undefined;
    return this.safetyService.acknowledgeSosAlert(alertId, req.user.id, dto?.adminName || req.user?.name, notes);
  }

  @Post('alerts/:id/investigate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('sos', 'id')
  @ApiOperation({ summary: 'SOS stage 3: mark an acknowledged / escalated alert under active investigation' })
  @ApiBody(NOTES_BODY)
  @ApiResponse({ status: 200, description: 'Alert under investigation' })
  @ApiResponse({ status: 409, description: 'Illegal transition (not acknowledged yet, or closed)' })
  public async investigateAlert(@Param('id') alertId: string, @Body() dto: SosLifecycleNotesDto, @Req() req: any) {
    const notes = typeof dto?.notes === 'string' ? dto.notes : undefined;
    return this.safetyService.investigateSosAlert(alertId, req.user.id, notes);
  }

  @Post('alerts/:id/escalate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('sos', 'id')
  @ApiOperation({ summary: 'SOS stage 4: escalate to police / field response (raises the escalation level)' })
  @ApiBody(NOTES_BODY)
  @ApiResponse({ status: 200, description: 'Alert escalated' })
  @ApiResponse({ status: 409, description: 'Illegal transition (already escalated or closed)' })
  public async escalateAlert(@Param('id') alertId: string, @Body() dto: SosLifecycleNotesDto, @Req() req: any) {
    return this.safetyService.escalateSosAlert(alertId, req.user.id, requireNotes(dto));
  }

  @Post('alerts/:id/close')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('sos', 'id')
  @ApiOperation({ summary: 'SOS stage 5: close an open alert as RESOLVED (default) or FALSE_ALARM with incident notes' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        notes: { type: 'string' },
        outcome: { type: 'string', enum: [...SOS_CLOSE_OUTCOMES], default: 'RESOLVED' },
      },
      required: ['notes'],
    },
  })
  @ApiResponse({ status: 200, description: 'Alert closed' })
  @ApiResponse({ status: 409, description: 'Alert already closed' })
  public async closeAlert(@Param('id') alertId: string, @Body() dto: SosLifecycleNotesDto, @Req() req: any) {
    const notes = requireNotes(dto);
    const outcome: SosCloseOutcome = dto?.outcome ?? 'RESOLVED';
    if (!SOS_CLOSE_OUTCOMES.includes(outcome)) {
      throw new BadRequestException(`outcome must be one of ${SOS_CLOSE_OUTCOMES.join(', ')}`);
    }
    return this.safetyService.closeSosAlert(alertId, req.user.id, notes, outcome);
  }

  @Post('alerts/:id/resolve')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('sos', 'id')
  @ApiOperation({ summary: 'Alias of POST /alerts/:id/close: resolve an open alert with incident resolution notes' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  public async resolveAlert(
    @Param('id') alertId: string,
    @Body() dto: ResolveSosAlertDto,
    @Req() req: any,
  ) {
    if (!dto.resolutionNotes || !dto.status) {
      throw new BadRequestException('resolutionNotes and status are required');
    }

    const resolverUserId = req.user?.id || 'admin-dispatcher';
    return this.safetyService.resolveSosAlert(alertId, resolverUserId, dto);
  }

  @Post('routes/:id/check-deviation')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Check vehicle position against planned route corridor and trigger deviation alarm if >500m' })
  public async checkDeviation(
    @Param('id') routeId: string,
    @Body() body: { latitude: number; longitude: number },
  ) {
    if (body.latitude === undefined || body.longitude === undefined) {
      throw new BadRequestException('latitude and longitude are required');
    }
    return this.safetyService.checkRouteDeviation(routeId, body.latitude, body.longitude);
  }

  @Post('routes/:id/stops/:stopId/confirm-safe-drop')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('stop', 'stopId')
  @ApiOperation({ summary: 'Confirm safe drop for female commuter on late-night shift logout (>20:00)' })
  public async confirmSafeDrop(
    @Param('id') routeId: string,
    @Param('stopId') stopId: string,
    @Body() dto: ConfirmSafeDropDto,
    @Req() req: any,
  ) {
    return this.safetyService.confirmSafeDrop(routeId, stopId, dto, req.user?.id);
  }

  @Post('routes/:id/stops/:stopId/confirm-safe-reach')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.DRIVER)
  @CorporateResource('stop', 'stopId')
  @ApiOperation({
    summary:
      'Employee confirms safe reach into residence / destination. Immutable evidence recorded in safety ledger',
  })
  public async confirmSafeReach(
    @Param('id') routeId: string,
    @Param('stopId') stopId: string,
    @Body() dto: ConfirmSafeReachDto,
    @Req() req: any,
  ) {
    return this.safetyService.confirmSafeReach(
      routeId,
      stopId,
      {
        stopId,
        routeId,
        confirmedSafely: dto.confirmedSafely ?? true,
        notes: dto.notes,
      },
      req.user?.id,
    );
  }

  @Post('routes/:id/stops/:stopId/emergency-boarding-override')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateResource('stop', 'stopId')
  @ApiOperation({
    summary:
      'Command Centre emergency boarding manual override with audit ticket generation when OTP verification is unavailable',
  })
  public async emergencyBoardingOverride(
    @Param('id') routeId: string,
    @Param('stopId') stopId: string,
    @Body() dto: EmergencyBoardingFallbackDto,
    @Req() req: any,
  ) {
    if (!dto.reason) {
      throw new BadRequestException('reason is required for emergency boarding fallback');
    }
    return this.safetyService.emergencyBoardingOverride(routeId, stopId, dto, req.user?.id || 'admin');
  }

  @Get('tracking-loss')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Detect active routes in IN_TRANSIT with missing/stale telemetry (>180s)' })
  public async getTrackingLossRoutes() {
    return this.safetyService.detectTelemetryLoss(180, new Date());
  }

  @Get('stops/:stopId/safe-drop-status')
  @Roles(UserRole.ADMIN, UserRole.EMPLOYEE, UserRole.DRIVER)
  @CorporateResource('stop', 'stopId')
  @ApiOperation({ summary: 'Retrieve live safe-drop and escort status of a stop' })
  public async getSafeDropStatus(@Param('stopId') stopId: string) {
    return this.safetyService.getSafeDropStatus(stopId);
  }
}
