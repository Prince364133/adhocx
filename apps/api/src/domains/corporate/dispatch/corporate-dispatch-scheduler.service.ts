import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { CorporateDispatchService } from './corporate-dispatch.service';

export interface DispatchSchedulerTickResult {
  evaluatedRoutesCount: number;
  dispatchedRoutes: string[];
  reapedOffers: string[];
}

/**
 * Autonomous Dispatch Scheduler & 60-Second Offer Timeout Reaper.
 *
 * Responsibilities:
 * 1. Evaluates all PLANNED corporate routes and automatically dispatches drivers T-60m
 *    prior to Stop 1 pickup (or earlier if DDA detected severe traffic delay >= 30m).
 * 2. Continuously audits active 60-second driver offers, automatically reaping timed-out offers,
 *    blacklisting the non-responsive driver, and cascading to the next closest candidate in the H3 grid.
 */
@Injectable()
export class CorporateDispatchSchedulerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CorporateDispatchSchedulerService.name);
  private poller?: NodeJS.Timeout;
  private isTicking = false;
  private readonly POLL_INTERVAL_MS = 30000; // 30 seconds poll interval

  constructor(
    private readonly db: DatabaseService,
    private readonly dispatchService: CorporateDispatchService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  onModuleInit() {
    this.poller = setInterval(() => {
      this.tick().catch((err) =>
        this.logger.warn(`Corporate dispatch scheduler tick error: ${err.message}`),
      );
    }, this.POLL_INTERVAL_MS);
    this.poller.unref();
    this.logger.log('Corporate Autonomous Dispatch Scheduler initialized (30s poller)');
  }

  onModuleDestroy() {
    if (this.poller) {
      clearInterval(this.poller);
    }
  }

  /**
   * Main scheduler tick. Public so unit and integration tests can drive time deterministically.
   */
  public async tick(
    nowMs: number = Date.now(),
  ): Promise<DispatchSchedulerTickResult> {
    if (this.isTicking) {
      return { evaluatedRoutesCount: 0, dispatchedRoutes: [], reapedOffers: [] };
    }

    this.isTicking = true;
    const dispatchedRoutes: string[] = [];
    const reapedOffers: string[] = [];
    let evaluatedRoutesCount = 0;

    try {
      // 1. Reap Expired 60-second driver offers
      const reaped = await this.reapExpiredOffers(nowMs);
      reapedOffers.push(...reaped);

      // 2. Evaluate and dispatch upcoming PLANNED routes based on DDA
      const dispatched = await this.evaluateAndDispatchUpcomingRoutes(nowMs);
      dispatchedRoutes.push(...dispatched.routes);
      evaluatedRoutesCount = dispatched.totalEvaluated;

      return {
        evaluatedRoutesCount,
        dispatchedRoutes,
        reapedOffers,
      };
    } finally {
      this.isTicking = false;
    }
  }

  /**
   * Identifies PLANNED corporate routes approaching their dispatch lead window (considering DDA traffic delay).
   */
  private async evaluateAndDispatchUpcomingRoutes(
    nowMs: number,
  ): Promise<{ totalEvaluated: number; routes: string[] }> {
    // Look ahead window: Routes starting within next 4 hours
    const windowEnd = new Date(nowMs + 4 * 60 * 60 * 1000);
    const windowStart = new Date(nowMs - 2 * 60 * 60 * 1000); // Also catch any slightly overdue

    const candidateRoutes = await this.db.corporateRoute.findMany({
      where: {
        status: 'PLANNED',
        targetPickup1Time: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        stops: { orderBy: { stopSequence: 'asc' } },
        office: true,
        tenant: true,
      },
    });

    const triggeredRouteIds: string[] = [];

    for (const route of candidateRoutes) {
      try {
        const dda = await this.dispatchService.assessDynamicTraffic(route.id);
        const effectiveDispatchTimeMs = dda.adjustedDispatchTime.getTime();

        if (effectiveDispatchTimeMs <= nowMs) {
          this.logger.log(
            `[AUTONOMOUS_DISPATCH] Triggering dispatch for route ${route.id} (${route.direction} | ${route.tenant.name}). ` +
              `Pickup 1: ${route.targetPickup1Time.toISOString()} | DDA Delay: ${dda.trafficDelayMinutes}m`,
          );

          await this.dispatchService.dispatchRoute(route.id, false);
          triggeredRouteIds.push(route.id);
        }
      } catch (err: any) {
        this.logger.error(
          `Failed to evaluate/dispatch route ${route.id}: ${err.message}`,
          err.stack,
        );
      }
    }

    return {
      totalEvaluated: candidateRoutes.length,
      routes: triggeredRouteIds,
    };
  }

  /**
   * Scans active driver offers in Redis. If the 60-second countdown has elapsed without driver response,
   * reaps the offer, blacklists the unresponsive driver, and automatically cascades to the next candidate.
   */
  private async reapExpiredOffers(nowMs: number): Promise<string[]> {
    const client = this.redis?.getClient();
    if (!client) return [];

    const activeRouteIds = await client.smembers('corporate:active_offers_set');
    if (!activeRouteIds || activeRouteIds.length === 0) return [];

    const reapedRouteIds: string[] = [];

    for (const routeId of activeRouteIds) {
      try {
        const rawOffer = await client.get(`corporate:route:offer:${routeId}`);

        if (!rawOffer) {
          // Offer key expired in Redis (TTL elapsed past 60s)
          const fallbackDriverId = await client.get(`corporate:offer_driver:${routeId}`);
          if (fallbackDriverId) {
            this.logger.warn(
              `[TIMEOUT_REAPER] 60-second offer expired for route ${routeId} (Driver: ${fallbackDriverId}). Reaping and cascading...`,
            );
            this.notifications.emitEvent('admin:operations', 'CORPORATE_OFFER_TIMED_OUT', {
              routeId,
              driverId: fallbackDriverId,
              reason: 'TTL_EXPIRED',
            });
            await this.audit.log({
              action: 'CORPORATE_OFFER_TIMEOUT_REAPED',
              entityId: routeId,
              entityType: 'CORPORATE_ROUTE',
              metadata: { driverId: fallbackDriverId, reason: 'TTL_EXPIRED' },
            });
            await this.dispatchService.rejectRouteOffer(
              routeId,
              fallbackDriverId,
              'OFFER_TIMEOUT_EXPIRED',
            );
            reapedRouteIds.push(routeId);
          } else {
            // Clean up stale set member
            await client.srem('corporate:active_offers_set', routeId);
          }
        } else {
          // Check offer timestamp
          const offer = JSON.parse(rawOffer);
          const expiresAtMs = new Date(offer.offerExpiresAt).getTime();
          if (nowMs >= expiresAtMs) {
            this.logger.warn(
              `[TIMEOUT_REAPER] Offer expired by timestamp for route ${routeId} (Driver: ${offer.driverId}). Reaping...`,
            );
            this.notifications.emitEvent('admin:operations', 'CORPORATE_OFFER_TIMED_OUT', {
              routeId,
              driverId: offer.driverId,
              reason: 'TIMESTAMP_EXPIRED',
            });
            await this.audit.log({
              action: 'CORPORATE_OFFER_TIMEOUT_REAPED',
              entityId: routeId,
              entityType: 'CORPORATE_ROUTE',
              metadata: { driverId: offer.driverId, reason: 'TIMESTAMP_EXPIRED' },
            });
            await this.dispatchService.rejectRouteOffer(
              routeId,
              offer.driverId,
              'OFFER_TIMEOUT_EXPIRED',
            );
            reapedRouteIds.push(routeId);
          }
        }
      } catch (err: any) {
        this.logger.error(
          `Error in timeout reaper for route ${routeId}: ${err.message}`,
        );
      }
    }

    return reapedRouteIds;
  }
}
