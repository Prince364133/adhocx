/**
 * In-memory Redis sorted sets for test fakes.
 *  - `client.zadd(key, ['NX',] score, member)` / `client.zrem(key, member)` mirror ioredis.
 *  - `service.zadd(key, score, member, { nx })` / `service.zclaimDue(key, maxScore, limit)` mirror
 *    RedisService (zclaimDue pops due members atomically, lowest score first).
 * Attach both to the same store so the dispatch service (raw client) and the scheduler (service) agree.
 */
export function attachSortedSets(client: any, service?: any): Map<string, Map<string, number>> {
  // One store per client: several services (API instances) over one client share the same sets.
  const zsets: Map<string, Map<string, number>> = client.__zsets ?? new Map();
  client.__zsets = zsets;
  const setOf = (key: string) => {
    if (!zsets.has(key)) zsets.set(key, new Map());
    return zsets.get(key)!;
  };
  const add = (key: string, score: number, member: string, nx: boolean) => {
    const s = setOf(key);
    if (nx && s.has(member)) return 0;
    const isNew = !s.has(member);
    s.set(member, Number(score));
    return isNew ? 1 : 0;
  };

  client.zadd = jest.fn(async (key: string, ...args: any[]) => {
    const nx = args[0] === 'NX';
    const [score, member] = nx ? args.slice(1) : args;
    return add(key, score, member, nx);
  });
  client.zrem = jest.fn(async (key: string, member: string) => (zsets.get(key)?.delete(member) ? 1 : 0));
  client.zscore = jest.fn(async (key: string, member: string) => {
    const v = zsets.get(key)?.get(member);
    return v === undefined ? null : String(v);
  });

  if (service) {
    service.zadd = jest.fn(async (key: string, score: number, member: string, opts: { nx?: boolean } = {}) => {
      add(key, score, member, !!opts.nx);
    });
    service.zrem = jest.fn(async (key: string, member: string) => {
      zsets.get(key)?.delete(member);
    });
    service.zclaimDue = jest.fn(async (key: string, maxScore: number, limit = 100) => {
      const s = zsets.get(key);
      if (!s) return [];
      const due = [...s.entries()]
        .filter(([, score]) => score <= maxScore)
        .sort((a, b) => a[1] - b[1])
        .slice(0, limit)
        .map(([m]) => m);
      for (const m of due) s.delete(m);
      return due;
    });
  }
  return zsets;
}
