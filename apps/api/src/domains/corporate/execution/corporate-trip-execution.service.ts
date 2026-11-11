import { setBounded } from '../../../common/utils/bounded-map';
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Inject,
  Optional,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  ArriveAtStopDto,
  VerifyStopOtpDto,
  VerifyStopQrDto,
  RouteTelemetryDto,
  MarkNoShowDto,
  StopExecutionResult,
  BoardingQrTokenResult,
  RouteWaypointsResult,
  RescheduleRequestDto,
  StartRouteDto,
  StartRouteResult,
} from './trip-execution.types';
import { CorporateRiderNotifier } from './corporate-rider-notifier.service';
import { CorporateReplanningService } from '../replanning/corporate-replanning.service';
import { CorporateSafetyService } from '../safety/corporate-safety.service';
import { EmergencyBoardingFallbackDto } from '@adhocx/contracts';
import {
  CutoffOverride,
  evaluateCutoff,
  resolveCancelCutoffHours,
  formatIst,
  isValidShiftDate,
  isValidShiftTime,
  resolvePickupTime,
  toDateOnly,
} from '../replanning/cutoff-policy';
import { TripEventRecorder } from '../tracking/trip-event-recorder.service';
import { CorporateGpsIngestService } from '../tracking/corporate-gps-ingest.service';

@Injectable()
export class CorporateTripExecutionService {
  private readonly logger = new Logger(CorporateTripExecutionService.name);

  // Constants per PRD specification
  private readonly GEOFENCE_RADIUS_METERS = 150; // 150m arrival boundary
  private readonly STOP_WAIT_BUFFER_SECONDS = 300; // 5.0 minutes (300 seconds)
  /** Wrong boarding OTPs allowed per stop before it locks (4 digits = 10,000 combinations). */
  readonly MAX_OTP_ATTEMPTS = 5;
  readonly OTP_ATTEMPT_WINDOW_SECONDS = 30 * 60;
  /** Per-process fallback when Redis is unavailable, so the attempt limit never silently disappears. */
  private readonly localOtpFailures = new Map<string, { count: number; expiresAt: number }>();

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() riderNotifier?: CorporateRiderNotifier,
    @Optional() private readonly replanning?: CorporateReplanningService,
    @Optional() private readonly safety?: CorporateSafetyService,
  ) {
    this.riderNotifier = riderNotifier ?? new CorporateRiderNotifier(db, redis, notifications);
  }

  private readonly riderNotifier: CorporateRiderNotifier;

  /** WS-B: trip timeline + GPS pipeline (property-injected; absent in narrow unit-test modules). */
  @Optional() @Inject(TripEventRecorder) private readonly tripEvents?: TripEventRecorder;
  @Optional() @Inject(CorporateGpsIngestService) private readonly gpsIngestProvider?: CorporateGpsIngestService;
  private gpsIngestFallback?: CorporateGpsIngestService;
  private get gpsIngest(): CorporateGpsIngestService {
    return this.gpsIngestProvider ?? (this.gpsIngestFallback ??= new CorporateGpsIngestService(this.redis));
  }

  /**
   * Driver starts driving toward pickup 1. Transitions route ASSIGNED -> IN_TRANSIT and
   * notifies every pickup employee with their individual ETA (EN_ROUTE) plus "you're next" for stop 1.
   */
  public async startRoute(routeId: string, dto: StartRouteDto = {}): Promise<StartRouteResult> {
    const route: any = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        driver: true,
        vehicle: true,
        stops: { orderBy: { stopSequence: 'asc' } },
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }

    if (route.status !== 'ASSIGNED' || !route.driverId) {
      throw new BadRequestException(
        `Cannot start route: route must be ASSIGNED to a driver (current: ${route.status}${route.driverId ? '' : ', no driver'})`,
      );
    }

    if (dto.driverId && dto.driverId !== route.driverId) {
      throw new BadRequestException('This route is assigned to another driver');
    }

    // P0 Safety: Pre-flight Driver Verification Check
    if (route.driver && route.driver.verificationStatus && route.driver.verificationStatus !== 'VERIFIED') {
      throw new BadRequestException(
        `Safety Block: Driver ${route.driver.fullName} is not VERIFIED (${route.driver.verificationStatus}). Only verified drivers can start corporate trips.`,
      );
    }

    // P0 Safety: Seat Capacity Enforcement
    if (route.maxCapacity && route.assignedPassengerCount > route.maxCapacity) {
      throw new BadRequestException(
        `Safety Block: Assigned passengers (${route.assignedPassengerCount}) exceed vehicle seat capacity (${route.maxCapacity}). Over-capacity trip prevented.`,
      );
    }

    // Atomic compare-and-set guards against double-start races
    const { count } = await this.db.corporateRoute.updateMany({
      where: { id: routeId, status: 'ASSIGNED' },
      data: { status: 'IN_TRANSIT' },
    });
    if (count === 0) {
      throw new ConflictException(`Route ${routeId} was already started`);
    }
    await this.invalidateRoutePlan(routeId);

    const startedAt = new Date();
    const origin =
      dto.driverLatitude !== undefined && dto.driverLongitude !== undefined
        ? { latitude: dto.driverLatitude, longitude: dto.driverLongitude }
        : undefined;
    const etas = this.riderNotifier.computePickupEtas(route.stops, origin, startedAt);

    this.notifications.emitEvent(`corporate:${route.tenantId}`, 'ROUTE_STARTED', {
      routeId,
      driverId: route.driverId,
      startedAt,
      pickups: etas.length,
    });

    await this.riderNotifier.notifyRouteStarted(route, etas);
    await this.tripEvents?.record({ tenantId: route.tenantId, routeId, type: 'ROUTE_STARTED', actorId: route.driverId, actorRole: 'DRIVER', payload: { pickups: etas.length, origin }, at: startedAt });

    this.logger.log(`Route ${routeId} started by driver ${route.driverId}; ${etas.length} employees notified`);

    return {
      routeId,
      status: 'IN_TRANSIT',
      startedAt,
      stopEtas: etas.map((e) => ({
        stopId: e.stopId,
        stopSequence: e.stopSequence,
        employeeId: e.employeeId,
        etaMinutes: e.etaMinutes,
        etaAt: e.etaAt,
      })),
    };
  }

  /** Fires "you're next" for the next pending employee pickup after `afterSequence`. */
  private async notifyNextPickupApproaching(
    routeId: string,
    tenantId: string,
    afterSequence: number,
  ): Promise<void> {
    try {
      const next = await this.db.corporateRouteStop.findFirst({
        where: {
          routeId,
          stopType: 'PICKUP',
          status: 'PENDING',
          employeeId: { not: null },
          stopSequence: { gt: afterSequence },
        },
        orderBy: { stopSequence: 'asc' },
      });
      if (!next?.employeeId) return;
      await this.riderNotifier.notifyApproaching({
        routeId,
        tenantId,
        employeeId: next.employeeId,
        stopId: next.id,
        stopSequence: next.stopSequence,
      });
    } catch (err: any) {
      this.logger.warn(`Approaching notification after stop #${afterSequence} failed: ${err?.message}`);
    }
  }

  /**
   * Driver marks arrival at an employee pickup stop (or office dropoff stop).
   * Verifies GPS geofence within 150m and initiates the immutable 5-minute dwell timer.
   */
  public async arriveAtStop(
    routeId: string,
    stopId: string,
    dto: ArriveAtStopDto,
  ): Promise<StopExecutionResult> {
    const route = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        tenant: true,
        office: true,
        stops: { orderBy: { stopSequence: 'asc' } },
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }

    const stop = route.stops.find((s) => s.id === stopId);
    if (!stop) {
      throw new NotFoundException(`Stop ${stopId} not found on route ${routeId}`);
    }

    if (stop.status !== 'PENDING') {
      throw new BadRequestException(`Stop is already in status ${stop.status}`);
    }

    // 1. Geofence verification (within 150m)
    const distMeters = this.haversineDistanceMeters(
      dto.driverLatitude,
      dto.driverLongitude,
      Number(stop.latitude),
      Number(stop.longitude),
    );

    if (distMeters > this.GEOFENCE_RADIUS_METERS) {
      throw new BadRequestException(
        `Arrival outside geofence: Driver is ${Math.round(distMeters)}m away (max allowed: ${this.GEOFENCE_RADIUS_METERS}m)`,
      );
    }

    const arrivalTime = new Date();

    // 2. Update stop status to ARRIVED
    await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: {
        status: 'ARRIVED',
        actualArrivalTime: arrivalTime,
        ...(stop.stopType === 'DROPOFF' && !stop.employeeId ? { actualDepartureTime: arrivalTime } : {}),
      },
    });
    await this.invalidateRoutePlan(routeId);

    // If route was in ASSIGNED/PLANNED, mark IN_TRANSIT
    if (route.status !== 'IN_TRANSIT') {
      await this.db.corporateRoute.update({
        where: { id: routeId },
        data: { status: 'IN_TRANSIT' },
      });
    }

    // 3. Initiate 5-minute (300s) dwell timer in Redis
    const timerKey = `corporate:stop:timer:${stopId}`;
    const client = this.redis.getClient();
    if (client) {
      await client.set(timerKey, arrivalTime.toISOString(), 'EX', this.STOP_WAIT_BUFFER_SECONDS);
    }

    // 4. Employee websocket + push (pickup: ARRIVED with OTP & 5-min timer; home drop: DROPPED)
    if (stop.employeeId) {
      const ctx = {
        routeId,
        tenantId: route.tenantId,
        employeeId: stop.employeeId,
        stopId,
        stopSequence: stop.stopSequence,
      };
      if (stop.stopType === 'DROPOFF') {
        await this.riderNotifier.notifyDropped({ ...ctx, payload: { droppedAt: arrivalTime } });
      } else {
        await this.riderNotifier.notifyArrived({
          ...ctx,
          payload: {
            boardingOtp: stop.boardingOtp,
            dwellSeconds: this.STOP_WAIT_BUFFER_SECONDS,
            arrivalTime,
            driverId: route.driverId,
          },
        });
      }
    }

    this.notifications.emitEvent(`driver:${route.driverId}`, 'STOP_WAIT_TIMER_STARTED', {
      routeId,
      stopId,
      dwellBufferSeconds: this.STOP_WAIT_BUFFER_SECONDS,
      arrivalTime,
    });

    await this.tripEvents?.record({ tenantId: route.tenantId, routeId, stopId, type: 'STOP_ARRIVED', actorId: route.driverId, actorRole: 'DRIVER', payload: { stopSequence: stop.stopSequence, stopType: stop.stopType, distanceMeters: Math.round(distMeters) }, at: arrivalTime });
    this.notifications.emitEvent(`corporate:${route.tenantId}`, 'ROUTE_STOP_ARRIVED', {
      routeId,
      stopId,
      stopSequence: stop.stopSequence,
      arrivalTime,
    });

    return {
      stopId,
      routeId,
      stopSequence: stop.stopSequence,
      stopType: stop.stopType,
      status: 'ARRIVED',
      actualArrivalTime: arrivalTime,
      countdownRemainingSeconds: this.STOP_WAIT_BUFFER_SECONDS,
      message: 'Cab arrived at stop. 5-minute boarding timer initiated.',
    };
  }

  /**
   * Ops (ADMIN) unlocks a stop whose boarding OTP was locked after too many wrong attempts. Boarding
   * still needs the employee's correct code afterwards; this only resets the counter. Audited.
   */
  public async unlockBoardingOtp(routeId: string, stopId: string, actorUserId: string | undefined, reason: string) {
    const stop = await this.db.corporateRouteStop.findUnique({ where: { id: stopId }, include: { route: true } });
    if (!stop || stop.routeId !== routeId) {
      throw new NotFoundException(`Stop ${stopId} not found on route ${routeId}`);
    }
    const key = `corporate:stop:otp-attempts:${stopId}`;
    const failedAttempts = await this.otpFailures(key);
    await this.clearOtpFailures(key);
    await this.audit.log({
      action: 'CORPORATE_BOARDING_OTP_UNLOCKED',
      userId: actorUserId,
      actorRole: 'ADMIN',
      entityType: 'CORPORATE_ROUTE_STOP',
      entityId: stopId,
      metadata: { routeId, failedAttempts, reason },
    });
    return { routeId, stopId, unlocked: true, failedAttemptsCleared: failedAttempts };
  }

  private async otpFailures(key: string): Promise<number> {
    const client = this.redis.getClient();
    if (client) return Number((await client.get(key)) ?? 0);
    const entry = this.localOtpFailures.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      this.localOtpFailures.delete(key);
      return 0;
    }
    return entry.count;
  }

  private async recordOtpFailure(key: string): Promise<number> {
    const client = this.redis.getClient();
    if (client) {
      const n = await client.incr(key);
      if (n === 1) await client.expire(key, this.OTP_ATTEMPT_WINDOW_SECONDS);
      return n;
    }
    const count = (await this.otpFailures(key)) + 1;
    const prev = this.localOtpFailures.get(key);
    setBounded(this.localOtpFailures, key, {
      count,
      expiresAt: prev?.expiresAt ?? Date.now() + this.OTP_ATTEMPT_WINDOW_SECONDS * 1000,
    }, 10000);
    return count;
  }

  private async clearOtpFailures(key: string): Promise<void> {
    const client = this.redis.getClient();
    if (client) await client.del(key);
    else this.localOtpFailures.delete(key);
  }

  /**
   * Driver verifies employee's 4-digit boarding OTP.
   * On success: transitions stop to BOARDED, records departure time, and halts wait timer.
   */
  public async verifyBoardingOtp(
    routeId: string,
    stopId: string,
    dto: VerifyStopOtpDto,
  ): Promise<StopExecutionResult> {
    const stop = await this.db.corporateRouteStop.findUnique({
      where: { id: stopId },
      include: { route: true },
    });

    if (!stop || stop.routeId !== routeId) {
      throw new NotFoundException(`Stop ${stopId} not found on route ${routeId}`);
    }

    if (stop.status !== 'ARRIVED') {
      throw new BadRequestException(
        `Cannot verify OTP: Stop must be in ARRIVED status (current: ${stop.status})`,
      );
    }

    // A 4-digit OTP is only safe with an attempt limit: without one, all 10,000 codes can be tried
    // within the 5-minute wait. After MAX_OTP_ATTEMPTS wrong codes the stop is locked; boarding then
    // needs the employee's live QR (same OTP inside) or an ops override, and ops is alerted.
    const attemptsKey = `corporate:stop:otp-attempts:${stopId}`;
    const priorFailures = await this.otpFailures(attemptsKey);
    if (priorFailures >= this.MAX_OTP_ATTEMPTS) {
      throw new HttpException(
        'Too many wrong boarding OTP attempts for this stop. Contact operations to unlock it, then enter the code the employee shows you.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Validate 4-digit OTP match
    const cleanInputOtp = dto.otpCode ? dto.otpCode.trim() : '';
    if (cleanInputOtp !== stop.boardingOtp) {
      const failures = await this.recordOtpFailure(attemptsKey);
      if (failures >= this.MAX_OTP_ATTEMPTS) {
        this.logger.warn(`Boarding OTP locked for stop ${stopId} on route ${routeId} after ${failures} wrong attempts`);
        this.notifications.emitEvent('admin:operations', 'CORPORATE_BOARDING_OTP_LOCKED', {
          routeId,
          stopId,
          driverId: stop.route?.driverId,
          attempts: failures,
        });
        await this.audit.log({
          action: 'CORPORATE_BOARDING_OTP_LOCKED',
          entityType: 'CORPORATE_ROUTE_STOP',
          entityId: stopId,
          metadata: { routeId, attempts: failures, driverId: stop.route?.driverId },
        });
      }
      throw new BadRequestException(
        `Invalid boarding OTP. Please check with employee. (${Math.max(0, this.MAX_OTP_ATTEMPTS - failures)} attempts left)`,
      );
    }
    await this.clearOtpFailures(attemptsKey);

    const departureTime = new Date();

    // Update stop to BOARDED
    await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: {
        status: 'BOARDED',
        actualDepartureTime: departureTime,
      },
    });
    await this.invalidateRoutePlan(routeId);

    // Update associated transport request to COMPLETED/BOARDED
    if (stop.transportRequestId) {
      await this.db.corporateTransportRequest.update({
        where: { id: stop.transportRequestId },
        data: { status: 'COMPLETED' },
      });
    }

    // Clear wait timer from Redis
    const client = this.redis.getClient();
    if (client) {
      await client.del(`corporate:stop:timer:${stopId}`);
    }

    this.logger.log(`Stop ${stopId} verified and BOARDED with OTP. Vehicle departing.`);
    await this.tripEvents?.record({ tenantId: stop.route.tenantId, routeId, stopId, type: 'PASSENGER_BOARDED', actorId: stop.route.driverId, actorRole: 'DRIVER', payload: { stopSequence: stop.stopSequence, employeeId: stop.employeeId }, at: departureTime });

    // Realtime events
    this.notifications.emitEvent(`driver:${stop.route.driverId}`, 'PASSENGER_BOARDED', {
      routeId,
      stopId,
      stopSequence: stop.stopSequence,
      departureTime,
    });
    this.notifications.emitEvent(`corporate:${stop.route.tenantId}`, 'ROUTE_STOP_BOARDED', {
      routeId,
      stopId,
      stopSequence: stop.stopSequence,
      status: 'BOARDED',
      occurredAt: departureTime,
    });

    if (stop.employeeId) {
      const waitedSeconds = stop.actualArrivalTime
        ? Math.max(
            0,
            Math.floor((departureTime.getTime() - new Date(stop.actualArrivalTime).getTime()) / 1000),
          )
        : 0;
      await this.riderNotifier.notifyBoarded({
        routeId,
        tenantId: stop.route.tenantId,
        employeeId: stop.employeeId,
        stopId,
        stopSequence: stop.stopSequence,
        payload: { departureTime, waitedSeconds },
      });
    }

    await this.notifyNextPickupApproaching(routeId, stop.route.tenantId, stop.stopSequence);

    return {
      stopId,
      routeId,
      stopSequence: stop.stopSequence,
      stopType: stop.stopType,
      status: 'BOARDED',
      actualArrivalTime: stop.actualArrivalTime || undefined,
      actualDepartureTime: departureTime,
      countdownRemainingSeconds: 0,
      message: 'Boarding verified successfully. Proceed to next stop.',
    };
  }

  /**
   * Driver marks Employee as NO_SHOW after the 5-minute wait window has elapsed.
   * Instructs the driver to depart immediately to safeguard schedule for remaining passengers.
   */
  public async markNoShow(
    routeId: string,
    stopId: string,
    dto: MarkNoShowDto,
  ): Promise<StopExecutionResult> {
    const stop = await this.db.corporateRouteStop.findUnique({
      where: { id: stopId },
      include: { route: true, employee: true },
    });

    if (!stop || stop.routeId !== routeId) {
      throw new NotFoundException(`Stop ${stopId} not found on route ${routeId}`);
    }

    if (stop.status !== 'ARRIVED') {
      throw new BadRequestException(
        `Cannot mark No-Show: Stop must be in ARRIVED status (current: ${stop.status})`,
      );
    }

    // Check dwell timer duration (must be >= 300s since arrival)
    const arrivalTime = stop.actualArrivalTime ? new Date(stop.actualArrivalTime).getTime() : 0;
    const elapsedSeconds = Math.floor((Date.now() - arrivalTime) / 1000);

    if (elapsedSeconds < this.STOP_WAIT_BUFFER_SECONDS) {
      const remainingSeconds = this.STOP_WAIT_BUFFER_SECONDS - elapsedSeconds;
      throw new BadRequestException(
        `Cannot mark No-Show before 5-minute wait window has elapsed. ${remainingSeconds} seconds remaining.`,
      );
    }

    const departureTime = new Date();
    const reasonText =
      dto.reason || '5-minute boarding window expired; employee did not report to cab';

    // Update stop to NO_SHOW
    await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: {
        status: 'NO_SHOW',
        actualDepartureTime: departureTime,
        noShowReason: reasonText,
      },
    });
    await this.invalidateRoutePlan(routeId);

    // Mark transport request as UNSERVED
    if (stop.transportRequestId) {
      await this.db.corporateTransportRequest.update({
        where: { id: stop.transportRequestId },
        data: { status: 'UNSERVED' },
      });
    }

    // Clear Redis timer
    const client = this.redis.getClient();
    if (client) {
      await client.del(`corporate:stop:timer:${stopId}`);
    }

    this.logger.warn(`Stop ${stopId} marked as NO_SHOW. Driver departing immediately to next stop.`);
    await this.tripEvents?.record({ tenantId: stop.route.tenantId, routeId, stopId, type: 'PASSENGER_NO_SHOW', actorId: stop.route.driverId, actorRole: 'DRIVER', payload: { stopSequence: stop.stopSequence, employeeId: stop.employeeId, waitedSeconds: elapsedSeconds, reason: reasonText }, at: departureTime });

    // Realtime alerts to Driver, Corporate Portal & Employee
    this.notifications.emitEvent(`driver:${stop.route.driverId}`, 'STOP_MARKED_NO_SHOW', {
      routeId,
      stopId,
      stopSequence: stop.stopSequence,
      departureTime,
      message: 'No-Show recorded. Depart immediately to next stop.',
    });
    this.notifications.emitEvent(`corporate:${stop.route.tenantId}`, 'ROUTE_STOP_NO_SHOW', {
      routeId,
      stopId,
      stopSequence: stop.stopSequence,
      status: 'NO_SHOW',
      occurredAt: departureTime,
    });

    // Employee (websocket + push with reason) and corporate dashboard ATTENDANCE_NO_SHOW
    if (stop.employeeId) {
      await this.riderNotifier.notifyNoShow({
        routeId,
        tenantId: stop.route.tenantId,
        employeeId: stop.employeeId,
        stopId,
        stopSequence: stop.stopSequence,
        payload: {
          reason: reasonText,
          recordedAt: departureTime,
          waitedSeconds: elapsedSeconds,
          employeeName: stop.employee?.fullName,
          employeeCode: stop.employee?.employeeCode,
        },
      });
    }

    await this.notifyNextPickupApproaching(routeId, stop.route.tenantId, stop.stopSequence);

    await this.audit.log({
      action: 'CORPORATE_STOP_NO_SHOW',
      actorRole: 'DRIVER',
      entityId: stopId,
      entityType: 'CORPORATE_ROUTE_STOP',
      metadata: {
        routeId,
        employeeId: stop.employeeId,
        elapsedSeconds,
        reason: reasonText,
      },
    });

    return {
      stopId,
      routeId,
      stopSequence: stop.stopSequence,
      stopType: stop.stopType,
      status: 'NO_SHOW',
      actualArrivalTime: stop.actualArrivalTime || undefined,
      actualDepartureTime: departureTime,
      countdownRemainingSeconds: 0,
      message: 'Employee marked as No-Show. Driver instructed to depart immediately.',
    };
  }

  /**
   * Completes a route when vehicle reaches the final corporate destination.
   */
  public async completeRoute(routeId: string): Promise<any> {
    const route = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: { orderBy: { stopSequence: 'asc' } },
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }

    // Verify all stops have departed or arrived and drops are confirmed
    const pendingStops = route.stops.filter((s) => s.status === 'PENDING');
    if (pendingStops.length > 0) {
      throw new BadRequestException(
        `Cannot complete route: ${pendingStops.length} stops remain unvisited`,
      );
    }
    const unconfirmedDrops = route.stops.filter((s) => s.stopType === 'DROPOFF' && !s.actualDepartureTime);
    if (unconfirmedDrops.length > 0) {
      throw new BadRequestException(
        `Cannot complete route: ${unconfirmedDrops.length} drop-off stops have not confirmed passenger drop.`,
      );
    }

    const updated = await this.db.corporateRoute.update({
      where: { id: routeId },
      data: { status: 'COMPLETED' },
    });
    await this.invalidateRoutePlan(routeId);

    const completedAt = new Date();
    await this.tripEvents?.record({ tenantId: route.tenantId, routeId, type: 'ROUTE_COMPLETED', actorId: route.driverId, actorRole: 'DRIVER', payload: { onBoard: route.stops.filter((s) => s.status === 'BOARDED').length }, at: completedAt });
    this.notifications.emitEvent(`corporate:${route.tenantId}`, 'ROUTE_COMPLETED', {
      routeId,
      completedAt,
    });

    // Everyone still on board is dropped at the destination
    const onBoard = route.stops.filter((s) => s.status === 'BOARDED' && s.employeeId);
    await Promise.all(
      onBoard.map((s) =>
        this.riderNotifier.notifyDropped({
          routeId,
          tenantId: route.tenantId,
          employeeId: s.employeeId as string,
          stopId: s.id,
          stopSequence: s.stopSequence,
          payload: { droppedAt: completedAt },
        }),
      ),
    );

    return updated;
  }

  /**
   * Employee cancel / shift-reschedule with the 9-hour cutoff, followed by automatic route re-planning.
   *
   * Cutoff: allowed until exactly 9h before the employee's pickup (planned stop ETA for LOGIN,
   * office departure for LOGOUT, shift wall-clock if not yet routed), evaluated in Asia/Kolkata.
   * e.g. 07:00 IST pickup -> last allowed modification 22:00 IST the previous evening.
   * `options.override` (admin/company only, never taken from the employee request body) bypasses it.
   *
   * Re-planning (CorporateReplanningService): stop removed from the old route (PLANNED routes are
   * re-sequenced/re-timed, emptied routes cancelled, under-filled routes merged; dispatched routes
   * get the stop cancelled in place + driver notified) and, on reschedule, the employee is inserted
   * into a PLANNED route of the new shift with spare capacity, else a new route.
   */
  public async handleRescheduleOrCancel(
    requestId: string,
    dto: RescheduleRequestDto,
    options: { override?: CutoffOverride | null; now?: Date } = {},
  ): Promise<any> {
    const now = options.now ?? new Date();
    const override = options.override ?? null;
    if (override && (!override.actorUserId || !override.reason)) {
      throw new BadRequestException('Cutoff override requires actorUserId and reason');
    }

    const req: any = await this.db.corporateTransportRequest.findUnique({
      where: { id: requestId },
      include: { employee: true, routeStop: { include: { route: true } } },
    });

    if (!req) {
      throw new NotFoundException(`Transport request ${requestId} not found`);
    }

    if (dto.employeeId && req.employeeId !== dto.employeeId) {
      throw new BadRequestException('Unauthorized: Request does not belong to this employee');
    }
    if (!dto.employeeId && !override) {
      throw new BadRequestException('employeeId is required');
    }
    if (dto.action !== 'CANCEL' && dto.action !== 'RESCHEDULE') {
      throw new BadRequestException(`Unsupported action ${String(dto.action)}`);
    }
    if (dto.action === 'RESCHEDULE') {
      if (!dto.newShiftTime && !dto.newShiftDate) {
        throw new BadRequestException('newShiftTime and/or newShiftDate is required for shift rescheduling');
      }
      if (dto.newShiftDate !== undefined && !isValidShiftDate(dto.newShiftDate)) {
        throw new BadRequestException(`newShiftDate must be YYYY-MM-DD (got ${dto.newShiftDate})`);
      }
      // Date-only reschedule keeps the current shift time.
      dto = { ...dto, newShiftTime: dto.newShiftTime ?? req.shiftTime };
      if (!isValidShiftTime(dto.newShiftTime)) {
        throw new BadRequestException(`newShiftTime must be HH:mm (got ${dto.newShiftTime})`);
      }
    }

    // Idempotent double submit: already in the requested end-state -> no-op success (even past cutoff).
    const alreadyApplied =
      (dto.action === 'CANCEL' && req.status === 'CANCELLED') ||
      (dto.action === 'RESCHEDULE' &&
        req.shiftTime === dto.newShiftTime &&
        (!dto.newShiftDate || dto.newShiftDate === toDateOnly(req.scheduledDate)) &&
        !['CANCELLED', 'COMPLETED', 'IN_PROGRESS', 'UNSERVED'].includes(req.status));
    if (alreadyApplied) {
      const { employee: _e, routeStop: _s, ...rest } = req;
      return { ...rest, replan: { requestId, action: dto.action, idempotent: true, merges: [] } };
    }

    if (req.status === 'CANCELLED' || req.status === 'COMPLETED') {
      throw new BadRequestException(`Request is already in terminal state ${req.status}`);
    }

    const { pickupAt, source } = resolvePickupTime(req);
    const cutoffHours = await resolveCancelCutoffHours(this.db as any, req.tenantId, now);
    const cutoff = evaluateCutoff(pickupAt, source, now, override, cutoffHours);
    if (!cutoff.allowed) {
      throw new BadRequestException(
        `Modification locked: Rescheduling and cancellations must be submitted at least ${cutoffHours} hours prior to scheduled shift pickup ` +
          `(pickup ${formatIst(pickupAt)}, cutoff ${formatIst(cutoff.cutoffAt)}; only ${cutoff.hoursUntilPickup.toFixed(1)}h remaining).`,
      );
    }
    if (cutoff.overridden) {
      this.logger.warn(
        `Request ${requestId}: 9h cutoff overridden by ${override!.actorUserId} (${override!.reason})`,
      );
      await this.audit.log({
        userId: override!.actorUserId,
        actorRole: 'CORPORATE_ADMIN',
        action: 'CORPORATE_CUTOFF_OVERRIDDEN',
        entityType: 'CORPORATE_TRANSPORT_REQUEST',
        entityId: requestId,
        metadata: { action: dto.action, reason: override!.reason, pickupAt, cutoffAt: cutoff.cutoffAt },
      });
    }

    if (this.replanning) {
      const ctx = { now, override, cutoff, newShiftDate: dto.newShiftDate };
      const result =
        dto.action === 'CANCEL'
          ? await this.replanning.cancelRequest(requestId, ctx)
          : await this.replanning.rescheduleRequest(requestId, dto.newShiftTime as string, ctx);
      return { ...result.request, replan: result };
    }

    // Legacy fallback (replanning service not wired, e.g. narrow unit-test modules): status-only update.
    this.logger.warn(`CorporateReplanningService unavailable; request ${requestId} updated without route re-planning`);
    if (dto.action === 'CANCEL') {
      const updated = await this.db.corporateTransportRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      });
      await this.db.corporateRouteStop.updateMany({
        where: { transportRequestId: requestId },
        data: { status: 'CANCELLED' },
      });
      return updated;
    }
    return this.db.corporateTransportRequest.update({
      where: { id: requestId },
      data: {
        shiftTime: dto.newShiftTime,
        ...(dto.newShiftDate ? { scheduledDate: new Date(`${dto.newShiftDate}T00:00:00.000Z`) } : {}),
        status: 'RESCHEDULED',
      },
    });
  }

  /**
   * Generates a signed, dynamic QR boarding token (5-minute TTL) for employee mobile app.
   */
  public async generateBoardingQrToken(
    routeId: string,
    stopId: string,
  ): Promise<BoardingQrTokenResult> {
    const stop = await this.db.corporateRouteStop.findUnique({
      where: { id: stopId },
      include: { route: true },
    });

    if (!stop || stop.routeId !== routeId) {
      throw new NotFoundException(`Stop ${stopId} not found on route ${routeId}`);
    }

    const expiresAt = new Date(Date.now() + this.STOP_WAIT_BUFFER_SECONDS * 1000);
    const payloadObj = {
      stopId,
      routeId,
      employeeId: stop.employeeId,
      otp: stop.boardingOtp,
      expiresAtMs: expiresAt.getTime(),
    };

    const qrPayload = Buffer.from(JSON.stringify(payloadObj)).toString('base64');

    const client = this.redis.getClient();
    if (client) {
      await client.set(
        `corporate:stop:qr:${stopId}`,
        qrPayload,
        'EX',
        this.STOP_WAIT_BUFFER_SECONDS,
      );
    }

    return {
      stopId,
      routeId,
      employeeId: stop.employeeId || undefined,
      qrPayload,
      expiresAt,
    };
  }

  /**
   * Driver verifies passenger via camera QR code scan.
   * Decodes dynamic QR token, checks freshness, verifies geofence, and marks stop BOARDED.
   */
  public async verifyBoardingQr(
    routeId: string,
    stopId: string,
    dto: VerifyStopQrDto,
  ): Promise<StopExecutionResult> {
    const stop = await this.db.corporateRouteStop.findUnique({
      where: { id: stopId },
      include: { route: true },
    });

    if (!stop || stop.routeId !== routeId) {
      throw new NotFoundException(`Stop ${stopId} not found on route ${routeId}`);
    }

    // Geofence check
    const distMeters = this.haversineDistanceMeters(
      dto.driverLatitude,
      dto.driverLongitude,
      Number(stop.latitude),
      Number(stop.longitude),
    );

    if (distMeters > this.GEOFENCE_RADIUS_METERS) {
      throw new BadRequestException(
        `QR verification outside geofence: Driver is ${Math.round(distMeters)}m away (max allowed: ${this.GEOFENCE_RADIUS_METERS}m)`,
      );
    }

    // Decode and validate QR token
    let payload: any;
    try {
      const decodedJson = Buffer.from(dto.qrPayload, 'base64').toString('utf-8');
      payload = JSON.parse(decodedJson);
    } catch {
      throw new BadRequestException('Malformed QR code token');
    }

    if (payload.stopId !== stopId || payload.routeId !== routeId) {
      throw new BadRequestException('QR code does not match this route or stop');
    }

    if (Date.now() > payload.expiresAtMs) {
      throw new BadRequestException('Boarding QR code has expired. Please refresh the QR code.');
    }

    // Delegate to standard boarding OTP verification
    return this.verifyBoardingOtp(routeId, stopId, { otpCode: payload.otp });
  }

  /**
   * Fast Redis cache for route plan + stops on the GPS telemetry hot path.
   * Eliminates Postgres read on every ping (60s TTL + invalidated on stop transitions).
   */
  private async getCachedRoutePlan(routeId: string): Promise<any | null> {
    const key = `corporate:route:plan:${routeId}`;
    try {
      if (typeof (this.redis as any)?.get === 'function') {
        const val = await (this.redis as any).get(key);
        return val ? JSON.parse(val) : null;
      }
      const client = this.redis?.getClient?.();
      if (client?.get) {
        const val = await client.get(key);
        return val ? JSON.parse(val) : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  private async setCachedRoutePlan(routeId: string, route: any, ttlSeconds = 60): Promise<void> {
    const key = `corporate:route:plan:${routeId}`;
    try {
      const serialized = JSON.stringify(route);
      if (typeof (this.redis as any)?.set === 'function') {
        await (this.redis as any).set(key, serialized, ttlSeconds);
        return;
      }
      const client = this.redis?.getClient?.();
      if (client?.set) {
        await client.set(key, serialized, 'EX', ttlSeconds);
      }
    } catch {
      // ignore cache write failures
    }
  }

  public async invalidateRoutePlan(routeId: string): Promise<void> {
    const key = `corporate:route:plan:${routeId}`;
    try {
      if (typeof (this.redis as any)?.del === 'function') {
        await (this.redis as any).del(key);
        return;
      }
      const client = this.redis?.getClient?.();
      if (client?.del) {
        await client.del(key);
      }
    } catch {
      // ignore
    }
  }

  /**
   * Ingests real-time GPS telemetry from driver mobile app during route transit.
   * Caches live position, dynamically updates ETA to upcoming stops, and broadcasts to Corporate Live Map.
   */
  public async ingestRouteTelemetry(
    routeId: string,
    dto: RouteTelemetryDto,
  ): Promise<{
    routeId: string;
    latitude: number;
    longitude: number;
    nextStopSequence?: number;
    distToNextStopMeters?: number;
    etaMinutes?: number;
    recordedAt: Date;
  }> {
    let route = await this.getCachedRoutePlan(routeId);
    if (!route) {
      route = await this.db.corporateRoute.findUnique({
        where: { id: routeId },
        include: {
          stops: { orderBy: { stopSequence: 'asc' } },
          office: true,
        },
      });

      if (!route) {
        throw new NotFoundException(`Corporate route ${routeId} not found`);
      }
      await this.setCachedRoutePlan(routeId, route, 60);
    }

    // WS-B: latest-position cache (never moved backwards by out-of-order fixes) + Redis Stream
    // `corporate:gps:stream` for the batched Postgres history writer (CorporateTelemetryWriter).
    const fix = await this.gpsIngest.ingest(route, dto);
    const recordedAt = fix.recordedAt;

    // Find next upcoming stop
    const nextStop = route.stops?.find((s: any) => s.status === 'PENDING' || s.status === 'ARRIVED');

    let distToNextStopMeters: number | undefined;
    let etaMinutes: number | undefined;

    if (nextStop) {
      distToNextStopMeters = Math.round(
        this.haversineDistanceMeters(
          dto.latitude,
          dto.longitude,
          Number(nextStop.latitude),
          Number(nextStop.longitude),
        ),
      );

      // Estimate ETA assuming average urban speed of 30 km/h (500 m/min)
      const speedMpm = dto.speedMps && dto.speedMps > 1 ? dto.speedMps * 60 : 500;
      etaMinutes = Math.max(1, Math.round(distToNextStopMeters / speedMpm));
    }

    // Emit live WebSocket telemetry (an older, out-of-order or duplicate fix is history only)
    if (!fix.outOfOrder && !fix.duplicate) this.notifications.emitEvent(`route:${routeId}`, 'CORPORATE_ROUTE_TELEMETRY', {
      routeId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speedMps: dto.speedMps || 0,
      headingDeg: dto.headingDeg || 0,
      nextStopSequence: nextStop?.stopSequence,
      distToNextStopMeters,
      etaMinutes,
      recordedAt,
    });

    // P1 In-Transit Safety Sentinel (Overspeeding & Corridor Deviation)
    if (this.safety) {
      this.safety
        .evaluateTelemetrySafety(routeId, {
          latitude: dto.latitude,
          longitude: dto.longitude,
          speedMps: dto.speedMps,
        })
        .catch((err: any) => this.logger.warn(`Safety sentinel evaluation error: ${err.message}`));
    }

    return {
      routeId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      nextStopSequence: nextStop?.stopSequence,
      distToNextStopMeters,
      etaMinutes,
      recordedAt,
    };
  }

  /**
   * Returns ordered navigation waypoints for driver GPS navigation and live map tracking.
   */
  public async getRouteWaypoints(routeId: string): Promise<RouteWaypointsResult> {
    const route = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: {
          orderBy: { stopSequence: 'asc' },
          include: {
            employee: {
              include: {
                locations: { where: { isDefault: true }, take: 1 },
              },
            },
          },
        },
        office: true,
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }

    return {
      routeId: route.id,
      direction: route.direction,
      status: route.status,
      stops: route.stops.map((s) => ({
        stopId: s.id,
        stopSequence: s.stopSequence,
        stopType: s.stopType,
        status: s.status,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        addressText:
          s.employee?.locations?.[0]?.addressText ||
          (s.stopType === 'DROPOFF' ? route.office.addressText : 'Commuter Pickup Point'),
        employeeName: s.employee?.fullName,
        plannedEta: s.plannedEta,
      })),
      officeHub: {
        id: route.office.id,
        name: route.office.name,
        latitude: Number(route.office.latitude),
        longitude: Number(route.office.longitude),
        addressText: route.office.addressText,
      },
    };
  }

  /**
   * Returns active corporate route assigned to the driver, including ordered stops, passengers, dwell timers, and route status (PRD 04 §3.5)
   */
  public async getDriverActiveRoute(driverUserId: string): Promise<any> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }
    // A driver commonly holds several duties (e.g. a LOGIN and a LOGOUT route the same day).
    // The active one is the route already IN_TRANSIT, else the next ASSIGNED route by pickup-1 time;
    // an unordered findFirst could return tonight's route during this morning's trip.
    const include = {
      office: true,
      vehicle: true,
      stops: {
        include: {
          employee: true,
        },
        orderBy: { stopSequence: 'asc' },
      },
    };
    const route =
      (await (this.db.corporateRoute as any).findFirst({
        where: { driverId: driver.id, status: 'IN_TRANSIT' },
        include,
        orderBy: { targetPickup1Time: 'asc' },
      })) ??
      (await (this.db.corporateRoute as any).findFirst({
        where: { driverId: driver.id, status: 'ASSIGNED' },
        include,
        orderBy: { targetPickup1Time: 'asc' },
      }));
    if (!route) {
      return { hasActiveRoute: false, message: 'No active corporate route assigned at this time.' };
    }
    return {
      hasActiveRoute: true,
      routeId: route.id,
      routeNumber: `CR-${route.id.slice(0, 8).toUpperCase()}`,
      direction: route.direction,
      status: route.status,
      shiftDate: route.shiftDate,
      shiftTime: route.shiftTime,
      vehicleCategory: route.vehicleCategory,
      maxCapacity: route.maxCapacity,
      assignedPassengerCount: route.assignedPassengerCount,
      targetPickup1Time: route.targetPickup1Time,
      targetOfficeArrivalTime: route.targetOfficeArrivalTime,
      office: {
        id: route.office.id,
        name: route.office.name,
        addressText: route.office.addressText,
        latitude: Number(route.office.latitude),
        longitude: Number(route.office.longitude),
      },
      stops: (route.stops || []).map((s: any) => ({
        stopId: s.id,
        stopSequence: s.stopSequence,
        status: s.stopType === 'DROPOFF' && s.actualDepartureTime ? 'DROPPED' : s.status,
        stopType: s.stopType,
        plannedEta: s.plannedEta,
        actualArrivalTime: s.actualArrivalTime,
        actualDepartureTime: s.actualDepartureTime,
        dwellBufferSeconds: s.dwellBufferSeconds,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
        passenger: s.employee
          ? {
              employeeId: s.employee.id,
              name: s.employee.fullName,
              phone: s.employee.phone,
              gender: s.employee.gender,
            }
          : null,
      })),
    };
  }

  /**
   * Returns list of all corporate routes assigned to the driver
   */
  public async getDriverCorporateTrips(driverUserId: string, status?: string): Promise<any[]> {
    const driver = await this.db.driver.findUnique({ where: { userId: driverUserId } });
    if (!driver) {
      return [];
    }
    const statusFilter = status ? { status: status as any } : {};
    const routes = await (this.db.corporateRoute as any).findMany({
      where: {
        driverId: driver.id,
        ...statusFilter,
      },
      include: {
        office: true,
        vehicle: true,
        stops: {
          include: {
            employee: true,
          },
          orderBy: { stopSequence: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return (routes || []).map((r: any) => ({
      id: r.id,
      routeId: r.id,
      routeNumber: `CR-${r.id.slice(0, 8).toUpperCase()}`,
      status: r.status,
      direction: r.direction,
      shiftDate: r.shiftDate,
      shiftTime: r.shiftTime,
      passengerCount: r.assignedPassengerCount,
      vehicleType: r.vehicleCategory,
      vehicleRegistration: r.vehicle?.registrationNumber,
      office: r.office.name,
      pickupArea: r.stops[0]?.employee?.fullName ? `Stop 1: ${r.stops[0].employee.fullName}` : 'Pickup Points',
      stopsCount: r.stops.length,
      stops: r.stops.map((s: any) => ({
        id: s.id,
        sequence: s.stopSequence,
        status: s.status,
        passengerName: s.employee?.fullName,
        passengerPhone: s.employee?.phone,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
      })),
      isCorporate: true,
    }));
  }

  /**
   * P0 Checkpoint: Driver marks passenger dropped at destination.
   * Enforces geofence (<150m) and initiates safe reach confirmation protocol.
   */
  public async dropPassenger(
    routeId: string,
    stopId: string,
    driverCoords: { lat: number; lng: number },
    actorUserId?: string,
  ) {
    if (this.safety) {
      return this.safety.recordPassengerDropped(routeId, stopId, driverCoords, actorUserId);
    }

    const stop = await this.db.corporateRouteStop.findUnique({
      where: { id: stopId },
      include: { route: true },
    });
    if (!stop || stop.routeId !== routeId) {
      throw new NotFoundException(`Stop ${stopId} not found on route ${routeId}`);
    }

    const dist = this.haversineDistanceMeters(
      driverCoords.lat,
      driverCoords.lng,
      Number(stop.latitude),
      Number(stop.longitude),
    );
    if (dist > this.GEOFENCE_RADIUS_METERS) {
      throw new BadRequestException(
        `Drop outside geofence: Driver is ${Math.round(dist)}m away (max allowed: ${this.GEOFENCE_RADIUS_METERS}m)`,
      );
    }

    const droppedAt = new Date();
    await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: { actualDepartureTime: droppedAt },
    });
    await this.tripEvents?.record({
      tenantId: stop.route.tenantId,
      routeId,
      stopId,
      type: 'PASSENGER_DROPPED',
      actorId: stop.route.driverId,
      actorRole: 'DRIVER',
      payload: { stopSequence: stop.stopSequence, employeeId: stop.employeeId },
      at: droppedAt,
    });

    return { stopId, routeId, status: 'DROPPED', droppedAt, message: 'Passenger dropped.' };
  }

  /**
   * P0 Checkpoint: Employee or Driver confirms safe arrival into residence / destination.
   */
  public async confirmSafeReach(
    routeId: string,
    stopId: string,
    dto: { confirmedByRole: 'EMPLOYEE' | 'DRIVER' | 'ADMIN'; notes?: string; confirmedSafely?: boolean },
    actorUserId?: string,
  ) {
    if (this.safety) {
      return this.safety.confirmSafeReach(
        routeId,
        stopId,
        {
          stopId,
          routeId,
          confirmedSafely: dto.confirmedSafely ?? true,
          notes: dto.notes,
        },
        actorUserId,
      );
    }

    const confirmedAt = new Date();
    await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: { actualDepartureTime: confirmedAt },
    });
    return { stopId, routeId, status: 'SAFE_CONFIRMED', confirmedAt };
  }

  /**
   * P0 Boarding Fallback: Supervisor manual boarding override when OTP fails.
   */
  public async emergencyBoardingOverride(
    routeId: string,
    stopId: string,
    dto: EmergencyBoardingFallbackDto,
    adminUserId: string,
  ) {
    if (this.safety) {
      return this.safety.emergencyBoardingOverride(routeId, stopId, dto, adminUserId);
    }
    throw new BadRequestException('Safety service not available');
  }

  private haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
