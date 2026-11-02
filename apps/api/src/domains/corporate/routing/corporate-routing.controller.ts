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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@adhocx/contracts';
import { RouteSolverService } from './route-solver.service';
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
  ) {}

  @Post('optimize')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN)
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
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'List corporate routes with optional filters' })
  public async listRoutes(
    @Query('tenantId') tenantId: string,
    @Query('shiftDate') shiftDate?: string,
    @Query('shiftTime') shiftTime?: string,
    @Query('direction') direction?: 'LOGIN' | 'LOGOUT',
    @Query('status') status?: any,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId query parameter is required');
    }

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
      orderBy: [{ shiftDate: 'desc' }, { shiftTime: 'asc' }, { createdAt: 'asc' }],
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER, UserRole.DRIVER)
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
