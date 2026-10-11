import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  // Resilient in-memory fallback store with TTL
  private readonly fallbackStore = new Map<string, { value: string; expiresAt?: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('redis.url') || process.env.REDIS_URL;
    const host = this.configService.get<string>('redis.host') || process.env.REDIS_HOST || 'localhost';
    const port = this.configService.get<number>('redis.port') || (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379);
    const username = this.configService.get<string>('redis.username') || process.env.REDIS_USERNAME;
    const password = this.configService.get<string>('redis.password') || process.env.REDIS_PASSWORD;
    const useTls = this.configService.get<boolean>('redis.tls') ?? (redisUrl?.startsWith('rediss://') || process.env.REDIS_TLS === 'true');

    try {
      if (redisUrl) {
        const isTls = redisUrl.startsWith('rediss://') || useTls;
        this.client = new Redis(redisUrl, {
          maxRetriesPerRequest: 2,
          connectTimeout: 5000,
          lazyConnect: true,
          tls: isTls ? { rejectUnauthorized: false } : undefined,
          retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
        });
      } else {
        this.client = new Redis({
          host,
          port,
          username: username || undefined,
          password: password || undefined,
          tls: useTls ? { rejectUnauthorized: false } : undefined,
          maxRetriesPerRequest: 2,
          connectTimeout: 5000,
          lazyConnect: true,
          retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
        });
      }

      this.client.on('error', (err) => {
        if (!this.isConnected) {
          this.logger.warn(`Redis / Valkey connection notice (${err.message}). Using high-performance in-memory cache fallback.`);
        }
      });

      await this.client.connect();
      this.isConnected = true;
      this.logger.log(`✅ Live Redis / Valkey connected successfully (${redisUrl ? 'via REDIS_URL' : `${host}:${port}`})`);
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(
        `Redis / Valkey external access not reachable (${err.message}). Seamlessly activated in-memory fallback cache.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
      } catch (_) {}
    }
  }

  getClient(): Redis | null {
    return this.isConnected ? this.client : null;
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // fallback
      }
    }

    const item = this.fallbackStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.fallbackStore.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.setex(key, ttlSeconds, value);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // fallback
      }
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.fallbackStore.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch {
        // fallback
      }
    }
    this.fallbackStore.delete(key);
  }

  async incr(key: string): Promise<number> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.incr(key);
      } catch {
        // fallback
      }
    }

    const current = await this.get(key);
    const count = current ? parseInt(current, 10) + 1 : 1;
    const existing = this.fallbackStore.get(key);
    this.fallbackStore.set(key, {
      value: count.toString(),
      expiresAt: existing?.expiresAt,
    });
    return count;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.expire(key, ttlSeconds);
        return;
      } catch {
        // fallback
      }
    }

    const existing = this.fallbackStore.get(key);
    if (existing) {
      existing.expiresAt = Date.now() + ttlSeconds * 1000;
    }
  }

  /**
   * Rate limiting helper implementing a fixed-window counter with expiration.
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAfter: number }> {
    const rateLimitKey = `ratelimit:${key}`;
    const count = await this.incr(rateLimitKey);

    if (count === 1) {
      await this.expire(rateLimitKey, windowSeconds);
    }

    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;

    return {
      allowed,
      remaining,
      resetAfter: windowSeconds,
    };
  }

  /**
   * Blacklist an access token upon logout.
   */
  async blacklistToken(token: string, ttlSeconds: number): Promise<void> {
    await this.set(`blacklist:${token}`, '1', ttlSeconds);
  }

  /**
   * Check if a token is in the blacklist.
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const val = await this.get(`blacklist:${token}`);
    return val !== null;
  }

  /**
   * Distributed Lock Acquisition (Redlock style SET NX EX).
   * Safe for multi-instance API deployments with fallback support.
   */
  async acquireLock(key: string, ttlSeconds: number = 10): Promise<boolean> {
    const lockKey = `lock:${key}`;
    if (this.isConnected && this.client) {
      try {
        const res = await this.client.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
        return res === 'OK';
      } catch {
        // fallback
      }
    }

    const item = this.fallbackStore.get(lockKey);
    const now = Date.now();
    if (item && (!item.expiresAt || item.expiresAt > now)) {
      return false; // Lock already held
    }

    this.fallbackStore.set(lockKey, { value: '1', expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  /**
   * Release a previously acquired distributed lock.
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await this.del(lockKey);
  }

  /**
   * Owner-safe lock: returns a random token on success, null when held elsewhere.
   * Release with releaseLockToken so a slow holder can never delete a lock it no longer owns.
   */
  async acquireLockToken(key: string, ttlSeconds: number = 10): Promise<string | null> {
    const lockKey = `lock:${key}`;
    const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (this.isConnected && this.client) {
      try {
        const res = await this.client.set(lockKey, token, 'EX', ttlSeconds, 'NX');
        return res === 'OK' ? token : null;
      } catch {
        // fallback
      }
    }

    const item = this.fallbackStore.get(lockKey);
    const now = Date.now();
    if (item && (!item.expiresAt || item.expiresAt > now)) {
      return null;
    }
    this.fallbackStore.set(lockKey, { value: token, expiresAt: now + ttlSeconds * 1000 });
    return token;
  }

  async releaseLockToken(key: string, token: string): Promise<void> {
    const lockKey = `lock:${key}`;
    if (this.isConnected && this.client) {
      try {
        await this.client.eval(
          "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
          1,
          lockKey,
          token,
        );
        return;
      } catch {
        // fallback
      }
    }
    const item = this.fallbackStore.get(lockKey);
    if (item && item.value === token) {
      this.fallbackStore.delete(lockKey);
    }
  }

  // ---- Sorted-set scheduling primitives (with in-memory fallback) ----
  private readonly fallbackZsets = new Map<string, Map<string, number>>();

  async zadd(key: string, score: number, member: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.zadd(key, score, member);
        return;
      } catch {
        // fallback
      }
    }
    let set = this.fallbackZsets.get(key);
    if (!set) {
      set = new Map();
      this.fallbackZsets.set(key, set);
    }
    set.set(member, score);
  }

  async zrem(key: string, member: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.zrem(key, member);
        return;
      } catch {
        // fallback
      }
    }
    this.fallbackZsets.get(key)?.delete(member);
  }

  /**
   * Atomically pop up to `limit` members whose score <= maxScore.
   * In Redis this is a single Lua script, so each member is claimed by exactly one API instance.
   */
  async zclaimDue(key: string, maxScore: number, limit: number = 100): Promise<string[]> {
    if (this.isConnected && this.client) {
      try {
        const res = (await this.client.eval(
          "local due = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, ARGV[2]) " +
            "for _, m in ipairs(due) do redis.call('ZREM', KEYS[1], m) end return due",
          1,
          key,
          String(maxScore),
          String(limit),
        )) as string[];
        return res || [];
      } catch {
        // fallback
      }
    }
    const set = this.fallbackZsets.get(key);
    if (!set) return [];
    const due = Array.from(set.entries())
      .filter(([, score]) => score <= maxScore)
      .sort((a, b) => a[1] - b[1])
      .slice(0, limit)
      .map(([member]) => member);
    for (const m of due) set.delete(m);
    return due;
  }
}
