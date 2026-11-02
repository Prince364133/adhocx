import {
  Inject,
  Injectable,
  Logger,
  Optional,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { NotificationsService } from '../../../modules/notifications/notifications.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { LocationsService } from '../../../modules/locations/locations.service';
import { CorporateRiderNotifier } from '../execution/corporate-rider-notifier.service';
import {
  CorporateRouteOfferData,
  TrafficAdvancerResult,
  CorporateDispatchWaveResult,
} from './corporate-dispatch.types';
import {
  ITrafficEstimatorPort,
  TRAFFIC_ESTIMATOR_PORT,
  TrafficRouteEstimate,
  TrafficWaypoint,
} from './traffic/traffic-estimator.port';
import { heuristicTrafficDelay } from './traffic/heuristic-traffic';

function envPositiveNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw !== undefined && raw !== '' ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Redis key layout shared by the dispatch service and the scheduler / reaper. */
export const CorporateDispatchKeys = {
  ACTIVE_OFFERS_SET: 'corporate:active_offers_set',
  offer: (routeId: string) => `corporate:route:offer:${routeId}`,
  offerDriver: (routeId: string) => `corporate:offer_driver:${routeId}`,
  rejected: (routeId: string) => `corporate:rejected:${routeId}`,
  unserved: (routeId: string) => `corporate:unserved:${routeId}`,
  driverHold: (driverId: string) => `corporate:driver:offer_hold:${driverId}`,
};

/** After a "no supply within 10 km" result, wait this long before the recovery sweep retries. */
export const CORPORATE_DISPATCH_UNSERVED_RETRY_SECONDS = 300;
/** After an "all candidates busy" result, retry sooner: busy drivers free up within ~60s. */
export const CORPORATE_DISPATCH_BUSY_RETRY_SECONDS = 60;

@Injectable()
export class CorporateDispatchService {
  private readonly logger = new Logger(CorporateDispatchService.name);

  // Constants per PRD specification
  private readonly STANDARD_DISPATCH_LEAD_MINUTES = 60; // 1 hour before pickup 1
  private readonly LOGOUT_STAGING_LEAD_MINUTES = 15; // Cab at office 15m prior to logout
  private readonly PRIMARY_SEARCH_RADIUS_KM = 5; // 5 km primary radius
  private readonly EXPANDED_SEARCH_RADIUS_KM = 10; // 10 km expanded radius
  private readonly OFFER_TTL_SECONDS = 60; // 60 seconds atomic offer countdown
  private readonly BASE_FARE_PAISE = 30000; // ₹300 base fare (in paise)
  private readonly RATE_PER_KM_PAISE = 2000; // ₹20/km (in paise)
  private readonly STOP_DWELL_SECONDS = 300; // 5-minute boarding buffer per pickup
  private readonly MODERATE_DELAY_MINUTES = 10; // congestion label only; does not advance dispatch
  /** DDA advances dispatch when traffic delay >= this many minutes (env CORPORATE_DDA_ADVANCE_THRESHOLD_MINUTES). */
  private readonly ddaAdvanceThresholdMinutes = envPositiveNumber('CORPORATE_DDA_ADVANCE_THRESHOLD_MINUTES', 30);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly locationsService: LocationsService,
    @Optional()
    @Inject(TRAFFIC_ESTIMATOR_PORT)
    private readonly trafficEstimator?: ITrafficEstimatorPort,
    @Optional() private readonly riderNotifier?: CorporateRiderNotifier,
  ) {}

  /**
   * Dynamic Dispatch Advancer (DDA) for a scheduled corporate route.
   *
   * Asks the traffic estimator (Google Routes, traffic-aware for the planned departure; heuristic
   * fallback) for the drive time of the full multi-stop route and derives
   *   delay = durationInTraffic - staticDuration.
   * When delay >= CORPORATE_DDA_ADVANCE_THRESHOLD_MINUTES (default 30):
   *  - LOGIN: pickup-1 moves earlier so the cab still reaches office by the login anchor:
   *      pickup1 = officeArrival - max(plannedDrive + delay, googleTrafficDrive) - 5 min x pickups
   *    and dispatch = pickup1 - 60 min. Google-sourced advances are persisted (route pickup-1 and
   *    pickup stop ETAs), never moving a time later than what is already stored.
   *  - LOGOUT: office departure is fixed by the shift; only dispatch is advanced by the delay.
   */
  public async assessDynamicTraffic(routeId: string): Promise<TrafficAdvancerResult> {
    const route: any = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: { orderBy: { stopSequence: 'asc' } },
        office: true,
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }

    const isLogout = route.direction === 'LOGOUT';
    const stops: any[] = Array.isArray(route.stops) ? route.stops : [];
    const storedPickup1 = new Date(route.targetPickup1Time);
    const officeArrival = route.targetOfficeArrivalTime ? new Date(route.targetOfficeArrivalTime) : null;
    const estDurationSec = Number(route.estDurationSeconds) || 0;

    // Pickups that each carry a 5-minute dwell (LOGIN: employee homes; LOGOUT: none before office leg)
    const dwellStops = isLogout ? 0 : stops.filter((s) => s.stopType !== 'DROPOFF').length;
    const dwellSec = dwellStops * this.STOP_DWELL_SECONDS;

    // Stable planning anchor (idempotent across polls even after pickup-1 has been persisted earlier)
    const plannedPickup1 =
      !isLogout && officeArrival && estDurationSec > 0
        ? new Date(officeArrival.getTime() - estDurationSec * 1000)
        : storedPickup1;
    const plannedDriveSec = estDurationSec > 0 ? Math.max(0, estDurationSec - dwellSec) : undefined;

    const estimate = await this.estimateTraffic(
      this.buildTrafficWaypoints(route, stops, isLogout),
      plannedPickup1,
      { distanceMetersHint: Number(route.estDistanceMeters) || 0, staticDurationSecHint: plannedDriveSec },
    );

    const delaySec = Math.max(0, estimate.durationInTrafficSec - estimate.staticDurationSec);
    const delayMinutes = Math.round(delaySec / 60);
    const thresholdMinutes = this.ddaAdvanceThresholdMinutes;
    const isAdvanced = delaySec >= thresholdMinutes * 60;
    const congestionLevel: TrafficAdvancerResult['congestionLevel'] = isAdvanced
      ? 'SEVERE'
      : delayMinutes >= this.MODERATE_DELAY_MINUTES
        ? 'MODERATE'
        : 'NORMAL';

    const lead = (t: Date) =>
      new Date(
        t.getTime() -
          ((isLogout ? this.LOGOUT_STAGING_LEAD_MINUTES : 0) + this.STANDARD_DISPATCH_LEAD_MINUTES) * 60_000,
      );
    const standardDispatchTime = lead(plannedPickup1);

    let adjustedPickup1 = plannedPickup1;
    let adjustedDispatchTime: Date;
    let persisted = false;

    if (isLogout) {
      adjustedDispatchTime = isAdvanced
        ? new Date(standardDispatchTime.getTime() - delaySec * 1000)
        : standardDispatchTime;
    } else {
      if (isAdvanced) {
        if (officeArrival && plannedDriveSec !== undefined) {
          const requiredDriveSec = Math.max(plannedDriveSec + delaySec, estimate.durationInTrafficSec);
          adjustedPickup1 = new Date(officeArrival.getTime() - (requiredDriveSec + dwellSec) * 1000);
        } else {
          adjustedPickup1 = new Date(plannedPickup1.getTime() - delaySec * 1000);
        }
      }
      // Never move a pickup later than what has already been persisted/communicated.
      if (storedPickup1.getTime() < adjustedPickup1.getTime()) {
        adjustedPickup1 = storedPickup1;
      }
      adjustedDispatchTime = lead(adjustedPickup1);

      if (
        isAdvanced &&
        estimate.source === 'GOOGLE' &&
        storedPickup1.getTime() - adjustedPickup1.getTime() >= 60_000
      ) {
        persisted = await this.persistAdvancedPickup(route, stops, storedPickup1, adjustedPickup1, delayMinutes);
      }
    }

    const fmt = (d: Date) => d.toISOString().substring(11, 16);
    let reason: string;
    if (estimate.source === 'HEURISTIC') {
      reason = heuristicTrafficDelay(Number(route.estDistanceMeters) || 0, plannedPickup1).reason;
    } else if (isAdvanced) {
      reason =
        `Google traffic forecast +${delayMinutes}m (in-traffic ${Math.round(estimate.durationInTrafficSec / 60)}m vs ` +
        `free-flow ${Math.round(estimate.staticDurationSec / 60)}m); dispatch advanced to ${fmt(adjustedDispatchTime)}Z`;
    } else {
      reason = `Google traffic forecast +${delayMinutes}m is below the ${thresholdMinutes}m advance threshold`;
    }

    if (isAdvanced) {
      this.logger.log(
        `[DDA] Route ${routeId} advanced: +${delayMinutes}m (${estimate.source}); ` +
          `pickup-1 ${fmt(plannedPickup1)}Z -> ${fmt(adjustedPickup1)}Z, dispatch ${fmt(adjustedDispatchTime)}Z`,
      );
    }

    return {
      routeId,
      originalPickup1Time: plannedPickup1,
      standardDispatchTime,
      adjustedDispatchTime,
      trafficDelayMinutes: delayMinutes,
      isAdvanced,
      congestionLevel,
      reason,
      adjustedPickup1Time: adjustedPickup1,
      trafficSource: estimate.source,
      durationInTrafficSeconds: estimate.durationInTrafficSec,
      staticDurationSeconds: estimate.staticDurationSec,
      persisted,
    };
  }

  /** Ordered route geometry: LOGIN pickups -> office, LOGOUT office -> drops. */
  private buildTrafficWaypoints(route: any, stops: any[], isLogout: boolean): TrafficWaypoint[] {
    const points: TrafficWaypoint[] = stops
      .filter((s) => s.latitude !== undefined && s.longitude !== undefined)
      .map((s) => ({ latitude: Number(s.latitude), longitude: Number(s.longitude) }));
    const office =
      route.office && route.office.latitude !== undefined
        ? { latitude: Number(route.office.latitude), longitude: Number(route.office.longitude) }
        : null;
    const hasOfficeStop = isLogout
      ? stops[0]?.stopType === 'PICKUP' && stops.length > 0 && stops.slice(1).every((s) => s.stopType === 'DROPOFF')
      : stops[stops.length - 1]?.stopType === 'DROPOFF';
    if (office && !hasOfficeStop) {
      if (isLogout) points.unshift(office);
      else points.push(office);
    }
    return points;
  }

  private async estimateTraffic(
    waypoints: TrafficWaypoint[],
    departureTime: Date,
    hints: { distanceMetersHint: number; staticDurationSecHint?: number },
  ): Promise<TrafficRouteEstimate> {
    if (this.trafficEstimator) {
      try {
        return await this.trafficEstimator.estimateRouteDuration(waypoints, departureTime, hints);
      } catch (err: any) {
        this.logger.warn(`[DDA] Traffic estimator failed (${err?.message ?? err}); using heuristic`);
      }
    }
    const staticDurationSec = hints.staticDurationSecHint ?? 0;
    const { delayMinutes } = heuristicTrafficDelay(hints.distanceMetersHint, departureTime);
    return {
      durationInTrafficSec: staticDurationSec + delayMinutes * 60,
      staticDurationSec,
      distanceMeters: hints.distanceMetersHint,
      source: 'HEURISTIC',
    };
  }

  /** Writes the advanced pickup-1 and shifts pickup stop ETAs by the same amount (office ETA unchanged). */
  private async persistAdvancedPickup(
    route: any,
    stops: any[],
    storedPickup1: Date,
    adjustedPickup1: Date,
    delayMinutes: number,
  ): Promise<boolean> {
    const shiftMs = adjustedPickup1.getTime() - storedPickup1.getTime();
    try {
      const ops: any[] = [
        this.db.corporateRoute.update({
          where: { id: route.id },
          data: { targetPickup1Time: adjustedPickup1 },
        }),
      ];
      for (const s of stops) {
        if (s.stopType === 'DROPOFF' || !s.id || !s.plannedEta) continue;
        ops.push(
          this.db.corporateRouteStop.update({
            where: { id: s.id },
            data: { plannedEta: new Date(new Date(s.plannedEta).getTime() + shiftMs) },
          }),
        );
      }
      await this.db.$transaction(ops);

      this.notifications.emitEvent('admin:operations', 'CORPORATE_DDA_PICKUP_ADVANCED', {
        routeId: route.id,
        previousPickup1Time: storedPickup1,
        targetPickup1Time: adjustedPickup1,
        trafficDelayMinutes: delayMinutes,
      });
      await this.audit.log({
        action: 'CORPORATE_DDA_PICKUP_ADVANCED',
        actorRole: 'SYSTEM_AUTONOMOUS_DISPATCH',
        entityId: route.id,
        entityType: 'CORPORATE_ROUTE',
        metadata: {
          previousPickup1Time: storedPickup1.toISOString(),
          targetPickup1Time: adjustedPickup1.toISOString(),
          trafficDelayMinutes: delayMinutes,
        },
      });
      return true;
    } catch (err: any) {
      this.logger.error(`[DDA] Failed to persist advanced pickup for route ${route.id}: ${err?.message ?? err}`);
      return false;
    }
  }

  /**
   * Autonomous dispatch trigger for a route.
   * Supports both scheduled automatic invocation and manual Super Admin override ("Start" button).
   */
  public async dispatchRoute(
    routeId: string,
    forceStart: boolean = false,
    actorUserId?: string,
  ): Promise<CorporateDispatchWaveResult> {
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

    if (route.status === 'ASSIGNED' || route.status === 'IN_TRANSIT' || route.status === 'COMPLETED') {
      return {
        routeId,
        waveNumber: 0,
        searchRadiusKm: 0,
        status: 'ALREADY_ASSIGNED',
        offeredToDriverId: route.driverId || undefined,
        candidatesCount: 0,
      };
    }

    // Determine dispatch search coordinates:
    // For LOGIN: Stop 1 pickup coordinate
    // For LOGOUT: Corporate Office coordinate
    let originLat: number;
    let originLng: number;
    let originAddress: string;

    if (route.direction === 'LOGIN') {
      const stop1 = route.stops[0];
      if (!stop1) {
        throw new BadRequestException(`Route ${routeId} has no stops configured`);
      }
      originLat = Number(stop1.latitude);
      originLng = Number(stop1.longitude);
      originAddress = `Stop 1 (First Commuter Pickup)`;
    } else {
      originLat = Number(route.office.latitude);
      originLng = Number(route.office.longitude);
      originAddress = `${route.office.name} (Corporate Staging Bay)`;
    }

    const lockKey = `corporate:dispatch:lock:${routeId}`;
    const lockAcquired = await this.redis.acquireLockToken(lockKey, 30);
    if (!lockAcquired) {
      throw new ConflictException(`Dispatch operation already in progress for route ${routeId}`);
    }

    try {
      const client = this.redis.getClient();

      // Idempotency: a live offer already exists (e.g. manual Start raced the scheduler, or a
      // duplicate job ran). Never issue a second concurrent offer for the same route.
      const existingRaw = client ? await client.get(CorporateDispatchKeys.offer(routeId)) : null;
      if (existingRaw) {
        const existing: CorporateRouteOfferData = JSON.parse(existingRaw);
        return {
          routeId,
          waveNumber: 0,
          searchRadiusKm: 0,
          status: 'OFFERED',
          offeredToDriverId: existing.driverId,
          candidatesCount: 0,
        };
      }

      // Conditional transition (PLANNED|DISPATCHING -> DISPATCHING). Prisma 6 extended
      // where-unique makes this a single atomic UPDATE ... WHERE id = ? AND status IN (...);
      // a route that was assigned/cancelled concurrently is never overwritten.
      try {
        await this.db.corporateRoute.update({
          where: { id: routeId, status: { in: ['PLANNED', 'DISPATCHING'] } },
          data: { status: 'DISPATCHING' },
        });
      } catch (err: any) {
        if (err?.code === 'P2025') {
          return {
            routeId,
            waveNumber: 0,
            searchRadiusKm: 0,
            status: 'ALREADY_ASSIGNED',
            candidatesCount: 0,
          };
        }
        throw err;
      }

      // Retrieve drivers who already rejected this route offer
      const rejectedDriverIds = (await client?.smembers(CorporateDispatchKeys.rejected(routeId))) || [];

      // Phase 1: Search in primary 5 km radius
      let candidateDrivers = await this.findEligibleDrivers(
        originLat,
        originLng,
        this.PRIMARY_SEARCH_RADIUS_KM,
        route.vehicleCategory,
        rejectedDriverIds,
      );

      let currentRadius = this.PRIMARY_SEARCH_RADIUS_KM;
      let busyCandidates = 0;
      const triedIds = new Set<string>();

      // Exclusive driver hold: a driver may hold at most ONE live corporate offer at a time.
      let claim = await this.claimFirstFreeDriver(routeId, candidateDrivers, triedIds);
      busyCandidates += claim.busy;
      let selectedDriver = claim.driver;

      // Phase 2: If no (free) drivers found within 5 km, expand to 10 km radius
      if (!selectedDriver) {
        this.logger.warn(
          `No eligible drivers found within 5 km for route ${routeId}. Expanding search radius to 10 km...`,
        );
        currentRadius = this.EXPANDED_SEARCH_RADIUS_KM;
        candidateDrivers = await this.findEligibleDrivers(
          originLat,
          originLng,
          this.EXPANDED_SEARCH_RADIUS_KM,
          route.vehicleCategory,
          rejectedDriverIds,
        );
        claim = await this.claimFirstFreeDriver(routeId, candidateDrivers, triedIds);
        busyCandidates += claim.busy;
        selectedDriver = claim.driver;
      }

      if (!selectedDriver && busyCandidates > 0) {
        // Supply exists but every candidate is mid-offer for another route. Retry shortly
        // (the scheduler's recovery sweep re-dispatches once the defer marker expires).
        if (client) {
          await client.set(
            CorporateDispatchKeys.unserved(routeId),
            'BUSY',
            'EX',
            CORPORATE_DISPATCH_BUSY_RETRY_SECONDS,
          );
        }
        this.notifications.emitEvent('admin:operations', 'CORPORATE_DISPATCH_DEFERRED', {
          routeId,
          reason: 'All nearby candidates hold another active offer',
          busyCandidates,
        });
        return {
          routeId,
          waveNumber: 1,
          searchRadiusKm: currentRadius,
          status: 'ALL_DRIVERS_BUSY',
          candidatesCount: busyCandidates,
        };
      }

      if (!selectedDriver) {
        if (client) {
          await client.set(
            CorporateDispatchKeys.unserved(routeId),
            'NO_SUPPLY',
            'EX',
            CORPORATE_DISPATCH_UNSERVED_RETRY_SECONDS,
          );
        }
        this.logger.error(
          `Autonomous dispatch exhausted: No available verified drivers found within 10 km for route ${routeId}`,
        );

        // Alert Super Admin Operations
        this.notifications.emitEvent('admin:operations', 'CORPORATE_DISPATCH_UNSERVED', {
          routeId,
          tenantName: route.tenant.name,
          shiftDate: route.shiftDate,
          shiftTime: route.shiftTime,
          direction: route.direction,
          reason: 'No drivers available in 10 km radius',
        });

        return {
          routeId,
          waveNumber: 1,
          searchRadiusKm: currentRadius,
          status: 'NO_DRIVERS_FOUND',
          candidatesCount: 0,
        };
      }

      // Calculate driver guaranteed payout in paise
      const distanceKm = route.estDistanceMeters / 1000;
      const farePaise = Math.round(this.BASE_FARE_PAISE + distanceKm * this.RATE_PER_KM_PAISE);

      const offerExpiresAt = new Date(Date.now() + this.OFFER_TTL_SECONDS * 1000);

      const offerData: CorporateRouteOfferData = {
        routeId: route.id,
        driverId: selectedDriver.id,
        tenantName: route.tenant.name,
        shiftDate: route.shiftDate.toISOString().split('T')[0],
        shiftTime: route.shiftTime,
        direction: route.direction,
        passengerCount: route.assignedPassengerCount,
        totalDistanceMeters: route.estDistanceMeters,
        targetPickup1Time: route.targetPickup1Time,
        farePaise,
        offerExpiresAt,
        stopsCount: route.stops.length,
        originAddress,
        destinationAddress: route.office.name,
      };

      // Store atomic offer in Redis with 60s TTL
      if (client) {
        await client.set(
          CorporateDispatchKeys.offer(routeId),
          JSON.stringify(offerData),
          'EX',
          this.OFFER_TTL_SECONDS,
        );
        await client.sadd(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
        await client.del(CorporateDispatchKeys.unserved(routeId));
        await client.set(
          CorporateDispatchKeys.offerDriver(routeId),
          selectedDriver.id,
          'EX',
          this.OFFER_TTL_SECONDS + 60,
        );
      }

      // Send Realtime WebSocket Event + FCM Push to Driver
      this.notifications.emitEvent(`driver:${selectedDriver.id}`, 'CORPORATE_ROUTE_OFFER', offerData);

      if (selectedDriver.userId) {
        await this.notifications.sendPushToUser(selectedDriver.userId, {
          title: '🚖 New Corporate Route Assigned!',
          body: `Corporate Commute (${route.direction}): ${route.assignedPassengerCount} passengers, ₹${(farePaise / 100).toFixed(0)} payout. Tap to accept within 60s!`,
          data: {
            routeId: route.id,
            action: 'CORPORATE_ROUTE_OFFER',
            expiresAt: offerExpiresAt.toISOString(),
          },
        });
      }

      await this.audit.log({
        action: forceStart ? 'CORPORATE_DISPATCH_FORCE_START' : 'CORPORATE_DISPATCH_TRIGGERED',
        userId: actorUserId,
        actorRole: forceStart ? 'SUPER_ADMIN' : 'SYSTEM_AUTONOMOUS_DISPATCH',
        entityId: routeId,
        entityType: 'CORPORATE_ROUTE',
        metadata: {
          offeredToDriverId: selectedDriver.id,
          driverName: selectedDriver.fullName,
          searchRadiusKm: currentRadius,
          farePaise,
          candidatesCount: candidateDrivers.length,
        },
      });

      return {
        routeId,
        waveNumber: 1,
        searchRadiusKm: currentRadius,
        status: 'OFFERED',
        offeredToDriverId: selectedDriver.id,
        offeredDriverName: selectedDriver.fullName,
        candidatesCount: candidateDrivers.length,
      };
    } finally {
      await this.redis.releaseLockToken(lockKey, lockAcquired);
    }
  }

  /**
   * Driver accepts corporate route offer within the 60-second atomic timer.
   */
  public async acceptRouteOffer(routeId: string, driverId: string): Promise<any> {
    const lockKey = `corporate:dispatch:lock:${routeId}`;
    const lockAcquired = await this.redis.acquireLockToken(lockKey, 15);
    if (!lockAcquired) {
      throw new ConflictException(`Route assignment in progress, please retry`);
    }

    try {
      const client = this.redis.getClient();
      const rawOffer = client ? await client.get(CorporateDispatchKeys.offer(routeId)) : null;

      if (!rawOffer) {
        throw new BadRequestException('Route offer has expired or is no longer valid');
      }

      const offer: CorporateRouteOfferData = JSON.parse(rawOffer);
      if (offer.driverId !== driverId) {
        throw new BadRequestException('This offer was dispatched to another driver');
      }

      const driver = await this.db.driver.findUnique({
        where: { id: driverId },
      });
      if (!driver) {
        throw new NotFoundException(`Driver ${driverId} not found`);
      }

      // Find driver's verified vehicle or fallback to first vehicle
      const vehicle = await this.db.vehicle.findFirst({
        where: { driverId, verificationStatus: 'VERIFIED' },
      });

      // Update route to ASSIGNED and link driver & vehicle. Conditional on DISPATCHING so a
      // route cancelled (or already assigned) concurrently is never double-assigned.
      let updatedRoute: any;
      try {
        updatedRoute = await this.db.corporateRoute.update({
          where: { id: routeId, status: 'DISPATCHING' },
          data: {
            driverId,
            vehicleId: vehicle ? vehicle.id : null,
            status: 'ASSIGNED',
          },
          include: {
            stops: { orderBy: { stopSequence: 'asc' } },
            office: true,
            tenant: true,
          },
        });
      } catch (err: any) {
        if (err?.code === 'P2025') {
          throw new ConflictException(`Route ${routeId} is no longer open for assignment`);
        }
        throw err;
      }

      // Create driver earning record with zero float bugs (integer paise)
      await this.db.corporateDriverEarning.create({
        data: {
          driverId,
          routeId,
          routeFarePaise: BigInt(offer.farePaise),
          approachBonusPaise: BigInt(0),
          tollReimbursementPaise: BigInt(0),
          totalEarnedPaise: BigInt(offer.farePaise),
          payoutStatus: 'UNPAID',
        },
      });

      // Clear active offer in Redis
      if (client) {
        await client.del(CorporateDispatchKeys.offer(routeId));
        await client.srem(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
        await client.del(CorporateDispatchKeys.offerDriver(routeId));
        await this.releaseDriverHold(client, driverId, routeId);
      }

      this.logger.log(`Driver ${driver.fullName} (${driverId}) accepted corporate route ${routeId}`);

      // Emit assignment events
      this.notifications.emitEvent(`driver:${driverId}`, 'CORPORATE_ROUTE_CONFIRMED', {
        routeId,
        status: 'ASSIGNED',
        targetPickup1Time: updatedRoute.targetPickup1Time,
      });

      this.notifications.emitEvent('admin:operations', 'CORPORATE_ROUTE_ASSIGNED', {
        routeId,
        driverId,
        driverName: driver.fullName,
        driverPhone: driver.phone,
        status: 'ASSIGNED',
      });

      // Employees: cab assigned with driver & vehicle details (never throws)
      if (this.riderNotifier) {
        await this.riderNotifier.notifyRouteAssigned(routeId);
      }

      await this.audit.log({
        action: 'CORPORATE_ROUTE_OFFER_ACCEPTED',
        userId: driver.userId,
        actorRole: 'DRIVER',
        entityId: routeId,
        entityType: 'CORPORATE_ROUTE',
        metadata: {
          driverId,
          farePaise: offer.farePaise,
          vehicleId: vehicle?.id,
        },
      });

      return updatedRoute;
    } finally {
      await this.redis.releaseLockToken(lockKey, lockAcquired);
    }
  }

  /**
   * Driver declines corporate route offer or 60s timer expires.
   * Cascades immediately to the next available candidate.
   */
  public async rejectRouteOffer(routeId: string, driverId: string, reason?: string): Promise<void> {
    const client = this.redis.getClient();
    if (client) {
      // Add driver to blacklist for this route
      await client.sadd(CorporateDispatchKeys.rejected(routeId), driverId);
      await client.expire(CorporateDispatchKeys.rejected(routeId), 86400); // 24h retention

      // Stale reject guard: if the live offer now belongs to a different driver (this driver's
      // offer was already reaped and cascaded), only blacklist; never tear down the newer offer.
      const currentDriverId = await this.getCurrentOfferDriverId(client, routeId);
      if (currentDriverId && currentDriverId !== driverId) {
        this.logger.warn(
          `Ignoring stale reject from driver ${driverId} on route ${routeId}; live offer is with ${currentDriverId}`,
        );
        await this.releaseDriverHold(client, driverId, routeId);
        return;
      }

      await client.del(CorporateDispatchKeys.offer(routeId));
      await client.srem(CorporateDispatchKeys.ACTIVE_OFFERS_SET, routeId);
      await client.del(CorporateDispatchKeys.offerDriver(routeId));
      await this.releaseDriverHold(client, driverId, routeId);
    }

    this.logger.log(
      `Driver ${driverId} rejected route ${routeId} (Reason: ${reason || 'NONE'}). Cascading to next candidate...`,
    );

    // Cascade to next driver
    await this.dispatchRoute(routeId, false);
  }

  /**
   * Returns the driver currently holding the live offer for a route (offer payload first,
   * then the longer-lived offer_driver pointer that survives the 60s offer TTL).
   */
  private async getCurrentOfferDriverId(client: any, routeId: string): Promise<string | null> {
    const raw = await client.get(CorporateDispatchKeys.offer(routeId));
    if (raw) {
      try {
        return JSON.parse(raw).driverId ?? null;
      } catch {
        return null;
      }
    }
    return (await client.get(CorporateDispatchKeys.offerDriver(routeId))) || null;
  }

  /**
   * Walks proximity-ordered candidates and claims the first driver without another live offer
   * via SET NX EX on a per-driver hold key. Exactly one route can hold a given driver.
   */
  private async claimFirstFreeDriver(
    routeId: string,
    candidates: any[],
    triedIds: Set<string>,
  ): Promise<{ driver: any | null; busy: number }> {
    const client = this.redis.getClient();
    let busy = 0;
    for (const cand of candidates) {
      if (triedIds.has(cand.id)) continue;
      triedIds.add(cand.id);
      if (!client) return { driver: cand, busy };
      const ok = await client.set(
        CorporateDispatchKeys.driverHold(cand.id),
        routeId,
        'EX',
        this.OFFER_TTL_SECONDS + 5,
        'NX',
      );
      if (ok === 'OK') return { driver: cand, busy };
      // A re-dispatch of the same route may find its own previous hold still present.
      if ((await client.get(CorporateDispatchKeys.driverHold(cand.id))) === routeId) {
        return { driver: cand, busy };
      }
      busy++;
    }
    return { driver: null, busy };
  }

  /**
   * Releases a driver's offer hold only if it still belongs to this route.
   * NOTE: GET+DEL is not atomic; the window only matters if the hold expired and was re-claimed
   * by another route in between, in which case that driver could briefly receive two offers.
   * Swap for a Lua compare-and-delete once RedisService exposes one.
   */
  private async releaseDriverHold(client: any, driverId: string, routeId: string): Promise<void> {
    const key = CorporateDispatchKeys.driverHold(driverId);
    if ((await client.get(key)) === routeId) {
      await client.del(key);
    }
  }

  /**
   * Helper: Searches available, verified drivers within a given radius using LocationsService.
   */
  private async findEligibleDrivers(
    lat: number,
    lng: number,
    radiusKm: number,
    vehicleCategory: string,
    excludeDriverIds: string[] = [],
  ): Promise<any[]> {
    const nearby = await this.locationsService.findNearbyDrivers(lat, lng, radiusKm);
    const excludeSet = new Set(excludeDriverIds);

    const candidateIds = nearby
      .filter((cand) => !excludeSet.has(cand.driverId))
      .map((cand) => cand.driverId);

    if (candidateIds.length === 0) return [];

    const drivers = await this.db.driver.findMany({
      where: {
        id: { in: candidateIds },
        availabilityStatus: 'AVAILABLE',
        verificationStatus: 'VERIFIED',
      },
    });

    const driverMap = new Map(drivers.map((d) => [d.id, d]));

    // Match compatible vehicle category (if specified) and preserve proximity order
    return candidateIds
      .map((id) => driverMap.get(id))
      .filter((d): d is NonNullable<typeof d> => {
        if (!d) return false;
        if (!vehicleCategory) return true;
        if (d.vehicleType) {
          const vType = d.vehicleType.toUpperCase();
          const target = vehicleCategory.toUpperCase();
          return (
            vType.includes(target) ||
            (target === 'SEDAN' && vType.includes('SEDAN')) ||
            (target === 'SUV' && vType.includes('SUV'))
          );
        }
        return true;
      });
  }
}
