import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import * as os from 'os';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';
import { CorporateGpsPartitionMaintenance, isMissingPartitionError } from './corporate-gps-partition-maintenance.service';
import { CorporateGpsKeys, GpsFixRecord } from './tracking.types';

export const CORPORATE_GPS_WRITER_CONFIG = 'CORPORATE_GPS_WRITER_CONFIG';

function envInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const n = Number(env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export interface TelemetryWriterConfig {
  enabled: boolean;
  /** Max rows per createMany (doc 19 §0: <= 500). */
  batchSize: number;
  /** A partial batch is flushed once its oldest row has waited this long (<= 2 s). */
  flushIntervalMs: number;
  /** How often each instance polls the stream (non-blocking XREADGROUP). */
  pollIntervalMs: number;
  /** Max reads per poll while the stream keeps returning full pages (drains bursts). */
  maxReadsPerPoll: number;
  /** Entries pending longer than this (crashed consumer, failed flush) are re-claimed. */
  reclaimIdleMs: number;
  reclaimEveryMs: number;
  /** Without Redis: upper bound of the in-process buffer (oldest rows dropped beyond it). */
  maxLocalBuffer: number;
}

export function loadTelemetryWriterConfig(env: NodeJS.ProcessEnv = process.env): TelemetryWriterConfig {
  return {
    enabled: env.CORPORATE_GPS_WRITER_ENABLED !== 'false',
    batchSize: Math.min(500, envInt(env, 'CORPORATE_GPS_BATCH_SIZE', 500)),
    flushIntervalMs: Math.min(2000, envInt(env, 'CORPORATE_GPS_FLUSH_MS', 2000)),
    pollIntervalMs: envInt(env, 'CORPORATE_GPS_POLL_MS', 200),
    maxReadsPerPoll: envInt(env, 'CORPORATE_GPS_MAX_READS_PER_POLL', 20),
    reclaimIdleMs: envInt(env, 'CORPORATE_GPS_RECLAIM_IDLE_MS', 30_000),
    reclaimEveryMs: envInt(env, 'CORPORATE_GPS_RECLAIM_EVERY_MS', 10_000),
    maxLocalBuffer: envInt(env, 'CORPORATE_GPS_MAX_LOCAL_BUFFER', 50_000),
  };
}

interface BufferedFix {
  /** Stream entry id; absent for the no-Redis local buffer. */
  streamId?: string;
  row: GpsFixRecord;
  bufferedAt: number;
}

/** Narrow view of the ioredis stream commands used here (mockable in tests). */
export interface GpsStreamClient {
  xgroup(...args: any[]): Promise<unknown>;
  xreadgroup(...args: any[]): Promise<unknown>;
  xack(key: string, group: string, ...ids: string[]): Promise<unknown>;
  xautoclaim?(...args: any[]): Promise<unknown>;
}

export function fixDedupeKey(r: Pick<GpsFixRecord, 'routeId' | 'driverId' | 'recordedAt' | 'receivedAt'>): string {
  return `${r.routeId}|${r.driverId}|${r.recordedAt}|${r.receivedAt}`;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Parses one stream entry's `f` JSON; null when malformed (poison entry). */
export function parseFixPayload(raw: unknown): GpsFixRecord | null {
  if (typeof raw !== 'string') return null;
  let o: any;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!o || typeof o !== 'object') return null;
  const lat = num(o.lat);
  const lng = num(o.lng);
  const recordedAt = num(o.recordedAt);
  const receivedAt = num(o.receivedAt);
  if (
    typeof o.tenantId !== 'string' ||
    typeof o.routeId !== 'string' ||
    typeof o.driverId !== 'string' ||
    lat === null ||
    lng === null ||
    recordedAt === null ||
    receivedAt === null
  ) {
    return null;
  }
  const battery = num(o.batteryPct);
  return {
    tenantId: o.tenantId,
    routeId: o.routeId,
    driverId: o.driverId,
    lat,
    lng,
    speedKph: num(o.speedKph),
    heading: num(o.heading),
    accuracyM: num(o.accuracyM),
    batteryPct: battery === null ? null : Math.round(battery),
    recordedAt,
    receivedAt,
  };
}

/** ioredis reply of XREADGROUP: [[stream, [[id, [field, value, ...]], ...]]] | null */
function entriesOfRead(reply: unknown): Array<[string, unknown]> {
  if (!Array.isArray(reply)) return [];
  const out: Array<[string, unknown]> = [];
  for (const stream of reply) {
    const entries = Array.isArray(stream) ? stream[1] : null;
    if (Array.isArray(entries)) out.push(...(entries as Array<[string, unknown]>));
  }
  return out;
}

function fieldValue(fields: unknown, name: string): unknown {
  if (!Array.isArray(fields)) return undefined;
  for (let i = 0; i + 1 < fields.length; i += 2) if (fields[i] === name) return fields[i + 1];
  return undefined;
}

/**
 * Batched GPS history writer (doc 19 WS-B §2).
 *
 * Runs on EVERY API instance as a member of the consumer group `corporate:gps:writers` on
 * `corporate:gps:stream`: each stream entry is delivered to exactly one instance. Entries are
 * buffered and written with one `createMany({ skipDuplicates: true })` per <= 500 rows, or after
 * <= 2 s for a partial batch, and only then XACKed. Crash / failed flush => entries stay pending
 * and are re-claimed (XAUTOCLAIM) after `reclaimIdleMs`; the unique key
 * (route_id, recorded_at, driver_id, received_at) turns such re-deliveries into no-ops.
 *
 * Reads are non-blocking (no BLOCK), so the shared ioredis connection is never held.
 * Without Redis (dev / single instance) ingest calls `enqueueLocal` and the same batching applies.
 */
@Injectable()
export class CorporateTelemetryWriter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CorporateTelemetryWriter.name);
  readonly config: TelemetryWriterConfig;
  readonly consumerName = `${os.hostname()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

  private buffer: BufferedFix[] = [];
  private groupReady = false;
  private lastReclaimAt = 0;
  private pumping = false;
  private flushing: Promise<number> | null = null;
  private timer?: NodeJS.Timeout;
  private currentPump?: Promise<number>;

  readonly stats = {
    batches: 0,
    rowsSubmitted: 0,
    acked: 0,
    inBatchDuplicates: 0,
    failedBatches: 0,
    malformed: 0,
    reclaimed: 0,
    droppedLocal: 0,
  };

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    @Optional() private readonly maintenance?: CorporateGpsPartitionMaintenance,
    @Optional() @Inject(CORPORATE_GPS_WRITER_CONFIG) config?: TelemetryWriterConfig,
  ) {
    this.config = config ?? loadTelemetryWriterConfig();
  }

  onModuleInit(): void {
    if (!this.config.enabled) {
      this.logger.log('Corporate GPS writer disabled (CORPORATE_GPS_WRITER_ENABLED=false)');
      return;
    }
    this.timer = setInterval(() => {
      if (this.pumping) return;
      this.currentPump = this.pump().catch((err) => {
        this.logger.warn(`GPS writer poll failed: ${err?.message}`);
        return 0;
      });
    }, this.config.pollIntervalMs);
    this.timer.unref?.();
    this.logger.log(
      `Corporate GPS writer started as ${this.consumerName} (batch ${this.config.batchSize}, flush ${this.config.flushIntervalMs}ms)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.currentPump?.catch(() => undefined);
    // Write what is buffered; anything that fails stays pending in the stream for another instance.
    await this.flushAll(Date.now()).catch(() => undefined);
  }

  get bufferedCount(): number {
    return this.buffer.length;
  }

  /** No-Redis fallback used by ingest: same batching, nothing to acknowledge. */
  enqueueLocal(row: GpsFixRecord, now: number = Date.now()): void {
    if (this.buffer.length >= this.config.maxLocalBuffer) {
      this.buffer.shift();
      this.stats.droppedLocal++;
    }
    this.buffer.push({ row, bufferedAt: now });
    if (this.buffer.length >= this.config.batchSize && !this.flushing) {
      void this.flushFull(now).catch((err) => this.logger.warn(`GPS local flush failed: ${err?.message}`));
    }
  }

  /**
   * One poll: re-claim stale pending entries, read new entries (draining bursts), write every
   * full batch and, if due, the partial batch. Public so tests drive time deterministically.
   */
  async pump(now: number = Date.now()): Promise<number> {
    if (this.pumping) return 0;
    this.pumping = true;
    try {
      let written = 0;
      const client = this.streamClient();
      if (client && (await this.ensureGroup(client))) {
        if (now - this.lastReclaimAt >= this.config.reclaimEveryMs) {
          this.lastReclaimAt = now;
          await this.reclaim(client, now);
          written += await this.flushFull(now);
        }
        for (let i = 0; i < this.config.maxReadsPerPoll; i++) {
          const got = await this.read(client, this.config.batchSize, now);
          written += await this.flushFull(now);
          if (got < this.config.batchSize) break;
        }
      }
      if (this.buffer.length > 0 && now - this.buffer[0].bufferedAt >= this.config.flushIntervalMs) {
        written += await this.flushAll(now);
      }
      return written;
    } finally {
      this.pumping = false;
    }
  }

  /** Writes every full batch currently buffered. */
  async flushFull(now: number = Date.now()): Promise<number> {
    let written = 0;
    while (this.buffer.length >= this.config.batchSize) {
      const n = await this.flushBatch(now);
      if (n < 0) break;
      written += n;
    }
    return written;
  }

  /** Writes everything buffered (full batches, then the remainder). */
  async flushAll(now: number = Date.now()): Promise<number> {
    let written = 0;
    while (this.buffer.length > 0) {
      const n = await this.flushBatch(now);
      if (n < 0) break;
      written += n;
    }
    return written;
  }

  /**
   * Writes one batch of <= batchSize rows and acknowledges its stream entries.
   * Returns rows submitted, or -1 when the write failed (entries stay pending for re-delivery).
   */
  private async flushBatch(now: number): Promise<number> {
    if (this.flushing) await this.flushing.catch(() => undefined);
    const batch = this.buffer.splice(0, this.config.batchSize);
    if (batch.length === 0) return 0;
    const run = this.writeBatch(batch, now);
    this.flushing = run;
    try {
      return await run;
    } finally {
      this.flushing = null;
    }
  }

  private async writeBatch(batch: BufferedFix[], now: number): Promise<number> {
    const seen = new Set<string>();
    const data: any[] = [];
    for (const e of batch) {
      const key = fixDedupeKey(e.row);
      if (seen.has(key)) {
        this.stats.inBatchDuplicates++;
        continue;
      }
      seen.add(key);
      data.push({
        tenantId: e.row.tenantId,
        routeId: e.row.routeId,
        driverId: e.row.driverId,
        lat: e.row.lat,
        lng: e.row.lng,
        speedKph: e.row.speedKph,
        heading: e.row.heading,
        accuracyM: e.row.accuracyM,
        batteryPct: e.row.batteryPct,
        recordedAt: new Date(e.row.recordedAt),
        receivedAt: new Date(e.row.receivedAt),
      });
    }

    try {
      await this.db.corporateVehiclePosition.createMany({ data, skipDuplicates: true });
    } catch (err: any) {
      this.stats.failedBatches++;
      this.logger.error(`GPS batch of ${data.length} rows failed: ${err?.message}`);
      if (isMissingPartitionError(err)) {
        await this.maintenance?.ensurePartitions(new Date(now)).catch(() => undefined);
      }
      const local = batch.filter((e) => !e.streamId);
      if (local.length > 0) this.buffer.unshift(...local); // no stream to re-deliver: retry next poll
      // Stream entries are NOT acked: they stay pending and are re-claimed after reclaimIdleMs.
      return -1;
    }

    this.stats.batches++;
    this.stats.rowsSubmitted += data.length;
    const ids = batch.map((e) => e.streamId).filter((id): id is string => !!id);
    if (ids.length > 0) {
      const client = this.streamClient();
      try {
        await client?.xack(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP, ...ids);
        this.stats.acked += ids.length;
      } catch (err: any) {
        // Not acked => re-delivered later => skipped by the unique key. Safe, just extra work.
        this.logger.warn(`XACK of ${ids.length} GPS entries failed: ${err?.message}`);
      }
    }
    return data.length;
  }

  private streamClient(): GpsStreamClient | null {
    const c: any = this.redis.getClient();
    return c && typeof c.xreadgroup === 'function' && typeof c.xack === 'function' ? (c as GpsStreamClient) : null;
  }

  private async ensureGroup(client: GpsStreamClient): Promise<boolean> {
    if (this.groupReady) return true;
    try {
      await client.xgroup('CREATE', CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP, '0', 'MKSTREAM');
      this.groupReady = true;
    } catch (err: any) {
      if (String(err?.message ?? '').includes('BUSYGROUP')) {
        this.groupReady = true;
      } else {
        this.logger.warn(`Cannot create GPS consumer group: ${err?.message}`);
      }
    }
    return this.groupReady;
  }

  private async read(client: GpsStreamClient, count: number, now: number): Promise<number> {
    let reply: unknown;
    try {
      reply = await client.xreadgroup(
        'GROUP',
        CorporateGpsKeys.GROUP,
        this.consumerName,
        'COUNT',
        count,
        'STREAMS',
        CorporateGpsKeys.STREAM,
        '>',
      );
    } catch (err: any) {
      if (String(err?.message ?? '').includes('NOGROUP')) this.groupReady = false;
      throw err;
    }
    const entries = entriesOfRead(reply);
    await this.accept(client, entries, now);
    return entries.length;
  }

  /** Re-claims entries other (crashed) consumers or failed flushes left pending. */
  private async reclaim(client: GpsStreamClient, now: number): Promise<void> {
    if (typeof client.xautoclaim !== 'function') return;
    try {
      let cursor = '0-0';
      for (let i = 0; i < this.config.maxReadsPerPoll; i++) {
        const reply: any = await client.xautoclaim(
          CorporateGpsKeys.STREAM,
          CorporateGpsKeys.GROUP,
          this.consumerName,
          this.config.reclaimIdleMs,
          cursor,
          'COUNT',
          this.config.batchSize,
        );
        if (!Array.isArray(reply)) return;
        const entries = (Array.isArray(reply[1]) ? reply[1] : []).filter(Boolean) as Array<[string, unknown]>;
        // Skip entries this instance still holds in memory (not yet flushed).
        const held = new Set(this.buffer.map((b) => b.streamId));
        const fresh = entries.filter((e) => !held.has(e[0]));
        this.stats.reclaimed += fresh.length;
        await this.accept(client, fresh, now);
        cursor = String(reply[0] ?? '0-0');
        if (cursor === '0-0' || entries.length === 0) return;
      }
    } catch (err: any) {
      this.logger.warn(`GPS XAUTOCLAIM failed: ${err?.message}`);
    }
  }

  private async accept(client: GpsStreamClient, entries: Array<[string, unknown]>, now: number): Promise<void> {
    const poison: string[] = [];
    for (const [id, fields] of entries) {
      const row = parseFixPayload(fieldValue(fields, 'f'));
      if (!row) {
        poison.push(id);
        continue;
      }
      this.buffer.push({ streamId: id, row, bufferedAt: now });
    }
    if (poison.length > 0) {
      this.stats.malformed += poison.length;
      this.logger.warn(`Dropping ${poison.length} malformed GPS stream entries`);
      await client.xack(CorporateGpsKeys.STREAM, CorporateGpsKeys.GROUP, ...poison).catch(() => undefined);
    }
  }
}
