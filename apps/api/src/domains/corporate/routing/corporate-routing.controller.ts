import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { RouteSolverService } from './route-solver.service';
import { DatabaseService } from '../../../database/database.service';
import { RouteOptimizationOptions } from './routing.types';

@ApiTags('Corporate ETS - Routing')
@Controller('v1/corporate/routes')
export class CorporateRoutingController {
  constructor(
    private readonly routeSolverService: RouteSolverService,
    private readonly db: DatabaseService,
  ) {}

  @Post('optimize')
  @ApiOperation({ summary: 'Solve and generate optimized CVRPTW corporate routes for a shift' })
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
