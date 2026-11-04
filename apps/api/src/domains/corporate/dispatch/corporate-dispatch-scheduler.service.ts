import {
  ConflictException,
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
import {
  CorporateDispatchKeys,
  CorporateDispatchService,
} from './corporate-dispatch.service';

export interface DispatchSchedulerTickResult {
  evaluatedRoutesCount: number;
  dispatchedRoutes: string[];
  reapedOffers: string[];
  /** Routes re-dispatched by the stuck/unserved recovery sweep. */
  recoveredRoutes?: string[];
  /** True when another instance held the tick lock (or the scheduler is shutting down). */
  skipped?: boolean;
  /** Routes this tick's scan put on the shared work queue. */
  queuedRoutes?: number;
  /** Routes newly flagged at-risk (ALLOC-05) by this tick; each alerts ops exactly once. */
  escalatedRoutes?: string[];
}

export interface DispatchWorkResult {
  dispatchedRoutes: string[];
  reapedOffers: string[];
  /** Queue entries processed (dispatch jobs + offer expiries). */
  processed: number;
}

export interface CorporateDispatchSchedulerConfig {
  enabled: boolean;
  pollIntervalMs: number;
  pageSize: number;
  concurrency: number;
  tickLockTtlSeconds: number;
  reapLockTtlSeconds: number;
  recoveryIntervalMs: number;
  stuckAfterMs: number;
  shutdownGraceMs: number;
  /** Every instance drains the shared queue this often. */
  workerPollMs: number;
  /** Queue entries one instance claims per pop. */
  workerBatch: number;
  /** A route not yet due is looked at again no later than this (traffic forecasts change). */
  reevaluateMs: number;
}

const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const n = raw !== undefined ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function loadCorporateSchedulerConfig(): CorporateDispatchSchedulerConfig {
  const enabledRaw = (process.env.CORPORATE_SCHEDULER_ENABLED ?? 'true').toLowerCase();
  return {
    enabled: !['false', '0', 'no', 'off'].includes(enabledRaw),
    pollIntervalMs: envInt('CORPORATE_SCHEDULER_POLL_MS', 30_000),
    pageSize: envInt('CORPORATE_SCHEDULER_PAGE_SIZE', 200),
    concurrency: envInt('CORPORATE_SCHEDULER_CONCURRENCY', 8),
    tickLockTtlSeconds: envInt('CORPORATE_SCHEDULER_LOCK_TTL_S', 120),
    reapLockTtlSeconds: envInt('CORPORATE_REAPER_LOCK_TTL_S', 30),
    recoveryIntervalMs: envInt('CORPORATE_SCHEDULER_RECOVERY_MS', 120_000),
    stuckAfterMs: envInt('CORPORATE_SCHEDULER_STUCK_AFTER_MS', 120_000),
    shutdownGraceMs: envInt('CORPORATE_SCHEDULER_SHUTDOWN_GRACE_MS', 10_000),
    workerPollMs: envInt('CORPORATE_DISPATCH_WORKER_POLL_MS', 2_000),
    // Small pops (= concurrency) leave the rest of the queue for other instances.
    workerBatch: envInt('CORPORATE_DISPATCH_WORKER_BATCH', 8),
    reevaluateMs: envInt('CORPORATE_DISPATCH_REEVALUATE_MS', 10 * 60_000),
  };
}

/** Runs `fn` over `items` with at most `limit` promises in flight. */
export async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
  shouldStop: () => boolean = () => false,
): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length && !shouldStop()) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Autonomous Dispatch Scheduler & 60-Second Offer Timeout Reaper.
 *
 * Multi-instance safety model (N API instances on ECS):
 *  1. Tick lock: `lock:corporate:scheduler:tick` (SET NX EX, owner token). Only one instance
 *     scans per poll; the others return `skipped`. This is an efficiency lock, NOT the
 *     correctness guarantee: if it expires mid-tick another instance may overlap safely.
 *  2. Per-route claim: `UPDATE corporate_routes SET status='DISPATCHING' WHERE id=? AND
 *     status='PLANNED'` (Prisma updateMany, count===1). Exactly one claimant dispatches a route.
 *  3. Per-offer reap lock: `lock:corporate:reaper:<routeId>`; state is re-read under the lock so
 *     racing reapers produce a single blacklist + cascade.
 *  4. dispatchRoute itself is idempotent (live offer => no new offer) and holds a per-route lock.
 *  5. Recovery sweep: DISPATCHING routes with no live offer (crashed mid-dispatch, or
 *     unserved/deferred whose retry marker expired) are re-dispatched.
 *
 * Work sharing (scales with the number of instances):
 *  - The tick-locked scan is cheap: it only puts due-soon PLANNED route ids on the shared queue
 *    `corporate:dispatch:queue` (sorted set, score = when to evaluate; ZADD NX keeps deferrals).
 *  - EVERY instance runs a worker loop that pops due entries atomically (Lua ZRANGEBYSCORE+ZREM,
 *    `RedisService.zclaimDue`) and does the expensive part: traffic check, claim, offer. A route
 *    not yet due is pushed back with score = its dispatch time (re-checked at least every 10 min).
 *  - Offer timeouts live in `corporate:offer_expiry` (score = expiry ms); every instance pops due
 *    ones, so an unanswered offer cascades within about one worker poll instead of a scan cycle.
 *  - A popped entry lost in a crash is re-queued by the next scan (routes) or found by the
 *    active-set safety scan (offers); the per-route DB claim keeps dispatch exactly-once.
 *  Without Redis the scan processes routes inline (single instance), as before.
 */
@Injectable()
export class CorporateDispatchSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CorporateDispatchSchedulerService.name);
  static readonly TICK_LOCK_KEY = 'corporate:scheduler:tick';
  static reapLockKey(routeId: string) {
    return `corporate:reaper:${routeId}`;
  }

  private readonly config: CorporateDispatchSchedulerConfig;
  private poller?: NodeJS.Timeout;
  private worker?: NodeJS.Timeout;
  private isWorking = false;
  private currentWork?: Promise<DispatchWorkResult>;
  private isTicking = false;
  private shuttingDown = false;
  private currentTick?: Promise<DispatchSchedulerTickResult>;
  private heldTickLockToken: string | null = null;
  private lastRecoveryAtMs?: number;

  constructor(
    private readonly db: DatabaseService,
    private readonly dispatchService: CorporateDispatchService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() private readonly redis?: RedisService,
  ) {
    this.config = loadCorporateSchedulerConfig();
  }

  get schedulerConfig(): Readonly<CorporateDispatchSchedulerConfig> {
    return this.config;
  }

  get isPolling(): boolean {
    return this.poller !== undefined;
  }

  onModuleInit() {
    if (!this.config.enabled) {
      this.logger.log('Corporate dispatch scheduler disabled (CORPORATE_SCHEDULER_ENABLED=false)');
      return;
    }
    this.poller = setInterval(() => {
      this.tick().catch((err) =>
        this.logger.warn(`Corporate dispatch scheduler tick error: ${err.message}`),
      );
    }, this.config.pollIntervalMs);
    this.poller.unref();
    this.worker = setInterval(() => {
      this.work().catch((err) => this.logger.warn(`Corporate dispatch worker error: ${err.message}`));
    }, this.config.workerPollMs);
    this.worker.unref();
    this.logger.log(
      `Corporate Autonomous Dispatch Scheduler initialized (${this.config.pollIntervalMs}ms poll, ` +
        `page=${this.config.pageSize}, concurrency=${this.config.concurrency}, ` +
        `worker every ${this.config.workerPollMs}ms x${this.config.workerBatch})`,
    );
  }

  /**
   * Graceful shutdown: stop polling, stop taking new routes, wait (bounded) for the in-flight
   * tick, then release the tick lock so another instance can take over immediately.
   */
  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = undefined;
    }
    if (this.worker) {
      clearInterval(this.worker);
      this.worker = undefined;
    }
    const inFlight = [this.currentTick, this.currentWork].filter(Boolean) as Promise<unknown>[];
    if (inFlight.length > 0) {
      let timer: NodeJS.Timeout | undefined;
      await Promise.race([
        Promise.all(inFlight.map((p) => p.catch(() => undefined))),
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, this.config.shutdownGraceMs);
          timer.unref?.();
        }),
      ]);
      if (timer) clearTimeout(timer);
    }
    await this.releaseTickLock();
  }

  /**
   * Main scheduler tick. Public so unit and integration tests can drive time deterministically.
   */
  public async tick(nowMs: number = Date.now()): Promise<DispatchSchedulerTickResult> {
    const empty: DispatchSchedulerTickResult = {
      evaluatedRoutesCount: 0,
      dispatchedRoutes: [],
      reapedOffers: [],
      recoveredRoutes: [],
      escalatedRoutes: [],
      skipped: true,
    };
    if (this.isTicking || this.shuttingDown) return empty;

    this.isTicking = true;
    const run = (async (): Promise<DispatchSchedulerTickResult> => {
      if (!(await this.acquireTickLock())) return empty;
      let scan: {
        reapedOffers: string[];
        totalEvaluated: number;
        routes: string[];
        queued: number;
        recoveredRoutes: string[];
        escalatedRoutes: string[];
      };
      try {
        // 1. Safety net: reap expired offers by scanning the active set (the expiry queue is the fast path)
        const reapedOffers = await this.reapExpiredOffers(nowMs);

        // 2. Put due-soon PLANNED routes on the shared queue (no Redis: evaluate them inline)
        const upcoming = await this.evaluateAndDispatchUpcomingRoutes(nowMs);

        // 3. Periodic recovery of stuck / unserved DISPATCHING routes
        let recoveredRoutes: string[] = [];
        if (this.lastRecoveryAtMs === undefined) {
          this.lastRecoveryAtMs = nowMs;
        } else if (nowMs - this.lastRecoveryAtMs >= this.config.recoveryIntervalMs) {
          this.lastRecoveryAtMs = nowMs;
          recoveredRoutes = await this.recoverStuckRoutes(nowMs);
        }

        // 4. ALLOC-05 escalation, once per tick across instances (under the tick lock). The
        //    conditional atRisk flag keeps it idempotent if the lock ever expires mid-tick.
        const escalatedRoutes = await this.escalateAtRiskRoutes(nowMs);
        scan = { reapedOffers, ...upcoming, recoveredRoutes, escalatedRoutes };
      } finally {
        await this.releaseTickLock();
      }

      // 5. This instance also works the queue now (the others do on their own worker poll).
      //    Routes this scan just reaped or re-dispatched carry a brand-new offer: leave it alone.
      const work = await this.drainQueue(nowMs, new Set([...scan.reapedOffers, ...scan.recoveredRoutes]));
      return {
        evaluatedRoutesCount: scan.totalEvaluated,
        dispatchedRoutes: [...scan.routes, ...work.dispatchedRoutes],
        reapedOffers: [...scan.reapedOffers, ...work.reapedOffers],
        recoveredRoutes: scan.recoveredRoutes,
        queuedRoutes: scan.queued,
        escalatedRoutes: scan.escalatedRoutes,
        skipped: false,
      };
    })();

    this.currentTick = run;
    try {
      return await run;
    } finally {
      this.isTicking = false;
      this.currentTick = undefined;
    }
  }

  /**
   * Worker pass run by EVERY instance on its own poll: drains due offer expiries and dispatch jobs
   * from the shared queue. Public so tests can drive instances deterministically.
   */
  public async work(nowMs: number = Date.now()): Promise<DispatchWorkResult> {
    if (this.isWorking || this.shuttingDown) return { dispatchedRoutes: [], reapedOffers: [], processed: 0 };
    this.isWorking = true;
    const run = this.drainQueue(nowMs);
    this.currentWork = run;
    try {
      return await run;
    } finally {
      this.isWorking = false;
      this.currentWork = undefined;
    }
  }

  /** Never fails the tick: an escalation error is logged and retried on the next tick. */
  private async escalateAtRiskRoutes(nowMs: number): Promise<string[]> {
    try {
      return (await this.dispatchService.checkAndEscalateAtRiskRoutes(nowMs)) ?? [];
    } catch (err: any) {
      this.logger.error(`At-risk escalation failed: ${err?.message ?? err}`);
      return [];
    }
  }

  private queueAvailable(): boolean {
    return !!this.redis?.getClient();
  }

  /**
   * Pops due entries batch by batch until none are due. Other instances pop concurrently, so the
   * work spreads across all of them. Entries are only ever re-added with a future score, so this ends.
   */
  private async drainQueue(nowMs: number, skipOfferRoutes: Set<string> = new Set()): Promise<DispatchWorkResult> {
    const result: DispatchWorkResult = { dispatchedRoutes: [], reapedOffers: [], processed: 0 };
    if (!this.redis || !this.queueAvailable()) return result;
    const client = this.redis.getClient();

    while (!this.shuttingDown) {
      const due = await this.redis.zclaimDue(
        CorporateDispatchKeys.OFFER_EXPIRY_ZSET,
        nowMs,
        this.config.workerBatch,
      );
      if (due.length === 0) break;
      result.processed += due.length;
      await mapWithConcurrency(due, this.config.concurrency, async (routeId) => {
        try {
          if (skipOfferRoutes.has(routeId)) {
            await this.requeueOfferExpiryIfLive(client, routeId, nowMs);
            return;
          }
          if (await this.reapOne(client, routeId, nowMs)) result.reapedOffers.push(routeId);
          else await this.requeueOfferExpiryIfLive(client, routeId, nowMs);
        } catch (err: any) {
          this.logger.error(`Offer expiry for route ${routeId} failed: ${err.message}`);
          await this.requeueOfferExpiryIfLive(client, routeId, nowMs).catch(() => undefined);
        }
      });
      if (due.length < this.config.workerBatch) break;
    }

    while (!this.shuttingDown) {
      const due = await this.redis.zclaimDue(
        CorporateDispatchKeys.DISPATCH_QUEUE_ZSET,
        nowMs,
        this.config.workerBatch,
      );
      if (due.length === 0) break;
      result.processed += due.length;
      const started = new Set<string>();
      await mapWithConcurrency(
        due,
        this.config.concurrency,
        async (routeId) => {
          started.add(routeId);
          if (await this.processQueuedRoute(routeId, nowMs)) result.dispatchedRoutes.push(routeId);
        },
        () => this.shuttingDown,
      );
      // Shutting down mid-batch: hand untouched jobs back for another instance.
      for (const routeId of due) {
        if (!started.has(routeId)) {
          await this.redis.zadd(CorporateDispatchKeys.DISPATCH_QUEUE_ZSET, nowMs, routeId, { nx: true });
        }
      }
      if (due.length < this.config.workerBatch) break;
    }
    return result;
  }

  /** An expiry popped but not reaped (lock busy, clock skew): put it back while the offer lives. */
  private async requeueOfferExpiryIfLive(client: any, routeId: string, nowMs: number): Promise<void> {
    const raw = await client.get(CorporateDispatchKeys.offer(routeId));
    if (!raw) return; // gone (accepted / rejected), or TTL-expired: the active-set scan reaps that
    let expiresAt = nowMs + 5_000;
    try {
      const at = new Date(JSON.parse(raw).offerExpiresAt).getTime();
      if (Number.isFinite(at) && at > nowMs) expiresAt = at;
    } catch {
      // keep the short retry
    }
    await this.redis!.zadd(CorporateDispatchKeys.OFFER_EXPIRY_ZSET, expiresAt, routeId, { nx: true });
  }

  /** One dispatch job: evaluate a still-PLANNED route; not yet due -> back on the queue for later. */
  private async processQueuedRoute(routeId: string, nowMs: number): Promise<boolean> {
    try {
      const route: any = await this.db.corporateRoute.findUnique({
        where: { id: routeId },
        select: {
          id: true,
          direction: true,
          status: true,
          targetPickup1Time: true,
          tenant: { select: { name: true } },
        },
      } as any);
      if (!route || route.status !== 'PLANNED') return false;
      const outcome = await this.evaluateAndDispatchRoute(route, nowMs);
      if (outcome.notDueAt !== undefined) {
        const next = Math.min(outcome.notDueAt, nowMs + this.config.reevaluateMs);
        await this.redis!.zadd(CorporateDispatchKeys.DISPATCH_QUEUE_ZSET, Math.max(next, nowMs + 1), routeId);
      }
      return outcome.dispatched;
    } catch (err: any) {
      // Left off the queue: the next scan re-queues it while it is still PLANNED.
      this.logger.error(`Dispatch job for route ${routeId} failed: ${err.message}`);
      return false;
    }
  }

  private async acquireTickLock(): Promise<boolean> {
    if (!this.redis) return true; // no Redis: per-route DB claims still guarantee exactly-once
    const token = await this.redis.acquireLockToken(
      CorporateDispatchSchedulerService.TICK_LOCK_KEY,
      this.config.tickLockTtlSeconds,
    );
    if (!token) return false;
    this.heldTickLockToken = token;
    return true;
  }

  private async releaseTickLock(): Promise<void> {
    const token = this.heldTickLockToken;
    if (!token || !this.redis) return;
    this.heldTickLockToken = null;
    try {
      await this.redis.releaseLockToken(CorporateDispatchSchedulerService.TICK_LOCK_KEY, token);
    } catch (err: any) {
      this.logger.warn(`Failed to release scheduler tick lock: ${err.message}`);
    }
  }

  /**
   * Keyset-paginated scan over routes (WHERE ... AND id > cursor ORDER BY id LIMIT pageSize).
   * Keyset (not OFFSET) stays correct while rows leave the filter as they are claimed.
   */
  private async *pageRoutes(where: Record<string, any>): AsyncGenerator<any[]> {
    let cursor: string | undefined;
    while (!this.shuttingDown) {
      const page: any[] = await this.db.corporateRoute.findMany({
        where: cursor ? { ...where, id: { gt: cursor } } : where,
        orderBy: { id: 'asc' },
        take: this.config.pageSize,
        select: {
          id: true,
          direction: true,
          status: true,
          targetPickup1Time: true,
          tenant: { select: { name: true } },
        },
      } as any);
      if (!page || page.length === 0) return;
      yield page;
      const lastId = page[page.length - 1].id;
      if (page.length < this.config.pageSize || lastId === cursor) return;
      cursor = lastId;
    }
  }

  /**
   * Identifies PLANNED corporate routes approaching their dispatch lead window (considering DDA traffic delay).
   */
  private async evaluateAndDispatchUpcomingRoutes(
    nowMs: number,
  ): Promise<{ totalEvaluated: number; routes: string[]; queued: number }> {
    // Look ahead window: Routes starting within next 4 hours; also catch slightly overdue
    const windowEnd = new Date(nowMs + 4 * 60 * 60 * 1000);
    const windowStart = new Date(nowMs - 2 * 60 * 60 * 1000);

    const triggeredRouteIds: string[] = [];
    let totalEvaluated = 0;
    let queued = 0;
    const useQueue = this.queueAvailable();

    for await (const page of this.pageRoutes({
      status: 'PLANNED',
      targetPickup1Time: { gte: windowStart, lte: windowEnd },
    })) {
      totalEvaluated += page.length;
      if (useQueue) {
        // NX: a route already waiting (e.g. deferred until its dispatch time) keeps its score.
        await mapWithConcurrency(page, 32, async (route) => {
          await this.redis!.zadd(CorporateDispatchKeys.DISPATCH_QUEUE_ZSET, nowMs, route.id, { nx: true });
          queued++;
        });
        continue;
      }
      await mapWithConcurrency(
        page,
        this.config.concurrency,
        async (route) => {
          if ((await this.evaluateAndDispatchRoute(route, nowMs)).dispatched) {
            triggeredRouteIds.push(route.id);
          }
        },
        () => this.shuttingDown,
      );
    }

    return { totalEvaluated, routes: triggeredRouteIds, queued };
  }

  /**
   * `dispatched` = THIS instance claimed and dispatched the route; `notDueAt` = the traffic-adjusted
   * dispatch time when it is not due yet.
   */
  private async evaluateAndDispatchRoute(
    route: any,
    nowMs: number,
  ): Promise<{ dispatched: boolean; notDueAt?: number }> {
    let claimed = false;
    try {
      const dda = await this.dispatchService.assessDynamicTraffic(route.id);
      const dueAt = dda.adjustedDispatchTime.getTime();
      if (dueAt > nowMs) return { dispatched: false, notDueAt: dueAt };

      // Atomic per-route claim: exactly one instance wins PLANNED -> DISPATCHING.
      let claimCount = 1;
      if (typeof (this.db as any).corporateRoute?.updateMany === 'function') {
        const claim = await this.db.corporateRoute.updateMany({
          where: { id: route.id, status: 'PLANNED' },
          data: { status: 'DISPATCHING' },
        });
        claimCount = claim.count;
      } else if (typeof (this.db as any).corporateRoute?.update === 'function') {
        await this.db.corporateRoute.update({
          where: { id: route.id },
          data: { status: 'DISPATCHING' },
        });
      }
      if (claimCount !== 1) return { dispatched: false };
      claimed = true;

      this.logger.log(
        `[AUTONOMOUS_DISPATCH] Triggering dispatch for route ${route.id} (${route.direction} | ${route.tenant?.name}). ` +
          `Pickup 1: ${new Date(route.targetPickup1Time).toISOString()} | DDA Delay: ${dda.trafficDelayMinutes}m`,
      );

      await this.dispatchService.dispatchRoute(route.id, false);
      return { dispatched: true };
    } catch (err: any) {
      if (err instanceof ConflictException) {
        // Someone else (manual Start / cascade) is dispatching this route right now; their
        // offer stands. Keep it DISPATCHING; the recovery sweep catches a no-offer outcome.
        return { dispatched: false };
      }
      this.logger.error(`Failed to evaluate/dispatch route ${route.id}: ${err.message}`, err.stack);
      if (claimed) {
        // Release our claim so the next tick retries (natural poll-interval backoff).
        // dispatchRoute is idempotent, so a retry after a partial success cannot double-offer.
        await Promise.resolve(
          this.db.corporateRoute.updateMany({
            where: { id: route.id, status: 'DISPATCHING' },
            data: { status: 'PLANNED' },
          }),
        ).catch(() => undefined);
      }
      return { dispatched: false };
    }
  }

  /**
   * Re-dispatches DISPATCHING routes that have no live offer and no pending retry marker:
   * instance crashed between claim and offer, cascade failed, or an unserved/busy retry is due.
   */
  public async recoverStuckRoutes(nowMs: number = Date.now()): Promise<string[]> {
    const client = this.redis?.getClient();
    if (!client) return [];

    const recovered: string[] = [];
    for await (const page of this.pageRoutes({
      status: 'DISPATCHING',
      updatedAt: { lt: new Date(nowMs - this.config.stuckAfterMs) },
      targetPickup1Time: { gte: new Date(nowMs - 2 * 60 * 60 * 1000) },
    })) {
      await mapWithConcurrency(
        page,
        this.config.concurrency,
        async (route) => {
          try {
            const offer = await client.get(CorporateDispatchKeys.offer(route.id));
            const offerDriver = await client.get(CorporateDispatchKeys.offerDriver(route.id));
            const retryMarker = await client.get(CorporateDispatchKeys.unserved(route.id));
            if (offer || offerDriver || retryMarker) return;
            this.logger.warn(`[RECOVERY] Route ${route.id} DISPATCHING without live offer; re-dispatching`);
            const res = await this.dispatchService.dispatchRoute(route.id, false);
            if (res?.status === 'OFFERED') recovered.push(route.id);
          } catch (err: any) {
            if (!(err instanceof ConflictException)) {
              this.logger.error(`Recovery failed for route ${route.id}: ${err.message}`);
            }
          }
        },
        () => this.shuttingDown,
      );
    }
    return recovered;
  }

  /**
   * Scans active driver offers in Redis. If the 60-second countdown has elapsed without driver response,
   * reaps the offer, blacklists the unresponsive driver, and automatically cascades to the next candidate.
   */
  private async reapExpiredOffers(nowMs: number): Promise<string[]> {
    const client = this.redis?.getClient();
    if (!client) return [];

    const activeRouteIds: string[] = await client.smembers(CorporateDispatchKeys.ACTIVE_OFFERS_SET);
    if (!activeRouteIds || activeRouteIds.length === 0) return [];

    const reapedRouteIds: string[] = [];
    await mapWithConcurrency(
      activeRouteIds,
      this.config.concurrency,
      async (routeId) => {
        try {
          if (await this.reapOne(client, routeId, nowMs)) reapedRouteIds.push(routeId);
        } catch (err: any) {
          this.logger.error(`Error in timeout reaper for route ${routeId}: ${err.message}`);
        }
      },
      () => this.shuttingDown,
    );
    return reapedRouteIds;
  }

  /** Reads offer state: the expired driver, null if still live, or 'STALE' if nothing is left. */
  private async readExpiredDriver(
    client: any,
    routeId: string,
    nowMs: number,
  ): Promise<{ driverId: string; reason: 'TTL_EXPIRED' | 'TIMESTAMP_EXPIRED' } | 'STALE' | null> {
    const rawOffer = await client.get(CorporateDispatchKeys.offer(routeId));
    if (!rawOffer) {
      // Offer key expired in Redis (TTL elapsed past 60s)
      const fallbackDriverId = await client.get(CorporateDispatchKeys.offerDriver(routeId));
      return fallbackDriverId ? { driverId: fallbackDriverId, reason: 'TTL_EXPIRED' } : 'STALE';
    }
    const offer = JSON.parse(rawOffer);
    if (nowMs >= new Date(offer.offerExpiresAt).getTime()) {
      return { driverId: offer.driverId, reason: 'TIMESTAMP_EXPIRED' };
    }
    return null;
  }

  private async reapOne(client: any, routeId: string, nowMs: number): Promise<boolean> {
    // Cheap pre-check without a lock: most offers are still live.
    const pre = await this.readExpiredDriver(client, routeId, nowMs);
    if (pre === null) return false;
    if (pre === 'STALE') {
      await client.srem(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
      return false;
    }

    // Per-offer reap lock; if another reaper owns it, that reaper performs the cascade.
    // If the owner crashes, the lock expires (reapLockTtlSeconds) and the route is still in
    // the active set, so the next reaper picks it up.
    const lockKey = CorporateDispatchSchedulerService.reapLockKey(routeId);
    const token = this.redis
      ? await this.redis.acquireLockToken(lockKey, this.config.reapLockTtlSeconds)
      : null;
    if (!token) return false;

    try {
      // Re-read under the lock: a racing reaper may have already cascaded to a new driver,
      // or the driver may have accepted in the meantime.
      const state = await this.readExpiredDriver(client, routeId, nowMs);
      if (state === 'STALE') {
        await client.srem(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
        return false;
      }
      if (state === null || state.driverId !== pre.driverId) return false;

      this.logger.warn(
        `[TIMEOUT_REAPER] 60-second offer expired for route ${routeId} (Driver: ${state.driverId}, ${state.reason}). Reaping and cascading...`,
      );
      this.notifications.emitEvent('admin:operations', 'CORPORATE_OFFER_TIMED_OUT', {
        routeId,
        driverId: state.driverId,
        reason: state.reason,
      });
      await this.audit.log({
        action: 'CORPORATE_OFFER_TIMEOUT_REAPED',
        entityId: routeId,
        entityType: 'CORPORATE_ROUTE',
        metadata: { driverId: state.driverId, reason: state.reason },
      });
      await this.dispatchService.rejectRouteOffer(routeId, state.driverId, 'OFFER_TIMEOUT_EXPIRED');
      return true;
    } finally {
      await Promise.resolve(this.redis!.releaseLockToken(lockKey, token)).catch(() => undefined);
    }
  }
}
