import { BadRequestException, Injectable, Logger, Optional } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { CorporateTelemetryWriter } from './corporate-telemetry-writer.service';
import {
  CorporateGpsKeys,
  GPS_LATEST_TTL_SEC,
  GPS_MAX_FUTURE_SKEW_MS,
  GPS_SEEN_TTL_SEC,
  GpsFixRecord,
  GpsIngestOutcome,
  LatestGpsFix,
} from './tracking.types';

export interface GpsIngestRoute {
  id: string;
  tenantId: string;
  driverId?: string | null;
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
 *  3. XADD the fix to `corporate:gps:stream` (MAXLEN ~) for the batched history writer.
 * Without Redis the fix goes to the writer's in-process buffer instead.
 */
@Injectable()
export class CorporateGpsIngestService {
  private readonly logger = new Logger(CorporateGpsIngestService.name);
  readonly streamMaxLen: number;
  private warnedNoStream = false;

  constructor(
    private readonly redis: RedisService,
    @Optional() private readonly writer?: CorporateTelemetryWriter,
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
      const latest: LatestGpsFix = {
        latitude: lat,
        longitude: lng,
        speedMps: fix.speedMps,
        headingDeg: fix.headingDeg,
        accuracyM: fix.accuracyM,
        batteryPct: fix.batteryPct,
        driverId,
        recordedAt: recordedAt.toISOString(),
        receivedAt: receivedAt.toISOString(),
      };
      await this.cacheSet(CorporateGpsKeys.latest(route.id), JSON.stringify(latest), GPS_LATEST_TTL_SEC);
    }

    // 3. History
    if (!driverId) {
      return { ...base, outOfOrder, duplicate: false, persistence: 'NONE' };
    }
    const speed = finiteOrNull(fix.speedMps);
    const battery = finiteOrNull(fix.batteryPct);
    const record: GpsFixRecord = {
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

    if (client && typeof client.xadd === 'function') {
      try {
        await client.xadd(CorporateGpsKeys.STREAM, 'MAXLEN', '~', this.streamMaxLen, '*', 'f', JSON.stringify(record));
        return { ...base, outOfOrder, duplicate: false, persistence: 'STREAM' };
      } catch (err: any) {
        this.logger.warn(`XADD to ${CorporateGpsKeys.STREAM} failed: ${err?.message}`);
      }
    }
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

  async readLatest(routeId: string): Promise<LatestGpsFix | null> {
    const raw = await this.cacheGet(CorporateGpsKeys.latest(routeId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !Number.isFinite(Date.parse(parsed.recordedAt))) return null;
      return parsed as LatestGpsFix;
    } catch {
      return null;
    }
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
