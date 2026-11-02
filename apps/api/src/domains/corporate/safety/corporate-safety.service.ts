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
        stopId: dto.stopId || null,
        triggeredById,
        triggeredByRole,
        latitude: dto.latitude,
        longitude: dto.longitude,
        batteryPct: dto.batteryPct ?? null,
        audioUrl: dto.audioUrl ?? null,
        status: 'ACTIVE',
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
   * Resolve an active emergency alert with audit incident notes.
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

    if (alert.status !== 'ACTIVE') {
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
