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
import * as crypto from 'crypto';

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
  private readonly CANCELLATION_CUTOFF_HOURS = 9;

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

    const requests = await this.db.corporateTransportRequest.findMany({
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
    });

    const defaultAddress = emp.locations && emp.locations.length > 0 ? emp.locations[0].addressText : 'Home Address';

    const schedule: RiderScheduleItem[] = requests.map((req) => {
      const shiftDateStr = req.scheduledDate.toISOString().substring(0, 10);
      const [hours, minutes] = req.shiftTime.split(':').map(Number);
      const shiftDateTime = new Date(req.scheduledDate);
      shiftDateTime.setHours(hours, minutes, 0, 0);

      const hoursUntilShift = (shiftDateTime.getTime() - now.getTime()) / (3600 * 1000);
      const canModify = hoursUntilShift >= this.CANCELLATION_CUTOFF_HOURS;

      const stop = req.routeStop;
      const route = stop?.route;

      return {
        date: shiftDateStr,
        shiftTime: req.shiftTime,
        direction: req.direction as CorporateTransportDirection,
        status: req.status,
        requestId: req.id,
        routeId: route?.id ?? null,
        pickupTime: stop?.plannedEta ? stop.plannedEta.toISOString() : null,
        officeArrivalTime: route?.targetOfficeArrivalTime
          ? route.targetOfficeArrivalTime.toISOString()
          : null,
        pickupAddress: defaultAddress,
        officeAddress: route?.office?.addressText ?? emp.office.addressText,
        vehicleCategory: route?.vehicleCategory ?? 'SEDAN',
        canCancel: canModify,
        canReschedule: canModify,
        pickupPoint: toPoint(req.pickupLat, req.pickupLng),
        dropoffPoint: toPoint(req.dropoffLat, req.dropoffLng),
      };
    });

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

    const stops = await this.db.corporateRouteStop.findMany({
      where: {
        employeeId: emp.id,
        ...(options.stopStatuses && options.stopStatuses.length > 0 ? { status: { in: options.stopStatuses } } : {}),
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
        pickupAddress: defaultAddress,
        destinationAddress: route.office?.name ?? 'Corporate Office',
        driver: driver
          ? {
              id: driver.id,
              fullName: driver.fullName,
              phoneNumber: driver.phone,
              rating: Number(driver.averageRating) || 5.0,
            }
          : null,
        vehicle: driver
          ? {
              id: assignedVehicle?.id ?? `veh-${driver.id}`,
              plateNumber: assignedVehicle?.registrationNumber || driver.vehiclePlate || 'AP29TX1234',
              model: assignedVehicle?.model || driver.vehicleModel || 'Maruti Dzire',
              color: (driver as any).vehicleColor || 'White',
              category: route.vehicleCategory || 'SEDAN',
            }
          : null,
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
        addressText: emp.locations?.[0]?.addressText || 'Designated Pickup Node',
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

    // 1. Fetch live driver coordinates from Redis
    let driverLocation: any = null;
    let distanceToPickupMeters: number | null = null;
    let estimatedArrivalMinutes: number | null = null;

    if (route.driverId && client) {
      try {
        const rawLoc = await client.get(`driver:location:${route.driverId}`);
        if (rawLoc) {
          const parsed = JSON.parse(rawLoc);
          driverLocation = {
            latitude: Number(parsed.latitude),
            longitude: Number(parsed.longitude),
            heading: parsed.heading ?? null,
            speedKmph: parsed.speedKmph ?? null,
            updatedAt: new Date(parsed.timestamp || Date.now()),
          };

          const stopLat = Number(stop.latitude);
          const stopLng = Number(stop.longitude);
          distanceToPickupMeters = Math.round(
            haversineDistanceMeters(driverLocation.latitude, driverLocation.longitude, stopLat, stopLng),
          );
          // Urban average speed: 30 km/h (500m/min)
          estimatedArrivalMinutes = Math.max(1, Math.ceil(distanceToPickupMeters / 500));
        }
      } catch (e: any) {
        this.logger.warn(`Failed to read driver location from Redis: ${e?.message}`);
      }
    }

    // 2. Fetch active dwell countdown timer from Redis
    let dwellRemainingSeconds: number | null = null;
    if (client) {
      const dwellKey = `corporate:dwell:${route.id}:${stop.id}`;
      const ttl = await client.ttl(dwellKey);
      if (ttl > 0) {
        dwellRemainingSeconds = ttl;
      }
    }

    // 3. Generate dynamic HMAC QR token
    let dynamicQrToken = '';
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
      vehicle: route.driver
        ? {
            plateNumber: route.driver.vehiclePlate || 'AP29TX1234',
            model: route.driver.vehicleModel || 'Maruti Dzire',
            color: (route.driver as any).vehicleColor || 'White',
            category: route.vehicleCategory || 'SEDAN',
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

  private generateFallbackQrToken(routeId: string, stopId: string, otp: string): string {
    const secret = process.env.JWT_SECRET || 'adhocx-corporate-qr-secret-key-32';
    const expiresAt = Date.now() + 300_000;
    const payload = `${routeId}:${stopId}:${otp}:${expiresAt}`;
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 16);
    return Buffer.from(`${payload}:${hmac}`).toString('base64');
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
   * Commuter submits 1-5 star rating and feedback tags.
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
        rating,
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
    return this.tickets.createTicket(emp, dto);
  }

  /**
   * GET /corporate/me/tickets
   * Lists commuter's active and resolved support tickets.
   */
  async getRiderSupportTickets(userId: string): Promise<SupportTicketResponse[]> {
    const emp = await this.resolveEmployee(userId);
    return this.tickets.listEmployeeTickets(emp.id);
  }

  /**
   * GET /corporate/me/notifications
   * Commuter push/in-app notification stream.
   */
  async getRiderNotifications(userId: string): Promise<RiderNotificationItem[]> {
    const emp = await this.resolveEmployee(userId);

    // Retrieve active upcoming stops to generate current status notifications
    const upcomingStops = await this.db.corporateRouteStop.findMany({
      where: {
        employeeId: emp.id,
        status: { in: ['PENDING', 'ARRIVED'] },
      },
      include: { route: true },
      orderBy: { plannedEta: 'asc' },
      take: 5,
    });

    const notifications: RiderNotificationItem[] = [];

    for (const s of upcomingStops) {
      if (s.status === 'ARRIVED') {
        notifications.push({
          id: `notif-arrived-${s.id}`,
          type: 'CAB_ARRIVED',
          title: 'Cab Has Arrived',
          message: `Your cab has arrived at the pickup location. Dwell timer active. Boarding OTP: ${s.boardingOtp}`,
          timestamp: s.actualArrivalTime || new Date(),
          metadata: { stopId: s.id, routeId: s.routeId, otp: s.boardingOtp },
        });
      } else {
        notifications.push({
          id: `notif-eta-${s.id}`,
          type: 'TRIP_SCHEDULED',
          title: 'Upcoming Corporate Ride',
          message: `Your cab is scheduled for ${s.route.shiftTime} (${s.route.direction}). Planned pickup at ${s.plannedEta.toISOString().substring(11, 16)} IST.`,
          timestamp: s.plannedEta,
          metadata: { stopId: s.id, routeId: s.routeId },
        });
      }
    }

    return notifications;
  }
}
