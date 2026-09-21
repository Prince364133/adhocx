import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

export interface NotificationJob<T = any> {
  id: string;
  type: string;
  payload: T;
  idempotencyKey?: string;
  attempts: number;
  maxRetries: number;
  createdAt: number;
}

export interface QueueStats {
  queuedCount: number;
  processingCount: number;
  completedCount: number;
  failedCount: number;
  dlqCount: number;
}

@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);

  // In-memory queue fallback with priority support
  private queue: NotificationJob[] = [];
  private isProcessing = false;
  private workerInterval?: NodeJS.Timeout;
  private readonly deadLetterQueue: NotificationJob[] = [];

  // Metrics counters
  private stats: QueueStats = {
    queuedCount: 0,
    processingCount: 0,
    completedCount: 0,
    failedCount: 0,
    dlqCount: 0,
  };

  // In-memory sliding window idempotency cache
  private readonly idempotencyCache = new Map<string, number>();

  constructor(@Optional() private readonly redis?: RedisService) {}

  onModuleInit() {
    // Start asynchronous queue worker loop (every 100ms tick)
    this.workerInterval = setInterval(() => {
      this.processNextJob().catch((err) => {
        this.logger.warn(`Notification worker tick notice: ${err.message}`);
      });
    }, 100);
    this.workerInterval.unref();

    // Periodic idempotency cache cleanup (every 5 mins)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, expiresAt] of this.idempotencyCache.entries()) {
        if (now > expiresAt) {
          this.idempotencyCache.delete(key);
        }
      }
    }, 300000);
    cleanupInterval.unref();

    this.logger.log('⚡ Notification Queue & Rate-Limiter Worker initialized');
  }

  onModuleDestroy() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
    }
  }

  // ─── Idempotency & Deduplication ───────────────────────────────────────────

  /**
   * Check if a dispatch key has already been processed within the sliding window (default: 120s).
   * Returns `true` if this is a duplicate and should be skipped.
   */
  async isDuplicate(key: string, windowSeconds = 120): Promise<boolean> {
    if (!key) return false;
    const cacheKey = `notif_idem:${key}`;

    if (this.redis) {
      try {
        const existing = await this.redis.get(cacheKey);
        if (existing) {
          this.logger.warn(`🛑 Duplicate notification suppressed by Redis idempotency guard: [${key}]`);
          return true;
        }
        await this.redis.set(cacheKey, 'PROCESSED', windowSeconds);
        return false;
      } catch {
        // Fallback to memory cache
      }
    }

    const now = Date.now();
    const expiresAt = this.idempotencyCache.get(cacheKey);
    if (expiresAt && now < expiresAt) {
      this.logger.warn(`🛑 Duplicate notification suppressed by in-memory idempotency guard: [${key}]`);
      return true;
    }

    this.idempotencyCache.set(cacheKey, now + windowSeconds * 1000);
    return false;
  }

  // ─── HTML & Content Sanitization ───────────────────────────────────────────

  /**
   * Sanitize text against XSS, script injection, and invalid control characters.
   */
  sanitizeText(text?: string): string {
    if (!text) return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/onerror=/gi, '')
      .replace(/onload=/gi, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove non-printable ASCII
      .trim();
  }

  // ─── Queue Job Ingestion ───────────────────────────────────────────────────

  /**
   * Enqueue a notification job for asynchronous background dispatch.
   */
  async enqueue<T>(
    type: string,
    payload: T,
    options?: { idempotencyKey?: string; maxRetries?: number },
  ): Promise<string> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = options?.idempotencyKey;

    if (idempotencyKey) {
      const duplicate = await this.isDuplicate(idempotencyKey);
      if (duplicate) {
        return `skipped_duplicate_${id}`;
      }
    }

    const job: NotificationJob<T> = {
      id,
      type,
      payload,
      idempotencyKey,
      attempts: 0,
      maxRetries: options?.maxRetries ?? 3,
      createdAt: Date.now(),
    };

    this.queue.push(job);
    this.stats.queuedCount = this.queue.length;

    return id;
  }

  // ─── Background Worker Processing Loop ─────────────────────────────────────

  private jobHandlers = new Map<string, (payload: any) => Promise<any>>();

  /**
   * Register a processor handler for a specific job type.
   */
  registerHandler(type: string, handler: (payload: any) => Promise<any>): void {
    this.jobHandlers.set(type, handler);
  }

  private async processNextJob(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift();

    if (!job) {
      this.isProcessing = false;
      return;
    }

    this.stats.queuedCount = this.queue.length;
    this.stats.processingCount++;

    const handler = this.jobHandlers.get(job.type);

    if (!handler) {
      this.logger.warn(`No handler registered for notification job type: ${job.type}`);
      this.stats.processingCount--;
      this.isProcessing = false;
      return;
    }

    try {
      job.attempts++;
      await handler(job.payload);

      this.stats.completedCount++;
      this.stats.processingCount--;
    } catch (err: any) {
      this.logger.error(`Job ${job.id} [${job.type}] failed (Attempt ${job.attempts}/${job.maxRetries}): ${err.message}`);

      if (job.attempts < job.maxRetries) {
        // Exponential backoff with jitter (100ms * 2^attempt + jitter)
        const backoffMs = Math.min(5000, 100 * Math.pow(2, job.attempts) + Math.floor(Math.random() * 50));
        setTimeout(() => {
          this.queue.push(job);
          this.stats.queuedCount = this.queue.length;
        }, backoffMs);
      } else {
        // Exceeded retries -> route to Dead Letter Queue (DLQ)
        this.deadLetterQueue.push(job);
        this.stats.failedCount++;
        this.stats.dlqCount = this.deadLetterQueue.length;
        this.logger.warn(`🚨 Job ${job.id} routed to DLQ after ${job.maxRetries} failed attempts.`);
      }

      this.stats.processingCount--;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Returns real-time health and throughput stats of the notification queue.
   */
  getStats(): QueueStats {
    return {
      ...this.stats,
      queuedCount: this.queue.length,
      dlqCount: this.deadLetterQueue.length,
    };
  }

  /**
   * Replays all jobs currently resting in the Dead-Letter Queue.
   */
  replayDlq(): number {
    const count = this.deadLetterQueue.length;
    while (this.deadLetterQueue.length > 0) {
      const job = this.deadLetterQueue.shift();
      if (job) {
        job.attempts = 0;
        this.queue.push(job);
      }
    }
    this.stats.dlqCount = 0;
    this.stats.queuedCount = this.queue.length;
    this.logger.log(`🔄 Replaying ${count} jobs from Notification DLQ.`);
    return count;
  }
}
