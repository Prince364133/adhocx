import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';

export interface HealthReport {
  status: 'OK' | 'DEGRADED' | 'DOWN';
  timestamp: string;
  uptimeSeconds: number;
  components: {
    database: { status: 'UP' | 'DOWN'; latencyMs?: number };
    redis: { status: 'UP' | 'DOWN'; latencyMs?: number };
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
    };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async checkHealth(): Promise<HealthReport> {
    const startDb = Date.now();
    let dbStatus: 'UP' | 'DOWN' = 'UP';
    let dbLatency = 0;

    try {
      if (typeof this.db.$queryRaw === 'function') {
        await this.db.$queryRaw`SELECT 1`;
      }
      dbLatency = Date.now() - startDb;
    } catch (err) {
      this.logger.warn(`Health check database probe failed: ${err}`);
      dbStatus = 'DOWN';
    }

    const startRedis = Date.now();
    let redisStatus: 'UP' | 'DOWN' = 'UP';
    let redisLatency = 0;

    try {
      await this.redis.set('health:ping', 'pong', 5);
      const val = await this.redis.get('health:ping');
      if (val !== 'pong') {
        redisStatus = 'DOWN';
      }
      redisLatency = Date.now() - startRedis;
    } catch (err) {
      this.logger.warn(`Health check Redis probe failed: ${err}`);
      redisStatus = 'DOWN';
    }

    const mem = process.memoryUsage();
    const overallStatus: 'OK' | 'DEGRADED' | 'DOWN' =
      dbStatus === 'UP' && redisStatus === 'UP'
        ? 'OK'
        : dbStatus === 'UP' || redisStatus === 'UP'
        ? 'DEGRADED'
        : 'DOWN';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      components: {
        database: { status: dbStatus, latencyMs: dbLatency },
        redis: { status: redisStatus, latencyMs: redisLatency },
        memory: {
          heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
          rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        },
      },
    };
  }

  checkLiveness(): { status: 'UP'; timestamp: string } {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness(): Promise<{ status: 'READY'; timestamp: string }> {
    const report = await this.checkHealth();
    if (report.status === 'DOWN') {
      throw new ServiceUnavailableException('Core infrastructure is currently unresponsive');
    }

    return {
      status: 'READY',
      timestamp: new Date().toISOString(),
    };
  }
}
