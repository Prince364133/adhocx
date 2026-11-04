import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { RouteSolverService } from '../routing/route-solver.service';
import { VehicleCategory } from '../routing/routing.types';
import { CorporateReplanningService } from '../replanning/corporate-replanning.service';
import { IST_OFFSET_MINUTES, istWallClockToUtc, toDateOnly } from '../replanning/cutoff-policy';
import { CorporateTenantPolicyService, EffectiveTenantPolicy } from '../tenants/corporate-tenant-policy.service';
import { addDays } from './shift-calendar';

export interface CorporateAutoPlannerConfig {
  enabled: boolean;
  pollIntervalMs: number;
  /** Plan this many hours before the cancel cutoff (CORPORATE_AUTOPLAN_LEAD_HOURS, default 1). */
  leadHours: number;
  /** Look this many IST days ahead for unplanned demand. */
  horizonDays: number;
  pageSize: number;
  tickLockTtlSeconds: number;
  groupLockTtlSeconds: number;
}

/** LOGOUT cab reporting buffer the route solver applies (cab at office 15 min before logout). */
const LOGOUT_REPORTING_BUFFER_MINUTES = 15;

const envNumber = (name: string, fallback: number, min = 0): number => {
  const raw = process.env[name];
  const n = raw !== undefined && raw.trim() !== '' ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= min ? n : fallback;
};

export function loadAutoPlannerConfig(): CorporateAutoPlannerConfig {
  const enabledRaw = (process.env.CORPORATE_AUTOPLAN_ENABLED ?? 'true').toLowerCase();
  return {
    enabled: !['false', '0', 'no', 'off'].includes(enabledRaw),
    pollIntervalMs: envNumber('CORPORATE_AUTOPLAN_POLL_MS', 60_000, 1000),
    leadHours: envNumber('CORPORATE_AUTOPLAN_LEAD_HOURS', 1, 0),
    horizonDays: envNumber('CORPORATE_AUTOPLAN_HORIZON_DAYS', 3, 1),
    pageSize: envNumber('CORPORATE_AUTOPLAN_PAGE_SIZE', 2000, 1),
    tickLockTtlSeconds: envNumber('CORPORATE_AUTOPLAN_LOCK_TTL_S', 300, 1),
    groupLockTtlSeconds: envNumber('CORPORATE_AUTOPLAN_GROUP_LOCK_TTL_S', 120, 1),
  };
}

export interface AutoPlanGroup {
  tenantId: string;
  officeId: string;
  shiftDate: string;
  shiftTime: string;
  direction: 'LOGIN' | 'LOGOUT';
  pendingRequests: number;
}

export interface AutoPlanGroupOutcome extends AutoPlanGroup {
  /** INITIAL: first plan of the shift. INCREMENTAL: demand approved after routes already existed. */
  mode: 'INITIAL' | 'INCREMENTAL';
  routesCreated: number;
  passengersAssigned: number;
  unassignedRequests: number;
  dueAt: Date;
}

export interface AutoPlanTickResult {
  /** Another instance held the tick lock, a tick was already running, or shutdown is in progress. */
  skipped: boolean;
  groupsEvaluated: number;
  groupsPlanned: AutoPlanGroupOutcome[];
  routesCreated: number;
  /** Not yet inside the planning window (pickup - cutoff - lead). */
  notDue: number;
  /** Shift already started: left for ops (not planned autonomously). */
  expired: number;
  /** Group lock held elsewhere (manual optimise / reschedule in progress). */
  busy: number;
  failed: number;
}

/**
 * Autonomous planner (doc 19 WS-F 4): closes the "Excel upload -> fully autonomous" gap.
 *
 * Every poll it finds (tenant, office, shiftDate, shiftTime, direction) groups that have APPROVED
 * transport requests without a route stop and are due, i.e.
 *     now >= earliestPickup - (tenant cancelCutoffHours + CORPORATE_AUTOPLAN_LEAD_HOURS)
 * where earliestPickup is the shift instant (IST) minus the office arrival buffer and the
 * tenant's max ride time (LOGIN) or minus the 15 min reporting buffer (LOGOUT). It then runs the
 * existing RouteSolverService.optimizeAndCreateRoutes (the same code as POST /corporate/routes/optimize)
 * with the tenant policy's vehicle category, capacity, max ride and arrival buffer.
 *
 * Idempotency / multi-instance safety (lock pattern of CorporateDispatchSchedulerService):
 *  - Tick lock `corporate:autoplan:tick` (SET NX EX, owner token): one instance scans per poll.
 *  - Per-group lock = the replanning shift lock `corporate:replan:shift:<tenant>:<date>:<time>:<dir>`,
 *    so a planner run never overlaps a cancel / reschedule re-plan of the same shift.
 *  - The solver only plans APPROVED requests and flips them to PLANNED in its transaction, so a
 *    second run (or a second instance after the lock expired) finds nothing to plan.
 *  - Requests that become APPROVED after the shift already has routes (a newer roster version, an
 *    admin re-approval) are planned the same way into additional routes (mode INCREMENTAL); the
 *    existing, possibly dispatched, routes are never touched. CorporateReplanningService only
 *    handles cancel / reschedule of requests that already have a stop, so it does not cover this.
 */
@Injectable()
export class CorporateAutoPlannerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CorporateAutoPlannerService.name);
  static readonly TICK_LOCK_KEY = 'corporate:autoplan:tick';

  private readonly config: CorporateAutoPlannerConfig;
  private poller?: NodeJS.Timeout;
  private isTicking = false;
  private shuttingDown = false;
  private currentTick?: Promise<AutoPlanTickResult>;

  constructor(
    private readonly db: DatabaseService,
    private readonly routeSolver: RouteSolverService,
    private readonly policies: CorporateTenantPolicyService,
    private readonly audit: AuditService,
    @Optional() private readonly redis?: RedisService,
    @Optional() config?: Partial<CorporateAutoPlannerConfig>,
  ) {
    this.config = { ...loadAutoPlannerConfig(), ...(config ?? {}) };
  }

  get plannerConfig(): Readonly<CorporateAutoPlannerConfig> {
    return this.config;
  }

  onModuleInit(): void {
    if (!this.config.enabled) {
      this.logger.log('Corporate auto-planner disabled (CORPORATE_AUTOPLAN_ENABLED=false)');
      return;
    }
    this.poller = setInterval(() => {
      this.tick().catch((err) => this.logger.warn(`Corporate auto-planner tick error: ${err.message}`));
    }, this.config.pollIntervalMs);
    this.poller.unref();
    this.logger.log(
      `Corporate auto-planner initialized (${this.config.pollIntervalMs}ms poll, lead ${this.config.leadHours}h, ` +
        `horizon ${this.config.horizonDays}d)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = undefined;
    }
    if (this.currentTick) await this.currentTick.catch(() => undefined);
  }

  /** One planning pass. Public so tests and ops can drive time deterministically. */
  async tick(nowMs: number = Date.now()): Promise<AutoPlanTickResult> {
    const result: AutoPlanTickResult = {
      skipped: true,
      groupsEvaluated: 0,
      groupsPlanned: [],
      routesCreated: 0,
      notDue: 0,
      expired: 0,
      busy: 0,
      failed: 0,
    };
    if (this.isTicking || this.shuttingDown) return result;
    this.isTicking = true;
    const run = (async () => {
      const tickToken = await this.acquire(CorporateAutoPlannerService.TICK_LOCK_KEY, this.config.tickLockTtlSeconds);
      if (tickToken === null) return result;
      try {
        result.skipped = false;
        await this.planDueGroups(new Date(nowMs), result);
        return result;
      } finally {
        await this.release(CorporateAutoPlannerService.TICK_LOCK_KEY, tickToken);
      }
    })();
    this.currentTick = run;
    try {
      return await run;
    } finally {
      this.isTicking = false;
      this.currentTick = undefined;
    }
  }

  /** Planning window of a group: [dueAt, shiftInstant). */
  computeDueAt(group: Pick<AutoPlanGroup, 'shiftDate' | 'shiftTime' | 'direction'>, policy: EffectiveTenantPolicy): {
    dueAt: Date;
    shiftAt: Date;
  } {
    const shiftAt = istWallClockToUtc(group.shiftDate, group.shiftTime);
    const pickupLeadMinutes =
      group.direction === 'LOGIN'
        ? policy.officeArrivalBufferMinutes + policy.maxRideMinutes
        : LOGOUT_REPORTING_BUFFER_MINUTES;
    const earliestPickupMs = shiftAt.getTime() - pickupLeadMinutes * 60_000;
    const dueAt = new Date(earliestPickupMs - (policy.cancelCutoffHours + this.config.leadHours) * 3600_000);
    return { dueAt, shiftAt };
  }

  // ---------------------------------------------------------------------------

  private async planDueGroups(now: Date, result: AutoPlanTickResult): Promise<void> {
    const groups = await this.findPendingGroups(now);
    result.groupsEvaluated = groups.length;
    if (groups.length === 0) return;

    const tenantIds = [...new Set(groups.map((g) => g.tenantId))];
    const tenants = await this.db.corporateTenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, status: true },
    });
    const active = new Set(tenants.filter((t: any) => t.status === 'ACTIVE').map((t: any) => t.id));
    const policyCache = new Map<string, EffectiveTenantPolicy>();

    for (const group of groups) {
      if (this.shuttingDown) break;
      if (!active.has(group.tenantId)) continue;
      try {
        const policyKey = `${group.tenantId}:${group.shiftDate}`;
        let policy = policyCache.get(policyKey);
        if (!policy) {
          policy = await this.policies.getEffectivePolicy(group.tenantId, istWallClockToUtc(group.shiftDate, '00:00'));
          policyCache.set(policyKey, policy);
        }
        const { dueAt, shiftAt } = this.computeDueAt(group, policy);
        if (now.getTime() >= shiftAt.getTime()) {
          result.expired++;
          continue;
        }
        if (now.getTime() < dueAt.getTime()) {
          result.notDue++;
          continue;
        }
        const outcome = await this.planGroup(group, policy, dueAt);
        if (outcome === 'BUSY') {
          result.busy++;
          continue;
        }
        if (outcome.routesCreated > 0) {
          result.groupsPlanned.push(outcome);
          result.routesCreated += outcome.routesCreated;
        }
      } catch (err: any) {
        result.failed++;
        this.logger.error(
          `Auto-plan failed for ${group.tenantId}/${group.officeId} ${group.shiftDate} ${group.shiftTime} ${group.direction}: ${err.message}`,
        );
      }
    }
    if (result.routesCreated > 0) {
      this.logger.log(`Auto-planner created ${result.routesCreated} routes for ${result.groupsPlanned.length} shift groups`);
    }
  }

  private async planGroup(
    group: AutoPlanGroup,
    policy: EffectiveTenantPolicy,
    dueAt: Date,
  ): Promise<AutoPlanGroupOutcome | 'BUSY'> {
    const lockKey = CorporateReplanningService.shiftLockKey(group.tenantId, group.shiftDate, group.shiftTime, group.direction);
    const token = await this.acquire(lockKey, this.config.groupLockTtlSeconds);
    if (token === null) return 'BUSY';
    try {
      const shiftDate = new Date(`${group.shiftDate}T00:00:00.000Z`);
      const existingRoutes = await this.db.corporateRoute.count({
        where: {
          tenantId: group.tenantId,
          officeId: group.officeId,
          shiftDate,
          shiftTime: group.shiftTime,
          direction: group.direction,
          status: { not: 'CANCELLED' },
        },
      });
      const summary = await this.routeSolver.optimizeAndCreateRoutes({
        tenantId: group.tenantId,
        officeId: group.officeId,
        shiftDate: group.shiftDate,
        shiftTime: group.shiftTime,
        direction: group.direction,
        vehicleCategory: policy.defaultVehicleCategory as VehicleCategory,
        maxCapacity: policy.defaultCapacity,
        maxRideTimeMinutes: policy.maxRideMinutes,
        officeBufferMinutes: policy.officeArrivalBufferMinutes,
      });
      const outcome: AutoPlanGroupOutcome = {
        ...group,
        mode: existingRoutes > 0 ? 'INCREMENTAL' : 'INITIAL',
        routesCreated: summary.routesCreated,
        passengersAssigned: summary.passengersAssigned,
        unassignedRequests: summary.unassignedRequests,
        dueAt,
      };
      if (summary.routesCreated > 0) {
        await this.audit.log({
          action: 'CORPORATE_AUTOPLAN_GROUP_PLANNED',
          actorRole: 'SYSTEM',
          entityId: `${group.tenantId}_${group.officeId}_${group.shiftDate}_${group.shiftTime}_${group.direction}`,
          entityType: 'CORPORATE_ROUTE_BATCH',
          metadata: { ...outcome, policyVersion: policy.version, cutoffHours: policy.cancelCutoffHours } as any,
        });
      }
      return outcome;
    } finally {
      await this.release(lockKey, token);
    }
  }

  /**
   * Distinct groups of APPROVED, un-routed requests in the IST window [yesterday, today + horizon].
   * Keyset-paginated by id; in steady state this set is small because planned requests leave it.
   */
  private async findPendingGroups(now: Date): Promise<AutoPlanGroup[]> {
    const istToday = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
    const from = new Date(`${addDays(istToday, -1)}T00:00:00.000Z`);
    const to = new Date(`${addDays(istToday, this.config.horizonDays)}T00:00:00.000Z`);
    const groups = new Map<string, AutoPlanGroup>();
    let cursor: string | undefined;
    for (;;) {
      const page: any[] = await this.db.corporateTransportRequest.findMany({
        where: {
          status: 'APPROVED',
          routeStop: { is: null },
          scheduledDate: { gte: from, lte: to },
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        select: {
          id: true,
          tenantId: true,
          scheduledDate: true,
          shiftTime: true,
          direction: true,
          employee: { select: { officeId: true } },
        },
        orderBy: { id: 'asc' },
        take: this.config.pageSize,
      });
      for (const r of page) {
        const officeId = r.employee?.officeId;
        if (!officeId) continue;
        const shiftDate = toDateOnly(r.scheduledDate);
        const key = `${r.tenantId}|${officeId}|${shiftDate}|${r.shiftTime}|${r.direction}`;
        const g = groups.get(key);
        if (g) g.pendingRequests++;
        else
          groups.set(key, {
            tenantId: r.tenantId,
            officeId,
            shiftDate,
            shiftTime: r.shiftTime,
            direction: r.direction,
            pendingRequests: 1,
          });
      }
      if (page.length < this.config.pageSize) break;
      cursor = page[page.length - 1].id;
    }
    // Earliest shifts first, so a backlog never starves the most urgent group.
    return [...groups.values()].sort((a, b) =>
      `${a.shiftDate} ${a.shiftTime}`.localeCompare(`${b.shiftDate} ${b.shiftTime}`),
    );
  }

  /** Returns the lock token, '' when running without Redis (single instance), or null when held elsewhere. */
  private async acquire(key: string, ttlSeconds: number): Promise<string | null> {
    if (!this.redis) return '';
    return this.redis.acquireLockToken(key, ttlSeconds);
  }

  private async release(key: string, token: string): Promise<void> {
    if (!this.redis || !token) return;
    try {
      await this.redis.releaseLockToken(key, token);
    } catch (err: any) {
      this.logger.warn(`Failed to release auto-planner lock ${key}: ${err.message}`);
    }
  }
}
