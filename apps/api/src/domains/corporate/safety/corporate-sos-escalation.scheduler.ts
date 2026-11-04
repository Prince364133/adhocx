import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { CorporateSafetyService } from './corporate-safety.service';
import { SosEscalationTickResult } from './safety.types';

export interface CorporateSosEscalationConfig {
  enabled: boolean;
  /** CORPORATE_SOS_ESCALATION_POLL_MS, default 15000. */
  pollIntervalMs: number;
  /** Acknowledgement SLA: CORPORATE_SOS_ACK_SLA_SEC, default 120. */
  ackSlaSeconds: number;
  /** Tick lock TTL; outlives a slow tick so a second instance never overlaps. */
  tickLockTtlSeconds: number;
  /** Max alerts escalated per tick. */
  batchSize: number;
}

const envNumber = (name: string, fallback: number, min = 0): number => {
  const raw = process.env[name];
  const n = raw !== undefined && raw.trim() !== '' ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= min ? n : fallback;
};

/**
 * Enabled unless CORPORATE_SOS_ESCALATION_ENABLED is false. Under jest (JEST_WORKER_ID set) it defaults
 * to off so no test module starts a real poller; tests drive tick() directly.
 */
export function loadSosEscalationConfig(): CorporateSosEscalationConfig {
  const defaultEnabled = process.env.JEST_WORKER_ID ? 'false' : 'true';
  const enabledRaw = (process.env.CORPORATE_SOS_ESCALATION_ENABLED ?? defaultEnabled).toLowerCase();
  return {
    enabled: !['false', '0', 'no', 'off'].includes(enabledRaw),
    pollIntervalMs: envNumber('CORPORATE_SOS_ESCALATION_POLL_MS', 15_000, 1000),
    ackSlaSeconds: envNumber('CORPORATE_SOS_ACK_SLA_SEC', 120, 1),
    tickLockTtlSeconds: envNumber('CORPORATE_SOS_ESCALATION_LOCK_TTL_S', 30, 1),
    batchSize: envNumber('CORPORATE_SOS_ESCALATION_BATCH', 500, 1),
  };
}

/**
 * Drives CorporateSafetyService.checkAndAutoEscalateAlerts (PRD SAFE-*: unacknowledged SOS escalates
 * after the acknowledgement SLA). Same lifecycle as CorporateAutoPlannerService:
 *  - OnModuleInit starts an unref'd setInterval; OnModuleDestroy stops it and awaits the running tick.
 *  - Each tick takes the Redis lock `corporate:sos:escalation:tick` (SET NX EX + owner token), so only
 *    one API instance escalates per poll. Without Redis it runs single-instance.
 *  - The per-alert update is itself conditional (status + acknowledgedAt + level), so even an expired
 *    lock can never double-escalate one SLA breach.
 */
@Injectable()
export class CorporateSosEscalationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CorporateSosEscalationScheduler.name);
  static readonly TICK_LOCK_KEY = 'corporate:sos:escalation:tick';

  private readonly config: CorporateSosEscalationConfig;
  private poller?: NodeJS.Timeout;
  private isTicking = false;
  private shuttingDown = false;
  private currentTick?: Promise<SosEscalationTickResult>;

  constructor(
    private readonly safety: CorporateSafetyService,
    @Optional() private readonly redis?: RedisService,
    @Optional() config?: Partial<CorporateSosEscalationConfig>,
  ) {
    this.config = { ...loadSosEscalationConfig(), ...(config ?? {}) };
  }

  get schedulerConfig(): Readonly<CorporateSosEscalationConfig> {
    return this.config;
  }

  onModuleInit(): void {
    if (!this.config.enabled) {
      this.logger.log('Corporate SOS escalation scheduler disabled (CORPORATE_SOS_ESCALATION_ENABLED=false)');
      return;
    }
    this.poller = setInterval(() => {
      this.tick().catch((err) => this.logger.warn(`Corporate SOS escalation tick error: ${err.message}`));
    }, this.config.pollIntervalMs);
    this.poller.unref();
    this.logger.log(
      `Corporate SOS escalation scheduler initialized (${this.config.pollIntervalMs}ms poll, ack SLA ${this.config.ackSlaSeconds}s)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = undefined;
    }
    if (this.currentTick) await this.currentTick.catch(() => undefined);
  }

  /** One escalation pass. Public so tests and ops can drive time deterministically. */
  async tick(nowMs: number = Date.now()): Promise<SosEscalationTickResult> {
    const result: SosEscalationTickResult = { skipped: true, escalatedIds: [] };
    if (this.isTicking || this.shuttingDown) return result;
    this.isTicking = true;
    const run = (async () => {
      const token = await this.acquire();
      if (token === null) return result;
      try {
        result.skipped = false;
        result.escalatedIds = await this.safety.checkAndAutoEscalateAlerts(
          this.config.ackSlaSeconds,
          new Date(nowMs),
          this.config.batchSize,
        );
        return result;
      } finally {
        await this.release(token);
      }
    })();
    this.currentTick = run;
    try {
      return await run;
    } finally {
      this.isTicking = false;
      this.currentTick = undefined;
    }
  }

  /** Returns the lock token, '' when running without Redis (single instance), or null when held elsewhere. */
  private async acquire(): Promise<string | null> {
    if (!this.redis) return '';
    return this.redis.acquireLockToken(CorporateSosEscalationScheduler.TICK_LOCK_KEY, this.config.tickLockTtlSeconds);
  }

  private async release(token: string): Promise<void> {
    if (!this.redis || !token) return;
    try {
      await this.redis.releaseLockToken(CorporateSosEscalationScheduler.TICK_LOCK_KEY, token);
    } catch (err: any) {
      this.logger.warn(`Failed to release SOS escalation lock: ${err.message}`);
    }
  }
}
