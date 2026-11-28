import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface SimulationStepResult {
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
}

export interface SimulationReport {
  suite: string;
  mode: 'LIVE_DB' | 'ISOLATED_SERVICE_HARNESS';
  executedAt: string;
  passed: boolean;
  cleanupVerified: boolean;
  steps: SimulationStepResult[];
}

export function assertNonProductionEnvironment() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Simulations are strictly prohibited when NODE_ENV=production.');
  }
}

export function assertInvariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Simulation assertion failed: ${message}`);
  }
}

export async function runStep(
  steps: SimulationStepResult[],
  name: string,
  fn: () => Promise<string | void>,
): Promise<void> {
  const started = Date.now();
  try {
    const details = await fn();
    steps.push({
      name,
      passed: true,
      durationMs: Date.now() - started,
      details: details || undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    steps.push({
      name,
      passed: false,
      durationMs: Date.now() - started,
      details: msg,
    });
    throw err;
  }
}

export function writeSimulationReport(report: SimulationReport, outDir: string) {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `${report.suite}.report.json`);
  const mdPath = path.join(outDir, `${report.suite}.report.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

  const lines = [
    `# Simulation Report: ${report.suite}`,
    '',
    `- **Mode:** ${report.mode}`,
    `- **Executed At:** ${report.executedAt}`,
    `- **Status:** ${report.passed ? 'PASSED' : 'FAILED'}`,
    `- **Cleanup Verified:** ${report.cleanupVerified ? 'YES' : 'NO'}`,
    '',
    '| Step | Status | Duration (ms) | Details |',
    '| :--- | :--- | :---: | :--- |',
    ...report.steps.map(
      (s) =>
        `| ${s.name} | ${s.passed ? 'PASS' : 'FAIL'} | ${s.durationMs} | ${(s.details || '').replace(/\|/g, '\\|')} |`,
    ),
    '',
  ];
  fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
  return { jsonPath, mdPath };
}

export function resolveConfirmedLiveDbHost(): string | null {
  const arg = process.argv.find((a) => a.startsWith('--confirm-host='));
  if (!arg) return null;
  const confirmed = arg.slice('--confirm-host='.length);
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL must be set when using --confirm-host.');
  }
  const host = new URL(url).hostname;
  if (confirmed !== host) {
    throw new Error(`--confirm-host=${confirmed} does not match DATABASE_URL host "${host}".`);
  }
  return host;
}

/**
 * Shared in-memory transactional DatabaseService harness used when running
 * simulations without a dedicated local/staging Postgres target.
 */
export function createSimulatedFleetDb() {
  const state = {
    fleets: new Map<string, any>(),
    fleetAdmins: new Map<string, any>(),
    drivers: new Map<string, any>(),
    histories: [] as any[],
    trips: new Map<string, any>(),
    payouts: new Map<string, any>(),
    shortfalls: new Map<string, any>(),
    incentives: new Map<string, any>(),
    incentiveProgress: new Map<string, any>(),
    tickets: new Map<string, any>(),
    ticketMessages: [] as any[],
    notifications: new Map<string, any>(),
    shifts: new Map<string, any>(),
    auditLogs: [] as any[],
  };

  const matchValue = (actual: unknown, cond: any): boolean => {
    if (cond === undefined) return true;
    if (cond === null || typeof cond !== 'object' || cond instanceof Date) {
      return actual === cond;
    }
    if ('in' in cond && Array.isArray(cond.in)) {
      return cond.in.includes(actual);
    }
    if ('not' in cond) {
      return actual !== cond.not;
    }
    if ('gte' in cond || 'lte' in cond || 'gt' in cond || 'lt' in cond) {
      const ts = actual instanceof Date ? actual.getTime() : Number(actual);
      if ('gte' in cond && ts < (cond.gte instanceof Date ? cond.gte.getTime() : Number(cond.gte))) return false;
      if ('lte' in cond && ts > (cond.lte instanceof Date ? cond.lte.getTime() : Number(cond.lte))) return false;
      if ('gt' in cond && ts <= (cond.gt instanceof Date ? cond.gt.getTime() : Number(cond.gt))) return false;
      if ('lt' in cond && ts >= (cond.lt instanceof Date ? cond.lt.getTime() : Number(cond.lt))) return false;
      return true;
    }
    if ('contains' in cond) {
      const s = String(actual || '').toLowerCase();
      return s.includes(String(cond.contains || '').toLowerCase());
    }
    return actual === cond;
  };

  const matchesWhere = (row: any, where: any): boolean => {
    if (!where) return true;
    for (const [key, val] of Object.entries(where)) {
      if (key === 'OR' && Array.isArray(val)) {
        if (!val.some((sub) => matchesWhere(row, sub))) return false;
      } else if (!matchValue(row[key], val)) {
        return false;
      }
    }
    return true;
  };

  const db: any = {
    _state: state,
    fleet: {
      create: async ({ data }: any) => {
        const rec = {
          id: data.id || randomUUID(),
          codeStatus: 'ACTIVE',
          status: 'ACTIVE',
          codeRotatedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.fleets.set(rec.id, rec);
        return rec;
      },
      findUnique: async ({ where }: any) => {
        if (where.id) return state.fleets.get(where.id) || null;
        if (where.code) {
          return Array.from(state.fleets.values()).find((f) => f.code === where.code) || null;
        }
        return null;
      },
      update: async ({ where, data }: any) => {
        const cur = state.fleets.get(where.id);
        if (!cur) throw new Error('Fleet not found');
        const next = { ...cur, ...data, updatedAt: new Date() };
        state.fleets.set(where.id, next);
        return next;
      },
      delete: async ({ where }: any) => {
        state.fleets.delete(where.id);
      },
    },
    fleetAdminUser: {
      create: async ({ data }: any) => {
        const rec = {
          id: data.id || randomUUID(),
          status: 'ACTIVE',
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.fleetAdmins.set(rec.id, rec);
        return rec;
      },
      findFirst: async ({ where }: any) => {
        const hit = Array.from(state.fleetAdmins.values()).find((u) => matchesWhere(u, where));
        return hit ? { ...hit, fleet: state.fleets.get(hit.fleetId) } : null;
      },
      findUnique: async ({ where }: any) => {
        const hit = state.fleetAdmins.get(where.id);
        return hit ? { ...hit, fleet: state.fleets.get(hit.fleetId) } : null;
      },
      update: async ({ where, data }: any) => {
        const cur = state.fleetAdmins.get(where.id);
        const next = { ...cur, ...data };
        state.fleetAdmins.set(where.id, next);
        return next;
      },
      deleteMany: async ({ where }: any) => {
        for (const [k, v] of state.fleetAdmins.entries()) {
          if (matchesWhere(v, where)) state.fleetAdmins.delete(k);
        }
      },
    },
    driver: {
      create: async ({ data }: any) => {
        const rec = {
          id: data.id || randomUUID(),
          fleetId: null,
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          walletBalance: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.drivers.set(rec.id, rec);
        return rec;
      },
      findUnique: async ({ where }: any) => {
        if (where.id) return state.drivers.get(where.id) || null;
        if (where.userId) {
          return Array.from(state.drivers.values()).find((d) => d.userId === where.userId) || null;
        }
        return null;
      },
      findFirst: async ({ where }: any) => {
        return Array.from(state.drivers.values()).find((d) => matchesWhere(d, where)) || null;
      },
      findMany: async ({ where, include, skip = 0, take = 100 }: any = {}) => {
        let rows = Array.from(state.drivers.values()).filter((d) => matchesWhere(d, where));
        rows = rows.slice(skip, skip + take);
        if (include?.trips) {
          return rows.map((d) => ({
            ...d,
            trips: Array.from(state.trips.values()).filter(
              (t) => t.driverId === d.id && matchesWhere(t, include.trips.where),
            ),
          }));
        }
        return rows;
      },
      count: async ({ where }: any = {}) =>
        Array.from(state.drivers.values()).filter((d) => matchesWhere(d, where)).length,
      update: async ({ where, data }: any) => {
        const cur = state.drivers.get(where.id);
        if (!cur) throw new Error('Driver not found');
        const next = { ...cur, ...data, updatedAt: new Date() };
        state.drivers.set(where.id, next);
        return next;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [k, v] of state.drivers.entries()) {
          if (matchesWhere(v, where)) {
            state.drivers.set(k, { ...v, ...data, updatedAt: new Date() });
            count++;
          }
        }
        return { count };
      },
      deleteMany: async ({ where }: any) => {
        for (const [k, v] of state.drivers.entries()) {
          if (matchesWhere(v, where)) state.drivers.delete(k);
        }
      },
    },
    fleetDriverHistory: {
      create: async ({ data }: any) => {
        const rec = { id: randomUUID(), createdAt: new Date(), ...data };
        state.histories.push(rec);
        return rec;
      },
      findMany: async ({ where }: any = {}) =>
        state.histories.filter((h) => matchesWhere(h, where)),
      deleteMany: async ({ where }: any = {}) => {
        state.histories = state.histories.filter((h) => !matchesWhere(h, where));
      },
    },
    trip: {
      create: async ({ data }: any) => {
        const rec = {
          id: data.id || randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.trips.set(rec.id, rec);
        return rec;
      },
      findMany: async ({ where, take = 100 }: any = {}) =>
        Array.from(state.trips.values())
          .filter((t) => matchesWhere(t, where))
          .slice(0, take),
      deleteMany: async ({ where }: any = {}) => {
        for (const [k, v] of state.trips.entries()) {
          if (matchesWhere(v, where)) state.trips.delete(k);
        }
      },
    },
    fleetPayoutRequest: {
      create: async ({ data }: any) => {
        const rec = {
          id: data.id || randomUUID(),
          currency: 'INR',
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.payouts.set(rec.id, rec);
        return rec;
      },
      findMany: async ({ where, skip = 0, take = 100 }: any = {}) =>
        Array.from(state.payouts.values())
          .filter((p) => matchesWhere(p, where))
          .slice(skip, skip + take),
      count: async ({ where }: any = {}) =>
        Array.from(state.payouts.values()).filter((p) => matchesWhere(p, where)).length,
      deleteMany: async ({ where }: any = {}) => {
        for (const [k, v] of state.payouts.entries()) {
          if (matchesWhere(v, where)) state.payouts.delete(k);
        }
      },
    },
    fleetShortfallRecord: {
      create: async ({ data }: any) => {
        const rec = { id: data.id || randomUUID(), createdAt: new Date(), ...data };
        state.shortfalls.set(rec.id, rec);
        return rec;
      },
      findMany: async ({ where }: any = {}) =>
        Array.from(state.shortfalls.values()).filter((s) => matchesWhere(s, where)),
      deleteMany: async ({ where }: any = {}) => {
        for (const [k, v] of state.shortfalls.entries()) {
          if (matchesWhere(v, where)) state.shortfalls.delete(k);
        }
      },
    },
    fleetIncentive: {
      create: async ({ data }: any) => {
        const rec = {
          id: data.id || randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.incentives.set(rec.id, rec);
        return rec;
      },
      findFirst: async ({ where }: any) =>
        Array.from(state.incentives.values()).find((i) => matchesWhere(i, where)) || null,
      findMany: async ({ where, include }: any = {}) => {
        const rows = Array.from(state.incentives.values()).filter((i) => matchesWhere(i, where));
        if (include?.progresses) {
          return rows.map((i) => ({
            ...i,
            progresses: Array.from(state.incentiveProgress.values()).filter(
              (p) => p.incentiveId === i.id && matchesWhere(p, include.progresses.where),
            ),
          }));
        }
        return rows;
      },
      update: async ({ where, data }: any) => {
        const cur = state.incentives.get(where.id);
        const next = { ...cur, ...data, updatedAt: new Date() };
        state.incentives.set(where.id, next);
        return next;
      },
      deleteMany: async ({ where }: any = {}) => {
        for (const [k, v] of state.incentives.entries()) {
          if (matchesWhere(v, where)) state.incentives.delete(k);
        }
      },
    },
    fleetIncentiveProgress: {
      findUnique: async ({ where }: any) => {
        const key = `${where.incentiveId_driverId.incentiveId}:${where.incentiveId_driverId.driverId}`;
        return state.incentiveProgress.get(key) || null;
      },
      upsert: async ({ where, create, update }: any) => {
        const key = `${where.incentiveId_driverId.incentiveId}:${where.incentiveId_driverId.driverId}`;
        const existing = state.incentiveProgress.get(key);
        const rec = existing
          ? { ...existing, ...update, updatedAt: new Date() }
          : { id: randomUUID(), updatedAt: new Date(), ...create };
        state.incentiveProgress.set(key, rec);
        return rec;
      },
      findMany: async ({ where, include }: any = {}) => {
        const rows = Array.from(state.incentiveProgress.values()).filter((p) => matchesWhere(p, where));
        if (include?.driver) {
          return rows.map((p) => ({ ...p, driver: state.drivers.get(p.driverId) || null }));
        }
        return rows;
      },
      deleteMany: async ({ where }: any = {}) => {
        for (const [k, v] of state.incentiveProgress.entries()) {
          if (matchesWhere(v, where)) state.incentiveProgress.delete(k);
        }
      },
    },
    fleetSupportTicket: {
      create: async ({ data }: any) => {
        const rec = {
          id: data.id || randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        state.tickets.set(rec.id, rec);
        return rec;
      },
      findFirst: async ({ where, include }: any) => {
        const t = Array.from(state.tickets.values()).find((r) => matchesWhere(r, where));
        if (!t) return null;
        if (include?.messages) {
          return {
            ...t,
            messages: state.ticketMessages.filter((m) => m.ticketId === t.id),
          };
        }
        return t;
      },
      findMany: async ({ where, skip = 0, take = 100 }: any = {}) =>
        Array.from(state.tickets.values())
          .filter((r) => matchesWhere(r, where))
          .slice(skip, skip + take),
      count: async ({ where }: any = {}) =>
        Array.from(state.tickets.values()).filter((r) => matchesWhere(r, where)).length,
      update: async ({ where, data }: any) => {
        const cur = state.tickets.get(where.id);
        const next = { ...cur, ...data, updatedAt: new Date() };
        state.tickets.set(where.id, next);
        return next;
      },
      deleteMany: async ({ where }: any = {}) => {
        const deletedIds = new Set<string>();
        for (const [k, v] of state.tickets.entries()) {
          if (matchesWhere(v, where)) {
            deletedIds.add(k);
            state.tickets.delete(k);
          }
        }
        state.ticketMessages = state.ticketMessages.filter((m) => !deletedIds.has(m.ticketId));
      },
    },
    fleetSupportMessage: {
      create: async ({ data }: any) => {
        const rec = { id: randomUUID(), createdAt: new Date(), ...data };
        state.ticketMessages.push(rec);
        return rec;
      },
    },
    fleetNotification: {
      create: async ({ data }: any) => {
        const rec = {
          id: data.id || randomUUID(),
          isRead: false,
          readAt: null,
          createdAt: new Date(),
          ...data,
        };
        state.notifications.set(rec.id, rec);
        return rec;
      },
      findFirst: async ({ where }: any) =>
        Array.from(state.notifications.values()).find((n) => matchesWhere(n, where)) || null,
      findMany: async ({ where, skip = 0, take = 100 }: any = {}) =>
        Array.from(state.notifications.values())
          .filter((n) => matchesWhere(n, where))
          .reverse()
          .slice(skip, skip + take),
      count: async ({ where }: any = {}) =>
        Array.from(state.notifications.values()).filter((n) => matchesWhere(n, where)).length,
      update: async ({ where, data }: any) => {
        const cur = state.notifications.get(where.id);
        const next = { ...cur, ...data };
        state.notifications.set(where.id, next);
        return next;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const [k, v] of state.notifications.entries()) {
          if (matchesWhere(v, where)) {
            state.notifications.set(k, { ...v, ...data });
            count++;
          }
        }
        return { count };
      },
      deleteMany: async ({ where }: any = {}) => {
        for (const [k, v] of state.notifications.entries()) {
          if (matchesWhere(v, where)) state.notifications.delete(k);
        }
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const rec = { id: randomUUID(), createdAt: new Date(), ...data };
        state.auditLogs.push(rec);
        return rec;
      },
      deleteMany: async ({ where }: any = {}) => {
        if (!where) state.auditLogs = [];
      },
    },
    $transaction: async (input: any) => {
      if (typeof input === 'function') return input(db);
      if (Array.isArray(input)) return Promise.all(input);
      return input;
    },
  };

  return db;
}
