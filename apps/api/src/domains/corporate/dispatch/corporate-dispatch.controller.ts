import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CorporateDispatchService } from './corporate-dispatch.service';
import { RedisService } from '../../../redis/redis.service';

@ApiTags('Corporate ETS - Autonomous Dispatch & DDA')
@Controller('corporate/dispatch')
export class CorporateDispatchController {
  constructor(
    private readonly dispatchService: CorporateDispatchService,
    private readonly redis: RedisService,
  ) {}

  @Post('routes/:id/start-now')
  @ApiOperation({
    summary: 'Manual Super Admin dispatch override: Immediately initiates H3 driver dispatch ("Start" button)',
  })
  public async forceStartDispatch(
    @Param('id') routeId: string,
    @Body('actorUserId') actorUserId?: string,
  ) {
    return this.dispatchService.dispatchRoute(routeId, true, actorUserId);
  }

  @Post('routes/:id/offers/accept')
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
  @ApiOperation({ summary: 'Evaluate Dynamic Traffic Advancer (DDA) delay and advance dispatch if congested' })
  public async getTrafficAssessment(@Param('id') routeId: string) {
    return this.dispatchService.assessDynamicTraffic(routeId);
  }

  @Get('routes/:id/status')
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
}

