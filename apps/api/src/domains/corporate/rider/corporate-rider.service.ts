import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { CorporateSafetyService } from '../safety/corporate-safety.service';
import { CorporateTripExecutionService } from '../execution/corporate-trip-execution.service';
import { CorporateSupportTicketService } from '../safety/corporate-support-ticket.service';
import {
  CreateSupportTicketDto,
  RiderNextTripResponse,
  RiderNotificationItem,
  RiderProfileResponse,
  RiderScheduleItem,
  RiderScheduleResponse,
  RiderTripSummary,
  RiderTripsOptions,
  RiderTripTrackingResponse,
  SubmitSafeReachDto,
  SubmitTripFeedbackDto,
  SupportTicketResponse,
} from './corporate-rider.types';
import {
  CorporateGender,
  CorporateRouteStatus,
  CorporateStopStatus,
  CorporateTransportDirection,
} from '@adhocx/contracts';
import { evaluateCutoff, resolveCancelCutoffHours, resolvePickupTime } from '../replanning/cutoff-policy';
import { classifyGpsFreshness, CorporateGpsKeys } from '../tracking/tracking.types';

/** Request states that can no longer be cancelled or rescheduled. */
const NON_MODIFIABLE_REQUEST_STATUSES = new Set(['CANCELLED', 'COMPLETED', 'IN_PROGRESS', 'UNSERVED']);

const nonEmpty = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const toPoint = (lat: unknown, lng: unknown): { latitude: number; longitude: number } | null =>
  lat === null || lat === undefined || lng === null || lng === undefined
    ? null
    : { latitude: Number(lat), longitude: Number(lng) };

@Injectable()
export class CorporateRiderService {
  private readonly logger = new Logger(CorporateRiderService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly tickets: CorporateSupportTicketService,
    @Optional() private readonly safetyService?: CorporateSafetyService,
    @Optional() private readonly executionService?: CorporateTripExecutionService,
  ) {}

  /**
   * Helper: Resolves an employee record by authenticated userId (or direct employeeId).
   */
  async resolveEmployee(userOrEmployeeId: string): Promise<any> {
    const employee = await this.db.corporateEmployee.findFirst({
      where: {
        OR: [{ userId: userOrEmployeeId }, { id: userOrEmployeeId }],
        isActive: true,
      },
      include: {
        tenant: true,
        office: true,
        locations: { take: 1, orderBy: { id: 'asc' } },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee profile not found for user ${userOrEmployeeId}`);
    }

    return employee;
  }

  /**
   * GET /corporate/me
   * Fetches the commuter's profile, company info, assigned office, and default pickup location.
   */
  async getRiderProfile(userId: string): Promise<RiderProfileResponse> {
    const emp = await this.resolveEmployee(userId);
    const loc = emp.locations && emp.locations.length > 0 ? emp.locations[0] : null;

    return {
      employeeId: emp.id,
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      email: emp.email,
      phoneNumber: emp.phoneNumber,
      gender: emp.gender as CorporateGender,
      department: emp.department ?? null,
      costCenter: emp.costCenter ?? null,
      tenant: {
        id: emp.tenant.id,
        name: emp.tenant.name,
        code: emp.tenant.code,
      },
      office: {
        id: emp.office.id,
        name: emp.office.name,
        addressText: emp.office.addressText,
        latitude: Number(emp.office.latitude),
        longitude: Number(emp.office.longitude),
      },
      defaultPickupLocation: loc
        ? {
            addressText: loc.addressText,
            landmark: loc.landmark,
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
          }
        : null,
    };
  }

  /**
   * GET /corporate/me/schedule
   * Aggregates upcoming scheduled shift rides with pickup & drop times and 9-hour modification lock status.
   */
  async getRiderSchedule(userId: string, startDate?: string, endDate?: string): Promise<RiderScheduleResponse> {
    const emp = await this.resolveEmployee(userId);

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 7 * 86400000);

    const [requests, directStops] = await Promise.all([
      this.db.corporateTransportRequest.findMany({
        where: {
          employeeId: emp.id,
          scheduledDate: { gte: start, lte: end },
          status: { notIn: ['CANCELLED'] },
        },
        include: {
          routeStop: {
            include: {
              route: {
                include: { office: true },
              },
            },
          },
        },
        orderBy: [{ scheduledDate: 'asc' }, { shiftTime: 'asc' }],
      }),
      typeof (this.db as any).corporateRouteStop?.findMany === 'function'
        ? this.db.corporateRouteStop.findMany({
            where: {
              employeeId: emp.id,
              transportRequestId: null,
              status: { notIn: ['CANCELLED'] },
              route: {
                shiftDate: { gte: start, lte: end },
                status: { notIn: ['CANCELLED'] },
              },
            },
            include: {
              route: {
                include: { office: true },
              },
            },
            orderBy: { plannedEta: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const safeDirectStops = Array.isArray(directStops) ? directStops : [];

    const defaultAddress = emp.locations && emp.locations.length > 0 ? emp.locations[0].addressText : 'Home Address';
    // Same tenant policy, pickup anchor and IST interpretation as POST requests/:id/reschedule,
    // so the app never offers an action the API will reject (or hides one it would accept).
    const cutoffHours = await resolveCancelCutoffHours(this.db as any, emp.tenantId, now);

    const requestItems: RiderScheduleItem[] = requests.map((req) => {
      const shiftDateStr = req.scheduledDate.toISOString().substring(0, 10);
      const { pickupAt, source } = resolvePickupTime(req as any);
      const cutoff = evaluateCutoff(pickupAt, source, now, null, cutoffHours);
      const canModify = cutoff.allowed && !NON_MODIFIABLE_REQUEST_STATUSES.has(String(req.status));

      const stop = req.routeStop;
      const route = stop?.route;

      return {
        date: shiftDateStr,
        shiftTime: req.shiftTime,
        direction: req.direction as CorporateTransportDirection,
        status: req.status,
        requestId: req.id,
        stopId: stop?.id ?? null,
        routeId: route?.id ?? null,
        pickupTime: stop?.plannedEta ? stop.plannedEta.toISOString() : null,
        officeArrivalTime: route?.targetOfficeArrivalTime
          ? route.targetOfficeArrivalTime.toISOString()
          : null,
        pickupAddress: (stop as any)?.addressText || defaultAddress,
        officeAddress: route?.office?.addressText ?? emp.office.addressText,
        vehicleCategory: route?.vehicleCategory ?? '',
        canCancel: canModify,
        canReschedule: canModify,
        pickupAt: pickupAt.toISOString(),
        cancelCutoffAt: cutoff.cutoffAt.toISOString(),
        cutoffHours,
        canModify,
        pickupPoint: toPoint(req.pickupLat, req.pickupLng),
        dropoffPoint: toPoint(req.dropoffLat, req.dropoffLng),
      };
    });

    const directStopItems: RiderScheduleItem[] = safeDirectStops.map((stop: any) => {
      const route = stop.route;
      const shiftDateStr = route.shiftDate.toISOString().substring(0, 10);
      const pickupAt = stop.plannedEta ? new Date(stop.plannedEta) : new Date(route.targetPickup1Time);
      const cutoff = evaluateCutoff(pickupAt, 'stop_eta' as any, now, null, cutoffHours);
      const canModify = cutoff.allowed && stop.status === 'PENDING' && ['PLANNED', 'DISPATCHING', 'ASSIGNED'].includes(String(route.status));
      return {
        date: shiftDateStr,
        shiftTime: route.shiftTime,
        direction: route.direction as CorporateTransportDirection,
        status: route.status === 'COMPLETED' ? 'COMPLETED' : stop.status === 'BOARDED' ? 'IN_PROGRESS' : 'PLANNED',
        requestId: stop.id,
        stopId: stop.id,
        routeId: route.id,
        pickupTime: stop.plannedEta ? stop.plannedEta.toISOString() : null,
        officeArrivalTime: route.targetOfficeArrivalTime ? route.targetOfficeArrivalTime.toISOString() : null,
        pickupAddress: stop.addressText || defaultAddress,
        officeAddress: route.office?.addressText ?? emp.office.addressText,
        vehicleCategory: route.vehicleCategory ?? '',
        canCancel: canModify,
        canReschedule: false,
        pickupAt: pickupAt.toISOString(),
        cancelCutoffAt: cutoff.cutoffAt.toISOString(),
        cutoffHours,
        canModify,
        pickupPoint: toPoint(stop.latitude, stop.longitude),
        dropoffPoint: toPoint(route.office?.latitude, route.office?.longitude),
      };
    });

    const schedule: RiderScheduleItem[] = [...requestItems, ...directStopItems].sort((a, b) =>
      `${a.date} ${a.shiftTime}`.localeCompare(`${b.date} ${b.shiftTime}`),
    );

    return {
      employeeId: emp.id,
      employee: {
        id: emp.id,
        code: emp.employeeCode,
        fullName: emp.fullName,
        officeName: emp.office?.name ?? null,
      },
      startDate: start.toISOString().substring(0, 10),
      endDate: end.toISOString().substring(0, 10),
      totalRides: schedule.length,
      schedule,
    };
  }

  /**
   * GET /corporate/me/trips
   * Commuter trip history and upcoming trips with full vehicle, driver and OTP details.
   */
  async getRiderTrips(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    options: RiderTripsOptions = {},
  ): Promise<RiderTripSummary[]> {
    const emp = await this.resolveEmployee(userId);

    const stops: any[] = await (this.db.corporateRouteStop as any).findMany({
      where: {
        employeeId: emp.id,
        ...(options.stopStatuses && options.stopStatuses.length > 0 ? { status: { in: options.stopStatuses as any } } : {}),
      },
      include: {
        route: {
          include: {
            driver: {
              include: { user: true },
            },
            vehicle: true,
            office: true,
          },
        },
        transportRequest: true,
        feedback: true,
      },
      orderBy: { plannedEta: 'desc' },
      take: Math.min(100, Math.max(1, limit)),
      skip: Math.max(0, offset),
    });

    const defaultAddress = emp.locations && emp.locations.length > 0 ? emp.locations[0].addressText : 'Pickup Location';

    return stops.map((s) => {
      const route = s.route;
      const driver = route?.driver;
      const assignedVehicle = (route as any)?.vehicle;
      const isLateNight = route.direction === 'LOGOUT';
      const isFemale = emp.gender === 'FEMALE';
      const femaleSafeDropRequired = isLateNight && isFemale;
      const femaleSafeDropConfirmed = Boolean(s.actualDepartureTime);

      return {
        stopId: s.id,
        routeId: route.id,
        requestId: s.transportRequestId,
        shiftDate: route.shiftDate.toISOString().substring(0, 10),
        shiftTime: route.shiftTime,
        direction: route.direction as CorporateTransportDirection,
        stopSequence: s.stopSequence,
        stopType: s.stopType,
        status: s.status as CorporateStopStatus,
        routeStatus: route.status as CorporateRouteStatus,
        plannedEta: s.plannedEta,
        actualArrivalTime: s.actualArrivalTime,
        actualDepartureTime: s.actualDepartureTime,
        boardingOtp: s.boardingOtp,
        pickupAddress: s.addressText || defaultAddress,
        destinationAddress: route.office?.name ?? 'Corporate Office',
        driver: driver
          ? {
              id: driver.id,
              fullName: driver.fullName,
              phoneNumber: driver.phone,
              rating: Number(driver.averageRating) || 5.0,
            }
          : null,
        // Never invent a plate / model: an employee checks these before boarding.
        vehicle:
          driver && nonEmpty(assignedVehicle?.registrationNumber ?? driver.vehiclePlate)
            ? {
                id: assignedVehicle?.id ?? `veh-${driver.id}`,
                plateNumber: nonEmpty(assignedVehicle?.registrationNumber) ?? (driver.vehiclePlate as string),
                model: nonEmpty(assignedVehicle?.model) ?? nonEmpty(driver.vehicleModel) ?? '',
                color: nonEmpty((driver as any).vehicleColor),
                category: route.vehicleCategory || '',
              }
            : null,
        noShowReason: (s as any).noShowReason ?? null,
        hasFeedback: Boolean(s.feedback),
        feedbackRating: s.feedback?.rating ?? null,
        femaleSafeDropRequired,
        femaleSafeDropConfirmed,
      };
    });
  }

  /**
   * GET /corporate/me/trips/next
   * Next active or upcoming trip card for the commuter home screen (EMP-02-01, EMP-02-02).
   */
  async getRiderNextTrip(userId: string): Promise<RiderNextTripResponse> {
    const emp = await this.resolveEmployee(userId);

    const stop: any = await this.db.corporateRouteStop.findFirst({
      where: {
        employeeId: emp.id,
        status: { in: ['PENDING', 'ARRIVED', 'BOARDED'] },
        route: {
          status: { in: ['PLANNED', 'DISPATCHING', 'ASSIGNED', 'IN_TRANSIT'] },
        },
      },
      include: {
        route: {
          include: {
            driver: true,
            vehicle: true,
            office: true,
            stops: {
              orderBy: { stopSequence: 'asc' },
              select: {
                id: true,
                employeeId: true,
                stopSequence: true,
                stopType: true,
                addressText: true,
                plannedEta: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { plannedEta: 'asc' },
    });

    if (!stop) {
      return {
        hasActiveTrip: false,
        message: 'No upcoming corporate trips scheduled at this time.',
      };
    }

    const route = stop.route;
    return {
      hasActiveTrip: true,
      stopId: stop.id,
      routeId: stop.routeId,
      routeNumber: `CR-${stop.routeId.slice(0, 8).toUpperCase()}`,
      shiftDate: route.shiftDate.toISOString().substring(0, 10),
      shiftTime: route.shiftTime,
      direction: route.direction,
      routeStatus: route.status,
      stopStatus: stop.status,
      stopSequence: stop.stopSequence,
      plannedEta: stop.plannedEta,
      actualArrivalTime: stop.actualArrivalTime ?? null,
      actualDepartureTime: stop.actualDepartureTime ?? null,
      boardingOtp: stop.boardingOtp,
      pickupLocation: {
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
        addressText: stop.addressText || emp.locations?.[0]?.addressText || 'Designated Pickup Node',
      },
      officeDestination: {
        id: route.office.id,
        name: route.office.name,
        addressText: route.office.addressText,
      },
      driver: route.driver
        ? {
            id: route.driver.id,
            name: route.driver.fullName || 'Assigned Driver',
            phone: route.driver.phone ?? null,
          }
        : null,
      vehicle: route.vehicle
        ? {
            id: route.vehicle.id,
            registrationNumber: route.vehicle.registrationNumber,
            model: route.vehicle.model,
            vehicleType: route.vehicle.vehicleType,
          }
        : null,
      routeStops: (route.stops ?? []).map((rs: any) => ({
        stopId: rs.id,
        stopSequence: rs.stopSequence,
        stopType: rs.stopType,
        addressText: rs.addressText || (rs.employeeId ? 'Commuter Stop' : route.office?.name || 'Corporate Office'),
        plannedEta: rs.plannedEta,
        status: rs.status,
        isCurrentUser: rs.employeeId === emp.id,
      })),
    };
  }

  /**
   * GET /corporate/me/trips/:id/tracking
   * Real-time live tracking: driver coordinates, arrival countdown, OTP, dynamic QR token, dwell countdown.
   */
  async getRiderTripTracking(userId: string, tripOrStopId: string): Promise<RiderTripTrackingResponse> {
    const emp = await this.resolveEmployee(userId);

    // Support looking up either by Stop ID or Route ID
    let stop = await this.db.corporateRouteStop.findFirst({
      where: {
        id: tripOrStopId,
        employeeId: emp.id,
      },
      include: {
        route: {
          include: {
            driver: true,
            vehicle: true,
            office: true,
            stops: { orderBy: { stopSequence: 'asc' } },
            sosAlerts: { where: { status: { in: ['NEW', 'ACTIVE', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'] } } },
          },
        },
      },
    });

    if (!stop) {
      stop = await this.db.corporateRouteStop.findFirst({
        where: {
          routeId: tripOrStopId,
          employeeId: emp.id,
        },
        include: {
          route: {
            include: {
              driver: true,
              vehicle: true,
              office: true,
              stops: { orderBy: { stopSequence: 'asc' } },
              sosAlerts: { where: { status: { in: ['NEW', 'ACTIVE', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'] } } },
            },
          },
        },
      });
    }

    if (!stop) {
      throw new NotFoundException(`Active trip stop not found for employee ${emp.fullName}`);
    }

    const route = stop.route;
    const client = this.redis.getClient();

    // 1. Latest vehicle position: the key CorporateGpsIngestService writes on every telemetry fix
    //    (`corporate:route:telemetry:{routeId}`), falling back to the legacy per-driver key. A fix
    //    without a valid device timestamp is ignored: it must never be reported as fresh.
    const now = new Date();
    let driverLocation: any = null;
    let distanceToPickupMeters: number | null = null;
    let estimatedArrivalMinutes: number | null = null;

    if (client) {
      try {
        driverLocation = await this.readLatestDriverFix(client, route.id, route.driverId);
      } catch (e: any) {
        this.logger.warn(`Failed to read driver location from Redis: ${e?.message}`);
      }
    }
    const freshness = classifyGpsFreshness(driverLocation?.updatedAt ?? null, now);
    if (driverLocation) {
      const stopLat = Number(stop.latitude);
      const stopLng = Number(stop.longitude);
      distanceToPickupMeters = Math.round(
        haversineDistanceMeters(driverLocation.latitude, driverLocation.longitude, stopLat, stopLng),
      );
      // Urban average speed: 30 km/h (500m/min)
      estimatedArrivalMinutes = Math.max(1, Math.ceil(distanceToPickupMeters / 500));
    }

    // 2. Dwell countdown: Redis timer when present, else derived from the recorded arrival time and
    //    the stop's dwell buffer (default 300 s = the 5-minute wait before a no-show).
    let dwellRemainingSeconds: number | null = null;
    if (client) {
      const dwellKey = `corporate:dwell:${route.id}:${stop.id}`;
      const ttl = await client.ttl(dwellKey);
      if (ttl > 0) {
        dwellRemainingSeconds = ttl;
      }
    }
    if (dwellRemainingSeconds === null && stop.status === 'ARRIVED' && stop.actualArrivalTime) {
      const buffer = Number((stop as any).dwellBufferSeconds ?? 300);
      const elapsed = Math.floor((now.getTime() - new Date(stop.actualArrivalTime).getTime()) / 1000);
      dwellRemainingSeconds = Math.max(0, buffer - Math.max(0, elapsed));
    }

    // 3. Generate dynamic HMAC QR token
    let dynamicQrToken: string;
    if (this.executionService) {
      try {
        const qrRes = await this.executionService.generateBoardingQrToken(route.id, stop.id);
        dynamicQrToken = qrRes.qrPayload;
      } catch {
        dynamicQrToken = this.generateFallbackQrToken(route.id, stop.id, stop.boardingOtp);
      }
    } else {
      dynamicQrToken = this.generateFallbackQrToken(route.id, stop.id, stop.boardingOtp);
    }

    // 4. Co-passengers count
    const coPassengersCount = Math.max(0, (route.stops?.length ?? 1) - 1);

    const activeSos = route.sosAlerts && route.sosAlerts.length > 0 ? route.sosAlerts[0] : null;

    return {
      routeId: route.id,
      stopId: stop.id,
      direction: route.direction as CorporateTransportDirection,
      routeStatus: route.status as CorporateRouteStatus,
      stopStatus: stop.status as CorporateStopStatus,
      plannedEta: stop.plannedEta,
      estimatedArrivalMinutes,
      distanceToPickupMeters,
      boardingOtp: stop.boardingOtp,
      dynamicQrToken,
      dwellRemainingSeconds,
      isDriverArrived: stop.status === 'ARRIVED',
      gpsState: freshness.gpsState,
      lastFixAgeSec: freshness.lastFixAgeSec,
      driverLocation,
      driver: route.driver
        ? {
            id: route.driver.id,
            fullName: route.driver.fullName,
            phoneNumber: route.driver.phone,
            photoUrl: (route.driver as any).profilePhotoUrl ?? null,
            rating: Number(route.driver.averageRating) || 5.0,
          }
        : null,
      // The assigned route vehicle wins over the driver's profile; never invent a plate / model.
      vehicle:
        route.driver && nonEmpty((route as any).vehicle?.registrationNumber ?? route.driver.vehiclePlate)
          ? {
              plateNumber:
                nonEmpty((route as any).vehicle?.registrationNumber) ?? (route.driver.vehiclePlate as string),
              model: nonEmpty((route as any).vehicle?.model) ?? nonEmpty(route.driver.vehicleModel) ?? '',
              color: nonEmpty((route.driver as any).vehicleColor),
              category: route.vehicleCategory || '',
            }
          : null,
      activeSosAlert: activeSos
        ? {
            id: activeSos.id,
            status: activeSos.status,
            triggeredAt: activeSos.createdAt,
          }
        : null,
      coPassengersCount,
    };
  }

  /**
   * Same payload format CorporateTripExecutionService.verifyBoardingQr decodes (base64 JSON). Its
   * security is the stop's boarding OTP inside it, checked server-side with an attempt limit; there
   * is deliberately no signing key here (the old hardcoded fallback key produced tokens the
   * verifier could not even parse).
   */
  /** Latest GPS fix of a route, or null when there is none with a valid device timestamp. */
  private async readLatestDriverFix(
    client: any,
    routeId: string,
    driverId: string | null | undefined,
  ): Promise<RiderTripTrackingResponse['driverLocation']> {
    const parse = (raw: string | null, tsField: 'recordedAt' | 'timestamp') => {
      if (!raw) return null;
      const p = JSON.parse(raw);
      const ts = p?.[tsField];
      const ms = typeof ts === 'number' ? ts : Date.parse(String(ts ?? ''));
      const lat = Number(p?.latitude);
      const lng = Number(p?.longitude);
      if (!Number.isFinite(ms) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const speedMps = typeof p.speedMps === 'number' ? p.speedMps : null;
      return {
        latitude: lat,
        longitude: lng,
        heading: p.headingDeg ?? p.heading ?? null,
        speedKmph: p.speedKmph ?? (speedMps === null ? null : Math.round(speedMps * 36) / 10),
        updatedAt: new Date(ms),
      };
    };
    const latest = parse(await client.get(CorporateGpsKeys.latest(routeId)), 'recordedAt');
    if (latest || !driverId) return latest;
    return parse(await client.get(`driver:location:${driverId}`), 'timestamp');
  }

  private generateFallbackQrToken(routeId: string, stopId: string, otp: string): string {
    return Buffer.from(
      JSON.stringify({ stopId, routeId, otp, expiresAtMs: Date.now() + 300_000 }),
    ).toString('base64');
  }

  /**
   * POST /corporate/me/trips/:id/safe-reach
   * Female Commuter Safe Drop entry confirmation.
   */
  async submitSafeReach(userId: string, stopId: string, dto?: SubmitSafeReachDto): Promise<any> {
    const emp = await this.resolveEmployee(userId);

    const stop = await this.db.corporateRouteStop.findFirst({
      where: { id: stopId, employeeId: emp.id },
      include: { route: true },
    });

    if (!stop) {
      throw new NotFoundException(`Stop ${stopId} not found for employee ${emp.fullName}`);
    }

    if (this.safetyService) {
      return this.safetyService.confirmSafeDrop(
        stop.routeId,
        stop.id,
        {
          confirmedByRole: 'EMPLOYEE',
          notes: dto?.notes || 'Commuter safely entered home',
        },
        userId,
      );
    }

    const updated = await this.db.corporateRouteStop.update({
      where: { id: stopId },
      data: { actualDepartureTime: new Date() },
    });

    this.notifications.emitEvent(`corporate:${stop.route.tenantId}`, 'FEMALE_SAFE_DROP_CONFIRMED', {
      routeId: stop.routeId,
      stopId: stop.id,
      employeeId: emp.id,
      employeeName: emp.fullName,
      confirmedByRole: 'EMPLOYEE',
      confirmedAt: new Date(),
    });

    await this.audit.log({
      action: 'CORPORATE_FEMALE_SAFE_DROP_CONFIRMED',
      userId,
      actorRole: 'EMPLOYEE',
      entityId: stopId,
      entityType: 'CORPORATE_ROUTE_STOP',
      metadata: { routeId: stop.routeId, employeeId: emp.id, notes: dto?.notes },
    });

    return updated;
  }

  /**
   * POST /corporate/me/trips/:id/feedback
   * Commuter submits a safety response, 1-5 star rating, and feedback tags.
   */
  async submitTripFeedback(userId: string, stopId: string, dto: SubmitTripFeedbackDto): Promise<any> {
    const emp = await this.resolveEmployee(userId);

    const rating = Math.round(dto.rating);
    if (!rating || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }

    const stop = await this.db.corporateRouteStop.findFirst({
      where: { id: stopId, employeeId: emp.id },
      include: { route: true },
    });

    if (!stop) {
      throw new NotFoundException(`Stop ${stopId} not found for employee ${emp.fullName}`);
    }

    if (stop.route.status !== CorporateRouteStatus.COMPLETED || stop.status === 'CANCELLED' || stop.status === 'NO_SHOW') {
      throw new BadRequestException('Feedback can only be submitted for a completed trip');
    }

    if (!stop.route.driverId) {
      throw new BadRequestException('A driver must be assigned before submitting trip feedback');
    }

    if (dto.feltSafe !== undefined && typeof dto.feltSafe !== 'boolean') {
      throw new BadRequestException('feltSafe must be a boolean');
    }

    const existing = await this.db.corporateTripFeedback.findUnique({
      where: { stopId },
    });

    if (existing) {
      throw new ConflictException('Feedback has already been submitted for this trip');
    }

    const feedback = await this.db.corporateTripFeedback.create({
      data: {
        tenantId: stop.route.tenantId,
        employeeId: emp.id,
        routeId: stop.routeId,
        stopId: stop.id,
        driverId: stop.route.driverId,
        rating,
        feltSafe: dto.feltSafe ?? null,
        tags: dto.tags ?? [],
        comment: dto.comment?.trim() ?? null,
      },
    });

    this.logger.log(`Trip feedback recorded for stop ${stopId} by employee ${emp.fullName}: ${rating} stars`);
    return feedback;
  }

  /**
   * POST /corporate/me/tickets
   * Submits a commuter support ticket with SLA auto-calculation.
   */
  async createSupportTicket(userId: string, dto: CreateSupportTicketDto): Promise<SupportTicketResponse> {
    const emp = await this.resolveEmployee(userId);
    return this.tickets.createTicket(emp, dto, { userId, role: 'EMPLOYEE' });
  }

  /**
   * GET /corporate/me/tickets
   * Lists commuter's active and resolved support tickets.
   */
  async getRiderSupportTickets(userId: string): Promise<SupportTicketResponse[]> {
    const emp = await this.resolveEmployee(userId);
    return this.tickets.listEmployeeTickets(emp.id);
  }

  async updateRiderProfile(
    userId: string,
    dto: { fullName?: string; email?: string; homeAddress?: string },
  ): Promise<RiderProfileResponse> {
    const emp = await this.resolveEmployee(userId);
    const cleanName = dto.fullName?.trim();
    const cleanEmail = dto.email?.trim().toLowerCase();

    await this.db.corporateEmployee.update({
      where: { id: emp.id },
      data: {
        ...(cleanName ? { fullName: cleanName } : {}),
        ...(cleanEmail ? { email: cleanEmail } : {}),
      },
    });

    const userPatch: Record<string, any> = {};
    if (cleanName) userPatch.fullName = cleanName;
    if (cleanEmail) {
      const emailClash = await this.db.user.findFirst({
        where: { email: { equals: cleanEmail, mode: 'insensitive' }, id: { not: userId } },
        select: { id: true },
      });
      if (!emailClash) userPatch.email = cleanEmail;
    }
    if (Object.keys(userPatch).length > 0) {
      await this.db.user.update({ where: { id: userId }, data: userPatch });
    }

    if (dto.homeAddress?.trim()) {
      const existingLoc = emp.locations?.[0];
      if (existingLoc) {
        await this.db.corporateEmployeeLocation.update({
          where: { id: existingLoc.id },
          data: { addressText: dto.homeAddress.trim() },
        });
      }
    }

    return this.getRiderProfile(userId);
  }

  async cancelRiderStop(userId: string, stopId: string, reason?: string) {
    const emp = await this.resolveEmployee(userId);
    const stop = await this.db.corporateRouteStop.findFirst({
      where: { id: stopId, employeeId: emp.id },
      include: { route: true },
    });
    if (!stop) {
      throw new NotFoundException('Upcoming ride stop not found for this employee');
    }
    if (stop.status !== 'PENDING') {
      throw new BadRequestException(`Cannot cancel stop in ${stop.status} status`);
    }

    await this.db.$transaction(async (tx) => {
      await tx.corporateRouteStop.update({
        where: { id: stop.id },
        data: { status: 'CANCELLED', noShowReason: reason?.trim() || 'Cancelled by employee' },
      });
      if (stop.transportRequestId) {
        await tx.corporateTransportRequest.update({
          where: { id: stop.transportRequestId },
          data: { status: 'CANCELLED' },
        });
      }
    });

    return { stopId: stop.id, routeId: stop.routeId, status: 'CANCELLED' };
  }

  /**
   * GET /corporate/me/notifications
   * Commuter push/in-app notification stream backed by persisted Notification rows.
   */
  async getRiderNotifications(userId: string): Promise<RiderNotificationItem[]> {
    await this.resolveEmployee(userId);

    const rows = await this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map((row) => ({
      id: row.id,
      type: String(row.type || 'GENERAL'),
      title: row.title,
      message: row.body,
      timestamp: row.createdAt,
      metadata: (row.data as Record<string, any>) ?? {},
    }));
  }
}
