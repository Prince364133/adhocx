import { HttpException, HttpStatus, Injectable, Logger, MessageEvent, OnModuleDestroy } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { LiveVehicleTelemetryPayload } from '@adhocx/contracts';
import { MessageHandler, RedisPubSubService } from '../../../redis/redis-pubsub.service';
import { AUTH_REVOCATIONS_CHANNEL, AuthRevocationEvent } from '../../../redis/auth-revocation';

/** Sinks receive the shared parsed payload: they must treat it as read-only. */
export type TelemetrySink = (fix: LiveVehicleTelemetryPayload) => void;

export interface TelemetryStreamContext {
  /** Caller id, for the per-user stream cap. */
  userId?: string | null;
  /** JWT `exp` (epoch seconds). The stream closes with a `reauth` event when it passes. */
  tokenExpSec?: number | null;
  /** HTTP response (or anything with `writableLength` / `socket`), for backpressure. */
  res?: any;
  /** sha256 of the access token behind this stream, so a logout closes it. */
  tokenHash?: string | null;
}

export type ReauthReason = 'TOKEN_EXPIRED' | 'MAX_LIFETIME' | 'REVOKED';

interface OpenStream {
  userId: string | null;
  tokenHash: string | null;
  close: (reason: ReauthReason) => void;
}

export const SSE_HEARTBEAT_MS = 25_000;
/** Above this many unsent bytes on the socket a flush is skipped (fixes stay conflated). */
export const SSE_BACKPRESSURE_BYTES = 1024 * 1024;
const MAX_TIMER_MS = 2_147_483_647;

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

interface ChannelEntry {
  sinks: Set<TelemetrySink>;
  handler: MessageHandler;
  /** Resolves once the Pub/Sub subscription is registered (unsubscribe waits for it). */
  ready: Promise<void>;
}

/**
 * Process-wide SSE fan-out for live telemetry.
 *
 * One Pub/Sub subscription per channel per process (refcounted by attached streams); each Redis
 * message is JSON-parsed once and handed to every attached stream. Fleet streams conflate to the
 * newest fix per route and flush one `fixes` event (array) per interval, so per-connection work
 * and memory are bounded by the number of vehicles, not the message rate. Slow sockets skip
 * flushes instead of buffering without bound. Streams end with a `reauth` event when the
 * caller's token expires or the max lifetime passes; the client reconnects with a fresh token.
 */
@Injectable()
export class TelemetryStreamHub implements OnModuleDestroy {
  private readonly logger = new Logger(TelemetryStreamHub.name);
  private readonly channels = new Map<string, ChannelEntry>();
  private readonly userStreams = new Map<string, number>();
  private readonly openStreams = new Set<OpenStream>();
  private revocationListener: MessageHandler | null = null;

  constructor(private readonly pubsub: RedisPubSubService) {}

  get flushMs(): number {
    return envInt('TELEMETRY_SSE_FLUSH_MS', 500);
  }
  get maxLifetimeMs(): number {
    return envInt('TELEMETRY_SSE_MAX_LIFETIME_MS', 60 * 60 * 1000);
  }
  get maxPerUser(): number {
    return envInt('TELEMETRY_SSE_MAX_PER_USER', 5);
  }

  /** Attaches a sink to a channel; returns the detach function (idempotent). */
  attach(channel: string, sink: TelemetrySink): () => void {
    let entry = this.channels.get(channel);
    if (!entry) {
      const sinks = new Set<TelemetrySink>();
      const handler: MessageHandler = (_ch, raw) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return; // malformed frame
        }
        // Publishers batch (one array per window); a single object when batching is off.
        const fixes = (Array.isArray(parsed) ? parsed : [parsed]) as LiveVehicleTelemetryPayload[];
        for (const fix of fixes) {
          if (!fix || typeof fix !== 'object') continue;
          sinks.forEach((s) => {
            try {
              s(fix);
            } catch (err: any) {
              this.logger.error(`Telemetry sink error on ${channel}: ${err?.message}`);
            }
          });
        }
      };
      const ready = this.pubsub.subscribe(channel, handler).catch((err) => {
        this.logger.warn(`Telemetry subscribe ${channel} failed: ${err?.message}`);
      });
      entry = { sinks, handler, ready };
      this.channels.set(channel, entry);
    }
    const current = entry;
    current.sinks.add(sink);

    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
      current.sinks.delete(sink);
      if (current.sinks.size === 0 && this.channels.get(channel) === current) {
        this.channels.delete(channel);
        // Wait for the subscribe to land so it cannot re-register after this unsubscribe.
        void current.ready.then(() => this.pubsub.unsubscribe(channel, current.handler)).catch(() => undefined);
      }
    };
  }

  /** Reserves one stream slot for the user; throws 429 past the cap. Returns the release fn. */
  acquireSlot(userId: string | null | undefined): () => void {
    const key = String(userId ?? 'anonymous');
    const n = this.userStreams.get(key) ?? 0;
    if (n >= this.maxPerUser) {
      throw new HttpException(`Too many live streams open for this account (max ${this.maxPerUser})`, HttpStatus.TOO_MANY_REQUESTS);
    }
    this.userStreams.set(key, n + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const left = (this.userStreams.get(key) ?? 1) - 1;
      if (left <= 0) this.userStreams.delete(key);
      else this.userStreams.set(key, left);
    };
  }

  /** Conflated fleet stream: `fixes` events (array, newest fix per route) every flush interval. */
  openFleetStream(channel: string, ctx: TelemetryStreamContext = {}): Observable<MessageEvent> {
    const release = this.acquireSlot(ctx.userId);
    return new Observable<MessageEvent>((subscriber) => {
      const pending = new Map<string, LiveVehicleTelemetryPayload>();
      const detach = this.attach(channel, (fix) => {
        const key = fix.routeId;
        if (!key) return;
        const prev = pending.get(key);
        if (prev && Number(prev.recordedAt) > Number(fix.recordedAt)) return;
        pending.set(key, fix);
      });
      const flush = (force = false) => {
        if (pending.size === 0) return;
        if (!force && isCongested(ctx.res)) return;
        const batch = [...pending.values()];
        pending.clear();
        subscriber.next({ type: 'fixes', data: batch } as MessageEvent);
      };
      const flushTimer = setInterval(() => flush(), this.flushMs);
      const teardown = this.lifecycle(subscriber, ctx, () => flush(true));
      return () => {
        clearInterval(flushTimer);
        teardown();
        detach();
        pending.clear();
        release();
      };
    });
  }

  /**
   * Per-route stream: one `message` event per fix (unchanged wire format).
   *
   * Routes have no channel of their own (one PUBLISH per fix per route cannot be batched and
   * doubled Redis load): the stream attaches to the route's tenant channel, which is batched,
   * and keeps only `routeId`'s fixes. `channel` may be a promise (the tenant is looked up); the
   * stream slot is reserved synchronously so the 429 still happens before any SSE headers.
   */
  openRouteStream(channel: string | Promise<string>, ctx: TelemetryStreamContext = {}, routeId?: string): Observable<MessageEvent> {
    const release = this.acquireSlot(ctx.userId);
    return new Observable<MessageEvent>((subscriber) => {
      let detach: (() => void) | null = null;
      let done = false;
      const sink: TelemetrySink = (fix) => {
        if (!routeId || fix.routeId === routeId) subscriber.next({ data: fix } as MessageEvent);
      };
      Promise.resolve(channel).then(
        (ch) => {
          if (!done) detach = this.attach(ch, sink);
        },
        (err) => {
          if (!done) subscriber.error(err);
        },
      );
      const teardown = this.lifecycle(subscriber, ctx);
      return () => {
        done = true;
        teardown();
        detach?.();
        release();
      };
    });
  }

  /** Heartbeat, token-expiry / max-lifetime close, and close on revocation. Returns its teardown. */
  private lifecycle(subscriber: { next: (e: MessageEvent) => void; complete: () => void }, ctx: TelemetryStreamContext, beforeClose?: () => void) {
    let closed = false;
    const close = (reason: ReauthReason) => {
      if (closed) return;
      closed = true;
      if (reason !== 'REVOKED') beforeClose?.(); // never hand a revoked session one more batch
      subscriber.next({ type: 'reauth', data: { reason } } as MessageEvent);
      subscriber.complete();
    };
    const heartbeat = setInterval(() => subscriber.next({ type: 'heartbeat', data: '{}' } as MessageEvent), SSE_HEARTBEAT_MS);
    const expMs = Number(ctx.tokenExpSec) > 0 ? Number(ctx.tokenExpSec) * 1000 - Date.now() : Infinity;
    const reason: ReauthReason = expMs <= this.maxLifetimeMs ? 'TOKEN_EXPIRED' : 'MAX_LIFETIME';
    const closeIn = Math.max(0, Math.min(expMs, this.maxLifetimeMs, MAX_TIMER_MS));
    const closer = setTimeout(() => close(reason), closeIn);

    const entry: OpenStream = { userId: ctx.userId ? String(ctx.userId) : null, tokenHash: ctx.tokenHash ?? null, close };
    this.openStreams.add(entry);
    this.ensureRevocationListener();
    return () => {
      closed = true;
      clearInterval(heartbeat);
      clearTimeout(closer);
      this.openStreams.delete(entry);
    };
  }

  /** One subscription per process to session revocations (logout, suspension). */
  private ensureRevocationListener(): void {
    if (this.revocationListener) return;
    this.revocationListener = (_ch, raw) => {
      let event: AuthRevocationEvent;
      try {
        event = JSON.parse(raw);
      } catch {
        return;
      }
      this.revoke(event);
    };
    this.pubsub.subscribe(AUTH_REVOCATIONS_CHANNEL, this.revocationListener).catch((err) => {
      this.logger.warn(`Subscribe ${AUTH_REVOCATIONS_CHANNEL} failed: ${err?.message}`);
    });
  }

  /** Closes every open stream of the revoked user or token on this process. Returns how many. */
  revoke(event: AuthRevocationEvent): number {
    if (!event || (!event.userId && !event.tokenHash)) return 0;
    const hits = [...this.openStreams].filter(
      (s) => (event.userId && s.userId === String(event.userId)) || (event.tokenHash && s.tokenHash === event.tokenHash),
    );
    hits.forEach((s) => s.close('REVOKED'));
    if (hits.length) this.logger.log(`Closed ${hits.length} live stream(s) after session revocation`);
    return hits.length;
  }

  /** For health/metrics. */
  stats(): { channels: number; sinks: number; streamsByUser: number } {
    let sinks = 0;
    this.channels.forEach((e) => (sinks += e.sinks.size));
    let streams = 0;
    this.userStreams.forEach((n) => (streams += n));
    return { channels: this.channels.size, sinks, streamsByUser: streams };
  }

  onModuleDestroy(): void {
    this.channels.forEach((e, ch) => void this.pubsub.unsubscribe(ch, e.handler).catch(() => undefined));
    if (this.revocationListener) void this.pubsub.unsubscribe(AUTH_REVOCATIONS_CHANNEL, this.revocationListener).catch(() => undefined);
    this.revocationListener = null;
    this.openStreams.clear();
    this.channels.clear();
    this.userStreams.clear();
  }
}

function isCongested(res: any): boolean {
  if (!res) return false;
  const pending = Math.max(Number(res.writableLength) || 0, Number(res.socket?.writableLength) || 0);
  return pending > SSE_BACKPRESSURE_BYTES;
}
