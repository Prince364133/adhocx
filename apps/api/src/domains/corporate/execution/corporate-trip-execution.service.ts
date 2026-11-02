import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  ArriveAtStopDto,
  VerifyStopOtpDto,
  MarkNoShowDto,
  StopExecutionResult,
  RescheduleRequestDto,
} from './trip-execution.types';

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
  ) {}

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

    // 4. Send real-time events & push notifications
    if (stop.employeeId) {
      const employee = await this.db.corporateEmployee.findUnique({
        where: { id: stop.employeeId },
      });

      if (employee) {
        // Send SMS/Push with boarding OTP & 5-minute countdown alert
        this.notifications.emitEvent(`employee:${employee.id}`, 'CAB_ARRIVED_AT_STOP', {
          routeId,
          stopId,
          boardingOtp: stop.boardingOtp,
          dwellSeconds: this.STOP_WAIT_BUFFER_SECONDS,
          driverName: route.driverId,
          message: `Your cab has arrived! 5-minute boarding timer started. Share OTP ${stop.boardingOtp} with your driver.`,
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
      this.notifications.emitEvent(`employee:${stop.employeeId}`, 'BOARDING_CONFIRMED', {
        routeId,
        stopId,
        departureTime,
      });
    }

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

    this.notifications.emitEvent(`corporate:${stop.route.tenantId}`, 'ATTENDANCE_NO_SHOW', {
      routeId,
      stopId,
      employeeId: stop.employeeId,
      employeeName: stop.employee?.fullName,
      employeeCode: stop.employee?.employeeCode,
      stopSequence: stop.stopSequence,
      reason: reasonText,
      recordedAt: departureTime,
    });

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

    this.notifications.emitEvent(`corporate:${route.tenantId}`, 'ROUTE_COMPLETED', {
      routeId,
      completedAt: new Date(),
    });

    return updated;
  }

  /**
   * Enforces the 9-hour cutoff rule for shift reschedule and cancellation requests.
   */
  public async handleRescheduleOrCancel(
    requestId: string,
    dto: RescheduleRequestDto,
  ): Promise<any> {
    const req = await this.db.corporateTransportRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });

    if (!req) {
      throw new NotFoundException(`Transport request ${requestId} not found`);
    }

    if (req.employeeId !== dto.employeeId) {
      throw new BadRequestException('Unauthorized: Request does not belong to this employee');
    }

    if (req.status === 'CANCELLED' || req.status === 'COMPLETED') {
      throw new BadRequestException(`Request is already in terminal state ${req.status}`);
    }

    // Calculate hours remaining until scheduled shift
    const scheduledDateTime = new Date(`${req.scheduledDate.toISOString().split('T')[0]}T${req.shiftTime}:00`);
    const hoursRemaining = (scheduledDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursRemaining < this.RESCHEDULE_CUTOFF_HOURS) {
      throw new BadRequestException(
        `Modification locked: Rescheduling and cancellations must be submitted at least ${this.RESCHEDULE_CUTOFF_HOURS} hours prior to scheduled shift (only ${hoursRemaining.toFixed(1)}h remaining).`,
      );
    }

    if (dto.action === 'CANCEL') {
      const updated = await this.db.corporateTransportRequest.update({
        where: { id: requestId },
        data: { status: 'CANCELLED' },
      });

      // If already attached to a route stop, mark stop CANCELLED
      await this.db.corporateRouteStop.updateMany({
        where: { transportRequestId: requestId },
        data: { status: 'CANCELLED' },
      });

      this.logger.log(`Request ${requestId} cancelled with >9h advance notice`);
      return updated;
    } else {
      if (!dto.newShiftTime) {
        throw new BadRequestException('newShiftTime is required for shift rescheduling');
      }

      const updated = await this.db.corporateTransportRequest.update({
        where: { id: requestId },
        data: {
          shiftTime: dto.newShiftTime,
          status: 'RESCHEDULED',
        },
      });

      this.logger.log(`Request ${requestId} rescheduled to shift ${dto.newShiftTime}`);
      return updated;
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
