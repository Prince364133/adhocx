import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../src/modules/health/health.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockDb: { $queryRaw: jest.Mock };
  let mockRedis: { set: jest.Mock; get: jest.Mock };

  beforeEach(async () => {
    mockDb = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    mockRedis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue('pong'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return OK when DB and Redis are both UP', async () => {
    const report = await service.checkHealth();

    expect(report.status).toBe('OK');
    expect(report.components.database.status).toBe('UP');
    expect(report.components.redis.status).toBe('UP');
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(report.components.memory.heapUsedMb).toBeGreaterThan(0);
  });

  it('should return DEGRADED when database probe fails', async () => {
    mockDb.$queryRaw.mockRejectedValueOnce(new Error('DB connection refused'));

    const report = await service.checkHealth();

    expect(report.status).toBe('DEGRADED');
    expect(report.components.database.status).toBe('DOWN');
    expect(report.components.redis.status).toBe('UP');
  });

  it('should return liveness status UP', () => {
    const liveness = service.checkLiveness();

    expect(liveness.status).toBe('UP');
    expect(liveness.timestamp).toBeDefined();
  });

  it('should return readiness READY when healthy', async () => {
    const readiness = await service.checkReadiness();

    expect(readiness.status).toBe('READY');
    expect(readiness.timestamp).toBeDefined();
  });
});
