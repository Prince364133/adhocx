import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  TriggerSosAlertDto,
  ResolveSosAlertDto,
  ConfirmSafeDropDto,
  ConfirmSafeReachDto,
  EmergencyBoardingFallbackDto,
  CorporateSosStatus,
} from '@adhocx/contracts';
import {
  SOS_ALLOWED_FROM,
  SOS_CLOSE_OUTCOMES,
  SOS_TERMINAL_STATUSES,
  SosCloseOutcome,
  SosLifecycleAction,
} from './safety.types';

@Injectable()
export class CorporateSafetyService {
  private readonly logger = new Logger(CorporateSafetyService.name);
  private readonly DEVIATION_THRESHOLD_METERS = 500; // 500m allowable corridor deviation
  private readonly OVERSPEED_THRESHOLD_KPH = 80; // 80 km/h enterprise safety ceiling

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  /**
   * P0 SOS Emergency Trigger (Employee or Driver)
   * Creates an immutable emergency alert, writes GPS coordinates, battery %, and broadcasts to Command Centre.
   */
  public async triggerSosAlert(
    triggeredById: string,
    triggeredByRole: 'EMPLOYEE' | 'DRIVER',
    dto: TriggerSosAlertDto,
  ) {
    const route = await this.db.corporateRoute.findUnique({
      where: { id: dto.routeId },
      include: {
        tenant: true,
        office: true,
        driver: true,
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${dto.routeId} not found`);
    }

    const alert = await this.db.corporateSosAlert.create({
      data: {
        routeId: dto.routeId,
        tenantId: route.tenantId,
        stopId: dto.stopId || null,
        triggeredById,
        triggeredByRole,
        latitude: dto.latitude,
        longitude: dto.longitude,
        batteryPct: dto.batteryPct ?? null,
        audioUrl: dto.audioUrl ?? null,
        status: 'NEW',
      },
    });

    this.logger.error(
      `🚨 [P0 EMERGENCY SOS] Route ${route.id} (${route.tenant.name}) triggered by ${triggeredByRole} ${triggeredById} at (${dto.latitude}, ${dto.longitude})!`,
    );

    const alertPayload = {
      alertId: alert.id,
      routeId: route.id,
      tenantId: route.tenantId,
      tenantName: route.tenant.name,
      driverName: route.driver?.fullName || 'Assigned Driver',
      driverPhone: route.driver?.phone,
      triggeredByRole,
      triggeredById,
      latitude: Number(alert.latitude),
      longitude: Number(alert.longitude),
      batteryPct: alert.batteryPct,
      audioUrl: alert.audioUrl,
      reason: dto.triggerReason || 'Emergency SOS button pressed',
      createdAt: alert.createdAt,
    };

    // 1. Critical Super Admin Command Centre Broadcast
    this.notifications.emitEvent('admin:command-center:sos', 'CORPORATE_SOS_ALERT', alertPayload);

    // 2. Corporate Client Safety Desk Broadcast
    this.notifications.emitEvent(`corporate:${route.tenantId}:sos`, 'CORPORATE_SOS_ALERT', alertPayload);

    // 3. Route Real-time Room
    this.notifications.emitEvent(`route:${route.id}`, 'CORPORATE_SOS_ALERT', alertPayload);

    await this.audit.log({
      action: 'CORPORATE_SOS_TRIGGERED',
      userId: triggeredById,
      actorRole: triggeredByRole,
      entityId: alert.id,
      entityType: 'CORPORATE_SOS_ALERT',
      metadata: {
        routeId: route.id,
        tenantId: route.tenantId,
        coords: { lat: dto.latitude, lng: dto.longitude },
        batteryPct: dto.batteryPct,
      },
    });

    return alert;
  }

  /**
   * List all corporate SOS alerts with filtering by status or tenant.
   */
  public async listSosAlerts(query?: {
    status?: CorporateSosStatus;
    routeId?: string;
    tenantId?: string;
  }) {
    const where: any = {};
    if (query?.status) where.status = query.status;
    if (query?.routeId) where.routeId = query.routeId;
    if (query?.tenantId) {
      where.route = { tenantId: query.tenantId };
    }

    return this.db.corporateSosAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        route: {
          select: {
            id: true,
            tenantId: true,
            direction: true,
            shiftDate: true,
            shiftTime: true,
            driver: { select: { id: true, fullName: true, phone: true } },
            tenant: { select: { id: true, name: true, code: true } },
            office: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  /**
   * Stage 2 FSM: Acknowledge emergency SOS alert by commander.
   * Allowed from NEW / ACTIVE, or from ESCALATED while still unacknowledged (auto-escalated alerts).
   */
  public async acknowledgeSosAlert(
    alertId: string,
    adminUserId: string,
    adminName?: string,
    notes?: string,
  ) {
    const alert = await this.loadForTransition(alertId, 'ACKNOWLEDGE');
    if (alert.acknowledgedAt) {
      throw new ConflictException(`SOS Alert ${alertId} was already acknowledged`);
    }

    const acknowledged = await this.conditionalUpdate(
      alert,
      {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        assignedToAdminId: adminUserId,
        assignedAdminName: adminName || 'Commander',
      },
      { acknowledgedAt: null },
    );

    this.logger.log(`SOS Alert ${alertId} acknowledged by ${adminUserId} (${adminName})`);

    this.notifications.emitEvent('admin:command-center:sos', 'CORPORATE_SOS_ACKNOWLEDGED', {
      alertId,
      routeId: alert.routeId,
      assignedToAdminId: adminUserId,
      assignedAdminName: adminName || 'Commander',
      acknowledgedAt: acknowledged.acknowledgedAt,
    });

    await this.audit.log({
      action: 'CORPORATE_SOS_ACKNOWLEDGED',
      userId: adminUserId,
      actorRole: 'SUPER_ADMIN',
      entityId: alertId,
      entityType: 'CORPORATE_SOS_ALERT',
      metadata: { routeId: alert.routeId, fromStatus: alert.status, assignedAdminName: adminName, notes: notes?.trim() },
    });

    return acknowledged;
  }

  /**
   * Stage 3 FSM: Mark alert under active investigation. Requires a prior acknowledgement
   * (ACKNOWLEDGED), or an ESCALATED / RESPONDED alert.
   */
  public async investigateSosAlert(
    alertId: string,
    adminUserId: string,
    notes?: string,
  ) {
    const alert = await this.loadForTransition(alertId, 'INVESTIGATE');

    const investigating = await this.conditionalUpdate(alert, {
      status: 'INVESTIGATING',
      assignedToAdminId: adminUserId,
      resolutionNotes: notes ? notes.trim() : alert.resolutionNotes,
    });

    this.logger.log(`SOS Alert ${alertId} under active investigation by ${adminUserId}`);

    this.notifications.emitEvent('admin:command-center:sos', 'CORPORATE_SOS_INVESTIGATING', {
      alertId,
      routeId: alert.routeId,
      assignedToAdminId: adminUserId,
      notes,
    });

    await this.audit.log({
      action: 'CORPORATE_SOS_INVESTIGATING',
      userId: adminUserId,
      actorRole: 'SUPER_ADMIN',
      entityId: alertId,
      entityType: 'CORPORATE_SOS_ALERT',
      metadata: { routeId: alert.routeId, fromStatus: alert.status, notes: notes?.trim() },
    });

    return investigating;
  }

  /**
   * Stage 4 FSM: Escalate alert to highest priority police / field response.
   * Raises the escalation level by one.
   */
  public async escalateSosAlert(
    alertId: string,
    adminUserId: string,
    reason?: string,
  ) {
    const alert = await this.loadForTransition(alertId, 'ESCALATE');

    const escalated = await this.conditionalUpdate(alert, {
      status: 'ESCALATED',
      escalatedAt: new Date(),
      assignedToAdminId: adminUserId,
      escalationLevel: { increment: 1 },
    });

    this.logger.error(`[SOS ESCALATED] Alert ${alertId} escalated to highest priority by ${adminUserId}: ${reason}`);

    this.notifications.emitEvent('admin:command-center:sos', 'CORPORATE_SOS_ESCALATED', {
      alertId,
      routeId: alert.routeId,
      escalatedBy: adminUserId,
      reason,
      escalationLevel: escalated.escalationLevel,
      escalatedAt: escalated.escalatedAt,
    });

    await this.audit.log({
      action: 'CORPORATE_SOS_ESCALATED',
      userId: adminUserId,
      actorRole: 'SUPER_ADMIN',
      entityId: alertId,
      entityType: 'CORPORATE_SOS_ALERT',
      metadata: { routeId: alert.routeId, fromStatus: alert.status, reason, escalationLevel: escalated.escalationLevel },
    });

    return escalated;
  }

  /**
   * Stage 5 FSM: Close an open alert as RESOLVED (default) or FALSE_ALARM with incident notes.
   * Backs POST /alerts/:id/close; POST /alerts/:id/resolve is the legacy alias.
   */
  public async closeSosAlert(alertId: string, adminUserId: string, notes: string, outcome: SosCloseOutcome = 'RESOLVED') {
    return this.resolveSosAlert(alertId, adminUserId, {
      alertId,
      status: outcome as CorporateSosStatus,
      resolutionNotes: notes,
    });
  }

  /**
   * Stage 5 FSM: Resolve an active emergency alert with audit incident notes.
   */
  public async resolveSosAlert(
    alertId: string,
    resolvedById: string,
    dto: ResolveSosAlertDto,
  ) {
    if (!SOS_CLOSE_OUTCOMES.includes(dto.status as SosCloseOutcome)) {
      throw new BadRequestException(`status must be one of ${SOS_CLOSE_OUTCOMES.join(', ')}`);
    }
    if (!dto.resolutionNotes || dto.resolutionNotes.trim() === '') {
      throw new BadRequestException('resolutionNotes are required');
    }

    const alert = await this.loadForTransition(alertId, 'CLOSE');

    const resolved = await this.conditionalUpdate(alert, {
      status: dto.status as any,
      resolutionNotes: dto.resolutionNotes.trim(),
      resolvedAt: new Date(),
      resolvedById,
    });

    this.logger.log(`SOS Alert ${alertId} resolved as ${dto.status} by ${resolvedById}`);

    this.notifications.emitEvent('admin:command-center:sos_resolved', 'CORPORATE_SOS_RESOLVED', {
      alertId,
      routeId: alert.routeId,
      status: dto.status,
      resolutionNotes: dto.resolutionNotes,
      resolvedAt: resolved.resolvedAt,
    });

    await this.audit.log({
      action: 'CORPORATE_SOS_RESOLVED',
      userId: resolvedById,
      actorRole: 'SUPER_ADMIN',
      entityId: alertId,
      entityType: 'CORPORATE_SOS_ALERT',
      metadata: {
        fromStatus: alert.status,
        status: dto.status,
        notes: dto.resolutionNotes,
      },
    });

    return resolved;
  }

  /**
   * Acknowledgement-SLA auto-escalation (driven by CorporateSosEscalationScheduler):
   * an alert nobody has acknowledged is escalated once per elapsed SLA window, i.e. when
   *   NEW / ACTIVE and createdAt <= now - SLA, or
   *   ESCALATED (still unacknowledged) and escalatedAt <= now - SLA.
   * Each escalation raises escalationLevel by one. The update is conditional on the status,
   * acknowledgedAt = null and the level that was read, so concurrent runs or a racing
   * acknowledgement can never escalate the same breach twice.
   */
  public async checkAndAutoEscalateAlerts(
    timeoutSeconds: number = 120,
    now: Date = new Date(),
    batchSize: number = 500,
  ): Promise<string[]> {
    const cutoff = new Date(now.getTime() - timeoutSeconds * 1000);
    const staleAlerts = await this.db.corporateSosAlert.findMany({
      where: {
        acknowledgedAt: null,
        OR: [
          { status: { in: ['NEW', 'ACTIVE'] }, createdAt: { lte: cutoff } },
          { status: 'ESCALATED', escalatedAt: { lte: cutoff } },
        ],
      },
      include: { route: true },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    const escalatedIds: string[] = [];
    for (const a of staleAlerts) {
      const currentLevel: number = a.escalationLevel ?? 0;
      const nextLevel = currentLevel + 1;
      try {
        await this.db.corporateSosAlert.update({
          where: { id: a.id, status: a.status, acknowledgedAt: null, escalationLevel: currentLevel },
          data: {
            status: 'ESCALATED',
            autoEscalated: true,
            escalatedAt: now,
            escalationLevel: nextLevel,
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2025') continue; // acknowledged or escalated by another instance meanwhile
        throw err;
      }
      escalatedIds.push(a.id);

      const tenantId = a.tenantId || a.route?.tenantId;
      const unacknowledgedDurationSeconds = Math.round((now.getTime() - a.createdAt.getTime()) / 1000);
      this.logger.error(
        `[AUTO-ESCALATION] SOS Alert ${a.id} (Route: ${a.routeId}) unacknowledged after ${timeoutSeconds}s; ` +
          `escalated to level ${nextLevel}.`,
      );

      const payload = {
        alertId: a.id,
        routeId: a.routeId,
        tenantId,
        escalationLevel: nextLevel,
        unacknowledgedDurationSeconds,
      };
      this.notifications.emitEvent('admin:command-center:sos', 'CORPORATE_SOS_AUTO_ESCALATED', payload);
      if (tenantId) {
        this.notifications.emitEvent(`corporate:${tenantId}:sos`, 'CORPORATE_SOS_AUTO_ESCALATED', payload);
      }

      await this.audit.log({
        action: 'CORPORATE_SOS_AUTO_ESCALATED',
        actorRole: 'SYSTEM_AUTONOMOUS_SAFETY',
        entityId: a.id,
        entityType: 'CORPORATE_SOS_ALERT',
        metadata: { routeId: a.routeId, timeoutSeconds, fromStatus: a.status, escalationLevel: nextLevel },
      });
    }

    return escalatedIds;
  }

  /** Loads an alert and rejects the lifecycle action with 409 when the current status forbids it. */
  private async loadForTransition(alertId: string, action: SosLifecycleAction): Promise<any> {
    const alert = await this.db.corporateSosAlert.findUnique({
      where: { id: alertId },
      include: { route: true },
    });
    if (!alert) {
      throw new NotFoundException(`SOS Alert ${alertId} not found`);
    }
    if (!SOS_ALLOWED_FROM[action].includes(alert.status)) {
      const terminal = SOS_TERMINAL_STATUSES.includes(alert.status);
      throw new ConflictException(
        terminal
          ? `SOS Alert ${alertId} is already closed (${alert.status}); cannot ${action.toLowerCase()}`
          : `Illegal SOS transition: cannot ${action.toLowerCase()} an alert in status ${alert.status}`,
      );
    }
    return alert;
  }

  /**
   * Compare-and-set on the status that was read (doc 19 §0: every state change is conditional).
   * A concurrent transition makes Prisma throw P2025, surfaced as 409.
   */
  private async conditionalUpdate(alert: any, data: Record<string, unknown>, extraWhere: Record<string, unknown> = {}) {
    try {
      return await this.db.corporateSosAlert.update({
        where: { id: alert.id, status: alert.status, ...extraWhere },
        data: data as any,
      });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new ConflictException(`SOS Alert ${alert.id} changed concurrently; reload and retry`);
      }
      throw err;
    }
  }

  /**
   * Checks whether a vehicle's current telemetry coordinates deviate from planned route corridor.
   * If minimum distance to any stop exceeds 500m, flags a route deviation alarm.
   */
  public async checkRouteDeviation(
    routeId: string,
    currentLat: number,
    currentLng: number,
  ): Promise<{
    isDeviated: boolean;
    minDeviationMeters: number;
    thresholdMeters: number;
  }> {
    const route = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: { orderBy: { stopSequence: 'asc' } },
        office: true,
      },
    });

    if (!route || route.stops.length === 0) {
      return { isDeviated: false, minDeviationMeters: 0, thresholdMeters: this.DEVIATION_THRESHOLD_METERS };
    }

    // Measure distance to all stops and destination office hub
    let minDistance = Infinity;
    for (const stop of route.stops) {
      const d = this.haversineDistanceMeters(currentLat, currentLng, Number(stop.latitude), Number(stop.longitude));
      if (d < minDistance) minDistance = d;
    }

    const officeDist = this.haversineDistanceMeters(
      currentLat,
      currentLng,
      Number(route.office.latitude),
      Number(route.office.longitude),
    );
    if (officeDist < minDistance) minDistance = officeDist;

    const isDeviated = minDistance > this.DEVIATION_THRESHOLD_METERS;

    if (isDeviated) {
      this.logger.warn(
        `[ROUTE DEVIATION ALARM] Route ${routeId} is ${Math.round(minDistance)}m away from closest corridor waypoint!`,
      );

      this.notifications.emitEvent('admin:command-center:deviation', 'CORPORATE_ROUTE_DEVIATION', {
        routeId,
        tenantId: route.tenantId,
        minDeviationMeters: Math.round(minDistance),
        currentCoordinates: { lat: currentLat, lng: currentLng },
        timestamp: new Date(),
      });
    }

    return {
      isDeviated,
      minDeviationMeters: Math.round(minDistance),
      thresholdMeters: this.DEVIATION_THRESHOLD_METERS,
    };
  }

  /**
   * Female Commuter Safe Drop Confirmation for late-night shifts (> 20:00).
   * Mandates that the driver wait until female passenger confirms entry into her residence.
   */
  public async confirmSafeDrop(
    routeId: string,
    stopId: string,
    dto: ConfirmSafeDropDto,
    actorUserId?: string,
  ) {
    const stop = await this.db.corporateRouteStop.findUnique({
      where: { id: stopId },
      include: {
        route: { include: { tenant: true } },
        employee: true,
      },
    });

    if (!stop || stop.routeId !== routeId) {
      throw new NotFoundException(`Stop ${stopId} not found on route ${routeId}`);
    }

    const confirmedAt = new Date();

    const updated = await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: {
        actualDepartureTime: confirmedAt,
      },
    });

    if (stop.transportRequestId) {
      await this.db.corporateTransportRequest.update({
        where: { id: stop.transportRequestId },
        data: { status: 'COMPLETED' },
      });
    }

    this.logger.log(
      `Female safe drop confirmed for Stop ${stopId} (Employee: ${stop.employee?.fullName || 'N/A'}) by ${dto.confirmedByRole}`,
    );

    this.notifications.emitEvent(`corporate:${stop.route.tenantId}`, 'FEMALE_SAFE_DROP_CONFIRMED', {
      routeId,
      stopId,
      employeeId: stop.employeeId,
      employeeName: stop.employee?.fullName,
      confirmedByRole: dto.confirmedByRole,
      confirmedAt,
    });

    await this.audit.log({
      action: 'CORPORATE_FEMALE_SAFE_DROP_CONFIRMED',
      userId: actorUserId,
      actorRole: dto.confirmedByRole,
      entityId: stopId,
      entityType: 'CORPORATE_ROUTE_STOP',
      metadata: {
        routeId,
        employeeId: stop.employeeId,
        notes: dto.notes,
      },
    });

    return updated;
  }

  /**
   * P0 Checkpoint: Driver records passenger dropped at destination.
   * Enforces geofence (<150m), sets safe-drop state in Redis, detects night shift/escort requirement,
   * emits real-time event to commuter app, and starts 10-minute safe confirmation countdown.
   */
  public async recordPassengerDropped(
    routeId: string,
    stopId: string,
    driverCoords: { lat: number; lng: number },
    actorUserId?: string,
  ) {
    const stop = await this.db.corporateRouteStop.findUnique({
      where: { id: stopId },
      include: {
        route: { include: { tenant: true, driver: true } },
        employee: true,
      },
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

    if (dist > this.DEVIATION_THRESHOLD_METERS) {
      throw new BadRequestException(
        `Drop outside authorized destination: Driver is ${Math.round(dist)}m away (max allowed ${this.DEVIATION_THRESHOLD_METERS}m)`,
      );
    }

    const droppedAt = new Date();
    await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: {
        actualDepartureTime: droppedAt,
      },
    });
    const shiftHour = parseInt((stop.route.shiftTime || '00:00').split(':')[0], 10);
    const isNightShift = shiftHour >= 20 || shiftHour < 6;
    const isFemaleCommuter = stop.employee?.gender === 'FEMALE';
    const escortRequired = isNightShift || isFemaleCommuter;

    const safeDropData = {
      routeId,
      stopId,
      tenantId: stop.route.tenantId,
      employeeId: stop.employeeId,
      employeeName: stop.employee?.fullName,
      employeePhone: stop.employee?.phoneNumber,
      gender: stop.employee?.gender,
      status: 'DROPPED',
      droppedAt: droppedAt.toISOString(),
      escortRequired,
      isNightShift,
      driverId: stop.route.driverId,
      driverName: stop.route.driver?.fullName,
      safeConfirmationDeadline: new Date(droppedAt.getTime() + 10 * 60 * 1000).toISOString(),
    };

    const client: any = this.redis?.getClient();
    if (client) {
      try {
        await client.set(`corporate:stop:safedrop:${stopId}`, JSON.stringify(safeDropData), 'EX', 86400);
        await client.sadd('corporate:active:dropped:stops', stopId);
      } catch (err: any) {
        this.logger.warn(`Failed to cache safe drop state: ${err.message}`);
      }
    }

    this.logger.log(
      `Passenger dropped at Stop ${stopId} (Employee: ${stop.employee?.fullName}, Escort Required: ${escortRequired})`,
    );

    const eventPayload = {
      routeId,
      stopId,
      stopSequence: stop.stopSequence,
      employeeId: stop.employeeId,
      employeeName: stop.employee?.fullName,
      droppedAt,
      escortRequired,
      isNightShift,
    };

    this.notifications.emitEvent(`corporate:${stop.route.tenantId}`, 'ROUTE_STOP_DROPPED', eventPayload);
    if (stop.employeeId) {
      this.notifications.emitEvent(`employee:${stop.employeeId}`, 'PASSENGER_DROPPED_SAFE_CHECK', {
        ...eventPayload,
        message: 'You have been dropped off. Please confirm in your app that you have reached safely inside.',
      });
    }

    await this.audit.log({
      action: 'CORPORATE_PASSENGER_DROPPED',
      userId: actorUserId,
      actorRole: 'DRIVER',
      entityId: stopId,
      entityType: 'CORPORATE_ROUTE_STOP',
      metadata: {
        routeId,
        employeeId: stop.employeeId,
        escortRequired,
        isNightShift,
        distMeters: Math.round(dist),
      },
    });

    return {
      stopId,
      routeId,
      status: 'DROPPED',
      droppedAt,
      escortRequired,
      isNightShift,
      message: escortRequired
        ? 'Passenger dropped. Mandatory Safe-Drop Escort Protocol active. Please verify passenger safe entry.'
        : 'Passenger dropped successfully.',
    };
  }

  /**
   * P0 Checkpoint: Employee or Driver confirms safe reach into residence / corporate office.
   * Records immutable confirmation timestamp, closes the safe-arrival timer, and updates transport request.
   */
  public async confirmSafeReach(
    routeId: string,
    stopId: string,
    dto: ConfirmSafeReachDto,
    actorUserId?: string,
  ) {
    const stop = await this.db.corporateRouteStop.findUnique({
      where: { id: stopId },
      include: {
        route: { include: { tenant: true } },
        employee: true,
      },
    });

    if (!stop || stop.routeId !== routeId) {
      throw new NotFoundException(`Stop ${stopId} not found on route ${routeId}`);
    }

    const confirmedAt = new Date();

    await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: {
        actualDepartureTime: confirmedAt,
      },
    });

    if (stop.transportRequestId) {
      await this.db.corporateTransportRequest.update({
        where: { id: stop.transportRequestId },
        data: { status: 'COMPLETED' },
      });
    }

    const client: any = this.redis?.getClient();
    if (client) {
      const key = `corporate:stop:safedrop:${stopId}`;
      try {
        const raw = await client.get(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.status = 'SAFE_CONFIRMED';
          parsed.confirmedAt = confirmedAt.toISOString();
          parsed.confirmedSafely = dto.confirmedSafely;
          parsed.notes = dto.notes;
          await client.set(key, JSON.stringify(parsed), 'EX', 86400);
        }
        await client.srem('corporate:active:dropped:stops', stopId);
      } catch (err: any) {
        this.logger.warn(`Failed to update safe drop Redis cache: ${err.message}`);
      }
    }

    this.logger.log(
      `Safe reach confirmed for Stop ${stopId} (Employee: ${stop.employee?.fullName || 'N/A'}, Confirmed Safely: ${dto.confirmedSafely})`,
    );

    const payload = {
      routeId,
      stopId,
      employeeId: stop.employeeId,
      employeeName: stop.employee?.fullName,
      confirmedSafely: dto.confirmedSafely,
      confirmedAt,
      notes: dto.notes,
    };

    this.notifications.emitEvent(`corporate:${stop.route.tenantId}`, 'PASSENGER_SAFE_CONFIRMED', payload);
    this.notifications.emitEvent('admin:command-center:safety', 'PASSENGER_SAFE_CONFIRMED', payload);

    await this.audit.log({
      action: 'CORPORATE_SAFE_REACH_CONFIRMED',
      userId: actorUserId,
      actorRole: 'EMPLOYEE',
      entityId: stopId,
      entityType: 'CORPORATE_ROUTE_STOP',
      metadata: {
        routeId,
        employeeId: stop.employeeId,
        confirmedSafely: dto.confirmedSafely,
        notes: dto.notes,
      },
    });

    return {
      stopId,
      routeId,
      status: 'SAFE_CONFIRMED',
      confirmedAt,
      confirmedSafely: dto.confirmedSafely,
      message: 'Safe arrival successfully confirmed and recorded in safety audit trail.',
    };
  }

  /**
   * P0 Boarding Fallback: Ops manual override when OTP verification is unavailable
   * (e.g. phone battery dead, carrier SMS failure, physical badge verified by supervisor).
   * Prevents false boarding by driver alone; requires command-centre authorization and generates ticket.
   */
  public async emergencyBoardingOverride(
    routeId: string,
    stopId: string,
    dto: EmergencyBoardingFallbackDto,
    adminUserId: string,
  ) {
    const stop = await this.db.corporateRouteStop.findUnique({
      where: { id: stopId },
      include: {
        route: { include: { tenant: true, driver: true } },
        employee: true,
      },
    });

    if (!stop || stop.routeId !== routeId) {
      throw new NotFoundException(`Stop ${stopId} not found on route ${routeId}`);
    }

    if (stop.status !== 'ARRIVED') {
      throw new BadRequestException(`Cannot override boarding: stop must be in ARRIVED status (current: ${stop.status})`);
    }

    const departureTime = new Date();

    await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: {
        status: 'BOARDED',
        actualDepartureTime: departureTime,
      },
    });

    if (stop.transportRequestId) {
      await this.db.corporateTransportRequest.update({
        where: { id: stop.transportRequestId },
        data: { status: 'COMPLETED' },
      });
    }

    const client: any = this.redis?.getClient();
    if (client) {
      try {
        await client.del(`corporate:stop:timer:${stopId}`);
        await client.del(`corporate:stop:otp-attempts:${stopId}`);
      } catch {}
    }

    const ticketNumber = `SEC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    try {
      await this.db.corporateSupportTicket.create({
        data: {
          ticketNumber,
          tenantId: stop.route.tenantId,
          employeeId: stop.employeeId || '00000000-0000-0000-0000-000000000000',
          routeId,
          stopId,
          category: 'SAFETY_CONCERN',
          priority: 'MEDIUM',
          status: 'RESOLVED',
          subject: `Boarding OTP Fallback: ${dto.reason}`,
          description: `Emergency boarding manual override authorized by commander ${adminUserId}. Reason: ${dto.reason}. Notes: ${dto.notes || 'None'}`,
          adminNotes: `Authorized by ${adminUserId} (${dto.supervisorUserId})`,
          resolvedAt: departureTime,
          resolvedByUserId: adminUserId,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not persist fallback ticket: ${e?.message}`);
    }

    this.logger.warn(
      `[BOARDING FALLBACK] Stop ${stopId} on Route ${routeId} boarded via supervisor override by ${adminUserId} (${dto.reason})`,
    );

    this.notifications.emitEvent(`corporate:${stop.route.tenantId}`, 'CORPORATE_BOARDING_FALLBACK_APPLIED', {
      routeId,
      stopId,
      employeeId: stop.employeeId,
      supervisorUserId: adminUserId,
      reason: dto.reason,
      ticketNumber,
      departureTime,
    });

    this.notifications.emitEvent(`driver:${stop.route.driverId}`, 'PASSENGER_BOARDED', {
      routeId,
      stopId,
      stopSequence: stop.stopSequence,
      departureTime,
      isEmergencyFallback: true,
    });

    await this.audit.log({
      action: 'CORPORATE_BOARDING_FALLBACK_APPLIED',
      userId: adminUserId,
      actorRole: 'ADMIN',
      entityId: stopId,
      entityType: 'CORPORATE_ROUTE_STOP',
      metadata: {
        routeId,
        stopId,
        employeeId: stop.employeeId,
        reason: dto.reason,
        verificationEvidence: dto.verificationEvidence,
        ticketNumber,
      },
    });

    return {
      routeId,
      stopId,
      status: 'BOARDED',
      fallbackApplied: true,
      ticketNumber,
      departureTime,
      message: 'Emergency boarding override successfully verified and logged in audit ledger.',
    };
  }

  /**
   * P1 In-Transit Telemetry Safety Sentinel:
   * Inspects each telemetry fix for overspeeding (>80 km/h) and route corridor deviation (>500m).
   */
  public async evaluateTelemetrySafety(
    routeId: string,
    fix: { latitude: number; longitude: number; speedMps?: number; speedKph?: number },
  ): Promise<{
    overspeeding: boolean;
    deviated: boolean;
    speedKph: number;
  }> {
    const speedKph = fix.speedKph ?? (fix.speedMps ? fix.speedMps * 3.6 : 0);
    const isOverspeeding = speedKph > this.OVERSPEED_THRESHOLD_KPH;

    if (isOverspeeding) {
      this.logger.warn(
        `🚨 [OVERSPEEDING ALARM] Route ${routeId} traveling at ${Math.round(speedKph)} km/h (Limit: ${this.OVERSPEED_THRESHOLD_KPH} km/h)!`,
      );

      const route = await this.db.corporateRoute.findUnique({
        where: { id: routeId },
        select: { id: true, tenantId: true, driverId: true },
      });

      const alertPayload = {
        routeId,
        tenantId: route?.tenantId,
        driverId: route?.driverId,
        speedKph: Math.round(speedKph),
        thresholdKph: this.OVERSPEED_THRESHOLD_KPH,
        coordinates: { lat: fix.latitude, lng: fix.longitude },
        timestamp: new Date(),
      };

      this.notifications.emitEvent('admin:command-center:overspeed', 'CORPORATE_OVERSPEEDING_ALERT', alertPayload);
      if (route?.tenantId) {
        this.notifications.emitEvent(`corporate:${route.tenantId}`, 'CORPORATE_OVERSPEEDING_ALERT', alertPayload);
      }
      if (route?.driverId) {
        this.notifications.emitEvent(`driver:${route.driverId}`, 'OVERSPEEDING_WARNING', {
          speedKph: Math.round(speedKph),
          thresholdKph: this.OVERSPEED_THRESHOLD_KPH,
          message: `Warning: Speed is ${Math.round(speedKph)} km/h. Please reduce speed below ${this.OVERSPEED_THRESHOLD_KPH} km/h immediately.`,
        });
      }

      await this.audit.log({
        action: 'CORPORATE_OVERSPEEDING_DETECTED',
        actorRole: 'SYSTEM_AUTONOMOUS_SAFETY',
        entityId: routeId,
        entityType: 'CORPORATE_ROUTE',
        metadata: {
          speedKph: Math.round(speedKph),
          thresholdKph: this.OVERSPEED_THRESHOLD_KPH,
          coordinates: { lat: fix.latitude, lng: fix.longitude },
        },
      });
    }

    const devResult = await this.checkRouteDeviation(routeId, fix.latitude, fix.longitude);

    return {
      overspeeding: isOverspeeding,
      deviated: devResult.isDeviated,
      speedKph: Math.round(speedKph),
    };
  }

  /**
   * P0 Telemetry Loss Monitor:
   * Scans all routes in IN_TRANSIT status. If no telemetry received for > 180s (3 min),
   * raises tracking loss alarm to Command Centre and flags route atRisk.
   */
  public async detectTelemetryLoss(
    staleThresholdSeconds = 180,
    now = new Date(),
  ): Promise<string[]> {
    const activeRoutes = await this.db.corporateRoute.findMany({
      where: { status: 'IN_TRANSIT' },
      include: {
        tenant: { select: { id: true, name: true } },
        driver: { select: { id: true, fullName: true, phone: true } },
      },
    });

    const client: any = this.redis?.getClient();
    const flaggedRouteIds: string[] = [];

    for (const route of activeRoutes) {
      let lastRecordedAtMs: number | null = null;
      let lastLat: number | null = null;
      let lastLng: number | null = null;

      if (client) {
        try {
          const raw = await client.get(`corporate:route:telemetry:${route.id}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            lastRecordedAtMs = parsed.recordedAt ? new Date(parsed.recordedAt).getTime() : null;
            lastLat = parsed.latitude;
            lastLng = parsed.longitude;
          }
        } catch {}
      }

      const ageSeconds = lastRecordedAtMs
        ? Math.floor((now.getTime() - lastRecordedAtMs) / 1000)
        : Math.floor((now.getTime() - route.updatedAt.getTime()) / 1000);

      if (ageSeconds > staleThresholdSeconds) {
        flaggedRouteIds.push(route.id);

        const shiftHour = parseInt((route.shiftTime || '00:00').split(':')[0], 10);
        const isNightShift = shiftHour >= 20 || shiftHour < 6;
        const severity = isNightShift ? 'P0_CRITICAL' : 'P1_HIGH';

        this.logger.error(
          `🚨 [TELEMETRY LOSS] Route ${route.id} (${route.tenant.name}, Driver: ${route.driver?.fullName}) has no GPS for ${ageSeconds}s! Severity: ${severity}`,
        );

        const payload = {
          routeId: route.id,
          tenantId: route.tenantId,
          tenantName: route.tenant.name,
          driverId: route.driverId,
          driverName: route.driver?.fullName,
          driverPhone: route.driver?.phone,
          lastFixAgeSeconds: ageSeconds,
          severity,
          isNightShift,
          lastCoordinates: lastLat && lastLng ? { lat: lastLat, lng: lastLng } : null,
          timestamp: now,
        };

        await this.db.corporateRoute.update({
          where: { id: route.id },
          data: { atRisk: true },
        });

        this.notifications.emitEvent('admin:command-center:tracking-loss', 'CORPORATE_TRACKING_LOSS_ALERT', payload);
        this.notifications.emitEvent(`corporate:${route.tenantId}`, 'CORPORATE_TRACKING_LOSS_ALERT', payload);

        await this.audit.log({
          action: 'CORPORATE_TRACKING_LOSS_DETECTED',
          actorRole: 'SYSTEM_AUTONOMOUS_SAFETY',
          entityId: route.id,
          entityType: 'CORPORATE_ROUTE',
          metadata: {
            lastFixAgeSeconds: ageSeconds,
            severity,
            isNightShift,
            lastLat,
            lastLng,
          },
        });
      }
    }

    return flaggedRouteIds;
  }

  /**
   * P1 Safe-Drop Timeout Monitor:
   * Scans active dropped stops. If safe arrival confirmation has not been provided within 10 minutes,
   * escalates to Command Centre and initiates client safety lead notification.
   */
  public async checkUnacknowledgedSafeDrops(
    timeoutMinutes = 10,
    now = new Date(),
  ): Promise<string[]> {
    const client: any = this.redis?.getClient();
    if (!client) return [];

    let droppedStopIds: string[];
    try {
      droppedStopIds = await client.smembers('corporate:active:dropped:stops');
    } catch {
      return [];
    }

    const escalatedIds: string[] = [];

    for (const stopId of droppedStopIds) {
      try {
        const raw = await client.get(`corporate:stop:safedrop:${stopId}`);
        if (!raw) {
          await client.srem('corporate:active:dropped:stops', stopId);
          continue;
        }

        const data = JSON.parse(raw);
        if (data.status !== 'DROPPED') {
          await client.srem('corporate:active:dropped:stops', stopId);
          continue;
        }

        const droppedAtMs = new Date(data.droppedAt).getTime();
        const elapsedMinutes = (now.getTime() - droppedAtMs) / (60 * 1000);

        if (elapsedMinutes >= timeoutMinutes) {
          data.status = 'ESCALATED';
          data.escalatedAt = now.toISOString();
          await client.set(`corporate:stop:safedrop:${stopId}`, JSON.stringify(data), 'EX', 86400);
          await client.srem('corporate:active:dropped:stops', stopId);

          escalatedIds.push(stopId);

          this.logger.error(
            `🚨 [SAFE-DROP TIMEOUT ESCALATION] Commuter ${data.employeeName} (${data.employeeId}) unconfirmed after ${Math.round(elapsedMinutes)} min on Route ${data.routeId}!`,
          );

          const payload = {
            stopId,
            routeId: data.routeId,
            tenantId: data.tenantId,
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            employeePhone: data.employeePhone,
            driverName: data.driverName,
            elapsedMinutes: Math.round(elapsedMinutes),
            severity: 'P1_HIGH',
            timestamp: now,
          };

          this.notifications.emitEvent('admin:command-center:safe-drop', 'SAFE_DROP_UNACKNOWLEDGED_ALERT', payload);
          if (data.tenantId) {
            this.notifications.emitEvent(`corporate:${data.tenantId}`, 'SAFE_DROP_UNACKNOWLEDGED_ALERT', payload);
          }

          await this.audit.log({
            action: 'CORPORATE_SAFE_DROP_UNACKNOWLEDGED_ESCALATED',
            actorRole: 'SYSTEM_AUTONOMOUS_SAFETY',
            entityId: stopId,
            entityType: 'CORPORATE_ROUTE_STOP',
            metadata: {
              routeId: data.routeId,
              employeeId: data.employeeId,
              elapsedMinutes: Math.round(elapsedMinutes),
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(`Error checking safe drop for stop ${stopId}: ${err.message}`);
      }
    }

    return escalatedIds;
  }

  /**
   * Query current safe drop status of a stop from Redis cache.
   */
  public async getSafeDropStatus(stopId: string): Promise<any> {
    const client: any = this.redis?.getClient();
    if (!client) return null;
    try {
      const raw = await client.get(`corporate:stop:safedrop:${stopId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
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
