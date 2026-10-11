import { ConfigService } from '@nestjs/config';
import { DispatchSchedulerService } from '../src/modules/dispatch/dispatch-scheduler.service';
import { RedisService } from '../src/redis/redis.service';

describe('DispatchSchedulerService (exact-time wave jobs)', () => {
  const makeRedis = () => new RedisService({ get: () => undefined } as unknown as ConfigService); // not connected -> in-memory fallback

  it('fires a job only once it is due, exactly once', async () => {
    const scheduler = new DispatchSchedulerService(makeRedis());
    const fired: string[] = [];
    scheduler.registerHandler(async (m) => {
      fired.push(m);
    });

    await scheduler.schedule('wave:req-1:1', 30_000);
    expect(await scheduler.tick(29_999)).toEqual([]);
    expect(await scheduler.tick(30_000)).toEqual(['wave:req-1:1']);
    expect(await scheduler.tick(60_000)).toEqual([]);
    expect(fired).toEqual(['wave:req-1:1']);
  });

  it('cancelled jobs never fire', async () => {
    const scheduler = new DispatchSchedulerService(makeRedis());
    const handler = jest.fn();
    scheduler.registerHandler(handler);
    await scheduler.schedule('wave:req-2:1', 1000);
    await scheduler.cancel('wave:req-2:1');
    await scheduler.tick(5000);
    expect(handler).not.toHaveBeenCalled();
  });

  it('re-scheduling the same member moves its due time (idempotent rehydration)', async () => {
    const scheduler = new DispatchSchedulerService(makeRedis());
    scheduler.registerHandler(async () => undefined);
    await scheduler.schedule('wave:req-3:1', 1000);
    await scheduler.schedule('wave:req-3:1', 5000);
    expect(await scheduler.tick(2000)).toEqual([]);
    expect(await scheduler.tick(5000)).toEqual(['wave:req-3:1']);
  });

  it('two instances sharing one store claim each job exactly once', async () => {
    const shared = makeRedis();
    const a = new DispatchSchedulerService(shared);
    const b = new DispatchSchedulerService(shared);
    const fired: string[] = [];
    a.registerHandler(async (m) => void fired.push(`a:${m}`));
    b.registerHandler(async (m) => void fired.push(`b:${m}`));
    for (let i = 0; i < 20; i++) await a.schedule(`wave:req-${i}:1`, 100);
    await Promise.all([a.tick(200), b.tick(200)]);
    expect(fired).toHaveLength(20);
    expect(new Set(fired.map((f) => f.slice(2))).size).toBe(20);
  });

  it('a failing handler does not block other due jobs', async () => {
    const scheduler = new DispatchSchedulerService(makeRedis());
    const ok = jest.fn();
    scheduler.registerHandler(async (m) => {
      if (m.endsWith('bad')) throw new Error('boom');
      ok(m);
    });
    await scheduler.schedule('redispatch:bad', 10);
    await scheduler.schedule('redispatch:good', 20);
    await scheduler.tick(100);
    expect(ok).toHaveBeenCalledWith('redispatch:good');
  });

  it('works with no RedisService at all (local map fallback)', async () => {
    const scheduler = new DispatchSchedulerService(undefined);
    const handler = jest.fn();
    scheduler.registerHandler(handler);
    await scheduler.schedule('wave:req-9:2', 50);
    await scheduler.tick(50);
    expect(handler).toHaveBeenCalledWith('wave:req-9:2');
  });
});

describe('RedisService owner-safe locks (fallback store)', () => {
  it('only the holder token can release; a stale holder cannot delete a newer lock', async () => {
    const redis = new RedisService({ get: () => undefined } as unknown as ConfigService);
    const t1 = await redis.acquireLockToken('dispatch:req-1', 10);
    expect(t1).toBeTruthy();
    expect(await redis.acquireLockToken('dispatch:req-1', 10)).toBeNull();
    await redis.releaseLockToken('dispatch:req-1', 'not-the-owner');
    expect(await redis.acquireLockToken('dispatch:req-1', 10)).toBeNull();
    await redis.releaseLockToken('dispatch:req-1', t1!);
    expect(await redis.acquireLockToken('dispatch:req-1', 10)).toBeTruthy();
  });
});
