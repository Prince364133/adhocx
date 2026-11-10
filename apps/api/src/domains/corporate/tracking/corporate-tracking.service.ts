import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { CorporateGpsIngestService } from './corporate-gps-ingest.service';
import type { LiveVehicleTelemetryPayload } from '@adhocx/contracts';
import {
  toLiveTelemetry,
  classifyGpsFreshness,
  PlaybackPoint,
  RoutePlaybackView,
  RouteTimelineView,
  RouteTrackingView,
  TimelineItem,
  TrackingPosition,
  TripTelemetryKeys,
  ACTIVE_TRIP_STATUSES,
} from './tracking.types';

/** Caller scope resolved by the controller. ADMIN: no tenant restriction. */
export interface TrackingScope {
  tenantId?: string | null;
}

export const PLAYBACK_DEFAULT_LIMIT = 1000;
export const PLAYBACK_MAX_LIMIT = 5000;
export const PLAYBACK_MAX_WINDOW_MS = 24 * 3_600_000;
export const PLAYBACK_DEFAULT_WINDOW_MS = 6 * 3_600_000;
export const TIMELINE_MAX_ITEMS = 1000;

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function parseInstant(raw: string | undefined, name: string): Date | undefined {
  if (raw === undefined || raw === '') return undefined;
  const d = /^\d+$/.test(raw) ? new Date(Number(raw)) : new Date(raw);
  if (!Number.isFinite(d.getTime())) throw new BadRequestException(`${name} must be an ISO-8601 timestamp or epoch ms`);
  return d;
}

/** Opaque keyset cursor over (recordedAt, id). */
export function encodePlaybackCursor(recordedAt: Date, id: bigint | string): string {
  return Buffer.from(`${recordedAt.getTime()}:${String(id)}`).toString('base64url');
}

export function decodePlaybackCursor(cursor: string): { recordedAt: Date; id: bigint } {
  try {
    const [ms, id] = Buffer.from(cursor, 'base64url').toString('utf8').split(':');
    if (!/^\d+$/.test(ms) || !/^\d+$/.test(id)) throw new Error('bad');
    return { recordedAt: new Date(Number(ms)), id: BigInt(id) };
  } catch {
    throw new BadRequestException('Invalid playback cursor');
  }
}

/**
 * Read side of WS-B: live tracking with GPS freshness, trip timeline and GPS playback.
 * Every query is pinned to the route's own tenant; a caller scoped to another tenant gets 404
 * (defence in depth behind CorporateAccessGuard).
 */
@Injectable()
export class CorporateTrackingService {
  constructor(
    private readonly db: DatabaseService,
    private readonly gpsIngest: CorporateGpsIngestService,
  ) {}

  /** Tenant of a route in scope (404 otherwise); picks the live channel for a route stream. */
  async getRouteTenantId(routeId: string, scope: TrackingScope = {}): Promise<string> {
    return (await this.loadRoute(routeId, scope)).tenantId;
  }

  private async loadRoute(routeId: string, scope: TrackingScope) {
    const route: any = await this.db.corporateRoute.findUnique({
      where: { id: routeId },
      select: { id: true, tenantId: true, status: true, driverId: true },
    });
    if (!route || (scope.tenantId && route.tenantId !== scope.tenantId)) {
      throw new NotFoundException(`Corporate route ${routeId} not found`);
    }
    return route as { id: string; tenantId: string; status: string; driverId: string | null };
  }

  /**
   * Latest known position of every active route in scope, for hydrating a live map before the
   * stream delivers new fixes. Routes without a cached fix are omitted (never a guessed position).
   */
  async getFleetSnapshot(scope: TrackingScope = {}, now: Date = new Date()): Promise<LiveVehicleTelemetryPayload[]> {
    const tenantScoped = 'tenantId' in scope;
    const routes: any[] = await this.db.corporateRoute.findMany({
      where: {
        status: { in: ['DISPATCHING', 'ASSIGNED', 'IN_TRANSIT'] as any },
        ...(tenantScoped ? { tenantId: scope.tenantId ?? '__none__' } : {}),
      },
      select: {
        id: true,
        tenantId: true,
        status: true,
        driverId: true,
        driver: { select: { fullName: true } },
        vehicle: { select: { registrationNumber: true } },
      },
      take: 5000,
    });
    const fixes = await this.gpsIngest.readLatestMany(routes.map((r) => r.id));
    const out: LiveVehicleTelemetryPayload[] = [];
    for (const r of routes) {
      const fix = fixes.get(r.id);
      if (fix) {
        out.push(
          toLiveTelemetry(
            { ...r, driverName: r.driver?.fullName ?? null, vehicleNumber: r.vehicle?.registrationNumber ?? null },
            fix,
            now,
          ),
        );
      }
    }
    // On-demand trips have no corporate tenant: only unscoped (ops/admin) callers ever see them.
    if (!tenantScoped) out.push(...(await this.activeTripSnapshot(now)));
    return out;
  }

  /**
   * Last known position of every active on-demand trip: the `trip:telemetry:{id}` cache written by
   * TripsService.updateLocation, else the driver row's last persisted position. Trips with neither
   * are omitted (never a guessed position).
   */
  private async activeTripSnapshot(now: Date): Promise<LiveVehicleTelemetryPayload[]> {
    if (typeof this.db.trip?.findMany !== 'function') return [];
    let trips: any[];
    try {
      trips = await this.db.trip.findMany({
        where: { status: { in: [...ACTIVE_TRIP_STATUSES] as any } },
        select: {
          id: true,
          status: true,
          driverId: true,
          driver: { select: { fullName: true, vehiclePlate: true, currentLat: true, currentLng: true, lastLocationAt: true } },
          vehicle: { select: { registrationNumber: true } },
        },
        take: 5000,
      });
    } catch {
      return [];
    }
    if (!trips.length) return [];
    const cached = await this.gpsIngest.readRawMany(trips.map((t) => TripTelemetryKeys.latest(t.id)));
    const out: LiveVehicleTelemetryPayload[] = [];
    for (const t of trips) {
      const driverName = t.driver?.fullName || undefined;
      const vehicleNumber = t.vehicle?.registrationNumber || t.driver?.vehiclePlate || undefined;
      const raw = cached.get(TripTelemetryKeys.latest(t.id));
      let live: LiveVehicleTelemetryPayload | null = null;
      if (raw) {
        try {
          const p = JSON.parse(raw);
          if (Number.isFinite(p?.lat) && Number.isFinite(p?.lng) && Number.isFinite(p?.recordedAt)) live = p;
        } catch {
          // fall back to the driver row
        }
      }
      if (!live) {
        const lat = toNum(t.driver?.currentLat);
        const lng = toNum(t.driver?.currentLng);
        const at = t.driver?.lastLocationAt ? new Date(t.driver.lastLocationAt).getTime() : NaN;
        if (lat === null || lng === null || !Number.isFinite(at)) continue;
        live = { routeId: t.id, tripId: t.id, driverId: t.driverId ?? '', lat, lng, speedKph: 0, heading: 0, recordedAt: at, gpsState: 'OFFLINE' };
      }
      out.push({
        ...live,
        routeId: t.id,
        tripId: t.id,
        kind: 'TRIP',
        driverId: live.driverId || t.driverId || '',
        ...(driverName ? { driverName } : {}),
        ...(vehicleNumber ? { vehicleNumber } : {}),
        status: t.status,
        gpsState: classifyGpsFreshness(live.recordedAt, now).gpsState,
      });
    }
    return out;
  }

  async getTracking(routeId: string, scope: TrackingScope = {}, now: Date = new Date()): Promise<RouteTrackingView> {
    const route = await this.loadRoute(routeId, scope);

    let position: TrackingPosition | null = null;
    let source: RouteTrackingView['source'] = 'NONE';

    const cached = await this.gpsIngest.readLatest(routeId);
    if (cached) {
      const speed = toNum(cached.speedMps);
      position = {
        lat: Number(cached.latitude),
        lng: Number(cached.longitude),
        speedKph: speed === null ? null : Math.round(speed * 36) / 10,
        heading: toNum(cached.headingDeg),
        accuracyM: toNum(cached.accuracyM),
        batteryPct: toNum(cached.batteryPct),
        recordedAt: new Date(cached.recordedAt),
        driverId: cached.driverId ?? route.driverId ?? null,
      };
      source = 'CACHE';
    } else {
      // Cache expired: last persisted fix of the past day (received_at bound prunes partitions).
      const row: any = await this.db.corporateVehiclePosition.findFirst({
        where: { routeId, tenantId: route.tenantId, receivedAt: { gte: new Date(now.getTime() - 86_400_000) } },
        orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      });
      if (row) {
        position = this.toPosition(row);
        source = 'HISTORY';
      }
    }

    const freshness = classifyGpsFreshness(position?.recordedAt ?? null, now);
    return {
      routeId,
      routeStatus: route.status,
      driverId: route.driverId,
      ...freshness,
      isLive: freshness.gpsState === 'LIVE',
      position,
      source,
      asOf: now,
    };
  }

  async getTimeline(routeId: string, scope: TrackingScope = {}): Promise<RouteTimelineView> {
    const route = await this.loadRoute(routeId, scope);
    const where = { routeId, tenantId: route.tenantId };
    const [events, assignments] = await Promise.all([
      this.db.corporateTripEvent.findMany({
        where,
        orderBy: [{ at: 'asc' }, { id: 'asc' }],
        take: TIMELINE_MAX_ITEMS + 1,
      }),
      this.db.corporateRouteAssignmentEvent.findMany({
        where,
        orderBy: [{ at: 'asc' }, { id: 'asc' }],
        take: TIMELINE_MAX_ITEMS + 1,
      }),
    ]);

    const eventItems: TimelineItem[] = (events as any[]).slice(0, TIMELINE_MAX_ITEMS).map((e) => ({
      kind: 'TRIP_EVENT',
      id: String(e.id),
      at: e.at,
      type: e.type,
      stopId: e.stopId,
      actorId: e.actorId,
      actorRole: e.actorRole,
      payload: e.payload,
    }));
    const assignmentItems: TimelineItem[] = (assignments as any[]).slice(0, TIMELINE_MAX_ITEMS).map((a) => ({
      kind: 'ASSIGNMENT',
      id: String(a.id),
      at: a.at,
      type: a.reason,
      actorId: a.actorId,
      fromDriverId: a.fromDriverId,
      toDriverId: a.toDriverId,
    }));

    // Stable merge: by time, then trip events before assignment rows, then insertion order (id).
    const items = [...eventItems, ...assignmentItems].sort((a, b) => {
      const dt = new Date(a.at).getTime() - new Date(b.at).getTime();
      if (dt !== 0) return dt;
      if (a.kind !== b.kind) return a.kind === 'TRIP_EVENT' ? -1 : 1;
      const ia = BigInt(a.id);
      const ib = BigInt(b.id);
      return ia < ib ? -1 : ia > ib ? 1 : 0;
    });

    return {
      routeId,
      items,
      assignmentHistory: assignmentItems,
      truncated: events.length > TIMELINE_MAX_ITEMS || assignments.length > TIMELINE_MAX_ITEMS,
    };
  }

  async getPlayback(
    routeId: string,
    query: { from?: string; to?: string; limit?: string | number; cursor?: string },
    scope: TrackingScope = {},
    now: Date = new Date(),
  ): Promise<RoutePlaybackView> {
    const route = await this.loadRoute(routeId, scope);

    const to = parseInstant(query.to, 'to') ?? now;
    const from = parseInstant(query.from, 'from') ?? new Date(to.getTime() - PLAYBACK_DEFAULT_WINDOW_MS);
    if (from.getTime() >= to.getTime()) throw new BadRequestException('from must be before to');
    if (to.getTime() - from.getTime() > PLAYBACK_MAX_WINDOW_MS) {
      throw new BadRequestException('Playback window is limited to 24 hours; page through longer trips');
    }

    const rawLimit = query.limit === undefined || query.limit === '' ? PLAYBACK_DEFAULT_LIMIT : Number(query.limit);
    if (!Number.isInteger(rawLimit) || rawLimit < 1) throw new BadRequestException('limit must be a positive integer');
    const limit = Math.min(rawLimit, PLAYBACK_MAX_LIMIT);
    const after = query.cursor ? decodePlaybackCursor(query.cursor) : null;

    const recordedAtRange = { gte: from, lte: to };
    const rows: any[] = await this.db.corporateVehiclePosition.findMany({
      where: {
        routeId,
        tenantId: route.tenantId,
        // received_at >= recorded_at (ingest clamp) => this bound is exact and prunes partitions.
        receivedAt: { gte: from },
        recordedAt: recordedAtRange,
        ...(after
          ? {
              OR: [
                { recordedAt: { gt: after.recordedAt } },
                { recordedAt: after.recordedAt, id: { gt: after.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    const points: PlaybackPoint[] = page.map((r) => ({ id: String(r.id), ...this.toPosition(r) }));
    const last = page[page.length - 1];
    return {
      routeId,
      from,
      to,
      points,
      nextCursor: rows.length > limit && last ? encodePlaybackCursor(new Date(last.recordedAt), last.id) : null,
    };
  }

  private toPosition(row: any): TrackingPosition {
    return {
      lat: Number(row.lat),
      lng: Number(row.lng),
      speedKph: toNum(row.speedKph),
      heading: toNum(row.heading),
      accuracyM: toNum(row.accuracyM),
      batteryPct: toNum(row.batteryPct),
      recordedAt: new Date(row.recordedAt),
      driverId: row.driverId ?? null,
    };
  }
}
