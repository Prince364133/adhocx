/**
 * WS-D test fakes: a small in-memory Prisma stand-in that really evaluates the where clauses the
 * operations / analytics services send (equality, in, not, gt/gte/lt/lte, AND/OR, to-one relation
 * filters, to-many `some`), plus groupBy / aggregate / count / conditional updateMany. Every call
 * yields to the event loop first, so concurrent promises interleave like real I/O; the check-and-set
 * of updateMany itself runs without a yield, which is what a single conditional UPDATE guarantees.
 */
import { attachSortedSets } from './fake-sorted-sets';

export const tickYield = () => new Promise<void>((r) => setImmediate(r));

type Row = Record<string, any>;
type RelationSpec = { table: string; kind: 'one' | 'many'; localKey: string; foreignKey: string };

const RELATIONS: Record<string, Record<string, RelationSpec>> = {
  corporateRoute: {
    tenant: { table: 'corporateTenant', kind: 'one', localKey: 'tenantId', foreignKey: 'id' },
    office: { table: 'corporateOffice', kind: 'one', localKey: 'officeId', foreignKey: 'id' },
    driver: { table: 'driver', kind: 'one', localKey: 'driverId', foreignKey: 'id' },
    vehicle: { table: 'vehicle', kind: 'one', localKey: 'vehicleId', foreignKey: 'id' },
    stops: { table: 'corporateRouteStop', kind: 'many', localKey: 'id', foreignKey: 'routeId' },
    driverEarnings: { table: 'corporateDriverEarning', kind: 'many', localKey: 'id', foreignKey: 'routeId' },
  },
  corporateRouteStop: {
    route: { table: 'corporateRoute', kind: 'one', localKey: 'routeId', foreignKey: 'id' },
    employee: { table: 'corporateEmployee', kind: 'one', localKey: 'employeeId', foreignKey: 'id' },
  },
  corporateTransportRequest: {
    employee: { table: 'corporateEmployee', kind: 'one', localKey: 'employeeId', foreignKey: 'id' },
    tenant: { table: 'corporateTenant', kind: 'one', localKey: 'tenantId', foreignKey: 'id' },
  },
  corporateEmployee: {
    office: { table: 'corporateOffice', kind: 'one', localKey: 'officeId', foreignKey: 'id' },
    transportRequests: { table: 'corporateTransportRequest', kind: 'many', localKey: 'id', foreignKey: 'employeeId' },
    routeStops: { table: 'corporateRouteStop', kind: 'many', localKey: 'id', foreignKey: 'employeeId' },
  },
  corporateSosAlert: {
    route: { table: 'corporateRoute', kind: 'one', localKey: 'routeId', foreignKey: 'id' },
  },
  corporateDriverEarning: {
    route: { table: 'corporateRoute', kind: 'one', localKey: 'routeId', foreignKey: 'id' },
    driver: { table: 'driver', kind: 'one', localKey: 'driverId', foreignKey: 'id' },
  },
  // wire/billing-payouts
  corporateTenant: {
    offices: { table: 'corporateOffice', kind: 'many', localKey: 'id', foreignKey: 'tenantId' },
  },
  corporateInvoice: {
    tenant: { table: 'corporateTenant', kind: 'one', localKey: 'tenantId', foreignKey: 'id' },
    lines: { table: 'corporateInvoiceLine', kind: 'many', localKey: 'id', foreignKey: 'invoiceId' },
    creditNotes: { table: 'corporateCreditNote', kind: 'many', localKey: 'id', foreignKey: 'invoiceId' },
  },
  corporateInvoiceLine: {
    invoice: { table: 'corporateInvoice', kind: 'one', localKey: 'invoiceId', foreignKey: 'id' },
    route: { table: 'corporateRoute', kind: 'one', localKey: 'routeId', foreignKey: 'id' },
  },
  corporatePayoutBatch: {
    payouts: { table: 'corporatePayout', kind: 'many', localKey: 'id', foreignKey: 'batchId' },
    earnings: { table: 'corporateDriverEarning', kind: 'many', localKey: 'id', foreignKey: 'payoutBatchId' },
  },
  corporatePayout: {
    driver: { table: 'driver', kind: 'one', localKey: 'driverId', foreignKey: 'id' },
  },
  corporateInvoiceDispute: {
    creditNote: { table: 'corporateCreditNote', kind: 'one', localKey: 'id', foreignKey: 'disputeId' },
  },
  // Corporate eligibility loads `driver.vehicles` (VERIFIED only); the inline driver.vehicleType never counts.
  driver: {
    vehicles: { table: 'vehicle', kind: 'many', localKey: 'id', foreignKey: 'driverId' },
  },
};

/** Unique constraints enforced on create / createMany (Prisma P2002), as in schema.prisma. */
const UNIQUES: Record<string, string[][]> = {
  corporatePayoutBatch: [['idempotencyKey'], ['batchNumber']],
  corporatePayout: [['idempotencyKey'], ['reversalOfId'], ['batchId', 'driverId', 'kind']],
  corporatePayoutProviderEvent: [['provider', 'eventId']],
  corporateRateCard: [['tenantId', 'vehicleCategory', 'version']],
  corporateDriverRateCard: [['vehicleCategory', 'version']],
  corporateCreditNote: [['disputeId'], ['creditNoteNumber']],
  corporateInvoice: [['invoiceNumber']],
};

const TABLES = [
  'corporateTenant',
  'corporateOffice',
  'corporateEmployee',
  'corporateTransportRequest',
  'corporateRoute',
  'corporateRouteStop',
  'corporateSosAlert',
  'corporateDriverEarning',
  'driver',
  'vehicle',
  'auditLog',
  'deviceToken',
  'user',
  // wire/billing-payouts
  'corporateRateCard',
  'corporateDriverRateCard',
  'corporateInvoice',
  'corporateInvoiceLine',
  'corporatePayoutBatch',
  'corporatePayout',
  'corporatePayoutProviderEvent',
  'corporateInvoiceDispute',
  'corporateCreditNote',
  'corporateTenantPolicy',
] as const;

const OPERATOR_KEYS = new Set(['equals', 'in', 'notIn', 'not', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'mode']);

const norm = (v: any) => (v instanceof Date ? v.getTime() : v);
const eq = (a: any, b: any) => norm(a) === norm(b) || (a == null && b == null);

export class FakeDb {
  tables: Record<string, Map<string, Row>> = {};
  /** Every query issued: [table, method]. Lets tests assert there is no N+1. */
  calls: Array<[string, string]> = [];
  /** Bumped on every insert/delete; invalidates the to-many relation index. */
  private version = 0;
  private index = new Map<string, { version: number; map: Map<any, Row[]> }>();

  constructor() {
    for (const t of TABLES) {
      this.tables[t] = new Map();
      (this as any)[t] = this.delegate(t);
    }
    // Raw SQL (advisory locks) is a no-op in memory: the fake already serialises check-and-set.
    (this as any).$executeRaw = jest.fn(async () => 1);
    (this as any).$transaction = async (arg: any) => {
      await tickYield();
      if (typeof arg === 'function') return arg(this);
      return Promise.all(arg);
    };
  }

  insert(table: string, row: Row): Row {
    this.version++;
    this.tables[table].set(row.id, row);
    return row;
  }

  /** create() with the schema's unique constraints (throws a P2002-coded error like Prisma). */
  insertChecked(table: string, data: Row): Row {
    for (const fields of UNIQUES[table] ?? []) {
      if (fields.some((f) => data[f] == null)) continue;
      const clash = [...this.tables[table].values()].some((r) => fields.every((f) => eq(r[f], data[f])));
      if (clash) {
        const e: any = new Error(`Unique constraint failed on ${table}(${fields.join(', ')})`);
        e.code = 'P2002';
        throw e;
      }
    }
    this.version++;
    const row = { id: data.id ?? `${table}-${this.tables[table].size + 1}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date(), ...data };
    this.tables[table].set(row.id, row);
    return row;
  }

  all(table: string): Row[] {
    return [...this.tables[table].values()];
  }

  // -------------------------------------------------------------------------

  private related(table: string, row: Row, rel: string): Row | Row[] | null {
    const spec = RELATIONS[table]?.[rel];
    if (!spec) return undefined as any;
    const target = this.tables[spec.table];
    if (spec.kind === 'one') {
      const key = row[spec.localKey];
      if (key == null) return null;
      if (spec.foreignKey === 'id') return target.get(key) ?? null;
      return [...target.values()].find((r) => eq(r[spec.foreignKey], key)) ?? null;
    }
    const key = `${spec.table}:${spec.foreignKey}`;
    let idx = this.index.get(key);
    if (!idx || idx.version !== this.version) {
      const map = new Map<any, Row[]>();
      for (const r of target.values()) {
        const k = norm(r[spec.foreignKey]);
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(r);
      }
      idx = { version: this.version, map };
      this.index.set(key, idx);
    }
    return idx.map.get(norm(row[spec.localKey])) ?? [];
  }

  matches(table: string, row: Row, where: any): boolean {
    if (!where) return true;
    for (const [key, cond] of Object.entries(where)) {
      if (cond === undefined) continue;
      if (key === 'AND') {
        if (!(cond as any[]).every((w) => this.matches(table, row, w))) return false;
        continue;
      }
      if (key === 'OR') {
        if (!(cond as any[]).some((w) => this.matches(table, row, w))) return false;
        continue;
      }
      if (key === 'NOT') {
        if (this.matches(table, row, cond)) return false;
        continue;
      }
      const spec = RELATIONS[table]?.[key];
      if (spec) {
        const rel = this.related(table, row, key);
        if (spec.kind === 'one') {
          if (cond === null) {
            if (rel !== null) return false;
          } else if (!rel || !this.matches(spec.table, rel as Row, cond)) return false;
        } else {
          const list = rel as Row[];
          const c: any = cond;
          if (c.some && !list.some((r) => this.matches(spec.table, r, c.some))) return false;
          if (c.every && !list.every((r) => this.matches(spec.table, r, c.every))) return false;
          if (c.none && list.some((r) => this.matches(spec.table, r, c.none))) return false;
        }
        continue;
      }
      if (!this.matchScalar(row[key], cond)) return false;
    }
    return true;
  }

  private matchScalar(value: any, cond: any): boolean {
    if (cond === null) return value == null;
    if (typeof cond !== 'object' || cond instanceof Date) return eq(value, cond);
    const keys = Object.keys(cond);
    if (!keys.every((k) => OPERATOR_KEYS.has(k))) return eq(value, cond);
    for (const [op, arg] of Object.entries(cond)) {
      if (arg === undefined) continue;
      const v = norm(value);
      const a = norm(arg);
      switch (op) {
        case 'equals':
          if (cond.mode === 'insensitive' && typeof value === 'string' && typeof arg === 'string') {
            if (value.toLowerCase() !== arg.toLowerCase()) return false;
          } else if (!eq(value, arg)) return false;
          break;
        case 'in':
          if (!new Set((arg as any[]).map(norm)).has(v)) return false;
          break;
        case 'notIn':
          if ((arg as any[]).some((x) => eq(value, x))) return false;
          break;
        case 'not':
          if (arg === null ? value == null : typeof arg === 'object' && !(arg instanceof Date) ? this.matchScalar(value, arg) : eq(value, arg))
            return false;
          break;
        case 'gt':
          if (!(value != null && v > a)) return false;
          break;
        case 'gte':
          if (!(value != null && v >= a)) return false;
          break;
        case 'lt':
          if (!(value != null && v < a)) return false;
          break;
        case 'lte':
          if (!(value != null && v <= a)) return false;
          break;
        default:
          break;
      }
    }
    return true;
  }

  private project(table: string, row: Row, args: { select?: any; include?: any } = {}): Row {
    if (args.select) {
      const out: Row = {};
      for (const [k, v] of Object.entries(args.select)) {
        if (!v) continue;
        if (RELATIONS[table]?.[k]) out[k] = this.projectRelation(table, row, k, v === true ? {} : v);
        else out[k] = row[k];
      }
      return out;
    }
    const out: Row = { ...row };
    if (args.include) {
      for (const [k, v] of Object.entries(args.include)) {
        if (!v) continue;
        if (k === '_count') {
          // `_count: { select: { rel: true } }` -> number of related rows per relation.
          const counts: Row = {};
          for (const rel of Object.keys((v as any).select ?? {})) {
            counts[rel] = ((this.related(table, row, rel) as Row[]) ?? []).length;
          }
          out[k] = counts;
          continue;
        }
        out[k] = this.projectRelation(table, row, k, v === true ? {} : v);
      }
    }
    return out;
  }

  private projectRelation(table: string, row: Row, rel: string, args: any): any {
    const spec = RELATIONS[table][rel];
    const value = this.related(table, row, rel);
    if (spec.kind === 'one') return value ? this.project(spec.table, value as Row, args) : null;
    let list = (value as Row[]).filter((r) => this.matches(spec.table, r, args.where));
    if (args.orderBy) list = sortRows(list, args.orderBy);
    if (args.take !== undefined) list = list.slice(0, args.take);
    return list.map((r) => this.project(spec.table, r, args));
  }

  private delegate(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- captured by many returned closures
    const self = this;
    const rows = () => [...self.tables[table].values()];
    const find = (args: any = {}) => {
      let list = rows().filter((r) => self.matches(table, r, args.where));
      if (args.orderBy) list = sortRows(list, args.orderBy);
      if (args.skip) list = list.slice(args.skip);
      if (args.take !== undefined) list = list.slice(0, args.take);
      return list;
    };
    const log = (m: string) => self.calls.push([table, m]);
    return {
      findUnique: jest.fn(async (args: any) => {
        log('findUnique');
        await tickYield();
        const where = flattenUnique(args.where);
        const r = where.id !== undefined ? self.tables[table].get(where.id) : rows().find((x) => self.matches(table, x, where));
        return r && self.matches(table, r, where) ? self.project(table, r, args) : null;
      }),
      findFirst: jest.fn(async (args: any = {}) => {
        log('findFirst');
        await tickYield();
        const r = find({ ...args, take: 1 })[0];
        return r ? self.project(table, r, args) : null;
      }),
      findMany: jest.fn(async (args: any = {}) => {
        log('findMany');
        await tickYield();
        return find(args).map((r) => self.project(table, r, args));
      }),
      count: jest.fn(async (args: any = {}) => {
        log('count');
        await tickYield();
        return find({ where: args.where }).length;
      }),
      groupBy: jest.fn(async (args: any) => {
        log('groupBy');
        await tickYield();
        const groups = new Map<string, { key: Row; n: number }>();
        for (const r of find({ where: args.where })) {
          const key: Row = {};
          for (const b of args.by) key[b] = r[b];
          const k = JSON.stringify(args.by.map((b: string) => norm(r[b])));
          const g = groups.get(k) ?? { key, n: 0 };
          g.n++;
          groups.set(k, g);
        }
        return [...groups.values()].map((g) => ({ ...g.key, ...(args._count ? { _count: { _all: g.n } } : {}) }));
      }),
      aggregate: jest.fn(async (args: any) => {
        log('aggregate');
        await tickYield();
        const list = find({ where: args.where });
        const out: Row = {};
        if (args._count) out._count = { _all: list.length };
        if (args._sum) {
          out._sum = {};
          for (const k of Object.keys(args._sum)) {
            out._sum[k] = list.length ? list.reduce((n, r) => n + Number(r[k] ?? 0), 0) : null;
          }
        }
        return out;
      }),
      create: jest.fn(async (args: any) => {
        log('create');
        await tickYield();
        return self.insertChecked(table, args.data);
      }),
      createMany: jest.fn(async (args: any) => {
        log('createMany');
        await tickYield();
        for (const d of args.data) self.insertChecked(table, d);
        return { count: args.data.length };
      }),
      update: jest.fn(async (args: any) => {
        log('update');
        await tickYield();
        const r = self.tables[table].get(args.where.id);
        if (!r || !self.matches(table, r, args.where)) {
          const e: any = new Error('Record to update not found');
          e.code = 'P2025';
          throw e;
        }
        applyData(r, args.data);
        return self.project(table, r, args);
      }),
      updateMany: jest.fn(async (args: any) => {
        log('updateMany');
        await tickYield();
        // Check-and-set with no await in between: one conditional UPDATE statement.
        const list = rows().filter((r) => self.matches(table, r, args.where));
        for (const r of list) applyData(r, args.data);
        return { count: list.length };
      }),
      deleteMany: jest.fn(async (args: any = {}) => {
        log('deleteMany');
        await tickYield();
        const list = rows().filter((r) => self.matches(table, r, args.where));
        for (const r of list) self.tables[table].delete(r.id);
        self.version++;
        return { count: list.length };
      }),
    };
  }
}

/** Prisma compound unique input `{ a_b: { a, b } }` -> `{ a, b }`. */
function flattenUnique(where: any): any {
  const out: any = {};
  for (const [k, v] of Object.entries(where ?? {})) {
    if (k.includes('_') && v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) Object.assign(out, v);
    else out[k] = v;
  }
  return out;
}

/** update data with `{ increment }` support. */
function applyData(row: Row, data: any): void {
  for (const [k, v] of Object.entries(data ?? {})) {
    if (v && typeof v === 'object' && !(v instanceof Date) && 'increment' in (v as any)) {
      row[k] = (row[k] ?? 0) + (v as any).increment;
    } else {
      row[k] = v;
    }
  }
  row.updatedAt = new Date();
}

function sortRows(list: Row[], orderBy: any): Row[] {
  const specs: Array<[string, 'asc' | 'desc']> = (Array.isArray(orderBy) ? orderBy : [orderBy]).flatMap((o: any) =>
    Object.entries(o) as Array<[string, 'asc' | 'desc']>,
  );
  return [...list].sort((a, b) => {
    for (const [k, dir] of specs) {
      const x = norm(a[k]);
      const y = norm(b[k]);
      if (x === y) continue;
      const c = x == null ? -1 : y == null ? 1 : x < y ? -1 : 1;
      return dir === 'desc' ? -c : c;
    }
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Redis
// ---------------------------------------------------------------------------

export class FakeRedisClient {
  kv = new Map<string, { value: string; expiresAt?: number }>();
  sets = new Map<string, Set<string>>();
  constructor(public clock: { now: () => number } = { now: () => Date.now() }) {
    attachSortedSets(this);
  }
  private live(key: string) {
    const e = this.kv.get(key);
    if (!e) return undefined;
    if (e.expiresAt !== undefined && e.expiresAt <= this.clock.now()) {
      this.kv.delete(key);
      return undefined;
    }
    return e;
  }
  async get(key: string) {
    await tickYield();
    return this.live(key)?.value ?? null;
  }
  async mget(...keys: any[]) {
    await tickYield();
    return keys.flat().map((k: string) => this.live(k)?.value ?? null);
  }
  async set(key: string, value: string, ...args: any[]) {
    await tickYield();
    let ttl: number | undefined;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX') ttl = Number(args[++i]);
      else if (args[i] === 'NX') nx = true;
    }
    if (nx && this.live(key)) return null;
    this.kv.set(key, { value, expiresAt: ttl !== undefined ? this.clock.now() + ttl * 1000 : undefined });
    return 'OK';
  }
  async del(key: string) {
    await tickYield();
    return this.kv.delete(key) ? 1 : 0;
  }
  async expire(key: string, seconds: number) {
    await tickYield();
    const e = this.live(key);
    if (e) e.expiresAt = this.clock.now() + seconds * 1000;
    return e ? 1 : 0;
  }
  async sadd(key: string, member: string) {
    await tickYield();
    if (!this.sets.has(key)) this.sets.set(key, new Set());
    this.sets.get(key)!.add(member);
    return 1;
  }
  async srem(key: string, member: string) {
    await tickYield();
    return this.sets.get(key)?.delete(member) ? 1 : 0;
  }
  async smembers(key: string) {
    await tickYield();
    return [...(this.sets.get(key) ?? [])];
  }
  async scard(key: string) {
    await tickYield();
    return this.sets.get(key)?.size ?? 0;
  }
}

export class FakeRedisService {
  zadd!: (key: string, score: number, member: string, opts?: { nx?: boolean }) => Promise<void>;
  zrem!: (key: string, member: string) => Promise<void>;
  constructor(public client: FakeRedisClient = new FakeRedisClient()) {
    attachSortedSets(client, this);
  }
  getClient() {
    return this.client as any;
  }
  async acquireLockToken(key: string, ttlSeconds = 10) {
    const token = Math.random().toString(36).slice(2);
    return (await this.client.set(`lock:${key}`, token, 'EX', ttlSeconds, 'NX')) === 'OK' ? token : null;
  }
  async releaseLockToken(key: string, token: string) {
    const e = this.client.kv.get(`lock:${key}`);
    if (e && e.value === token) this.client.kv.delete(`lock:${key}`);
  }
}

export function makeNotifications() {
  const events: Array<{ channel: string; event: string; payload: any }> = [];
  const pushes: Array<{ userId: string; payload: any }> = [];
  return {
    events,
    pushes,
    emitEvent: jest.fn((channel: string, event: string, payload: any) => {
      events.push({ channel, event, payload });
    }),
    sendPushToUser: jest.fn(async (userId: string, payload: any) => {
      pushes.push({ userId, payload });
    }),
  };
}

export function makeAudit() {
  const logs: any[] = [];
  return { logs, log: jest.fn(async (entry: any) => void logs.push(entry)) };
}

/** Recursively collects every object key of a JSON-able value. */
export function collectKeys(value: any, acc: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, acc));
  else if (value && typeof value === 'object' && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) {
      acc.add(k);
      collectKeys(v, acc);
    }
  }
  return acc;
}
