import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  // In-memory fallback map with TTL for environments where Redis is not active
  private readonly fallbackStore = new Map<string, { value: string; expiresAt?: number }>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;
    const password = this.configService.get<string>('redis.password');

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      });

      this.client.on('error', (err) => {
        if (!this.isConnected) {
          this.logger.warn(`Redis not available (${err.message}). Using in-memory fallback.`);
        }
      });

      await this.client.connect();
      this.isConnected = true;
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    } catch {
      this.isConnected = false;
      this.logger.warn(`Could not connect to Redis at ${host}:${port}. Using in-memory fallback.`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
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
}
