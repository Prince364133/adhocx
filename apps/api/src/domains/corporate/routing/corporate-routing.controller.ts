import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
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
import { CorporateRoutePlannerService, CommitPlanDto, PlanRoutesResult } from './corporate-route-planner.service';
import { generateSampleCsv, generateSampleExcelBuffer } from './sample-roster-generator';
import { DatabaseService } from '../../../database/database.service';
import { RouteOptimizationOptions } from './routing.types';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource, CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';

@ApiTags('Corporate ETS - Routing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/routes')
export class CorporateRoutingController {
  constructor(
    private readonly routeSolverService: RouteSolverService,
    private readonly db: DatabaseService,
    private readonly routePlannerService?: CorporateRoutePlannerService,
  ) {}

  @Post('plan-from-file')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Calculate traffic-aware routes and clustered cabs from an uploaded employee pickup Excel/CSV' })
  public async planFromFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('A valid employee pickup file (.xlsx, .xls, .csv) must be uploaded');
    }

    const office = body.office || body.officeName;
    const loginTime = body.loginTime || body.deadline;

    if (!office) {
      throw new BadRequestException('office address is required');
    }
    if (!loginTime) {
      throw new BadRequestException('loginTime (or deadline) is required');
    }

    const excluded = body.excludedEmployees
      ? typeof body.excludedEmployees === 'string'
        ? body.excludedEmployees.split(',').map((s: string) => s.trim())
        : body.excludedEmployees
      : undefined;

    let pricingConfig = undefined;
    if (body.pricingConfig) {
      try {
        pricingConfig = typeof body.pricingConfig === 'string' ? JSON.parse(body.pricingConfig) : body.pricingConfig;
      } catch {
        // ignore parse error and fallback to default
      }
    }

    return this.routePlannerService!.planFromFile(
      file.buffer,
      file.originalname || 'employees.xlsx',
      {
        office,
        loginTime,
        logoutTime: body.logoutTime,
        officeRadiusKm: body.officeRadiusKm ? Number(body.officeRadiusKm) : 50,
        maxTripKm: body.maxTripKm ? Number(body.maxTripKm) : 50,
        bufferMinutes: body.bufferMinutes ? Number(body.bufferMinutes) : 15,
        pickupWaitMinutes: body.pickupWaitMinutes ? Number(body.pickupWaitMinutes) : 5,
        cabCapacity: body.cabCapacity ? Number(body.cabCapacity) : 4,
        routingPreference: body.routingPreference || 'TRAFFIC_UNAWARE',
        avoidTolls: body.avoidTolls === undefined ? true : body.avoidTolls === 'true' || body.avoidTolls === true,
        avoidHighways: body.avoidHighways === 'true' || body.avoidHighways === true,
        excludedEmployees: excluded,
        pricingConfig,
      },
    );
  }

  @Post('plan-stream')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Stream route planning progress in real-time via Server-Sent Events (SSE)' })
  public async planStream(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Res() res: Response,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('A valid employee pickup file (.xlsx, .xls, .csv) must be uploaded');
    }

    const office = body.office || body.officeName;
    const loginTime = body.loginTime || body.deadline;

    if (!office) {
      throw new BadRequestException('office address is required');
    }
    if (!loginTime) {
      throw new BadRequestException('loginTime (or deadline) is required');
    }

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

      const excluded = body.excludedEmployees
        ? typeof body.excludedEmployees === 'string'
          ? body.excludedEmployees.split(',').map((s: string) => s.trim())
          : body.excludedEmployees
        : undefined;

      let pricingConfig = undefined;
      if (body.pricingConfig) {
        try {
          pricingConfig = typeof body.pricingConfig === 'string' ? JSON.parse(body.pricingConfig) : body.pricingConfig;
        } catch {
          // ignore parse error and fallback to default
        }
      }

      const plan = await this.routePlannerService!.planFromFile(
        file.buffer,
        file.originalname || 'employees.xlsx',
        {
          office,
          loginTime,
          logoutTime: body.logoutTime,
          officeRadiusKm: body.officeRadiusKm ? Number(body.officeRadiusKm) : 50,
          maxTripKm: body.maxTripKm ? Number(body.maxTripKm) : 50,
          bufferMinutes: body.bufferMinutes ? Number(body.bufferMinutes) : 15,
          pickupWaitMinutes: body.pickupWaitMinutes ? Number(body.pickupWaitMinutes) : 5,
          cabCapacity: body.cabCapacity ? Number(body.cabCapacity) : 4,
          routingPreference: body.routingPreference || 'TRAFFIC_UNAWARE',
          avoidTolls: body.avoidTolls === undefined ? true : body.avoidTolls === 'true' || body.avoidTolls === true,
          avoidHighways: body.avoidHighways === 'true' || body.avoidHighways === true,
          excludedEmployees: excluded,
          pricingConfig,
        },
        (type, percent, message, data) => {
          latestPercent = percent;
          sendSse('progress', { stage: type, percent, message, data });
        },
      );

      sendSse('complete', { stage: 'COMPLETED', percent: 100, message: 'Route calculation completed successfully!', plan });
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
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
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

  @Post('commit-plan')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Commit calculated route plan into active corporate routes in the database' })
  public async commitPlan(@Body() body: CommitPlanDto) {
    if (!body.tenantId || !body.officeId || !body.shiftDate || !body.shiftTime || !body.plan) {
      throw new BadRequestException('tenantId, officeId, shiftDate, shiftTime, and plan are required');
    }
    return this.routePlannerService!.commitPlanToDatabase(body);
  }

  @Get('sample-template')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
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
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
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
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Plan capacity- and ride-time-constrained corporate routes for a shift on road travel times' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        officeId: { type: 'string' },
        shiftDate: { type: 'string', example: '2026-11-10' },
        shiftTime: { type: 'string', example: '08:00' },
        direction: { type: 'string', enum: ['LOGIN', 'LOGOUT'] },
        vehicleCategory: { type: 'string', enum: ['SEDAN', 'SUV'], default: 'SEDAN' },
        maxCapacity: { type: 'number', example: 4 },
        officeBufferMinutes: { type: 'number', default: 10 },
        maxRideTimeMinutes: { type: 'number', default: 120 },
        logoutReportingBufferMinutes: { type: 'number', default: 15 },
      },
      required: ['tenantId', 'officeId', 'shiftDate', 'shiftTime', 'direction'],
    },
  })
  public async optimizeRoutes(@Body() body: RouteOptimizationOptions) {
    if (!body.tenantId || !body.officeId || !body.shiftDate || !body.shiftTime || !body.direction) {
      throw new BadRequestException(
        'Missing required parameters: tenantId, officeId, shiftDate, shiftTime, direction',
      );
    }

    return this.routeSolverService.optimizeAndCreateRoutes(body);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'List corporate routes with optional filters (paged: limit default 500, max 1000; offset)' })
  public async listRoutes(
    @Query('tenantId') tenantId: string,
    @Query('shiftDate') shiftDate?: string,
    @Query('shiftTime') shiftTime?: string,
    @Query('direction') direction?: 'LOGIN' | 'LOGOUT',
    @Query('status') status?: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId query parameter is required');
    }
    const take = Math.min(Math.max(Number.parseInt(limit ?? '', 10) || 500, 1), 1000);
    const skip = Math.max(Number.parseInt(offset ?? '', 10) || 0, 0);

    const where: any = { tenantId };
    if (shiftDate) {
      where.shiftDate = new Date(shiftDate);
    }
    if (shiftTime) {
      where.shiftTime = shiftTime;
    }
    if (direction) {
      where.direction = direction;
    }
    if (status) {
      where.status = status;
    }

    return this.db.corporateRoute.findMany({
      where,
      include: {
        office: {
          select: { id: true, code: true, name: true },
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
      },
      orderBy: [{ shiftDate: 'desc' }, { shiftTime: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      take,
      skip,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPS, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.DRIVER)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Get full itinerary and ordered stops for a specific corporate route' })
  public async getRouteById(@Param('id') id: string) {
    const route = await this.db.corporateRoute.findUnique({
      where: { id },
      include: {
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

    return route;
  }
}
