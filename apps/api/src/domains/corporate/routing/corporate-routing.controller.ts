import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  Optional,
  BadRequestException,
  NotFoundException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UserRole } from '@adhocx/contracts';
import { RouteSolverService } from './route-solver.service';
import {
  CorporateRoutePlannerService,
  CommitPlanDto,
  PlanRoutesFromFileOptions,
  PlanRoutesResult,
  PlannerVehicleCategory,
  validatePlanRouteConstraints,
} from './corporate-route-planner.service';
import { CorporateRouteDirectionsService } from './corporate-route-directions.service';
import { generateSampleCsv, generateSampleExcelBuffer } from './sample-roster-generator';
import { DatabaseService } from '../../../database/database.service';
import { RouteOptimizationOptions } from './routing.types';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource, CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';

const ROUTE_STATUSES = ['PLANNED', 'DISPATCHING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];
/** Only platform staff see boarding OTPs; drivers must get them from the employee at the door. */
const OTP_VISIBLE_ROLES = new Set<string>([UserRole.ADMIN, UserRole.OPS]);

@ApiTags('Corporate ETS - Routing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/routes')
export class CorporateRoutingController {
  constructor(
    private readonly routeSolverService: RouteSolverService,
    private readonly db: DatabaseService,
    @Optional() private readonly routePlannerService?: CorporateRoutePlannerService,
    @Optional() private readonly directionsService?: CorporateRouteDirectionsService,
  ) {}

  @Post('plan-from-file')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Calculate traffic-aware routes using employee, office, and arrival details from each roster row' })
  public async planFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('A valid employee route CSV file must be uploaded');
    }

    return this.routePlannerService!.planFromFile(
      file.buffer,
      file.originalname || 'employees.xlsx',
      this.buildPlanOptions(body),
    );
  }

  @Post('plan-stream')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Stream route planning progress for an uploaded employee route CSV via Server-Sent Events (SSE)' })
  public async planStream(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Res() res: Response,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('A valid employee route CSV file must be uploaded');
    }
    const requestedDirection = String(body.direction ?? 'LOGIN').toUpperCase();
    if (!['LOGIN', 'LOGOUT', 'BOTH'].includes(requestedDirection)) {
      throw new BadRequestException('Roster planning direction must be LOGIN, LOGOUT, or BOTH');
    }
    const rosterLoginTime = body.loginTime || body.deadline;
    if (
      (requestedDirection === 'LOGIN' || requestedDirection === 'BOTH') &&
      !this.isRosterDeadline(rosterLoginTime)
    ) {
      throw new BadRequestException('LOGIN roster planning requires a valid loginTime date and time');
    }
    if (requestedDirection === 'LOGOUT' || requestedDirection === 'BOTH') {
      if (!this.isRosterDeadline(body.logoutTime)) {
        throw new BadRequestException('LOGOUT roster planning requires a valid logoutTime date and time');
      }
    }
    const batchDirections = requestedDirection === 'BOTH';
    const planOptions = this.buildPlanOptions({
      ...body,
      direction: batchDirections ? 'LOGIN' : requestedDirection,
    });
    validatePlanRouteConstraints(planOptions);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    let latestPercent = 2;
    let streamClosed = false;
    let heartbeat: NodeJS.Timeout | undefined;
    const sendSse = (event: string, payload: any) => {
      if (streamClosed || res.writableEnded || (res as any).destroyed) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    };
    const stopHeartbeat = () => {
      streamClosed = true;
      clearInterval(heartbeat);
    };
    if (typeof (res as any).once === 'function') {
      (res as any).once('close', stopHeartbeat);
    }

    try {
      sendSse('progress', { stage: 'INIT', percent: 2, message: 'Initiating solver & loading roster...' });
      heartbeat = setInterval(() => {
        sendSse('progress', {
          stage: 'heartbeat',
          percent: latestPercent,
          message: 'Route planning is still running...',
        });
      }, 15_000);

      const onProgress = (type: string, percent: number, message: string, data?: any) => {
        latestPercent = percent;
        sendSse('progress', { stage: type, percent, message, data });
      };
      if (batchDirections) {
        const { direction: _direction, ...batchOptions } = planOptions;
        const batch = await this.routePlannerService!.planBatchFromFile(
          file.buffer,
          file.originalname || 'employees.xlsx',
          {
            ...batchOptions,
            loginTime: body.loginTime,
            logoutTime: body.logoutTime,
          },
          onProgress,
        );
        sendSse('complete', {
          stage: 'COMPLETED',
          percent: 100,
          message: 'Both direction plans completed with explicit per-direction outcomes.',
          batch,
        });
      } else {
        const plan = await this.routePlannerService!.planFromFile(
          file.buffer,
          file.originalname || 'employees.xlsx',
          planOptions,
          onProgress,
        );
        sendSse('complete', { stage: 'COMPLETED', percent: 100, message: 'Route calculation completed successfully!', plan });
      }
      stopHeartbeat();
      res.end();
    } catch (err: any) {
      sendSse('error', { stage: 'FAILED', percent: 0, message: err.message || 'Route planning encountered an error' });
      stopHeartbeat();
      res.end();
    } finally {
      stopHeartbeat();
      if (typeof (res as any).removeListener === 'function') {
        (res as any).removeListener('close', stopHeartbeat);
      }
    }
  }

  @Post('plan-from-file/stream')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Alias for plan-stream via Server-Sent Events' })
  public async planFromFileStream(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Res() res: Response,
  ) {
    return this.planStream(file, body, res);
  }

  /** Multipart form fields -> planner options. Absent numeric fields fall back to the company policy. */
  private buildPlanOptions(body: any): PlanRoutesFromFileOptions {
    const num = (field: string, v: unknown): number | undefined => {
      if (v === undefined || v === null) return undefined;
      if (v === '') throw new BadRequestException(`${field} must be a number`);
      const n = Number(v);
      if (!Number.isFinite(n)) throw new BadRequestException(`${field} must be a number`);
      return n;
    };
    const bool = (field: string, v: unknown, fallback: boolean): boolean => {
      if (v === undefined || v === null) return fallback;
      if (v === true || v === 'true') return true;
      if (v === false || v === 'false') return false;
      throw new BadRequestException(`${field} must be true or false`);
    };
    let pricingConfig = undefined;
    if (body.pricingConfig) {
      try {
        pricingConfig = typeof body.pricingConfig === 'string' ? JSON.parse(body.pricingConfig) : body.pricingConfig;
      } catch (_error) {
        throw new BadRequestException('pricingConfig must contain valid JSON');
      }
    }
    const direction = String(body.direction ?? 'LOGIN').toUpperCase();
    if (direction !== 'LOGIN' && direction !== 'LOGOUT') {
      throw new BadRequestException('Roster planning requires one direction: LOGIN or LOGOUT');
    }
    const vehicleCategory = String(body.vehicleCategory ?? 'BOTH').toUpperCase();
    if (!['SEDAN', 'SUV', 'BOTH'].includes(vehicleCategory)) {
      throw new BadRequestException('vehicleCategory must be SEDAN, SUV, or BOTH');
    }
    const routingPreference = body.routingPreference ?? 'TRAFFIC_UNAWARE';
    if (!['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'].includes(routingPreference)) {
      throw new BadRequestException('routingPreference is not supported');
    }
    return {
      tenantId: body.tenantId,
      officeId: body.officeId,
      office: body.office || body.officeName,
      officeLat: num('officeLat', body.officeLat),
      officeLng: num('officeLng', body.officeLng),
      direction,
      loginTime: body.loginTime || body.deadline,
      logoutTime: body.logoutTime,
      officeRadiusKm: num('officeRadiusKm', body.officeRadiusKm) ?? 50,
      maxTripKm: num('maxTripKm', body.maxTripKm) ?? 50,
      bufferMinutes: num('bufferMinutes', body.bufferMinutes),
      pickupWaitMinutes: num('pickupWaitMinutes', body.pickupWaitMinutes),
      cabCapacity: num('cabCapacity', body.cabCapacity),
      vehicleCategory: vehicleCategory as PlannerVehicleCategory,
      sedanCapacity: num('sedanCapacity', body.sedanCapacity),
      suvCapacity: num('suvCapacity', body.suvCapacity),
      routingPreference,
      avoidTolls: bool('avoidTolls', body.avoidTolls, true),
      avoidHighways: bool('avoidHighways', body.avoidHighways, false),
      pricingConfig,
    };
  }

  @Post('commit-plan')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Commit calculated route plan into active corporate routes in the database' })
  public async commitPlan(@Body() body: CommitPlanDto) {
    if (!body.tenantId || !body.officeId || !body.shiftDate || !body.shiftTime || !body.plan) {
      throw new BadRequestException('tenantId, officeId, shiftDate, shiftTime, and plan are required');
    }
    return this.routePlannerService!.commitPlanToDatabase(body);
  }

  @Get('sample-template')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Download sample Excel or CSV template for employee pickup routing' })
  public async downloadSampleTemplate(@Query('format') format: string, @Res() res: Response) {
    const isCsv = (format || '').toLowerCase() === 'csv';

    if (isCsv) {
      const csv = generateSampleCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sample-employee-pickups.csv"');
      return res.status(HttpStatus.OK).send(csv);
    }

    const buffer = await generateSampleExcelBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sample-employee-pickups.xlsx"');
    return res.status(HttpStatus.OK).send(buffer);
  }

  @Post('export-plan')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Export calculated route plan to formatted multi-sheet Excel file' })
  public async exportPlanToExcel(@Body() plan: PlanRoutesResult, @Res() res: Response) {
    if (!plan || !plan.routes) {
      throw new BadRequestException('Valid plan object is required');
    }
    const buffer = await this.routePlannerService!.exportPlanToExcel(plan);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="planned-corporate-routes.xlsx"');
    return res.status(HttpStatus.OK).send(buffer);
  }

  @Post('optimize')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Plan capacity- and ride-time-constrained corporate routes for a shift on road travel times' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        officeId: { type: 'string' },
        shiftDate: { type: 'string', example: '2026-11-10' },
        direction: { type: 'string', enum: ['LOGIN', 'LOGOUT', 'BOTH'] },
        loginTime: { type: 'string', example: '08:00' },
        logoutTime: { type: 'string', example: '17:00' },
        vehicleCategory: { type: 'string', enum: ['SEDAN', 'SUV', 'BOTH'], default: 'SEDAN' },
        maxCapacity: { type: 'number', example: 3 },
        sedanCapacity: { type: 'number', example: 3 },
        suvCapacity: { type: 'number', example: 6 },
        officeBufferMinutes: { type: 'number', default: 10 },
        maxRideTimeMinutes: { type: 'number', default: 120 },
        logoutReportingBufferMinutes: { type: 'number', default: 15 },
        stopDwellMinutes: { type: 'integer', minimum: 1, maximum: 10, default: 5 },
        routingPreference: {
          type: 'string',
          enum: ['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'],
        },
        avoidTolls: { type: 'boolean' },
        avoidHighways: { type: 'boolean' },
      },
      required: ['tenantId', 'officeId', 'shiftDate', 'direction'],
    },
  })
  public async optimizeRoutes(@Body() body: RouteOptimizationOptions) {
    if (!body.tenantId || !body.officeId || !body.shiftDate || !body.direction) {
      throw new BadRequestException('Missing required parameters: tenantId, officeId, shiftDate, direction');
    }
    if (!['LOGIN', 'LOGOUT', 'BOTH'].includes(body.direction)) {
      throw new BadRequestException('direction must be LOGIN, LOGOUT, or BOTH');
    }
    if (!this.isCalendarDate(body.shiftDate)) {
      throw new BadRequestException('shiftDate must be a valid calendar date in YYYY-MM-DD format');
    }
    if ((body.direction === 'LOGIN' || body.direction === 'BOTH') && !this.isShiftTime(body.loginTime)) {
      throw new BadRequestException('LOGIN optimization requires a valid loginTime value (HH:mm)');
    }
    if ((body.direction === 'LOGOUT' || body.direction === 'BOTH') && !this.isShiftTime(body.logoutTime)) {
      throw new BadRequestException('LOGOUT optimization requires a valid logoutTime value (HH:mm)');
    }
    for (const [field, value, min, max] of [
      ['sedanCapacity', body.sedanCapacity, 1, 3],
      ['suvCapacity', body.suvCapacity, 1, 6],
      ['maxCapacity', body.maxCapacity, 1, 6],
      ['stopDwellMinutes', body.stopDwellMinutes, 1, 10],
    ] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) {
        throw new BadRequestException(`${field} must be an integer between ${min} and ${max}`);
      }
    }
    if (body.vehicleCategory && !['SEDAN', 'SUV', 'BOTH'].includes(body.vehicleCategory)) {
      throw new BadRequestException('vehicleCategory must be SEDAN, SUV, or BOTH');
    }
    if (
      body.routingPreference !== undefined &&
      !['TRAFFIC_UNAWARE', 'TRAFFIC_AWARE', 'TRAFFIC_AWARE_OPTIMAL'].includes(body.routingPreference)
    ) {
      throw new BadRequestException('routingPreference is not supported');
    }
    if (body.maxCapacity !== undefined) {
      const maxSelectedCapacity =
        body.vehicleCategory === 'SUV'
          ? body.suvCapacity ?? 6
          : body.vehicleCategory === 'SEDAN'
            ? body.sedanCapacity ?? 3
            : Math.max(body.sedanCapacity ?? 3, body.suvCapacity ?? 6);
      if (body.maxCapacity > maxSelectedCapacity) {
        throw new BadRequestException('maxCapacity cannot exceed the selected vehicle category capacity');
      }
    }

    return this.routeSolverService.optimizeAndCreateRoutes(body);
  }

  private isCalendarDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  private isShiftTime(value?: string): boolean {
    return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  private isRosterDeadline(value?: string | Date): boolean {
    if (value instanceof Date) return Number.isFinite(value.getTime());
    if (typeof value !== 'string') return false;
    const match = /^(\d{4}-\d{2}-\d{2})[T ]((?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?)(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)?$/i.exec(
      value,
    );
    return Boolean(match && this.isCalendarDate(match[1]) && Number.isFinite(new Date(value).getTime()));
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'List corporate routes with optional filters (paged: limit default 500, max 1000; offset)' })
  public async listRoutes(
    @Query('tenantId') tenantId?: string,
    @Query('shiftDate') shiftDate?: string,
    @Query('shiftTime') shiftTime?: string,
    @Query('direction') direction?: 'LOGIN' | 'LOGOUT',
    @Query('status') status?: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('includeStops') includeStops?: string,
    @Query('includeAnalytics') includeAnalytics?: string,
    @Query('dispatchStatus') dispatchStatus?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const role = req?.user?.role;
    const isPlatformStaff = role === UserRole.ADMIN || role === UserRole.OPS;
    if (!tenantId && !isPlatformStaff) {
      throw new BadRequestException('tenantId query parameter is required');
    }
    return this.queryRoutes({
      officeScope: req?.corporateOfficeScope ?? null,
      tenantId: tenantId || undefined,
      shiftDate,
      shiftTime,
      direction,
      status,
      limit,
      offset,
      includeStops,
      includeAnalytics,
      dispatchStatus,
      search,
    });
  }

  @Get('portal')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'List tenant-isolated routes, statuses, and stops for Corporate Portal & Ops monitoring' })
  public async listPortalRoutes(
    @Query('tenantId') tenantId?: string,
    @Query('shiftDate') shiftDate?: string,
    @Query('shiftTime') shiftTime?: string,
    @Query('direction') direction?: 'LOGIN' | 'LOGOUT',
    @Query('status') status?: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('includeStops') includeStops?: string,
    @Query('includeAnalytics') includeAnalytics?: string,
    @Query('dispatchStatus') dispatchStatus?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    return this.queryRoutes({
      officeScope: req?.corporateOfficeScope ?? null,
      tenantId: tenantId || undefined,
      shiftDate,
      shiftTime,
      direction,
      status,
      limit,
      offset,
      includeStops,
      includeAnalytics,
      dispatchStatus,
      search,
    });
  }

  private async queryRoutes(params: {
    /** WS-F office scope of a corporate user (null = all offices). */
    officeScope?: string[] | null;
    tenantId?: string;
    shiftDate?: string;
    shiftTime?: string;
    direction?: 'LOGIN' | 'LOGOUT';
    status?: any;
    limit?: string;
    offset?: string;
    includeStops?: string;
    includeAnalytics?: string;
    dispatchStatus?: string;
    search?: string;
  }) {
    const {
      tenantId,
      shiftDate,
      shiftTime,
      direction,
      status,
      limit,
      offset,
      includeStops,
      includeAnalytics,
      dispatchStatus,
      search,
    } = params;

    const take = Math.min(Math.max(Number.parseInt(limit ?? '', 10) || 500, 1), 1000);
    const skip = Math.max(Number.parseInt(offset ?? '', 10) || 0, 0);

    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }
    if (params.officeScope && params.officeScope.length > 0) {
      where.officeId = { in: params.officeScope };
    }
    if (shiftDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(shiftDate) || Number.isNaN(new Date(shiftDate).getTime())) {
        throw new BadRequestException('shiftDate must be YYYY-MM-DD');
      }
      where.shiftDate = new Date(shiftDate);
    }
    if (shiftTime) {
      where.shiftTime = shiftTime;
    }
    if (direction) {
      if (direction !== 'LOGIN' && direction !== 'LOGOUT') {
        throw new BadRequestException('direction must be LOGIN or LOGOUT');
      }
      where.direction = direction;
    }
    if (status) {
      if (!ROUTE_STATUSES.includes(String(status))) {
        throw new BadRequestException(`status must be one of ${ROUTE_STATUSES.join(', ')}`);
      }
      where.status = status;
    }
    if (dispatchStatus) {
      where.dispatchStatus = dispatchStatus;
    }
    const q = search?.trim();
    if (q) {
      where.OR = [
        { tenant: { name: { contains: q, mode: 'insensitive' } } },
        { tenant: { code: { contains: q, mode: 'insensitive' } } },
        { office: { name: { contains: q, mode: 'insensitive' } } },
        { driver: { fullName: { contains: q, mode: 'insensitive' } } },
        { vehicle: { registrationNumber: { contains: q, mode: 'insensitive' } } },
        { stops: { some: { employeeName: { contains: q, mode: 'insensitive' } } } },
        { stops: { some: { employee: { fullName: { contains: q, mode: 'insensitive' } } } } },
      ];
    }

    const routes: any[] = await this.db.corporateRoute.findMany({
      where,
      include: {
        tenant: {
          select: { id: true, code: true, name: true },
        },
        office: {
          select: { id: true, code: true, name: true, addressText: true, latitude: true, longitude: true },
        },
        driver: {
          select: { id: true, fullName: true, phone: true },
        },
        vehicle: {
          select: { id: true, registrationNumber: true, model: true, vehicleType: true },
        },
        _count: {
          select: { stops: true },
        },
        ...(includeStops === 'true'
          ? {
              stops: {
                orderBy: { stopSequence: 'asc' as const },
                select: {
                  id: true,
                  stopSequence: true,
                  stopType: true,
                  status: true,
                  addressText: true,
                  employeeName: true,
                  employeePhone: true,
                  latitude: true,
                  longitude: true,
                  plannedEta: true,
                  actualArrivalTime: true,
                  actualDepartureTime: true,
                  dwellBufferSeconds: true,
                  noShowReason: true,
                  employee: {
                    select: {
                      id: true,
                      employeeCode: true,
                      fullName: true,
                      gender: true,
                      phoneNumber: true,
                      department: true,
                      locations: {
                        where: { isDefault: true },
                        take: 1,
                        select: { addressText: true },
                      },
                    },
                  },
                },
              },
            }
          : {}),
      },
      orderBy: [{ shiftDate: 'desc' }, { shiftTime: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take,
      skip,
    });

    const routesWithStopAddresses = includeStops === 'true'
      ? routes.map((route) => ({
          ...route,
          stops: route.stops?.map((stop: {
            addressText?: string | null;
            employeeName?: string | null;
            employeePhone?: string | null;
            employee?: { fullName?: string; phoneNumber?: string; locations: Array<{ addressText: string }> } | null;
          }) => ({
            ...stop,
            employeeName: stop.employeeName ?? stop.employee?.fullName ?? null,
            employeePhone: stop.employeePhone ?? stop.employee?.phoneNumber ?? null,
            addressText: stop.addressText
              ?? stop.employee?.locations[0]?.addressText
              ?? (stop.employee ? 'Address unavailable' : route.office?.addressText ?? route.office?.name ?? 'Office destination'),
          })),
        }))
      : routes;

    if (includeAnalytics !== 'true' || routesWithStopAddresses.length === 0) return routesWithStopAddresses;
    const events = await this.db.corporateTripEvent.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        routeId: { in: routesWithStopAddresses.map((route) => route.id) },
        type: { in: ['ROUTE_STARTED', 'ROUTE_COMPLETED'] },
      },
      select: { routeId: true, type: true, at: true },
      orderBy: [{ at: 'asc' }, { id: 'asc' }],
    });
    const eventsByRoute = new Map<string, { startedAt?: Date; completedAt?: Date }>();
    for (const event of events) {
      const current = eventsByRoute.get(event.routeId) ?? {};
      if (event.type === 'ROUTE_STARTED' && !current.startedAt) current.startedAt = event.at;
      if (event.type === 'ROUTE_COMPLETED') current.completedAt = event.at;
      eventsByRoute.set(event.routeId, current);
    }

    return routesWithStopAddresses.map((route) => ({
      ...route,
      ...eventsByRoute.get(route.id),
    }));
  }

  @Get(':id/directions')
  @Roles(
    UserRole.ADMIN,
    UserRole.OPS,
    UserRole.DRIVER,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_MANAGER,
  )
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Get real-time Google Maps traffic directions, per-leg ETAs, and polyline for a route' })
  public async getRouteDirections(@Param('id') id: string, @Query('refresh') refresh?: string) {
    if (!this.directionsService) {
      throw new BadRequestException('Route directions service unavailable');
    }
    return this.directionsService.getDirectionsForRoute(id, { forceRefresh: refresh === 'true' });
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.OPS,
    UserRole.DRIVER,
    UserRole.CORPORATE_ADMIN,
    UserRole.CORPORATE_MANAGER,
  )
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Get full itinerary and ordered stops for a specific corporate route' })
  public async getRouteById(
    @Param('id') id: string,
    @Query('includeDirections') includeDirections?: string,
    @Req() req?: any,
  ) {
    const showOtp = OTP_VISIBLE_ROLES.has(String(req?.user?.role ?? '').toUpperCase());
    const route: any = await this.db.corporateRoute.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            code: true,
            name: true,
            legalEntityName: true,
            gstin: true,
            status: true,
          },
        },
        office: true,
        driver: {
          select: { id: true, fullName: true, phone: true },
        },
        vehicle: {
          select: { id: true, registrationNumber: true, model: true, vehicleType: true },
        },
        stops: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                fullName: true,
                gender: true,
                phoneNumber: true,
                email: true,
                department: true,
                locations: {
                  where: { isDefault: true },
                  take: 1,
                  select: { addressText: true },
                },
              },
            },
            transportRequest: {
              select: {
                id: true,
                status: true,
                pickupLat: true,
                pickupLng: true,
                dropoffLat: true,
                dropoffLng: true,
              },
            },
          },
          orderBy: { stopSequence: 'asc' },
        },
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${id} not found`);
    }

    const enrichedStops = (route.stops ?? []).map(({ boardingOtp, ...stop }: any) => ({
      ...stop,
      ...(showOtp ? { boardingOtp } : {}),
      employeeName: stop.employeeName ?? stop.employee?.fullName ?? null,
      employeePhone: stop.employeePhone ?? stop.employee?.phoneNumber ?? null,
      addressText:
        stop.addressText ??
        stop.employee?.locations?.[0]?.addressText ??
        (stop.stopType === 'DROPOFF' && !stop.employee
          ? route.office?.addressText ?? route.office?.name ?? 'Corporate Office Hub'
          : 'Pickup address unavailable'),
    }));

    const enrichedRoute: any = {
      ...route,
      stops: enrichedStops,
    };

    if (includeDirections === 'true' && this.directionsService) {
      // Shared 180 s cache with GET :id/directions: a page load is not a Google Routes call.
      enrichedRoute.directions = await this.directionsService
        .getDirectionsForRoute(id, { routeRecord: enrichedRoute })
        .catch(() => null);
    }

    return enrichedRoute;
  }
}
