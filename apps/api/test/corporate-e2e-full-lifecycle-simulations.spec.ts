import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  CorporateRole,
  CorporateTicketCategory,
  CorporateTicketCommentVisibility,
  CorporateTicketPriority,
  CorporateTicketStatus,
  UserRole,
} from '@adhocx/contracts';
import { CorporateTenantService } from '../src/domains/corporate/tenants/corporate-tenant.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { CorporateRoutePlannerService } from '../src/domains/corporate/routing/corporate-route-planner.service';
import { CorporateRiderService } from '../src/domains/corporate/rider/corporate-rider.service';
import { CorporateSupportTicketService } from '../src/domains/corporate/safety/corporate-support-ticket.service';
import { H3Service } from '../src/modules/locations/h3.service';

/**
 * Full-Lifecycle Backend E2E 12-Simulation Suite
 *
 * Instantiates the REAL NestJS services:
 *   - CorporateTenantService
 *   - AuthService
 *   - CorporateRoutePlannerService
 *   - CorporateRiderService
 *   - CorporateSupportTicketService
 *
 * Backed by a stateful in-memory Prisma + Redis harness sharing live state across all 12
 * numbered simulations from company onboarding through OTP auth, route planning/commit,
 * manual route/stop CRUD, employee lifecycle & session revocation, commuter live tracking
 * with co-passenger privacy masking, 9-hour cancel cutoff, support ticket workflow, and
 * zero-mock telemetry verification.
 */
describe('Corporate ETS Backend Full-Lifecycle E2E — 12 Simulations', () => {
  // ---------------------------------------------------------------------------
  // Shared Stateful In-Memory Prisma + Redis Harness
  // ---------------------------------------------------------------------------
  const seq: Record<string, number> = {};
  const nextId = (prefix: string) => {
    seq[prefix] = (seq[prefix] || 0) + 1;
    return `${prefix}-${seq[prefix]}`;
  };

  const store = {
    tenants: new Map<string, any>(),
    policies: new Map<string, any>(),
    offices: new Map<string, any>(),
    users: new Map<string, any>(),
    employees: new Map<string, any>(),
    employeeLocations: new Map<string, any>(),
    routes: new Map<string, any>(),
    routeStops: new Map<string, any>(),
    transportRequests: new Map<string, any>(),
    supportTickets: new Map<string, any>(),
    ticketMessages: new Map<string, any>(),
    ticketComments: new Map<string, any>(),
    ticketActivities: new Map<string, any>(),
    notifications: new Map<string, any>(),
    auditLogs: [] as any[],
  };

  const redisStore = new Map<string, string>();
  const revokedUsers = new Set<string>();
  const blacklistedTokens = new Set<string>();
  const sentOtps = new Map<string, string>();

  // Track transaction nesting so Simulation 4 can assert EMPLOYEE user provisioning runs outside $transaction
  let txDepth = 0;
  const employeeUserCreationTxDepths: Array<{ phone: string; txDepth: number }> = [];

  // Helpers for matching Prisma-style `where` clauses
  function toComparable(v: any): any {
    if (v instanceof Date) return v.getTime();
    return v;
  }

  function matchField(actual: any, cond: any): boolean {
    if (cond === undefined) return true;
    if (cond === null) return actual === null || actual === undefined;

    if (cond instanceof Date) {
      if (actual instanceof Date) return actual.getTime() === cond.getTime();
      if (typeof actual === 'string') return new Date(actual).getTime() === cond.getTime();
      return false;
    }

    if (typeof cond === 'object' && !Array.isArray(cond)) {
      if ('equals' in cond) {
        if (cond.mode === 'insensitive') {
          return String(actual ?? '').toLowerCase() === String(cond.equals ?? '').toLowerCase();
        }
        return toComparable(actual) === toComparable(cond.equals);
      }
      if ('contains' in cond) {
        const hay = String(actual ?? '');
        const needle = String(cond.contains ?? '');
        return cond.mode === 'insensitive'
          ? hay.toLowerCase().includes(needle.toLowerCase())
          : hay.includes(needle);
      }
      if ('in' in cond) {
        return Array.isArray(cond.in) && cond.in.some((item: any) => toComparable(item) === toComparable(actual));
      }
      if ('notIn' in cond) {
        return Array.isArray(cond.notIn) && !cond.notIn.some((item: any) => toComparable(item) === toComparable(actual));
      }
      if ('not' in cond) {
        return toComparable(actual) !== toComparable(cond.not);
      }
      let rangeOk = true;
      if ('gte' in cond) rangeOk = rangeOk && actual != null && toComparable(actual) >= toComparable(cond.gte);
      if ('lte' in cond) rangeOk = rangeOk && actual != null && toComparable(actual) <= toComparable(cond.lte);
      if ('gt' in cond) rangeOk = rangeOk && actual != null && toComparable(actual) > toComparable(cond.gt);
      if ('lt' in cond) rangeOk = rangeOk && actual != null && toComparable(actual) < toComparable(cond.lt);
      if ('gte' in cond || 'lte' in cond || 'gt' in cond || 'lt' in cond) {
        return rangeOk;
      }
    }

    return toComparable(actual) === toComparable(cond);
  }

  function matchWhere(
    row: any,
    where: any,
    relationResolver?: (row: any, rel: string) => any,
  ): boolean {
    if (!where) return true;
    for (const [key, cond] of Object.entries(where)) {
      if (cond === undefined) continue;
      if (key === 'OR' && Array.isArray(cond)) {
        if (!cond.some((sub) => matchWhere(row, sub, relationResolver))) return false;
        continue;
      }
      if (key === 'AND' && Array.isArray(cond)) {
        if (!cond.every((sub) => matchWhere(row, sub, relationResolver))) return false;
        continue;
      }
      if (relationResolver) {
        const relObj = relationResolver(row, key);
        if (relObj !== undefined) {
          if (relObj === null) return false;
          if (!matchWhere(relObj, cond)) return false;
          continue;
        }
      }
      if (!matchField(row[key], cond)) return false;
    }
    return true;
  }

  function applyOrderBy<T>(items: T[], orderBy: any): T[] {
    if (!orderBy) return items;
    const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...items].sort((a: any, b: any) => {
      for (const spec of specs) {
        const [field, dir] = Object.entries(spec)[0] as [string, 'asc' | 'desc'];
        const av = toComparable(a[field]);
        const bv = toComparable(b[field]);
        if (av === bv) continue;
        if (av == null) return dir === 'asc' ? 1 : -1;
        if (bv == null) return dir === 'asc' ? -1 : 1;
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  // Relation hydrators
  function hydrateOffice(office: any, include?: any): any {
    if (!office) return null;
    const copy = { ...office };
    if (include?.tenant) copy.tenant = store.tenants.get(office.tenantId) ?? null;
    if (include?._count) {
      copy._count = {
        employees: Array.from(store.employees.values()).filter((e) => e.officeId === office.id).length,
        routes: Array.from(store.routes.values()).filter((r) => r.officeId === office.id).length,
      };
    }
    return copy;
  }

  function hydrateTenant(tenant: any, include?: any): any {
    if (!tenant) return null;
    const copy = { ...tenant };
    if (include?.offices) {
      let rows = Array.from(store.offices.values()).filter((o) => o.tenantId === tenant.id);
      if (include.offices?.orderBy) rows = applyOrderBy(rows, include.offices.orderBy);
      if (include.offices?.take) rows = rows.slice(0, include.offices.take);
      copy.offices = rows.map((o) => ({ ...o }));
    }
    if (include?.policies) {
      let rows = Array.from(store.policies.values()).filter((p) => p.tenantId === tenant.id);
      if (include.policies?.orderBy) rows = applyOrderBy(rows, include.policies.orderBy);
      if (include.policies?.take) rows = rows.slice(0, include.policies.take);
      copy.policies = rows.map((p) => ({ ...p }));
    }
    if (include?.users) {
      let rows = Array.from(store.users.values()).filter((u) => u.corporateTenantId === tenant.id);
      if (include.users?.where) rows = rows.filter((u) => matchWhere(u, include.users.where));
      if (include.users?.orderBy) rows = applyOrderBy(rows, include.users.orderBy);
      if (include.users?.take) rows = rows.slice(0, include.users.take);
      copy.users = rows.map((u) => ({ ...u }));
    }
    if (include?._count) {
      copy._count = {
        offices: Array.from(store.offices.values()).filter((o) => o.tenantId === tenant.id).length,
        employees: Array.from(store.employees.values()).filter((e) => e.tenantId === tenant.id).length,
        routes: Array.from(store.routes.values()).filter((r) => r.tenantId === tenant.id).length,
        rosters: 0,
        invoices: 0,
      };
    }
    return copy;
  }

  function hydrateEmployee(emp: any, include?: any): any {
    if (!emp) return null;
    const copy = { ...emp };
    if (include?.tenant) copy.tenant = store.tenants.get(emp.tenantId) ?? null;
    if (include?.office) copy.office = store.offices.get(emp.officeId) ?? null;
    if (include?.locations) {
      let locs = Array.from(store.employeeLocations.values()).filter((l) => l.employeeId === emp.id);
      if (include.locations?.where) locs = locs.filter((l) => matchWhere(l, include.locations.where));
      if (include.locations?.orderBy) locs = applyOrderBy(locs, include.locations.orderBy);
      if (include.locations?.take) locs = locs.slice(0, include.locations.take);
      copy.locations = locs.map((l) => ({ ...l }));
    }
    if (include?._count) {
      copy._count = {
        transportRequests: Array.from(store.transportRequests.values()).filter((r) => r.employeeId === emp.id).length,
      };
    }
    return copy;
  }

  function hydrateRoute(route: any, include?: any): any {
    if (!route) return null;
    const copy = { ...route };
    if (include?.office) copy.office = store.offices.get(route.officeId) ?? null;
    if (include?.driver) copy.driver = null;
    if (include?.vehicle) copy.vehicle = null;
    if (include?.sosAlerts) copy.sosAlerts = [];
    if (include?.stops) {
      let stops = Array.from(store.routeStops.values()).filter((s) => s.routeId === route.id);
      if (include.stops?.orderBy) stops = applyOrderBy(stops, include.stops.orderBy);
      copy.stops = stops.map((s) => hydrateStop(s, include.stops?.include));
    }
    return copy;
  }

  function hydrateStop(stop: any, include?: any): any {
    if (!stop) return null;
    const copy = { ...stop };
    if (include?.employee) {
      copy.employee = stop.employeeId ? hydrateEmployee(store.employees.get(stop.employeeId)) : null;
    }
    if (include?.route) {
      const r = store.routes.get(stop.routeId);
      copy.route = r ? hydrateRoute(r, include.route?.include) : null;
    }
    if (include?.transportRequest) {
      copy.transportRequest = stop.transportRequestId
        ? store.transportRequests.get(stop.transportRequestId) ?? null
        : null;
    }
    if (include?.feedback) {
      copy.feedback = null;
    }
    return copy;
  }

  function hydrateTransportRequest(req: any, include?: any): any {
    if (!req) return null;
    const copy = { ...req };
    if (include?.routeStop) {
      const stop = Array.from(store.routeStops.values()).find((s) => s.transportRequestId === req.id) ?? null;
      copy.routeStop = stop ? hydrateStop(stop, include.routeStop?.include) : null;
    }
    return copy;
  }

  function hydrateTicket(ticket: any, include?: any): any {
    if (!ticket) return null;
    const copy = { ...ticket };
    if (include?.tenant) copy.tenant = store.tenants.get(ticket.tenantId) ?? null;
    if (include?.employee) copy.employee = store.employees.get(ticket.employeeId) ?? null;
    if (include?.comments) {
      let rows = Array.from(store.ticketComments.values()).filter((c) => c.ticketId === ticket.id);
      if (include.comments?.orderBy) rows = applyOrderBy(rows, include.comments.orderBy);
      copy.comments = rows.map((c) => ({ ...c, user: store.users.get(c.userId) ?? null }));
    }
    if (include?.activities) {
      let rows = Array.from(store.ticketActivities.values()).filter((a) => a.ticketId === ticket.id);
      if (include.activities?.orderBy) rows = applyOrderBy(rows, include.activities.orderBy);
      copy.activities = rows.map((a) => ({ ...a }));
    }
    if (include?.attachments) {
      copy.attachments = [];
    }
    return copy;
  }

  const db: any = {
    corporateTenant: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        for (const t of store.tenants.values()) {
          if (where.id && t.id === where.id) return hydrateTenant(t, include);
          if (where.code && t.code === where.code) return hydrateTenant(t, include);
        }
        return null;
      }),
      findFirst: jest.fn(async ({ where, include }: any) => {
        for (const t of store.tenants.values()) {
          if (matchWhere(t, where)) return hydrateTenant(t, include);
        }
        return null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const now = new Date();
        const row = { id: nextId('tenant'), createdAt: now, updatedAt: now, ...data };
        store.tenants.set(row.id, row);
        return { ...row };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = store.tenants.get(where.id);
        if (!row) return null;
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) row[k] = v;
        }
        row.updatedAt = new Date();
        return { ...row };
      }),
      count: jest.fn(async ({ where }: any = {}) =>
        Array.from(store.tenants.values()).filter((t) => matchWhere(t, where)).length,
      ),
      findMany: jest.fn(async ({ where, skip = 0, take, orderBy, include }: any = {}) => {
        let rows = Array.from(store.tenants.values()).filter((t) => matchWhere(t, where));
        rows = applyOrderBy(rows, orderBy);
        if (take !== undefined) rows = rows.slice(skip, skip + take);
        return rows.map((t) => hydrateTenant(t, include));
      }),
    },

    corporateTenantPolicy: {
      create: jest.fn(async ({ data }: any) => {
        const row = {
          id: nextId('policy'),
          stopDwellMinutes: 10,
          cancelCutoffHours: 9,
          createdAt: new Date(),
          ...data,
        };
        store.policies.set(row.id, row);
        return { ...row };
      }),
      findFirst: jest.fn(async ({ where, orderBy }: any = {}) => {
        let rows = Array.from(store.policies.values()).filter((p) => matchWhere(p, where));
        rows = applyOrderBy(rows, orderBy);
        return rows[0] ? { ...rows[0] } : null;
      }),
    },

    corporateOffice: {
      create: jest.fn(async ({ data }: any) => {
        const now = new Date();
        const row = { id: nextId('office'), isActive: true, createdAt: now, updatedAt: now, ...data };
        store.offices.set(row.id, row);
        return { ...row };
      }),
      findUnique: jest.fn(async ({ where, include }: any) => {
        const row = store.offices.get(where.id);
        return row ? hydrateOffice(row, include) : null;
      }),
      findFirst: jest.fn(async ({ where, include }: any) => {
        for (const o of store.offices.values()) {
          if (matchWhere(o, where)) return hydrateOffice(o, include);
        }
        return null;
      }),
      findMany: jest.fn(async ({ where, orderBy, include }: any = {}) => {
        let rows = Array.from(store.offices.values()).filter((o) => matchWhere(o, where));
        rows = applyOrderBy(rows, orderBy);
        return rows.map((o) => hydrateOffice(o, include));
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = store.offices.get(where.id);
        if (!row) return null;
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) row[k] = v;
        }
        row.updatedAt = new Date();
        return { ...row };
      }),
    },

    user: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        for (const u of store.users.values()) {
          if (where.id && u.id === where.id) {
            return { ...u, ...(include?.driver ? { driver: null } : {}), ...(include?.vendor ? { vendor: null } : {}) };
          }
          if (where.email && u.email?.toLowerCase() === String(where.email).toLowerCase()) {
            return { ...u, ...(include?.driver ? { driver: null } : {}), ...(include?.vendor ? { vendor: null } : {}) };
          }
        }
        return null;
      }),
      findFirst: jest.fn(async ({ where, include }: any) => {
        for (const u of store.users.values()) {
          if (matchWhere(u, where)) {
            return { ...u, ...(include?.driver ? { driver: null } : {}), ...(include?.vendor ? { vendor: null } : {}) };
          }
        }
        return null;
      }),
      findMany: jest.fn(async ({ where }: any = {}) =>
        Array.from(store.users.values())
          .filter((u) => matchWhere(u, where))
          .map((u) => ({ ...u })),
      ),
      create: jest.fn(async ({ data, include }: any) => {
        const now = new Date();
        const row = {
          id: nextId('user'),
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        if (row.role === 'EMPLOYEE' && row.phone) {
          employeeUserCreationTxDepths.push({ phone: row.phone, txDepth });
        }
        store.users.set(row.id, row);
        return { ...row, ...(include?.driver ? { driver: null } : {}), ...(include?.vendor ? { vendor: null } : {}) };
      }),
      update: jest.fn(async ({ where, data, include }: any) => {
        const row = store.users.get(where.id);
        if (!row) return null;
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) row[k] = v;
        }
        row.updatedAt = new Date();
        return { ...row, ...(include?.driver ? { driver: null } : {}), ...(include?.vendor ? { vendor: null } : {}) };
      }),
      delete: jest.fn(async ({ where }: any) => {
        const row = store.users.get(where.id);
        store.users.delete(where.id);
        return row;
      }),
    },

    driver: {
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => null),
    },
    vendor: {
      findFirst: jest.fn(async () => null),
      findUnique: jest.fn(async () => null),
    },

    vehiclePricingTier: {
      findMany: jest.fn(async () => [
        { vehicleType: 'SEDAN', categoryLabel: 'Sedan', seatingCapacity: '4 seats', baseFare: 350, perKmRate: 14, isActive: true },
        { vehicleType: 'SUV', categoryLabel: 'SUV', seatingCapacity: '6 seats', baseFare: 500, perKmRate: 16, isActive: true },
      ]),
    },

    corporateEmployee: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        for (const e of store.employees.values()) {
          if (where.id && e.id === where.id) return hydrateEmployee(e, include);
          if (where.userId && e.userId === where.userId) return hydrateEmployee(e, include);
        }
        return null;
      }),
      findFirst: jest.fn(async ({ where, include }: any) => {
        const rel = (row: any, key: string) => {
          if (key === 'tenant') return store.tenants.get(row.tenantId) ?? null;
          if (key === 'office') return store.offices.get(row.officeId) ?? null;
          return undefined;
        };
        for (const e of store.employees.values()) {
          if (matchWhere(e, where, rel)) return hydrateEmployee(e, include);
        }
        return null;
      }),
      findMany: jest.fn(async ({ where, skip = 0, take, orderBy, include }: any = {}) => {
        const rel = (row: any, key: string) => {
          if (key === 'tenant') return store.tenants.get(row.tenantId) ?? null;
          if (key === 'office') return store.offices.get(row.officeId) ?? null;
          return undefined;
        };
        let rows = Array.from(store.employees.values()).filter((e) => matchWhere(e, where, rel));
        rows = applyOrderBy(rows, orderBy);
        if (take !== undefined) rows = rows.slice(skip, skip + take);
        return rows.map((e) => hydrateEmployee(e, include));
      }),
      count: jest.fn(async ({ where }: any = {}) =>
        Array.from(store.employees.values()).filter((e) => matchWhere(e, where)).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        const now = new Date();
        const row = {
          id: nextId('emp'),
          userId: null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        store.employees.set(row.id, row);
        return { ...row };
      }),
      update: jest.fn(async ({ where, data, include }: any) => {
        const row = store.employees.get(where.id);
        if (!row) return null;
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) row[k] = v;
        }
        row.updatedAt = new Date();
        return hydrateEmployee(row, include);
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of store.employees.values()) {
          if (matchWhere(row, where)) {
            for (const [k, v] of Object.entries(data)) {
              if (v !== undefined) row[k] = v;
            }
            count++;
          }
        }
        return { count };
      }),
      delete: jest.fn(async ({ where }: any) => {
        const row = store.employees.get(where.id);
        store.employees.delete(where.id);
        return row;
      }),
    },

    corporateEmployeeLocation: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: nextId('loc'), createdAt: new Date(), ...data };
        store.employeeLocations.set(row.id, row);
        return { ...row };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = store.employeeLocations.get(where.id);
        if (!row) return null;
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) row[k] = v;
        }
        return { ...row };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of store.employeeLocations.values()) {
          if (matchWhere(row, where)) {
            for (const [k, v] of Object.entries(data)) {
              if (v !== undefined) row[k] = v;
            }
            count++;
          }
        }
        return { count };
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        let count = 0;
        for (const [id, row] of Array.from(store.employeeLocations.entries())) {
          if (matchWhere(row, where)) {
            store.employeeLocations.delete(id);
            count++;
          }
        }
        return { count };
      }),
    },

    corporateRoute: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        const row = store.routes.get(where.id);
        return row ? hydrateRoute(row, include) : null;
      }),
      findFirst: jest.fn(async ({ where, include }: any) => {
        for (const r of store.routes.values()) {
          if (matchWhere(r, where)) return hydrateRoute(r, include);
        }
        return null;
      }),
      findMany: jest.fn(async ({ where, include, orderBy }: any = {}) => {
        let rows = Array.from(store.routes.values()).filter((r) => matchWhere(r, where));
        rows = applyOrderBy(rows, orderBy);
        return rows.map((r) => hydrateRoute(r, include));
      }),
      create: jest.fn(async ({ data }: any) => {
        const now = new Date();
        const row = {
          id: nextId('route'),
          driverId: null,
          vehicleId: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        store.routes.set(row.id, row);
        return { ...row };
      }),
      update: jest.fn(async ({ where, data, include }: any) => {
        const row = store.routes.get(where.id);
        if (!row) return null;
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) row[k] = v;
        }
        row.updatedAt = new Date();
        return hydrateRoute(row, include);
      }),
      delete: jest.fn(async ({ where }: any) => {
        const row = store.routes.get(where.id);
        store.routes.delete(where.id);
        return row;
      }),
    },

    corporateRouteStop: {
      findFirst: jest.fn(async ({ where, include, orderBy }: any) => {
        const rel = (row: any, key: string) => {
          if (key === 'route') return store.routes.get(row.routeId) ?? null;
          if (key === 'employee') return row.employeeId ? store.employees.get(row.employeeId) ?? null : null;
          return undefined;
        };
        let rows = Array.from(store.routeStops.values()).filter((s) => matchWhere(s, where, rel));
        rows = applyOrderBy(rows, orderBy);
        return rows[0] ? hydrateStop(rows[0], include) : null;
      }),
      findMany: jest.fn(async ({ where, include, orderBy, take, skip = 0 }: any = {}) => {
        const rel = (row: any, key: string) => {
          if (key === 'route') return store.routes.get(row.routeId) ?? null;
          if (key === 'employee') return row.employeeId ? store.employees.get(row.employeeId) ?? null : null;
          return undefined;
        };
        let rows = Array.from(store.routeStops.values()).filter((s) => matchWhere(s, where, rel));
        rows = applyOrderBy(rows, orderBy);
        if (take !== undefined) rows = rows.slice(skip, skip + take);
        return rows.map((s) => hydrateStop(s, include));
      }),
      count: jest.fn(async ({ where }: any = {}) =>
        Array.from(store.routeStops.values()).filter((s) => matchWhere(s, where)).length,
      ),
      create: jest.fn(async ({ data, include }: any) => {
        const now = new Date();
        const row = {
          id: nextId('stop'),
          transportRequestId: null,
          employeeId: null,
          actualArrivalTime: null,
          actualDepartureTime: null,
          noShowReason: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        store.routeStops.set(row.id, row);
        return hydrateStop(row, include);
      }),
      update: jest.fn(async ({ where, data, include }: any) => {
        const row = store.routeStops.get(where.id);
        if (!row) return null;
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) row[k] = v;
        }
        row.updatedAt = new Date();
        return hydrateStop(row, include);
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of store.routeStops.values()) {
          if (matchWhere(row, where)) {
            for (const [k, v] of Object.entries(data)) {
              if (v !== undefined) row[k] = v;
            }
            count++;
          }
        }
        return { count };
      }),
      delete: jest.fn(async ({ where }: any) => {
        const row = store.routeStops.get(where.id);
        store.routeStops.delete(where.id);
        return row;
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        let count = 0;
        for (const [id, row] of Array.from(store.routeStops.entries())) {
          if (matchWhere(row, where)) {
            store.routeStops.delete(id);
            count++;
          }
        }
        return { count };
      }),
    },

    corporateTransportRequest: {
      findMany: jest.fn(async ({ where, include, orderBy, take }: any = {}) => {
        let rows = Array.from(store.transportRequests.values()).filter((r) => matchWhere(r, where));
        rows = applyOrderBy(rows, orderBy);
        if (take !== undefined) rows = rows.slice(0, take);
        return rows.map((r) => hydrateTransportRequest(r, include));
      }),
      count: jest.fn(async ({ where }: any = {}) =>
        Array.from(store.transportRequests.values()).filter((r) => matchWhere(r, where)).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        const now = new Date();
        const row = { id: nextId('req'), createdAt: now, updatedAt: now, ...data };
        store.transportRequests.set(row.id, row);
        return { ...row };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = store.transportRequests.get(where.id);
        if (!row) return null;
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) row[k] = v;
        }
        row.updatedAt = new Date();
        return { ...row };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of store.transportRequests.values()) {
          if (matchWhere(row, where)) {
            for (const [k, v] of Object.entries(data)) {
              if (v !== undefined) row[k] = v;
            }
            count++;
          }
        }
        return { count };
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        let count = 0;
        for (const [id, row] of Array.from(store.transportRequests.entries())) {
          if (matchWhere(row, where)) {
            store.transportRequests.delete(id);
            count++;
          }
        }
        return { count };
      }),
    },

    corporateDriverOffer: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    corporateDriverEarning: {
      count: jest.fn(async () => 0),
    },
    corporateTripFeedback: {
      count: jest.fn(async () => 0),
      findUnique: jest.fn(async () => null),
    },
    corporateRosterEntry: {
      count: jest.fn(async () => 0),
    },
    corporateRoster: {
      findFirst: jest.fn(async () => null),
    },

    corporateSupportTicket: {
      findUnique: jest.fn(async ({ where, include }: any) => {
        for (const t of store.supportTickets.values()) {
          if (where.id && t.id === where.id) return hydrateTicket(t, include);
          if (where.idempotencyKey && t.idempotencyKey === where.idempotencyKey) return hydrateTicket(t, include);
        }
        return null;
      }),
      findMany: jest.fn(async ({ where, orderBy, take, skip = 0, include }: any = {}) => {
        const rel = (row: any, key: string) => {
          if (key === 'tenant') return store.tenants.get(row.tenantId) ?? null;
          if (key === 'employee') return store.employees.get(row.employeeId) ?? null;
          return undefined;
        };
        let rows = Array.from(store.supportTickets.values()).filter((t) => matchWhere(t, where, rel));
        rows = applyOrderBy(rows, orderBy);
        if (take !== undefined) rows = rows.slice(skip, skip + take);
        return rows.map((t) => hydrateTicket(t, include));
      }),
      count: jest.fn(async ({ where }: any = {}) =>
        Array.from(store.supportTickets.values()).filter((t) => matchWhere(t, where)).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        const now = new Date();
        const row = {
          id: nextId('tck'),
          assignedTeam: null,
          assignedToUserId: null,
          adminNotes: null,
          resolutionNotes: null,
          resolvedAt: null,
          resolvedByUserId: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        store.supportTickets.set(row.id, row);
        return { ...row };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = store.supportTickets.get(where.id);
        if (!row) return null;
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) row[k] = v;
        }
        row.updatedAt = new Date();
        return { ...row };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of store.supportTickets.values()) {
          if (matchWhere(row, where)) {
            for (const [k, v] of Object.entries(data)) {
              if (v !== undefined) row[k] = v;
            }
            row.updatedAt = new Date();
            count++;
          }
        }
        return { count };
      }),
    },

    corporateTicketMessage: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: nextId('tmsg'), createdAt: new Date(), ...data };
        store.ticketMessages.set(row.id, row);
        return { ...row };
      }),
      findMany: jest.fn(async ({ where, orderBy }: any = {}) => {
        let rows = Array.from(store.ticketMessages.values()).filter((m) => matchWhere(m, where));
        rows = applyOrderBy(rows, orderBy);
        return rows.map((m) => ({
          ...m,
          sender: store.users.get(m.senderId) ?? null,
        }));
      }),
    },

    corporateSupportTicketComment: {
      create: jest.fn(async ({ data }: any) => {
        // Offset by 5ms so chronological ordering after createMessage is deterministic
        const row = { id: nextId('tcmt'), createdAt: new Date(Date.now() + 5), ...data };
        store.ticketComments.set(row.id, row);
        return { ...row };
      }),
      findMany: jest.fn(async ({ where, orderBy }: any = {}) => {
        let rows = Array.from(store.ticketComments.values()).filter((c) => matchWhere(c, where));
        rows = applyOrderBy(rows, orderBy);
        return rows.map((c) => ({
          ...c,
          user: store.users.get(c.userId) ?? null,
        }));
      }),
    },

    corporateSupportTicketActivity: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: nextId('tact'), createdAt: new Date(), ...data };
        store.ticketActivities.set(row.id, row);
        return { ...row };
      }),
    },

    corporateSupportTicketAttachment: {
      createMany: jest.fn(async () => ({ count: 0 })),
    },

    notification: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: nextId('notif'), isRead: false, createdAt: new Date(), ...data };
        store.notifications.set(row.id, row);
        return { ...row };
      }),
      findMany: jest.fn(async ({ where, orderBy, take }: any = {}) => {
        let rows = Array.from(store.notifications.values()).filter((n) => matchWhere(n, where));
        rows = applyOrderBy(rows, orderBy);
        if (take !== undefined) rows = rows.slice(0, take);
        return rows.map((n) => ({ ...n }));
      }),
    },

    auditLog: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: nextId('audit'), createdAt: new Date(), ...data };
        store.auditLogs.push(row);
        return row;
      }),
      findMany: jest.fn(async ({ where, orderBy, take }: any = {}) => {
        let rows = store.auditLogs.filter((l) => matchWhere(l, where));
        rows = applyOrderBy(rows, orderBy);
        if (take !== undefined) rows = rows.slice(0, take);
        return rows.map((l) => ({ ...l, actor: store.users.get(l.actorId) ?? null }));
      }),
    },

    $transaction: jest.fn(async (arg: any) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      txDepth += 1;
      try {
        return await arg(db);
      } finally {
        txDepth -= 1;
      }
    }),
  };

  // Stateful Redis harness
  const fakeRedisClient = {
    get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
    set: jest.fn(async (key: string, val: string) => {
      redisStore.set(key, val);
      return 'OK';
    }),
    del: jest.fn(async (key: string) => {
      redisStore.delete(key);
      return 1;
    }),
    ttl: jest.fn(async () => -2),
    incr: jest.fn(async () => 1),
    expire: jest.fn(async () => 1),
  };

  const fakeRedis: any = {
    getClient: () => fakeRedisClient,
    get: jest.fn(async (key: string) => redisStore.get(key) ?? null),
    set: jest.fn(async (key: string, val: string) => {
      redisStore.set(key, val);
      return 'OK';
    }),
    del: jest.fn(async (key: string) => {
      redisStore.delete(key);
      return 1;
    }),
    checkRateLimit: jest.fn(async (_key: string, limit: number, windowSeconds: number) => ({
      allowed: true,
      remaining: limit - 1,
      resetAfter: windowSeconds,
    })),
    revokeUserSessions: jest.fn(async (userId: string) => {
      revokedUsers.add(userId);
    }),
    isUserRevoked: jest.fn(async (userId: string) => revokedUsers.has(userId)),
    unrevokeUser: jest.fn(async (userId: string) => {
      revokedUsers.delete(userId);
    }),
    getMinTokenIssuedAt: jest.fn(async () => null),
    invalidateTokensBefore: jest.fn(async () => undefined),
    blacklistToken: jest.fn(async (token: string) => {
      blacklistedTokens.add(token);
    }),
  };

  const audit: any = {
    log: jest.fn(async (entry: any) => {
      store.auditLogs.push({
        id: nextId('audit'),
        action: entry.action,
        actorId: entry.userId,
        actorRole: entry.actorRole,
        entityName: entry.entityType,
        entityId: entry.entityId,
        payload: entry.metadata,
        createdAt: new Date(),
      });
    }),
  };

  const notifications: any = {
    emitEvent: jest.fn(),
    sendOtp: jest.fn(async ({ phone, email, otp }: any) => {
      const key = phone || email;
      if (key) sentOtps.set(key, otp);
    }),
    sendWelcomeNotification: jest.fn(async () => undefined),
  };

  const mockGeocoder: any = {
    geocode: jest.fn(async (address: string) => {
      const lower = address.toLowerCase();
      if (lower.includes('mindspace') || lower.includes('hitec')) {
        return { lat: 17.4435, lng: 78.3772, matchedAddress: address, partialMatch: false, isRealGeocode: true };
      }
      if (lower.includes('gachibowli')) {
        return { lat: 17.4401, lng: 78.3489, matchedAddress: address, partialMatch: false, isRealGeocode: true };
      }
      if (lower.includes('banjara')) {
        return { lat: 17.4156, lng: 78.4347, matchedAddress: address, partialMatch: false, isRealGeocode: true };
      }
      if (lower.includes('kondapur')) {
        return { lat: 17.4604, lng: 78.3637, matchedAddress: address, partialMatch: false, isRealGeocode: true };
      }
      return { lat: 17.4512, lng: 78.3855, matchedAddress: address, partialMatch: false, isRealGeocode: true };
    }),
    batchGeocode: jest.fn(),
  };

  const mockRoutesAdapter: any = {
    computeRoute: jest.fn(),
  };

  const fakeConfig: any = {
    get: jest.fn((key: string) => {
      if (key === 'auth.jwtAccessSecret') return 'e2e-full-lifecycle-access-secret';
      if (key === 'auth.jwtRefreshSecret') return 'e2e-full-lifecycle-refresh-secret';
      if (key === 'auth.otpExpirySeconds') return 300;
      if (key === 'auth.otpResendDelaySeconds') return 30;
      return undefined;
    }),
  };

  // Real NestJS Services
  const h3Service = new H3Service();
  const jwtService = new JwtService({ secret: 'e2e-full-lifecycle-access-secret' });
  const tenantService = new CorporateTenantService(db, audit, h3Service, mockGeocoder, fakeRedis);
  const authService = new AuthService(db, jwtService, fakeConfig, fakeRedis, notifications);
  const plannerService = new CorporateRoutePlannerService(mockGeocoder, mockRoutesAdapter, db);
  const supportService = new CorporateSupportTicketService(db, notifications, audit, fakeRedis);
  const riderService = new CorporateRiderService(db, fakeRedis, notifications, audit, supportService);

  // Shared lifecycle references carried forward across simulations 1..12
  const futureDateStr = (daysAhead: number) =>
    new Date(Date.now() + daysAhead * 86400_000).toISOString().slice(0, 10);

  const ctx: {
    tenantId?: string;
    tenantCode?: string;
    officeId?: string;
    corpAdminUserId?: string;
    corpAdminPhone: string;
    committedRouteId?: string;
    emp1Id?: string;
    emp1UserId?: string;
    emp1StopId?: string;
    emp1Phone: string;
    emp2Id?: string;
    emp2UserId?: string;
    emp2StopId?: string;
    emp2Phone: string;
    cleanEmpId?: string;
    cleanEmpPhone: string;
    historyEmpId?: string;
    historyEmpPhone: string;
    ticketId?: string;
  } = {
    corpAdminPhone: '9876543210',
    emp1Phone: '9848011111',
    emp2Phone: '9848022222',
    cleanEmpPhone: '9848055555',
    historyEmpPhone: '9848066666',
  };

  function getCachedOtp(requestId: string, normalizedPhone: string): string {
    const otp =
      redisStore.get(`otp:${requestId}:${normalizedPhone}`) ||
      redisStore.get(`otp_direct:${normalizedPhone}`) ||
      sentOtps.get(normalizedPhone);
    if (!otp) throw new Error(`No OTP found in Redis for ${normalizedPhone}`);
    return otp;
  }

  // ===========================================================================
  // SIMULATION 1: Admin Onboards Company (POST /corporate/tenants)
  // ===========================================================================
  it('Simulation 1 — Admin Onboards Company with policy v1, HQ office, and CORP_SUPER_ADMIN', async () => {
    const onboarded = await tenantService.createTenant(
      {
        code: 'apexcorp',
        name: 'Apex Global Technologies',
        legalEntityName: 'Apex Global Technologies India Pvt Ltd',
        gstin: '36AAACA4321B1Z5',
        registeredAddress: 'Tower 4, Mindspace HITEC City',
        city: 'Hyderabad',
        state: 'Telangana',
        pinCode: '500081',
        primaryContactName: 'Ananya Sharma',
        primaryContactEmail: 'ANANYA.ADMIN@APEXCORP.IN',
        primaryContactPhone: ctx.corpAdminPhone, // 10-digit Indian phone
        createPortalAdmin: true,
      },
      'platform-admin-1',
    );

    expect(onboarded.code).toBe('APEXCORP');
    expect(onboarded.status).toBe('ACTIVE');
    expect(onboarded.hqOfficeCreated).toBe(true);
    expect(onboarded.portalAccess).toEqual({
      created: true,
      corporateRole: CorporateRole.CORP_SUPER_ADMIN,
      loginMethod: 'SMS_OTP',
    });

    // Verify CorporateTenantPolicy v1
    const tenantPolicies = Array.from(store.policies.values()).filter((p) => p.tenantId === onboarded.id);
    expect(tenantPolicies).toHaveLength(1);
    expect(tenantPolicies[0]).toMatchObject({
      tenantId: onboarded.id,
      version: 1,
      defaultVehicleCategory: 'SEDAN',
      defaultCapacity: 4,
    });

    // Verify HQ CorporateOffice created and geocoded
    const tenantOffices = Array.from(store.offices.values()).filter((o) => o.tenantId === onboarded.id);
    expect(tenantOffices).toHaveLength(1);
    expect(tenantOffices[0]).toMatchObject({
      tenantId: onboarded.id,
      code: 'APEXCORP-HQ',
      isActive: true,
      latitude: 17.4435,
      longitude: 78.3772,
    });

    // Verify User(role: CORPORATE_ADMIN, corporateRole: CORP_SUPER_ADMIN) with normalized +91 phone
    const adminUser = Array.from(store.users.values()).find((u) => u.corporateTenantId === onboarded.id);
    expect(adminUser).toBeDefined();
    expect(adminUser).toMatchObject({
      role: UserRole.CORPORATE_ADMIN,
      corporateRole: CorporateRole.CORP_SUPER_ADMIN,
      corporateTenantId: onboarded.id,
      phone: '+919876543210',
      email: 'ananya.admin@apexcorp.in',
      status: 'ACTIVE',
    });

    ctx.tenantId = onboarded.id;
    ctx.tenantCode = onboarded.code;
    ctx.officeId = tenantOffices[0].id;
    ctx.corpAdminUserId = adminUser.id;
  });

  // ===========================================================================
  // SIMULATION 2: Corporate Portal Phone + OTP Login, /auth/me & Security Guard
  // ===========================================================================
  it('Simulation 2 — Corporate Portal Phone + OTP Login, /auth/me, Refresh & Self-Register Security Guard', async () => {
    const reqRes = await authService.requestOtp({
      phone: ctx.corpAdminPhone,
      role: UserRole.CORPORATE_ADMIN,
      isRegister: false,
    });
    expect(reqRes.requestId).toBeDefined();

    const otp = getCachedOtp(reqRes.requestId, `+91${ctx.corpAdminPhone}`);
    const loginRes = await authService.verifyOtp({
      requestId: reqRes.requestId,
      phone: ctx.corpAdminPhone,
      otp,
      role: UserRole.CORPORATE_ADMIN,
      isRegister: false,
    });

    // Verify corporateTenantId & corporateRole on login response & JWT
    expect(loginRes.user.role).toBe(UserRole.CORPORATE_ADMIN);
    expect(loginRes.user.corporateTenantId).toBe(ctx.tenantId);
    expect(loginRes.user.corporateRole).toBe(CorporateRole.CORP_SUPER_ADMIN);
    const decodedLogin: any = jwtService.decode(loginRes.accessToken);
    expect(decodedLogin.corporateTenantId).toBe(ctx.tenantId);
    expect(decodedLogin.corporateRole).toBe(CorporateRole.CORP_SUPER_ADMIN);

    // Verify /auth/me includes corporateTenantId & corporateRole
    const meRes = await authService.getCurrentUser(loginRes.user.id);
    expect(meRes.corporateTenantId).toBe(ctx.tenantId);
    expect(meRes.corporateRole).toBe(CorporateRole.CORP_SUPER_ADMIN);

    // Verify refreshToken preserves corporateTenantId & corporateRole
    const refreshRes = await authService.refreshToken(loginRes.refreshToken);
    expect(refreshRes.user.corporateTenantId).toBe(ctx.tenantId);
    expect(refreshRes.user.corporateRole).toBe(CorporateRole.CORP_SUPER_ADMIN);
    const decodedRefresh: any = jwtService.decode(refreshRes.accessToken);
    expect(decodedRefresh.corporateTenantId).toBe(ctx.tenantId);
    expect(decodedRefresh.corporateRole).toBe(CorporateRole.CORP_SUPER_ADMIN);

    // Security Guard: verifyOtp MUST reject unauthorized self-registration for ADMIN, OPS, EMPLOYEE
    const unknownPhone = '9000099991';
    for (const blockedRole of [UserRole.ADMIN, UserRole.OPS, UserRole.EMPLOYEE]) {
      redisStore.set(`otp_direct:+91${unknownPhone}`, '654321');
      await expect(
        authService.verifyOtp({
          phone: unknownPhone,
          otp: '654321',
          role: blockedRole,
          isRegister: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    }

    // Security Guard: unknown phone with isRegister: false MUST reject and NEVER create a DRIVER
    const userCountBefore = store.users.size;
    redisStore.set(`otp_direct:+91${unknownPhone}`, '654321');
    await expect(
      authService.verifyOtp({
        phone: unknownPhone,
        otp: '654321',
        isRegister: false,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(store.users.size).toBe(userCountBefore);
    expect(Array.from(store.users.values()).some((u) => u.role === UserRole.DRIVER)).toBe(false);
  });

  // ===========================================================================
  // SIMULATION 3: Ops Sees Newly Onboarded Company & Honest Zero Telemetry
  // ===========================================================================
  it('Simulation 3 — Ops Sees Newly Onboarded Company Immediately with Honest Zero Telemetry', async () => {
    const listed = await tenantService.listTenants({ search: 'Apex' });
    expect(listed.items).toHaveLength(1);

    const company = listed.items[0];
    expect(company.id).toBe(ctx.tenantId);
    expect(company.code).toBe('APEXCORP');
    expect(company.activeCabsCount).toBe(0);
    expect(company.inTransitCount).toBe(0);
    expect(company.inTransitPassengersCount).toBe(0);
    expect(company.delayedCount).toBe(0);
    expect(company.unassignedCount).toBe(0);
    expect(company.onTimePunctualityPct).toBeNull(); // Zero hardcoded 98.4%
  });

  // ===========================================================================
  // SIMULATION 4: Ops Commits Route Plan & Auto-Registers Employee Accounts
  // ===========================================================================
  it('Simulation 4 — Ops Commits Route Plan & Auto-Registers Employee Accounts Outside $transaction', async () => {
    const shiftDate = futureDateStr(2); // 2 days from now (inside 7-day schedule window, outside 9h cutoff)
    employeeUserCreationTxDepths.length = 0;

    const commitRes = await plannerService.commitPlanToDatabase({
      tenantId: ctx.tenantId!,
      officeId: ctx.officeId!,
      shiftDate,
      shiftTime: '09:00',
      direction: 'LOGIN',
      vehicleCategory: 'SEDAN',
      includeMetadata: true,
      plan: {
        employeeCount: 2,
        cabCount: 1,
        vehicleCategoryCounts: { SEDAN: 1 },
        officeRadiusKm: 50,
        maxTripKm: 50,
        totalKm: 12.4,
        office: { name: 'Apex Global Technologies HQ', lat: 17.4435, lng: 78.3772 },
        routes: [
          {
            cab: 1,
            cabType: 'SEDAN',
            direction: 'LOGIN',
            driverStart: 'Madhapur Main Rd, Hyderabad',
            sequence: 'Priya Nair -> Rohan Mehta -> Office',
            departure: '08:15 AM',
            departureDateTime: `${shiftDate}T08:15:00+05:30`,
            requiredArrival: '09:00 AM',
            requiredArrivalDateTime: `${shiftDate}T09:00:00+05:30`,
            arrival: '08:50 AM',
            distanceKm: 12.4,
            driveMinutes: 35,
            status: 'ON_TIME',
            bufferStatus: 'WITHIN_BUFFER',
            timeSource: 'ESTIMATED',
            office: { name: 'Apex Global Technologies HQ', lat: 17.4435, lng: 78.3772 },
            stops: [
              {
                sequence: 1,
                name: 'Priya Nair',
                phoneNumber: ctx.emp1Phone,
                email: 'priya.nair@apexcorp.in',
                gender: 'FEMALE',
                address: 'Madhapur Main Rd, Hyderabad',
                lat: 17.4486,
                lng: 78.3908,
                eta: '08:15',
                travelToNextMinutes: 10,
              } as any,
              {
                sequence: 2,
                name: 'Rohan Mehta',
                phoneNumber: ctx.emp2Phone,
                email: 'rohan.mehta@apexcorp.in',
                gender: 'PREFER_NOT_TO_SAY', // Must normalize safely to OTHER
                address: 'Jubilee Hills Checkpost, Hyderabad',
                lat: 17.4285,
                lng: 78.4128,
                eta: '08:30',
                travelToNextMinutes: 15,
              } as any,
            ],
          } as any,
        ],
      } as any,
    });

    expect(commitRes.routesCreated).toBe(1);
    expect(commitRes.stopsCreated).toBe(3); // 2 employee pickups + 1 office dropoff
    expect(commitRes.employeesLinked).toBe(2);
    expect(commitRes.routeIds).toHaveLength(1);

    const routeId = commitRes.routeIds![0];
    ctx.committedRouteId = routeId;

    const route = store.routes.get(routeId);
    expect(route).toMatchObject({
      tenantId: ctx.tenantId,
      officeId: ctx.officeId,
      status: 'PLANNED',
      assignedPassengerCount: 2,
      direction: 'LOGIN',
    });

    const stops = Array.from(store.routeStops.values())
      .filter((s) => s.routeId === routeId)
      .sort((a, b) => a.stopSequence - b.stopSequence);
    expect(stops).toHaveLength(3);
    expect(stops[0].boardingOtp).toMatch(/^\d{4}$/);
    expect(stops[1].boardingOtp).toMatch(/^\d{4}$/);
    expect(stops[2].employeeId).toBeNull();
    expect(stops[2].boardingOtp).toBe('------');

    // Linked CorporateTransportRequest rows created
    expect(stops[0].transportRequestId).toBeTruthy();
    expect(stops[1].transportRequestId).toBeTruthy();
    expect(store.transportRequests.get(stops[0].transportRequestId)).toMatchObject({
      tenantId: ctx.tenantId,
      employeeId: stops[0].employeeId,
      status: 'PLANNED',
    });

    // CorporateEmployee rows created with PREFER_NOT_TO_SAY -> OTHER normalization
    const emp1 = store.employees.get(stops[0].employeeId);
    const emp2 = store.employees.get(stops[1].employeeId);
    expect(emp1.gender).toBe('FEMALE');
    expect(emp2.gender).toBe('OTHER');

    // User(role: EMPLOYEE) accounts provisioned OUTSIDE $transaction (txDepth === 0)
    expect(emp1.userId).toBeTruthy();
    expect(emp2.userId).toBeTruthy();
    expect(store.users.get(emp1.userId)).toMatchObject({
      role: UserRole.EMPLOYEE,
      phone: `+91${ctx.emp1Phone}`,
      corporateTenantId: ctx.tenantId,
    });
    expect(store.users.get(emp2.userId)).toMatchObject({
      role: UserRole.EMPLOYEE,
      phone: `+91${ctx.emp2Phone}`,
      corporateTenantId: ctx.tenantId,
    });
    expect(employeeUserCreationTxDepths).toEqual(
      expect.arrayContaining([
        { phone: `+91${ctx.emp1Phone}`, txDepth: 0 },
        { phone: `+91${ctx.emp2Phone}`, txDepth: 0 },
      ]),
    );

    ctx.emp1Id = emp1.id;
    ctx.emp1UserId = emp1.userId;
    ctx.emp1StopId = stops[0].id;
    ctx.emp2Id = emp2.id;
    ctx.emp2UserId = emp2.userId;
    ctx.emp2StopId = stops[1].id;
  });

  // ===========================================================================
  // SIMULATION 5: Ops Manual Route Creation + Edit/Add/Delete Stops & Guards
  // ===========================================================================
  it('Simulation 5 — Ops Manual Route Creation, Stop CRUD & Route Lifecycle Guards', async () => {
    const manualDate = futureDateStr(3);
    const emp3Phone = '9848033333';
    const emp4Phone = '9848044444';

    // 1. Create Manual Route with a 3rd new employee (auto-registered!)
    const manualRoute: any = await plannerService.createManualRoute({
      tenantId: ctx.tenantId!,
      officeId: ctx.officeId!,
      shiftDate: manualDate,
      shiftTime: '09:30',
      direction: 'LOGIN',
      vehicleCategory: 'SEDAN',
      maxCapacity: 4,
      stops: [
        {
          name: 'Kiran Reddy',
          phoneNumber: emp3Phone,
          email: 'kiran.reddy@apexcorp.in',
          gender: 'MALE',
          address: 'Banjara Hills Road 12, Hyderabad',
          lat: 17.4156,
          lng: 78.4347,
        },
      ],
    });

    expect(manualRoute).toBeDefined();
    expect(manualRoute.assignedPassengerCount).toBe(1);
    expect(manualRoute.stops).toHaveLength(2); // 1 employee + 1 office dropoff

    // Verify 3rd employee auto-registered with User(EMPLOYEE)
    const emp3 = Array.from(store.employees.values()).find((e) => e.phoneNumber === `+91${emp3Phone}`);
    expect(emp3).toBeDefined();
    expect(emp3.userId).toBeTruthy();
    expect(store.users.get(emp3.userId)?.role).toBe(UserRole.EMPLOYEE);

    // 2. addRouteStop with "08:30" plannedEta
    const addedStop: any = await plannerService.addRouteStop(manualRoute.id, {
      name: 'Sneha Kulkarni',
      phoneNumber: emp4Phone,
      email: 'sneha.k@apexcorp.in',
      gender: 'FEMALE',
      address: 'Kondapur Cross Roads, Hyderabad',
      lat: 17.4604,
      lng: 78.3637,
      plannedEta: '08:30',
    });

    expect(addedStop.stopSequence).toBe(2);
    expect(addedStop.plannedEta.toISOString()).toBe(new Date(`${manualDate}T08:30:00+05:30`).toISOString());
    expect(store.routes.get(manualRoute.id).assignedPassengerCount).toBe(2);

    // 3. updateRouteStop
    const updatedStop: any = await plannerService.updateRouteStop(manualRoute.id, addedStop.id, {
      name: 'Sneha Kulkarni-Desai',
      plannedEta: '08:40',
    });
    expect(updatedStop.employeeName).toBe('Sneha Kulkarni-Desai');
    expect(updatedStop.plannedEta.toISOString()).toBe(new Date(`${manualDate}T08:40:00+05:30`).toISOString());

    // 4. deleteRouteStop guards & behavior
    const officeStop = Array.from(store.routeStops.values()).find(
      (s) => s.routeId === manualRoute.id && !s.employeeId,
    );
    expect(officeStop).toBeDefined();
    await expect(plannerService.deleteRouteStop(manualRoute.id, officeStop.id)).rejects.toThrow(BadRequestException);

    // Deleting added stop succeeds & decrements assignedPassengerCount
    const delStopRes = await plannerService.deleteRouteStop(manualRoute.id, addedStop.id);
    expect(delStopRes.deleted).toBe(true);
    expect(store.routes.get(manualRoute.id).assignedPassengerCount).toBe(1);

    // Deleting the last remaining employee stop is blocked
    const lastEmpStop = Array.from(store.routeStops.values()).find(
      (s) => s.routeId === manualRoute.id && Boolean(s.employeeId),
    );
    await expect(plannerService.deleteRouteStop(manualRoute.id, lastEmpStop.id)).rejects.toThrow(ConflictException);

    // 5. updateRoute: valid update syncs linked CorporateTransportRequest rows
    const updatedRoute: any = await plannerService.updateRoute(manualRoute.id, {
      shiftTime: '10:00',
      vehicleCategory: 'SUV',
    });
    expect(updatedRoute.shiftTime).toBe('10:00');
    expect(updatedRoute.vehicleCategory).toBe('SUV');
    const syncedReq = store.transportRequests.get(lastEmpStop.transportRequestId);
    expect(syncedReq.shiftTime).toBe('10:00');

    // updateRoute guard: CANCELLED route blocked
    store.routes.get(manualRoute.id).status = 'CANCELLED';
    await expect(plannerService.updateRoute(manualRoute.id, { shiftTime: '10:30' })).rejects.toThrow(ConflictException);

    // 6. deleteRoute guards & clean deletion
    // ASSIGNED route blocked
    store.routes.get(manualRoute.id).status = 'ASSIGNED';
    await expect(plannerService.deleteRoute(manualRoute.id)).rejects.toThrow(ConflictException);

    // PLANNED route deletes cleanly
    store.routes.get(manualRoute.id).status = 'PLANNED';
    const delRouteRes = await plannerService.deleteRoute(manualRoute.id);
    expect(delRouteRes).toEqual({ id: manualRoute.id, deleted: true });
    expect(store.routes.has(manualRoute.id)).toBe(false);
    expect(Array.from(store.routeStops.values()).filter((s) => s.routeId === manualRoute.id)).toHaveLength(0);
  });

  // ===========================================================================
  // SIMULATION 6: Ops & Corporate Employee CRUD + Session Revocation + Safe Delete
  // ===========================================================================
  it('Simulation 6 — Employee CRUD, Skip Re-Geocode on Same Address, Session Revocation & Safe Delete', async () => {
    // 1. Create fresh employee (auto-provisions User(EMPLOYEE))
    mockGeocoder.geocode.mockClear();
    const empClean = await tenantService.createEmployee(
      ctx.tenantId!,
      {
        officeId: ctx.officeId!,
        employeeCode: 'APX-101',
        fullName: 'Vikram Joshi',
        email: 'vikram.joshi@apexcorp.in',
        phoneNumber: ctx.cleanEmpPhone,
        gender: 'MALE' as any,
        department: 'Engineering',
        homeAddress: 'Gachibowli Circle, Hyderabad',
      },
      ctx.corpAdminUserId,
    );

    expect(mockGeocoder.geocode).toHaveBeenCalledTimes(1);
    expect(empClean.userId).toBeTruthy();
    const empCleanUserId = empClean.userId!;
    expect(store.users.get(empCleanUserId)).toMatchObject({
      role: UserRole.EMPLOYEE,
      phone: `+91${ctx.cleanEmpPhone}`,
      status: 'ACTIVE',
    });

    // 2. updateEmployee with SAME address skips re-geocoding; syncs phone & name
    mockGeocoder.geocode.mockClear();
    const updatedPhone = '9848055556';
    const updatedEmp = await tenantService.updateEmployee(
      ctx.tenantId!,
      empClean.id,
      {
        fullName: 'Vikram Joshi Sr.',
        phoneNumber: updatedPhone,
        homeAddress: 'Gachibowli Circle, Hyderabad', // unchanged
      },
      ctx.corpAdminUserId,
    );
    expect(mockGeocoder.geocode).not.toHaveBeenCalled();
    expect(updatedEmp.fullName).toBe('Vikram Joshi Sr.');
    expect(store.users.get(empCleanUserId)).toMatchObject({
      fullName: 'Vikram Joshi Sr.',
      phone: `+91${updatedPhone}`,
    });
    ctx.cleanEmpPhone = updatedPhone;

    // 3. Deactivating employee syncs User.status = SUSPENDED and revokes Redis sessions
    fakeRedis.revokeUserSessions.mockClear();
    await tenantService.updateEmployee(ctx.tenantId!, empClean.id, { isActive: false }, ctx.corpAdminUserId);
    expect(store.users.get(empCleanUserId).status).toBe('SUSPENDED');
    expect(fakeRedis.revokeUserSessions).toHaveBeenCalledWith(empCleanUserId);
    expect(revokedUsers.has(empCleanUserId)).toBe(true);

    // 4. Hard-delete employee with NO history (even if assigned to a pending stop) updates route counts
    const tempRoute = await db.corporateRoute.create({
      data: {
        tenantId: ctx.tenantId,
        officeId: ctx.officeId,
        shiftDate: new Date(`${futureDateStr(4)}T00:00:00.000Z`),
        shiftTime: '09:00',
        direction: 'LOGIN',
        vehicleCategory: 'SEDAN',
        maxCapacity: 4,
        assignedPassengerCount: 1,
        status: 'PLANNED',
        dispatchStatus: 'PENDING',
        targetPickup1Time: new Date(`${futureDateStr(4)}T08:15:00+05:30`),
        targetOfficeArrivalTime: new Date(`${futureDateStr(4)}T09:00:00+05:30`),
      },
    });
    await db.corporateRouteStop.create({
      data: {
        routeId: tempRoute.id,
        employeeId: empClean.id,
        stopSequence: 1,
        stopType: 'PICKUP',
        addressText: 'Gachibowli Circle, Hyderabad',
        latitude: 17.4401,
        longitude: 78.3489,
        plannedEta: new Date(`${futureDateStr(4)}T08:15:00+05:30`),
        boardingOtp: '1234',
        status: 'PENDING',
      },
    });
    await db.corporateRouteStop.create({
      data: {
        routeId: tempRoute.id,
        employeeId: null,
        stopSequence: 2,
        stopType: 'DROPOFF',
        addressText: 'Apex Global Technologies HQ',
        latitude: 17.4435,
        longitude: 78.3772,
        plannedEta: new Date(`${futureDateStr(4)}T09:00:00+05:30`),
        boardingOtp: '------',
        status: 'PENDING',
      },
    });

    const hardDelRes = await tenantService.deleteEmployee(ctx.tenantId!, empClean.id, ctx.corpAdminUserId);
    expect(hardDelRes).toMatchObject({ id: empClean.id, deleted: true, deactivated: false });
    expect(store.employees.has(empClean.id)).toBe(false);
    expect(store.users.has(empCleanUserId)).toBe(false);
    expect(store.routes.get(tempRoute.id).assignedPassengerCount).toBe(0);

    // Clean up temporary route so Simulation 11 counts stay exact
    await plannerService.deleteRoute(tempRoute.id);

    // 5. Soft-deactivate employee WITH historical BOARDED stop
    const empHistory = await tenantService.createEmployee(
      ctx.tenantId!,
      {
        officeId: ctx.officeId!,
        employeeCode: 'APX-102',
        fullName: 'Meera Iyer',
        email: 'meera.iyer@apexcorp.in',
        phoneNumber: ctx.historyEmpPhone,
        gender: 'FEMALE' as any,
        homeAddress: 'Banjara Hills, Hyderabad',
        latitude: 17.4156,
        longitude: 78.4347,
      },
      ctx.corpAdminUserId,
    );

    // Attach a historical BOARDED stop so deleteEmployee must soft-deactivate instead of hard-deleting
    await db.corporateRouteStop.create({
      data: {
        routeId: 'historical-completed-route-1',
        employeeId: empHistory.id,
        stopSequence: 1,
        stopType: 'PICKUP',
        addressText: 'Banjara Hills, Hyderabad',
        latitude: 17.4156,
        longitude: 78.4347,
        plannedEta: new Date(Date.now() - 86400_000),
        boardingOtp: '7777',
        status: 'BOARDED',
      },
    });

    fakeRedis.revokeUserSessions.mockClear();
    const empHistoryUserId = empHistory.userId!;
    const softDelRes = await tenantService.deleteEmployee(ctx.tenantId!, empHistory.id, ctx.corpAdminUserId);
    expect(softDelRes).toMatchObject({ id: empHistory.id, deleted: false, deactivated: true });
    expect(store.employees.get(empHistory.id).isActive).toBe(false);
    expect(store.users.get(empHistoryUserId).status).toBe('SUSPENDED');
    expect(fakeRedis.revokeUserSessions).toHaveBeenCalledWith(empHistoryUserId);

    ctx.cleanEmpId = empClean.id;
    ctx.historyEmpId = empHistory.id;
  });

  // ===========================================================================
  // SIMULATION 7: Auto-Registered Employee Logs In via Phone + OTP
  // ===========================================================================
  it('Simulation 7 — Auto-Registered Employee Logs In via Phone + OTP; Suspended & Deleted Blocked', async () => {
    const reqRes = await authService.requestOtp({
      phone: ctx.emp1Phone,
      role: UserRole.EMPLOYEE,
      isRegister: false,
    });
    const otp = getCachedOtp(reqRes.requestId, `+91${ctx.emp1Phone}`);

    const loginRes = await authService.verifyOtp({
      requestId: reqRes.requestId,
      phone: ctx.emp1Phone,
      otp,
      role: UserRole.EMPLOYEE,
      isRegister: false,
    });

    // Verify JWT & login user include corporateEmployeeId & corporateTenantId
    expect(loginRes.user.role).toBe(UserRole.EMPLOYEE);
    expect(loginRes.user.corporateEmployeeId).toBe(ctx.emp1Id);
    expect(loginRes.user.corporateTenantId).toBe(ctx.tenantId);

    const decoded: any = jwtService.decode(loginRes.accessToken);
    expect(decoded.corporateEmployeeId).toBe(ctx.emp1Id);
    expect(decoded.corporateTenantId).toBe(ctx.tenantId);

    // Verify /auth/me includes corporateEmployeeId & corporateTenantId
    const meRes = await authService.getCurrentUser(loginRes.user.id);
    expect(meRes.corporateEmployeeId).toBe(ctx.emp1Id);
    expect(meRes.corporateTenantId).toBe(ctx.tenantId);

    // Suspended employee (soft-deactivated in Simulation 6) MUST be blocked from logging in
    await expect(
      authService.requestOtp({
        phone: ctx.historyEmpPhone,
        role: UserRole.EMPLOYEE,
        isRegister: false,
      }),
    ).rejects.toThrow(ForbiddenException);

    // Hard-deleted employee (Simulation 6) MUST be blocked from logging in
    await expect(
      authService.requestOtp({
        phone: ctx.cleanEmpPhone,
        role: UserRole.EMPLOYEE,
        isRegister: false,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ===========================================================================
  // SIMULATION 8: Employee Views Live Routes, Schedule, Trips & Tracking
  // ===========================================================================
  it('Simulation 8 — Employee Views Profile, Next Trip, Schedule, Trips, Tracking (with Privacy Masking) & Notifications', async () => {
    // Seed 1 real DB notification for Employee 1
    await db.notification.create({
      data: {
        userId: ctx.emp1UserId,
        type: 'ROUTE_ASSIGNED',
        title: 'Pickup Scheduled',
        body: 'Your morning pickup is scheduled at 08:15 AM.',
        isRead: false,
        data: { routeId: ctx.committedRouteId },
      },
    });

    // 1. Profile
    const profile = await riderService.getRiderProfile(ctx.emp1UserId!);
    expect(profile.employeeId).toBe(ctx.emp1Id);
    expect(profile.fullName).toBe('Priya Nair');
    expect(profile.tenant.id).toBe(ctx.tenantId);
    expect(profile.office.id).toBe(ctx.officeId);

    // 2. Next Trip (routeStops & 4-digit boardingOtp)
    const nextTrip = await riderService.getRiderNextTrip(ctx.emp1UserId!);
    expect(nextTrip.hasActiveTrip).toBe(true);
    if (!nextTrip.hasActiveTrip) throw new Error('Expected active trip');
    expect(nextTrip.routeId).toBe(ctx.committedRouteId);
    expect(nextTrip.boardingOtp).toMatch(/^\d{4}$/);
    expect(nextTrip.routeStops).toHaveLength(3);
    expect(nextTrip.routeStops!.find((s) => s.stopId === ctx.emp1StopId)?.isCurrentUser).toBe(true);

    // 3. Schedule (Ops-committed route appears!)
    const schedule = await riderService.getRiderSchedule(ctx.emp1UserId!);
    expect(schedule.totalRides).toBeGreaterThanOrEqual(1);
    const committedItem = schedule.schedule.find((s) => s.routeId === ctx.committedRouteId);
    expect(committedItem).toBeDefined();
    expect(committedItem!.stopId).toBe(ctx.emp1StopId);
    expect(committedItem!.canModify).toBe(true);

    // 4. Trips
    const trips = await riderService.getRiderTrips(ctx.emp1UserId!);
    expect(trips).toHaveLength(1);
    expect(trips[0].routeId).toBe(ctx.committedRouteId);
    expect(trips[0].boardingOtp).toMatch(/^\d{4}$/);
    expect(trips[0].vehicle).toBeNull(); // Honest null when unassigned

    // 5. Trip Tracking (routeStops present with co-passenger address privacy masking!)
    const tracking = await riderService.getRiderTripTracking(ctx.emp1UserId!, ctx.emp1StopId!);
    expect(tracking.routeId).toBe(ctx.committedRouteId);
    expect(tracking.boardingOtp).toMatch(/^\d{4}$/);
    expect(tracking.routeStops).toHaveLength(3);

    const ownStop = tracking.routeStops!.find((s) => s.stopId === ctx.emp1StopId);
    const coPassengerStop = tracking.routeStops!.find((s) => s.stopId === ctx.emp2StopId);
    const officeStop = tracking.routeStops!.find((s) => s.stopType === 'DROPOFF');

    expect(ownStop?.isCurrentUser).toBe(true);
    expect(ownStop?.addressText).toContain('Madhapur');
    expect(coPassengerStop?.isCurrentUser).toBe(false);
    expect(coPassengerStop?.addressText).toBe('Co-passenger Stop #2');
    expect(coPassengerStop?.addressText).not.toContain('Jubilee Hills'); // Co-passenger home address masked!
    expect(officeStop?.addressText).toContain('Mindspace');

    // 6. Notifications (real DB rows with isRead)
    const notifs = await riderService.getRiderNotifications(ctx.emp1UserId!);
    expect(notifs).toHaveLength(1);
    expect(notifs[0]).toMatchObject({
      type: 'ROUTE_ASSIGNED',
      title: 'Pickup Scheduled',
      isRead: false,
    });
  });

  // ===========================================================================
  // SIMULATION 9: Employee Profile Update (PATCH /corporate/me) & Stop Cancel Cutoff
  // ===========================================================================
  it('Simulation 9 — Employee Profile Update (Even Without Prior Location Row) & 9-Hour Stop Cancel Cutoff', async () => {
    // Remove Employee 2's existing location rows to test creating a location row from scratch
    await db.corporateEmployeeLocation.deleteMany({ where: { employeeId: ctx.emp2Id } });

    const updatedProfile = await riderService.updateRiderProfile(ctx.emp2UserId!, {
      fullName: 'Rohan Mehta Updated',
      homeAddress: 'Kondapur Tech Enclave, Hyderabad',
    });

    expect(updatedProfile.fullName).toBe('Rohan Mehta Updated');
    expect(updatedProfile.defaultPickupLocation?.addressText).toBe('Kondapur Tech Enclave, Hyderabad');
    expect(store.users.get(ctx.emp2UserId!).fullName).toBe('Rohan Mehta Updated');

    // 1. Cancel inside 9-hour cutoff MUST be blocked
    const nearPickupTime = new Date(Date.now() + 2 * 3600_000); // 2 hours from now (< 9h cutoff)
    const nearRoute = await db.corporateRoute.create({
      data: {
        tenantId: ctx.tenantId,
        officeId: ctx.officeId,
        shiftDate: new Date(`${nearPickupTime.toISOString().slice(0, 10)}T00:00:00.000Z`),
        shiftTime: '11:00',
        direction: 'LOGIN',
        vehicleCategory: 'SEDAN',
        maxCapacity: 4,
        assignedPassengerCount: 1,
        status: 'PLANNED',
        dispatchStatus: 'PENDING',
        targetPickup1Time: nearPickupTime,
        targetOfficeArrivalTime: new Date(nearPickupTime.getTime() + 45 * 60_000),
      },
    });
    const nearStop = await db.corporateRouteStop.create({
      data: {
        routeId: nearRoute.id,
        employeeId: ctx.emp2Id,
        stopSequence: 1,
        stopType: 'PICKUP',
        addressText: 'Kondapur Tech Enclave, Hyderabad',
        latitude: 17.4604,
        longitude: 78.3637,
        plannedEta: nearPickupTime,
        boardingOtp: '4321',
        status: 'PENDING',
      },
    });

    await expect(
      riderService.cancelRiderStop(ctx.emp2UserId!, nearStop.id, 'Running late'),
    ).rejects.toThrow(BadRequestException);

    // Clean up near-term test route
    await plannerService.deleteRoute(nearRoute.id);

    // 2. Cancel outside 9-hour cutoff succeeds and decrements assignedPassengerCount
    expect(store.routes.get(ctx.committedRouteId!).assignedPassengerCount).toBe(2);
    const cancelRes = await riderService.cancelRiderStop(
      ctx.emp2UserId!,
      ctx.emp2StopId!,
      'Working from home',
    );
    expect(cancelRes).toEqual({
      stopId: ctx.emp2StopId,
      routeId: ctx.committedRouteId,
      status: 'CANCELLED',
    });
    expect(store.routeStops.get(ctx.emp2StopId!).status).toBe('CANCELLED');
    expect(store.routes.get(ctx.committedRouteId!).assignedPassengerCount).toBe(1);
  });

  // ===========================================================================
  // SIMULATION 10: Employee Raises Complaint -> Corporate Replies & Resolves Legally
  // ===========================================================================
  it('Simulation 10 — Employee Support Ticket, Merged Message/Comment Thread & Legal Status Workflow', async () => {
    const corpAdminActor = {
      userId: ctx.corpAdminUserId!,
      role: UserRole.CORPORATE_ADMIN,
      corporateTenantId: ctx.tenantId!,
    };

    // 1. Employee raises complaint via CorporateRiderService
    const ticket = await riderService.createSupportTicket(ctx.emp1UserId!, {
      category: CorporateTicketCategory.CAB_DELAY,
      priority: CorporateTicketPriority.HIGH,
      subject: 'Cab delayed near Madhapur junction',
      description: 'Pickup cab arrived 15 minutes past planned ETA.',
      routeId: ctx.committedRouteId,
      stopId: ctx.emp1StopId,
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.status).toBe(CorporateTicketStatus.OPEN);
    expect(ticket.slaMinutes).toBe(60);
    ctx.ticketId = ticket.id;

    // 2. Post both a corporateTicketMessage AND a corporateSupportTicketComment
    await supportService.createMessage(
      ticket.id,
      { message: 'Checking with dispatch desk right now.' },
      corpAdminActor,
    );
    await supportService.addComment(
      ticket.id,
      'Driver confirmed brief traffic diversion at Cyber Towers.',
      corpAdminActor,
      CorporateTicketCommentVisibility.PUBLIC,
    );

    // Verify listMessages merges BOTH corporateTicketMessage and corporateSupportTicketComment
    const mergedMessages = await supportService.listMessages(ticket.id, corpAdminActor);
    expect(mergedMessages).toHaveLength(2);
    expect(mergedMessages.map((m) => m.message)).toEqual([
      'Checking with dispatch desk right now.',
      'Driver confirmed brief traffic diversion at Cyber Towers.',
    ]);
    expect(mergedMessages[1].id).toMatch(/^cmt-/);

    // 3. Verify OPEN -> RESOLVED directly throws 409 ConflictException
    await expect(
      supportService.updateTicketStatus(
        ticket.id,
        CorporateTicketStatus.RESOLVED,
        corpAdminActor,
        'Trying to skip IN_PROGRESS',
      ),
    ).rejects.toThrow(ConflictException);

    // 4. Legal workflow: OPEN -> IN_PROGRESS -> RESOLVED succeeds cleanly for CORPORATE_ADMIN
    const inProgress = await supportService.updateTicketStatus(
      ticket.id,
      CorporateTicketStatus.IN_PROGRESS,
      corpAdminActor,
      'Reviewing route ETA buffer with ops',
    );
    expect(inProgress.status).toBe(CorporateTicketStatus.IN_PROGRESS);

    const resolved = await supportService.updateTicketStatus(
      ticket.id,
      CorporateTicketStatus.RESOLVED,
      corpAdminActor,
      'Adjusted route pickup time by 10 minutes for subsequent shifts.',
    );
    expect(resolved.status).toBe(CorporateTicketStatus.RESOLVED);
    expect(resolved.resolutionNotes).toBe('Adjusted route pickup time by 10 minutes for subsequent shifts.');
    expect(resolved.resolvedByUserId).toBe(ctx.corpAdminUserId);
  });

  // ===========================================================================
  // SIMULATION 11: Corporate Portal Views Company Profile, Employees, Routes & Zero-Mock Metrics
  // ===========================================================================
  it('Simulation 11 — Corporate Portal Views Company Profile, All Auto-Registered Employees & Honest Metrics', async () => {
    const profile = await tenantService.getTenantById(ctx.tenantId!);
    expect(profile.id).toBe(ctx.tenantId);
    expect(profile.code).toBe('APEXCORP');
    expect(profile.offices).toHaveLength(1);
    expect(typeof profile.offices[0].latitude).toBe('number');
    expect(profile.policies).toHaveLength(1);
    expect(profile.users.some((u: any) => u.id === ctx.corpAdminUserId)).toBe(true);
    expect(profile._count.routes).toBe(1); // The Simulation 4 committed route

    // Verify all auto-registered employees (Sim 4 + Sim 5 + Sim 6 soft-deactivated) are visible
    const employeesPage = await tenantService.listEmployees(ctx.tenantId!, { limit: 50 });
    const employeeIds = employeesPage.items.map((e: any) => e.id);
    expect(employeeIds).toContain(ctx.emp1Id);
    expect(employeeIds).toContain(ctx.emp2Id);
    expect(employeeIds).toContain(ctx.historyEmpId);
    expect(employeeIds).not.toContain(ctx.cleanEmpId); // Hard-deleted in Sim 6

    // Verify Ops/Corporate tenant list shows real active route count (1) and still null punctuality (0 completed)
    const listed = await tenantService.listTenants({ search: 'APEXCORP' });
    expect(listed.items[0].activeCabsCount).toBe(1);
    expect(listed.items[0].inTransitCount).toBe(0);
    expect(listed.items[0].onTimePunctualityPct).toBeNull();
  });

  // ===========================================================================
  // SIMULATION 12: Zero-Mock Contract Verification
  // ===========================================================================
  it('Simulation 12 — Freshly Onboarded Company Returns Honest Empty Arrays and 0/null Telemetry (Zero Synthetic Data)', async () => {
    const freshTenant = await tenantService.createTenant({
      code: 'ZEROMOCK',
      name: 'Zero Mock Labs',
      legalEntityName: 'Zero Mock Labs Pvt Ltd',
      registeredAddress: 'Gachibowli Financial District',
      city: 'Hyderabad',
      state: 'Telangana',
      pinCode: '500032',
      primaryContactName: 'Siddharth Rao',
      primaryContactEmail: 'admin@zeromock.in',
      primaryContactPhone: '9876509876',
      createPortalAdmin: true,
    });

    const freshOffice = Array.from(store.offices.values()).find((o) => o.tenantId === freshTenant.id);
    expect(freshOffice).toBeDefined();

    const freshEmp = await tenantService.createEmployee(freshTenant.id, {
      officeId: freshOffice.id,
      employeeCode: 'ZM-001',
      fullName: 'Neha Kapoor',
      email: 'neha@zeromock.in',
      phoneNumber: '9848099999',
      gender: 'FEMALE' as any,
      homeAddress: 'Kondapur, Hyderabad',
      latitude: 17.4604,
      longitude: 78.3637,
    });

    // 1. Tenant list telemetry: strictly 0 / null
    const tenantList = await tenantService.listTenants({ search: 'ZEROMOCK' });
    expect(tenantList.items).toHaveLength(1);
    expect(tenantList.items[0]).toMatchObject({
      activeCabsCount: 0,
      inTransitCount: 0,
      inTransitPassengersCount: 0,
      delayedCount: 0,
      unassignedCount: 0,
      onTimePunctualityPct: null,
    });
    expect(tenantList.items[0]._count.routes).toBe(0);

    // 2. Tenant integrations: honest NOT_CONFIGURED / null / []
    const integrations = await tenantService.getTenantIntegrations(freshTenant.id);
    expect(integrations.hrms.status).toBe('NOT_CONFIGURED');
    expect(integrations.hrms.provider).toBeNull();
    expect(integrations.webhookHealth.uptimePct).toBeNull();
    expect(integrations.fieldMappings).toEqual([]);

    // 3. Employee views: honest empty arrays & hasActiveTrip: false
    const freshEmpUserId = freshEmp.userId!;
    const nextTrip = await riderService.getRiderNextTrip(freshEmpUserId);
    expect(nextTrip.hasActiveTrip).toBe(false);

    const schedule = await riderService.getRiderSchedule(freshEmpUserId);
    expect(schedule.totalRides).toBe(0);
    expect(schedule.schedule).toEqual([]);

    const trips = await riderService.getRiderTrips(freshEmpUserId);
    expect(trips).toEqual([]);

    const notifs = await riderService.getRiderNotifications(freshEmpUserId);
    expect(notifs).toEqual([]);

    const empTickets = await riderService.getRiderSupportTickets(freshEmpUserId);
    expect(empTickets).toEqual([]);

    // 4. Support desk: honest empty list & zero summary
    const deskTickets = await supportService.listTickets({ tenantId: freshTenant.id });
    expect(deskTickets).toEqual([]);

    const summary = await supportService.ticketSummary({ tenantId: freshTenant.id });
    expect(summary).toEqual({
      total: 0,
      open: 0,
      assigned: 0,
      unassigned: 0,
      inProgress: 0,
      waitingForCorporate: 0,
      resolved: 0,
      closed: 0,
    });
  });
});
