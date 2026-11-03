import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@adhocx/contracts';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';

/**
 * Lifecycle milestones an ETS employee is notified about during a corporate commute.
 */
export type RiderLifecycleEvent =
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'APPROACHING'
  | 'ARRIVED'
  | 'BOARDED'
  | 'NO_SHOW'
  | 'DROPPED'
  | 'PICKUP_RETIMED'
  | 'CAB_REPLACED';

/**
 * Websocket event names on the `employee:{id}` channel.
 * ARRIVED / BOARDED keep their legacy names so existing employee-app listeners keep working.
 */
export const RIDER_WS_EVENTS: Record<RiderLifecycleEvent, string> = {
  ASSIGNED: 'CAB_ASSIGNED',
  EN_ROUTE: 'CAB_EN_ROUTE',
  APPROACHING: 'CAB_APPROACHING',
  ARRIVED: 'CAB_ARRIVED_AT_STOP',
  BOARDED: 'BOARDING_CONFIRMED',
  NO_SHOW: 'RIDE_NO_SHOW',
  DROPPED: 'RIDE_DROPPED',
  PICKUP_RETIMED: 'CORPORATE_PICKUP_UPDATED',
  CAB_REPLACED: 'CORPORATE_CAB_REPLACED',
};

export const NO_SHOW_DEFAULT_REASON =
  'You were not at the pickup point within the 5-minute wait window, so the cab has left for the next stop.';

export interface RiderNotificationContext {
  routeId: string;
  tenantId: string;
  employeeId: string;
  stopId?: string;
  stopSequence?: number;
  /** Extra fields merged into websocket payload and push data. */
  payload?: Record<string, any>;
}

export interface RiderNotificationOutcome {
  event: RiderLifecycleEvent;
  employeeId: string;
  delivered: boolean;
  deduped: boolean;
  websocket: boolean;
  push: 'SENT' | 'NO_DEVICE' | 'FAILED' | 'SKIPPED';
}

export interface StopEta {
  stopId: string;
  stopSequence: number;
  employeeId: string;
  etaMinutes: number;
  etaAt: Date;
}

/**
 * CorporateRiderNotifier
 *
 * Single place mapping each ETS ride lifecycle event to:
 *  - websocket event on `employee:{employeeId}`
 *  - FCM push to the employee's linked user account (only when an active device token exists)
 *  - corporate dashboard attendance events on `corporate:{tenantId}` (BOARDED → PRESENT/LATE, NO_SHOW)
 *
 * Guarantees: never throws (all failures are caught and logged) and each
 * (event, route, stop/employee) is delivered at most once via a Redis NX key with TTL.
 */
@Injectable()
export class CorporateRiderNotifier {
  private readonly logger = new Logger(CorporateRiderNotifier.name);

  static readonly DEDUPE_TTL_SECONDS = 24 * 60 * 60;
  /** Boarding more than this many seconds after cab arrival is reported as LATE. */
  static readonly LATE_BOARDING_GRACE_SECONDS = 120;
  /** Average urban speed 30 km/h (500 m/min), same assumption as telemetry ETA. */
  static readonly AVG_SPEED_METERS_PER_MIN = 500;
  /** Expected dwell at each intermediate pickup when projecting downstream ETAs. */
  static readonly EXPECTED_STOP_DWELL_SECONDS = 120;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------------------------------------------------------------------
  // Lifecycle API
  // ---------------------------------------------------------------------------

  /** Route accepted by a driver: tell every employee on the route who is coming. */
  public async notifyRouteAssigned(routeId: string): Promise<RiderNotificationOutcome[]> {
    try {
      const route: any = await this.db.corporateRoute.findUnique({
        where: { id: routeId },
        include: {
          driver: true,
          vehicle: true,
          stops: { orderBy: { stopSequence: 'asc' } },
        },
      });
      if (!route) return [];

      const details = this.cabDetails(route);
      const employeeStops = route.stops.filter((s: any) => s.employeeId && s.status === 'PENDING');

      return Promise.all(
        employeeStops.map((s: any) =>
          this.notify('ASSIGNED', {
            routeId,
            tenantId: route.tenantId,
            employeeId: s.employeeId,
            stopId: s.id,
            stopSequence: s.stopSequence,
            payload: {
              ...details,
              plannedPickupAt: s.plannedEta,
              boardingOtp: s.boardingOtp,
            },
          }),
        ),
      );
    } catch (err: any) {
      this.logger.error(`notifyRouteAssigned(${routeId}) failed: ${err?.message}`);
      return [];
    }
  }

  /**
   * Driver started driving toward pickup 1: notify each pickup employee with an individual ETA.
   * Also fires APPROACHING ("you're next") for the first pending pickup.
   */
  public async notifyRouteStarted(
    route: { id: string; tenantId: string; driver?: any; vehicle?: any },
    etas: StopEta[],
  ): Promise<RiderNotificationOutcome[]> {
    const details = this.cabDetails(route);
    const outcomes = await Promise.all(
      etas.map((eta, idx) =>
        this.notify('EN_ROUTE', {
          routeId: route.id,
          tenantId: route.tenantId,
          employeeId: eta.employeeId,
          stopId: eta.stopId,
          stopSequence: eta.stopSequence,
          payload: {
            ...details,
            etaMinutes: eta.etaMinutes,
            etaAt: eta.etaAt,
            stopsBeforeYou: idx,
          },
        }),
      ),
    );

    if (etas.length > 0) {
      const first = etas[0];
      outcomes.push(
        await this.notify('APPROACHING', {
          routeId: route.id,
          tenantId: route.tenantId,
          employeeId: first.employeeId,
          stopId: first.stopId,
          stopSequence: first.stopSequence,
          payload: { etaMinutes: first.etaMinutes, etaAt: first.etaAt },
        }),
      );
    }
    return outcomes;
  }

  /**
   * Pickup time moved (e.g. traffic forecast advanced pickup-1): tell each affected employee
   * the new time. Deduped per (stop, new time) so repeated polls with the same result send once.
   */
  public async notifyPickupRetimed(
    route: { id: string; tenantId: string },
    changes: Array<{ stopId: string; stopSequence?: number; employeeId: string; previousEta: Date; plannedEta: Date; reason?: string }>,
  ): Promise<RiderNotificationOutcome[]> {
    return Promise.all(
      changes.map((c) =>
        this.notify('PICKUP_RETIMED', {
          routeId: route.id,
          tenantId: route.tenantId,
          employeeId: c.employeeId,
          stopId: c.stopId,
          stopSequence: c.stopSequence,
          payload: { previousEta: c.previousEta, plannedEta: c.plannedEta, reason: c.reason },
        }),
      ),
    );
  }

  /**
   * Ops reassigned the route's driver (WS-D command centre): tell every still-pending employee that
   * their cab is being replaced, and clear their ASSIGNED dedupe marker so the replacement driver's
   * assignment notice is delivered. Deduped per reassignment. The internal ops reason is never sent.
   */
  public async notifyCabReplaced(routeId: string, reassignmentId: string): Promise<RiderNotificationOutcome[]> {
    try {
      const route: any = await this.db.corporateRoute.findUnique({
        where: { id: routeId },
        include: { stops: { orderBy: { stopSequence: 'asc' } } },
      });
      if (!route) return [];
      const pending = (route.stops ?? []).filter((s: any) => s.employeeId && s.status === 'PENDING');
      const client = this.redis.getClient();
      return Promise.all(
        pending.map(async (s: any) => {
          const ctx: RiderNotificationContext = {
            routeId,
            tenantId: route.tenantId,
            employeeId: s.employeeId,
            stopId: s.id,
            stopSequence: s.stopSequence,
            payload: { reassignmentId, plannedPickupAt: s.plannedEta },
          };
          try {
            if (client) await client.del(this.dedupeKey('ASSIGNED', ctx));
          } catch (err: any) {
            this.logger.warn(`Clearing ASSIGNED dedupe for stop ${s.id} failed: ${err?.message}`);
          }
          return this.notify('CAB_REPLACED', ctx);
        }),
      );
    } catch (err: any) {
      this.logger.error(`notifyCabReplaced(${routeId}) failed: ${err?.message}`);
      return [];
    }
  }

  public notifyApproaching(ctx: RiderNotificationContext): Promise<RiderNotificationOutcome> {
    return this.notify('APPROACHING', ctx);
  }

  public notifyArrived(ctx: RiderNotificationContext): Promise<RiderNotificationOutcome> {
    return this.notify('ARRIVED', ctx);
  }

  public notifyBoarded(ctx: RiderNotificationContext): Promise<RiderNotificationOutcome> {
    return this.notify('BOARDED', ctx);
  }

  public notifyNoShow(ctx: RiderNotificationContext): Promise<RiderNotificationOutcome> {
    return this.notify('NO_SHOW', ctx);
  }

  public notifyDropped(ctx: RiderNotificationContext): Promise<RiderNotificationOutcome> {
    return this.notify('DROPPED', ctx);
  }

  /**
   * Projects per-stop ETAs for pending employee pickups, chaining legs from the driver's
   * current position (haversine @ 500 m/min + expected dwell per intermediate stop).
   * Falls back to the solver's plannedEta when no driver position is known.
   */
  public computePickupEtas(
    stops: Array<{
      id: string;
      stopSequence: number;
      stopType: string;
      status: string;
      employeeId?: string | null;
      latitude: any;
      longitude: any;
      plannedEta?: Date | string | null;
    }>,
    origin?: { latitude: number; longitude: number },
    now: Date = new Date(),
  ): StopEta[] {
    const pickups = stops
      .filter((s) => s.stopType === 'PICKUP' && s.status === 'PENDING' && s.employeeId)
      .sort((a, b) => a.stopSequence - b.stopSequence);

    const result: StopEta[] = [];
    let cursor = origin ? { lat: origin.latitude, lng: origin.longitude } : null;
    let elapsedSeconds = 0;

    pickups.forEach((s, idx) => {
      let etaAt: Date;
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (cursor) {
        const meters = haversineMeters(cursor.lat, cursor.lng, lat, lng);
        elapsedSeconds += (meters / CorporateRiderNotifier.AVG_SPEED_METERS_PER_MIN) * 60;
        if (idx > 0) elapsedSeconds += CorporateRiderNotifier.EXPECTED_STOP_DWELL_SECONDS;
        etaAt = new Date(now.getTime() + Math.round(elapsedSeconds) * 1000);
        cursor = { lat, lng };
      } else {
        const planned = s.plannedEta ? new Date(s.plannedEta) : now;
        etaAt = planned.getTime() > now.getTime() ? planned : now;
      }
      const etaMinutes = Math.max(1, Math.round((etaAt.getTime() - now.getTime()) / 60000));
      result.push({
        stopId: s.id,
        stopSequence: s.stopSequence,
        employeeId: s.employeeId as string,
        etaMinutes,
        etaAt,
      });
    });
    return result;
  }

  // ---------------------------------------------------------------------------
  // Core dispatch
  // ---------------------------------------------------------------------------

  public async notify(
    event: RiderLifecycleEvent,
    ctx: RiderNotificationContext,
  ): Promise<RiderNotificationOutcome> {
    const outcome: RiderNotificationOutcome = {
      event,
      employeeId: ctx.employeeId,
      delivered: false,
      deduped: false,
      websocket: false,
      push: 'SKIPPED',
    };

    try {
      const fresh = await this.claimDedupeKey(event, ctx);
      if (!fresh) {
        outcome.deduped = true;
        return outcome;
      }

      const employee: any = await this.safeLoadEmployee(ctx.employeeId);
      const message = this.buildMessage(event, ctx, employee);
      const wsPayload = {
        lifecycle: event,
        routeId: ctx.routeId,
        stopId: ctx.stopId,
        stopSequence: ctx.stopSequence,
        employeeId: ctx.employeeId,
        ...(ctx.payload || {}),
        title: message.title,
        message: message.body,
        occurredAt: new Date(),
      };

      // 1. Websocket (employee app live screen)
      try {
        this.notifications.emitEvent(`employee:${ctx.employeeId}`, RIDER_WS_EVENTS[event], wsPayload);
        outcome.websocket = true;
      } catch (err: any) {
        this.logger.warn(`WS emit ${event} → employee ${ctx.employeeId} failed: ${err?.message}`);
      }

      // 2. Corporate dashboard attendance
      this.emitDashboardAttendance(event, ctx, employee);

      // 3. FCM push (only if a linked user with an active device exists)
      outcome.push = await this.sendPush(event, ctx, employee, message);
      outcome.delivered = true;
    } catch (err: any) {
      this.logger.error(`Rider notification ${event} for employee ${ctx.employeeId} failed: ${err?.message}`);
    }
    return outcome;
  }

  private emitDashboardAttendance(
    event: RiderLifecycleEvent,
    ctx: RiderNotificationContext,
    employee: any,
  ): void {
    const base = {
      routeId: ctx.routeId,
      stopId: ctx.stopId,
      stopSequence: ctx.stopSequence,
      employeeId: ctx.employeeId,
      employeeName: employee?.fullName ?? ctx.payload?.employeeName,
      employeeCode: employee?.employeeCode ?? ctx.payload?.employeeCode,
    };
    try {
      if (event === 'BOARDED') {
        const waitedSeconds = Number(ctx.payload?.waitedSeconds ?? 0);
        const isLate = waitedSeconds > CorporateRiderNotifier.LATE_BOARDING_GRACE_SECONDS;
        this.notifications.emitEvent(
          `corporate:${ctx.tenantId}`,
          isLate ? 'ATTENDANCE_LATE' : 'ATTENDANCE_PRESENT',
          { ...base, waitedSeconds, boardedAt: ctx.payload?.departureTime, recordedAt: new Date() },
        );
      } else if (event === 'NO_SHOW') {
        this.notifications.emitEvent(`corporate:${ctx.tenantId}`, 'ATTENDANCE_NO_SHOW', {
          ...base,
          reason: ctx.payload?.reason ?? NO_SHOW_DEFAULT_REASON,
          recordedAt: ctx.payload?.recordedAt ?? new Date(),
        });
      }
    } catch (err: any) {
      this.logger.warn(`Dashboard attendance emit failed for ${event}: ${err?.message}`);
    }
  }

  private async sendPush(
    event: RiderLifecycleEvent,
    ctx: RiderNotificationContext,
    employee: any,
    message: { title: string; body: string },
  ): Promise<RiderNotificationOutcome['push']> {
    try {
      if (!employee) return 'NO_DEVICE';
      const userId = await this.resolveUserId(employee);
      if (!userId) return 'NO_DEVICE';

      const tokenCount = await this.db.deviceToken.count({ where: { userId, isActive: true } });
      if (!tokenCount) return 'NO_DEVICE';

      await this.notifications.sendPushToUser(userId, {
        title: message.title,
        body: message.body,
        type: NotificationType.TRIP_STATUS,
        data: {
          action: `CORPORATE_RIDE_${event}`,
          routeId: ctx.routeId,
          stopId: ctx.stopId ?? '',
          employeeId: ctx.employeeId,
        },
        idempotencyKey: this.dedupeKey(event, ctx),
      });
      return 'SENT';
    } catch (err: any) {
      this.logger.warn(
        `Push ${event} → employee ${ctx.employeeId} failed (trip flow unaffected): ${err?.message}`,
      );
      return 'FAILED';
    }
  }

  /**
   * Prefer the explicit CorporateEmployee.userId link. Employees not yet linked
   * (pre-backfill rows) fall back to matching a User by phone or email.
   */
  private async resolveUserId(employee: any): Promise<string | null> {
    if (employee.userId) return employee.userId;
    const or: any[] = [];
    if (employee.phoneNumber) or.push({ phone: employee.phoneNumber });
    if (employee.email) or.push({ email: employee.email });
    if (or.length === 0) return null;
    const user = await this.db.user.findFirst({ where: { OR: or }, select: { id: true } });
    return user?.id ?? null;
  }

  private async safeLoadEmployee(employeeId: string): Promise<any | null> {
    try {
      return await this.db.corporateEmployee.findUnique({ where: { id: employeeId } });
    } catch (err: any) {
      this.logger.warn(`Employee lookup ${employeeId} failed: ${err?.message}`);
      return null;
    }
  }

  private dedupeKey(event: RiderLifecycleEvent, ctx: RiderNotificationContext): string {
    const base = `corporate:rider-notify:${event}:${ctx.routeId}:${ctx.stopId ?? ctx.employeeId}`;
    if (event === 'PICKUP_RETIMED' && ctx.payload?.plannedEta) {
      return `${base}:${new Date(ctx.payload.plannedEta).getTime()}`;
    }
    if (event === 'CAB_REPLACED' && ctx.payload?.reassignmentId) {
      return `${base}:${ctx.payload.reassignmentId}`;
    }
    return base;
  }

  /** Returns true when this notification has not been sent yet. Fails open if Redis is unavailable. */
  private async claimDedupeKey(
    event: RiderLifecycleEvent,
    ctx: RiderNotificationContext,
  ): Promise<boolean> {
    try {
      const client = this.redis.getClient();
      if (!client) return true;
      const res = await client.set(
        this.dedupeKey(event, ctx),
        new Date().toISOString(),
        'EX',
        CorporateRiderNotifier.DEDUPE_TTL_SECONDS,
        'NX',
      );
      return res === 'OK';
    } catch (err: any) {
      this.logger.warn(`Dedupe check failed for ${event} (sending anyway): ${err?.message}`);
      return true;
    }
  }

  private cabDetails(route: any): Record<string, any> {
    const driver = route?.driver;
    const vehicle = route?.vehicle;
    return {
      driverId: route?.driverId ?? driver?.id,
      driverName: driver?.fullName,
      driverPhone: driver?.phone,
      vehicleNumber: vehicle?.registrationNumber ?? driver?.vehiclePlate,
      vehicleModel: vehicle
        ? [vehicle.make, vehicle.model].filter(Boolean).join(' ')
        : driver?.vehicleModel,
    };
  }

  private buildMessage(
    event: RiderLifecycleEvent,
    ctx: RiderNotificationContext,
    employee: any,
  ): { title: string; body: string } {
    const p = ctx.payload || {};
    const firstName = employee?.fullName ? String(employee.fullName).split(' ')[0] : 'there';
    const cab = [p.vehicleModel, p.vehicleNumber].filter(Boolean).join(' ');
    const driver = p.driverName ? ` with ${p.driverName}` : '';
    switch (event) {
      case 'ASSIGNED':
        return {
          title: 'Cab assigned',
          body: `Hi ${firstName}, your cab${cab ? ` ${cab}` : ''}${driver} is assigned for your shift commute.`,
        };
      case 'EN_ROUTE':
        return {
          title: 'Driver is on the way',
          body: `Your driver has started the trip. Estimated pickup in ${p.etaMinutes ?? '?'} min.`,
        };
      case 'APPROACHING':
        return {
          title: "You're next",
          body: 'Your cab is heading to your pickup point now. Please be ready at the pickup point.',
        };
      case 'ARRIVED':
        return {
          title: 'Cab has arrived',
          body: p.boardingOtp
            ? `Your cab has arrived! 5-minute boarding timer started. Share OTP ${p.boardingOtp} with your driver.`
            : 'Your cab has arrived! 5-minute boarding timer started.',
        };
      case 'BOARDED':
        return { title: 'Boarding confirmed', body: 'You are on board. Have a safe ride!' };
      case 'NO_SHOW':
        return {
          title: 'Marked as no-show',
          body: `Cab has left: ${p.reason ?? NO_SHOW_DEFAULT_REASON}`,
        };
      case 'DROPPED':
        return { title: 'Trip completed', body: 'You have been dropped at your destination. Thank you for riding!' };
      case 'PICKUP_RETIMED': {
        const at = p.plannedEta ? formatIstClock(new Date(p.plannedEta)) : 'a new time';
        return {
          title: 'Pickup time changed',
          body: `Hi ${firstName}, your pickup is now at ${at} IST${p.reason ? ` (${p.reason})` : ''}. Please be ready by then.`,
        };
      }
      case 'CAB_REPLACED':
        return {
          title: 'Cab changed',
          body: `Hi ${firstName}, your cab for this commute has been changed. A replacement cab is being arranged and you will get its details shortly. Your pickup time is unchanged.`,
        };
    }
  }
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** HH:mm in IST (UTC+5:30), independent of the server timezone. */
export function formatIstClock(d: Date): string {
  const ist = new Date(d.getTime() + 330 * 60_000);
  return `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;
}
