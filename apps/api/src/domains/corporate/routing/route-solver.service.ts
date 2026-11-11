import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { istWallClockToUtc } from '../replanning/cutoff-policy';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  RouteOptimizationOptions,
  RouteOptimizationSummary,
  OptimizedRouteResult,
  OptimizedStopResult,
  VehicleCategory,
} from './routing.types';
import { ITravelTimeMatrixPort, TRAVEL_TIME_MATRIX_PORT } from './travel-time-matrix.port';
import { HaversineTravelTimeMatrix } from './haversine-travel-time-matrix';
import { CorporateRoutePlanner, PlannerPassenger, PlanResult } from './corporate-route-planner';

@Injectable()
export class RouteSolverService {
  private readonly logger = new Logger(RouteSolverService.name);

  // Constants per PRD specs
  private readonly DEFAULT_SEDAN_CAPACITY = 3;
  private readonly DEFAULT_SUV_CAPACITY = 6;
  private readonly STOP_DWELL_SECONDS = 300; // 5.0 minutes buffer per stop
  private readonly OFFICE_ARRIVAL_BUFFER_MINUTES = 10; // Arrive 10m before shift login
  private readonly DEFAULT_MAX_RIDE_MINUTES = 120; // Max in-cab time per employee
  private readonly LOGOUT_REPORTING_BUFFER_MINUTES = 15; // Cab at office 15m before logout

  private readonly planner: CorporateRoutePlanner;

  /**
   * @param travelTimeMatrix road travel-time source. Optional so the service can be built
   *   without DI (tests); defaults to the offline haversine estimate.
   */
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    @Optional() @Inject(TRAVEL_TIME_MATRIX_PORT) travelTimeMatrix?: ITravelTimeMatrixPort,
  ) {
    this.planner = new CorporateRoutePlanner(travelTimeMatrix ?? new HaversineTravelTimeMatrix());
  }

  /**
   * Solves and generates optimized corporate commuter routes for a given tenant, office, date, shift, and direction.
   */
  public async optimizeAndCreateRoutes(
    options: RouteOptimizationOptions,
    actorUserId?: string,
  ): Promise<RouteOptimizationSummary> {
    const {
      tenantId,
      officeId,
      shiftDate,
      shiftTime,
      direction,
      vehicleCategory = 'SEDAN',
      officeBufferMinutes = this.OFFICE_ARRIVAL_BUFFER_MINUTES,
      maxRideTimeMinutes = this.DEFAULT_MAX_RIDE_MINUTES,
      logoutReportingBufferMinutes = this.LOGOUT_REPORTING_BUFFER_MINUTES,
    } = options;

    const maxCapacity =
      options.maxCapacity ||
      (vehicleCategory === 'SUV' ? this.DEFAULT_SUV_CAPACITY : this.DEFAULT_SEDAN_CAPACITY);

    const office = await this.db.corporateOffice.findFirst({
      where: { id: officeId, tenantId },
    });
    if (!office) {
      throw new NotFoundException(`Office ${officeId} not found for tenant ${tenantId}`);
    }

    const scheduledDateObj = new Date(shiftDate);

    // Fetch unassigned approved transport requests for this shift and office
    const requests = await this.db.corporateTransportRequest.findMany({
      where: {
        tenantId,
        employee: { officeId },
        scheduledDate: scheduledDateObj,
        shiftTime,
        direction,
        status: 'APPROVED',
      },
      include: {
        employee: true,
      },
    });

    if (requests.length === 0) {
      return {
        tenantId,
        officeId,
        shiftDate,
        shiftTime,
        direction,
        totalRequestsEvaluated: 0,
        routesCreated: 0,
        passengersAssigned: 0,
        unassignedRequests: 0,
        averagePassengersPerRoute: 0,
        estimatedTotalDistanceMeters: 0,
        routes: [],
      };
    }

    this.logger.log(
      `Optimizing routes for ${requests.length} requests (Shift: ${shiftDate} ${shiftTime} ${direction}, Cap: ${maxCapacity})`,
    );

    const officeLat = Number(office.latitude);
    const officeLng = Number(office.longitude);

    // Sweep clustering + exact/2-opt sequencing + local search on road travel times
    const { routes: plannedRoutes, plan } = await this.planRoutes(
      requests,
      direction,
      officeLat,
      officeLng,
      shiftDate,
      shiftTime,
      maxCapacity,
      vehicleCategory,
      officeBufferMinutes,
      maxRideTimeMinutes,
      logoutReportingBufferMinutes,
    );
    if (plan.warnings.length > 0) {
      this.logger.warn(`Route plan warnings (${plan.warnings.length}): ${plan.warnings.slice(0, 5).join(' | ')}`);
    }

    // Persist planned routes and stops in a database transaction
    const createdRoutesSummary = await this.db.$transaction(async (tx) => {
      const persistedRoutes = [];

      for (let i = 0; i < plannedRoutes.length; i++) {
        const routePlan = plannedRoutes[i];

        const createdRoute = await tx.corporateRoute.create({
          data: {
            tenantId,
            officeId,
            shiftDate: scheduledDateObj,
            shiftTime,
            direction,
            vehicleCategory: routePlan.vehicleCategory,
            maxCapacity: routePlan.maxCapacity,
            assignedPassengerCount: routePlan.passengerCount,
            targetPickup1Time: routePlan.targetPickup1Time,
            targetOfficeArrivalTime: routePlan.targetOfficeArrivalTime,
            estDistanceMeters: routePlan.estDistanceMeters,
            estDurationSeconds: routePlan.estDurationSeconds,
            status: 'PLANNED',
          },
        });

        // Insert stops
        for (const stop of routePlan.stops) {
          await tx.corporateRouteStop.create({
            data: {
              routeId: createdRoute.id,
              stopSequence: stop.stopSequence,
              stopType: stop.stopType,
              transportRequestId: stop.transportRequestId,
              employeeId: stop.employeeId,
              latitude: stop.latitude,
              longitude: stop.longitude,
              plannedEta: stop.plannedEta,
              boardingOtp: stop.boardingOtp,
              dwellBufferSeconds: stop.dwellBufferSeconds,
              status: 'PENDING',
            },
          });

          // Mark transport request as PLANNED
          if (stop.transportRequestId) {
            await tx.corporateTransportRequest.update({
              where: { id: stop.transportRequestId },
              data: { status: 'PLANNED' },
            });
          }
        }

        persistedRoutes.push({
          id: createdRoute.id,
          routeIndex: routePlan.routeIndex,
          vehicleCategory: routePlan.vehicleCategory,
          passengerCount: routePlan.passengerCount,
          maxCapacity: routePlan.maxCapacity,
          pickup1Time: routePlan.targetPickup1Time,
          officeArrivalTime: routePlan.targetOfficeArrivalTime,
          distanceMeters: routePlan.estDistanceMeters,
          durationSeconds: routePlan.estDurationSeconds,
        });
      }

      return persistedRoutes;
    });

    const totalDistance = createdRoutesSummary.reduce((sum, r) => sum + r.distanceMeters, 0);
    const assignedPassengers = createdRoutesSummary.reduce((sum, r) => sum + r.passengerCount, 0);

    const summary: RouteOptimizationSummary = {
      tenantId,
      officeId,
      shiftDate,
      shiftTime,
      direction,
      totalRequestsEvaluated: requests.length,
      routesCreated: createdRoutesSummary.length,
      passengersAssigned: assignedPassengers,
      unassignedRequests: requests.length - assignedPassengers,
      averagePassengersPerRoute:
        createdRoutesSummary.length > 0
          ? Number((assignedPassengers / createdRoutesSummary.length).toFixed(2))
          : 0,
      estimatedTotalDistanceMeters: totalDistance,
      travelTimeSource: plan.travelTimeSource,
      warnings: plan.warnings,
      routes: createdRoutesSummary,
    };

    await this.audit.log({
      action: 'CORPORATE_ROUTES_OPTIMIZED',
      userId: actorUserId,
      actorRole: 'CORPORATE_ADMIN',
      entityId: `${tenantId}_${shiftDate}_${shiftTime}`,
      entityType: 'CORPORATE_ROUTE_BATCH',
      metadata: summary as any,
    });

    return summary;
  }

  /** Run the planner and map its output to the persisted route/stop shape. */
  private async planRoutes(
    requests: any[],
    direction: 'LOGIN' | 'LOGOUT',
    officeLat: number,
    officeLng: number,
    shiftDate: string,
    shiftTime: string,
    maxCapacity: number,
    vehicleCategory: VehicleCategory,
    officeBufferMinutes: number,
    maxRideTimeMinutes: number,
    logoutReportingBufferMinutes: number,
  ): Promise<{ routes: OptimizedRouteResult[]; plan: PlanResult }> {
    const isLogin = direction === 'LOGIN';
    const passengers: PlannerPassenger[] = requests.map((req) => ({
      requestId: String(req.id),
      employeeId: req.employeeId,
      latitude: Number(isLogin ? req.pickupLat : req.dropoffLat),
      longitude: Number(isLogin ? req.pickupLng : req.dropoffLng),
      gender: req.employee?.gender,
      payload: req,
    }));

    // Shift times are IST wall-clock, independent of the server's timezone (servers run in UTC).
    const anchorTime = istWallClockToUtc(shiftDate, shiftTime);
    const [shiftHour] = shiftTime.split(':').map(Number);

    const plan = await this.planner.plan({
      direction,
      office: { latitude: officeLat, longitude: officeLng },
      anchorTime,
      capacity: maxCapacity,
      passengers,
      dwellSeconds: this.STOP_DWELL_SECONDS,
      officeBufferMinutes,
      logoutReportingBufferMinutes,
      maxRideTimeSeconds: maxRideTimeMinutes * 60,
      nightShift: shiftHour < 6 || shiftHour >= 20,
    });

    const routes = plan.routes.map((r, rIdx) => {
      const employeeStops: OptimizedStopResult[] = r.passengers.map((p, i) => {
        const req = p.payload;
        return {
          stopSequence: isLogin ? i + 1 : i + 2,
          stopType: isLogin ? 'PICKUP' : 'DROPOFF',
          transportRequestId: req.id,
          employeeId: req.employeeId,
          employeeCode: req.employee?.employeeCode,
          fullName: req.employee?.fullName,
          gender: req.employee?.gender,
          phoneNumber: req.employee?.phoneNumber,
          latitude: p.latitude,
          longitude: p.longitude,
          addressText: req.employee?.homeAddress || `${isLogin ? 'Stop' : 'Drop'} ${i + 1}`,
          plannedEta: r.stopEtas[i],
          boardingOtp: this.generateNumericOtp(),
          dwellBufferSeconds: this.STOP_DWELL_SECONDS,
        };
      });
      const officeStop: OptimizedStopResult = {
        stopSequence: isLogin ? r.passengers.length + 1 : 1,
        stopType: isLogin ? 'DROPOFF' : 'PICKUP',
        latitude: officeLat,
        longitude: officeLng,
        addressText: 'Corporate Office Hub',
        // LOGIN: target office arrival. LOGOUT: cab reporting time at office.
        plannedEta: isLogin ? r.officeTime : r.firstStopTime,
        boardingOtp: '------',
        dwellBufferSeconds: 0,
      };
      const result: OptimizedRouteResult = {
        routeIndex: rIdx + 1,
        vehicleCategory,
        maxCapacity,
        passengerCount: r.passengers.length,
        targetPickup1Time: r.firstStopTime,
        targetOfficeArrivalTime: isLogin ? r.officeTime : r.firstStopTime,
        estDistanceMeters: Math.round(r.distanceMeters),
        estDurationSeconds: Math.round(r.totalSeconds),
        stops: isLogin ? [...employeeStops, officeStop] : [officeStop, ...employeeStops],
      };
      return result;
    });

    return { routes, plan };
  }

  private generateNumericOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
