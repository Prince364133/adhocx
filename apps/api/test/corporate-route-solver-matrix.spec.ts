import * as h3 from 'h3-js';
import {
  CorporateRoutePlanner,
  PlannerInput,
  PlannerPassenger,
} from '../src/domains/corporate/routing/corporate-route-planner';
import {
  ITravelTimeMatrixPort,
  MatrixPoint,
  TravelTimeMatrix,
} from '../src/domains/corporate/routing/travel-time-matrix.port';
import { HaversineTravelTimeMatrix, haversineMeters } from '../src/domains/corporate/routing/haversine-travel-time-matrix';
import {
  GoogleTravelTimeMatrixAdapter,
  MatrixCache,
  RedisMatrixCache,
  RouteMatrixClient,
} from '../src/domains/corporate/routing/google-travel-time-matrix.adapter';
import { RouteSolverService } from '../src/domains/corporate/routing/route-solver.service';
import { GoogleMapsService } from '../src/modules/locations/google-maps.service';

// ----------------------------------------------------------------------------- helpers

const OFFICE: MatrixPoint = { latitude: 17.4474, longitude: 78.3762 }; // HITEC City
const LOGIN_0800 = new Date(2026, 10, 10, 8, 0, 0); // local time, like the service
const LOGOUT_1700 = new Date(2026, 10, 10, 17, 0, 0);

/** Counting wrapper around any port. */
class SpyPort implements ITravelTimeMatrixPort {
  calls = 0;
  elements = 0;
  constructor(private readonly inner: ITravelTimeMatrixPort) {}
  async getMatrix(o: MatrixPoint[], d: MatrixPoint[], t: Date): Promise<TravelTimeMatrix> {
    this.calls++;
    this.elements += o.length * d.length;
    return this.inner.getMatrix(o, d, t);
  }
}

/** Deterministic "road" matrix: 1200 s (20 min) per 0.01 deg of |dLat| + |dLng|, 1 m per second. */
class GridPort implements ITravelTimeMatrixPort {
  async getMatrix(o: MatrixPoint[], d: MatrixPoint[]): Promise<TravelTimeMatrix> {
    const sec = (a: MatrixPoint, b: MatrixPoint) =>
      Math.round(((Math.abs(a.latitude - b.latitude) + Math.abs(a.longitude - b.longitude)) / 0.01) * 1200);
    const durationSec = o.map((a) => d.map((b) => sec(a, b)));
    return { durationSec, distanceMeters: durationSec.map((r) => r.map((s) => s * 10)), source: 'GOOGLE' };
  }
}

/** Seeded PRNG so "random" rosters are reproducible. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const CORRIDORS = [
  { lat: 17.47, lng: 78.355 }, // Kondapur
  { lat: 17.495, lng: 78.4 }, // KPHB
  { lat: 17.5, lng: 78.33 }, // Miyapur
  { lat: 17.425, lng: 78.34 }, // Gachibowli
  { lat: 17.43, lng: 78.42 }, // Jubilee Hills
];

function roster(count: number, seed: number, prefix = 'r'): PlannerPassenger[] {
  const rand = rng(seed);
  return Array.from({ length: count }, (_, i) => {
    const c = CORRIDORS[i % CORRIDORS.length];
    return {
      requestId: `${prefix}-${String(i).padStart(4, '0')}`,
      employeeId: `emp-${prefix}-${i}`,
      latitude: c.lat + (rand() - 0.5) * 0.04,
      longitude: c.lng + (rand() - 0.5) * 0.04,
      gender: i % 3 === 0 ? 'FEMALE' : 'MALE',
    };
  });
}

/** Employees on a north-south line above the office: lat = office + x * 0.01. */
function linePassengers(xs: number[], genders?: string[]): PlannerPassenger[] {
  return xs.map((x, i) => ({
    requestId: `line-${i}`,
    latitude: OFFICE.latitude + x * 0.01,
    longitude: OFFICE.longitude,
    gender: genders?.[i] ?? 'MALE',
  }));
}

function baseInput(overrides: Partial<PlannerInput>): PlannerInput {
  return {
    direction: 'LOGIN',
    office: OFFICE,
    anchorTime: LOGIN_0800,
    capacity: 4,
    passengers: [],
    ...overrides,
  };
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function assignedIds(routes: { passengers: PlannerPassenger[] }[]): string[] {
  return routes.flatMap((r) => r.passengers.map((p) => p.requestId)).sort();
}

/** Fake Google client: haversine at 40 km/h on the centroids it is sent. */
class FakeGoogleClient implements RouteMatrixClient {
  calls: { o: number; d: number; departure?: Date }[] = [];
  available = true;
  failWith: Error | null = null;
  noRoute = new Set<string>(); // "oi|di" within a request
  isRouteMatrixAvailable() {
    return this.available;
  }
  async computeRouteMatrixElements(o: MatrixPoint[], d: MatrixPoint[], departure?: Date) {
    this.calls.push({ o: o.length, d: d.length, departure });
    if (this.failWith) throw this.failWith;
    const out: any[] = [];
    o.forEach((a, i) =>
      d.forEach((b, j) => {
        const m = Math.round(haversineMeters(a, b) * 1.2);
        out.push({
          originIndex: i,
          destinationIndex: j,
          distanceMeters: m,
          duration: `${Math.round(m / (40000 / 3600))}s`,
          condition: this.noRoute.has(`${i}|${j}`) ? 'ROUTE_NOT_FOUND' : 'ROUTE_EXISTS',
        });
      }),
    );
    return out;
  }
}

class MemoryCache implements MatrixCache {
  store = new Map<string, string>();
  reads = 0;
  async mget(keys: string[]) {
    this.reads += keys.length;
    return keys.map((k) => this.store.get(k) ?? null);
  }
  async mset(entries: [string, string][]) {
    for (const [k, v] of entries) this.store.set(k, v);
  }
}

function gridPoints(rows: number, cols: number, step = 0.02): MatrixPoint[] {
  const pts: MatrixPoint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pts.push({ latitude: 17.3 + r * step, longitude: 78.3 + c * step });
    }
  }
  return pts;
}

// ----------------------------------------------------------------------------- planner

describe('CorporateRoutePlanner: capacity', () => {
  const planner = new CorporateRoutePlanner(new HaversineTravelTimeMatrix());

  it('sedan capacity 4: 10 employees -> 3 routes, none above 4, everyone assigned once', async () => {
    const res = await planner.plan(baseInput({ capacity: 4, passengers: roster(10, 1) }));
    expect(res.routes).toHaveLength(3);
    res.routes.forEach((r) => expect(r.passengers.length).toBeLessThanOrEqual(4));
    expect(assignedIds(res.routes)).toEqual(roster(10, 1).map((p) => p.requestId).sort());
  });

  it('SUV capacity 6: 12 employees -> 2 full routes', async () => {
    const res = await planner.plan(baseInput({ capacity: 6, passengers: roster(12, 2) }));
    expect(res.routes).toHaveLength(2);
    res.routes.forEach((r) => expect(r.passengers).toHaveLength(6));
  });

  it('company-configured capacity (5) is respected', async () => {
    const res = await planner.plan(baseInput({ capacity: 5, passengers: roster(23, 3) }));
    expect(res.routes).toHaveLength(5);
    res.routes.forEach((r) => expect(r.passengers.length).toBeLessThanOrEqual(5));
  });

  it('rejects a non-positive capacity', async () => {
    await expect(planner.plan(baseInput({ capacity: 0, passengers: roster(3, 4) }))).rejects.toThrow(/capacity/);
  });

  it('500 employees across 2 login + 2 logout shifts -> ~125 sedan routes, all within capacity', async () => {
    const shifts = [
      { dir: 'LOGIN' as const, at: new Date(2026, 10, 10, 8, 0), n: 130 },
      { dir: 'LOGIN' as const, at: new Date(2026, 10, 10, 9, 0), n: 120 },
      { dir: 'LOGOUT' as const, at: new Date(2026, 10, 10, 17, 0), n: 126 },
      { dir: 'LOGOUT' as const, at: new Date(2026, 10, 10, 18, 0), n: 124 },
    ];
    let routes = 0;
    let employees = 0;
    for (const [k, s] of shifts.entries()) {
      const pax = roster(s.n, 100 + k, `s${k}`);
      const res = await planner.plan(baseInput({ direction: s.dir, anchorTime: s.at, capacity: 4, passengers: pax }));
      expect(res.routes).toHaveLength(Math.ceil(s.n / 4));
      res.routes.forEach((r) => expect(r.passengers.length).toBeLessThanOrEqual(4));
      expect(assignedIds(res.routes)).toEqual(pax.map((p) => p.requestId).sort());
      routes += res.routes.length;
      employees += pax.length;
    }
    expect(employees).toBe(500);
    expect(routes).toBe(33 + 30 + 32 + 31); // 126
    expect(routes).toBeGreaterThanOrEqual(125);
    expect(routes).toBeLessThanOrEqual(130);
  });
});

describe('CorporateRoutePlanner: LOGIN timing', () => {
  const planner = new CorporateRoutePlanner(new GridPort());

  it('worked example: 8:00 login, 10 min buffer, 90 min drive, 4 x 5 min dwell -> pickup 1 at 06:00', async () => {
    // Line legs: 4.5 -> 3.5 -> 2.5 -> 1.5 -> office(0) = 20 + 20 + 20 + 30 = 90 min
    const res = await planner.plan(baseInput({ passengers: linePassengers([1.5, 4.5, 2.5, 3.5]) }));
    expect(res.routes).toHaveLength(1);
    const r = res.routes[0];
    expect(r.passengers.map((p) => p.requestId)).toEqual(['line-1', 'line-3', 'line-2', 'line-0']); // farthest first
    expect(r.driveSeconds).toBe(90 * 60);
    expect(r.totalSeconds).toBe(110 * 60);
    expect(hhmm(r.officeTime)).toBe('07:50');
    expect(r.stopEtas.map(hhmm)).toEqual(['06:00', '06:25', '06:50', '07:15']);
    expect(hhmm(r.firstStopTime)).toBe('06:00');
    expect(r.rideSeconds[0]).toBe(110 * 60);
  });

  it('every stop is exactly leg + 5 min dwell after the previous one, and office arrival <= login - buffer', async () => {
    const res = await planner.plan(
      baseInput({ capacity: 6, officeBufferMinutes: 15, passengers: roster(30, 7), maxRideTimeSeconds: 6 * 3600 }),
    );
    for (const r of res.routes) {
      expect(r.officeTime.getTime()).toBeLessThanOrEqual(LOGIN_0800.getTime() - 15 * 60_000);
      for (let i = 1; i < r.stopEtas.length; i++) {
        expect(r.stopEtas[i].getTime() - r.stopEtas[i - 1].getTime()).toBe((r.legDurationsSec[i - 1] + 300) * 1000);
      }
      const last = r.stopEtas.length - 1;
      expect(r.officeTime.getTime() - r.stopEtas[last].getTime()).toBe((r.legDurationsSec[last] + 300) * 1000);
    }
  });

  it('splits a route when it would break the max ride time', async () => {
    // Same 4-stop line: together the first pickup rides 110 min; cap at 100 min
    const res = await planner.plan(
      baseInput({ passengers: linePassengers([1.5, 4.5, 2.5, 3.5]), maxRideTimeSeconds: 100 * 60 }),
    );
    expect(res.routes.length).toBeGreaterThan(1);
    expect(assignedIds(res.routes)).toHaveLength(4);
    res.routes.forEach((r) => {
      r.rideSeconds.forEach((s) => expect(s).toBeLessThanOrEqual(6000));
      expect(r.rideTimeViolation).toBe(false);
    });
    expect(res.warnings).toEqual([]);
  });

  it('flags (but still serves) an employee who exceeds max ride time even alone', async () => {
    const res = await planner.plan(
      baseInput({ passengers: linePassengers([0.5, 10]), maxRideTimeSeconds: 60 * 60 }), // 10 units = 200 min
    );
    const far = res.routes.find((r) => r.passengers.some((p) => p.requestId === 'line-1'))!;
    expect(far.passengers).toHaveLength(1);
    expect(far.rideTimeViolation).toBe(true);
    expect(res.warnings.join(' ')).toMatch(/line-1.*max ride time/);
    expect(assignedIds(res.routes)).toEqual(['line-0', 'line-1']);
  });

  it('night shift: a woman is not the first pickup when a man shares the cab', async () => {
    const pax = linePassengers([4, 3, 2, 1], ['FEMALE', 'MALE', 'MALE', 'MALE']); // woman is farthest
    const night = await planner.plan(baseInput({ anchorTime: new Date(2026, 10, 10, 22, 0), nightShift: true, passengers: pax }));
    expect(night.routes[0].passengers[0].gender).toBe('MALE');
    expect(night.routes[0].escortRequired).toBe(false);
    const day = await planner.plan(baseInput({ passengers: pax }));
    expect(day.routes[0].passengers[0].requestId).toBe('line-0'); // pure distance order by day
  });
});

describe('CorporateRoutePlanner: LOGOUT', () => {
  const planner = new CorporateRoutePlanner(new GridPort());

  it('starts at the office: cab reports 15 min before logout, drops go outward with increasing ETAs', async () => {
    const res = await planner.plan(
      baseInput({ direction: 'LOGOUT', anchorTime: LOGOUT_1700, passengers: linePassengers([3, 1, 4, 2]) }),
    );
    const r = res.routes[0];
    expect(hhmm(r.firstStopTime)).toBe('16:45');
    expect(hhmm(r.officeTime)).toBe('17:00');
    expect(r.passengers.map((p) => p.requestId)).toEqual(['line-1', 'line-3', 'line-0', 'line-2']); // nearest first
    expect(r.stopEtas.map(hhmm)).toEqual(['17:20', '17:45', '18:10', '18:35']);
    expect(r.rideSeconds[3]).toBe(95 * 60);
  });

  it('night logout: a woman is not the last drop when a man shares the cab', async () => {
    const pax = linePassengers([1, 2, 3, 4], ['MALE', 'MALE', 'MALE', 'FEMALE']);
    const res = await planner.plan(
      baseInput({ direction: 'LOGOUT', anchorTime: new Date(2026, 10, 10, 22, 0), nightShift: true, passengers: pax }),
    );
    const order = res.routes[0].passengers;
    expect(order[order.length - 1].gender).toBe('MALE');
  });
});

describe('CorporateRoutePlanner: determinism, sparsity and speed', () => {
  it('produces identical routes regardless of input order', async () => {
    const pax = roster(60, 11);
    const shuffled = [...pax].reverse();
    const a = await new CorporateRoutePlanner(new HaversineTravelTimeMatrix()).plan(baseInput({ passengers: pax }));
    const b = await new CorporateRoutePlanner(new HaversineTravelTimeMatrix()).plan(baseInput({ passengers: shuffled }));
    const sig = (res: typeof a) => res.routes.map((r) => r.passengers.map((p) => p.requestId).join('>') + '@' + r.stopEtas.map((d) => d.getTime()).join(','));
    expect(sig(a)).toEqual(sig(b));
  });

  it('solves 500 employees (sedan) in a few seconds and requests a sparse matrix, not n^2', async () => {
    const spy = new SpyPort(new HaversineTravelTimeMatrix());
    const started = Date.now();
    const res = await new CorporateRoutePlanner(spy).plan(baseInput({ capacity: 4, passengers: roster(500, 42) }));
    const elapsed = Date.now() - started;
    expect(res.routes).toHaveLength(125);
    expect(elapsed).toBeLessThan(5000);
    expect(spy.elements).toBeLessThan(500 * 500 * 0.15);
    expect(res.matrixElementsRequested).toBe(spy.elements);
  });

  it('solves 500 employees (SUV, 6 seats) in a few seconds', async () => {
    const started = Date.now();
    const res = await new CorporateRoutePlanner(new HaversineTravelTimeMatrix()).plan(
      baseInput({ capacity: 6, passengers: roster(500, 43) }),
    );
    expect(res.routes).toHaveLength(84);
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it('local search never makes the plan worse than the raw sweep', async () => {
    const pax = roster(200, 77);
    const total = (res: { routes: { driveSeconds: number }[] }) => res.routes.reduce((s, r) => s + r.driveSeconds, 0);
    const raw = await new CorporateRoutePlanner(new HaversineTravelTimeMatrix()).plan(
      baseInput({ capacity: 4, passengers: pax, maxImprovementPasses: 0 }),
    );
    const improved = await new CorporateRoutePlanner(new HaversineTravelTimeMatrix()).plan(
      baseInput({ capacity: 4, passengers: pax }),
    );
    expect(total(improved)).toBeLessThanOrEqual(total(raw));
    expect(improved.routes).toHaveLength(raw.routes.length);
  });

  it('a failing matrix port degrades to haversine estimates instead of failing the plan', async () => {
    const broken: ITravelTimeMatrixPort = { getMatrix: jest.fn().mockRejectedValue(new Error('boom')) };
    const res = await new CorporateRoutePlanner(broken).plan(baseInput({ passengers: roster(9, 5) }));
    expect(res.routes).toHaveLength(3);
    expect(res.travelTimeSource).toBe('HAVERSINE');
  });

  it('uses matrix durations (not a fixed speed) for timing', async () => {
    const slow = new HaversineTravelTimeMatrix({ speedKmh: 10 });
    const fast = new HaversineTravelTimeMatrix({ speedKmh: 40 });
    const pax = roster(4, 9);
    const a = await new CorporateRoutePlanner(slow).plan(baseInput({ passengers: pax }));
    const b = await new CorporateRoutePlanner(fast).plan(baseInput({ passengers: pax }));
    expect(a.routes[0].firstStopTime.getTime()).toBeLessThan(b.routes[0].firstStopTime.getTime());
  });
});

// ----------------------------------------------------------------------------- Google adapter

describe('GoogleTravelTimeMatrixAdapter', () => {
  const departure = new Date(2026, 10, 10, 7, 0); // Tuesday 07:00
  const now = () => new Date(2026, 10, 2, 12, 0).getTime();

  it('chunks a 60 x 60 matrix into 25 x 25 requests within the 625-element limit', async () => {
    const client = new FakeGoogleClient();
    const adapter = new GoogleTravelTimeMatrixAdapter(client, new MemoryCache(), undefined, { now });
    const pts = gridPoints(6, 10);
    const m = await adapter.getMatrix(pts, pts, departure);
    expect(client.calls).toHaveLength(9); // ceil(60/25)^2
    client.calls.forEach((c) => {
      expect(c.o).toBeLessThanOrEqual(25);
      expect(c.d).toBeLessThanOrEqual(25);
      expect(c.o * c.d).toBeLessThanOrEqual(625);
    });
    expect(m.source).toBe('GOOGLE');
    expect(m.durationSec).toHaveLength(60);
    expect(m.durationSec[0]).toHaveLength(60);
    expect(m.durationSec[0][59]).toBeGreaterThan(0);
  });

  it('serves a repeat request entirely from the H3 cell-pair cache', async () => {
    const client = new FakeGoogleClient();
    const cache = new MemoryCache();
    const adapter = new GoogleTravelTimeMatrixAdapter(client, cache, undefined, { now });
    const pts = gridPoints(3, 3);
    const first = await adapter.getMatrix(pts, pts, departure);
    const callsAfterFirst = client.calls.length;
    // Same cells, departure in the same 30-min bucket
    const second = await adapter.getMatrix(pts, pts, new Date(2026, 10, 10, 7, 20));
    expect(client.calls.length).toBe(callsAfterFirst);
    expect(second.source).toBe('CACHE');
    expect(second.durationSec).toEqual(first.durationSec);
    expect(adapter.stats.cacheHits).toBeGreaterThan(0);
    // Cache key = resolution + time bucket + cell pair
    const [anyKey] = [...cache.store.keys()];
    expect(anyKey).toMatch(/^corp:ttm:v1:r8:wd0700:[0-9a-f]+:[0-9a-f]+$/);
  });

  it('falls back to haversine when Google fails, and does not cache the fallback', async () => {
    const client = new FakeGoogleClient();
    client.failWith = new Error('HTTP 503');
    const cache = new MemoryCache();
    const fallback = new HaversineTravelTimeMatrix();
    const adapter = new GoogleTravelTimeMatrixAdapter(client, cache, fallback, { now });
    const pts = gridPoints(2, 2);
    const m = await adapter.getMatrix(pts, [OFFICE], departure);
    expect(m.source).toBe('HAVERSINE');
    expect(m.durationSec[0][0]).toBe(fallback.estimate(pts[0], OFFICE).durationSec);
    expect(cache.store.size).toBe(0);
  });

  it('does not call Google at all when no key is configured', async () => {
    const client = new FakeGoogleClient();
    client.available = false;
    const adapter = new GoogleTravelTimeMatrixAdapter(client, new MemoryCache(), undefined, { now });
    const m = await adapter.getMatrix(gridPoints(2, 2), [OFFICE], departure);
    expect(client.calls).toHaveLength(0);
    expect(m.source).toBe('HAVERSINE');
  });

  it('marks the matrix MIXED when Google has no route for some elements', async () => {
    const client = new FakeGoogleClient();
    client.noRoute.add('0|0');
    const adapter = new GoogleTravelTimeMatrixAdapter(client, null, undefined, { now });
    const pts = gridPoints(1, 3);
    const m = await adapter.getMatrix(pts, [OFFICE], departure);
    expect(m.source).toBe('MIXED');
  });

  it('never sends same-cell pairs to Google', async () => {
    const client = new FakeGoogleClient();
    const adapter = new GoogleTravelTimeMatrixAdapter(client, null, undefined, { now });
    const a = { latitude: 17.45, longitude: 78.38 };
    const b = { latitude: 17.4501, longitude: 78.3801 }; // same res-8 cell
    expect(h3.latLngToCell(a.latitude, a.longitude, 8)).toBe(h3.latLngToCell(b.latitude, b.longitude, 8));
    const m = await adapter.getMatrix([a, b], [a, b], departure);
    expect(client.calls).toHaveLength(0);
    expect(m.durationSec[0][1]).toBeLessThan(60);
  });

  it('rolls a past departure forward by whole weeks (same weekday and time) for traffic-aware requests', async () => {
    const client = new FakeGoogleClient();
    const adapter = new GoogleTravelTimeMatrixAdapter(client, null, undefined, { now });
    const past = new Date(2026, 9, 20, 7, 0); // Tuesday, before "now"
    await adapter.getMatrix(gridPoints(1, 2), [OFFICE], past);
    const sent = client.calls[0].departure!;
    expect(sent.getTime()).toBeGreaterThan(now());
    expect(sent.getDay()).toBe(past.getDay());
    expect(hhmm(sent)).toBe('07:00');
    expect(adapter.timeBucket(new Date(2026, 10, 10, 7, 29))).toBe('wd0700');
    expect(adapter.timeBucket(new Date(2026, 10, 10, 7, 31))).toBe('wd0730');
    expect(adapter.timeBucket(new Date(2026, 10, 14, 7, 10))).toBe('we0700'); // Saturday
  });

  it('RedisMatrixCache uses MGET + pipelined SETEX on a live client, get/set otherwise', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const setex = jest.fn();
    const live = {
      getClient: () => ({ mget: jest.fn().mockResolvedValue(['10,100', null]), pipeline: () => ({ setex, exec }) }),
      get: jest.fn(),
      set: jest.fn(),
    };
    const c1 = new RedisMatrixCache(live);
    expect(await c1.mget(['a', 'b'])).toEqual(['10,100', null]);
    await c1.mset([['a', '1,2']], 60);
    expect(setex).toHaveBeenCalledWith('a', 60, '1,2');
    expect(live.get).not.toHaveBeenCalled();

    const offline = { getClient: () => null, get: jest.fn().mockResolvedValue('5,50'), set: jest.fn() };
    const c2 = new RedisMatrixCache(offline);
    expect(await c2.mget(['x'])).toEqual(['5,50']);
    await c2.mset([['x', '1,1']], 30);
    expect(offline.set).toHaveBeenCalledWith('x', '1,1', 30);
  });
});

// ----------------------------------------------------------------------------- service integration

describe('RouteSolverService with an injected travel-time matrix', () => {
  function mockDb(requests: any[]) {
    const db: any = {
      corporateOffice: { findFirst: jest.fn().mockResolvedValue({ id: 'off', ...OFFICE }) },
      corporateTransportRequest: { findMany: jest.fn().mockResolvedValue(requests), update: jest.fn() },
      corporateRoute: { create: jest.fn((a: any) => ({ id: `route-${db.corporateRoute.create.mock.calls.length}`, ...a.data })) },
      corporateRouteStop: { create: jest.fn((a: any) => a.data) },
    };
    db.$transaction = jest.fn((cb: any) => cb(db));
    return db;
  }

  it('persists stop ETAs computed from the matrix and reports the travel-time source', async () => {
    const reqs = linePassengers([1.5, 4.5, 2.5, 3.5]).map((p, i) => ({
      id: p.requestId,
      employeeId: `e${i}`,
      pickupLat: p.latitude,
      pickupLng: p.longitude,
      employee: { gender: 'MALE', officeId: 'off' },
    }));
    const db = mockDb(reqs);
    const svc = new RouteSolverService(db, { log: jest.fn() } as any, new GridPort());
    const summary = await svc.optimizeAndCreateRoutes({
      tenantId: 't',
      officeId: 'off',
      shiftDate: '2026-11-10',
      shiftTime: '08:00',
      direction: 'LOGIN',
    });
    expect(summary.routesCreated).toBe(1);
    expect(summary.travelTimeSource).toBe('GOOGLE');
    expect(db.corporateTransportRequest.findMany.mock.calls[0][0].where.employee).toEqual({ officeId: 'off' });
    const stops = db.corporateRouteStop.create.mock.calls.map((c: any) => c[0].data);
    expect(stops.map((s: any) => hhmm(s.plannedEta))).toEqual(['06:00', '06:25', '06:50', '07:15', '07:50']);
    expect(stops[4].stopType).toBe('DROPOFF');
    const route = db.corporateRoute.create.mock.calls[0][0].data;
    expect(hhmm(route.targetPickup1Time)).toBe('06:00');
    expect(route.estDurationSeconds).toBe(110 * 60);
  });
});

// ----------------------------------------------------------------------------- live smoke

const liveKey = process.env.GOOGLE_MAPS_API_KEY;
(liveKey ? describe : describe.skip)('LIVE Google Routes matrix smoke (GOOGLE_MAPS_API_KEY set)', () => {
  it('returns real traffic-aware durations for 3 Hyderabad points -> office', async () => {
    const adapter = new GoogleTravelTimeMatrixAdapter(new GoogleMapsService(), null);
    const pts = CORRIDORS.slice(0, 3).map((c) => ({ latitude: c.lat, longitude: c.lng }));
    const tomorrow7am = new Date();
    tomorrow7am.setDate(tomorrow7am.getDate() + 1);
    tomorrow7am.setHours(7, 0, 0, 0);
    const m = await adapter.getMatrix(pts, [OFFICE], tomorrow7am);
    expect(['GOOGLE', 'MIXED']).toContain(m.source);
    m.durationSec.forEach((row) => expect(row[0]).toBeGreaterThan(60));
  }, 30_000);
});
