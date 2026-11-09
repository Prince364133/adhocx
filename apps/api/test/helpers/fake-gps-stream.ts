/**
 * In-memory fakes for WS-B tests: a Redis client with strings (EX/NX) and Streams with consumer
 * groups (XADD MAXLEN, XGROUP CREATE, XREADGROUP '>', XACK, XAUTOCLAIM), and a Prisma-like
 * `corporateVehiclePosition` delegate that enforces the (route, recordedAt, driver, receivedAt)
 * unique key the way Postgres does.
 */

export class FakeClock {
  constructor(public ms: number = Date.UTC(2026, 10, 3, 2, 30, 0)) {}
  now = () => this.ms;
  advance(ms: number) {
    this.ms += ms;
  }
}

interface StreamEntry {
  id: string;
  fields: string[];
}
interface PendingInfo {
  consumer: string;
  deliveredAt: number;
  deliveries: number;
}
interface Group {
  lastDeliveredIdx: number;
  pel: Map<string, PendingInfo>;
}

export class FakeStreamRedis {
  readonly kv = new Map<string, { v: string; exp?: number }>();
  readonly streams = new Map<string, StreamEntry[]>();
  readonly groups = new Map<string, Group>();
  private seq = 0;
  /** Number of XACK calls that should fail (simulates a lost ack => re-delivery). */
  failNextAcks = 0;
  readonly calls = { xadd: 0, xreadgroup: 0, xack: 0, xautoclaim: 0, mget: 0, script: 0 };
  readonly xaddArgs: any[][] = [];

  constructor(private readonly clock: FakeClock = new FakeClock()) {}

  async get(key: string): Promise<string | null> {
    const e = this.kv.get(key);
    if (!e) return null;
    if (e.exp !== undefined && e.exp <= this.clock.now()) {
      this.kv.delete(key);
      return null;
    }
    return e.v;
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK' | null> {
    let exp: number | undefined;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX') exp = this.clock.now() + Number(args[++i]) * 1000;
      else if (args[i] === 'NX') nx = true;
    }
    if (nx && (await this.get(key)) !== null) return null;
    this.kv.set(key, { v: value, exp });
    return 'OK';
  }

  async mget(...keys: string[]): Promise<Array<string | null>> {
    this.calls.mget++;
    return Promise.all(keys.map((k) => this.get(k)));
  }

  async del(key: string): Promise<number> {
    return this.kv.delete(key) ? 1 : 0;
  }

  async xadd(key: string, ...args: any[]): Promise<string> {
    this.calls.xadd++;
    this.xaddArgs.push([key, ...args]);
    let i = 0;
    let maxLen: number | undefined;
    if (args[0] === 'MAXLEN') {
      i = args[1] === '~' ? 2 : 1;
      maxLen = Number(args[i]);
      i++;
    }
    if (args[i] !== '*') throw new Error('fake xadd supports * ids only');
    const fields = args.slice(i + 1).map(String);
    const id = `${this.clock.now()}-${this.seq++}`;
    const list = this.streams.get(key) ?? [];
    list.push({ id, fields });
    this.streams.set(key, list);
    if (maxLen !== undefined && list.length > maxLen) {
      const drop = list.length - maxLen;
      list.splice(0, drop);
      for (const g of this.groupsOf(key)) g.lastDeliveredIdx = Math.max(-1, g.lastDeliveredIdx - drop);
    }
    return id;
  }

  async xgroup(cmd: string, key: string, group: string, _start: string, mk?: string): Promise<'OK'> {
    if (cmd !== 'CREATE') throw new Error('fake xgroup supports CREATE only');
    const gk = `${key}|${group}`;
    if (this.groups.has(gk)) throw new Error('BUSYGROUP Consumer Group name already exists');
    if (!this.streams.has(key)) {
      if (mk !== 'MKSTREAM') throw new Error('ERR no such key');
      this.streams.set(key, []);
    }
    this.groups.set(gk, { lastDeliveredIdx: -1, pel: new Map() });
    return 'OK';
  }

  async xreadgroup(...args: any[]): Promise<any> {
    this.calls.xreadgroup++;
    const group = args[1];
    const consumer = args[2];
    const count = Number(args[args.indexOf('COUNT') + 1]);
    const key = args[args.indexOf('STREAMS') + 1];
    const g = this.groups.get(`${key}|${group}`);
    if (!g) throw new Error('NOGROUP No such key or consumer group');
    const list = this.streams.get(key) ?? [];
    const out: Array<[string, string[]]> = [];
    while (out.length < count && g.lastDeliveredIdx + 1 < list.length) {
      g.lastDeliveredIdx++;
      const e = list[g.lastDeliveredIdx];
      g.pel.set(e.id, { consumer, deliveredAt: this.clock.now(), deliveries: 1 });
      out.push([e.id, e.fields]);
    }
    return out.length ? [[key, out]] : null;
  }

  async xack(key: string, group: string, ...ids: string[]): Promise<number> {
    this.calls.xack++;
    if (this.failNextAcks > 0) {
      this.failNextAcks--;
      throw new Error('fake: connection reset during XACK');
    }
    const g = this.groups.get(`${key}|${group}`);
    let n = 0;
    for (const id of ids) if (g?.pel.delete(id)) n++;
    return n;
  }

  async xautoclaim(key: string, group: string, consumer: string, minIdle: number, _start: string, _c: string, count: number): Promise<any> {
    this.calls.xautoclaim++;
    const g = this.groups.get(`${key}|${group}`);
    if (!g) throw new Error('NOGROUP');
    const byId = new Map((this.streams.get(key) ?? []).map((e) => [e.id, e]));
    const claimed: Array<[string, string[]]> = [];
    for (const [id, p] of g.pel) {
      if (claimed.length >= count) break;
      if (this.clock.now() - p.deliveredAt < minIdle) continue;
      p.consumer = consumer;
      p.deliveredAt = this.clock.now();
      p.deliveries++;
      const e = byId.get(id);
      if (e) claimed.push([id, e.fields]);
      else g.pel.delete(id); // trimmed away (Redis 7 reports it as deleted)
    }
    return ['0-0', claimed, []];
  }

  pendingCount(key: string, group: string): number {
    return this.groups.get(`${key}|${group}`)?.pel.size ?? 0;
  }

  maxDeliveries(key: string, group: string): number {
    let m = 0;
    for (const p of this.groups.get(`${key}|${group}`)?.pel.values() ?? []) m = Math.max(m, p.deliveries);
    return m;
  }

  private groupsOf(key: string): Group[] {
    return [...this.groups.entries()].filter(([k]) => k.startsWith(`${key}|`)).map(([, g]) => g);
  }
}

export interface FakePositionRow {
  id: bigint;
  tenantId: string;
  routeId: string;
  driverId: string;
  lat: number;
  lng: number;
  speedKph: number | null;
  heading: number | null;
  accuracyM: number | null;
  batteryPct: number | null;
  recordedAt: Date;
  receivedAt: Date;
}

const posKey = (d: any) =>
  `${d.routeId}|${new Date(d.recordedAt).getTime()}|${d.driverId}|${new Date(d.receivedAt).getTime()}`;

const cmp = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0);

function matchRange(v: Date, r: any): boolean {
  if (r === undefined) return true;
  if (r instanceof Date) return v.getTime() === r.getTime();
  const t = v.getTime();
  if (r.gte && t < new Date(r.gte).getTime()) return false;
  if (r.gt && t <= new Date(r.gt).getTime()) return false;
  if (r.lte && t > new Date(r.lte).getTime()) return false;
  if (r.lt && t >= new Date(r.lt).getTime()) return false;
  return true;
}

function matchWhere(row: FakePositionRow, w: any): boolean {
  if (!w) return true;
  if (w.routeId && row.routeId !== w.routeId) return false;
  if (w.tenantId && row.tenantId !== w.tenantId) return false;
  if (!matchRange(row.recordedAt, w.recordedAt)) return false;
  if (!matchRange(row.receivedAt, w.receivedAt)) return false;
  if (w.id !== undefined) {
    if (typeof w.id === 'object' && w.id.gt !== undefined && !(row.id > BigInt(w.id.gt))) return false;
  }
  if (Array.isArray(w.OR) && !w.OR.some((o: any) => matchWhere(row, o))) return false;
  return true;
}

export function createFakePositionsDb() {
  const rows = new Map<string, FakePositionRow>();
  let nextId = 1n;
  const state = { failNext: 0, failWith: undefined as any, inserted: 0, skipped: 0, batchSizes: [] as number[] };

  const delegate: any = {
    createMany: jest.fn(async ({ data, skipDuplicates }: { data: any[]; skipDuplicates?: boolean }) => {
      state.batchSizes.push(data.length);
      if (state.failNext > 0) {
        state.failNext--;
        throw state.failWith ?? new Error('fake: connection terminated');
      }
      let count = 0;
      for (const d of data) {
        const k = posKey(d);
        if (rows.has(k)) {
          if (!skipDuplicates) throw new Error('duplicate key value violates unique constraint');
          state.skipped++;
          continue;
        }
        rows.set(k, { ...d, id: nextId++ });
        count++;
      }
      state.inserted += count;
      return { count };
    }),
    findMany: jest.fn(async ({ where, orderBy, take }: any) => {
      let list = [...rows.values()].filter((r) => matchWhere(r, where));
      const orders: any[] = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
      list.sort((a: any, b: any) => {
        for (const o of orders) {
          const [f, dir] = Object.entries(o)[0] as [string, string];
          const c = cmp(a[f] instanceof Date ? a[f].getTime() : a[f], b[f] instanceof Date ? b[f].getTime() : b[f]);
          if (c !== 0) return dir === 'desc' ? -c : c;
        }
        return 0;
      });
      if (take !== undefined) list = list.slice(0, take);
      return list;
    }),
    findFirst: jest.fn(async (args: any): Promise<any> => (await delegate.findMany({ ...args, take: 1 }))[0] ?? null),
  };
  return { rows, state, delegate };
}

/**
 * FakeStreamRedis plus ioredis `defineCommand`, with GPS_APPLY_LUA emulated in JS step for step
 * (Lua itself cannot run here). Exercises the service's atomic-path orchestration.
 */
export class FakeLuaRedis extends FakeStreamRedis {
  /** Make XADD inside the "script" fail (redis.pcall error => '!'). */
  failScriptXadd = false;
  /** Throw this message from the script call (e.g. CROSSSLOT). */
  scriptError: string | null = null;
  defined: string[] = [];

  defineCommand(name: string, _def: { numberOfKeys: number; lua: string }): void {
    this.defined.push(name);
    (this as any)[name] = async (latestKey: string, seenKey: string, streamKey: string, ...argv: string[]) => {
      this.calls.script++;
      if (this.scriptError) throw new Error(this.scriptError);
      const [recordedAtMs, latestJson, latestTtl, seenTtl, maxLen, recordJson] = argv;
      if (recordJson !== '') {
        if ((await this.set(seenKey, '1', 'EX', seenTtl, 'NX')) === null) return [0, ''];
      }
      let status = 1;
      const prev = await this.get(latestKey);
      if (prev) {
        try {
          const d = JSON.parse(prev);
          const prevMs = Number(d?.recordedAtMs);
          if (d && typeof d === 'object' && d.recordedAtMs !== undefined && Number.isFinite(prevMs) && prevMs > Number(recordedAtMs)) status = 2;
        } catch {
          // like pcall(cjson.decode)
        }
      }
      if (status === 1) await this.set(latestKey, latestJson, 'EX', latestTtl);
      let sid = '';
      if (recordJson !== '') {
        sid = this.failScriptXadd ? '!' : await this.xadd(streamKey, 'MAXLEN', '~', maxLen, '*', 'f', recordJson);
      }
      return [status, sid];
    };
  }
}
