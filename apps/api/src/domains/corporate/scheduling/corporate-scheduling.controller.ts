import { BadRequestException, Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';
import { CorporatePermission } from '../tenants/corporate-permissions';
import {
  CorporateShiftTemplateService,
  CreateHolidayInput,
  CreateShiftTemplateInput,
} from './corporate-shift-template.service';
import { CorporateAutoPlannerService } from './corporate-auto-planner.service';

const scopeOf = (req: any): string[] | null => req?.corporateOfficeScope ?? null;
const requireTenant = (tenantId?: string): string => {
  if (!tenantId) throw new BadRequestException('tenantId is required');
  return tenantId;
};

@ApiTags('Corporate ETS - Scheduling (shift templates, holidays, auto-planner)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/scheduling')
export class CorporateSchedulingController {
  constructor(
    private readonly shifts: CorporateShiftTemplateService,
    private readonly autoPlanner: CorporateAutoPlannerService,
  ) {}

  @Get('shift-templates')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @CorporatePermission('shifts:read')
  @ApiOperation({ summary: 'List shift templates of a tenant (optionally one office)' })
  public async listShiftTemplates(@Query('tenantId') tenantId: string, @Query('officeId') officeId?: string, @Req() req?: any) {
    return this.shifts.listShiftTemplates(requireTenant(tenantId), officeId, scopeOf(req));
  }

  @Post('shift-templates')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @CorporatePermission('shifts:write')
  @ApiOperation({ summary: 'Create a shift template (login/logout HH:mm, ISO weekdays; overnight derived from the times)' })
  public async createShiftTemplate(@Body() body: CreateShiftTemplateInput & { tenantId: string }, @Req() req: any) {
    return this.shifts.createShiftTemplate(requireTenant(body?.tenantId), body, req.user?.id, scopeOf(req));
  }

  @Get('holidays')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @CorporatePermission('shifts:read')
  @ApiOperation({ summary: 'List holidays (tenant-wide and per office) between from / to (YYYY-MM-DD)' })
  public async listHolidays(
    @Query('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: any,
  ) {
    return this.shifts.listHolidays(requireTenant(tenantId), from, to, scopeOf(req));
  }

  @Post('holidays')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @CorporatePermission('shifts:write')
  @ApiOperation({ summary: 'Create a holiday (no demand is generated on publish for that shift day)' })
  public async createHoliday(@Body() body: CreateHolidayInput & { tenantId: string }, @Req() req: any) {
    return this.shifts.createHoliday(requireTenant(body?.tenantId), body, req.user?.id, scopeOf(req));
  }

  @Post('auto-plan/run')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Run one autonomous planning pass now (ops); normally runs on its own interval' })
  public async runAutoPlan() {
    return this.autoPlanner.tick();
  }
}
