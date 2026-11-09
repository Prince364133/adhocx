import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  CorporateDispatchKeys,
  CorporateDispatchService,
  withdrawCorporateRouteOffer,
} from '../dispatch/corporate-dispatch.service';
import { CorporateRiderNotifier } from '../execution/corporate-rider-notifier.service';
import {
  AT_RISK_LOOKBACK_MINUTES,
  classifyGpsFreshness,
  escalationLeadMinutes,
  istToday,
  LivePosition,
  OfferState,
  OPS_ROUTE_STATUSES,
  OpsRouteStatus,
  parseDateOnly,
  ReassignRouteDto,
  CancelRouteDto,
  CANCELLABLE_ROUTE_STATUSES,
  routeTelemetryKey,
} from './operations.types';

/** Stops still waiting for the cab; a route cancel moves them to CANCELLED. */
const OPEN_STOP_STATUSES = ['PENDING', 'ARRIVED'] as const;
/** Transport requests already closed are never touched by a route cancel. */
const CLOSED_REQUEST_STATUSES = ['COMPLETED', 'CANCELLED', 'RESCHEDULED'] as const;

/** Upper bound of live (not date-scoped) routes inspected for stale GPS / offer state per board call. */
const LIVE_SCAN_LIMIT = 1000;
const AT_RISK_LIMIT = 200;

/** Board list projection. Deliberately has no fare / payout / OTP fields. */
const ROUTE_SUMMARY_SELECT = {
  id: true,
  tenantId: true,
  officeId: true,
  shiftDate: true,
  shiftTime: true,
  direction: true,
  vehicleCategory: true,
  maxCapacity: true,
  assignedPassengerCount: true,
  targetPickup1Time: true,
  targetOfficeArrivalTime: true,
  status: true,
  driverId: true,
  vehicleId: true,
  updatedAt: true,
  tenant: { select: { id: true, code: true, name: true } },
  office: { select: { id: true, code: true, name: true } },
  driver: { select: { id: true, fullName: true, phone: true } },
  vehicle: { select: { id: true, registrationNumber: true, model: true } },
} as const;

export interface OpsBoardQuery {
  date?: string;
  tenantId?: string;
  officeId?: string;
  page?: number;
  pageSize?: number;
}

export interface OpsActor {
  id?: string;
  role?: string;
}

/**
 * Command-centre (operations) read model + manual reassignment. ADMIN only.
 *
 * Reads come straight from Postgres (counts via groupBy) and the dispatch / telemetry Redis keys;
 * nothing here duplicates dispatch logic: offers are withdrawn with `withdrawCorporateRouteOffer`
 * and automatic re-dispatch goes through `CorporateDispatchService.dispatchRoute`.
 */
@Injectable()
export class CorporateOperationsService {
  private readonly logger = new Logger(CorporateOperationsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly dispatch: CorporateDispatchService,
    @Optional() private readonly riderNotifier?: CorporateRiderNotifier,
  ) {}

  // ---------------------------------------------------------------------------
  // Board
  // ---------------------------------------------------------------------------

  async getBoard(query: OpsBoardQuery, now: Date = new Date()) {
    const day = query.date ?? istToday(now);
    const shiftDate = parseDateOnly(day);
    if (!shiftDate) throw new BadRequestException('date must be a valid YYYY-MM-DD (IST calendar day)');
    const pageSize = clampInt(query.pageSize, 50, 1, 200);
    const page = clampInt(query.page, 1, 1, 10_000);

    const scope: Record<string, any> = {};
    if (query.tenantId) scope.tenantId = query.tenantId;
    if (query.officeId) scope.officeId = query.officeId;
    const dayWhere = { ...scope, shiftDate };
    const leadMin = escalationLeadMinutes();

    const db: any = this.db;
    const [groups, lists, atRiskRows, inTransitLive] = await Promise.all([
      db.corporateRoute.groupBy({ by: ['status'], where: dayWhere, _count: { _all: true } }),
      Promise.all(
        OPS_ROUTE_STATUSES.map((status) =>
          db.corporateRoute.findMany({
            where: { ...dayWhere, status },
            select: ROUTE_SUMMARY_SELECT,
            orderBy: [{ targetPickup1Time: 'asc' }, { id: 'asc' }],
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
        ),
      ),
      // At-risk is "now"-relative (live queue), not tied to the board date.
      db.corporateRoute.findMany({
        where: {
          ...scope,
          status: { in: ['PLANNED', 'DISPATCHING'] },
          targetPickup1Time: {
            gte: new Date(now.getTime() - AT_RISK_LOOKBACK_MINUTES * 60_000),
            lte: new Date(now.getTime() + leadMin * 60_000),
          },
        },
        select: ROUTE_SUMMARY_SELECT,
        orderBy: [{ targetPickup1Time: 'asc' }, { id: 'asc' }],
        take: AT_RISK_LIMIT,
      }),
      db.corporateRoute.findMany({
        where: { ...scope, status: 'IN_TRANSIT' },
        select: ROUTE_SUMMARY_SELECT,
        orderBy: [{ targetPickup1Time: 'asc' }, { id: 'asc' }],
        take: LIVE_SCAN_LIMIT,
      }),
    ]);

    const counts = Object.fromEntries(OPS_ROUTE_STATUSES.map((s) => [s, 0])) as Record<OpsRouteStatus, number>;
    for (const g of groups as any[]) counts[g.status as OpsRouteStatus] = g._count?._all ?? 0;
    const byStatus = Object.fromEntries(OPS_ROUTE_STATUSES.map((s, i) => [s, lists[i]])) as Record<OpsRouteStatus, any[]>;

    // Offer state for every DISPATCHING route on screen (date list + at-risk queue), one Redis round per key type.
    const dispatchingIds = uniq([
      ...byStatus.DISPATCHING.map((r) => r.id),
      ...atRiskRows.filter((r: any) => r.status === 'DISPATCHING').map((r: any) => r.id),
    ]);
    const offers = await this.readOfferStates(dispatchingIds, now);

    const positions = await this.readPositions(
      uniq([...inTransitLive.map((r: any) => r.id), ...byStatus.IN_TRANSIT.map((r) => r.id)]),
      now,
    );

    const toItem = (r: any) => ({
      ...r,
      ...(r.status === 'DISPATCHING' ? { offer: offers.get(r.id) ?? null } : {}),
      ...(r.status === 'IN_TRANSIT' ? { gps: positions.get(r.id) ?? null } : {}),
    });

    const atRisk = atRiskRows.map((r: any) => {
      const minutesToPickup = Math.round((new Date(r.targetPickup1Time).getTime() - now.getTime()) / 60_000);
      return {
        ...toItem(r),
        minutesToPickup,
        reason: minutesToPickup < 0 ? 'UNASSIGNED_PICKUP_PASSED' : 'UNASSIGNED_PICKUP_IMMINENT',
      };
    });

    const gpsSummary = { LIVE: 0, STALE: 0, OFFLINE: 0 };
    const staleGps: any[] = [];
    for (const r of inTransitLive as any[]) {
      const gps = positions.get(r.id)!;
      gpsSummary[gps.freshness]++;
      if (gps.freshness !== 'LIVE') staleGps.push({ ...r, gps });
    }
    // Oldest fix first: those need a call to the driver first.
    staleGps.sort((a, b) => (b.gps.ageSeconds ?? Infinity) - (a.gps.ageSeconds ?? Infinity));

    return {
      asOf: now.toISOString(),
      date: day,
      timezone: 'Asia/Kolkata',
      filter: { tenantId: query.tenantId ?? null, officeId: query.officeId ?? null },
      page,
      pageSize,
      counts: { ...counts, total: OPS_ROUTE_STATUSES.reduce((n, s) => n + counts[s], 0), atRisk: atRisk.length },
      routes: Object.fromEntries(
        OPS_ROUTE_STATUSES.map((s) => [
          s,
          { total: counts[s], items: byStatus[s].map(toItem), hasMore: page * pageSize < counts[s] },
        ]),
      ),
      atRisk: { leadMinutes: leadMin, items: atRisk },
      staleGps: { summary: gpsSummary, items: staleGps },
    };
  }

  // ---------------------------------------------------------------------------
  // Route detail
  // ---------------------------------------------------------------------------

  async getRouteDetail(routeId: string, now: Date = new Date()) {
    const route: any = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      select: {
        ...ROUTE_SUMMARY_SELECT,
        estDistanceMeters: true,
        estDurationSeconds: true,
        createdAt: true,
        driver: { select: { id: true, fullName: true, phone: true, vehiclePlate: true, vehicleModel: true } },
        vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
        stops: {
          orderBy: { stopSequence: 'asc' },
          select: {
            id: true,
            stopSequence: true,
            stopType: true,
            status: true,
            employeeId: true,
            transportRequestId: true,
            latitude: true,
            longitude: true,
            addressText: true,
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
              },
            },
          },
        },
      },
    } as any);
    if (!route) throw new NotFoundException(`Corporate route ${routeId} not found`);

    const [positions, offers] = await Promise.all([
      this.readPositions([routeId], now),
      route.status === 'DISPATCHING' || route.status === 'PLANNED'
        ? this.readOfferStates([routeId], now)
        : Promise.resolve(new Map<string, OfferState>()),
    ]);
    return {
      asOf: now.toISOString(),
      route: {
        ...route,
        stops: (route.stops ?? []).map((s: any) => ({
          ...s,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
        })),
      },
      livePosition: positions.get(routeId) ?? null,
      offer: offers.get(routeId) ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // Manual reassignment
  // ---------------------------------------------------------------------------

  /**
   * Takes an ASSIGNED route away from its driver and puts it back to DISPATCHING, then either lets
   * autonomous dispatch find a driver or offers it directly to `newDriverId`.
   *
   * Concurrency: the transition is one conditional UPDATE (`status = ASSIGNED AND driverId = <old>`),
   * so of two concurrent reassigns exactly one wins and the other gets 409.
   */
  async reassignRoute(routeId: string, dto: ReassignRouteDto, actor: OpsActor = {}) {
    const reason = typeof dto?.reason === 'string' ? dto.reason.trim() : '';
    if (reason.length < 3) throw new BadRequestException('reason is required (min 3 characters)');
    if (reason.length > 500) throw new BadRequestException('reason must be at most 500 characters');

    const db: any = this.db;
    const route: any = await db.corporateRoute.findUnique({
      where: { id: routeId },
      include: { tenant: true, office: true, stops: { orderBy: { stopSequence: 'asc' } } },
    });
    if (!route) throw new NotFoundException(`Corporate route ${routeId} not found`);
    if (route.status !== 'ASSIGNED') {
      throw new ConflictException(`Only ASSIGNED routes can be reassigned (route is ${route.status})`);
    }
    const previousDriverId: string | null = route.driverId ?? null;
    if (!previousDriverId) throw new ConflictException(`Route ${routeId} has no assigned driver`);

    const newDriverId = dto.newDriverId || undefined;
    let newDriver: any = null;
    if (newDriverId) {
      if (newDriverId === previousDriverId) {
        throw new BadRequestException('newDriverId is the driver currently assigned to this route');
      }
      // Full single-driver eligibility (verified, category, seats, insurance, duty hours, overlap,
      // no other live offer) BEFORE anything changes: an ineligible driver is a 409 with the reason.
      newDriver = (await this.dispatch.assertDriverCanTakeRoute(route, newDriverId)).driver;
    }

    // The previous driver's accrued (not yet settled) earning for this route is withdrawn with the
    // assignment by VOIDING it (never deleted: the row stays for audit and is excluded from payouts
    // and totals). A settled / batched earning means billing already moved: refuse instead of guessing.
    const earnings: any[] = await db.corporateDriverEarning.findMany({
      where: { routeId, driverId: previousDriverId, payoutStatus: { not: 'VOIDED' } },
    });
    if (earnings.some((e) => e.payoutStatus !== 'UNPAID' || e.payoutBatchId)) {
      throw new ConflictException(
        `Route ${routeId} earning of driver ${previousDriverId} is already in a payout batch; resolve it in billing first`,
      );
    }
    const referenceFarePaise = earnings.length > 0 ? Number(earnings[0].routeFarePaise) : null;

    const reassignmentId = randomUUID();
    const voidedAt = new Date();
    await db.$transaction(async (tx: any) => {
      const res = await tx.corporateRoute.updateMany({
        where: { id: routeId, status: 'ASSIGNED', driverId: previousDriverId },
        // atRisk resets: the route is unassigned again, so ALLOC-05 may escalate it afresh.
        data: { status: 'DISPATCHING', driverId: null, vehicleId: null, atRisk: false },
      });
      if (res.count !== 1) {
        throw new ConflictException(`Route ${routeId} was changed concurrently; reload and retry`);
      }
      if (earnings.length > 0) {
        const voided = await tx.corporateDriverEarning.updateMany({
          where: { id: { in: earnings.map((e) => e.id) }, payoutStatus: 'UNPAID', payoutBatchId: null },
          data: {
            payoutStatus: 'VOIDED',
            voidedAt,
            voidReason: `REASSIGNED ${reassignmentId}: ${reason}`.slice(0, 500),
          },
        });
        if (voided.count !== earnings.length) {
          // A payout batch picked the earning up in between: roll back the whole reassign.
          throw new ConflictException(
            `Route ${routeId} earning of driver ${previousDriverId} entered a payout batch concurrently; resolve it in billing first`,
          );
        }
      }
    });

    const client = this.redis.getClient();
    if (client) {
      try {
        await withdrawCorporateRouteOffer(client, routeId);
        // Autonomous re-dispatch must not hand the route straight back to the removed driver.
        await client.sadd(CorporateDispatchKeys.rejected(routeId), previousDriverId);
        await client.expire(CorporateDispatchKeys.rejected(routeId), 86400);
      } catch (err: any) {
        this.logger.warn(`Redis clean-up after reassigning ${routeId} failed: ${err?.message}`);
      }
    }

    await this.audit.log({
      action: 'CORPORATE_ROUTE_REASSIGNED',
      userId: actor.id,
      actorRole: actor.role ?? 'ADMIN',
      entityType: 'CORPORATE_ROUTE',
      entityId: routeId,
      metadata: {
        reassignmentId,
        reason,
        previousDriverId,
        previousVehicleId: route.vehicleId ?? null,
        requestedDriverId: newDriverId ?? null,
        mode: newDriverId ? 'DIRECT_OFFER' : 'AUTO_DISPATCH',
        withdrawnEarnings: earnings.map((e) => ({
          id: e.id,
          routeFarePaise: String(e.routeFarePaise),
          totalEarnedPaise: String(e.totalEarnedPaise),
        })),
        earningDisposition: 'VOIDED',
      },
    });

    await this.notifyPreviousDriver(route, previousDriverId);
    if (this.riderNotifier) await this.riderNotifier.notifyCabReplaced(routeId, reassignmentId);
    this.notifications.emitEvent('admin:operations', 'CORPORATE_ROUTE_REASSIGNED', {
      routeId,
      reassignmentId,
      previousDriverId,
      requestedDriverId: newDriverId ?? null,
      reason,
    });
    this.notifications.emitEvent(`corporate:${route.tenantId}`, 'ROUTE_DRIVER_REPLACED', {
      routeId,
      reassignmentId,
      status: 'DISPATCHING',
    });

    const dispatchResult: Record<string, any> = newDriver
      ? await this.offerDirect(routeId, newDriver.id, referenceFarePaise, actor, reason)
      : await this.autoDispatch(routeId, actor.id);

    return {
      routeId,
      reassignmentId,
      status: 'DISPATCHING',
      previousDriverId,
      mode: newDriverId ? 'DIRECT_OFFER' : 'AUTO_DISPATCH',
      dispatch: dispatchResult,
    };
  }

  // ---------------------------------------------------------------------------
  // Manual route cancellation
  // ---------------------------------------------------------------------------

  /**
   * ADMIN cancels a route that has not started (PLANNED / DISPATCHING / ASSIGNED).
   *
   * - IN_TRANSIT and COMPLETED routes are refused (409): a moving cab is handled by the trip
   *   execution / SOS flows, a finished one by billing.
   * - Runs under the route's dispatch lock, so no dispatch wave can issue an offer in between, and
   *   the route itself moves with one conditional UPDATE on the status (and driver) that was read.
   * - The live offer (if any) is withdrawn with the shared dispatch helper.
   * - Unpaid earnings of the route are VOIDED (never deleted); an earning already in a payout batch
   *   or paid means money moved, so the cancel is refused instead.
   * - Pending stops and their transport requests move to CANCELLED.
   * - The driver (assigned or holding the offer) and every affected employee are notified, and the
   *   action is audited with the mandatory reason.
   */
  async cancelRoute(routeId: string, dto: CancelRouteDto, actor: OpsActor = {}) {
    const reason = typeof dto?.reason === 'string' ? dto.reason.trim() : '';
    if (reason.length < 3) throw new BadRequestException('reason is required (min 3 characters)');
    if (reason.length > 500) throw new BadRequestException('reason must be at most 500 characters');

    const db: any = this.db;
    const lockKey = `corporate:dispatch:lock:${routeId}`;
    const lockToken = await this.redis.acquireLockToken(lockKey, 30);
    if (!lockToken) {
      throw new ConflictException(`Dispatch is in progress for route ${routeId}; retry in a few seconds`);
    }

    let outcome: Awaited<ReturnType<CorporateOperationsService['cancelUnderLock']>>;
    try {
      outcome = await this.cancelUnderLock(db, routeId, reason);
    } finally {
      await this.redis.releaseLockToken(lockKey, lockToken).catch(() => undefined);
    }
    const { route, cancellationId, cancelledAt, earnings, affectedStops, cancelledRequestIds, withdrawnOfferDriverId } = outcome;

    await this.audit.log({
      action: 'CORPORATE_ROUTE_CANCELLED',
      userId: actor.id,
      actorRole: actor.role ?? 'ADMIN',
      entityType: 'CORPORATE_ROUTE',
      entityId: routeId,
      metadata: {
        cancellationId,
        reason,
        previousStatus: route.status,
        driverId: route.driverId ?? null,
        withdrawnOfferDriverId,
        cancelledStopIds: affectedStops.map((s: any) => s.id),
        cancelledRequestIds,
        voidedEarnings: earnings.map((e: any) => ({
          id: e.id,
          driverId: e.driverId,
          totalEarnedPaise: String(e.totalEarnedPaise),
        })),
        earningDisposition: earnings.length > 0 ? 'VOIDED' : 'NONE',
      },
    });

    // Driver to tell: the assigned one, else whoever held the live offer.
    const driverToNotify: string | null = route.driverId ?? withdrawnOfferDriverId ?? null;
    const driverNotified = driverToNotify ? await this.notifyDriverOfCancellation(route, driverToNotify) : false;
    const employeeOutcomes = this.riderNotifier
      ? await this.riderNotifier.notifyRouteCancelled(
          { id: route.id, tenantId: route.tenantId },
          affectedStops,
          cancellationId,
        )
      : [];

    this.notifications.emitEvent('admin:operations', 'CORPORATE_ROUTE_CANCELLED', {
      routeId,
      cancellationId,
      previousStatus: route.status,
      reason,
    });
    this.notifications.emitEvent(`corporate:${route.tenantId}`, 'ROUTE_CANCELLED', {
      routeId,
      cancellationId,
      status: 'CANCELLED',
      cancelledAt: cancelledAt.toISOString(),
    });

    return {
      routeId,
      cancellationId,
      status: 'CANCELLED' as const,
      previousStatus: route.status,
      cancelledAt: cancelledAt.toISOString(),
      cancelledStops: affectedStops.length,
      cancelledRequests: cancelledRequestIds.length,
      voidedEarnings: earnings.length,
      withdrawnOfferDriverId,
      notified: {
        driverId: driverToNotify,
        driver: driverNotified,
        employees: employeeOutcomes.filter((o) => o.delivered).length,
      },
    };
  }

  private async cancelUnderLock(db: any, routeId: string, reason: string) {
    const route: any = await db.corporateRoute.findUnique({
      where: { id: routeId },
      include: { stops: { orderBy: { stopSequence: 'asc' } } },
    });
    if (!route) throw new NotFoundException(`Corporate route ${routeId} not found`);
    if (route.status === 'CANCELLED') throw new ConflictException(`Route ${routeId} is already CANCELLED`);
    if (!CANCELLABLE_ROUTE_STATUSES.includes(route.status)) {
      throw new ConflictException(
        `Only routes that have not started can be cancelled (route is ${route.status})`,
      );
    }

    const earnings: any[] = await db.corporateDriverEarning.findMany({
      where: { routeId, payoutStatus: { not: 'VOIDED' } },
    });
    if (earnings.some((e) => e.payoutStatus !== 'UNPAID' || e.payoutBatchId)) {
      throw new ConflictException(
        `Route ${routeId} has a driver earning that is already in a payout batch or paid; resolve it in billing first`,
      );
    }

    const affectedStops = (route.stops ?? []).filter((s: any) => OPEN_STOP_STATUSES.includes(s.status));
    const requestIds: string[] = affectedStops
      .map((s: any) => s.transportRequestId)
      .filter((id: any): id is string => typeof id === 'string' && id.length > 0);
    const cancellationId = randomUUID();
    const cancelledAt = new Date();
    let cancelledRequestIds: string[] = [];

    await db.$transaction(async (tx: any) => {
      const res = await tx.corporateRoute.updateMany({
        where: { id: routeId, status: route.status, driverId: route.driverId ?? null },
        // The driver / vehicle stay on the row as history; every busy-window check ignores CANCELLED.
        data: { status: 'CANCELLED', atRisk: false },
      });
      if (res.count !== 1) {
        throw new ConflictException(`Route ${routeId} was changed concurrently; reload and retry`);
      }
      if (earnings.length > 0) {
        const voided = await tx.corporateDriverEarning.updateMany({
          where: { id: { in: earnings.map((e) => e.id) }, payoutStatus: 'UNPAID', payoutBatchId: null },
          data: {
            payoutStatus: 'VOIDED',
            voidedAt: cancelledAt,
            voidReason: `ROUTE_CANCELLED ${cancellationId}: ${reason}`.slice(0, 500),
          },
        });
        if (voided.count !== earnings.length) {
          throw new ConflictException(
            `Route ${routeId} earning entered a payout batch concurrently; resolve it in billing first`,
          );
        }
      }
      if (affectedStops.length > 0) {
        await tx.corporateRouteStop.updateMany({
          where: { routeId, status: { in: [...OPEN_STOP_STATUSES] } },
          data: { status: 'CANCELLED' },
        });
      }
      if (requestIds.length > 0) {
        const open = await tx.corporateTransportRequest.findMany({
          where: { id: { in: requestIds }, status: { notIn: [...CLOSED_REQUEST_STATUSES] } },
          select: { id: true },
        });
        cancelledRequestIds = open.map((r: any) => r.id);
        if (cancelledRequestIds.length > 0) {
          await tx.corporateTransportRequest.updateMany({
            where: { id: { in: cancelledRequestIds }, status: { notIn: [...CLOSED_REQUEST_STATUSES] } },
            data: { status: 'CANCELLED' },
          });
        }
      }
    });

    let withdrawnOfferDriverId: string | null = null;
    const client = this.redis.getClient();
    if (client) {
      try {
        withdrawnOfferDriverId = await withdrawCorporateRouteOffer(client, routeId, db);
      } catch (err: any) {
        this.logger.warn(`Withdrawing the live offer of cancelled route ${routeId} failed: ${err?.message}`);
      }
    }
    try {
      await this.redis.zrem(CorporateDispatchKeys.DISPATCH_QUEUE_ZSET, routeId);
    } catch (err: any) {
      this.logger.warn(`Removing cancelled route ${routeId} from the dispatch queue failed: ${err?.message}`);
    }

    return { route, cancellationId, cancelledAt, earnings, affectedStops, cancelledRequestIds, withdrawnOfferDriverId };
  }

  private async notifyDriverOfCancellation(route: any, driverId: string): Promise<boolean> {
    try {
      this.notifications.emitEvent(`driver:${driverId}`, 'CORPORATE_ROUTE_CANCELLED', {
        routeId: route.id,
        shiftDate: new Date(route.shiftDate).toISOString().slice(0, 10),
        shiftTime: route.shiftTime,
        direction: route.direction,
        message: 'This corporate route has been cancelled by the operations team.',
      });
      const driver: any = await (this.db as any).driver.findUnique({
        where: { id: driverId },
        select: { userId: true },
      });
      if (driver?.userId) {
        await this.notifications.sendPushToUser(driver.userId, {
          title: 'Corporate route cancelled',
          body: `Your ${route.direction} corporate route for ${route.shiftTime} has been cancelled by operations. You no longer need to run it.`,
          data: { routeId: route.id, action: 'CORPORATE_ROUTE_CANCELLED' },
        });
      }
      return true;
    } catch (err: any) {
      this.logger.warn(`Notifying driver ${driverId} of cancelled route ${route.id} failed: ${err?.message}`);
      return false;
    }
  }

  private async autoDispatch(routeId: string, actorUserId?: string): Promise<Record<string, any>> {
    try {
      const res = await this.dispatch.dispatchRoute(routeId, true, actorUserId);
      return { ...res };
    } catch (err: any) {
      // Typically the scheduler holds the route lock right now. Queue it; the scheduler re-evaluates it.
      this.logger.warn(`Re-dispatch of ${routeId} deferred to scheduler: ${err?.message}`);
      await this.queueForScheduler(routeId);
      return { routeId, status: 'QUEUED', reason: err?.message ?? 'dispatch deferred' };
    }
  }

  private async queueForScheduler(routeId: string): Promise<void> {
    try {
      await this.redis.zadd(CorporateDispatchKeys.DISPATCH_QUEUE_ZSET, Date.now(), routeId);
    } catch (err: any) {
      this.logger.error(`Queueing ${routeId} for dispatch failed (recovery sweep will retry): ${err?.message}`);
    }
  }

  /**
   * Offers the route to one ops-chosen driver through `CorporateDispatchService.offerRouteToDriver`
   * (same Redis keys / TTL / CorporateDriverOffer row as autonomous dispatch), so the driver accepts
   * through the normal accept path and an unanswered offer is reaped and cascaded like any other.
   * The replacement keeps the route's accepted fare when there was one; otherwise the rate card prices it.
   * The route is already DISPATCHING here, so a failure (lock busy, driver took another offer in
   * the meantime) hands the route to the scheduler instead of failing the reassign.
   */
  private async offerDirect(
    routeId: string,
    driverId: string,
    farePaise: number | null,
    actor: OpsActor,
    reason: string,
  ): Promise<Record<string, any>> {
    try {
      const res = await this.dispatch.offerRouteToDriver(routeId, driverId, {
        farePaise,
        actorUserId: actor.id,
        actorRole: actor.role ?? 'ADMIN',
        reason,
        directedByOps: true,
      });
      return { ...res, offerExpiresAt: res.offerExpiresAt?.toISOString() };
    } catch (err: any) {
      this.logger.warn(`Directed offer of ${routeId} to ${driverId} not issued: ${err?.message}`);
      await this.queueForScheduler(routeId);
      return { routeId, status: 'QUEUED', reason: err?.message ?? 'directed offer deferred' };
    }
  }

  private async notifyPreviousDriver(route: any, driverId: string): Promise<void> {
    try {
      this.notifications.emitEvent(`driver:${driverId}`, 'CORPORATE_ROUTE_UNASSIGNED', {
        routeId: route.id,
        shiftDate: new Date(route.shiftDate).toISOString().slice(0, 10),
        shiftTime: route.shiftTime,
        direction: route.direction,
        message: 'This corporate route has been reassigned by the operations team.',
      });
      const driver: any = await (this.db as any).driver.findUnique({
        where: { id: driverId },
        select: { userId: true },
      });
      if (driver?.userId) {
        await this.notifications.sendPushToUser(driver.userId, {
          title: 'Corporate route reassigned',
          body: `Your ${route.direction} corporate route for ${route.shiftTime} has been reassigned by operations. You no longer need to run it.`,
          data: { routeId: route.id, action: 'CORPORATE_ROUTE_UNASSIGNED' },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Notifying previous driver ${driverId} of ${route.id} failed: ${err?.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Redis read helpers (batched)
  // ---------------------------------------------------------------------------

  async readOfferStates(routeIds: string[], now: Date = new Date()): Promise<Map<string, OfferState>> {
    const out = new Map<string, OfferState>();
    if (routeIds.length === 0) return out;
    const client = this.redis.getClient();
    if (!client) return out;

    const [offerRaw, offerDrivers, unserved, rejectedCounts] = await Promise.all([
      mget(client, routeIds.map(CorporateDispatchKeys.offer)),
      mget(client, routeIds.map(CorporateDispatchKeys.offerDriver)),
      mget(client, routeIds.map(CorporateDispatchKeys.unserved)),
      Promise.all(routeIds.map((id) => scard(client, CorporateDispatchKeys.rejected(id)))),
    ]);

    routeIds.forEach((routeId, i) => {
      const rejectedDriverCount = rejectedCounts[i];
      let parsed: any = null;
      if (offerRaw[i]) {
        try {
          parsed = JSON.parse(offerRaw[i] as string);
        } catch {
          parsed = null;
        }
      }
      if (parsed?.driverId) {
        const exp = parsed.offerExpiresAt ? new Date(parsed.offerExpiresAt) : null;
        const secondsRemaining = exp ? Math.max(0, Math.round((exp.getTime() - now.getTime()) / 1000)) : null;
        out.set(routeId, {
          state: secondsRemaining === 0 ? 'OFFER_EXPIRING' : 'OFFERED',
          driverId: parsed.driverId,
          offerExpiresAt: exp ? exp.toISOString() : null,
          secondsRemaining,
          rejectedDriverCount,
        });
      } else if (offerDrivers[i]) {
        out.set(routeId, {
          state: 'OFFER_EXPIRING',
          driverId: offerDrivers[i],
          offerExpiresAt: null,
          secondsRemaining: 0,
          rejectedDriverCount,
        });
      } else {
        const marker = unserved[i];
        out.set(routeId, {
          state: marker === 'BUSY' ? 'RETRY_ALL_BUSY' : marker ? 'RETRY_NO_SUPPLY' : 'SEARCHING',
          driverId: null,
          offerExpiresAt: null,
          secondsRemaining: null,
          rejectedDriverCount,
        });
      }
    });

    const driverIds = uniq([...out.values()].map((o) => o.driverId).filter((d): d is string => !!d));
    if (driverIds.length > 0) {
      const drivers: any[] = await (this.db as any).driver.findMany({
        where: { id: { in: driverIds } },
        select: { id: true, fullName: true },
      });
      const names = new Map(drivers.map((d) => [d.id, d.fullName]));
      for (const o of out.values()) if (o.driverId) o.driverName = names.get(o.driverId) ?? null;
    }
    return out;
  }

  async readPositions(routeIds: string[], now: Date = new Date()): Promise<Map<string, LivePosition>> {
    const out = new Map<string, LivePosition>();
    if (routeIds.length === 0) return out;
    const client = this.redis.getClient();
    const raws = client ? await mget(client, routeIds.map(routeTelemetryKey)) : routeIds.map(() => null);
    routeIds.forEach((routeId, i) => {
      let fix: any = null;
      if (raws[i]) {
        try {
          fix = JSON.parse(raws[i] as string);
        } catch {
          fix = null;
        }
      }
      const at = fix?.recordedAt ? new Date(fix.recordedAt) : null;
      const ageSeconds = at && !Number.isNaN(at.getTime()) ? Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000)) : null;
      out.set(routeId, {
        freshness: classifyGpsFreshness(ageSeconds),
        ageSeconds,
        lastSeenAt: at && ageSeconds !== null ? at.toISOString() : null,
        ...(fix && Number.isFinite(Number(fix.latitude))
          ? {
              latitude: Number(fix.latitude),
              longitude: Number(fix.longitude),
              ...(fix.speedMps !== undefined ? { speedMps: Number(fix.speedMps) } : {}),
              ...(fix.heading !== undefined ? { heading: Number(fix.heading) } : {}),
            }
          : {}),
      });
    });
    return out;
  }
}

async function mget(client: any, keys: string[]): Promise<Array<string | null>> {
  if (keys.length === 0) return [];
  if (typeof client.mget === 'function') {
    const res = await client.mget(...keys);
    return Array.isArray(res) ? res : keys.map(() => null);
  }
  return Promise.all(keys.map((k) => client.get(k)));
}

async function scard(client: any, key: string): Promise<number> {
  if (typeof client.scard === 'function') return Number(await client.scard(key)) || 0;
  if (typeof client.smembers === 'function') return ((await client.smembers(key)) ?? []).length;
  return 0;
}

function uniq<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
