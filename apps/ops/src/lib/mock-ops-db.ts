import type {
  CorporateRouteItem,
  CorporateTenantOption,
  OperationsAnalyticsDashboard,
  OpsBoardResponse,
  SosAlertItem,
} from './api/opsTypes';

const STORAGE_KEY = 'adhocx_ops_mock_database_v1';
const STATUS_KEYS = ['PLANNED', 'DISPATCHING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'] as const;
type RouteStatus = (typeof STATUS_KEYS)[number];

export interface MockOpsDatabase {
  version: 1;
  refreshedAt: string;
  refreshCount: number;
  tenants: CorporateTenantOption[];
  routes: CorporateRouteItem[];
  alerts: SosAlertItem[];
  owners: Record<string, string>;
}

export interface MockDashboardSnapshot {
  database: MockOpsDatabase;
  tenants: CorporateTenantOption[];
  board: OpsBoardResponse;
  alerts: SosAlertItem[];
}

const TENANTS: CorporateTenantOption[] = [
  { id: 'mock-tenant-northstar', code: 'NSTAR', name: 'Northstar Technologies', status: 'ACTIVE', activeShiftsCount: 4, activeCabsCount: 5, inTransitCount: 18, onTimePunctualityPct: 94.2, delayedCount: 1, unassignedCount: 2 },
  { id: 'mock-tenant-bluepeak', code: 'BPEAK', name: 'Bluepeak Systems', status: 'ACTIVE', activeShiftsCount: 3, activeCabsCount: 4, inTransitCount: 13, onTimePunctualityPct: 97.1, delayedCount: 0, unassignedCount: 1 },
  { id: 'mock-tenant-greenline', code: 'GREEN', name: 'Greenline Services', status: 'ACTIVE', activeShiftsCount: 2, activeCabsCount: 3, inTransitCount: 9, onTimePunctualityPct: 91.8, delayedCount: 2, unassignedCount: 0 },
];

const DRIVERS = [
  { id: 'mock-driver-101', fullName: 'Arjun Rao', phone: '+919876500101' },
  { id: 'mock-driver-102', fullName: 'Meera Nair', phone: '+919876500102' },
  { id: 'mock-driver-103', fullName: 'Vikram Shah', phone: '+919876500103' },
  { id: 'mock-driver-104', fullName: 'Ananya Iyer', phone: '+919876500104' },
  { id: 'mock-driver-105', fullName: 'Rohan Das', phone: '+919876500105' },
  { id: 'mock-driver-106', fullName: 'Kavya Menon', phone: '+919876500106' },
  { id: 'mock-driver-107', fullName: 'Dev Patel', phone: '+919876500107' },
  { id: 'mock-driver-108', fullName: 'Sana Khan', phone: '+919876500108' },
  { id: 'mock-driver-109', fullName: 'Ishaan Reddy', phone: '+919876500109' },
];

const VEHICLES = [
  { id: 'mock-vehicle-201', registrationNumber: 'KA03MN1201', model: 'Maruti Dzire' },
  { id: 'mock-vehicle-202', registrationNumber: 'KA03MN1202', model: 'Hyundai Aura' },
  { id: 'mock-vehicle-203', registrationNumber: 'KA03MN1203', model: 'Maruti Ertiga' },
  { id: 'mock-vehicle-204', registrationNumber: 'KA03MN1204', model: 'Toyota Innova' },
  { id: 'mock-vehicle-205', registrationNumber: 'TS09MN1205', model: 'Maruti Dzire' },
  { id: 'mock-vehicle-206', registrationNumber: 'TS09MN1206', model: 'Hyundai Aura' },
  { id: 'mock-vehicle-207', registrationNumber: 'TS09MN1207', model: 'Maruti Ertiga' },
  { id: 'mock-vehicle-208', registrationNumber: 'MH12MN1208', model: 'Toyota Innova' },
  { id: 'mock-vehicle-209', registrationNumber: 'MH12MN1209', model: 'Maruti Dzire' },
];

const OFFICES = [
  { id: 'mock-office-blr', code: 'BLR', name: 'Bengaluru Tech Park' },
  { id: 'mock-office-hyd', code: 'HYD', name: 'Hyderabad Knowledge City' },
  { id: 'mock-office-pun', code: 'PUN', name: 'Pune Business District' },
];

const PASSENGERS = [
  ['Priya Sharma', 'EMP-1001'],
  ['Rahul Verma', 'EMP-1002'],
  ['Nisha Reddy', 'EMP-1003'],
  ['Kabir Joshi', 'EMP-1004'],
  ['Aarav Kulkarni', 'EMP-1005'],
  ['Ira Desai', 'EMP-1006'],
];

const now = () => new Date();
const todayIst = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const isoMinutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const stableId = (prefix: string, value: string) => `${prefix}-${value}`;

function makeRoute(index: number, status: RouteStatus): CorporateRouteItem {
  const tenant = TENANTS[index % TENANTS.length];
  const driver = status === 'PLANNED' || (status === 'DISPATCHING' && index % 2 === 0)
    ? undefined
    : DRIVERS[index % DRIVERS.length];
  const vehicle = driver ? VEHICLES[index % VEHICLES.length] : undefined;
  const office = OFFICES[index % OFFICES.length];
  const passengerCount = status === 'PLANNED' ? 0 : 2 + (index % 4);
  const lat = 12.92 + index * 0.035;
  const lng = 77.58 + index * 0.045;
  const gpsFreshness = index === 4 ? 'STALE' : index === 8 ? 'OFFLINE' : 'LIVE';
  const routeId = stableId('mock-route', String(index + 1).padStart(3, '0'));
  const shiftTime = index % 2 === 0 ? '08:00' : '18:00';
  const shiftDate = todayIst();
  const pickup = new Date(`${shiftDate}T${shiftTime}:00+05:30`).toISOString();
  const eta = new Date(new Date(pickup).getTime() + 75 * 60_000).toISOString();
  const stops = Array.from({ length: Math.max(2, passengerCount) }, (_, stopIndex) => {
    const [fullName, employeeCode] = PASSENGERS[(index + stopIndex) % PASSENGERS.length];
    const stopStatus = status === 'COMPLETED'
      ? 'BOARDED'
      : status === 'IN_TRANSIT' && stopIndex < Math.max(1, passengerCount - 1)
        ? 'BOARDED'
        : 'PENDING';
    return {
      id: `${routeId}-stop-${stopIndex + 1}`,
      stopSequence: stopIndex + 1,
      stopType: 'PICKUP' as const,
      latitude: lat + stopIndex * 0.003,
      longitude: lng + stopIndex * 0.003,
      addressText: `${['Indiranagar', 'Koramangala', 'Whitefield', 'Madhapur', 'Hinjewadi'][index % 5]} pickup point ${stopIndex + 1}`,
      plannedEta: new Date(new Date(pickup).getTime() + stopIndex * 8 * 60_000).toISOString(),
      dwellBufferSeconds: 300,
      status: stopStatus as 'PENDING' | 'BOARDED',
      employee: {
        id: `${routeId}-employee-${stopIndex + 1}`,
        employeeCode,
        fullName,
        gender: 'UNSPECIFIED',
        phoneNumber: `+919876501${String(index * 10 + stopIndex).padStart(2, '0')}`,
        department: ['Engineering', 'Finance', 'Operations'][stopIndex % 3],
      },
    };
  });
  const delayMinutes = index === 3 ? 18 : index === 7 ? 11 : 0;
  const ageSeconds = index === 4 ? 640 : index === 8 ? null : 25 + index * 4;

  return {
    id: routeId,
    tenantId: tenant.id,
    officeId: office.id,
    shiftDate,
    shiftTime,
    direction: index % 2 === 0 ? 'LOGIN' : 'LOGOUT',
    vehicleCategory: 'Unassigned',
    maxCapacity: passengerCount,
    assignedPassengerCount: passengerCount,
    targetPickup1Time: pickup,
    targetOfficeArrivalTime: eta,
    estDistanceMeters: 12_500 + index * 850,
    estDurationSeconds: 3_900 + index * 120,
    status,
    driverId: driver?.id,
    vehicleId: vehicle?.id,
    driver,
    vehicle,
    office,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    stops,
    _count: { stops: stops.length },
    gps: {
      latitude: lat,
      longitude: lng,
      heading: (index * 37) % 360,
      speedMps: status === 'IN_TRANSIT' ? 8 + (index % 5) : 0,
      lastSeenAt: ageSeconds === null ? null : isoMinutesAgo(Math.floor(ageSeconds / 60)).toString(),
      ageSeconds,
      freshness: gpsFreshness,
    },
    isAtRisk: delayMinutes > 10 || status === 'DISPATCHING' && !driver,
    delayMinutes,
  };
}

function createSeed(): MockOpsDatabase {
  const statuses: RouteStatus[] = [
    'PLANNED', 'PLANNED', 'DISPATCHING', 'DISPATCHING',
    'ASSIGNED', 'ASSIGNED', 'IN_TRANSIT', 'IN_TRANSIT', 'IN_TRANSIT',
    'COMPLETED', 'COMPLETED', 'CANCELLED',
  ];
  return {
    version: 1,
    refreshedAt: now().toISOString(),
    refreshCount: 0,
    tenants: TENANTS.map((tenant) => ({ ...tenant })),
    routes: statuses.map((status, index) => makeRoute(index, status)),
    alerts: [
      {
        id: 'mock-sos-001',
        routeId: 'mock-route-007',
        status: 'NEW',
        severity: 'CRITICAL_P0',
        triggerType: 'PANIC_BUTTON',
        locationLat: 13.13,
        locationLng: 77.85,
        addressText: 'Whitefield Main Road, Bengaluru',
        createdAt: isoMinutesAgo(7),
        riderName: 'Nisha Reddy',
        riderPhone: '+919876501234',
        driverName: 'Dev Patel',
        driverPhone: DRIVERS[6].phone,
        vehiclePlate: VEHICLES[6].registrationNumber,
        tenantName: TENANTS[0].name,
      },
      {
        id: 'mock-sos-002',
        routeId: 'mock-route-009',
        status: 'ACKNOWLEDGED',
        severity: 'HIGH_P1',
        triggerType: 'ROUTE_DEVIATION',
        locationLat: 13.20,
        locationLng: 77.94,
        addressText: 'Outer Ring Road, Bengaluru',
        createdAt: isoMinutesAgo(22),
        acknowledgedAt: isoMinutesAgo(17),
        riderName: 'Kabir Joshi',
        driverName: 'Ishaan Reddy',
        driverPhone: DRIVERS[8].phone,
        vehiclePlate: VEHICLES[8].registrationNumber,
        tenantName: TENANTS[2].name,
      },
    ],
    owners: {},
  };
}

function parseDatabase(raw: string): MockOpsDatabase {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Mock operations database is invalid.');
  const database = value as MockOpsDatabase;
  if (database.version !== 1 || !Array.isArray(database.routes) || !Array.isArray(database.tenants) || !Array.isArray(database.alerts)) {
    throw new Error('Mock operations database has an unsupported format. Clear the mock dashboard data to reseed it.');
  }
  return database;
}

function writeDatabase(database: MockOpsDatabase): MockOpsDatabase {
  if (typeof window === 'undefined') return database;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  window.dispatchEvent(new CustomEvent('adhocx-mock-db-updated', { detail: database.refreshedAt }));
  return database;
}

export function readMockDatabase(): MockOpsDatabase {
  if (typeof window === 'undefined') return createSeed();
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) return parseDatabase(raw);
  return writeDatabase(createSeed());
}

export function refreshMockDatabase(): MockOpsDatabase {
  const database = readMockDatabase();
  const stage = (['PLANNED', 'DISPATCHING', 'ASSIGNED', 'IN_TRANSIT'] as const)[database.refreshCount % 4];
  const candidate = database.routes.find((route) => route.status === stage);
  const recycle = stage === 'PLANNED' && !candidate
    ? database.routes.find((route) => route.status === 'COMPLETED')
    : undefined;
  const progressingRouteId = candidate?.id ?? recycle?.id;
  const refreshed = {
    ...database,
    refreshCount: database.refreshCount + 1,
    refreshedAt: now().toISOString(),
    routes: database.routes.map((route, index) => {
      const updated = { ...route, gps: route.gps ? { ...route.gps } : route.gps };
      if (updated.status === 'IN_TRANSIT' && updated.gps) {
        const nextAge = Math.max(4, (updated.gps.ageSeconds ?? 60) - 25);
        updated.gps.ageSeconds = nextAge;
        updated.gps.lastSeenAt = isoMinutesAgo(Math.floor(nextAge / 60));
        updated.gps.latitude = (updated.gps.latitude ?? 0) + 0.0007;
        updated.gps.longitude = (updated.gps.longitude ?? 0) + 0.0011;
        if (nextAge < 180) updated.gps.freshness = 'LIVE';
      }
      if (updated.id === progressingRouteId && updated.status === 'COMPLETED') {
        updated.status = 'PLANNED';
        updated.driver = undefined;
        updated.driverId = undefined;
        updated.vehicle = undefined;
        updated.vehicleId = undefined;
        updated.assignedPassengerCount = 0;
        updated.stops = updated.stops?.map((stop) => ({ ...stop, status: 'PENDING' }));
        updated.gps = null;
        updated.isAtRisk = false;
        return updated;
      }
      if (updated.id === progressingRouteId) {
        if (updated.status === 'PLANNED') updated.status = 'DISPATCHING';
        else if (updated.status === 'DISPATCHING') {
          updated.status = 'ASSIGNED';
          updated.driver = DRIVERS[index % DRIVERS.length];
          updated.driverId = updated.driver.id;
          updated.vehicle = VEHICLES[index % VEHICLES.length];
          updated.vehicleId = updated.vehicle.id;
          updated.assignedPassengerCount = Math.max(1, updated.assignedPassengerCount);
        } else if (updated.status === 'ASSIGNED') updated.status = 'IN_TRANSIT';
        else if (updated.status === 'IN_TRANSIT') updated.status = 'COMPLETED';
      }
      return updated;
    }),
    tenants: database.tenants.map((tenant, index) => ({
      ...tenant,
      activeCabsCount: 3 + ((database.refreshCount + index) % 4),
      inTransitCount: 6 + ((database.refreshCount * 2 + index * 3) % 20),
      delayedCount: (database.refreshCount + index) % 4,
    })),
    alerts: database.alerts.map((alert) => ({
      ...alert,
      createdAt: alert.status === 'NEW' ? alert.createdAt : alert.createdAt,
    })),
  };
  return writeDatabase(refreshed);
}

export function updateMockRoute(routeId: string, action: 'assign' | 'reassign'): MockOpsDatabase {
  const database = readMockDatabase();
  const target = database.routes.find((route) => route.id === routeId);
  if (!target) throw new Error(`Mock route ${routeId} was not found.`);
  const index = Number(routeId.slice(routeId.lastIndexOf('-') + 1)) - 1;
  const driver = DRIVERS[(index + database.refreshCount + (action === 'reassign' ? 1 : 0)) % DRIVERS.length];
  const vehicle = VEHICLES[(index + database.refreshCount + (action === 'reassign' ? 1 : 0)) % VEHICLES.length];
  return writeDatabase({
    ...database,
    refreshedAt: now().toISOString(),
    routes: database.routes.map((route) => route.id === routeId
      ? { ...route, status: 'ASSIGNED', driver, driverId: driver.id, vehicle, vehicleId: vehicle.id, gps: route.gps ? { ...route.gps, freshness: 'LIVE', ageSeconds: 12, lastSeenAt: now().toISOString() } : route.gps }
      : route),
  });
}

export function updateMockAlert(alertId: string, action: 'acknowledge' | 'escalate'): MockOpsDatabase {
  const database = readMockDatabase();
  const found = database.alerts.some((alert) => alert.id === alertId);
  if (!found) throw new Error(`Mock safety alert ${alertId} was not found.`);
  const timestamp = now().toISOString();
  return writeDatabase({
    ...database,
    refreshedAt: timestamp,
    alerts: database.alerts.map((alert) => alert.id !== alertId ? alert : {
      ...alert,
      status: action === 'acknowledge' ? 'ACKNOWLEDGED' : 'ESCALATED',
      ...(action === 'acknowledge' ? { acknowledgedAt: timestamp } : { escalatedAt: timestamp }),
    }),
  });
}

export function claimMockException(exceptionId: string, owner: string): MockOpsDatabase {
  const database = readMockDatabase();
  return writeDatabase({
    ...database,
    refreshedAt: now().toISOString(),
    owners: { ...database.owners, [exceptionId]: owner },
  });
}

export function buildMockBoard(database: MockOpsDatabase, date = todayIst(), tenantId?: string): OpsBoardResponse {
  const scoped = database.routes.filter((route) =>
    (!tenantId || route.tenantId === tenantId) && (!date || route.shiftDate === date),
  );
  const grouped = Object.fromEntries(STATUS_KEYS.map((status) => {
    const items = scoped.filter((route) => route.status === status);
    return [status, { total: items.length, items, hasMore: false }];
  })) as OpsBoardResponse['routes'];
  const active = scoped.filter((route) => route.status === 'IN_TRANSIT');
  const staleGps = active.filter((route) => route.gps?.freshness !== 'LIVE');
  const atRisk = scoped.filter((route) => route.isAtRisk || route.status === 'DISPATCHING' && !route.driverId)
    .map((route) => ({ ...route, minutesToPickup: Math.round((new Date(route.targetPickup1Time).getTime() - Date.now()) / 60_000), reason: 'MOCK_AT_RISK' }));
  const counts = Object.fromEntries(STATUS_KEYS.map((status) => [status, grouped[status].total])) as Record<RouteStatus, number>;
  return {
    asOf: database.refreshedAt,
    date,
    timezone: 'Asia/Kolkata',
    filter: { tenantId: tenantId ?? null, officeId: null },
    page: 1,
    pageSize: 200,
    counts: { ...counts, total: scoped.length, atRisk: atRisk.length },
    routes: grouped,
    atRisk: { leadMinutes: 30, items: atRisk },
    staleGps: {
      summary: {
        LIVE: active.length - staleGps.length,
        STALE: staleGps.filter((route) => route.gps?.freshness === 'STALE').length,
        OFFLINE: staleGps.filter((route) => route.gps?.freshness === 'OFFLINE').length,
      },
      items: staleGps,
    },
  };
}

export function readMockDashboard(date = todayIst(), tenantId?: string): MockDashboardSnapshot {
  const database = readMockDatabase();
  return {
    database,
    tenants: database.tenants,
    board: buildMockBoard(database, date, tenantId),
    alerts: database.alerts,
  };
}

export function buildMockAnalytics(
  database: MockOpsDatabase,
  options: { tenantId?: string; from: string; to: string; shiftTime?: string },
): OperationsAnalyticsDashboard {
  const matches = database.routes.filter((route) =>
    (!options.tenantId || route.tenantId === options.tenantId) &&
    (!options.shiftTime || route.shiftTime === options.shiftTime),
  );
  const byStatus: Record<string, number> = Object.fromEntries(STATUS_KEYS.map((status) => [status, matches.filter((route) => route.status === status).length]));
  const total = STATUS_KEYS.reduce((sum, status) => sum + byStatus[status], 0);
  const completed = byStatus.COMPLETED;
  const completedRoutes = matches.filter((route) => route.status === 'COMPLETED');
  const assignedSeats = completedRoutes.reduce((sum, route) => sum + route.assignedPassengerCount, 0);
  const capacitySeats = completedRoutes.reduce((sum, route) => sum + route.maxCapacity, 0);
  const completedEmployees = completedRoutes.reduce((sum, route) => sum + (route.stops ?? []).filter((stop) => stop.status === 'BOARDED').length, 0);
  const dailyTrips: OperationsAnalyticsDashboard['dailyTrips'] = [];
  const fromDate = new Date(`${options.from}T00:00:00`);
  const toDate = new Date(`${options.to}T00:00:00`);
  const days = Math.min(31, Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1));
  for (let day = 0; day < days; day += 1) {
    const date = new Date(fromDate.getTime() + day * 86_400_000).toISOString().slice(0, 10);
    const isCurrentDay = date === todayIst();
    const seed = date.split('-').reduce((value, part) => value + Number(part), 0);
    const tenantFactor = options.tenantId ? (TENANTS.findIndex((tenant) => tenant.id === options.tenantId) + 1) : 3;
    const scheduled = isCurrentDay
      ? matches.filter((route) => route.shiftDate === date && route.status !== 'CANCELLED').length
      : Math.max(4, tenantFactor * 3 + seed % 7 + (options.shiftTime ? 1 : 4));
    const completionRate = Math.min(0.96, 0.72 + ((seed + database.refreshCount) % 20) / 100);
    dailyTrips.push({ date, scheduled, completed: isCurrentDay ? completed : Math.round(scheduled * completionRate) });
  }
  const measuredStops = Math.max(1, completedEmployees + 2);
  const onTimePickups = Math.min(measuredStops, Math.max(0, measuredStops - 2 - (database.refreshCount % 3)));
  const delayMinutes = 3.8 + (database.refreshCount % 6) * 0.4;
  const unassigned = byStatus.PLANNED + byStatus.DISPATCHING;
  const requestCounts = {
    APPROVED: byStatus.PLANNED,
    PLANNED: byStatus.DISPATCHING,
    ASSIGNED: byStatus.ASSIGNED,
    IN_PROGRESS: byStatus.IN_TRANSIT,
    COMPLETED: byStatus.COMPLETED,
    CANCELLED: byStatus.CANCELLED,
    RESCHEDULED: 1,
    UNSERVED: unassigned,
  };
  const requestTotal = Object.values(requestCounts).reduce((sum, count) => sum + count, 0);

  return {
    asOf: database.refreshedAt,
    filter: {
      tenantId: options.tenantId ?? 'ALL',
      from: options.from,
      to: options.to,
      shiftTime: options.shiftTime ?? null,
      timezone: 'Asia/Kolkata',
    },
    trips: { total, byStatus },
    employeesServed: completedEmployees,
    requests: { total: requestTotal, byStatus: requestCounts, cancelled: byStatus.CANCELLED, noShows: 1, unserved: unassigned },
    punctuality: {
      measuredStops,
      onTimePickups,
      latePickups: measuredStops - onTimePickups,
      onTimePct: Math.round((onTimePickups * 10000) / measuredStops) / 100,
      avgDelayMinutes: delayMinutes,
    },
    seatUtilisation: {
      completedRoutes: completed,
      assignedSeats,
      capacitySeats,
      pct: capacitySeats ? Math.round((assignedSeats * 10000) / capacitySeats) / 100 : null,
    },
    dailyTrips,
  };
}

export function getMockRefreshLabel(database: MockOpsDatabase): string {
  return `Mock database · refresh #${database.refreshCount} · ${new Date(database.refreshedAt).toLocaleTimeString()}`;
}
