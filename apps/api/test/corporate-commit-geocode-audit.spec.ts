import { BadRequestException, ConflictException } from '@nestjs/common';
import { CorporateRoutePlannerService } from '../src/domains/corporate/routing/corporate-route-planner.service';
import { GoogleGeocodingAdapter } from '../src/domains/corporate/routing/google-geocoding.adapter';
import { CorporateRoutingController } from '../src/domains/corporate/routing/corporate-routing.controller';
import { CorporateOnboardingService } from '../src/domains/corporate/tenants/corporate-onboarding.service';
import { normalizeIndianPhone } from '../src/common/utils/uniqueness.util';

/** 2026-11-11 audit regressions: commit integrity (A1-A8), geocoding (B1-B3), OTP exposure (D1), onboarding (E1-E5). */

const TENANT = 'tenant-1';
const OFFICE = { id: 'office-1', tenantId: TENANT, name: 'HQ', addressText: 'Mindspace, Hyderabad', latitude: 17.4435, longitude: 78.3772 };

function makeDb(opts: { liveClash?: boolean; employees?: any[] } = {}) {
  const created = { routes: [] as any[], stops: [] as any[], employees: [...(opts.employees ?? [])] };
  const db: any = {
    corporateOffice: {
      findUnique: jest.fn(async ({ where }: any) => (where.id === OFFICE.id ? OFFICE : { ...OFFICE, id: where.id, tenantId: 'other-tenant' })),
    },
    corporateTenantPolicy: { findFirst: jest.fn(async () => ({ stopDwellMinutes: 10, defaultCapacity: 4, defaultVehicleCategory: 'SEDAN' })) },
    corporateEmployee: {
      findFirst: jest.fn(async ({ where }: any) => {
        return (
          created.employees.find(
            (e) =>
              e.tenantId === where.tenantId &&
              ((where.employeeCode && e.employeeCode === where.employeeCode) ||
                (where.phoneNumber?.in && where.phoneNumber.in.includes(e.phoneNumber)) ||
                (where.id && e.id === where.id)),
          ) ?? null
        );
      }),
      create: jest.fn(async ({ data }: any) => {
        const e = { id: `emp-${created.employees.length + 1}`, ...data };
        created.employees.push(e);
        return e;
      }),
    },
    corporateEmployeeLocation: { create: jest.fn(async ({ data }: any) => data) },
    corporateRoute: {
      create: jest.fn(async ({ data }: any) => {
        const r = { id: `route-${created.routes.length + 1}`, ...data };
        created.routes.push(r);
        return r;
      }),
    },
    corporateRouteStop: {
      create: jest.fn(async ({ data }: any) => {
        created.stops.push(data);
        return data;
      }),
      findFirst: jest.fn(async () => (opts.liveClash ? { routeId: 'route-existing' } : null)),
    },
    $transaction: jest.fn(async (fn: any, txOpts?: any) => {
      db.lastTxOptions = txOpts;
      return fn(db);
    }),
  };
  return { db, created };
}

const stop = (name: string, extra: Record<string, any> = {}) => ({
  sequence: 1,
  name,
  address: `${name} home`,
  matchedAddress: `${name} home`,
  lat: 17.49,
  lng: 78.39,
  eta: '7:00 AM',
  etaIso: '2026-11-20T01:30:00.000Z',
  dwellUntil: '7:10 AM',
  dwellSeconds: 600,
  nextStop: 'HQ',
  travelToNextMinutes: 20,
  distanceToNextKm: 8,
  arrivalAtNext: '7:30 AM',
  officeDistanceKm: 8,
  outOfRadius: false,
  boardingOtp: '1234',
  ...extra,
});

const plan = (stops: any[], extra: Record<string, any> = {}) =>
  ({
    office: { name: 'HQ', lat: OFFICE.latitude, lng: OFFICE.longitude },
    routes: [
      {
        cab: 1,
        office: { name: 'HQ', lat: OFFICE.latitude, lng: OFFICE.longitude },
        requiredArrivalDateTime: '2026-11-20T03:30:00.000Z',
        departureDateTime: '2026-11-20T01:30:00.000Z',
        cabType: 'sedan',
        distanceKm: 12,
        driveMinutes: 40,
        stops,
        ...extra,
      },
    ],
  }) as any;

const commitDto = (p: any, extra: Record<string, any> = {}) => ({
  tenantId: TENANT,
  officeId: OFFICE.id,
  shiftDate: '2026-11-20',
  shiftTime: '09:00',
  direction: 'LOGIN' as const,
  includeMetadata: true,
  plan: p,
  ...extra,
});

describe('2026-11-11 audit: route commit integrity', () => {
  it('generates server-side OTPs (never the client value / a constant) and a long transaction timeout', async () => {
    const { db, created } = makeDb();
    const svc = new CorporateRoutePlannerService({} as any, {} as any, db);
    await svc.commitPlanToDatabase(commitDto(plan([stop('A', { phoneNumber: '9800011101' }), stop('B', { phoneNumber: '9800011102' })])));
    const pickups = created.stops.filter((s) => s.stopType === 'PICKUP');
    expect(pickups).toHaveLength(2);
    for (const s of pickups) expect(s.boardingOtp).toMatch(/^\d{4}$/);
    expect(pickups.every((s) => s.boardingOtp === '1234')).toBe(false);
    expect(created.stops.find((s) => s.stopType === 'DROPOFF')?.boardingOtp).toBe('------');
    expect(pickups[0].employeePhone).toBe('+919800011101');
    expect(db.lastTxOptions?.timeout).toBeGreaterThanOrEqual(60_000);
  });

  it('rejects an office that belongs to another company', async () => {
    const { db } = makeDb();
    const svc = new CorporateRoutePlannerService({} as any, {} as any, db);
    await expect(svc.commitPlanToDatabase(commitDto(plan([stop('A')]), { officeId: 'office-of-b' }))).rejects.toThrow(
      'does not belong',
    );
  });

  it('rejects a plan optimized to a different office location (> 2 km)', async () => {
    const { db } = makeDb();
    const svc = new CorporateRoutePlannerService({} as any, {} as any, db);
    const far = plan([stop('A')]);
    far.routes[0].office = { name: 'HQ', lat: 17.3, lng: 78.5 };
    far.office = far.routes[0].office;
    await expect(svc.commitPlanToDatabase(commitDto(far))).rejects.toThrow(BadRequestException);
  });

  it('refuses to put an employee who is already on a live route of the same shift date into a second cab', async () => {
    const { db } = makeDb({ liveClash: true });
    const svc = new CorporateRoutePlannerService({} as any, {} as any, db);
    await expect(svc.commitPlanToDatabase(commitDto(plan([stop('A', { employeeCode: 'E1' })])))).rejects.toThrow(
      ConflictException,
    );
  });

  it('never links a stop to a different employee who merely shares the name', async () => {
    const { db, created } = makeDb({
      employees: [{ id: 'emp-existing', tenantId: TENANT, employeeCode: 'E9', fullName: 'Rahul Kumar', phoneNumber: '+919811111111' }],
    });
    const svc = new CorporateRoutePlannerService({} as any, {} as any, db);
    await svc.commitPlanToDatabase(commitDto(plan([stop('Rahul Kumar', { employeeCode: 'E1', phoneNumber: '9822222222' })])));
    const pickup = created.stops.find((s) => s.stopType === 'PICKUP');
    expect(pickup.employeeId).not.toBe('emp-existing');
  });

  it('links by phone in any Indian format', async () => {
    const { db, created } = makeDb({
      employees: [{ id: 'emp-existing', tenantId: TENANT, employeeCode: 'E9', fullName: 'R K', phoneNumber: '+919811111111' }],
    });
    const svc = new CorporateRoutePlannerService({} as any, {} as any, db);
    await svc.commitPlanToDatabase(commitDto(plan([stop('Rahul', { phoneNumber: '09811111111' })])));
    expect(created.stops.find((s) => s.stopType === 'PICKUP').employeeId).toBe('emp-existing');
  });

  it('LOGOUT commits office PICKUP first, employee DROPOFFs after, pickup-1 = office departure', async () => {
    const { db, created } = makeDb();
    const svc = new CorporateRoutePlannerService({} as any, {} as any, db);
    const p = plan([stop('A', { etaIso: '2026-11-20T13:00:00.000Z' }), stop('B', { etaIso: '2026-11-20T13:20:00.000Z' })], {
      direction: 'LOGOUT',
      departureDateTime: '2026-11-20T12:30:00.000Z',
      requiredArrivalDateTime: '2026-11-20T12:30:00.000Z',
    });
    await svc.commitPlanToDatabase(commitDto(p, { direction: 'LOGOUT', shiftTime: '18:00' }));
    const ordered = [...created.stops].sort((a, b) => a.stopSequence - b.stopSequence);
    expect(ordered.map((s) => s.stopType)).toEqual(['PICKUP', 'DROPOFF', 'DROPOFF']);
    expect(ordered[0].employeeName).toBeUndefined();
    expect(created.routes[0].targetPickup1Time.toISOString()).toBe('2026-11-20T12:30:00.000Z');
    expect(created.routes[0].shiftTime).toBe('18:00');
  });

  it('rejects committing a LOGIN-optimized route as LOGOUT', async () => {
    const { db } = makeDb();
    const svc = new CorporateRoutePlannerService({} as any, {} as any, db);
    await expect(
      svc.commitPlanToDatabase(commitDto(plan([stop('A')], { direction: 'LOGIN' }), { direction: 'LOGOUT' })),
    ).rejects.toThrow('optimized for LOGIN');
  });

  it('upgrades a 5-seat sedan plan to SUV and refuses more than 6', async () => {
    const { db, created } = makeDb();
    const svc = new CorporateRoutePlannerService({} as any, {} as any, db);
    const five = ['A', 'B', 'C', 'D', 'E'].map((n, i) => stop(n, { employeeCode: `C${i}` }));
    await svc.commitPlanToDatabase(commitDto(plan(five)));
    expect(created.routes[0].vehicleCategory).toBe('SUV');
    expect(created.routes[0].maxCapacity).toBe(6);
    const seven = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((n, i) => stop(n, { employeeCode: `S${i}` }));
    await expect(svc.commitPlanToDatabase(commitDto(plan(seven)))).rejects.toThrow('seats');
  });

  it('IST fallback when the plan has no ISO times (never midnight UTC)', async () => {
    const { db, created } = makeDb();
    const svc = new CorporateRoutePlannerService({} as any, {} as any, db);
    const p = plan([stop('A', { etaIso: undefined, eta: '7:00 AM' })], { departureDateTime: undefined, requiredArrivalDateTime: undefined });
    await svc.commitPlanToDatabase(commitDto(p));
    expect(created.routes[0].targetOfficeArrivalTime.toISOString()).toBe('2026-11-20T03:30:00.000Z'); // 09:00 IST
    expect(created.routes[0].targetPickup1Time.toISOString()).toBe('2026-11-20T01:30:00.000Z'); // 07:00 IST
  });
});

describe('2026-11-11 audit: roster parsing', () => {
  const svc = new CorporateRoutePlannerService({} as any, {} as any, {} as any) as any;

  it('keeps two different employees who share a common name; drops a duplicated employee code', () => {
    const csv = [
      'employee_code,employee_name,pickup_address,latitude,longitude',
      'E1,Rahul Kumar,Kondapur,17.46,78.35',
      'E2,Rahul Kumar,Kukatpally,17.49,78.39',
      'E3,Priya,Madhapur,,',
      'E3,Priya S,Madhapur 2,,',
    ].join('\n');
    const parsed = svc.parseCsv(Buffer.from(csv));
    expect(parsed.rows.map((r: any) => r.employeeCode)).toEqual(['E1', 'E2']);
    expect(parsed.rows[0]).toMatchObject({ latitude: 17.46, longitude: 78.35 });
    expect(parsed.duplicateEmployeeNames).toEqual(['Priya']);
  });

  it('rejects half-filled or out-of-range coordinates', () => {
    const csv = ['employee_name,pickup_address,latitude,longitude', 'A,Addr,17.4,'].join('\n');
    expect(() => svc.parseCsv(Buffer.from(csv))).toThrow('invalid latitude/longitude');
    const csv2 = ['employee_name,pickup_address,lat,lng', 'A,Addr,117.4,78'].join('\n');
    expect(() => svc.parseCsv(Buffer.from(csv2))).toThrow('invalid latitude/longitude');
  });
});

describe('2026-11-11 audit: geocoding', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });
  const redis: any = { get: jest.fn(async () => null), set: jest.fn(async () => 'OK') };

  it('production without a key fails instead of inventing coordinates', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CORPORATE_GEOCODE_FALLBACK;
    process.env.GOOGLE_MAPS_API_KEY = '';
    const adapter = new GoogleGeocodingAdapter(redis);
    await expect(adapter.geocode('Plot 7, Hitec City')).rejects.toThrow('GOOGLE_MAPS_API_KEY');
  });

  it('fallback is opt-in in production and never cached', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CORPORATE_GEOCODE_FALLBACK = 'true';
    process.env.GOOGLE_MAPS_API_KEY = '';
    const adapter = new GoogleGeocodingAdapter(redis);
    const r = await adapter.geocode('Plot 7, Hitec City');
    expect(r.isRealGeocode).toBe(false);
    expect((adapter as any).memoryCache.size).toBe(0);
  });

  it('cache key covers the full address (long shared prefixes do not collide)', () => {
    const base = 'Prestige Shantiniketan, Whitefield Main Road, Bengaluru, Tower 3, Flat ';
    expect(GoogleGeocodingAdapter.cacheKey(`${base}101`)).not.toBe(GoogleGeocodingAdapter.cacheKey(`${base}102`));
  });
});

describe('2026-11-11 audit: boarding OTP visibility on GET /corporate/routes/:id', () => {
  const routeRow = {
    id: 'r1',
    office: OFFICE,
    stops: [{ id: 's1', stopSequence: 1, stopType: 'PICKUP', boardingOtp: '4821', employeeName: 'A', addressText: 'x' }],
  };
  const db: any = { corporateRoute: { findUnique: jest.fn(async () => routeRow) } };
  const controller = new CorporateRoutingController({} as any, db);

  it.each([
    ['DRIVER', false],
    ['CORPORATE_ADMIN', false],
    ['OPS', true],
    ['ADMIN', true],
  ])('%s sees OTP: %s', async (role, visible) => {
    const res: any = await controller.getRouteById('r1', undefined, { user: { role } });
    expect('boardingOtp' in res.stops[0]).toBe(visible);
  });
});

describe('2026-11-11 audit: onboarding', () => {
  const geocoding: any = { geocode: jest.fn() };
  const svc = new CorporateOnboardingService({} as any, { log: jest.fn() } as any, { latLngToCell: () => 'h3' } as any, geocoding);
  const dto = (over: Record<string, any> = {}) =>
    ({
      code: 'ACME',
      name: 'Acme',
      legalEntityName: 'Acme Pvt Ltd',
      office: { code: 'HQ', name: 'Acme HQ', addressText: 'Hitec City, Hyderabad', latitude: 17.44, longitude: 78.38 },
      adminUser: { fullName: 'Asha Rao', email: 'asha@acme.test', phone: '9876543210', password: 'short7!' },
      ...over,
    }) as any;

  it('requires an 8-character portal password', async () => {
    await expect(svc.onboardCompany(dto())).rejects.toThrow('at least 8');
  });

  it('rejects a capacity beyond the vehicle category', async () => {
    await expect(
      svc.onboardCompany(dto({ adminUser: { ...dto().adminUser, password: 'longenough1' }, policy: { defaultVehicleCategory: 'SEDAN', defaultCapacity: 6 } })),
    ).rejects.toThrow('exceeds');
  });

  it('turns a failed office geocode into a 400 with guidance', async () => {
    geocoding.geocode.mockRejectedValueOnce(new Error('ZERO_RESULTS'));
    const d = dto({ adminUser: { ...dto().adminUser, password: 'longenough1' } });
    delete d.office.latitude;
    delete d.office.longitude;
    await expect(svc.onboardCompany(d)).rejects.toThrow('latitude/longitude manually');
  });

  it('normalizes Indian phones to E.164', () => {
    expect(normalizeIndianPhone('98765 43210'.replace(' ', ''))).toBe('+919876543210');
    expect(normalizeIndianPhone('09876543210')).toBe('+919876543210');
    expect(normalizeIndianPhone('919876543210')).toBe('+919876543210');
  });
});

describe('2026-11-11 audit: LOGOUT solver', () => {
  it('departs the office at logout time and drops nearest-first', async () => {
    const { solveLogoutCabRoute } = await import('../src/domains/corporate/routing/cvrptw-cluster-solver');
    const office = { lat: 17.4435, lng: 78.3772 };
    const emp = (name: string, lat: number, km: number) => ({
      employeeName: name, pickupAddress: name, coord: { lat, lng: 78.3772 }, matchedAddress: name, officeDistanceKm: km, outOfRadius: false,
    });
    const adapter: any = {
      computeRoute: jest.fn(async (origin: any, mids: any[], dest: any) => ({
        durationSeconds: 1800, distanceMeters: 15000, distanceKm: 15, isRealRoad: true, decodedPath: [],
        legs: [{ durationSeconds: 600, distanceMeters: 5000 }, { durationSeconds: 1200, distanceMeters: 10000 }],
        _args: { origin, mids, dest },
      })),
    };
    const logout = new Date('2026-11-20T12:30:00.000Z');
    const r = await solveLogoutCabRoute(1, [emp('Far', 17.58, 15), emp('Near', 17.49, 5)], 'HQ', office,
      { loginTime: logout, bufferMinutes: 0, pickupWaitMinutes: 10, cabCapacity: 4, officeRadiusKm: 50 }, adapter);
    expect(adapter.computeRoute.mock.calls[0][0]).toEqual(office);
    expect(r.direction).toBe('LOGOUT');
    expect(r.departureDateTime).toBe(logout.toISOString());
    expect(r.stops.map((s) => s.name)).toEqual(['Near', 'Far']);
    expect(new Date(r.stops[0].etaIso!).getTime()).toBe(logout.getTime() + 600_000);
  });
});
