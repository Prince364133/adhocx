import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { DispatchConfig } from './dispatch.config';

export type DispatchJobHandler = (member: string) => Promise<void>;

const ZSET_KEY = 'dispatch:delayed:jobs';

/**
 * Exact-time delayed job scheduler for dispatch waves.
 *
 * Jobs live in a Redis sorted set scored by due timestamp, so they survive API restarts and
 * are claimed exactly once across instances (atomic Lua pop). Without Redis it degrades to an
 * in-process sorted map with identical semantics for a single instance.
 */
@Injectable()
export class DispatchSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DispatchSchedulerService.name);
  private readonly localJobs = new Map<string, number>();
  private poller?: NodeJS.Timeout;
  private handler?: DispatchJobHandler;
  private ticking = false;

  constructor(@Optional() private readonly redis?: RedisService) {}

  onModuleInit() {
    this.poller = setInterval(() => {
      this.tick().catch((err) => this.logger.warn(`Scheduler tick notice: ${err.message}`));
    }, DispatchConfig.schedulerPollMs);
    this.poller.unref();
  }

  onModuleDestroy() {
    if (this.poller) clearInterval(this.poller);
  }

  registerHandler(handler: DispatchJobHandler): void {
    this.handler = handler;
  }

  async schedule(member: string, dueAtMs: number): Promise<void> {
    if (this.redis) {
      await this.redis.zadd(ZSET_KEY, dueAtMs, member);
    } else {
      this.localJobs.set(member, dueAtMs);
    }
  }

  async cancel(member: string): Promise<void> {
    if (this.redis) {
      await this.redis.zrem(ZSET_KEY, member);
    } else {
      this.localJobs.delete(member);
    }
  }

  /**
   * Claim and run all jobs due at `nowMs`. Public so tests can drive time deterministically.
   */
  async tick(nowMs: number = Date.now()): Promise<string[]> {
    if (this.ticking) return [];
    this.ticking = true;
    try {
      let due: string[];
      if (this.redis) {
        due = await this.redis.zclaimDue(ZSET_KEY, nowMs, 100);
      } else {
        due = Array.from(this.localJobs.entries())
          .filter(([, at]) => at <= nowMs)
          .sort((a, b) => a[1] - b[1])
          .map(([m]) => m);
        for (const m of due) this.localJobs.delete(m);
      }

      for (const member of due) {
        if (!this.handler) continue;
        try {
          await this.handler(member);
        } catch (err: any) {
          this.logger.warn(`Dispatch job ${member} failed: ${err.message}`);
        }
      }
      return due;
    } finally {
      this.ticking = false;
    }
  }
}
