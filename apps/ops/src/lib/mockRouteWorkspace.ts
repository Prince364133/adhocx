import type { CorporateTenantOption, RoutePlanningResult } from './api/opsTypes';

const STORAGE_KEY = 'adhocx_ops_route_workspace_v1';

export interface RouteWorkspaceCompany {
  id: string;
  code: string;
  name: string;
  officeAddress: string;
  latitude?: number;
  longitude?: number;
  source?: 'API';
}

type LocatedRouteWorkspaceCompany = RouteWorkspaceCompany & { latitude: number; longitude: number };

export interface RouteWorkspaceEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  phone?: string;
  gender?: string;
  department?: string;
  pickupAddress: string;
  latitude: number;
  longitude: number;
  pickupEta: string;
  stopType?: 'PICKUP' | 'DROPOFF';
  pickupStatus?: 'PENDING' | 'ARRIVED' | 'BOARDED' | 'NO_SHOW' | 'CANCELLED';
}

export interface RouteWorkspaceRoute {
  id: string;
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  routeCode: string;
  shiftDate: string;
  shiftTime: string;
  direction: 'LOGIN' | 'LOGOUT';
  vehicleCategory: string;
  capacity: number;
  distanceKm: number;
  durationMinutes: number;
  plannedDurationMinutes?: number;
  status: string;
  plannedArrivalAt?: string;
  actualArrivalAt?: string;
  startedAt?: string;
  completedAt?: string;
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  officeAddress: string;
  officeLatitude?: number;
  officeLongitude?: number;
  employees: RouteWorkspaceEmployee[];
  source: 'DEMO' | 'CSV' | 'API';
}

export interface CsvRosterEmployee {
  employeeCode: string;
  fullName: string;
  phone?: string;
  gender?: string;
  department?: string;
  pickupAddress: string;
  officeAddress?: string;
  loginTime?: string;
  logoutTime?: string;
  latitude?: number;
  longitude?: number;
}

type GeocodedCsvEmployee = CsvRosterEmployee & { latitude: number; longitude: number };

export interface MockPlanOptions {
  company: LocatedRouteWorkspaceCompany;
  officeAddress: string;
  arrivalDeadline: string;
  shiftDate: string;
  shiftTime: string;
  direction: 'LOGIN' | 'LOGOUT';
  cabCapacity: number;
  officeRadiusKm: number;
  maxTripKm: number;
  stopDwellMinutes: number;
  bufferMinutes: number;
  excludedEmployees: string;
}

export const MOCK_ROUTE_COMPANIES: LocatedRouteWorkspaceCompany[] = [
  {
    id: 'demo-tenant-hitec',
    code: 'HTC',
    name: 'HiTEC Technologies',
    officeAddress: 'Mindspace IT Park, Hitec City, Hyderabad',
    latitude: 17.4435,
    longitude: 78.3772,
  },
  {
    id: 'demo-tenant-northstar',
    code: 'NSL',
    name: 'Northstar Logistics',
    officeAddress: 'Financial District, Nanakramguda, Hyderabad',
    latitude: 17.4187,
    longitude: 78.3428,
  },
  {
    id: 'demo-tenant-summit',
    code: 'SUM',
    name: 'Summit Business Services',
    officeAddress: 'Raheja Mindspace, Madhapur, Hyderabad',
    latitude: 17.4343,
    longitude: 78.3864,
  },
];

export function toWorkspaceCompany(tenant: CorporateTenantOption): RouteWorkspaceCompany {
  const office = tenant.offices?.[0];
  return {
    id: tenant.id,
    code: tenant.code,
    name: tenant.name,
    officeAddress: office?.addressText ?? office?.name ?? 'Office address unavailable',
    latitude: office?.latitude,
    longitude: office?.longitude,
    source: 'API',
  };
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatTime(minutes: number) {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${String(hour % 12 || 12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && csv[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/[*()[\]]/g, '').replace(/[\s-]+/g, '_');
}

function csvTimeTo24Hour(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!match) throw new Error(`Invalid CSV time "${value}". Use HH:MM or HH:MM AM/PM.`);
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59 || hour > (match[3] ? 12 : 23) || hour < (match[3] ? 1 : 0)) {
    throw new Error(`Invalid CSV time "${value}".`);
  }
  if (match[3] === 'AM' && hour === 12) hour = 0;
  if (match[3] === 'PM' && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function optionalNumber(value: string | undefined, min: number, max: number) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined;
}

export function parseEmployeeCsv(csv: string): CsvRosterEmployee[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) throw new Error('The CSV must include a header and at least one employee row.');

  const headers = rows[0].map(normalizeHeader);
  const findColumn = (predicate: (header: string) => boolean) => headers.findIndex(predicate);
  const normalizeSerialHeader = (header: string) => header.replace(/[._]/g, '');
  const nameColumn = findColumn((header) => header === 'name' || header === 'employee_name' || header === 'full_name');
  const addressColumn = findColumn((header) =>
    header === 'employee_home_location' || header === 'home_location' || header === 'pickup_address' ||
    header === 'employee_address' || header === 'employee_location',
  );
  const officeColumn = findColumn((header) => header === 'office_location' || header === 'office_address');
  const serialColumn = findColumn((header) => ['sno', 'serialno'].includes(normalizeSerialHeader(header)));
  if (nameColumn === -1 || addressColumn === -1) {
    throw new Error('CSV headers must include Name and Employee Home Location columns.');
  }

  const phoneColumn = findColumn((header) => header.includes('phone') || header.includes('mobile'));
  const genderColumn = findColumn((header) => header.includes('gender'));
  const idColumn = findColumn((header) => header.includes('employee_id') || header.includes('employee_code'));
  const departmentColumn = findColumn((header) => header.includes('department') || header.includes('team'));
  const loginTimeColumn = findColumn((header) => header === 'login_time');
  const logoutTimeColumn = findColumn((header) => header === 'logout_time');
  const latitudeColumn = findColumn((header) => header === 'latitude' || header === 'lat');
  const longitudeColumn = findColumn((header) => header === 'longitude' || header === 'lng' || header === 'lon');
  const seenNames = new Set<string>();

  return rows.slice(1).map((cells, rowIndex) => {
    const get = (column: number) => (column < 0 ? '' : cells[column] ?? '').trim();
    const fullName = get(nameColumn);
    const pickupAddress = get(addressColumn);
    if (!fullName || !pickupAddress) {
      throw new Error(`CSV row ${rowIndex + 2} needs both an employee name and pickup address.`);
    }
    const normalizedName = fullName.toLocaleLowerCase();
    if (seenNames.has(normalizedName)) {
      throw new Error(`CSV has a duplicate employee name on row ${rowIndex + 2}: ${fullName}.`);
    }
    seenNames.add(normalizedName);
    const latitude = optionalNumber(get(latitudeColumn), -90, 90);
    const longitude = optionalNumber(get(longitudeColumn), -180, 180);
    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new Error(`CSV row ${rowIndex + 2} must provide both latitude and longitude, or neither.`);
    }

    return {
      employeeCode: get(serialColumn) || get(idColumn) || `EMP-${String(rowIndex + 1).padStart(3, '0')}`,
      fullName,
      phone: get(phoneColumn) || undefined,
      gender: get(genderColumn) || undefined,
      department: get(departmentColumn) || undefined,
      pickupAddress,
      officeAddress: get(officeColumn) || undefined,
      loginTime: csvTimeTo24Hour(get(loginTimeColumn)),
      logoutTime: csvTimeTo24Hour(get(logoutTimeColumn)),
      latitude,
      longitude,
    };
  });
}

function mockCoordinate(index: number, company: LocatedRouteWorkspaceCompany) {
  const angle = index * 2.399 + 0.6;
  const radiusKm = 2.2 + (index % 5) * 1.15;
  const latitude = company.latitude + (Math.sin(angle) * radiusKm) / 110.574;
  const longitude =
    company.longitude +
    (Math.cos(angle) * radiusKm) / (111.32 * Math.cos((company.latitude * Math.PI) / 180));
  return { latitude, longitude };
}

export function buildMockRoutePlan(csv: string, options: MockPlanOptions): {
  plan: RoutePlanningResult;
  employees: CsvRosterEmployee[];
} {
  const exclusions = new Set(
    options.excludedEmployees.split(',').map((name) => name.trim().toLocaleLowerCase()).filter(Boolean),
  );
  const employees = parseEmployeeCsv(csv).filter((employee) => !exclusions.has(employee.fullName.toLocaleLowerCase()));
  if (employees.length === 0) throw new Error('No employees remain after applying the exclusion list.');

  const employeesWithCoordinates: GeocodedCsvEmployee[] = employees.map((employee, index) => {
    const coordinates = employee.latitude !== undefined && employee.longitude !== undefined
      ? { latitude: employee.latitude, longitude: employee.longitude }
      : mockCoordinate(index, options.company);
    return { ...employee, ...coordinates };
  });
  const capacity = Math.max(1, options.cabCapacity);
  const deadlineParts = options.arrivalDeadline.slice(11, 16).split(':').map(Number);
  const arrivalDeadlineMinutes = (deadlineParts[0] ?? 8) * 60 + (deadlineParts[1] ?? 0);
  const estimateGroupDistance = (group: GeocodedCsvEmployee[]) => {
    let total = 0;
    for (let index = 0; index < group.length; index += 1) {
      total += distanceKm(group[index], group[index + 1] ?? options.company);
    }
    return total;
  };
  const groups: GeocodedCsvEmployee[][] = [];
  let currentGroup: GeocodedCsvEmployee[] = [];
  for (const employee of employeesWithCoordinates) {
    const candidate = [...currentGroup, employee];
    if (
      currentGroup.length > 0 &&
      (candidate.length > capacity || estimateGroupDistance(candidate) > options.maxTripKm)
    ) {
      groups.push(currentGroup);
      currentGroup = [employee];
    } else {
      currentGroup = candidate;
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  let outOfRadiusCount = 0;
  const routes = groups.map((group, groupIndex) => {
    const groupWithCoordinates = group;
    const legs = groupWithCoordinates.map((employee, index) => {
      const from = options.direction === 'LOGOUT' && index === 0 ? options.company : employee;
      const to = options.direction === 'LOGIN'
        ? groupWithCoordinates[index + 1] ?? options.company
        : groupWithCoordinates[index + 1] ?? employee;
      const distance = distanceKm(from, to);
      return { distance, minutes: Math.max(3, Math.round((distance / 24) * 60)) };
    });
    const distanceKmTotal = legs.reduce((sum, leg) => sum + leg.distance, 0);
    const driveMinutes = legs.reduce((sum, leg) => sum + leg.minutes, 0);
    const elapsedMinutes = driveMinutes + group.length * options.stopDwellMinutes;
    const departureMinutes =
      options.direction === 'LOGIN'
        ? arrivalDeadlineMinutes - Math.max(0, options.bufferMinutes) - elapsedMinutes
        : arrivalDeadlineMinutes;
    let elapsed = 0;
    const stops = groupWithCoordinates.map((employee, index) => {
      const officeDistanceKm = distanceKm(employee, options.company);
      const outOfRadius = officeDistanceKm > options.officeRadiusKm;
      if (outOfRadius) outOfRadiusCount += 1;
      const eta = formatTime(departureMinutes + elapsed);
      elapsed += legs[index].minutes + options.stopDwellMinutes;
      const dwellUntil = formatTime(departureMinutes + elapsed - legs[index].minutes);
      const next = groupWithCoordinates[index + 1];
      return {
        sequence: index + 1,
        name: employee.fullName,
        address: employee.pickupAddress,
        matchedAddress: employee.pickupAddress,
        lat: employee.latitude,
        lng: employee.longitude,
        eta,
        dwellUntil,
        nextStop: next?.fullName ?? (options.direction === 'LOGIN' ? options.officeAddress : 'Employee home location'),
        travelToNextMinutes: legs[index].minutes,
        distanceToNextKm: Number(legs[index].distance.toFixed(1)),
        arrivalAtNext: formatTime(departureMinutes + elapsed),
        officeDistanceKm: Number(officeDistanceKm.toFixed(1)),
        outOfRadius,
      };
    });
    const routePayout = Math.round(350 + distanceKmTotal * 14);
    const routeRevenue = Math.round(500 + distanceKmTotal * 22);
    return {
      cab: groupIndex + 1,
      cabType: capacity >= 12 ? 'Tempo Traveller' : capacity > 4 ? 'SUV' : 'Sedan',
      driverPayout: routePayout,
      corporateRevenue: routeRevenue,
      projectedMargin: routeRevenue - routePayout,
      driverStart: stops[0].address,
      sequence: stops.map((stop) => stop.name).join(' → '),
      stops,
      segments: legs.map((leg, index) => ({
        from: options.direction === 'LOGOUT' && index === 0 ? options.officeAddress : groupWithCoordinates[index].fullName,
        to: groupWithCoordinates[index + 1]?.fullName ??
          (options.direction === 'LOGIN' ? options.officeAddress : 'Employee home location'),
        depart: stops[index].dwellUntil,
        arrive: stops[index].arrivalAtNext,
        minutes: leg.minutes,
        distanceKm: Number(leg.distance.toFixed(1)),
      })),
      departure: formatTime(departureMinutes),
      arrival: formatTime(departureMinutes + elapsedMinutes),
      distanceKm: Number(distanceKmTotal.toFixed(1)),
      driveMinutes,
      status: 'Meets deadline' as const,
      bufferStatus: 'Meets buffer' as const,
      timeSource: 'Mock estimate',
      path: options.direction === 'LOGIN'
        ? [...groupWithCoordinates.map((employee) => [employee.latitude, employee.longitude] as [number, number]), [options.company.latitude, options.company.longitude] as [number, number]]
        : [[options.company.latitude, options.company.longitude] as [number, number], ...groupWithCoordinates.map((employee) => [employee.latitude, employee.longitude] as [number, number])],
    };
  });

  return {
    employees,
    plan: {
      employeeCount: employees.length,
      cabCount: routes.length,
      officeRadiusKm: options.officeRadiusKm,
      maxTripKm: options.maxTripKm,
      outOfRadiusCount,
      bufferedDeadline: options.arrivalDeadline,
      office: { name: options.officeAddress, lat: options.company.latitude, lng: options.company.longitude },
      routes,
      totalKm: Number(routes.reduce((sum, route) => sum + route.distanceKm, 0).toFixed(1)),
      totalDriverPayout: routes.reduce((sum, route) => sum + (route.driverPayout ?? 0), 0),
      expectedCorporateRevenue: routes.reduce((sum, route) => sum + (route.corporateRevenue ?? 0), 0),
      projectedMargin: routes.reduce((sum, route) => sum + (route.projectedMargin ?? 0), 0),
    },
  };
}

function makeDemoRoute(company: LocatedRouteWorkspaceCompany, companyIndex: number): RouteWorkspaceRoute {
  const names = [
    ['Aarav Sharma', 'Priya Reddy', 'Rohan Verma'],
    ['Sneha Kulkarni', 'Vikram Malhotra', 'Ananya Deshmukh'],
    ['Karthik Raju', 'Divya Nair', 'Siddharth Joshi'],
  ][companyIndex];
  const employees = names.map((fullName, index) => {
    const point = mockCoordinate(index + companyIndex * 3, company);
    return {
      id: `${company.id}-employee-${index + 1}`,
      employeeCode: `${company.code}-0${index + 1}`,
      fullName,
      phone: `+91 98765 4321${index}`,
      gender: index % 2 === 0 ? 'MALE' : 'FEMALE',
      department: ['Engineering', 'Finance', 'Operations'][index],
      pickupAddress: ['Gachibowli', 'Madhapur', 'Kondapur'][index] + ', Hyderabad',
      ...point,
      pickupEta: formatTime(420 + index * 8),
    };
  });
  const distance = employees.reduce((sum, employee, index) => {
    const next = employees[index + 1] ?? company;
    return sum + distanceKm(employee, next);
  }, 0);
  const driveMinutes = Math.round((distance / 24) * 60);
  return {
    id: `${company.id}-route-001`,
    tenantId: company.id,
    tenantCode: company.code,
    tenantName: company.name,
    routeCode: `${company.code}-R001`,
    shiftDate: new Date().toISOString().slice(0, 10),
    shiftTime: '07:00',
    direction: 'LOGIN',
    vehicleCategory: 'Sedan',
    capacity: 4,
    distanceKm: Number(distance.toFixed(1)),
    durationMinutes: driveMinutes,
    plannedDurationMinutes: driveMinutes + employees.length * 5,
    status: 'ASSIGNED',
    driverName: ['Ravi Kumar', 'Suresh Reddy', 'Arjun Rao'][companyIndex],
    driverPhone: '+91 90000 12345',
    vehiclePlate: `TS 09 ${String.fromCharCode(65 + companyIndex)}B 1234`,
    officeAddress: company.officeAddress,
    officeLatitude: company.latitude,
    officeLongitude: company.longitude,
    employees,
    source: 'DEMO',
  };
}

export const DEMO_ROUTE_COMPANY_ROUTES = MOCK_ROUTE_COMPANIES.map(makeDemoRoute);

function readStoredRoutes(): RouteWorkspaceRoute[] {
  const serialized = localStorage.getItem(STORAGE_KEY);
  if (!serialized) return [];
  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed)) throw new Error('Saved demo route data is invalid. Clear this browser’s local storage and try again.');
  return parsed as RouteWorkspaceRoute[];
}

export function getSavedWorkspaceRoutes(): RouteWorkspaceRoute[] {
  return readStoredRoutes();
}

export function savePlanToWorkspace(
  plan: RoutePlanningResult,
  company: RouteWorkspaceCompany,
  options: Pick<MockPlanOptions, 'shiftDate' | 'shiftTime' | 'direction' | 'cabCapacity' | 'officeAddress'>,
  sourceEmployees: CsvRosterEmployee[] = [],
): number {
  const sourceByName = new Map(sourceEmployees.map((employee) => [employee.fullName.toLocaleLowerCase(), employee]));
  const stamp = Date.now();
  const routes: RouteWorkspaceRoute[] = plan.routes.map((route, routeIndex) => ({
    id: `csv-${stamp}-${route.cab}-${routeIndex}`,
    tenantId: company.id,
    tenantCode: company.code,
    tenantName: company.name,
    routeCode: `${company.code}-R${String(route.cab).padStart(3, '0')}`,
    shiftDate: options.shiftDate,
    shiftTime: options.shiftTime,
    direction: options.direction,
    vehicleCategory: route.cabType || (options.cabCapacity > 4 ? 'SUV' : 'Sedan'),
    capacity: options.cabCapacity,
    distanceKm: route.distanceKm,
    durationMinutes: route.driveMinutes,
    plannedDurationMinutes: routeDurationMinutes(route.departure, route.arrival),
    status: 'PLANNED',
    plannedArrivalAt: combineDateAndTime(options.shiftDate, route.arrival),
    driverName: 'Awaiting driver assignment',
    driverPhone: '',
    vehiclePlate: 'Awaiting vehicle assignment',
    officeAddress: options.officeAddress,
    officeLatitude: plan.office.lat,
    officeLongitude: plan.office.lng,
    employees: route.stops.map((stop, index) => {
      const source = sourceByName.get(stop.name.toLocaleLowerCase());
      return {
        id: `${stamp}-${route.cab}-${index}`,
        employeeCode: source?.employeeCode ?? `EMP-${String(route.cab * 100 + index + 1).padStart(3, '0')}`,
        fullName: stop.name,
        phone: source?.phone,
        gender: source?.gender,
        department: source?.department,
        pickupAddress: stop.matchedAddress || stop.address,
        latitude: stop.lat,
        longitude: stop.lng,
        pickupEta: stop.eta,
      };
    }),
    source: 'CSV',
  }));

  const current = readStoredRoutes();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...routes, ...current]));
  window.dispatchEvent(new Event('adhocx:ops-route-workspace-updated'));
  return routes.length;
}

function routeDurationMinutes(departure: string, arrival: string): number | undefined {
  const parse = (value: string) => {
    const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 1 || hour > 12 || minute > 59) return null;
    if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
    if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
    return hour * 60 + minute;
  };
  const start = parse(departure);
  const end = parse(arrival);
  if (start === null || end === null) return undefined;
  return (end - start + 1440) % 1440;
}

function combineDateAndTime(date: string, time: string): string | undefined {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return undefined;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 1 || hour > 12 || minute > 59) return undefined;
  if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
  if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
  const result = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
  return Number.isNaN(result.getTime()) ? undefined : result.toISOString();
}
