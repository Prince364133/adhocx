import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { RedisPubSubService } from '../../../redis/redis-pubsub.service';
import { CorporateTelemetryWriter } from './corporate-telemetry-writer.service';
import {
  CorporateGpsKeys,
  GPS_LATEST_TTL_SEC,
  TelemetryChannels,
  toLiveTelemetry,
  GPS_MAX_FUTURE_SKEW_MS,
  GPS_SEEN_TTL_SEC,
  GpsFixRecord,
  GpsIngestOutcome,
  LatestGpsFix,
  GPS_APPLY_LUA,
} from './tracking.types';

/** ioredis custom command registered with defineCommand (EVALSHA, re-loads the script on NOSCRIPT). */
const APPLY_CMD = 'adhocxGpsApply';

export interface GpsIngestRoute {
  id: string;
  tenantId: string;
  driverId?: string | null;
  status?: string | null;
  driverName?: string | null;
  vehicleNumber?: string | null;
}

export interface GpsIngestFix {
  latitude: number;
  longitude: number;
  speedMps?: number;
  headingDeg?: number;
  accuracyM?: number;
  batteryPct?: number;
  /** Device timestamp (ISO string or epoch ms). Server receive time when absent/invalid. */
  recordedAt?: string | number;
}

const finiteOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function parseLatest(raw: string | null): LatestGpsFix | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Number.isFinite(Date.parse(parsed.recordedAt))) return null;
    return parsed as LatestGpsFix;
  } catch {
    return null;
  }
}

/** Device time, clamped so it is never later than the server receive time (+ small skew). */
export function resolveRecordedAt(raw: string | number | undefined, receivedAt: Date): Date {
  if (raw === undefined || raw === null || raw === '') return receivedAt;
  const ms = typeof raw === 'number' ? raw : Date.parse(String(raw));
  if (!Number.isFinite(ms)) return receivedAt;
  if (ms > receivedAt.getTime() + GPS_MAX_FUTURE_SKEW_MS) return receivedAt;
  return new Date(Math.min(ms, receivedAt.getTime()));
}

/**
 * GPS ingest hot path (Redis only, no Postgres):
 *  1. drop device re-uploads of the same fix (SET NX, 10 min);
 *  2. update the latest-position key (`corporate:route:telemetry:{routeId}`) unless the fix is
 *     older than the cached one (out-of-order delivery never moves the live position backwards);
 *  3. XADD the fix to `corporate:gps:stream` (MAXLEN ~) for the batched history writer;
 *  4. publish accepted (in-order) fixes to the live-map channels (fire and forget).
 *
 * Steps 1-3 run as one Lua script (atomic, one round trip) when the client supports custom
 * commands. Without it (Redis Cluster: the keys live in different slots; test fakes) they run as
 * separate commands, where two concurrent fixes for one route can race on step 2.
 * Without Redis the fix goes to the writer's in-process buffer instead.
 */
@Injectable()
export class CorporateGpsIngestService {
  private readonly logger = new Logger(CorporateGpsIngestService.name);
  readonly streamMaxLen: number;
  private warnedNoStream = false;
  /** Clients the Lua command is registered on, and clients where it must not be used. */
  private readonly luaReady = new WeakSet<object>();
  private readonly luaDisabled = new WeakSet<object>();

  constructor(
    private readonly redis: RedisService,
    @Optional() private readonly writer?: CorporateTelemetryWriter,
    @Optional() private readonly pubsub?: RedisPubSubService,
  ) {
    const n = Number(process.env.CORPORATE_GPS_STREAM_MAXLEN);
    // ~25 min of headroom at 670 fixes/s if every writer is down.
    this.streamMaxLen = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1_000_000;
  }

  async ingest(route: GpsIngestRoute, fix: GpsIngestFix, receivedAt: Date = new Date()): Promise<GpsIngestOutcome> {
    const lat = Number(fix.latitude);
    const lng = Number(fix.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new BadRequestException('latitude/longitude out of range');
    }
    const recordedAt = resolveRecordedAt(fix.recordedAt, receivedAt);
    const driverId = route.driverId ?? null;
    const client: any = this.redis.getClient();
    const base = { recordedAt, receivedAt };

    const latest: LatestGpsFix = {
      latitude: lat,
      longitude: lng,
      speedMps: fix.speedMps,
      headingDeg: fix.headingDeg,
      accuracyM: fix.accuracyM,
      batteryPct: fix.batteryPct,
      driverId,
      recordedAt: recordedAt.toISOString(),
      recordedAtMs: recordedAt.getTime(),
      receivedAt: receivedAt.toISOString(),
    };
    const record = driverId ? this.toRecord(route, driverId, lat, lng, fix, recordedAt, receivedAt) : null;

    // Fast path: steps 1-3 in one atomic round trip.
    const applied = await this.applyAtomic(client, route.id, latest, record);
    if (applied) {
      if (applied.status === 0) return { ...base, outOfOrder: false, duplicate: true, persistence: 'NONE' };
      const outOfOrder = applied.status === 2;
      if (!outOfOrder) this.publishLive(route, latest, receivedAt);
      if (!record) return { ...base, outOfOrder, duplicate: false, persistence: 'NONE' };
      if (applied.streamId && applied.streamId !== '!') return { ...base, outOfOrder, duplicate: false, persistence: 'STREAM' };
      this.logger.warn(`XADD to ${CorporateGpsKeys.STREAM} failed inside the ingest script`);
      return this.bufferLocally(record, base, outOfOrder);
    }

    // 1. Device re-upload of an already ingested fix
    if (client && driverId) {
      try {
        const res = await client.set(
          CorporateGpsKeys.seen(route.id, driverId, recordedAt.getTime()),
          '1',
          'EX',
          GPS_SEEN_TTL_SEC,
          'NX',
        );
        if (res === null) return { ...base, outOfOrder: false, duplicate: true, persistence: 'NONE' };
      } catch {
        // best effort: the DB unique key still bounds damage
      }
    }

    // 2. Latest position (monotonic in device time)
    const previous = await this.readLatest(route.id);
    const prevMs = previous ? Date.parse(previous.recordedAt) : NaN;
    const outOfOrder = Number.isFinite(prevMs) && prevMs > recordedAt.getTime();
    if (!outOfOrder) {
      await this.cacheSet(CorporateGpsKeys.latest(route.id), JSON.stringify(latest), GPS_LATEST_TTL_SEC);
      this.publishLive(route, latest, receivedAt);
    }

    // 3. History
    if (!record) {
      return { ...base, outOfOrder, duplicate: false, persistence: 'NONE' };
    }

    if (client && typeof client.xadd === 'function') {
      try {
        await client.xadd(CorporateGpsKeys.STREAM, 'MAXLEN', '~', this.streamMaxLen, '*', 'f', JSON.stringify(record));
        return { ...base, outOfOrder, duplicate: false, persistence: 'STREAM' };
      } catch (err: any) {
        this.logger.warn(`XADD to ${CorporateGpsKeys.STREAM} failed: ${err?.message}`);
      }
    }
    return this.bufferLocally(record, base, outOfOrder);
  }

  private bufferLocally(record: GpsFixRecord, base: { recordedAt: Date; receivedAt: Date }, outOfOrder: boolean): GpsIngestOutcome {
    if (this.writer) {
      this.writer.enqueueLocal(record);
      return { ...base, outOfOrder, duplicate: false, persistence: 'LOCAL_BUFFER' };
    }
    if (!this.warnedNoStream) {
      this.warnedNoStream = true;
      this.logger.warn('No Redis stream and no GPS writer: GPS history is not being persisted');
    }
    return { ...base, outOfOrder, duplicate: false, persistence: 'NONE' };
  }

  private toRecord(
    route: GpsIngestRoute,
    driverId: string,
    lat: number,
    lng: number,
    fix: GpsIngestFix,
    recordedAt: Date,
    receivedAt: Date,
  ): GpsFixRecord {
    const speed = finiteOrNull(fix.speedMps);
    const battery = finiteOrNull(fix.batteryPct);
    return {
      tenantId: route.tenantId,
      routeId: route.id,
      driverId,
      lat,
      lng,
      speedKph: speed === null ? null : Math.round(speed * 3.6 * 10) / 10,
      heading: finiteOrNull(fix.headingDeg),
      accuracyM: finiteOrNull(fix.accuracyM),
      batteryPct: battery === null ? null : Math.max(0, Math.min(100, Math.round(battery))),
      recordedAt: recordedAt.getTime(),
      receivedAt: receivedAt.getTime(),
    };
  }

  /** Live map fan-out (fire and forget; never blocks or fails ingest). */
  private publishLive(route: GpsIngestRoute, latest: LatestGpsFix, receivedAt: Date): void {
    if (!this.pubsub) return;
    const payload = toLiveTelemetry(route, latest, receivedAt);
    for (const channel of [TelemetryChannels.opsFleet, TelemetryChannels.tenantFleet(route.tenantId), TelemetryChannels.route(route.id)]) {
      this.pubsub.publish(channel, payload).catch(() => undefined);
    }
  }

  /**
   * Runs GPS_APPLY_LUA. Returns null when the script cannot be used (no client, no custom-command
   * support, Redis Cluster, script error); the caller then takes the multi-command path.
   */
  private async applyAtomic(
    client: any,
    routeId: string,
    latest: LatestGpsFix,
    record: GpsFixRecord | null,
  ): Promise<{ status: 0 | 1 | 2; streamId: string } | null> {
    if (!client || typeof client.defineCommand !== 'function' || this.luaDisabled.has(client)) return null;
    // Cluster: latest/seen/stream keys hash to different slots (CROSSSLOT), so never try there.
    if (client.isCluster) {
      this.luaDisabled.add(client);
      return null;
    }
    try {
      if (!this.luaReady.has(client)) {
        if (typeof client[APPLY_CMD] !== 'function') client.defineCommand(APPLY_CMD, { numberOfKeys: 3, lua: GPS_APPLY_LUA });
        this.luaReady.add(client);
      }
      // Without a driver the script ignores the seen key (no dedupe, no history).
      const seenKey = record ? CorporateGpsKeys.seen(routeId, record.driverId, record.recordedAt) : CorporateGpsKeys.seen(routeId, '-', 0);
      const res = await client[APPLY_CMD](
        CorporateGpsKeys.latest(routeId),
        seenKey,
        CorporateGpsKeys.STREAM,
        String(latest.recordedAtMs),
        JSON.stringify(latest),
        String(GPS_LATEST_TTL_SEC),
        String(GPS_SEEN_TTL_SEC),
        String(this.streamMaxLen),
        record ? JSON.stringify(record) : '',
      );
      const status = Number(Array.isArray(res) ? res[0] : NaN);
      if (status !== 0 && status !== 1 && status !== 2) throw new Error(`unexpected script reply ${JSON.stringify(res)}`);
      return { status, streamId: String(res[1] ?? '') };
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      // Permanent incompatibility (cluster slots, scripting disabled/denied): stop trying on this client.
      if (/CROSSSLOT|unknown command|NOPERM|not allowed/i.test(msg)) this.luaDisabled.add(client);
      this.logger.warn(`Atomic GPS apply unavailable (${msg}); using multi-command ingest`);
      return null;
    }
  }

  async readLatest(routeId: string): Promise<LatestGpsFix | null> {
    return parseLatest(await this.cacheGet(CorporateGpsKeys.latest(routeId)));
  }

  /** Latest fixes for many routes: chunked MGET (one round trip per chunk) instead of one GET each. */
  async readLatestMany(routeIds: string[], chunkSize = 500): Promise<Map<string, LatestGpsFix>> {
    const raws = await this.readRawMany(routeIds.map((id) => CorporateGpsKeys.latest(id)), chunkSize);
    const out = new Map<string, LatestGpsFix>();
    for (const id of routeIds) {
      const fix = parseLatest(raws.get(CorporateGpsKeys.latest(id)) ?? null);
      if (fix) out.set(id, fix);
    }
    return out;
  }

  /**
   * Raw string values for many keys. Chunked MGET; per-key GET when the client has no MGET
   * (in-memory fallback store) or is a Cluster (keys span slots). Missing keys are absent.
   */
  async readRawMany(keys: string[], chunkSize = 500): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    if (!keys.length) return out;
    const client: any = this.redis.getClient();
    if (client && typeof client.mget === 'function' && !client.isCluster) {
      for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        try {
          const raws: Array<string | null> = await client.mget(...chunk);
          chunk.forEach((k, j) => {
            const v = raws?.[j];
            if (typeof v === 'string') out.set(k, v);
          });
        } catch (err: any) {
          this.logger.warn(`GPS cache MGET failed: ${err?.message}`);
        }
      }
      return out;
    }
    await Promise.all(
      keys.map(async (k) => {
        const v = await this.cacheGet(k);
        if (v) out.set(k, v);
      }),
    );
    return out;
  }

  private async cacheGet(key: string): Promise<string | null> {
    const client: any = this.redis.getClient();
    try {
      if (client && typeof client.get === 'function') return (await client.get(key)) ?? null;
      if (!client && typeof (this.redis as any).get === 'function') return await this.redis.get(key);
    } catch {
      // fall through
    }
    return null;
  }

  private async cacheSet(key: string, value: string, ttlSec: number): Promise<void> {
    const client: any = this.redis.getClient();
    try {
      if (client && typeof client.set === 'function') {
        await client.set(key, value, 'EX', ttlSec);
      } else if (!client && typeof (this.redis as any).set === 'function') {
        await this.redis.set(key, value, ttlSec);
      }
    } catch (err: any) {
      this.logger.warn(`Latest GPS cache write failed for ${key}: ${err?.message}`);
    }
  }
}
