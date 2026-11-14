import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { withdrawCorporateRouteOffer } from '../dispatch/corporate-dispatch.service';
import { TripEventRecorder } from '../tracking/trip-event-recorder.service';
import { calculateTierMaxSeats } from '../../../modules/pricing/pricing.service';
import {
  evaluateCutoff,
  formatIst,
  istWallClockToUtc,
  isValidShiftDate,
  isValidShiftTime,
  resolveCancelCutoffHours,
  toDateOnly,
} from './cutoff-policy';
import {
  cheapestInsertion,
  computeTimings,
  LatLng,
  OFFICE_ARRIVAL_BUFFER_MINUTES,
  routeDistanceMeters,
  STOP_DWELL_SECONDS,
} from './route-geometry';
import {
  ReplanAction,
  ReplanContext,
  ReplanResult,
  RouteInsertionOutcome,
  RouteMergeOutcome,
  RouteRemovalOutcome,
} from './replanning.types';

/** Thrown inside a transaction when a guarded (conditional) write finds the row changed; triggers a retry. */
export class StaleReplanStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaleReplanStateError';
  }
}

type Tx = any; // Prisma.TransactionClient (kept loose: rows are read with `include`)

interface Passenger {
  /** Existing stop id (if the passenger already has a stop). */
  stopId?: string;
  /** Route the existing stop currently lives on. */
  originRouteId?: string;
  transportRequestId: string;
  employeeId: string | null;
  lat: number;
  lng: number;
  boardingOtp: string;
  previousEta?: Date;
  /** Employee gender (MALE/FEMALE), used for the night-shift edge-seat rule. */
  gender?: string;
}

interface WorkingRoute {
  id: string | null; // null => to be created
  row: any | null;
  office: LatLng;
  officeStopId?: string;
  anchor: Date;
  direction: string;
  maxCapacity: number;
  vehicleCategory: string;
  meta: { tenantId: string; officeId: string; shiftDate: Date; shiftTime: string };
  passengers: Passenger[];
  rebuild: boolean;
  finalStatus: string;
}

interface InPlaceCancellation {
  route: any;
  stopId: string;
  detachRequest: boolean;
  remainingActive: number;
  cancelRoute: boolean;
}

const PRE_DISPATCH_STATUS = 'PLANNED';
const DISPATCHED_STATUSES = ['DISPATCHING', 'ASSIGNED', 'IN_TRANSIT'];
const ACTIVE_STOP_STATUSES = ['PENDING', 'ARRIVED', 'BOARDED'];
const STOP_IN_EXECUTION = ['ARRIVED', 'BOARDED', 'NO_SHOW'];
const NON_MODIFIABLE_REQUEST = ['COMPLETED', 'IN_PROGRESS', 'UNSERVED'];
const SEQUENCE_PARKING_OFFSET = 1000;

/**
 * Incremental route re-planning after an employee cancels or reschedules a corporate commute.
 *
 * Guarantees:
 *  - Atomic: every DB mutation of one operation runs inside a single Prisma `$transaction`.
 *  - Concurrency-safe: operations serialise on Redis locks (request + affected shift(s), then the
 *    concrete routes touched, always in sorted order => no lock-order deadlocks). Every route
 *    write is additionally guarded by a conditional update on (status, updatedAt), so changes by
 *    services that don't take these locks (e.g. dispatch moving PLANNED -> DISPATCHING) abort and
 *    retry the transaction instead of corrupting it.
 *  - PLANNED (pre-dispatch) routes are re-sequenced (contiguous 1..n) and re-timed; emptied routes
 *    are CANCELLED so no cab is dispatched; under-filled routes are merged into a sibling route of
 *    the same shift when capacity and detour allow.
 *  - DISPATCHING/ASSIGNED/IN_TRANSIT routes are never reshuffled and never receive new passengers:
 *    the stop is cancelled in place and the driver is notified.
 */
@Injectable()
export class CorporateReplanningService {
  private readonly logger = new Logger(CorporateReplanningService.name);

  readonly MAX_INSERTION_DETOUR_METERS = 5000;
  readonly MAX_ROUTE_DURATION_SECONDS = 2 * 3600;
  /** LOGIN: inserting a passenger must not move an existing pickup earlier by more than this. */
  readonly MAX_EXISTING_PICKUP_SHIFT_SECONDS = 20 * 60;
  readonly MERGE_UNDERFILL_RATIO = 0.5;
  readonly MAX_MERGE_DETOUR_METERS = 6000;
  readonly LOCK_TTL_SECONDS = 30;
  readonly LOCK_WAIT_MS = 10_000;
  readonly LOCK_RETRY_MS = 15;
  readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /** WS-B trip timeline (property-injected so the constructor signature is unchanged). */
  @Optional() @Inject(TripEventRecorder) private readonly tripEvents?: TripEventRecorder;

  static routeLockKey(routeId: string): string {
    return `corporate:replan:route:${routeId}`;
  }

  static shiftLockKey(tenantId: string, date: Date | string, shiftTime: string, direction: string): string {
    return `corporate:replan:shift:${tenantId}:${toDateOnly(date)}:${shiftTime}:${direction}`;
  }

  public async cancelRequest(requestId: string, ctx: ReplanContext = {}): Promise<ReplanResult> {
    return this.run(requestId, 'CANCEL', undefined, ctx);
  }

  public async rescheduleRequest(
    requestId: string,
    newShiftTime: string,
    ctx: ReplanContext = {},
  ): Promise<ReplanResult> {
    if (!isValidShiftTime(newShiftTime)) {
      throw new BadRequestException(`newShiftTime must be HH:mm (got ${String(newShiftTime)})`);
    }
    if (ctx.newShiftDate !== undefined && !isValidShiftDate(ctx.newShiftDate)) {
      throw new BadRequestException(`newShiftDate must be YYYY-MM-DD (got ${String(ctx.newShiftDate)})`);
    }
    return this.run(requestId, 'RESCHEDULE', newShiftTime, ctx);
  }

  // ---------------------------------------------------------------------------
  // Orchestration
  // ---------------------------------------------------------------------------

  private async run(
    requestId: string,
    action: ReplanAction,
    newShiftTime: string | undefined,
    ctx: ReplanContext,
  ): Promise<ReplanResult> {
    const initial = await this.loadRequest(this.db, requestId);
    if (!initial) throw new NotFoundException(`Transport request ${requestId} not found`);

    const lockKeys = [
      `corporate:replan:request:${requestId}`,
      CorporateReplanningService.shiftLockKey(initial.tenantId, initial.scheduledDate, initial.shiftTime, initial.direction),
    ];
    if (newShiftTime) {
      lockKeys.push(
        CorporateReplanningService.shiftLockKey(
          initial.tenantId,
          ctx.newShiftDate ?? initial.scheduledDate,
          newShiftTime,
          initial.direction,
        ),
      );
    }

    return this.withLocks(lockKeys, async () => {
      for (let attempt = 1; ; attempt++) {
        try {
          return await this.attempt(requestId, action, newShiftTime, initial.shiftTime, ctx);
        } catch (err) {
          if (err instanceof StaleReplanStateError && attempt < this.MAX_ATTEMPTS) {
            this.logger.warn(`Replan ${action} ${requestId} attempt ${attempt} stale (${err.message}); retrying`);
            continue;
          }
          if (err instanceof StaleReplanStateError) {
            throw new ConflictException(`Route changed concurrently while re-planning; please retry (${err.message})`);
          }
          throw err;
        }
      }
    });
  }

  private async attempt(
    requestId: string,
    action: ReplanAction,
    newShiftTime: string | undefined,
    lockedShiftTime: string,
    ctx: ReplanContext,
  ): Promise<ReplanResult> {
    const now = ctx.now ?? new Date();
    const req = await this.loadRequest(this.db, requestId);
    if (!req) throw new NotFoundException(`Transport request ${requestId} not found`);

    // ---- Idempotency (double submit / concurrent duplicate) ----
    if (action === 'CANCEL' && req.status === 'CANCELLED') {
      return { requestId, action, idempotent: true, request: this.publicRequest(req), cutoff: ctx.cutoff, merges: [] };
    }
    const targetDay = ctx.newShiftDate ?? toDateOnly(req.scheduledDate);
    const dateChanged = targetDay !== toDateOnly(req.scheduledDate);
    // Prisma DATE column value for the target day (keep the original object when the day is unchanged).
    const targetDate: Date = dateChanged ? new Date(`${targetDay}T00:00:00.000Z`) : req.scheduledDate;
    if (action === 'RESCHEDULE' && req.shiftTime === newShiftTime && !dateChanged && req.status !== 'CANCELLED' && !NON_MODIFIABLE_REQUEST.includes(req.status)) {
      return { requestId, action, idempotent: true, request: this.publicRequest(req), cutoff: ctx.cutoff, merges: [] };
    }
    if (req.status === 'CANCELLED' || NON_MODIFIABLE_REQUEST.includes(req.status)) {
      throw new BadRequestException(`Request is already in terminal state ${req.status}`);
    }
    if (req.shiftTime !== lockedShiftTime) {
      throw new ConflictException('Request shift changed concurrently; please retry');
    }

    const stop = req.routeStop;
    if (stop && STOP_IN_EXECUTION.includes(stop.status)) {
      throw new BadRequestException(`Pickup already in execution (stop status ${stop.status}); cannot ${action.toLowerCase()}`);
    }
    const liveStop = stop && stop.status !== 'CANCELLED' && stop.route && stop.route.status !== 'CANCELLED' && stop.route.status !== 'COMPLETED' ? stop : null;

    const office = await this.resolveOffice(req, liveStop?.route);
    const working = new Map<string, WorkingRoute>();
    const inPlace: InPlaceCancellation[] = [];
    let removal: RouteRemovalOutcome | undefined;
    let insertion: (RouteInsertionOutcome & { route: WorkingRoute; passenger: Passenger }) | undefined;
    const merges: RouteMergeOutcome[] = [];

    // ---- 1. Remove the employee from the current route ----
    let removedFrom: WorkingRoute | undefined;
    if (liveStop) {
      const route = await this.loadRoute(this.db, liveStop.routeId);
      if (!route) throw new StaleReplanStateError(`route ${liveStop.routeId} vanished`);
      if (route.status === PRE_DISPATCH_STATUS) {
        const w = this.toWorkingRoute(route, office);
        working.set(route.id, w);
        w.passengers = w.passengers.filter((p) => p.stopId !== liveStop.id);
        await this.hydrateGenders([w]);
        w.passengers = this.enforceNightSafety(w, w.passengers);
        w.rebuild = true;
        if (w.passengers.length === 0) w.finalStatus = 'CANCELLED';
        removedFrom = w;
        removal = {
          routeId: route.id,
          routeStatusBefore: route.status,
          routeStatusAfter: w.finalStatus,
          mode: 'RESEQUENCED',
          routeCancelled: w.finalStatus === 'CANCELLED',
          remainingPassengers: w.passengers.length,
          driverNotified: false,
        };
      } else if (DISPATCHED_STATUSES.includes(route.status)) {
        const remainingActive = route.stops.filter(
          (s: any) => s.id !== liveStop.id && s.transportRequestId && ACTIVE_STOP_STATUSES.includes(s.status),
        ).length;
        const cancelRoute = remainingActive === 0 && route.status !== 'IN_TRANSIT';
        inPlace.push({ route, stopId: liveStop.id, detachRequest: action === 'RESCHEDULE', remainingActive, cancelRoute });
        removal = {
          routeId: route.id,
          routeStatusBefore: route.status,
          routeStatusAfter: cancelRoute ? 'CANCELLED' : route.status,
          mode: 'CANCELLED_IN_PLACE',
          routeCancelled: cancelRoute,
          remainingPassengers: remainingActive,
          driverNotified: !!route.driverId,
        };
      }
    }

    // ---- 2. Insert into the new shift (reschedule) ----
    if (action === 'RESCHEDULE' && newShiftTime) {
      const passenger: Passenger = {
        transportRequestId: req.id,
        employeeId: req.employeeId,
        gender: req.employee?.gender,
        ...this.passengerPoint(req),
        boardingOtp: liveStop?.boardingOtp && liveStop.boardingOtp !== '------' ? liveStop.boardingOtp : this.generateOtp(),
      };
      const candidates = await this.db.corporateRoute.findMany({
        where: {
          tenantId: req.tenantId,
          officeId: office.officeId,
          shiftDate: targetDate,
          shiftTime: newShiftTime,
          direction: req.direction,
          status: PRE_DISPATCH_STATUS,
        },
        include: { stops: { orderBy: { stopSequence: 'asc' } } },
      });

      let best: { w: WorkingRoute; order: Passenger[]; added: number } | undefined;
      const candidateRoutes = candidates.map((c: any) => this.toWorkingRoute(c, office));
      await this.hydrateGenders(candidateRoutes);
      for (const w of candidateRoutes) {
        if (w.passengers.length >= w.maxCapacity) continue;
        const ins = this.tryInsert(w, [passenger], this.MAX_INSERTION_DETOUR_METERS);
        if (ins && (!best || ins.added < best.added)) best = { w, order: ins.order, added: ins.added };
      }

      let target: WorkingRoute;
      let createdNewRoute = false;
      if (best) {
        target = best.w;
        target.passengers = best.order;
      } else {
        createdNewRoute = true;
        const vehicle = await this.resolveVehicleForNewRoute(req.tenantId);
        const shiftInstant = istWallClockToUtc(targetDay, newShiftTime);
        target = {
          id: null,
          row: null,
          office: { lat: office.lat, lng: office.lng },
          anchor:
            req.direction === 'LOGOUT'
              ? shiftInstant
              : new Date(shiftInstant.getTime() - OFFICE_ARRIVAL_BUFFER_MINUTES * 60_000),
          direction: req.direction,
          maxCapacity: vehicle.maxCapacity,
          vehicleCategory: vehicle.vehicleCategory,
          meta: { tenantId: req.tenantId, officeId: office.officeId, shiftDate: targetDate, shiftTime: newShiftTime },
          passengers: [passenger],
          rebuild: true,
          finalStatus: PRE_DISPATCH_STATUS,
        };
      }
      target.rebuild = true;
      const key = target.id ?? `new:${req.id}`;
      working.set(key, target);

      // The new shift's pickup must also respect the 9h cutoff (relevant when moving to an earlier shift).
      const timings = computeTimings(target.direction, target.passengers, target.office, target.anchor);
      const newPickup = target.direction === 'LOGOUT' ? timings.targetPickup1Time : timings.passengerEtas[target.passengers.indexOf(passenger)];
      const cutoffHours = ctx.cutoff?.cutoffHours ?? (await resolveCancelCutoffHours(this.db as any, req.tenantId, now));
      const newCutoff = evaluateCutoff(newPickup, target.direction === 'LOGOUT' ? 'ROUTE_DEPARTURE' : 'STOP_PLANNED_ETA', now, ctx.override, cutoffHours);
      if (!newCutoff.allowed) {
        throw new BadRequestException(
          `Modification locked: Rescheduling and cancellations must be submitted at least ${cutoffHours} hours prior to pickup ` +
            `(new shift ${newShiftTime}${dateChanged ? ` on ${targetDay}` : ''} pickup ${formatIst(newPickup)}, cutoff ${formatIst(newCutoff.cutoffAt)}).`,
        );
      }

      insertion = {
        route: target,
        passenger,
        routeId: target.id ?? '',
        stopId: '',
        stopSequence: 0,
        plannedEta: newPickup,
        createdNewRoute,
        addedDetourMeters: Math.round(best?.added ?? 0),
      };
    }

    // ---- 3. Merge an under-filled pre-dispatch route into a sibling of the same shift ----
    if (removedFrom && removedFrom.finalStatus === PRE_DISPATCH_STATUS && removedFrom.passengers.length > 0) {
      const merge = await this.planMerge(removedFrom, office, working);
      if (merge) {
        merges.push(merge);
        if (removal) {
          removal.routeStatusAfter = 'CANCELLED';
          removal.routeCancelled = true;
          removal.remainingPassengers = 0;
        }
      }
    }

    // ---- 4. Lock concrete routes (sorted) and apply atomically ----
    const routeIds = [
      ...[...working.values()].filter((w) => w.id).map((w) => w.id as string),
      ...inPlace.map((c) => c.route.id as string),
    ];

    const committed = await this.withLocks(
      routeIds.map((id) => CorporateReplanningService.routeLockKey(id)),
      () =>
        this.db.$transaction(async (tx: Tx) => {
          return this.apply(tx, req, action, newShiftTime, working, inPlace, insertion, dateChanged ? targetDate : undefined);
        }),
    );

    // ---- 5. Side effects after commit ----
    if (insertion) {
      insertion.routeId = committed.insertion?.routeId ?? insertion.routeId;
      insertion.stopId = committed.insertion?.stopId ?? '';
      insertion.stopSequence = committed.insertion?.stopSequence ?? 0;
    }
    await this.withdrawOffersOfCancelledRoutes(inPlace);
    this.emitSideEffects(req, action, inPlace, committed.retimed);
    await this.tripEvents?.recordReplan({ tenantId: req.tenantId, requestId, action, stopId: stop?.id, removal, insertion, actorId: ctx.override?.actorUserId });
    await this.audit.log({
      userId: ctx.override?.actorUserId,
      actorRole: ctx.override ? 'CORPORATE_ADMIN' : 'EMPLOYEE',
      action: action === 'CANCEL' ? 'CORPORATE_REQUEST_CANCELLED_REPLANNED' : 'CORPORATE_REQUEST_RESCHEDULED_REPLANNED',
      entityType: 'CORPORATE_TRANSPORT_REQUEST',
      entityId: requestId,
      metadata: {
        fromShift: req.shiftTime,
        toShift: newShiftTime,
        ...(ctx.newShiftDate ? { fromDate: toDateOnly(req.scheduledDate), toDate: ctx.newShiftDate } : {}),
        cutoff: ctx.cutoff as any,
        override: ctx.override as any,
        removal: removal as any,
        insertion: insertion ? { ...insertion, route: undefined, passenger: undefined } : undefined,
        merges: merges as any,
      },
    });

    this.logger.log(
      `Replanned ${action} ${requestId}: removal=${removal?.mode ?? 'none'} insertion=${insertion?.routeId ?? 'none'} merges=${merges.length}`,
    );

    const result: ReplanResult = {
      requestId,
      action,
      idempotent: false,
      request: committed.request,
      cutoff: ctx.cutoff,
      removal,
      merges,
    };
    if (insertion) {
      const { route: _r, passenger: _p, ...pub } = insertion;
      result.insertion = pub;
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Planning helpers (pure / read-only)
  // ---------------------------------------------------------------------------

  /** Tries to insert passengers (cheapest insertion, one by one). Returns the new order or null if unacceptable. */
  private tryInsert(
    w: WorkingRoute,
    incoming: Passenger[],
    maxAddedMeters: number,
  ): { order: Passenger[]; added: number } | null {
    if (w.passengers.length + incoming.length > w.maxCapacity) return null;
    const before = computeTimings(w.direction, w.passengers, w.office, w.anchor);
    let order = [...w.passengers];
    for (const p of incoming) {
      const { index } = cheapestInsertion(w.direction, order, w.office, p);
      order = [...order.slice(0, index), p, ...order.slice(index)];
    }
    order = this.enforceNightSafety(w, order);
    const added =
      routeDistanceMeters(w.direction, order, w.office) - routeDistanceMeters(w.direction, w.passengers, w.office);
    if (added > maxAddedMeters) return null;
    const after = computeTimings(w.direction, order, w.office, w.anchor);
    if (after.estDurationSeconds > this.MAX_ROUTE_DURATION_SECONDS) return null;
    if (w.direction !== 'LOGOUT') {
      for (let i = 0; i < w.passengers.length; i++) {
        const shiftSec = (before.passengerEtas[i].getTime() - after.passengerEtas[order.indexOf(w.passengers[i])].getTime()) / 1000;
        if (shiftSec > this.MAX_EXISTING_PICKUP_SHIFT_SECONDS) return null;
      }
    }
    return { order, added };
  }

  /** Night shift = shift starting before 06:00 or from 20:00 (same rule as the route solver). */
  private isNightShift(w: WorkingRoute): boolean {
    const hour = Number(String(w.meta.shiftTime).split(':')[0]);
    return hour < 6 || hour >= 20;
  }

  /**
   * Night-shift safety: when a man is in the cab, a woman must not be the first pickup (LOGIN) or
   * the last drop (LOGOUT). If the order breaks that rule, the man whose move to the edge seat adds
   * the least distance is moved there. All-women cabs are left as they are.
   */
  private enforceNightSafety(w: WorkingRoute, order: Passenger[]): Passenger[] {
    if (!this.isNightShift(w) || order.length < 2) return order;
    const g = (p: Passenger) => String(p.gender ?? '').toUpperCase();
    const isLogout = w.direction === 'LOGOUT';
    const edge = isLogout ? order[order.length - 1] : order[0];
    if (g(edge) !== 'FEMALE' || !order.some((p) => g(p) === 'MALE')) return order;

    let best: { order: Passenger[]; meters: number } | undefined;
    for (const m of order.filter((p) => g(p) === 'MALE')) {
      const rest = order.filter((p) => p !== m);
      const trial = isLogout ? [...rest, m] : [m, ...rest];
      const meters = routeDistanceMeters(w.direction, trial, w.office);
      if (!best || meters < best.meters) best = { order: trial, meters };
    }
    return best ? best.order : order;
  }

  /** Loads genders for passengers that don't carry one yet (one query for all given routes). */
  private async hydrateGenders(routes: WorkingRoute[]): Promise<void> {
    if (!routes.some((w) => this.isNightShift(w))) return;
    const missing = new Set<string>();
    for (const w of routes) for (const p of w.passengers) if (!p.gender && p.employeeId) missing.add(p.employeeId);
    if (missing.size === 0) return;
    const rows: any[] =
      (await this.db.corporateEmployee.findMany({
        where: { id: { in: [...missing] } },
        select: { id: true, gender: true },
      })) ?? [];
    const byId = new Map(rows.map((r) => [r.id, r.gender]));
    for (const w of routes) for (const p of w.passengers) if (!p.gender && p.employeeId) p.gender = byId.get(p.employeeId);
  }

  private async resolveVehicleForNewRoute(
    tenantId: string,
  ): Promise<{ vehicleCategory: string; maxCapacity: number }> {
    const categories = await this.db.vehiclePricingTier.findMany({
      where: { isActive: true },
      orderBy: { vehicleType: 'asc' },
      select: { vehicleType: true, seatingCapacity: true },
    });
    const available = categories
      .filter((category) => category.vehicleType?.trim())
      .map((category) => ({
        vehicleType: category.vehicleType.trim().toUpperCase(),
        maxSeats: calculateTierMaxSeats(category.vehicleType, category.seatingCapacity),
      }));
    if (available.length === 0) {
      throw new BadRequestException('No active vehicle categories are configured');
    }

    const policy = await this.db.corporateTenantPolicy.findFirst({
      where: { tenantId },
      orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
      select: { defaultVehicleCategory: true, defaultCapacity: true },
    });
    const policyCategory = String(policy?.defaultVehicleCategory ?? 'ALL').trim().toUpperCase();
    const requestedCategory =
      policyCategory === 'ALL'
        ? available.filter((category) => category.maxSeats >= 1).sort((left, right) => left.maxSeats - right.maxSeats)[0]
        : available.find((category) => category.vehicleType === policyCategory);
    if (!requestedCategory) {
      throw new BadRequestException(`Tenant vehicle category '${policyCategory}' is not active in the vehicle catalogue`);
    }

    const policyCapacity = Number(policy?.defaultCapacity);
    return {
      vehicleCategory: requestedCategory.vehicleType,
      maxCapacity:
        Number.isInteger(policyCapacity) && policyCapacity > 0
          ? Math.min(requestedCategory.maxSeats, policyCapacity)
          : requestedCategory.maxSeats,
    };
  }

  private async planMerge(
    small: WorkingRoute,
    office: { officeId: string; lat: number; lng: number },
    working: Map<string, WorkingRoute>,
  ): Promise<RouteMergeOutcome | null> {
    if (small.passengers.length > Math.floor(small.maxCapacity * this.MERGE_UNDERFILL_RATIO)) return null;
    const siblings = await this.db.corporateRoute.findMany({
      where: {
        tenantId: small.meta.tenantId,
        officeId: small.meta.officeId,
        shiftDate: small.meta.shiftDate,
        shiftTime: small.meta.shiftTime,
        direction: small.direction as any,
        status: PRE_DISPATCH_STATUS,
        id: { not: small.id as string },
      },
      include: { stops: { orderBy: { stopSequence: 'asc' } } },
    });

    let best: { w: WorkingRoute; order: Passenger[]; added: number } | undefined;
    const siblingRoutes = siblings.map((s: any) => working.get(s.id) ?? this.toWorkingRoute(s, office));
    await this.hydrateGenders([small, ...siblingRoutes]);
    for (const w of siblingRoutes) {
      if (w.finalStatus !== PRE_DISPATCH_STATUS) continue;
      const ins = this.tryInsert(w, small.passengers, this.MAX_MERGE_DETOUR_METERS);
      if (ins && (!best || ins.added < best.added)) best = { w, order: ins.order, added: ins.added };
    }
    if (!best) return null;

    const moved = small.passengers.length;
    best.w.passengers = best.order;
    best.w.rebuild = true;
    working.set(best.w.id as string, best.w);
    small.passengers = [];
    small.finalStatus = 'CANCELLED';
    return { fromRouteId: small.id as string, intoRouteId: best.w.id as string, movedPassengers: moved };
  }

  private toWorkingRoute(route: any, office: { lat: number; lng: number }): WorkingRoute {
    const officeStop = route.stops.find((s: any) => !s.transportRequestId && !s.employeeId);
    const passengers: Passenger[] = route.stops
      .filter((s: any) => s.transportRequestId && s.status !== 'CANCELLED')
      .map((s: any) => ({
        stopId: s.id,
        originRouteId: route.id,
        transportRequestId: s.transportRequestId,
        employeeId: s.employeeId ?? null,
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        boardingOtp: s.boardingOtp,
        previousEta: new Date(s.plannedEta),
      }));
    return {
      id: route.id,
      row: route,
      office: officeStop ? { lat: Number(officeStop.latitude), lng: Number(officeStop.longitude) } : { lat: office.lat, lng: office.lng },
      officeStopId: officeStop?.id,
      anchor: new Date(route.direction === 'LOGOUT' ? route.targetPickup1Time : route.targetOfficeArrivalTime),
      direction: route.direction,
      maxCapacity: route.maxCapacity,
      vehicleCategory: route.vehicleCategory,
      meta: { tenantId: route.tenantId, officeId: route.officeId, shiftDate: route.shiftDate, shiftTime: route.shiftTime },
      passengers,
      rebuild: false,
      finalStatus: route.status,
    };
  }

  private passengerPoint(req: any): LatLng {
    return req.direction === 'LOGOUT'
      ? { lat: Number(req.dropoffLat), lng: Number(req.dropoffLng) }
      : { lat: Number(req.pickupLat), lng: Number(req.pickupLng) };
  }

  private async resolveOffice(req: any, route?: any): Promise<{ officeId: string; lat: number; lng: number }> {
    const officeId = route?.officeId ?? req.employee?.officeId;
    if (!officeId) throw new BadRequestException(`Cannot resolve office for request ${req.id}`);
    const office = await this.db.corporateOffice.findUnique({ where: { id: officeId } });
    if (office) return { officeId, lat: Number(office.latitude), lng: Number(office.longitude) };
    // Fall back to the request's office-side coordinate.
    return req.direction === 'LOGOUT'
      ? { officeId, lat: Number(req.pickupLat), lng: Number(req.pickupLng) }
      : { officeId, lat: Number(req.dropoffLat), lng: Number(req.dropoffLng) };
  }

  // ---------------------------------------------------------------------------
  // Transactional apply
  // ---------------------------------------------------------------------------

  private async apply(
    tx: Tx,
    req: any,
    action: ReplanAction,
    newShiftTime: string | undefined,
    working: Map<string, WorkingRoute>,
    inPlace: InPlaceCancellation[],
    insertion: { route: WorkingRoute; passenger: Passenger } | undefined,
    newScheduledDate?: Date,
  ): Promise<{
    request: Record<string, any>;
    insertion?: { routeId: string; stopId: string; stopSequence: number };
    retimed: { employeeId: string | null; routeId: string; previousEta?: Date; plannedEta: Date }[];
  }> {
    const retimed: { employeeId: string | null; routeId: string; previousEta?: Date; plannedEta: Date }[] = [];
    const rebuilds = [...working.values()].filter((w) => w.rebuild || w.finalStatus === 'CANCELLED');
    const existing = rebuilds.filter((w) => w.id);

    // (a) Guard + update route headers (conditional on what we planned against).
    const timingsById = new Map<WorkingRoute, ReturnType<typeof computeTimings>>();
    for (const w of rebuilds) timingsById.set(w, computeTimings(w.direction, w.passengers, w.office, w.anchor));

    for (const w of existing) {
      const t = timingsById.get(w)!;
      const res = await tx.corporateRoute.updateMany({
        where: { id: w.id, status: w.row.status, updatedAt: w.row.updatedAt },
        data: {
          status: w.finalStatus,
          assignedPassengerCount: w.passengers.length,
          ...(w.passengers.length > 0
            ? {
                targetPickup1Time: t.targetPickup1Time,
                targetOfficeArrivalTime: t.targetOfficeArrivalTime,
                estDistanceMeters: t.estDistanceMeters,
                estDurationSeconds: t.estDurationSeconds,
              }
            : { estDistanceMeters: 0, estDurationSeconds: 0 }),
        },
      });
      if (res.count !== 1) throw new StaleReplanStateError(`route ${w.id} changed`);
    }
    for (const c of inPlace) {
      const res = await tx.corporateRoute.updateMany({
        where: { id: c.route.id, status: c.route.status, updatedAt: c.route.updatedAt },
        data: {
          assignedPassengerCount: c.remainingActive,
          ...(c.cancelRoute ? { status: 'CANCELLED' } : {}),
        },
      });
      if (res.count !== 1) throw new StaleReplanStateError(`route ${c.route.id} changed`);
    }

    // (b) Delete passenger stops that leave a PLANNED route (frees the unique transportRequestId).
    for (const w of existing) {
      const keep = new Set(w.passengers.filter((p) => p.originRouteId === w.id && p.stopId).map((p) => p.stopId));
      for (const s of w.row.stops) {
        if (s.id === w.officeStopId || keep.has(s.id)) continue;
        await tx.corporateRouteStop.delete({ where: { id: s.id } });
      }
    }

    // (c) Cancel stops in place on dispatched routes.
    for (const c of inPlace) {
      await tx.corporateRouteStop.update({
        where: { id: c.stopId },
        data: { status: 'CANCELLED', ...(c.detachRequest ? { transportRequestId: null } : {}) },
      });
      if (c.cancelRoute) {
        await tx.corporateRouteStop.updateMany({
          where: { routeId: c.route.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
      }
    }

    // (d) Re-sequence / re-time / create routes and stops.
    let insertionRef: { routeId: string; stopId: string; stopSequence: number } | undefined;
    for (const w of rebuilds) {
      const t = timingsById.get(w)!;
      let routeId = w.id;
      if (!routeId) {
        const created = await tx.corporateRoute.create({
          data: {
            tenantId: w.meta.tenantId,
            officeId: w.meta.officeId,
            shiftDate: w.meta.shiftDate,
            shiftTime: w.meta.shiftTime,
            direction: w.direction,
            vehicleCategory: w.vehicleCategory,
            maxCapacity: w.maxCapacity,
            assignedPassengerCount: w.passengers.length,
            targetPickup1Time: t.targetPickup1Time,
            targetOfficeArrivalTime: t.targetOfficeArrivalTime,
            estDistanceMeters: t.estDistanceMeters,
            estDurationSeconds: t.estDurationSeconds,
            status: PRE_DISPATCH_STATUS,
          },
        });
        routeId = created.id as string;
      } else {
        // Park remaining sequences out of the way so (routeId, stopSequence) stays unique while renumbering.
        await tx.corporateRouteStop.updateMany({
          where: { routeId },
          data: { stopSequence: { increment: SEQUENCE_PARKING_OFFSET } },
        });
      }

      const isLogout = w.direction === 'LOGOUT';
      const officeSeq = w.finalStatus === 'CANCELLED' ? 1 : isLogout ? 1 : w.passengers.length + 1;
      const officeData = {
        stopSequence: officeSeq,
        plannedEta: t.officeEta,
        ...(w.finalStatus === 'CANCELLED' ? { status: 'CANCELLED' } : {}),
      };
      if (w.officeStopId) {
        await tx.corporateRouteStop.update({ where: { id: w.officeStopId }, data: officeData });
      } else {
        await tx.corporateRouteStop.create({
          data: {
            routeId,
            stopType: isLogout ? 'PICKUP' : 'DROPOFF',
            latitude: w.office.lat,
            longitude: w.office.lng,
            boardingOtp: '------',
            dwellBufferSeconds: 0,
            status: w.finalStatus === 'CANCELLED' ? 'CANCELLED' : 'PENDING',
            ...officeData,
          },
        });
      }

      for (let i = 0; i < w.passengers.length; i++) {
        const p = w.passengers[i];
        const seq = isLogout ? i + 2 : i + 1;
        const eta = t.passengerEtas[i];
        let stopId: string;
        if (p.stopId && p.originRouteId === routeId) {
          await tx.corporateRouteStop.update({ where: { id: p.stopId }, data: { stopSequence: seq, plannedEta: eta } });
          stopId = p.stopId;
        } else {
          const created = await tx.corporateRouteStop.create({
            data: {
              routeId,
              stopSequence: seq,
              stopType: isLogout ? 'DROPOFF' : 'PICKUP',
              transportRequestId: p.transportRequestId,
              employeeId: p.employeeId,
              latitude: p.lat,
              longitude: p.lng,
              plannedEta: eta,
              boardingOtp: p.boardingOtp,
              dwellBufferSeconds: STOP_DWELL_SECONDS,
              status: 'PENDING',
            },
          });
          stopId = created.id as string;
        }
        if (insertion && p === insertion.passenger) {
          insertionRef = { routeId: routeId as string, stopId, stopSequence: seq };
        } else if (!p.previousEta || Math.abs(p.previousEta.getTime() - eta.getTime()) >= 60_000 || p.originRouteId !== routeId) {
          retimed.push({ employeeId: p.employeeId, routeId: routeId as string, previousEta: p.previousEta, plannedEta: eta });
        }
      }
    }

    // (e) Request state transition (conditional => concurrent duplicates retry and resolve idempotently).
    const reqUpdate = await tx.corporateTransportRequest.updateMany({
      where: { id: req.id, status: req.status, shiftTime: req.shiftTime },
      data:
        action === 'CANCEL'
          ? { status: 'CANCELLED' }
          : { status: 'PLANNED', shiftTime: newShiftTime, ...(newScheduledDate ? { scheduledDate: newScheduledDate } : {}) },
    });
    if (reqUpdate.count !== 1) throw new StaleReplanStateError(`request ${req.id} changed`);
    const request = await tx.corporateTransportRequest.findUnique({ where: { id: req.id } });

    return { request: this.publicRequest(request), insertion: insertionRef, retimed };
  }

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------

  private emitSideEffects(
    req: any,
    action: ReplanAction,
    inPlace: InPlaceCancellation[],
    retimed: { employeeId: string | null; routeId: string; previousEta?: Date; plannedEta: Date }[],
  ): void {
    try {
      for (const c of inPlace) {
        const payload = {
          routeId: c.route.id,
          stopId: c.stopId,
          employeeId: req.employeeId,
          reason: action === 'CANCEL' ? 'EMPLOYEE_CANCELLED' : 'EMPLOYEE_RESCHEDULED',
          remainingPassengers: c.remainingActive,
          routeCancelled: c.cancelRoute,
        };
        if (c.route.driverId) {
          this.notifications.emitEvent(
            `driver:${c.route.driverId}`,
            c.cancelRoute ? 'CORPORATE_ROUTE_CANCELLED' : 'CORPORATE_ROUTE_STOP_CANCELLED',
            payload,
          );
        }
        this.notifications.emitEvent(`corporate:${req.tenantId}`, c.cancelRoute ? 'ROUTE_CANCELLED' : 'ROUTE_STOP_CANCELLED', payload);
      }
      for (const r of retimed) {
        if (!r.employeeId) continue;
        this.notifications.emitEvent(`employee:${r.employeeId}`, 'CORPORATE_PICKUP_UPDATED', {
          routeId: r.routeId,
          previousEta: r.previousEta,
          plannedEta: r.plannedEta,
        });
      }
    } catch (err) {
      this.logger.error(`Replan notification failure for ${req.id}: ${(err as Error).message}`);
    }
  }

  /**
   * A route cancelled while DISPATCHING may still have a live 60s offer on some driver's screen.
   * Withdraw it (and release the driver's exclusive hold) so they can take other work at once.
   */
  private async withdrawOffersOfCancelledRoutes(inPlace: InPlaceCancellation[]): Promise<void> {
    for (const c of inPlace) {
      if (!c.cancelRoute || c.route.status !== 'DISPATCHING') continue;
      try {
        const driverId = await withdrawCorporateRouteOffer(this.redis.getClient(), c.route.id);
        if (driverId) {
          this.notifications.emitEvent(`driver:${driverId}`, 'CORPORATE_ROUTE_OFFER_WITHDRAWN', {
            routeId: c.route.id,
            reason: 'ROUTE_CANCELLED',
          });
        }
      } catch (err) {
        this.logger.error(`Offer withdrawal for cancelled route ${c.route.id} failed: ${(err as Error).message}`);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Infra helpers
  // ---------------------------------------------------------------------------

  private async withLocks<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
    const sorted = [...new Set(keys)].sort();
    const held: { key: string; token: string }[] = [];
    try {
      for (const key of sorted) {
        const deadline = Date.now() + this.LOCK_WAIT_MS;
        let token: string | null = null;
        while (!(token = await this.redis.acquireLockToken(key, this.LOCK_TTL_SECONDS))) {
          if (Date.now() > deadline) {
            throw new ConflictException(`Route re-planning busy (${key}); please retry`);
          }
          await new Promise((r) => setTimeout(r, this.LOCK_RETRY_MS));
        }
        held.push({ key, token });
      }
      return await fn();
    } finally {
      for (const h of held.reverse()) {
        await this.redis.releaseLockToken(h.key, h.token).catch(() => undefined);
      }
    }
  }

  private loadRequest(client: Tx, requestId: string): Promise<any> {
    return client.corporateTransportRequest.findUnique({
      where: { id: requestId },
      include: { employee: true, routeStop: { include: { route: true } } },
    });
  }

  private loadRoute(client: Tx, routeId: string): Promise<any> {
    return client.corporateRoute.findUnique({
      where: { id: routeId },
      include: { stops: { orderBy: { stopSequence: 'asc' } } },
    });
  }

  private publicRequest(req: any): Record<string, any> {
    if (!req) return req;
    const { employee: _e, routeStop: _s, ...rest } = req;
    return rest;
  }

  private generateOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
