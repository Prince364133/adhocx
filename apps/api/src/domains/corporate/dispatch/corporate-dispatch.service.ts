import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Optional,
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

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly locationsService: LocationsService,
    @Optional() private readonly riderNotifier?: CorporateRiderNotifier,
  ) {}

  /**
   * Evaluates Dynamic Traffic Advancer (DDA) for a scheduled corporate route.
   * If traffic congestion delay >= 30 minutes, automatically advances dispatch time.
   */
  public async assessDynamicTraffic(routeId: string): Promise<TrafficAdvancerResult> {
    const route = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: { orderBy: { stopSequence: 'asc' } },
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }

    const pickup1Time = new Date(route.targetPickup1Time);
    const isLogout = route.direction === 'LOGOUT';
    const effectiveTargetTime = isLogout
      ? new Date(pickup1Time.getTime() - this.LOGOUT_STAGING_LEAD_MINUTES * 60 * 1000)
      : pickup1Time;

    const standardDispatchTime = new Date(
      effectiveTargetTime.getTime() - this.STANDARD_DISPATCH_LEAD_MINUTES * 60 * 1000,
    );

    // Heuristic traffic assessment based on peak rush hour windows in Hyderabad
    // Peak morning: 08:00 - 10:00 (Heavy traffic starts ~07:00)
    // Peak evening: 17:00 - 20:00 (Heavy traffic starts ~16:30)
    const pickupHour = pickup1Time.getHours();
    let congestionLevel: 'NORMAL' | 'MODERATE' | 'SEVERE' = 'NORMAL';
    let delayMinutes = 0;
    let reason = 'Traffic conditions are optimal along route corridor';

    const isMorningPeak = pickupHour >= 7 && pickupHour <= 9;
    const isEveningPeak = pickupHour >= 17 && pickupHour <= 19;

    if (route.estDistanceMeters > 30000 && (isMorningPeak || isEveningPeak)) {
      // Long distance (>30km) during peak commute hours
      congestionLevel = 'SEVERE';
      delayMinutes = 35; // 35 minutes predicted congestion delay
      reason = 'Severe peak-hour arterial corridor congestion detected on ORR/Cyberabad stretch';
    } else if (isMorningPeak || isEveningPeak) {
      congestionLevel = 'MODERATE';
      delayMinutes = 15;
      reason = 'Moderate peak-hour flow detected; traffic buffer recommended';
    }

    const isAdvanced = delayMinutes >= 30;
    const adjustedDispatchTime = isAdvanced
      ? new Date(standardDispatchTime.getTime() - delayMinutes * 60 * 1000)
      : standardDispatchTime;

    return {
      routeId,
      originalPickup1Time: pickup1Time,
      standardDispatchTime,
      adjustedDispatchTime,
      trafficDelayMinutes: delayMinutes,
      isAdvanced,
      congestionLevel,
      reason,
    };
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
      // Update route status to DISPATCHING
      await this.db.corporateRoute.update({
        where: { id: routeId },
        data: { status: 'DISPATCHING' },
      });

      // Retrieve drivers who already rejected this route offer
      const rejectedDriverIds = await this.redis.getClient()?.smembers(`corporate:rejected:${routeId}`) || [];

      // Phase 1: Search in primary 5 km radius
      let candidateDrivers = await this.findEligibleDrivers(
        originLat,
        originLng,
        this.PRIMARY_SEARCH_RADIUS_KM,
        route.vehicleCategory,
        rejectedDriverIds,
      );

      let currentRadius = this.PRIMARY_SEARCH_RADIUS_KM;

      // Phase 2: If no drivers found within 5 km, expand to 10 km radius
      if (candidateDrivers.length === 0) {
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
      }

      if (candidateDrivers.length === 0) {
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

      // Pick top-ranked candidate closest to origin
      const selectedDriver = candidateDrivers[0];

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
      const client = this.redis.getClient();
      if (client) {
        await client.set(
          `corporate:route:offer:${routeId}`,
          JSON.stringify(offerData),
          'EX',
          this.OFFER_TTL_SECONDS,
        );
        await client.sadd('corporate:active_offers_set', routeId);
        await client.set(
          `corporate:offer_driver:${routeId}`,
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
      const rawOffer = client ? await client.get(`corporate:route:offer:${routeId}`) : null;

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

      // Update route to ASSIGNED and link driver & vehicle
      const updatedRoute = await this.db.corporateRoute.update({
        where: { id: routeId },
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
        await client.del(`corporate:route:offer:${routeId}`);
        await client.srem('corporate:active_offers_set', routeId);
        await client.del(`corporate:offer_driver:${routeId}`);
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
      await client.sadd(`corporate:rejected:${routeId}`, driverId);
      await client.expire(`corporate:rejected:${routeId}`, 86400); // 24h retention
      await client.del(`corporate:route:offer:${routeId}`);
      await client.srem('corporate:active_offers_set', routeId);
      await client.del(`corporate:offer_driver:${routeId}`);
    }

    this.logger.log(
      `Driver ${driverId} rejected route ${routeId} (Reason: ${reason || 'NONE'}). Cascading to next candidate...`,
    );

    // Cascade to next driver
    await this.dispatchRoute(routeId, false);
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
