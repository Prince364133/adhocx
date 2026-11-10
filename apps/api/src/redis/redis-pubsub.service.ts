import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import Redis, { RedisOptions } from 'ioredis';
import { redisTlsOptions } from './redis-tls';

export type MessageHandler = (channel: string, message: string) => void;

const CONNECT_WAIT_MS = 5000;
/** A batched channel is flushed early once it holds this many items. */
const MAX_BATCH_ITEMS = 2000;

/**
 * Publisher-side batching window (ms) for high-rate channels (live telemetry). One PUBLISH per
 * channel per window instead of one per item: at 10k fixes/s this is the difference between Redis
 * and every subscriber pod handling ~30k messages/s or a few hundred. 0 disables batching.
 * Defaults to 0 under NODE_ENV=test so unit tests see items synchronously.
 */
export function publishBatchMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TELEMETRY_PUBLISH_BATCH_MS;
  if (raw !== undefined && raw !== '') {
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 100;
  }
  return env.NODE_ENV === 'test' ? 0 : 100;
}

/**
 * Redis Pub/Sub with a dedicated subscriber connection (a SUBSCRIBEd connection cannot run other
 * commands) and a separate publisher connection.
 *
 * Reconnection never gives up: after a Redis outage both connections come back on their own and
 * every channel/pattern registered here is subscribed again. While Redis is down, publish() falls
 * back to an in-process bus, which only reaches subscribers on the same API instance.
 */
@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private pubReady = false;
  private subReady = false;
  private shuttingDown = false;

  private readonly channelHandlers = new Map<string, Set<MessageHandler>>();
  private readonly patternHandlers = new Map<string, Set<MessageHandler>>();
  private readonly localBus = new EventEmitter();
  /** Serialized items waiting to be published, per batched channel. */
  private readonly batches = new Map<string, string[]>();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.localBus.setMaxListeners(0);
  }

  async onModuleInit(): Promise<void> {
    // Optional dedicated Pub/Sub instance: live fan-out (~3 copies of every fix) then never competes
    // with the hot keys, Lua ingest and history stream for the main Redis CPU.
    const url = process.env.REDIS_PUBSUB_URL || this.configService.get<string>('redis.url') || process.env.REDIS_URL;
    const host = this.configService.get<string>('redis.host') || process.env.REDIS_HOST;
    // Unit tests run without Redis unless one is configured explicitly.
    if (process.env.NODE_ENV === 'test' && !url && !host) {
      this.logger.debug('No Redis configured in test: using the in-process bus');
      return;
    }

    const port = this.configService.get<number>('redis.port') || Number(process.env.REDIS_PORT || 6379);
    const username = this.configService.get<string>('redis.username') || process.env.REDIS_USERNAME;
    const password = this.configService.get<string>('redis.password') || process.env.REDIS_PASSWORD;
    const tls = this.configService.get<boolean>('redis.tls') ?? (url?.startsWith('rediss://') || process.env.REDIS_TLS === 'true');

    const base: RedisOptions = {
      lazyConnect: true,
      connectTimeout: 5000,
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false, // fail fast while disconnected so publish() can fall back
      autoResubscribe: false, // we resubscribe ourselves on 'ready' (includes channels added while down)
      retryStrategy: (times: number) => Math.min(times * 500, 10_000),
      tls: redisTlsOptions(Boolean(tls), process.env, (m) => this.logger.warn(m)),
    };
    const make = () =>
      url ? new Redis(url, base) : new Redis({ ...base, host: host || 'localhost', port, username: username || undefined, password: password || undefined });

    this.pubClient = make();
    this.subClient = make();

    this.pubClient.on('ready', () => (this.pubReady = true));
    this.pubClient.on('close', () => (this.pubReady = false));
    this.subClient.on('ready', () => {
      this.subReady = true;
      this.resubscribeAll();
    });
    this.subClient.on('close', () => {
      if (this.subReady && !this.shuttingDown) this.logger.warn('Redis Pub/Sub subscriber disconnected; reconnecting');
      this.subReady = false;
    });
    for (const c of [this.pubClient, this.subClient]) {
      c.on('error', (err) => this.logger.debug(`Redis Pub/Sub: ${err.message}`));
    }

    this.subClient.on('message', (channel: string, message: string) => this.dispatch(this.channelHandlers.get(channel), channel, message));
    this.subClient.on('pmessage', (pattern: string, channel: string, message: string) =>
      this.dispatch(this.patternHandlers.get(pattern), channel, message),
    );

    // Start connecting; do not block startup for longer than CONNECT_WAIT_MS.
    this.pubClient.connect().catch(() => undefined);
    this.subClient.connect().catch(() => undefined);
    await Promise.race([
      Promise.all([once(this.pubClient, 'ready'), once(this.subClient, 'ready')]),
      new Promise((r) => setTimeout(r, CONNECT_WAIT_MS)),
    ]);
    if (this.isLive()) this.logger.log('Redis Pub/Sub connected (publisher + dedicated subscriber)');
    else this.logger.warn('Redis Pub/Sub not reachable yet; using the in-process bus and retrying in the background');
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    await this.flushBatches();
    await Promise.allSettled([this.pubClient, this.subClient].filter(Boolean).map((c) => c!.quit().catch(() => c!.disconnect())));
    this.localBus.removeAllListeners();
  }

  isLive(): boolean {
    return this.pubReady && this.subReady;
  }

  /** Publishes to Redis; while Redis is down, delivers to this instance's subscribers only. */
  async publish(channel: string, payload: unknown): Promise<number> {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (this.pubReady && this.pubClient) {
      try {
        return await this.pubClient.publish(channel, raw);
      } catch (err: any) {
        this.logger.debug(`Redis publish failed for ${channel}: ${err.message}; delivering locally`);
      }
    }
    this.localBus.emit(channel, channel, raw);
    let delivered = this.channelHandlers.get(channel)?.size ?? 0;
    this.patternHandlers.forEach((handlers, pattern) => {
      if (matchesPattern(pattern, channel)) {
        delivered += handlers.size;
        this.dispatch(handlers, channel, raw);
      }
    });
    return delivered;
  }

  /**
   * Batched publish for high-rate channels: items are buffered per channel and published as one
   * JSON array per window (see publishBatchMs). Subscribers of such a channel must accept both an
   * array and a single object (the latter when batching is off). Fire and forget.
   */
  publishBatched(channel: string, payload: unknown): void {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const windowMs = publishBatchMs();
    if (windowMs === 0) {
      this.publish(channel, raw).catch(() => undefined);
      return;
    }
    let items = this.batches.get(channel);
    if (!items) {
      items = [];
      this.batches.set(channel, items);
    }
    items.push(raw);
    if (items.length >= MAX_BATCH_ITEMS) {
      this.batches.delete(channel);
      this.publish(channel, `[${items.join(',')}]`).catch(() => undefined);
    }
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null;
        void this.flushBatches();
      }, windowMs);
    }
  }

  /** Publishes everything buffered by publishBatched (pipelined when Redis is up). */
  async flushBatches(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    if (this.batches.size === 0) return;
    const out = [...this.batches.entries()].map(([ch, items]) => [ch, `[${items.join(',')}]`] as const);
    this.batches.clear();
    if (this.pubReady && this.pubClient && typeof (this.pubClient as any).pipeline === 'function') {
      try {
        const pipe = this.pubClient.pipeline();
        out.forEach(([ch, raw]) => pipe.publish(ch, raw));
        const results = await pipe.exec();
        if (!results?.some(([err]) => err)) return;
      } catch {
        // fall through to per-channel publish (which falls back to the local bus)
      }
    }
    await Promise.allSettled(out.map(([ch, raw]) => this.publish(ch, raw)));
  }

  async subscribe(channel: string, handler: MessageHandler): Promise<void> {
    let handlers = this.channelHandlers.get(channel);
    if (!handlers) {
      handlers = new Set();
      this.channelHandlers.set(channel, handlers);
      if (this.subReady && this.subClient) await this.subClient.subscribe(channel).catch((e) => this.logger.warn(`subscribe ${channel}: ${e.message}`));
    }
    if (!handlers.has(handler)) {
      handlers.add(handler);
      this.localBus.on(channel, handler);
    }
  }

  async unsubscribe(channel: string, handler: MessageHandler): Promise<void> {
    const handlers = this.channelHandlers.get(channel);
    this.localBus.off(channel, handler);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.channelHandlers.delete(channel);
      if (this.subReady && this.subClient) await this.subClient.unsubscribe(channel).catch(() => undefined);
    }
  }

  /** Glob subscription, e.g. `telemetry:route:*`. */
  async psubscribe(pattern: string, handler: MessageHandler): Promise<void> {
    let handlers = this.patternHandlers.get(pattern);
    if (!handlers) {
      handlers = new Set();
      this.patternHandlers.set(pattern, handlers);
      if (this.subReady && this.subClient) await this.subClient.psubscribe(pattern).catch((e) => this.logger.warn(`psubscribe ${pattern}: ${e.message}`));
    }
    handlers.add(handler);
  }

  async punsubscribe(pattern: string, handler: MessageHandler): Promise<void> {
    const handlers = this.patternHandlers.get(pattern);
    if (!handlers) return;
    handlers.delete(handler);
    if (handlers.size === 0) {
      this.patternHandlers.delete(pattern);
      if (this.subReady && this.subClient) await this.subClient.punsubscribe(pattern).catch(() => undefined);
    }
  }

  private resubscribeAll(): void {
    const channels = [...this.channelHandlers.keys()];
    const patterns = [...this.patternHandlers.keys()];
    if (channels.length) this.subClient?.subscribe(...channels).catch((e) => this.logger.warn(`resubscribe: ${e.message}`));
    if (patterns.length) this.subClient?.psubscribe(...patterns).catch((e) => this.logger.warn(`re-psubscribe: ${e.message}`));
    if (channels.length || patterns.length) this.logger.log(`Redis Pub/Sub resubscribed ${channels.length} channel(s), ${patterns.length} pattern(s)`);
  }

  private dispatch(handlers: Set<MessageHandler> | undefined, channel: string, message: string): void {
    handlers?.forEach((h) => {
      try {
        h(channel, message);
      } catch (err: any) {
        this.logger.error(`Pub/Sub handler error on ${channel}: ${err.message}`);
      }
    });
  }
}

function once(emitter: Redis, event: string): Promise<void> {
  return new Promise((resolve) => emitter.once(event, () => resolve()));
}

/** Redis glob semantics for `*` and `?` (other characters literal). */
export function matchesPattern(pattern: string, channel: string): boolean {
  const re = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${re}$`).test(channel);
}
