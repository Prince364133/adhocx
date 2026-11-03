import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { RedisService } from '../../../redis/redis.service';

export const GPS_PARENT_TABLE = 'corporate_vehicle_positions';
const PARTITION_PREFIX = `${GPS_PARENT_TABLE}_p`;
const PARTITION_RE = new RegExp(`^${PARTITION_PREFIX}(\\d{4})(\\d{2})(\\d{2})$`);
const DAY_MS = 86_400_000;

export interface GpsPartitionConfig {
  enabled: boolean;
  /** Partitions older than this many days (UTC) are dropped. CORPORATE_GPS_RETENTION_DAYS, default 90. */
  retentionDays: number;
  /** Days ahead to pre-create (today + N). */
  daysAhead: number;
  intervalMs: number;
}

export function loadGpsPartitionConfig(env: NodeJS.ProcessEnv = process.env): GpsPartitionConfig {
  const retention = Number(env.CORPORATE_GPS_RETENTION_DAYS);
  return {
    enabled: env.CORPORATE_GPS_PARTITION_MAINTENANCE_ENABLED !== 'false',
    retentionDays: Number.isFinite(retention) && retention >= 1 ? Math.floor(retention) : 90,
    daysAhead: 3,
    intervalMs: 3_600_000,
  };
}

const utcDay = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const ymd = (d: Date): string =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
/** TIMESTAMP(3) literal (UTC wall clock, which is how Prisma stores DateTime). */
const tsLiteral = (d: Date): string => d.toISOString().replace('T', ' ').replace('Z', '');

export function partitionNameFor(day: Date): string {
  return `${PARTITION_PREFIX}${ymd(utcDay(day))}`;
}

/** Partitions for today .. today + daysAhead (UTC days). Pure; IST/UTC process TZ independent. */
export function planPartitions(now: Date, daysAhead: number): Array<{ name: string; from: Date; to: Date }> {
  const today = utcDay(now).getTime();
  const out: Array<{ name: string; from: Date; to: Date }> = [];
  for (let i = 0; i <= daysAhead; i++) {
    const from = new Date(today + i * DAY_MS);
    out.push({ name: partitionNameFor(from), from, to: new Date(from.getTime() + DAY_MS) });
  }
  return out;
}

/**
 * Partition names whose whole day lies before (today - retentionDays). Unknown names (anything
 * not matching corporate_vehicle_positions_pYYYYMMDD) are never returned.
 */
export function expiredPartitions(names: string[], now: Date, retentionDays: number): string[] {
  const cutoff = utcDay(now).getTime() - retentionDays * DAY_MS;
  return names
    .filter((n) => {
      const m = PARTITION_RE.exec(n);
      if (!m) return false;
      const day = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      return Number.isFinite(day) && day < cutoff;
    })
    .sort();
}

export function createPartitionSql(p: { name: string; from: Date; to: Date }): string {
  // Identifiers/literals are generated from dates only (never user input).
  return (
    `CREATE TABLE IF NOT EXISTS "${p.name}" PARTITION OF "${GPS_PARENT_TABLE}" ` +
    `FOR VALUES FROM ('${tsLiteral(p.from)}') TO ('${tsLiteral(p.to)}')`
  );
}

/** Postgres 23514 "no partition of relation ... found for row". */
export function isMissingPartitionError(err: any): boolean {
  const msg = String(err?.message ?? '');
  return msg.includes('no partition of relation') || err?.meta?.code === '23514' || err?.code === '23514';
}

/**
 * Daily-partition housekeeping for corporate_vehicle_positions. Runs hourly on every instance,
 * but only the holder of a Redis lock does the work. Creates today..today+3 and drops partitions
 * older than CORPORATE_GPS_RETENTION_DAYS (default 90). Idempotent (IF NOT EXISTS / IF EXISTS).
 */
@Injectable()
export class CorporateGpsPartitionMaintenance implements OnModuleInit, OnModuleDestroy {
  static readonly LOCK_KEY = 'corporate:gps:partition-maintenance';
  private readonly logger = new Logger(CorporateGpsPartitionMaintenance.name);
  readonly config: GpsPartitionConfig;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {
    this.config = loadGpsPartitionConfig();
  }

  onModuleInit(): void {
    if (!this.config.enabled) return;
    const tick = () =>
      this.run().catch((err) => this.logger.warn(`GPS partition maintenance failed: ${err?.message}`));
    const first = setTimeout(tick, 5_000);
    first.unref?.();
    this.timer = setInterval(tick, this.config.intervalMs);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async run(now: Date = new Date()): Promise<{ created: string[]; dropped: string[]; skipped: boolean }> {
    const token = await this.redis.acquireLockToken(CorporateGpsPartitionMaintenance.LOCK_KEY, 300);
    if (!token) return { created: [], dropped: [], skipped: true };
    try {
      const created = await this.ensurePartitions(now);
      const dropped = await this.dropExpired(now);
      if (dropped.length > 0) this.logger.log(`Dropped GPS partitions: ${dropped.join(', ')}`);
      return { created, dropped, skipped: false };
    } finally {
      await this.redis.releaseLockToken(CorporateGpsPartitionMaintenance.LOCK_KEY, token);
    }
  }

  /** Also called by the writer when an insert hits a missing partition. */
  async ensurePartitions(now: Date = new Date()): Promise<string[]> {
    const done: string[] = [];
    for (const p of planPartitions(now, this.config.daysAhead)) {
      try {
        await this.db.$executeRawUnsafe(createPartitionSql(p));
        done.push(p.name);
      } catch (err: any) {
        // Concurrent creation by another instance surfaces as "already exists": fine.
        if (!String(err?.message ?? '').includes('already exists')) throw err;
        done.push(p.name);
      }
    }
    return done;
  }

  async dropExpired(now: Date = new Date()): Promise<string[]> {
    const rows = await this.db.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT c.relname AS name FROM pg_inherits i ` +
        `JOIN pg_class c ON c.oid = i.inhrelid JOIN pg_class p ON p.oid = i.inhparent ` +
        `WHERE p.relname = '${GPS_PARENT_TABLE}'`,
    );
    const expired = expiredPartitions(
      (rows ?? []).map((r) => r.name),
      now,
      this.config.retentionDays,
    );
    for (const name of expired) {
      await this.db.$executeRawUnsafe(`DROP TABLE IF EXISTS "${name}"`);
    }
    return expired;
  }
}
