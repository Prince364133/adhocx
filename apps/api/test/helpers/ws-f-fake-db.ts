/**
 * Minimal in-memory Prisma stand-in for the WS-F specs. Supports the query shapes the WS-F code
 * and RouteSolverService use: equality, in / not / gt / gte / lt / lte / equals(+mode), OR,
 * relation filters (`employee: { officeId }`, `routeStop: { is: null }`), select / include,
 * orderBy, take, unique-key P2002 errors and createMany({ skipDuplicates }).
 */
import { randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';

type Row = Record<string, any>;
type RelResolver = (row: Row, db: FakeDb) => Row | Row[] | null | undefined;

interface TableDef {
  uniques?: string[][];
  relations?: Record<string, RelResolver>;
  defaults?: () => Row;
}

const OPS = new Set(['in', 'not', 'gt', 'gte', 'lt', 'lte', 'equals', 'mode', 'contains']);

const norm = (v: any) => (v instanceof Date ? v.getTime() : v && typeof v === 'object' && 'toNumber' in v ? v.toNumber() : v);

function cmp(a: any, b: any): number {
  const x = norm(a);
  const y = norm(b);
  if (x === y) return 0;
  if (x === null || x === undefined) return -1;
  if (y === null || y === undefined) return 1;
  return x < y ? -1 : 1;
}

export class FakeTable {
  rows = new Map<string, Row>();
  constructor(
    private readonly name: string,
    private readonly db: FakeDb,
    private readonly def: TableDef = {},
  ) {}

  private rel(row: Row, key: string) {
    return this.def.relations?.[key]?.(row, this.db);
  }

  matches(row: Row, where: any): boolean {
    if (!where) return true;
    for (const [key, cond] of Object.entries(where)) {
      if (cond === undefined) continue;
      if (key === 'OR') {
        if (!(cond as any[]).some((w) => this.matches(row, w))) return false;
        continue;
      }
      if (key === 'AND') {
        if (!(cond as any[]).every((w) => this.matches(row, w))) return false;
        continue;
      }
      if (this.def.relations?.[key]) {
        const related = this.rel(row, key);
        if (cond && typeof cond === 'object' && 'is' in (cond as any)) {
          const is = (cond as any).is;
          if (is === null) {
            if (related) return false;
          } else if (!related || !this.db.table(this.relTable(key)).matches(related as Row, is)) return false;
          continue;
        }
        if (!related || !this.db.table(this.relTable(key)).matches(related as Row, cond)) return false;
        continue;
      }
      const value = row[key];
      if (cond !== null && typeof cond === 'object' && !(cond instanceof Date) && !Array.isArray(cond) && Object.keys(cond).some((k) => OPS.has(k))) {
        const c = cond as any;
        const insensitive = c.mode === 'insensitive';
        const eq = (a: any, b: any) =>
          insensitive && typeof a === 'string' && typeof b === 'string' ? a.toLowerCase() === b.toLowerCase() : cmp(a, b) === 0;
        if ('equals' in c && !eq(value, c.equals)) return false;
        if ('in' in c && !c.in.some((v: any) => eq(value, v))) return false;
        if ('not' in c && (c.not === null ? value === null || value === undefined : eq(value, c.not))) return false;
        if ('gt' in c && !(cmp(value, c.gt) > 0)) return false;
        if ('gte' in c && !(cmp(value, c.gte) >= 0)) return false;
        if ('lt' in c && !(cmp(value, c.lt) < 0)) return false;
        if ('lte' in c && !(cmp(value, c.lte) <= 0)) return false;
        if ('contains' in c && !String(value ?? '').toLowerCase().includes(String(c.contains).toLowerCase())) return false;
        continue;
      }
      if (cond === null) {
        if (value !== null && value !== undefined) return false;
        continue;
      }
      if (cmp(value, cond) !== 0) return false;
    }
    return true;
  }

  private relTable(key: string): string {
    return (this.def as any).relationTables?.[key] ?? key;
  }

  private project(row: Row, args: any): Row {
    if (args?.select) {
      const out: Row = {};
      for (const [k, v] of Object.entries(args.select)) {
        if (!v) continue;
        if (this.def.relations?.[k]) {
          const related = this.rel(row, k);
          out[k] = Array.isArray(related) ? related.map((r) => ({ ...r })) : related ? this.db.table(this.relTable(k)).project(related, v === true ? {} : v) : null;
        } else if (k !== '_count') out[k] = row[k];
      }
      return out;
    }
    const out: Row = { ...row };
    if (args?.include) {
      for (const [k, v] of Object.entries(args.include)) {
        if (!v || !this.def.relations?.[k]) continue;
        const related = this.rel(row, k);
        out[k] = Array.isArray(related) ? related.map((r) => ({ ...r })) : related ? { ...related } : null;
      }
    }
    return out;
  }

  private checkUnique(data: Row, ignoreId?: string): boolean {
    for (const keys of this.def.uniques ?? []) {
      if (keys.some((k) => data[k] === undefined || data[k] === null)) continue;
      for (const r of this.rows.values()) {
        if (r.id === ignoreId) continue;
        if (keys.every((k) => cmp(r[k], data[k]) === 0)) return false;
      }
    }
    return true;
  }

  private sorted(list: Row[], orderBy: any): Row[] {
    if (!orderBy) return list;
    const specs = (Array.isArray(orderBy) ? orderBy : [orderBy]).flatMap((o: any) => Object.entries(o));
    return [...list].sort((a, b) => {
      for (const [k, dir] of specs) {
        const c = cmp(a[k], b[k]);
        if (c !== 0) return dir === 'desc' ? -c : c;
      }
      return 0;
    });
  }

  findMany = jest.fn(async (args: any = {}) => {
    let list = [...this.rows.values()].filter((r) => this.matches(r, args.where));
    list = this.sorted(list, args.orderBy);
    if (args.skip) list = list.slice(args.skip);
    if (args.take !== undefined) list = list.slice(0, args.take);
    return list.map((r) => this.project(r, args));
  });
  findFirst = jest.fn(async (args: any = {}) => (await this.findMany({ ...args, take: 1 }))[0] ?? null);
  findUnique = jest.fn(async (args: any = {}) => {
    const r = [...this.rows.values()].find((row) => this.matches(row, args.where));
    return r ? this.project(r, args) : null;
  });
  count = jest.fn(async (args: any = {}) => [...this.rows.values()].filter((r) => this.matches(r, args.where)).length);
  create = jest.fn(async (args: any) => {
    const row: Row = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...(this.def.defaults?.() ?? {}), ...args.data };
    if (!this.checkUnique(row)) throw Object.assign(new Error(`Unique constraint failed on ${this.name}`), { code: 'P2002' });
    this.rows.set(row.id, row);
    return this.project(row, args);
  });
  createMany = jest.fn(async (args: any) => {
    let count = 0;
    for (const data of args.data) {
      const row: Row = { id: randomUUID(), createdAt: new Date(), updatedAt: new Date(), ...(this.def.defaults?.() ?? {}), ...data };
      if (!this.checkUnique(row)) {
        if (args.skipDuplicates) continue;
        throw Object.assign(new Error(`Unique constraint failed on ${this.name}`), { code: 'P2002' });
      }
      this.rows.set(row.id, row);
      count++;
    }
    return { count };
  });
  update = jest.fn(async (args: any) => {
    const row = [...this.rows.values()].find((r) => this.matches(r, args.where));
    if (!row) throw Object.assign(new Error(`${this.name} not found`), { code: 'P2025' });
    Object.assign(row, args.data, { updatedAt: new Date() });
    return this.project(row, args);
  });
  updateMany = jest.fn(async (args: any) => {
    let count = 0;
    for (const r of this.rows.values()) {
      if (!this.matches(r, args.where)) continue;
      Object.assign(r, args.data, { updatedAt: new Date() });
      count++;
    }
    return { count };
  });
  upsert = jest.fn(async (args: any) => {
    const [[compound, fields]] = Object.entries(args.where) as [string, any][];
    const where = compound.includes('_') && typeof fields === 'object' ? fields : args.where;
    const existing = [...this.rows.values()].find((r) => this.matches(r, where));
    if (existing) {
      Object.assign(existing, args.update);
      return { ...existing };
    }
    return this.create({ data: args.create });
  });
  delete = jest.fn(async (args: any) => {
    const row = [...this.rows.values()].find((r) => this.matches(r, args.where));
    if (row) this.rows.delete(row.id);
    return row;
  });
}

export class FakeDb {
  private tables = new Map<string, FakeTable>();

  table(name: string): FakeTable {
    return this.tables.get(name)!;
  }

  constructor() {
    const def = (name: string, d: TableDef & { relationTables?: Record<string, string> } = {}) =>
      this.tables.set(name, new FakeTable(name, this, d));
    def('user', { uniques: [['email'], ['phone']], defaults: () => ({ corporateOfficeIds: [], corporateRole: null }) });
    def('corporateTenant', { uniques: [['code']] });
    def('corporateOffice', { uniques: [['tenantId', 'code']] });
    def('corporateEmployee', {
      uniques: [['tenantId', 'employeeCode']],
      relations: { office: (r: any, db: any) => db.table('corporateOffice').rows.get(r.officeId) },
      relationTables: { office: 'corporateOffice' },
    } as any);
    def('corporateEmployeeLocation');
    def('corporateDepartment', { uniques: [['tenantId', 'code']] });
    def('corporateCostCenter', { uniques: [['tenantId', 'code']] });
    def('corporateTenantPolicy', { uniques: [['tenantId', 'version']] });
    def('corporateShiftTemplate', { uniques: [['tenantId', 'officeId', 'name']] });
    def('corporateHoliday');
    def('corporateRoster', { defaults: () => ({ version: 1 }) });
    def('corporateRosterEntry', { uniques: [['rosterId', 'idempotencyHash']] });
    def('corporateTransportRequest', {
      uniques: [['idempotencyHash']],
      relations: {
        employee: (r: any, db: any) => db.table('corporateEmployee').rows.get(r.employeeId),
        routeStop: (r: any, db: any) => [...db.table('corporateRouteStop').rows.values()].find((s: any) => s.transportRequestId === r.id),
      },
      relationTables: { employee: 'corporateEmployee', routeStop: 'corporateRouteStop' },
    } as any);
    def('corporateRoute');
    def('corporateRouteStop', { uniques: [['transportRequestId'], ['routeId', 'stopSequence']] });
  }

  get user() { return this.table('user'); }
  get corporateTenant() { return this.table('corporateTenant'); }
  get corporateOffice() { return this.table('corporateOffice'); }
  get corporateEmployee() { return this.table('corporateEmployee'); }
  get corporateEmployeeLocation() { return this.table('corporateEmployeeLocation'); }
  get corporateDepartment() { return this.table('corporateDepartment'); }
  get corporateCostCenter() { return this.table('corporateCostCenter'); }
  get corporateTenantPolicy() { return this.table('corporateTenantPolicy'); }
  get corporateShiftTemplate() { return this.table('corporateShiftTemplate'); }
  get corporateHoliday() { return this.table('corporateHoliday'); }
  get corporateRoster() { return this.table('corporateRoster'); }
  get corporateRosterEntry() { return this.table('corporateRosterEntry'); }
  get corporateTransportRequest() { return this.table('corporateTransportRequest'); }
  get corporateRoute() { return this.table('corporateRoute'); }
  get corporateRouteStop() { return this.table('corporateRouteStop'); }

  /** Interactive transaction: runs on the same store (no rollback; the WS-F code under test commits or throws first). */
  $transaction = jest.fn(async (fn: any) => (typeof fn === 'function' ? fn(this) : Promise.all(fn)));
  // Unused delegates some helpers probe for.
  driver = { findFirst: jest.fn(async () => null) };
  vendor = { findFirst: jest.fn(async () => null) };
}

/** Shared lock store: several FakeRedis "instances" over one store behave like one Redis. */
export class FakeRedis {
  constructor(readonly store: Map<string, { token: string; expiresAt: number }> = new Map()) {}
  acquireLockToken = jest.fn(async (key: string, ttlSeconds = 10) => {
    const now = Date.now();
    const held = this.store.get(`lock:${key}`);
    if (held && held.expiresAt > now) return null;
    const token = `${Math.random().toString(36).slice(2)}-${now}`;
    this.store.set(`lock:${key}`, { token, expiresAt: now + ttlSeconds * 1000 });
    return token;
  });
  releaseLockToken = jest.fn(async (key: string, token: string) => {
    const held = this.store.get(`lock:${key}`);
    if (held?.token === token) this.store.delete(`lock:${key}`);
  });
}

export const fakeAudit = () => ({ log: jest.fn().mockResolvedValue(undefined) });

export interface RosterXlsxRow {
  employeeId: string;
  fullName?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  officeCode: string;
  rosterDate: string;
  loginTime?: string;
  logoutTime?: string;
  latitude: number;
  longitude: number;
  department?: string;
}

/** Builds a roster workbook in the official template's column layout. */
export async function buildRosterXlsx(rows: RosterXlsxRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Roster');
  sheet.addRow([
    'employee_id*', 'full_name*', 'email*', 'phone_number*', 'gender*', 'department', 'cost_center',
    'office_code*', 'roster_date*', 'login_time', 'logout_time', 'home_address*', 'landmark', 'latitude', 'longitude',
  ]);
  rows.forEach((r, i) =>
    sheet.addRow([
      r.employeeId, r.fullName ?? `Employee ${r.employeeId}`, `${r.employeeId.toLowerCase()}@acme.test`,
      `98${String(10_000_000 + i).padStart(8, '0')}`, r.gender ?? (i % 3 === 0 ? 'FEMALE' : 'MALE'), r.department ?? 'Engineering', 'CC-1',
      r.officeCode, r.rosterDate, r.loginTime ?? '', r.logoutTime ?? '', `House ${i + 1}, Hyderabad`, '', r.latitude, r.longitude,
    ]),
  );
  return Buffer.from(await wb.xlsx.writeBuffer());
}
