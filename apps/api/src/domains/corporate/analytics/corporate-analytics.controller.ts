import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';
import { CorporateAnalyticsService } from './corporate-analytics.service';

/**
 * Corporate dashboard / attendance / reports. ADMIN may query any tenant (tenantId required);
 * corporate users are forced to the tenant in their token by CorporateAccessGuard, and asking for
 * another tenant is a 403.
 */
@ApiTags('Corporate ETS - Analytics & Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/analytics')
export class CorporateAnalyticsController {
  constructor(private readonly analytics: CorporateAnalyticsService) {}

  @Get('metric-definitions')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Numerator, denominator, status inclusion, timezone and freshness of every KPI' })
  public definitions() {
    return this.analytics.getMetricDefinitions();
  }

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({
    summary:
      'KPI dashboard for an IST date range: trips by status, employees served, requests by status, on-time %, avg delay, seat utilisation, SOS count, asOf',
  })
  @ApiResponse({ status: 200, description: 'Dashboard KPIs' })
  public async dashboard(
    @Query('tenantId') tenantId?: string,
    @Query('officeId') officeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('direction') direction?: string,
    @Query('shiftTime') shiftTime?: string,
  ) {
    return this.analytics.getDashboard({ tenantId, officeId, from, to, direction, shiftTime });
  }

  @Get('exceptions')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @ApiOperation({
    summary: 'Active operational exceptions: delayed route pickups, unassigned requests, stale GPS vehicles and safety alerts',
  })
  @ApiResponse({ status: 200, description: 'Live exceptions summary and feed' })
  public async exceptions(
    @Query('tenantId') tenantId?: string,
    @Query('officeId') officeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analytics.getExceptions({ tenantId, officeId, from, to });
  }

  @Get('attendance')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Per-employee attendance (scheduled, boarded, no-shows, cancellations, late days), paged' })
  public async attendance(
    @Query('tenantId') tenantId?: string,
    @Query('officeId') officeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.analytics.getAttendance({
      tenantId,
      officeId,
      from,
      to,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    });
  }

  @Get('reports/:type')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Download a report: type = trips | no-shows | attendance (optionally with .csv/.json), format=csv|json' })
  public async report(
    @Param('type') type: string,
    @Res() res: Response,
    @Query('format') format?: string,
    @Query('tenantId') tenantId?: string,
    @Query('officeId') officeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('direction') direction?: string,
    @Query('shiftTime') shiftTime?: string,
  ) {
    const out = await this.analytics.getReport(type, format, { tenantId, officeId, from, to, direction, shiftTime });
    // @Res() bypasses the envelope interceptor, so JSON reports carry the same envelope by hand.
    if (out.format === 'json') {
      res.status(200).json({ success: true, data: out.body, timestamp: new Date().toISOString() });
      return;
    }
    res.set({
      'Content-Type': out.contentType,
      'Content-Disposition': `attachment; filename="${out.filename}"`,
      'Cache-Control': 'no-store',
    });
    res.status(200).send(out.body);
  }
}
