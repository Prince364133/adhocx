import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CorporateSafetyService } from './corporate-safety.service';
import {
  TriggerSosAlertDto,
  ResolveSosAlertDto,
  ConfirmSafeDropDto,
  CorporateSosStatus,
} from '@adhocx/contracts';

@ApiTags('Corporate ETS - Safety SOS & Command Centre')
@Controller('v1/corporate/safety')
export class CorporateSafetyController {
  constructor(private readonly safetyService: CorporateSafetyService) {}

  @Post('sos')
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
  @ApiOperation({ summary: 'List active and historical corporate SOS emergency alerts for Command Centre' })
  @ApiResponse({ status: 200, description: 'List of emergency alerts' })
  public async listAlerts(
    @Query('status') status?: CorporateSosStatus,
    @Query('routeId') routeId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.safetyService.listSosAlerts({ status, routeId, tenantId });
  }

  @Post('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve an active emergency alert with incident resolution notes' })
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
  @ApiOperation({ summary: 'Confirm safe drop for female commuter on late-night shift logout (>20:00)' })
  public async confirmSafeDrop(
    @Param('id') routeId: string,
    @Param('stopId') stopId: string,
    @Body() dto: ConfirmSafeDropDto,
    @Req() req: any,
  ) {
    return this.safetyService.confirmSafeDrop(routeId, stopId, dto, req.user?.id);
  }
}
