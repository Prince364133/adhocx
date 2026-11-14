import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { istWallClockToUtc } from '../replanning/cutoff-policy';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  RouteOptimizationOptions,
  RouteOptimizationSummary,
  OptimizedRouteResult,
  OptimizedStopResult,
  RouteOptimizationBatchSummary,
  RouteOptimizationDirectionOutcome,
  VehicleCategory,
} from './routing.types';
import { calculateTierMaxSeats } from '../../../modules/pricing/pricing.service';
import { ITravelTimeMatrixPort, TRAVEL_TIME_MATRIX_PORT } from './travel-time-matrix.port';
import { HaversineTravelTimeMatrix } from './haversine-travel-time-matrix';
import { CorporateRoutePlanner, PlannerPassenger, PlanResult } from './corporate-route-planner';

@Injectable()
export class RouteSolverService {
  private readonly logger = new Logger(RouteSolverService.name);

  private readonly DEFAULT_STOP_DWELL_MINUTES = 5;
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
    options: RouteOptimizationOptions & { direction: 'LOGIN' | 'LOGOUT' },
    actorUserId?: string,
  ): Promise<RouteOptimizationSummary>;
  public async optimizeAndCreateRoutes(
    options: RouteOptimizationOptions & { direction: 'BOTH' },
    actorUserId?: string,
  ): Promise<RouteOptimizationBatchSummary>;
  public async optimizeAndCreateRoutes(
    options: RouteOptimizationOptions,
    actorUserId?: string,
  ): Promise<RouteOptimizationSummary | RouteOptimizationBatchSummary>;
  public async optimizeAndCreateRoutes(
    options: RouteOptimizationOptions,
    actorUserId?: string,
  ): Promise<RouteOptimizationSummary | RouteOptimizationBatchSummary> {
    if (options.direction === 'BOTH') {
      return this.optimizeBothDirections(options, actorUserId);
    }

    const {
      tenantId,
      officeId,
      shiftDate,
      direction,
      vehicleCategory = 'ALL',
      officeBufferMinutes = this.OFFICE_ARRIVAL_BUFFER_MINUTES,
      maxRideTimeMinutes = this.DEFAULT_MAX_RIDE_MINUTES,
      logoutReportingBufferMinutes = this.LOGOUT_REPORTING_BUFFER_MINUTES,
    } = options;
    const stopDwellMinutes = options.stopDwellMinutes ?? this.DEFAULT_STOP_DWELL_MINUTES;
    if (!Number.isInteger(stopDwellMinutes) || stopDwellMinutes < 1 || stopDwellMinutes > 10) {
      throw new BadRequestException('stopDwellMinutes must be an integer between 1 and 10');
    }
    // Keep service-level compatibility for internal legacy callers; the HTTP controller requires direction-specific times.
    const shiftTime = (direction === 'LOGIN' ? options.loginTime : options.logoutTime) ?? options.shiftTime;
    if (!shiftTime) {
      throw new BadRequestException(`${direction} optimization requires its direction-specific time`);
    }
    const categoryRows = await this.db.vehiclePricingTier.findMany({
      where: { isActive: true },
      orderBy: { vehicleType: 'asc' },
      select: { vehicleType: true, seatingCapacity: true },
    });
    const activeCategories = categoryRows
      .filter((category) => category.vehicleType?.trim())
      .map((category) => ({
        vehicleType: category.vehicleType.trim().toUpperCase(),
        capacity: calculateTierMaxSeats(category.vehicleType, category.seatingCapacity),
      }));
    if (activeCategories.length === 0) {
      throw new BadRequestException('No active vehicle categories are configured');
    }
    const requestedCategory = vehicleCategory.trim().toUpperCase();
    const selectedCategories =
      requestedCategory === 'ALL' || requestedCategory === 'BOTH'
        ? activeCategories
        : activeCategories.filter((category) => category.vehicleType === requestedCategory);
    if (selectedCategories.length === 0) {
      throw new BadRequestException(`Vehicle category '${requestedCategory}' is not active in the vehicle catalogue`);
    }
    const categoryCapacity = Math.max(...selectedCategories.map((category) => category.capacity));
    if (options.maxCapacity != null && (!Number.isInteger(options.maxCapacity) || options.maxCapacity < 1)) {
      throw new BadRequestException('maxCapacity must be a positive integer');
    }
    if (options.maxCapacity != null && options.maxCapacity > categoryCapacity) {
      throw new BadRequestException('maxCapacity cannot exceed the selected vehicle category capacity');
    }
    const maxCapacity = options.maxCapacity ?? categoryCapacity;

    const office = await this.db.corporateOffice.findFirst({
      where: { id: officeId, tenantId, isActive: true },
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
        vehicleCategoryCounts: {},
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
      selectedCategories,
      officeBufferMinutes,
      maxRideTimeMinutes,
      logoutReportingBufferMinutes,
      {
        routingPreference: options.routingPreference,
        avoidTolls: options.avoidTolls,
        avoidHighways: options.avoidHighways,
      },
      stopDwellMinutes * 60,
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

          // Mark transport request as PLANNED. The status guard makes a concurrent optimize run that
          // already claimed this request fail (P2025) and roll back instead of double-assigning it.
          if (stop.transportRequestId) {
            try {
              await tx.corporateTransportRequest.update({
                where: { id: stop.transportRequestId, status: 'APPROVED' },
                data: { status: 'PLANNED' },
              });
            } catch (error: any) {
              if (error?.code === 'P2025') {
                throw new ConflictException(
                  `Transport request ${stop.transportRequestId} was already planned by another optimization run; retry to plan the remaining requests`,
                );
              }
              throw error;
            }
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
      vehicleCategoryCounts: createdRoutesSummary.reduce<Record<string, number>>((counts, route) => {
        counts[route.vehicleCategory] = (counts[route.vehicleCategory] || 0) + 1;
        return counts;
      }, {}),
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

  private async optimizeBothDirections(
    options: RouteOptimizationOptions,
    actorUserId?: string,
  ): Promise<RouteOptimizationBatchSummary> {
    const plans: RouteOptimizationDirectionOutcome[] = [];
    for (const direction of ['LOGIN', 'LOGOUT'] as const) {
      const shiftTime = direction === 'LOGIN'
        ? options.loginTime
        : options.logoutTime;
      if (!shiftTime) {
        plans.push({
          direction,
          shiftTime: '',
          success: false,
          error: `${direction} optimization requires its direction-specific time`,
        });
        continue;
      }
      try {
        const summary = await this.optimizeAndCreateRoutes(
          { ...options, direction, shiftTime },
          actorUserId,
        );
        plans.push({ direction, shiftTime, success: true, summary });
      } catch (error) {
        plans.push({
          direction,
          shiftTime,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      direction: 'BOTH',
      plans,
      totalRequestsEvaluated: plans.reduce((sum, plan) => sum + (plan.summary?.totalRequestsEvaluated ?? 0), 0),
      routesCreated: plans.reduce((sum, plan) => sum + (plan.summary?.routesCreated ?? 0), 0),
      vehicleCategoryCounts: plans.reduce<Record<string, number>>((counts, plan) => {
        for (const [category, count] of Object.entries(plan.summary?.vehicleCategoryCounts ?? {})) {
          counts[category] = (counts[category] || 0) + count;
        }
        return counts;
      }, {}),
      passengersAssigned: plans.reduce((sum, plan) => sum + (plan.summary?.passengersAssigned ?? 0), 0),
      unassignedRequests: plans.reduce((sum, plan) => sum + (plan.summary?.unassignedRequests ?? 0), 0),
    };
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
    selectedCategories: Array<{ vehicleType: string; capacity: number }>,
    officeBufferMinutes: number,
    maxRideTimeMinutes: number,
    logoutReportingBufferMinutes: number,
    routingOptions: {
      routingPreference?: RouteOptimizationOptions['routingPreference'];
      avoidTolls?: boolean;
      avoidHighways?: boolean;
    },
    stopDwellSeconds: number,
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
      dwellSeconds: stopDwellSeconds,
      officeBufferMinutes,
      logoutReportingBufferMinutes,
      maxRideTimeSeconds: maxRideTimeMinutes * 60,
      nightShift: shiftHour < 6 || shiftHour >= 20,
      routingOptions,
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
          dwellBufferSeconds: stopDwellSeconds,
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
      const requestedCategory = vehicleCategory.trim().toUpperCase();
      const routeCategory = selectedCategories.find((category) => category.vehicleType === requestedCategory)
        ?? selectedCategories
          .filter((category) => category.capacity >= r.passengers.length)
          .sort((left, right) => left.capacity - right.capacity)[0];
      if (!routeCategory) {
        throw new BadRequestException(`No active vehicle category has enough seats for route ${rIdx + 1}`);
      }
      const categoryCapacity = routeCategory.capacity;
      const routeCapacity = Math.min(maxCapacity, categoryCapacity);
      if (r.passengers.length > routeCapacity) {
        throw new BadRequestException(
          `Route ${rIdx + 1} has ${r.passengers.length} passengers but ${routeCategory} capacity is ${routeCapacity}`,
        );
      }
      const result: OptimizedRouteResult = {
        routeIndex: rIdx + 1,
        vehicleCategory: routeCategory.vehicleType,
        maxCapacity: routeCapacity,
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
