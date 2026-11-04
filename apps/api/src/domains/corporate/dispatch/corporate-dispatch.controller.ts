import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@adhocx/contracts';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CorporateAccessGuard } from '../../../common/guards/corporate-access.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CorporateResource, CorporateTenantScoped } from '../../../common/decorators/corporate-resource.decorator';
import { DatabaseService } from '../../../database/database.service';

import { CorporateDispatchService } from './corporate-dispatch.service';
import { RedisService } from '../../../redis/redis.service';

@ApiTags('Corporate ETS - Autonomous Dispatch & DDA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, CorporateAccessGuard)
@Controller('corporate/dispatch')
export class CorporateDispatchController {
  constructor(
    private readonly dispatchService: CorporateDispatchService,
    private readonly redis: RedisService,
    private readonly db: DatabaseService,
  ) {}

  @Post('routes/:id/start-now')
  @Roles(UserRole.ADMIN)
  @CorporateResource('route', 'id')
  @ApiOperation({
    summary: 'Manual Super Admin dispatch override: Immediately initiates H3 driver dispatch ("Start" button)',
  })
  public async forceStartDispatch(
    @Param('id') routeId: string,
    @Body('actorUserId') actorUserId?: string,
    @Req() req?: any,
  ) {
    // Audit actor is the authenticated admin, never a client-supplied id.
    return this.dispatchService.dispatchRoute(routeId, true, req?.user?.id ?? actorUserId);
  }

  @Post('routes/:id/offers/accept')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('route', 'id', { driverMode: 'offer' })
  @ApiOperation({ summary: 'Driver accepts atomic corporate route offer within 60 seconds' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        driverId: { type: 'string' },
      },
      required: ['driverId'],
    },
  })
  public async acceptOffer(
    @Param('id') routeId: string,
    @Body('driverId') driverId: string,
  ) {
    if (!driverId) {
      throw new BadRequestException('driverId is required');
    }
    return this.dispatchService.acceptRouteOffer(routeId, driverId);
  }

  @Post('routes/:id/offers/reject')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateResource('route', 'id', { driverMode: 'offer' })
  @ApiOperation({ summary: 'Driver declines corporate route offer or offer expires; cascades to next candidate' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        driverId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['driverId'],
    },
  })
  public async rejectOffer(
    @Param('id') routeId: string,
    @Body('driverId') driverId: string,
    @Body('reason') reason?: string,
  ) {
    if (!driverId) {
      throw new BadRequestException('driverId is required');
    }
    await this.dispatchService.rejectRouteOffer(routeId, driverId, reason);
    return { success: true, message: 'Offer declined. Route cascaded to next candidate.' };
  }

  @Get('routes/:id/traffic-assessment')
  @Roles(UserRole.ADMIN)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Evaluate Dynamic Traffic Advancer (DDA) delay and advance dispatch if congested' })
  public async getTrafficAssessment(@Param('id') routeId: string) {
    return this.dispatchService.assessDynamicTraffic(routeId);
  }

  @Get('routes/:id/status')
  @Roles(UserRole.ADMIN, UserRole.CORPORATE_ADMIN, UserRole.CORPORATE_MANAGER)
  @CorporateResource('route', 'id')
  @ApiOperation({ summary: 'Get current real-time dispatch offer state for a corporate route' })
  public async getDispatchStatus(@Param('id') routeId: string) {
    const client = this.redis.getClient();
    const rawOffer = client ? await client.get(`corporate:route:offer:${routeId}`) : null;
    const ttl = client ? await client.ttl(`corporate:route:offer:${routeId}`) : -1;

    return {
      routeId,
      hasActiveOffer: Boolean(rawOffer),
      remainingTtlSeconds: ttl > 0 ? ttl : 0,
      activeOffer: rawOffer ? JSON.parse(rawOffer) : null,
    };
  }

  @Get('my-offer')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Check if driver has a live 60-second corporate route offer (UI-04-01)' })
  public async getMyActiveOffer(@Req() req: any) {
    const driver = await this.db.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) return { hasOffer: false };
    const client = this.redis.getClient();
    if (!client) return { hasOffer: false };

    const routeId = await client.get(`corporate:driver:offer_hold:${driver.id}`);
    if (!routeId) return { hasOffer: false };

    const rawOffer = await client.get(`corporate:route:offer:${routeId}`);
    if (!rawOffer) return { hasOffer: false };

    const ttlSeconds = await client.ttl(`corporate:route:offer:${routeId}`);
    let parsedOffer: any = null;
    try {
      parsedOffer = JSON.parse(rawOffer);
    } catch {
      parsedOffer = rawOffer;
    }

    return {
      hasOffer: true,
      routeId,
      remainingTtlSeconds: Math.max(0, ttlSeconds),
      offer: parsedOffer,
    };
  }
  @Get('driver-offers')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Retrieve currently active corporate route offer for authenticated driver (UI Reconnect)' })
  public async getDriverOffers(@Req() req: any) {
    const driver = await this.db.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) return { hasActiveOffer: false };
    return this.dispatchService.getDriverActiveOffer(driver.id);
  }

  @Get('driver-duties')
  @Roles(UserRole.ADMIN, UserRole.DRIVER)
  @CorporateTenantScoped()
  @ApiOperation({ summary: 'Retrieve upcoming assigned corporate routes and duties for authenticated driver' })
  public async getDriverDuties(@Req() req: any) {
    const driver = await this.db.driver.findUnique({ where: { userId: req.user.id } });
    if (!driver) return [];
    return this.dispatchService.getDriverAssignedDuties(driver.id);
  }
}
