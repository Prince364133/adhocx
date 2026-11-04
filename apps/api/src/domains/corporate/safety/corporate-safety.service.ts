import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  TriggerSosAlertDto,
  ResolveSosAlertDto,
  ConfirmSafeDropDto,
  CorporateSosStatus,
} from '@adhocx/contracts';

@Injectable()
export class CorporateSafetyService {
  private readonly logger = new Logger(CorporateSafetyService.name);
  private readonly DEVIATION_THRESHOLD_METERS = 500; // 500m allowable corridor deviation

  constructor(
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
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
   */
  public async acknowledgeSosAlert(
    alertId: string,
    adminUserId: string,
    adminName?: string,
  ) {
    const alert = await this.db.corporateSosAlert.findUnique({
      where: { id: alertId },
      include: { route: true },
    });

    if (!alert) {
      throw new NotFoundException(`SOS Alert ${alertId} not found`);
    }

    if (alert.status === 'RESOLVED' || alert.status === 'FALSE_ALARM') {
      throw new BadRequestException(`Cannot acknowledge closed alert in status ${alert.status}`);
    }

    const acknowledged = await this.db.corporateSosAlert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        assignedToAdminId: adminUserId,
        assignedAdminName: adminName || 'Commander',
      },
    });

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
      metadata: { routeId: alert.routeId, assignedAdminName: adminName },
    });

    return acknowledged;
  }

  /**
   * Stage 3 FSM: Mark alert under active investigation.
   */
  public async investigateSosAlert(
    alertId: string,
    adminUserId: string,
    notes?: string,
  ) {
    const alert = await this.db.corporateSosAlert.findUnique({
      where: { id: alertId },
      include: { route: true },
    });

    if (!alert) {
      throw new NotFoundException(`SOS Alert ${alertId} not found`);
    }

    if (alert.status === 'RESOLVED' || alert.status === 'FALSE_ALARM') {
      throw new BadRequestException(`Cannot investigate closed alert in status ${alert.status}`);
    }

    const investigating = await this.db.corporateSosAlert.update({
      where: { id: alertId },
      data: {
        status: 'INVESTIGATING',
        assignedToAdminId: adminUserId,
        resolutionNotes: notes ? notes.trim() : alert.resolutionNotes,
      },
    });

    this.logger.log(`SOS Alert ${alertId} under active investigation by ${adminUserId}`);

    this.notifications.emitEvent('admin:command-center:sos', 'CORPORATE_SOS_INVESTIGATING', {
      alertId,
      routeId: alert.routeId,
      assignedToAdminId: adminUserId,
      notes,
    });

    return investigating;
  }

  /**
   * Stage 4 FSM: Escalate alert to highest priority police / field response.
   */
  public async escalateSosAlert(
    alertId: string,
    adminUserId: string,
    reason?: string,
  ) {
    const alert = await this.db.corporateSosAlert.findUnique({
      where: { id: alertId },
      include: { route: true },
    });

    if (!alert) {
      throw new NotFoundException(`SOS Alert ${alertId} not found`);
    }

    if (alert.status === 'RESOLVED' || alert.status === 'FALSE_ALARM') {
      throw new BadRequestException(`Cannot escalate closed alert in status ${alert.status}`);
    }

    const escalated = await this.db.corporateSosAlert.update({
      where: { id: alertId },
      data: {
        status: 'ESCALATED',
        escalatedAt: new Date(),
        assignedToAdminId: adminUserId,
      },
    });

    this.logger.error(`🚨 SOS Alert ${alertId} escalated to highest priority by ${adminUserId}: ${reason}`);

    this.notifications.emitEvent('admin:command-center:sos', 'CORPORATE_SOS_ESCALATED', {
      alertId,
      routeId: alert.routeId,
      escalatedBy: adminUserId,
      reason,
      escalatedAt: escalated.escalatedAt,
    });

    await this.audit.log({
      action: 'CORPORATE_SOS_ESCALATED',
      userId: adminUserId,
      actorRole: 'SUPER_ADMIN',
      entityId: alertId,
      entityType: 'CORPORATE_SOS_ALERT',
      metadata: { routeId: alert.routeId, reason },
    });

    return escalated;
  }

  /**
   * Stage 5 FSM: Resolve an active emergency alert with audit incident notes.
   */
  public async resolveSosAlert(
    alertId: string,
    resolvedById: string,
    dto: ResolveSosAlertDto,
  ) {
    const alert = await this.db.corporateSosAlert.findUnique({
      where: { id: alertId },
      include: { route: true },
    });

    if (!alert) {
      throw new NotFoundException(`SOS Alert ${alertId} not found`);
    }

    if (alert.status === 'RESOLVED' || alert.status === 'FALSE_ALARM') {
      throw new BadRequestException(`Alert is already in status ${alert.status}`);
    }

    const resolved = await this.db.corporateSosAlert.update({
      where: { id: alertId },
      data: {
        status: dto.status as any,
        resolutionNotes: dto.resolutionNotes.trim(),
        resolvedAt: new Date(),
        resolvedById,
      },
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
        status: dto.status,
        notes: dto.resolutionNotes,
      },
    });

    return resolved;
  }

  /**
   * 120-Second Autonomous Auto-Escalation:
   * Any unacknowledged NEW/ACTIVE alert exceeding 120 seconds automatically transitions to ESCALATED.
   */
  public async checkAndAutoEscalateAlerts(timeoutSeconds: number = 120): Promise<string[]> {
    const cutoff = new Date(Date.now() - timeoutSeconds * 1000);
    const staleAlerts = await this.db.corporateSosAlert.findMany({
      where: {
        status: { in: ['NEW', 'ACTIVE'] },
        createdAt: { lte: cutoff },
      },
      include: { route: true },
    });

    const escalatedIds: string[] = [];
    for (const a of staleAlerts) {
      await this.db.corporateSosAlert.update({
        where: { id: a.id },
        data: {
          status: 'ESCALATED',
          autoEscalated: true,
          escalatedAt: new Date(),
        },
      });
      escalatedIds.push(a.id);

      this.logger.error(`🚨 [AUTO-ESCALATION] SOS Alert ${a.id} (Route: ${a.routeId}) unacknowledged after ${timeoutSeconds}s! Auto-escalated.`);

      this.notifications.emitEvent('admin:command-center:sos', 'CORPORATE_SOS_AUTO_ESCALATED', {
        alertId: a.id,
        routeId: a.routeId,
        tenantId: a.tenantId || a.route?.tenantId,
        unacknowledgedDurationSeconds: Math.round((Date.now() - a.createdAt.getTime()) / 1000),
      });

      await this.audit.log({
        action: 'CORPORATE_SOS_AUTO_ESCALATED',
        actorRole: 'SYSTEM_AUTONOMOUS_SAFETY',
        entityId: a.id,
        entityType: 'CORPORATE_SOS_ALERT',
        metadata: { routeId: a.routeId, timeoutSeconds },
      });
    }

    return escalatedIds;
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
