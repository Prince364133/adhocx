import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  RouteOptimizationOptions,
  RouteOptimizationSummary,
  OptimizedRouteResult,
  OptimizedStopResult,
  VehicleCategory,
} from './routing.types';

@Injectable()
export class RouteSolverService {
  private readonly logger = new Logger(RouteSolverService.name);

  // Constants per PRD specs
  private readonly DEFAULT_SEDAN_CAPACITY = 4;
  private readonly DEFAULT_SUV_CAPACITY = 6;
  private readonly STOP_DWELL_SECONDS = 300; // 5.0 minutes buffer per stop
  private readonly OFFICE_ARRIVAL_BUFFER_MINUTES = 10; // Arrive 10m before shift login
  private readonly AVERAGE_URBAN_SPEED_KMH = 30; // 30 km/h average speed
  private readonly ROAD_TORTUOSITY_FACTOR = 1.25; // Real-world road distance multiplier

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

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

    // Fetch unassigned approved transport requests for this shift
    const requests = await this.db.corporateTransportRequest.findMany({
      where: {
        tenantId,
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

    // Compute route plans in-memory using CVRPTW heuristic
    const plannedRoutes =
      direction === 'LOGIN'
        ? this.solveLoginCommute(requests, officeLat, officeLng, shiftDate, shiftTime, maxCapacity, vehicleCategory, officeBufferMinutes)
        : this.solveLogoutCommute(requests, officeLat, officeLng, shiftDate, shiftTime, maxCapacity, vehicleCategory);

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

  /**
   * Solves LOGIN routes: Home Pickups -> Office Hub.
   * Uses spatial clustering + nearest-neighbor corridor routing.
   * Stop 1 is farthest pickup, intermediate stops pick up en route, final stop is office.
   */
  private solveLoginCommute(
    requests: any[],
    officeLat: number,
    officeLng: number,
    shiftDate: string,
    shiftTime: string,
    maxCapacity: number,
    vehicleCategory: VehicleCategory,
    officeBufferMinutes: number,
  ): OptimizedRouteResult[] {
    // 1. Calculate distance to office for each request
    const pool = requests.map((req) => {
      const pLat = Number(req.pickupLat);
      const pLng = Number(req.pickupLng);
      const distToOffice = this.haversineDistanceMeters(pLat, pLng, officeLat, officeLng);

      return {
        req,
        distToOffice,
        pLat,
        pLng,
        assigned: false,
      };
    });

    const clusters: (typeof pool)[] = [];

    // 2. Nearest-Neighbor Cluster Formation:
    // Seed each vehicle with the unassigned passenger farthest from office,
    // then greedy add the nearest unassigned neighbors until maxCapacity is reached.
    while (pool.some((p) => !p.assigned)) {
      const unassigned = pool.filter((p) => !p.assigned);
      // Farthest unassigned passenger as seed
      unassigned.sort((a, b) => b.distToOffice - a.distToOffice);
      const seed = unassigned[0];
      seed.assigned = true;

      const currentCluster = [seed];

      while (currentCluster.length < maxCapacity) {
        const remaining = pool.filter((p) => !p.assigned);
        if (remaining.length === 0) break;

        const lastStop = currentCluster[currentCluster.length - 1];

        // Find closest remaining passenger to the last added stop
        let closestCandidate = remaining[0];
        let minDistance = this.haversineDistanceMeters(
          lastStop.pLat,
          lastStop.pLng,
          closestCandidate.pLat,
          closestCandidate.pLng,
        );

        for (let i = 1; i < remaining.length; i++) {
          const candidate = remaining[i];
          const dist = this.haversineDistanceMeters(
            lastStop.pLat,
            lastStop.pLng,
            candidate.pLat,
            candidate.pLng,
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestCandidate = candidate;
          }
        }

        closestCandidate.assigned = true;
        currentCluster.push(closestCandidate);
      }

      clusters.push(currentCluster);
    }

    // 3. Calculate timing and sequence for each route
    const [shiftHour] = shiftTime.split(':').map(Number);
    const officeArrivalDate = new Date(`${shiftDate}T${shiftTime}:00`);
    // Arrive officeBufferMinutes early (e.g. 10m before shift)
    officeArrivalDate.setMinutes(officeArrivalDate.getMinutes() - officeBufferMinutes);

    const routes: OptimizedRouteResult[] = [];

    for (let rIdx = 0; rIdx < clusters.length; rIdx++) {
      const cluster = clusters[rIdx];

      // Sort stops inside cluster: Farthest from office is Stop 1 (pickup 1)
      cluster.sort((a, b) => b.distToOffice - a.distToOffice);

      // Night shift female safety check: If shift is late night/early morning and female passenger present
      const isNightShift = shiftHour < 6 || shiftHour >= 20;
      if (isNightShift && cluster.length > 1) {
        const firstIsFemale = cluster[0].req.employee?.gender === 'FEMALE';
        const hasMale = cluster.some((c) => c.req.employee?.gender === 'MALE');
        if (firstIsFemale && hasMale) {
          const maleIdx = cluster.findIndex((c) => c.req.employee?.gender === 'MALE');
          if (maleIdx > 0 && Math.abs(cluster[0].distToOffice - cluster[maleIdx].distToOffice) < 3000) {
            const [malePax] = cluster.splice(maleIdx, 1);
            cluster.unshift(malePax);
          }
        }
      }

      // Calculate driving distances and times between consecutive stops
      let totalDrivingSeconds = 0;
      let totalDistanceMeters = 0;
      const legDurations: number[] = [];

      for (let i = 0; i < cluster.length; i++) {
        if (i === 0) {
          legDurations.push(0);
        } else {
          const legDist =
            this.haversineDistanceMeters(
              cluster[i - 1].pLat,
              cluster[i - 1].pLng,
              cluster[i].pLat,
              cluster[i].pLng,
            ) * this.ROAD_TORTUOSITY_FACTOR;

          const legSeconds = Math.round((legDist / (this.AVERAGE_URBAN_SPEED_KMH * 1000)) * 3600);
          totalDistanceMeters += Math.round(legDist);
          totalDrivingSeconds += legSeconds;
          legDurations.push(legSeconds);
        }
      }

      // Last leg: From last pickup stop to Office Hub
      const lastPickup = cluster[cluster.length - 1];
      const officeLegDist =
        this.haversineDistanceMeters(lastPickup.pLat, lastPickup.pLng, officeLat, officeLng) *
        this.ROAD_TORTUOSITY_FACTOR;
      const officeLegSeconds = Math.round((officeLegDist / (this.AVERAGE_URBAN_SPEED_KMH * 1000)) * 3600);
      totalDistanceMeters += Math.round(officeLegDist);
      totalDrivingSeconds += officeLegSeconds;

      // Total dwell time: 300s (5m) for each pickup stop
      const totalDwellSeconds = cluster.length * this.STOP_DWELL_SECONDS;
      const totalRouteSeconds = totalDrivingSeconds + totalDwellSeconds;

      // Work backwards from targetOfficeArrivalTime to find targetPickup1Time
      const targetPickup1Time = new Date(officeArrivalDate.getTime() - totalRouteSeconds * 1000);

      // Build ordered route stops
      const stops: OptimizedStopResult[] = [];
      let currentStopEta = new Date(targetPickup1Time);

      for (let i = 0; i < cluster.length; i++) {
        const item = cluster[i];

        if (i > 0) {
          const deltaMs = (this.STOP_DWELL_SECONDS + legDurations[i]) * 1000;
          currentStopEta = new Date(currentStopEta.getTime() + deltaMs);
        }

        stops.push({
          stopSequence: i + 1,
          stopType: 'PICKUP',
          transportRequestId: item.req.id,
          employeeId: item.req.employeeId,
          employeeCode: item.req.employee?.employeeCode,
          fullName: item.req.employee?.fullName,
          gender: item.req.employee?.gender,
          phoneNumber: item.req.employee?.phoneNumber,
          latitude: item.pLat,
          longitude: item.pLng,
          addressText: item.req.employee?.homeAddress || `Stop ${i + 1}`,
          plannedEta: new Date(currentStopEta),
          boardingOtp: this.generateNumericOtp(),
          dwellBufferSeconds: this.STOP_DWELL_SECONDS,
        });
      }

      // Final stop: Office Hub arrival
      stops.push({
        stopSequence: cluster.length + 1,
        stopType: 'DROPOFF',
        latitude: officeLat,
        longitude: officeLng,
        addressText: 'Corporate Office Hub',
        plannedEta: new Date(officeArrivalDate),
        boardingOtp: '------',
        dwellBufferSeconds: 0,
      });

      routes.push({
        routeIndex: rIdx + 1,
        vehicleCategory,
        maxCapacity,
        passengerCount: cluster.length,
        targetPickup1Time,
        targetOfficeArrivalTime: officeArrivalDate,
        estDistanceMeters: totalDistanceMeters,
        estDurationSeconds: totalRouteSeconds,
        stops,
      });
    }

    return routes;
  }

  /**
   * Solves LOGOUT routes: Office Hub -> Home Drops.
   * Stop 1 is Office Hub, subsequent stops drop off employees in nearest-neighbor sequence.
   */
  private solveLogoutCommute(
    requests: any[],
    officeLat: number,
    officeLng: number,
    shiftDate: string,
    shiftTime: string,
    maxCapacity: number,
    vehicleCategory: VehicleCategory,
  ): OptimizedRouteResult[] {
    const pool = requests.map((req) => {
      const dLat = Number(req.dropoffLat);
      const dLng = Number(req.dropoffLng);
      const distFromOffice = this.haversineDistanceMeters(officeLat, officeLng, dLat, dLng);

      return {
        req,
        distFromOffice,
        dLat,
        dLng,
        assigned: false,
      };
    });

    const clusters: (typeof pool)[] = [];

    while (pool.some((p) => !p.assigned)) {
      const unassigned = pool.filter((p) => !p.assigned);
      unassigned.sort((a, b) => a.distFromOffice - b.distFromOffice);
      const seed = unassigned[0];
      seed.assigned = true;

      const currentCluster = [seed];

      while (currentCluster.length < maxCapacity) {
        const remaining = pool.filter((p) => !p.assigned);
        if (remaining.length === 0) break;

        const lastDrop = currentCluster[currentCluster.length - 1];

        let closestCandidate = remaining[0];
        let minDistance = this.haversineDistanceMeters(
          lastDrop.dLat,
          lastDrop.dLng,
          closestCandidate.dLat,
          closestCandidate.dLng,
        );

        for (let i = 1; i < remaining.length; i++) {
          const candidate = remaining[i];
          const dist = this.haversineDistanceMeters(
            lastDrop.dLat,
            lastDrop.dLng,
            candidate.dLat,
            candidate.dLng,
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestCandidate = candidate;
          }
        }

        closestCandidate.assigned = true;
        currentCluster.push(closestCandidate);
      }

      clusters.push(currentCluster);
    }

    const officeDepartureDate = new Date(`${shiftDate}T${shiftTime}:00`);
    const routes: OptimizedRouteResult[] = [];

    for (let rIdx = 0; rIdx < clusters.length; rIdx++) {
      const cluster = clusters[rIdx];

      cluster.sort((a, b) => a.distFromOffice - b.distFromOffice);

      const [shiftHour] = shiftTime.split(':').map(Number);
      const isNightShift = shiftHour >= 20 || shiftHour < 6;
      if (isNightShift && cluster.length > 1) {
        const lastIsFemale = cluster[cluster.length - 1].req.employee?.gender === 'FEMALE';
        const hasMale = cluster.some((c) => c.req.employee?.gender === 'MALE');
        if (lastIsFemale && hasMale) {
          const maleIdx = cluster.findIndex((c) => c.req.employee?.gender === 'MALE');
          if (maleIdx >= 0) {
            const [lastFemale] = cluster.splice(cluster.length - 1, 1);
            cluster.splice(maleIdx, 0, lastFemale);
          }
        }
      }

      let totalDrivingSeconds = 0;
      let totalDistanceMeters = 0;
      const legDurations: number[] = [];

      // Leg 1: Office to Drop 1
      const leg1Dist =
        this.haversineDistanceMeters(officeLat, officeLng, cluster[0].dLat, cluster[0].dLng) *
        this.ROAD_TORTUOSITY_FACTOR;
      const leg1Seconds = Math.round((leg1Dist / (this.AVERAGE_URBAN_SPEED_KMH * 1000)) * 3600);
      totalDistanceMeters += Math.round(leg1Dist);
      totalDrivingSeconds += leg1Seconds;
      legDurations.push(leg1Seconds);

      // Subsequent legs between drops
      for (let i = 1; i < cluster.length; i++) {
        const legDist =
          this.haversineDistanceMeters(
            cluster[i - 1].dLat,
            cluster[i - 1].dLng,
            cluster[i].dLat,
            cluster[i].dLng,
          ) * this.ROAD_TORTUOSITY_FACTOR;
        const legSeconds = Math.round((legDist / (this.AVERAGE_URBAN_SPEED_KMH * 1000)) * 3600);
        totalDistanceMeters += Math.round(legDist);
        totalDrivingSeconds += legSeconds;
        legDurations.push(legSeconds);
      }

      const totalDwellSeconds = cluster.length * this.STOP_DWELL_SECONDS;
      const totalRouteSeconds = totalDrivingSeconds + totalDwellSeconds;

      // Ordered stops
      const stops: OptimizedStopResult[] = [];

      // Stop 1 is Office Hub pickup
      stops.push({
        stopSequence: 1,
        stopType: 'PICKUP',
        latitude: officeLat,
        longitude: officeLng,
        addressText: 'Corporate Office Hub',
        plannedEta: new Date(officeDepartureDate),
        boardingOtp: '------',
        dwellBufferSeconds: 0,
      });

      let currentStopEta = new Date(officeDepartureDate);

      for (let i = 0; i < cluster.length; i++) {
        const item = cluster[i];
        const deltaMs = (legDurations[i] + (i > 0 ? this.STOP_DWELL_SECONDS : 0)) * 1000;
        currentStopEta = new Date(currentStopEta.getTime() + deltaMs);

        stops.push({
          stopSequence: i + 2,
          stopType: 'DROPOFF',
          transportRequestId: item.req.id,
          employeeId: item.req.employeeId,
          employeeCode: item.req.employee?.employeeCode,
          fullName: item.req.employee?.fullName,
          gender: item.req.employee?.gender,
          phoneNumber: item.req.employee?.phoneNumber,
          latitude: item.dLat,
          longitude: item.dLng,
          addressText: item.req.employee?.homeAddress || `Drop ${i + 1}`,
          plannedEta: new Date(currentStopEta),
          boardingOtp: this.generateNumericOtp(),
          dwellBufferSeconds: this.STOP_DWELL_SECONDS,
        });
      }

      routes.push({
        routeIndex: rIdx + 1,
        vehicleCategory,
        maxCapacity,
        passengerCount: cluster.length,
        targetPickup1Time: officeDepartureDate,
        targetOfficeArrivalTime: officeDepartureDate,
        estDistanceMeters: totalDistanceMeters,
        estDurationSeconds: totalRouteSeconds,
        stops,
      });
    }

    return routes;
  }

  // --- Spatial Math Helpers ---

  private haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
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

  private generateNumericOtp(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
}
