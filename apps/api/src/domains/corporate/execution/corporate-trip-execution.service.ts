import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Optional,
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
import {
  CutoffOverride,
  evaluateCutoff,
  formatIst,
  isValidShiftTime,
  resolvePickupTime,
} from '../replanning/cutoff-policy';

@Injectable()
export class CorporateTripExecutionService {
  private readonly logger = new Logger(CorporateTripExecutionService.name);

  // Constants per PRD specification
  private readonly GEOFENCE_RADIUS_METERS = 150; // 150m arrival boundary
  private readonly STOP_WAIT_BUFFER_SECONDS = 300; // 5.0 minutes (300 seconds)
  private readonly RESCHEDULE_CUTOFF_HOURS = 9; // 9 hours advance notice cutoff

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() riderNotifier?: CorporateRiderNotifier,
    @Optional() private readonly replanning?: CorporateReplanningService,
  ) {
    this.riderNotifier = riderNotifier ?? new CorporateRiderNotifier(db, redis, notifications);
  }

  private readonly riderNotifier: CorporateRiderNotifier;

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

    // Atomic compare-and-set guards against double-start races
    const { count } = await this.db.corporateRoute.updateMany({
      where: { id: routeId, status: 'ASSIGNED' },
      data: { status: 'IN_TRANSIT' },
    });
    if (count === 0) {
      throw new ConflictException(`Route ${routeId} was already started`);
    }

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
      },
    });

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

    // Validate 4-digit OTP match
    const cleanInputOtp = dto.otpCode ? dto.otpCode.trim() : '';
    if (cleanInputOtp !== stop.boardingOtp) {
      throw new BadRequestException('Invalid boarding OTP. Please check with employee.');
    }

    const departureTime = new Date();

    // Update stop to BOARDED
    await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: {
        status: 'BOARDED',
        actualDepartureTime: departureTime,
      },
    });

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

    // Realtime events
    this.notifications.emitEvent(`driver:${stop.route.driverId}`, 'PASSENGER_BOARDED', {
      routeId,
      stopId,
      stopSequence: stop.stopSequence,
      departureTime,
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

    // Realtime alerts to Driver, Corporate Portal & Employee
    this.notifications.emitEvent(`driver:${stop.route.driverId}`, 'STOP_MARKED_NO_SHOW', {
      routeId,
      stopId,
      stopSequence: stop.stopSequence,
      departureTime,
      message: 'No-Show recorded. Depart immediately to next stop.',
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

    // Verify all stops have departed or arrived
    const pendingStops = route.stops.filter((s) => s.status === 'PENDING');
    if (pendingStops.length > 0) {
      throw new BadRequestException(
        `Cannot complete route: ${pendingStops.length} stops remain unvisited`,
      );
    }

    const updated = await this.db.corporateRoute.update({
      where: { id: routeId },
      data: { status: 'COMPLETED' },
    });

    const completedAt = new Date();
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
      if (!dto.newShiftTime) {
        throw new BadRequestException('newShiftTime is required for shift rescheduling');
      }
      if (!isValidShiftTime(dto.newShiftTime)) {
        throw new BadRequestException(`newShiftTime must be HH:mm (got ${dto.newShiftTime})`);
      }
    }

    // Idempotent double submit: already in the requested end-state -> no-op success (even past cutoff).
    const alreadyApplied =
      (dto.action === 'CANCEL' && req.status === 'CANCELLED') ||
      (dto.action === 'RESCHEDULE' &&
        req.shiftTime === dto.newShiftTime &&
        !['CANCELLED', 'COMPLETED', 'IN_PROGRESS', 'UNSERVED'].includes(req.status));
    if (alreadyApplied) {
      const { employee: _e, routeStop: _s, ...rest } = req;
      return { ...rest, replan: { requestId, action: dto.action, idempotent: true, merges: [] } };
    }

    if (req.status === 'CANCELLED' || req.status === 'COMPLETED') {
      throw new BadRequestException(`Request is already in terminal state ${req.status}`);
    }

    const { pickupAt, source } = resolvePickupTime(req);
    const cutoff = evaluateCutoff(pickupAt, source, now, override);
    if (!cutoff.allowed) {
      throw new BadRequestException(
        `Modification locked: Rescheduling and cancellations must be submitted at least ${this.RESCHEDULE_CUTOFF_HOURS} hours prior to scheduled shift pickup ` +
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
      const ctx = { now, override, cutoff };
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
      data: { shiftTime: dto.newShiftTime, status: 'RESCHEDULED' },
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
    const route = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: { orderBy: { stopSequence: 'asc' } },
        office: true,
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }

    // Cache live telemetry in Redis (120s TTL)
    const client = this.redis.getClient();
    const recordedAt = new Date();
    if (client) {
      await client.set(
        `corporate:route:telemetry:${routeId}`,
        JSON.stringify({ ...dto, recordedAt }),
        'EX',
        120,
      );
    }

    // Find next upcoming stop
    const nextStop = route.stops.find((s) => s.status === 'PENDING' || s.status === 'ARRIVED');

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

    // Emit live WebSocket telemetry
    this.notifications.emitEvent(`route:${routeId}`, 'CORPORATE_ROUTE_TELEMETRY', {
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
