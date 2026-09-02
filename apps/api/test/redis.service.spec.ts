import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../src/redis/redis.service';

describe('RedisService (In-Memory Fallback & Rate Limiting)', () => {
  let service: RedisService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'redis.host') return 'invalid-host-for-test';
        if (key === 'redis.port') return 9999;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    await service.onModuleInit(); // triggers fallback mode
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined and operational with fallback', () => {
    expect(service).toBeDefined();
  });

  it('should store, retrieve, and delete values', async () => {
    await service.set('test:key', 'hello_world', 10);
    const val = await service.get('test:key');
    expect(val).toBe('hello_world');

    await service.del('test:key');
    const afterDel = await service.get('test:key');
    expect(afterDel).toBeNull();
  });

  it('should enforce rate limiting and remaining counts correctly', async () => {
    const key = 'otp:9876543210';
    const limit = 3;
    const windowSeconds = 60;

    const res1 = await service.checkRateLimit(key, limit, windowSeconds);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = await service.checkRateLimit(key, limit, windowSeconds);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = await service.checkRateLimit(key, limit, windowSeconds);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);

    const res4 = await service.checkRateLimit(key, limit, windowSeconds);
    expect(res4.allowed).toBe(false);
    expect(res4.remaining).toBe(0);
  });

  it('should blacklist and verify revoked access tokens', async () => {
    const token = 'jwt.test.token.signature';
    expect(await service.isTokenBlacklisted(token)).toBe(false);

    await service.blacklistToken(token, 300);
    expect(await service.isTokenBlacklisted(token)).toBe(true);
  });
});
