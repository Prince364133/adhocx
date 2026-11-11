import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { GoogleRoutesV2Adapter, RouteCoord } from './google-routes-v2.adapter';

export interface RouteDirectionLegDto {
  legIndex: number;
  fromStopId: string;
  fromSequence: number;
  fromType: string;
  fromLabel: string;
  fromAddress: string;
  fromLat: number;
  fromLng: number;
  fromPhone?: string | null;
  toStopId: string;
  toSequence: number;
  toType: string;
  toLabel: string;
  toAddress: string;
  toLat: number;
  toLng: number;
  toPhone?: string | null;
  dwellBufferSeconds: number;
  trafficDurationSeconds: number;
  trafficDurationMinutes: number;
  distanceMeters: number;
  distanceKm: number;
  plannedArrivalAtFrom?: string;
  plannedDepartFrom?: string;
  estimatedArrivalAtTo?: string;
}

export interface RouteDirectionsResult {
  routeId: string;
  trafficSource: 'GOOGLE_MAPS_LIVE_TRAFFIC' | 'ROAD_FACTOR_ESTIMATE';
  isRealRoad: boolean;
  totalDurationSeconds: number;
  totalDurationMinutes: number;
  totalDwellSeconds: number;
  totalTravelWithWaitMinutes: number;
  totalDistanceMeters: number;
  totalDistanceKm: number;
  encodedPolyline: string;
  decodedPath: Array<{ lat: number; lng: number }>;
  pathTuples: Array<[number, number]>;
  legs: RouteDirectionLegDto[];
  refreshedAt: string;
}

@Injectable()
export class CorporateRouteDirectionsService {
  private readonly logger = new Logger(CorporateRouteDirectionsService.name);
  private readonly CACHE_TTL_SECONDS = 180;

  constructor(
    private readonly db: DatabaseService,
    private readonly routesAdapter: GoogleRoutesV2Adapter,
    @Optional() private readonly redis?: RedisService,
  ) {}

  /**
   * Computes live-traffic turn/leg directions and road polyline for a committed route
   * using Google Maps Routes v2 API (`TRAFFIC_AWARE_OPTIMAL`) with short-lived Redis cache.
   */
  public async getDirectionsForRoute(routeId: string, forceRefresh = false): Promise<RouteDirectionsResult> {
    const cacheKey = `corp:route:dir:${routeId}`;
    if (!forceRefresh && this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as RouteDirectionsResult;
        }
      } catch (err: any) {
        this.logger.warn(`Redis read failed for ${cacheKey}: ${err?.message}`);
      }
    }

    const route = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      include: {
        office: { select: { id: true, name: true, addressText: true, latitude: true, longitude: true } },
        stops: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                fullName: true,
                phoneNumber: true,
                locations: {
                  where: { isDefault: true },
                  take: 1,
                  select: { addressText: true },
                },
              },
            },
          },
          orderBy: { stopSequence: 'asc' },
        },
      },
    });

    if (!route) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }

    const result = await this.computeFromRouteRecord(route);

    if (this.redis) {
      try {
        await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL_SECONDS);
      } catch (err: any) {
        this.logger.warn(`Redis write failed for ${cacheKey}: ${err?.message}`);
      }
    }

    return result;
  }

  public async computeFromRouteRecord(route: any): Promise<RouteDirectionsResult> {
    const rawStops: any[] = [...(route.stops ?? [])].sort((a, b) => a.stopSequence - b.stopSequence);

    // Build chronological waypoints including office if stops did not append one
    const waypoints: Array<{
      id: string;
      sequence: number;
      type: string;
      label: string;
      address: string;
      phone?: string | null;
      lat: number;
      lng: number;
      dwellBufferSeconds: number;
      plannedEta?: Date;
    }> = rawStops.map((s) => {
      const emp = s.employee || {};
      const isOfficeStop = s.stopType === 'DROPOFF' && !s.employeeId && !s.employeeName;
      return {
        id: s.id,
        sequence: s.stopSequence,
        type: s.stopType,
        label: isOfficeStop
          ? route.office?.name || 'Corporate Office Hub'
          : s.employeeName || emp.fullName || `Stop ${s.stopSequence}`,
        address: isOfficeStop
          ? route.office?.addressText || route.office?.name || s.addressText || 'Office Destination'
          : s.addressText || emp.locations?.[0]?.addressText || `Stop ${s.stopSequence}`,
        phone: s.employeePhone || emp.phoneNumber || null,
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        dwellBufferSeconds: Number(s.dwellBufferSeconds ?? (s.stopType === 'PICKUP' ? 600 : 0)),
        plannedEta: s.plannedEta ? new Date(s.plannedEta) : undefined,
      };
    });

    const hasOfficeWaypoint = waypoints.some(
      (w) => w.type === 'DROPOFF' && route.office && w.label === (route.office.name || 'Corporate Office Hub'),
    );
    if (!hasOfficeWaypoint && route.office?.latitude != null && route.office?.longitude != null) {
      waypoints.push({
        id: `office-${route.office.id}`,
        sequence: waypoints.length + 1,
        type: route.direction === 'LOGOUT' ? 'PICKUP' : 'DROPOFF',
        label: route.office.name || 'Corporate Office Hub',
        address: route.office.addressText || route.office.name || 'Corporate Office',
        phone: null,
        lat: Number(route.office.latitude),
        lng: Number(route.office.longitude),
        dwellBufferSeconds: 0,
        plannedEta: route.targetOfficeArrivalTime ? new Date(route.targetOfficeArrivalTime) : undefined,
      });
    }

    if (waypoints.length < 2) {
      const single = waypoints[0];
      const pathPoint = single ? [{ lat: single.lat, lng: single.lng }] : [];
      return {
        routeId: route.id,
        trafficSource: 'ROAD_FACTOR_ESTIMATE',
        isRealRoad: false,
        totalDurationSeconds: Number(route.estDurationSeconds ?? 0),
        totalDurationMinutes: Number((Number(route.estDurationSeconds ?? 0) / 60).toFixed(1)),
        totalDwellSeconds: single?.dwellBufferSeconds ?? 0,
        totalTravelWithWaitMinutes: Number((Number(route.estDurationSeconds ?? 0) / 60).toFixed(1)),
        totalDistanceMeters: Number(route.estDistanceMeters ?? 0),
        totalDistanceKm: Number((Number(route.estDistanceMeters ?? 0) / 1000).toFixed(2)),
        encodedPolyline: '',
        decodedPath: pathPoint,
        pathTuples: pathPoint.map((p) => [p.lat, p.lng]),
        legs: [],
        refreshedAt: new Date().toISOString(),
      };
    }

    const origin: RouteCoord = { lat: waypoints[0].lat, lng: waypoints[0].lng };
    const destination: RouteCoord = {
      lat: waypoints[waypoints.length - 1].lat,
      lng: waypoints[waypoints.length - 1].lng,
    };
    const intermediates: RouteCoord[] = waypoints.slice(1, -1).map((w) => ({ lat: w.lat, lng: w.lng }));

    // Google Routes v2 TRAFFIC_AWARE_OPTIMAL rejects timestamps in the past; use now + 2m for live conditions.
    const scheduledStart = route.targetPickup1Time ? new Date(route.targetPickup1Time) : new Date();
    const minFutureDeparture = new Date(Date.now() + 120_000);
    const apiDepartureTime =
      scheduledStart.getTime() > minFutureDeparture.getTime() ? scheduledStart : minFutureDeparture;

    const computed = await this.routesAdapter.computeRoute(
      origin,
      intermediates,
      destination,
      apiDepartureTime,
      { routingPreference: 'TRAFFIC_AWARE_OPTIMAL' },
    );

    const legs: RouteDirectionLegDto[] = [];
    let totalDwellSeconds = 0;
    let runningClock = waypoints[0].plannedEta
      ? new Date(waypoints[0].plannedEta.getTime())
      : new Date(scheduledStart.getTime());

    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i];
      const to = waypoints[i + 1];
      const rawLeg = computed.legs[i];
      const legDurationSec = Math.max(
        60,
        Math.round(rawLeg?.durationSeconds ?? computed.durationSeconds / Math.max(1, waypoints.length - 1)),
      );
      const legDistanceMeters = Math.max(
        50,
        Math.round(rawLeg?.distanceMeters ?? computed.distanceMeters / Math.max(1, waypoints.length - 1)),
      );

      const arrivalFrom = from.plannedEta ? new Date(from.plannedEta.getTime()) : new Date(runningClock.getTime());
      const departFrom = new Date(arrivalFrom.getTime() + from.dwellBufferSeconds * 1000);
      const estArrivalTo = new Date(departFrom.getTime() + legDurationSec * 1000);

      totalDwellSeconds += from.dwellBufferSeconds;
      runningClock = estArrivalTo;

      legs.push({
        legIndex: i + 1,
        fromStopId: from.id,
        fromSequence: from.sequence,
        fromType: from.type,
        fromLabel: from.label,
        fromAddress: from.address,
        fromLat: from.lat,
        fromLng: from.lng,
        fromPhone: from.phone,
        toStopId: to.id,
        toSequence: to.sequence,
        toType: to.type,
        toLabel: to.label,
        toAddress: to.address,
        toLat: to.lat,
        toLng: to.lng,
        toPhone: to.phone,
        dwellBufferSeconds: from.dwellBufferSeconds,
        trafficDurationSeconds: legDurationSec,
        trafficDurationMinutes: Number((legDurationSec / 60).toFixed(1)),
        distanceMeters: legDistanceMeters,
        distanceKm: Number((legDistanceMeters / 1000).toFixed(2)),
        plannedArrivalAtFrom: arrivalFrom.toISOString(),
        plannedDepartFrom: departFrom.toISOString(),
        estimatedArrivalAtTo: estArrivalTo.toISOString(),
      });
    }

    const totalDurationSeconds = computed.durationSeconds || legs.reduce((acc, l) => acc + l.trafficDurationSeconds, 0);
    const totalDistanceMeters = computed.distanceMeters || legs.reduce((acc, l) => acc + l.distanceMeters, 0);
    const decodedPath = (computed.decodedPath || []).map(([lat, lng]) => ({ lat, lng }));

    return {
      routeId: route.id,
      trafficSource: computed.isRealRoad ? 'GOOGLE_MAPS_LIVE_TRAFFIC' : 'ROAD_FACTOR_ESTIMATE',
      isRealRoad: computed.isRealRoad,
      totalDurationSeconds,
      totalDurationMinutes: Number((totalDurationSeconds / 60).toFixed(1)),
      totalDwellSeconds,
      totalTravelWithWaitMinutes: Number(((totalDurationSeconds + totalDwellSeconds) / 60).toFixed(1)),
      totalDistanceMeters,
      totalDistanceKm: Number((totalDistanceMeters / 1000).toFixed(2)),
      encodedPolyline: computed.encodedPolyline || '',
      decodedPath,
      pathTuples: computed.decodedPath || [],
      legs,
      refreshedAt: new Date().toISOString(),
    };
  }
}
