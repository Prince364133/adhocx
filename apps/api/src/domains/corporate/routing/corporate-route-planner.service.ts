import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { randomBytes, randomInt } from 'crypto';
import * as ExcelJS from 'exceljs';
import * as XLSX from '@e965/xlsx';
import * as h3 from 'h3-js';
import { DatabaseService } from '../../../database/database.service';
import { GoogleGeocodingAdapter } from './google-geocoding.adapter';
import { GoogleRoutesV2Adapter, RouteRequestOptions, haversineKm } from './google-routes-v2.adapter';
import {
  clusterEmployees,
  solveCabRoute,
  solveLogoutCabRoute,
  EmployeeRecord,
  SolverConfig,
  SolverCalculatedRoute,
  formatClock,
} from './cvrptw-cluster-solver';
import {
  PricingConfig,
  DEFAULT_PRICING_CONFIG,
} from './cost-optimizer';
import { getPhoneVariants, normalizeIndianPhone } from '../../../common/utils/uniqueness.util';
import { istWallClockToUtc } from '../replanning/cutoff-policy';

/** A plan optimized to an office this far from the saved office is rejected at commit. */
const OFFICE_PLAN_MAX_DRIFT_KM = 2;
const SUV_CAPACITY = 6;
const COMMIT_TX_TIMEOUT_MS = 120_000;

/** 4-digit boarding OTP from a CSPRNG (never taken from the client payload). */
export function generateBoardingOtp(): string {
  return String(randomInt(1000, 10000));
}

/** IST wall clock (YYYY-MM-DD, HH:mm) -> instant; invalid input -> Invalid Date. */
function istWallClock(date: string, hhmm: string): Date {
  try {
    return istWallClockToUtc(date, hhmm);
  } catch {
    return new Date(NaN);
  }
}

/** Instant -> IST calendar date + HH:mm. */
function istParts(at: Date): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(at)
      .map(({ type, value }) => [type, value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export interface PlanRoutesFromFileOptions {
  tenantId?: string;
  officeId?: string;
  office?: string; // Legacy shared office; new rosters should provide office_address per row.
  officeLat?: number;
  officeLng?: number;
  direction?: 'LOGIN' | 'LOGOUT';
  loginTime?: string | Date; // Legacy shared deadline; new rosters should provide arrival date/time per row.
  logoutTime?: string | Date;
  officeRadiusKm?: number; // default 50
  maxTripKm?: number; // default 50
  bufferMinutes?: number; // default 15
  pickupWaitMinutes?: number; // standard/max 10
  cabCapacity?: number; // maximum passengers per cab, default 6
  routingPreference?: RouteRequestOptions['routingPreference'];
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  excludedEmployees?: string[];
  pricingConfig?: PricingConfig;
}

export interface PlanRoutesResult {
  employeeCount: number;
  cabCount: number;
  officeRadiusKm: number;
  maxTripKm: number;
  outOfRadiusCount: number;
  excludedByDistanceCount: number;
  excludedByDistance: Array<{
    name: string;
    address: string;
    matchedAddress?: string;
    lat: number;
    lng: number;
    officeDistanceKm: number;
  }>;
  autoExcludedEmployees: string[];
  bufferedDeadline: string;
  office: { name: string; lat: number; lng: number };
  offices: Array<{ name: string; lat: number; lng: number }>;
  routes: SolverCalculatedRoute[];
  totalKm: number;
  totalDriverPayout: number;
  expectedCorporateRevenue: number;
  projectedMargin: number;
}

export interface CommitPlanDto {
  tenantId: string;
  officeId: string;
  shiftDate: string; // YYYY-MM-DD
  shiftTime: string; // HH:mm
  direction: 'LOGIN' | 'LOGOUT';
  vehicleCategory?: 'SEDAN' | 'SUV';
  stopDwellMinutes?: number;
  includeMetadata?: boolean;
  plan: PlanRoutesResult;
}

interface RosterEmployeeRow {
  employeeName: string;
  pickupAddress: string;
  officeAddress?: string;
  arrivalDateTime?: string;
  logoutTime?: string;
  phoneNumber?: string;
  gender?: string;
  employeeId?: string;
  employeeCode?: string;
  email?: string;
  department?: string;
  /** Optional pickup coordinates from the roster; when valid they replace geocoding. */
  latitude?: number;
  longitude?: number;
}

interface ParsedRoster {
  rows: RosterEmployeeRow[];
  duplicateEmployeeNames: string[];
}

@Injectable()
export class CorporateRoutePlannerService {
  private readonly logger = new Logger(CorporateRoutePlannerService.name);

  constructor(
    private readonly geocodingAdapter: GoogleGeocodingAdapter,
    private readonly routesAdapter: GoogleRoutesV2Adapter,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Plans capacity- and traffic-constrained corporate routes from an uploaded Excel / CSV file.
   */
  async planFromFile(
    fileBuffer: Buffer,
    fileName: string,
    options: PlanRoutesFromFileOptions,
    onProgress?: (type: string, percent: number, message: string, data?: any) => void,
  ): Promise<PlanRoutesResult> {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    const supportedSpreadsheetExtensions = new Set([
      'csv',
      'xls',
      'xlsx',
      'xlsm',
      'xlsb',
      'xlt',
      'xltx',
      'xltm',
      'xml',
      'ods',
    ]);
    if (!supportedSpreadsheetExtensions.has(extension)) {
      throw new BadRequestException(
        'Unsupported roster file type. Upload CSV, Excel (.xls, .xlsx, .xlsm, .xlsb), Excel templates, or OpenDocument (.ods) files.',
      );
    }

    const isCsv = extension === 'csv';
    const parsedRoster = isCsv
      ? this.parseCsv(fileBuffer)
      : await this.parseExcel(fileBuffer);
    const rawRows = parsedRoster.rows;
    const duplicateEmployeeNames = parsedRoster.duplicateEmployeeNames;

    if (duplicateEmployeeNames.length > 0) {
      this.logger.warn(
        `Excluded duplicate employee names from ${fileName}: ${duplicateEmployeeNames.join(', ')}`,
      );
      onProgress?.(
        'duplicates_excluded',
        3,
        `Excluded ${duplicateEmployeeNames.length} duplicate employee name(s): ${duplicateEmployeeNames.join(', ')}`,
        { duplicateEmployeeNames },
      );
    }

    this.logger.log(`Planning routes for ${fileName} (${rawRows?.length || 0} employees)`);

    if (!rawRows || rawRows.length === 0) {
      throw new BadRequestException('Uploaded file contains no valid employee pickup rows');
    }
    if (rawRows.length > 1000) {
      throw new BadRequestException('Exceeded maximum of 1,000 employees per planning batch');
    }

    // Excluded employee filtering
    let activeRows = rawRows;
    if (options.excludedEmployees && options.excludedEmployees.length > 0) {
      const excludedSet = new Set(
        options.excludedEmployees
          .map((e) => this.normalizeEmployeeName(e || ''))
          .filter(Boolean),
      );
      activeRows = rawRows.filter(
        (r) => !excludedSet.has(this.normalizeEmployeeName(r.employeeName)),
      );
      if (activeRows.length === 0) {
        throw new BadRequestException('No employees remain after exclusions');
      }
    }

    let policyDwellMinutes = 10;
    let policyCapacity: number | undefined;
    let policyBufferMinutes: number | undefined;
    let dbOfficeAddress: string | undefined;
    let dbOfficeCoords: { lat: number; lng: number } | undefined;

    if (options.tenantId && (this.db as any)?.corporateTenantPolicy?.findFirst) {
      try {
        const latestPolicy: any = await this.db.corporateTenantPolicy.findFirst({
          where: { tenantId: options.tenantId },
          orderBy: { version: 'desc' },
          select: { stopDwellMinutes: true, defaultCapacity: true, officeArrivalBufferMinutes: true },
        });
        if (latestPolicy?.stopDwellMinutes) {
          policyDwellMinutes = Math.min(Math.max(Number(latestPolicy.stopDwellMinutes), 1), 10);
        }
        if (Number(latestPolicy?.defaultCapacity) > 0) policyCapacity = Number(latestPolicy.defaultCapacity);
        if (latestPolicy?.officeArrivalBufferMinutes != null) {
          policyBufferMinutes = Number(latestPolicy.officeArrivalBufferMinutes);
        }
      } catch {
        // Safe fallback to 10 min standard dwell / request values
      }
    }

    if (options.officeId && (this.db as any)?.corporateOffice?.findUnique) {
      try {
        const dbOffice = await this.db.corporateOffice.findUnique({
          where: { id: options.officeId },
          select: { name: true, addressText: true, latitude: true, longitude: true },
        });
        if (dbOffice) {
          dbOfficeAddress = dbOffice.addressText || dbOffice.name;
          if (dbOffice.latitude != null && dbOffice.longitude != null) {
            dbOfficeCoords = { lat: Number(dbOffice.latitude), lng: Number(dbOffice.longitude) };
          }
        }
      } catch {
        // Fallback to request options/CSV office address
      }
    }

    const sharedOffice = options.office?.trim() || dbOfficeAddress;
    if (options.officeLat != null && options.officeLng != null) {
      dbOfficeCoords = { lat: Number(options.officeLat), lng: Number(options.officeLng) };
    }
    const rawSharedArrival =
      options.direction === 'LOGOUT'
        ? options.logoutTime || options.loginTime
        : options.loginTime || options.logoutTime;
    const sharedArrival = rawSharedArrival ? this.parseArrivalDateTime(rawSharedArrival) : undefined;
    const rowsWithTargets = activeRows.map((row, index) => {
      const officeAddress = row.officeAddress?.trim() || sharedOffice;
      const arrivalDateTime =
        (options.direction === 'LOGOUT' ? row.logoutTime || row.arrivalDateTime : row.arrivalDateTime) ||
        sharedArrival;
      if (!officeAddress) {
        throw new BadRequestException(`Row ${index + 2} is missing office_address`);
      }
      if (!arrivalDateTime) {
        throw new BadRequestException(
          `Row ${index + 2} is missing login_time (or required_arrival_date and required_arrival_time)`,
        );
      }
      const loginTime = this.parseArrivalDateTime(arrivalDateTime);
      if (!loginTime) {
        throw new BadRequestException(`Row ${index + 2} has an invalid required arrival date/time`);
      }
      return { ...row, officeAddress, loginTime };
    });

    const isLogout = options.direction === 'LOGOUT';
    const maxTripKm = Number(options.maxTripKm) || 50;
    const pricingConfig = options.pricingConfig || DEFAULT_PRICING_CONFIG;

    const resolvedWaitMinutes = Math.min(
      Math.max(Number(options.pickupWaitMinutes) || policyDwellMinutes || 10, 1),
      10,
    );

    const config: Omit<SolverConfig, 'loginTime'> = {
      logoutTime: options.logoutTime ? new Date(options.logoutTime) : undefined,
      officeRadiusKm: Number(options.officeRadiusKm) || 50,
      maxTripKm,
      // Explicit request value, else the company's office-arrival buffer, else 15 min.
      bufferMinutes:
        options.bufferMinutes != null && Number.isFinite(Number(options.bufferMinutes))
          ? Math.max(0, Number(options.bufferMinutes))
          : policyBufferMinutes ?? 15,
      pickupWaitMinutes: resolvedWaitMinutes,
      // Explicit request value, else the company's policy capacity (SEDAN 4 / SUV 6), else 4.
      cabCapacity: Math.min(Math.max(Math.round(Number(options.cabCapacity) || policyCapacity || 4), 1), 12),
      routingPreference: options.routingPreference || 'TRAFFIC_UNAWARE',
      avoidTolls: options.avoidTolls !== false,
      avoidHighways: Boolean(options.avoidHighways),
      pricingConfig,
    };

    if (onProgress) onProgress('start', 5, `Geocoding ${rowsWithTargets.length} employee addresses and their office destinations`);

    const officesByKey = new Map<string, { name: string; loginTime: Date }>();
    for (const row of rowsWithTargets) {
      const key = `${row.officeAddress.toLowerCase()}|${row.loginTime.toISOString()}`;
      if (!officesByKey.has(key)) officesByKey.set(key, { name: row.officeAddress, loginTime: row.loginTime });
    }

    // Geocode all pickup and office addresses once, including separate destination hubs.
    // Rows that carry their own coordinates are never geocoded.
    const uniqueAddresses = Array.from(
      new Set([
        ...rowsWithTargets.filter((row) => row.latitude === undefined).map((row) => row.pickupAddress),
        ...Array.from(officesByKey.values(), (office) => office.name),
      ]),
    );
    const geocodeMap = await this.geocodingAdapter.batchGeocode(
      uniqueAddresses,
      6,
      (completed, total, addr) => {
        if (onProgress) {
          const pct = 10 + Math.round((completed / total) * 40);
          onProgress('geocoded', pct, `Geocoding addresses: ${completed}/${total}`, {
            completed,
            total,
            address: addr,
          });
        }
      },
    );

    if (dbOfficeCoords && sharedOffice) {
      geocodeMap.set(sharedOffice.toLowerCase(), {
        lat: dbOfficeCoords.lat,
        lng: dbOfficeCoords.lng,
        matchedAddress: sharedOffice,
        partialMatch: false,
        isRealGeocode: true,
      });
    }

    const offices = Array.from(officesByKey.values()).map((office) => {
      const geo = geocodeMap.get(office.name.toLowerCase());
      if (!geo) throw new BadRequestException(`Could not geocode office_address "${office.name}"`);
      return { ...office, coordinates: geo };
    });
    const officeByGroupKey = new Map(
      offices.map((office) => [
        `${office.name.toLowerCase()}|${office.loginTime.toISOString()}`,
        { name: office.name, lat: office.coordinates.lat, lng: office.coordinates.lng },
      ]),
    );
    const officeResults: Array<{ name: string; lat: number; lng: number }> = [];
    const employeeGroups = new Map<string, EmployeeRecord[]>();
    const excludedByDistance: Array<{
      name: string;
      address: string;
      matchedAddress?: string;
      lat: number;
      lng: number;
      officeDistanceKm: number;
    }> = [];

    for (const row of rowsWithTargets) {
      const geo =
        row.latitude !== undefined && row.longitude !== undefined
          ? { lat: row.latitude, lng: row.longitude, matchedAddress: row.pickupAddress }
          : geocodeMap.get(row.pickupAddress.toLowerCase());
      if (!geo) throw new BadRequestException(`Could not geocode pickup_address "${row.pickupAddress}" for ${row.employeeName}`);
      const office = officesByKey.get(`${row.officeAddress.toLowerCase()}|${row.loginTime.toISOString()}`);
      if (!office) throw new BadRequestException(`Missing route destination for ${row.employeeName}`);
      const officeGeo = geocodeMap.get(office.name.toLowerCase());
      if (!officeGeo) throw new BadRequestException(`Could not geocode office_address "${office.name}"`);
      const groupKey = `${office.name.toLowerCase()}|${row.loginTime.toISOString()}`;

      const distKm = Number(haversineKm(geo, officeGeo).toFixed(2));
      const record: EmployeeRecord = {
        employeeName: row.employeeName,
        pickupAddress: row.pickupAddress,
        phoneNumber: row.phoneNumber,
        gender: row.gender,
        employeeId: row.employeeId,
        employeeCode: row.employeeCode,
        email: row.email,
        department: row.department,
        coord: { lat: geo.lat, lng: geo.lng },
        matchedAddress: geo.matchedAddress,
        officeDistanceKm: distKm,
        outOfRadius: distKm > config.officeRadiusKm,
      };

      if (distKm > maxTripKm) {
        excludedByDistance.push({
          name: record.employeeName,
          address: record.pickupAddress,
          matchedAddress: record.matchedAddress,
          lat: record.coord.lat,
          lng: record.coord.lng,
          officeDistanceKm: distKm,
        });
      } else {
        const group = employeeGroups.get(groupKey) ?? [];
        group.push(record);
        employeeGroups.set(groupKey, group);
      }
    }

    const employeeCount = Array.from(employeeGroups.values()).reduce((count, group) => count + group.length, 0);
    if (employeeCount === 0) {
      throw new BadRequestException(
        `No employees are within the ${maxTripKm} km cab distance limit (${excludedByDistance.length} excluded)`,
      );
    }

    if (onProgress) {
      onProgress(
        'clustering',
        52,
        `Clustering ${employeeCount} employees by office and arrival time (max ${config.cabCapacity} per cab, max trip ${maxTripKm} km)`,
      );
    }

    // Cluster employees only when their office and required arrival time match.
    const routeGroups: Array<{ officeName: string; officeCoord: { lat: number; lng: number }; loginTime: Date; employees: EmployeeRecord[] }> = [];
    for (const [groupKey, employees] of employeeGroups) {
      const office = offices.find((item) => `${item.name.toLowerCase()}|${item.loginTime.toISOString()}` === groupKey);
      if (!office) continue;
      const officeCoord = { lat: office.coordinates.lat, lng: office.coordinates.lng };
      officeResults.push(officeByGroupKey.get(groupKey)!);
      for (const employeesForCab of clusterEmployees(employees, config.cabCapacity, officeCoord, pricingConfig, maxTripKm)) {
        routeGroups.push({
          officeName: office.name,
          officeCoord,
          loginTime: office.loginTime,
          employees: employeesForCab,
        });
      }
    }

    // Solve each office/time group independently while preserving globally unique cab numbers.
    const routes: SolverCalculatedRoute[] = [];
    const fleetUsed: Record<string, number> = {};

    for (let i = 0; i < routeGroups.length; i++) {
      const group = routeGroups[i];
      const cabRoute = await (isLogout ? solveLogoutCabRoute : solveCabRoute)(
        i + 1,
        group.employees,
        group.officeName,
        group.officeCoord,
        { ...config, loginTime: group.loginTime },
        this.routesAdapter,
        pricingConfig,
        fleetUsed,
      );
      routes.push(cabRoute);

      if (onProgress) {
        const pct = 52 + Math.round(((i + 1) / routeGroups.length) * 43);
        onProgress(
          'route_complete',
          pct,
          `Solved Route ${i + 1} of ${routeGroups.length} [${cabRoute.cabType?.toUpperCase() || 'SEDAN'}] (${cabRoute.distanceKm} km, payout: ₹${cabRoute.driverPayout})`,
          {
            route: cabRoute,
            completed: i + 1,
            total: routeGroups.length,
          },
        );
      }
    }

    // Sort routes by departure time
    routes.sort((a, b) => (a._departureSort?.getTime() || 0) - (b._departureSort?.getTime() || 0));
    routes.forEach((r, idx) => {
      r.cab = idx + 1;
      delete r._departureSort;
    });

    const outOfRadiusCount = Array.from(employeeGroups.values()).flat().filter((e) => e.outOfRadius).length;
    const deadlines = Array.from(new Set(routeGroups.map(({ loginTime }) => loginTime.getTime())));
    const bufferedDeadlines = deadlines.map((deadline) => formatClock(new Date(deadline - config.bufferMinutes * 60_000)));

    const totalKm = Number(routes.reduce((sum, r) => sum + (r.distanceKm || 0), 0).toFixed(2));
    const totalDriverPayout = Number(routes.reduce((sum, r) => sum + (r.driverPayout || 0), 0).toFixed(2));
    const expectedCorporateRevenue = Number(routes.reduce((sum, r) => sum + (r.corporateRevenue || 0), 0).toFixed(2));
    const projectedMargin = Number((expectedCorporateRevenue - totalDriverPayout).toFixed(2));

    const result: PlanRoutesResult = {
      employeeCount,
      cabCount: routes.length,
      officeRadiusKm: config.officeRadiusKm,
      maxTripKm,
      outOfRadiusCount,
      excludedByDistanceCount: excludedByDistance.length,
      excludedByDistance,
      autoExcludedEmployees: duplicateEmployeeNames,
      bufferedDeadline: bufferedDeadlines.length === 1 ? bufferedDeadlines[0] : 'Varies by employee',
      office: {
        ...officeResults[0],
      },
      offices: Array.from(new Map(officeResults.map((office) => [office.name.toLowerCase(), office])).values()),
      routes,
      totalKm,
      totalDriverPayout,
      expectedCorporateRevenue,
      projectedMargin,
    };

    if (onProgress) {
      onProgress(
        'complete',
        100,
        `Successfully planned ${routes.length} routes for ${rowsWithTargets.length} employees. Total km: ${totalKm}, Margin: ₹${projectedMargin}`,
        {
          plan: result,
        },
      );
    }

    return result;
  }

  private resolvePlannedStopEta(
    stop: { eta?: string; etaIso?: string; travelToNextMinutes?: number; dwellSeconds?: number },
    routeShiftDate: string,
    targetPickup1Time: Date,
    fallbackEta: Date,
  ): Date {
    if (stop.etaIso) {
      const parsedIso = new Date(stop.etaIso);
      if (!Number.isNaN(parsedIso.getTime())) {
        return parsedIso;
      }
    }
    if (stop.eta) {
      const match12h = stop.eta.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      const match24h = stop.eta.trim().match(/^(\d{1,2}):(\d{2})$/);
      let hours: number | null = null;
      let minutes = 0;
      if (match12h) {
        hours = Number(match12h[1]) % 12;
        if (match12h[3].toUpperCase() === 'PM') hours += 12;
        minutes = Number(match12h[2]);
      } else if (match24h) {
        hours = Number(match24h[1]);
        minutes = Number(match24h[2]);
      }
      if (hours !== null && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        const candidate = new Date(`${routeShiftDate}T${hh}:${mm}:00+05:30`);
        if (!Number.isNaN(candidate.getTime())) {
          if (targetPickup1Time.getTime() - candidate.getTime() > 12 * 3600_000) {
            return new Date(candidate.getTime() + 24 * 3600_000);
          }
          return candidate;
        }
      }
    }
    return fallbackEta;
  }

  private normalizeCorporateGender(raw?: string): 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' {
    const val = (raw || '').trim().toUpperCase();
    if (val === 'F' || val === 'FEMALE') return 'FEMALE';
    if (val === 'M' || val === 'MALE') return 'MALE';
    if (val === 'OTHER') return 'OTHER';
    if (val === 'PREFER_NOT_TO_SAY') return 'PREFER_NOT_TO_SAY';
    return 'OTHER';
  }

  /**
   * Commits a calculated route plan into corporate routes + stops (one transaction).
   *
   * The plan comes from the browser, so everything that matters is re-derived or checked here:
   *  - the office must belong to the tenant and sit where the plan was optimized to (<= 2 km);
   *  - boarding OTPs are generated server-side (never taken from the payload);
   *  - employees are linked by employee code, else phone; never by name (names collide);
   *  - an employee may ride at most one live route per shift date + direction (re-commits and
   *    double clicks are rejected instead of putting the person in two cabs);
   *  - LOGIN = pickups -> office DROPOFF; LOGOUT = office PICKUP -> drops;
   *  - capacity follows the vehicle category / company policy.
   */
  async commitPlanToDatabase(
    dto: CommitPlanDto,
  ): Promise<{ routesCreated: number; stopsCreated: number; routeIds?: string[]; employeesLinked?: number }> {
    const { tenantId, officeId, shiftDate, shiftTime, vehicleCategory = 'SEDAN', plan } = dto;
    const direction = String(dto.direction ?? 'LOGIN').toUpperCase() as 'LOGIN' | 'LOGOUT';
    const isLogout = direction === 'LOGOUT';

    if (!plan || !plan.routes || plan.routes.length === 0) {
      throw new BadRequestException('No routes present in the plan to commit');
    }
    if (direction !== 'LOGIN' && direction !== 'LOGOUT') {
      throw new BadRequestException('direction must be LOGIN or LOGOUT');
    }
    const destinations = new Set(
      plan.routes.map((route) => {
        const office = route.office ?? plan.office;
        return `${office.name.trim().toLowerCase()}|${office.lat}|${office.lng}`;
      }),
    );
    if (destinations.size > 1) {
      throw new BadRequestException('Plans with multiple office destinations cannot be committed to a single office. Export the plan or split it by destination.');
    }
    for (const route of plan.routes) {
      if (route.direction && route.direction !== direction) {
        throw new BadRequestException(
          `Route ${route.cab} was optimized for ${route.direction} but is being committed as ${direction}; re-run the optimizer`,
        );
      }
      if (!Array.isArray(route.stops) || route.stops.length === 0) {
        throw new BadRequestException(`Route ${route.cab} has no employee stops`);
      }
      for (const stop of route.stops) {
        if (!Number.isFinite(Number(stop.lat)) || !Number.isFinite(Number(stop.lng))) {
          throw new BadRequestException(`Route ${route.cab} stop "${stop.name}" has no valid coordinates`);
        }
      }
    }

    // Office must be this tenant's, and the plan must have been optimized to its location.
    let office: any = null;
    if (typeof (this.db as any)?.corporateOffice?.findUnique === 'function') {
      office = await this.db.corporateOffice.findUnique({
        where: { id: officeId },
        select: { id: true, tenantId: true, name: true, addressText: true, latitude: true, longitude: true },
      } as any);
      if (!office || office.tenantId !== tenantId) {
        throw new BadRequestException('officeId does not belong to this company');
      }
      const planOffice = plan.routes[0].office ?? plan.office;
      if (office.latitude != null && office.longitude != null && planOffice) {
        const driftKm = haversineKm(
          { lat: Number(office.latitude), lng: Number(office.longitude) },
          { lat: Number(planOffice.lat), lng: Number(planOffice.lng) },
        );
        if (driftKm > OFFICE_PLAN_MAX_DRIFT_KM) {
          throw new BadRequestException(
            `The plan was optimized to an office location ${driftKm.toFixed(1)} km away from the saved office "${office.name}". ` +
              'Save the office address/coordinates first, then re-run the optimizer.',
          );
        }
      }
    }

    // Policy: dwell + sedan capacity
    let defaultDwellSeconds =
      dto.stopDwellMinutes != null
        ? Math.min(Math.max(Math.round(Number(dto.stopDwellMinutes) * 60), 60), 600)
        : 600;
    let sedanCapacity = 4;
    if (typeof (this.db as any)?.corporateTenantPolicy?.findFirst === 'function') {
      const policy: any = await this.db.corporateTenantPolicy.findFirst({
        where: { tenantId },
        orderBy: { version: 'desc' },
        select: { stopDwellMinutes: true, defaultCapacity: true, defaultVehicleCategory: true },
      } as any);
      if (dto.stopDwellMinutes == null && policy?.stopDwellMinutes) {
        defaultDwellSeconds = Math.min(Math.max(Number(policy.stopDwellMinutes) * 60, 60), 600);
      }
      if (String(policy?.defaultVehicleCategory ?? 'SEDAN').toUpperCase() === 'SEDAN' && Number(policy?.defaultCapacity) > 0) {
        sedanCapacity = Math.min(Number(policy.defaultCapacity), 4);
      }
    }

    // An employee may appear once in the plan.
    const identityOf = (stop: any): string => {
      const code = String(stop.employeeCode ?? '').trim().toLowerCase();
      if (stop.employeeId) return `id:${stop.employeeId}`;
      if (code) return `code:${code}`;
      const digits = String(stop.phoneNumber ?? '').replace(/\D/g, '');
      if (digits.length >= 10) return `phone:${digits.slice(-10)}`;
      return `name:${String(stop.name ?? '').trim().toLowerCase()}`;
    };
    const seen = new Map<string, string>();
    for (const route of plan.routes) {
      for (const stop of route.stops) {
        const key = identityOf(stop);
        if (seen.has(key)) {
          throw new BadRequestException(`Employee "${stop.name}" appears in more than one route of this plan`);
        }
        seen.set(key, stop.name);
      }
    }

    let stopsCreated = 0;
    let employeesLinked = 0;
    const routeIds: string[] = [];

    await this.db.$transaction(
      async (tx: any) => {
        for (const route of plan.routes) {
          const fallbackAnchor = istWallClock(shiftDate, shiftTime);
          // LOGIN: pickup-1 -> office arrival. LOGOUT: office departure (= pickup-1 at the office).
          const officeArrival = route.requiredArrivalDateTime ? new Date(route.requiredArrivalDateTime) : fallbackAnchor;
          // LOGIN without an ISO departure: first stop's ETA (ISO or IST clock on the shift date).
          const firstStopEta =
            !isLogout && route.stops[0] && (route.stops[0].etaIso || route.stops[0].eta)
              ? this.resolvePlannedStopEta(route.stops[0], istParts(officeArrival).date, officeArrival, new Date(NaN))
              : null;
          const departure = route.departureDateTime
            ? new Date(route.departureDateTime)
            : isLogout
              ? officeArrival
              : firstStopEta;
          if (!departure || Number.isNaN(departure.getTime()) || Number.isNaN(officeArrival.getTime())) {
            throw new BadRequestException(`Route ${route.cab} has no valid departure / arrival time; re-run the optimizer`);
          }
          const targetPickup1Time = departure;
          const targetOfficeArrivalTime = isLogout ? departure : officeArrival;
          const { date: routeShiftDate, time: routeShiftTime } = istParts(isLogout ? departure : officeArrival);

          let effectiveCategory: 'SEDAN' | 'SUV' =
            route.cabType?.toUpperCase() === 'SUV' || vehicleCategory === 'SUV' ? 'SUV' : 'SEDAN';
          if (effectiveCategory === 'SEDAN' && route.stops.length > sedanCapacity) effectiveCategory = 'SUV';
          const effectiveMaxCapacity = effectiveCategory === 'SUV' ? SUV_CAPACITY : sedanCapacity;
          if (route.stops.length > effectiveMaxCapacity) {
            throw new BadRequestException(
              `Route ${route.cab} has ${route.stops.length} employees; a ${effectiveCategory} seats ${effectiveMaxCapacity}`,
            );
          }

          const stopDwell = (stop: any) =>
            Math.min(Math.max(Number(stop.dwellSeconds ?? route.dwellSeconds ?? defaultDwellSeconds), 60), 600);
          const totalDwellSeconds = route.stops.reduce((sum, stop) => sum + stopDwell(stop), 0);

          const createdRoute = await tx.corporateRoute.create({
            data: {
              tenantId,
              officeId,
              shiftDate: new Date(`${routeShiftDate}T00:00:00.000Z`),
              shiftTime: routeShiftTime,
              direction,
              vehicleCategory: effectiveCategory,
              maxCapacity: effectiveMaxCapacity,
              assignedPassengerCount: route.stops.length,
              status: 'PLANNED',
              dispatchStatus: 'PENDING',
              targetPickup1Time,
              targetOfficeArrivalTime,
              estDistanceMeters: Math.round(Number(route.distanceKm || 0) * 1000),
              // Total route time incl. dwell, as the DDA expects (pickup-1 = office arrival - this).
              estDurationSeconds: Math.round(Number(route.driveMinutes || 0) * 60) + totalDwellSeconds,
            },
          });
          routeIds.push(createdRoute.id);

          const officeStopData = {
            routeId: createdRoute.id,
            stopSequence: isLogout ? 1 : route.stops.length + 1,
            stopType: isLogout ? 'PICKUP' : 'DROPOFF',
            addressText: office?.addressText || route.office?.name || plan.office?.name || 'Corporate Office Hub',
            latitude: office?.latitude ?? route.office?.lat ?? plan.office.lat,
            longitude: office?.longitude ?? route.office?.lng ?? plan.office.lng,
            plannedEta: isLogout ? departure : targetOfficeArrivalTime,
            dwellBufferSeconds: 0,
            boardingOtp: '------',
            status: 'PENDING',
          };
          if (isLogout) {
            await tx.corporateRouteStop.create({ data: officeStopData });
            stopsCreated++;
          }

          let runningFallbackEta = new Date(targetPickup1Time.getTime());
          for (let idx = 0; idx < route.stops.length; idx++) {
            const stop = route.stops[idx];
            const dwellSeconds = stopDwell(stop);
            const stopPlannedEta = this.resolvePlannedStopEta(stop, routeShiftDate, targetPickup1Time, runningFallbackEta);
            runningFallbackEta = new Date(
              stopPlannedEta.getTime() + dwellSeconds * 1000 + Math.round((stop.travelToNextMinutes || 5) * 60_000),
            );

            const linkedEmployeeId = await this.resolveEmployeeForStop(tx, tenantId, officeId, stop);
            if (linkedEmployeeId) {
              employeesLinked++;
              await this.assertEmployeeNotOnLiveRoute(tx, tenantId, linkedEmployeeId, routeShiftDate, direction, stop.name);
            }

            await tx.corporateRouteStop.create({
              data: {
                routeId: createdRoute.id,
                employeeId: linkedEmployeeId || null,
                stopSequence: isLogout ? idx + 2 : idx + 1,
                stopType: isLogout ? 'DROPOFF' : 'PICKUP',
                addressText: stop.address || stop.matchedAddress || (isLogout ? 'Drop location' : 'Pickup location'),
                employeeName: stop.name,
                employeePhone: normalizeIndianPhone(stop.phoneNumber) || null,
                latitude: Number(stop.lat),
                longitude: Number(stop.lng),
                plannedEta: stopPlannedEta,
                dwellBufferSeconds: isLogout ? Math.min(dwellSeconds, 600) : dwellSeconds,
                boardingOtp: generateBoardingOtp(),
                status: 'PENDING',
              },
            });
            stopsCreated++;
          }

          if (!isLogout) {
            await tx.corporateRouteStop.create({ data: officeStopData });
            stopsCreated++;
          }
        }
      },
      // Hundreds of stops x a few queries each: Prisma's 5 s interactive default is not enough.
      { maxWait: 10_000, timeout: COMMIT_TX_TIMEOUT_MS },
    );

    if (dto.includeMetadata) {
      return {
        routesCreated: plan.routes.length,
        stopsCreated,
        routeIds,
        employeesLinked,
      };
    }

    return {
      routesCreated: plan.routes.length,
      stopsCreated,
    };
  }

  /** Employee code -> phone (any Indian format) -> new employee. Never by name. */
  private async resolveEmployeeForStop(tx: any, tenantId: string, officeId: string, stop: any): Promise<string | undefined> {
    if (stop.employeeId) {
      if (typeof tx.corporateEmployee?.findFirst === 'function') {
        const own = await tx.corporateEmployee.findFirst({ where: { id: stop.employeeId, tenantId }, select: { id: true } });
        if (!own) throw new BadRequestException(`Employee ${stop.employeeId} does not belong to this company`);
      }
      return stop.employeeId;
    }
    if (typeof tx.corporateEmployee?.findFirst !== 'function') return undefined;

    const code = String(stop.employeeCode ?? '').trim();
    const phone = normalizeIndianPhone(stop.phoneNumber);
    if (code) {
      const byCode = await tx.corporateEmployee.findFirst({ where: { tenantId, employeeCode: code }, select: { id: true } });
      if (byCode) return byCode.id;
    }
    if (phone) {
      const byPhone = await tx.corporateEmployee.findFirst({
        where: { tenantId, phoneNumber: { in: getPhoneVariants(phone) } },
        select: { id: true },
      });
      if (byPhone) return byPhone.id;
    }
    if (typeof tx.corporateEmployee?.create !== 'function') return undefined;

    const generatedCode = (code || `EMP-${randomBytes(4).toString('hex').toUpperCase()}`).slice(0, 64);
    const created = await tx.corporateEmployee.create({
      data: {
        tenantId,
        officeId,
        employeeCode: generatedCode,
        fullName: stop.name,
        email: stop.email || `${generatedCode.toLowerCase()}@roster.corporate.local`,
        phoneNumber: phone || '0000000000',
        gender: this.normalizeCorporateGender(stop.gender),
        department: stop.department || null,
      },
      select: { id: true },
    });
    if (typeof tx.corporateEmployeeLocation?.create === 'function') {
      await tx.corporateEmployeeLocation.create({
        data: {
          employeeId: created.id,
          addressText: stop.address || stop.matchedAddress || 'Pickup location',
          latitude: Number(stop.lat),
          longitude: Number(stop.lng),
          h3Res8Index: h3.latLngToCell(Number(stop.lat), Number(stop.lng), 8),
          isDefault: true,
        },
      });
    }
    return created.id;
  }

  private async assertEmployeeNotOnLiveRoute(
    tx: any,
    tenantId: string,
    employeeId: string,
    routeShiftDate: string,
    direction: 'LOGIN' | 'LOGOUT',
    name: string,
  ): Promise<void> {
    if (typeof tx.corporateRouteStop?.findFirst !== 'function') return;
    const clash = await tx.corporateRouteStop.findFirst({
      where: {
        employeeId,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        route: {
          tenantId,
          direction,
          shiftDate: new Date(`${routeShiftDate}T00:00:00.000Z`),
          status: { notIn: ['CANCELLED', 'COMPLETED'] },
        },
      },
      select: { routeId: true },
    });
    if (clash) {
      throw new ConflictException(
        `${name} is already on live ${direction} route ${clash.routeId} for ${routeShiftDate}. ` +
          'Cancel that route (or remove the employee) before committing again.',
      );
    }
  }

  /**
   * Exports planned routes to formatted Excel workbook buffer.
   */
  async exportPlanToExcel(plan: PlanRoutesResult): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AdhocX Tactical Fleet Ops';

    // Sheet 1: Routes Overview
    const s1 = workbook.addWorksheet('Routes Overview', { views: [{ state: 'frozen', ySplit: 1 }] });
    s1.columns = [
      { header: 'Cab #', key: 'cab', width: 10 },
      { header: 'Vehicle Category', key: 'cabType', width: 16 },
      { header: 'Driver Starting Stop', key: 'driverStart', width: 45 },
      { header: 'Sequence', key: 'sequence', width: 50 },
      { header: 'Stops', key: 'stopsCount', width: 10 },
      { header: 'Departure', key: 'departure', width: 15 },
      { header: 'Required Office Arrival', key: 'requiredArrival', width: 24 },
      { header: 'Office Destination', key: 'office', width: 42 },
      { header: 'Office Arrival', key: 'arrival', width: 15 },
      { header: 'Distance (km)', key: 'distanceKm', width: 15 },
      { header: 'Drive Time (min)', key: 'driveMinutes', width: 16 },
      { header: 'Driver Payout (₹)', key: 'driverPayout', width: 16 },
      { header: 'Corporate Revenue (₹)', key: 'corporateRevenue', width: 22 },
      { header: 'Projected Margin (₹)', key: 'projectedMargin', width: 20 },
      { header: 'Deadline Status', key: 'status', width: 18 },
      { header: 'Buffer Status', key: 'bufferStatus', width: 18 },
      { header: 'Time Source', key: 'timeSource', width: 28 },
    ];
    s1.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    s1.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5728B2' } };

    for (const r of plan.routes) {
      s1.addRow({
        cab: r.cab,
        cabType: r.cabType?.toUpperCase() || 'SEDAN',
        driverStart: r.driverStart,
        sequence: r.sequence,
        stopsCount: r.stops.length,
        departure: r.departure,
        requiredArrival: r.requiredArrival,
        office: r.office?.name || plan.office.name,
        arrival: r.arrival,
        distanceKm: r.distanceKm,
        driveMinutes: r.driveMinutes,
        driverPayout: r.driverPayout ?? 0,
        corporateRevenue: r.corporateRevenue ?? 0,
        projectedMargin: r.projectedMargin ?? 0,
        status: r.status,
        bufferStatus: r.bufferStatus,
        timeSource: r.timeSource,
      });
    }

    // Sheet 2: Detailed Stop Itinerary
    const s2 = workbook.addWorksheet('Stop Itinerary', { views: [{ state: 'frozen', ySplit: 1 }] });
    s2.columns = [
      { header: 'Cab #', key: 'cab', width: 10 },
      { header: 'Stop #', key: 'sequence', width: 10 },
      { header: 'Employee Name', key: 'name', width: 25 },
      { header: 'Pickup Address', key: 'address', width: 45 },
      { header: 'Pickup ETA', key: 'eta', width: 15 },
      { header: 'Dwell Until', key: 'dwellUntil', width: 15 },
      { header: 'Next Stop', key: 'nextStop', width: 25 },
      { header: 'Travel to Next (min)', key: 'travelToNextMinutes', width: 20 },
      { header: 'Distance to Next (km)', key: 'distanceToNextKm', width: 20 },
      { header: 'Arrival at Next', key: 'arrivalAtNext', width: 16 },
      { header: 'Office Dist (km)', key: 'officeDistanceKm', width: 16 },
      { header: 'Outside Radius?', key: 'outOfRadius', width: 16 },
      { header: 'Boarding OTP', key: 'boardingOtp', width: 14 },
    ];
    s2.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    s2.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEE9811' } };

    for (const r of plan.routes) {
      for (const s of r.stops) {
        s2.addRow({
          cab: r.cab,
          sequence: s.sequence,
          name: s.name,
          address: s.matchedAddress || s.address,
          eta: s.eta,
          dwellUntil: s.dwellUntil,
          nextStop: s.nextStop,
          travelToNextMinutes: s.travelToNextMinutes,
          distanceToNextKm: s.distanceToNextKm,
          arrivalAtNext: s.arrivalAtNext,
          officeDistanceKm: s.officeDistanceKm,
          outOfRadius: s.outOfRadius ? 'YES (ALERT)' : 'NO',
          boardingOtp: s.boardingOtp,
        });
      }
    }

    // Sheet 3: Catchment & Distance Exclusions (if any)
    if (plan.excludedByDistance && plan.excludedByDistance.length > 0) {
      const s3 = workbook.addWorksheet('Distance Exclusions', { views: [{ state: 'frozen', ySplit: 1 }] });
      s3.columns = [
        { header: 'Employee Name', key: 'name', width: 25 },
        { header: 'Pickup Address', key: 'address', width: 45 },
        { header: 'Distance from Office (km)', key: 'officeDistanceKm', width: 25 },
        { header: 'Max Permissible Limit (km)', key: 'limit', width: 25 },
        { header: 'Reason', key: 'reason', width: 35 },
      ];
      s3.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      s3.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };

      for (const exc of plan.excludedByDistance) {
        s3.addRow({
          name: exc.name,
          address: exc.matchedAddress || exc.address,
          officeDistanceKm: exc.officeDistanceKm,
          limit: plan.maxTripKm || 50,
          reason: `Exceeds max cab trip limit of ${plan.maxTripKm || 50} km`,
        });
      }
    }

    const uint8 = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8);
  }

  private normalizeEmployeeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private normalizeRosterHeader(value: unknown): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  private findEmployeeNameColumn(headers: string[]): number {
    const preferred = headers.findIndex((header) =>
      [
        'employee_name',
        'full_name',
        'emp_name',
        'associate_name',
        'staff_name',
        'name_of_employee',
        'name',
      ].includes(header),
    );
    return preferred !== -1
      ? preferred
      : headers.findIndex(
          (header) =>
            header.includes('name') &&
            !['first_name', 'firstname', 'given_name', 'last_name', 'lastname', 'surname', 'family_name'].includes(header) &&
            !/(^|_)(father|mother|guardian|manager|supervisor|driver|contact)(_|$)/.test(header),
        );
  }

  private findPickupAddressColumn(headers: string[]): number {
    const scores = headers.map((header) => {
      if (/(^|_)(office|destination|drop_off|dropoff|workplace|company)(_|$)/.test(header)) return 0;
      if (/(^|_)(lat|latitude|lng|lon|long|longitude)$/.test(header)) return 0;
      if (['pickup', 'pickup_address', 'pickup_location', 'pickup_point', 'pick_up_address', 'pick_up_location'].includes(header)) return 100;
      if (header.startsWith('pickup_') || header.startsWith('pick_up_')) return 90;
      if (/(^|_)(home|residential|residence|employee|origin|source)(_|$)/.test(header) && /address|location|point/.test(header)) return 80;
      if (header === 'address' || header === 'location' || header === 'origin' || header === 'source') return 60;
      if (/(^|_)(address|location)(_|$)/.test(header)) return 40;
      return 0;
    });
    const bestScore = Math.max(...scores, 0);
    return bestScore === 0 ? -1 : scores.findIndex((score) => score === bestScore);
  }

  private parseCsv(buffer: Buffer): ParsedRoster {
    const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new BadRequestException('CSV requires a header row and at least one employee row');
    }

    const headers = lines[0].split(',').map((h) => this.normalizeRosterHeader(h.replace(/^["']|["']$/g, '')));
    let nameIdx = this.findEmployeeNameColumn(headers);
    let namePartIdx = -1;
    if (nameIdx === -1) {
      const firstNameIdx = headers.findIndex((header) => ['first_name', 'firstname', 'given_name'].includes(header));
      const lastNameIdx = headers.findIndex((header) => ['last_name', 'lastname', 'surname', 'family_name'].includes(header));
      if (firstNameIdx !== -1 && lastNameIdx !== -1) {
        nameIdx = firstNameIdx;
        namePartIdx = lastNameIdx;
      }
    }
    const addrIdx = this.findPickupAddressColumn(headers);
    const officeIdx = headers.findIndex((h) => ['office_address', 'office_destination', 'destination_address', 'destination', 'office'].some((alias) => h.startsWith(alias)));
    const arrivalDateIdx = headers.findIndex((h) =>
      ['required_arrival_date', 'arrival_date', 'login_date', 'shift_date', 'scheduled_date', 'schedule_date', 'work_date']
        .some((alias) => h === alias || h.startsWith(`${alias}_`)),
    );
    const arrivalTimeIdx = headers.findIndex((h) =>
      ['required_arrival_time', 'arrival_time', 'login_time', 'deadline', 'reporting_time', 'office_login_time', 'shift_time', 'shift_start_time', 'start_time']
        .some((alias) => h === alias || h.includes(alias)) || h === 'login' || h.endsWith('_login'),
    );
    const arrivalDateTimeIdx = headers.findIndex((h) =>
      ['required_arrival_datetime', 'arrival_datetime', 'login_datetime', 'shift_datetime'].some((alias) => h === alias || h.startsWith(`${alias}_`)),
    );
    const phoneIdx = headers.findIndex(
      (h) =>
        ['phone_number', 'phone', 'mobile', 'mobile_number', 'contact', 'contact_number'].includes(h) ||
        h.includes('phone') ||
        h.includes('mobile'),
    );
    const genderIdx = headers.findIndex((h) => h === 'gender' || h === 'sex');
    const empCodeIdx = headers.findIndex((h) =>
      ['employee_code', 'emp_code', 'emp_id', 'employee_id', 'staff_id', 'code'].includes(h),
    );
    const emailIdx = headers.findIndex((h) => ['email', 'email_address', 'work_email', 'corporate_email'].includes(h));
    const deptIdx = headers.findIndex((h) => ['department', 'dept', 'team'].includes(h));
    const logoutTimeIdx = headers.findIndex((h) =>
      ['logout_time', 'required_logout_time', 'shift_end_time', 'departure_time'].some(
        (alias) => h === alias || h.includes(alias),
      ) || h === 'logout',
    );

    if (nameIdx === -1 || addrIdx === -1) {
      throw new BadRequestException(
        `CSV header must identify employee name and pickup address columns. Found: ${headers.join(', ')}. Use headers such as employee_name and pickup_address or pickup_location.`,
      );
    }

    const { latIdx, lngIdx } = this.findCoordinateColumns(headers);
    const results: RosterEmployeeRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Split with quotes handling
      const row = this.parseCsvLine(lines[i]);
      const name = [row[nameIdx], namePartIdx === -1 ? '' : row[namePartIdx]]
        .map((part) => (part || '').trim())
        .filter(Boolean)
        .join(' ');
      const addr = (row[addrIdx] || '').trim();
      if (!name && !addr) continue;

      if (!name || !addr) {
        throw new BadRequestException(`Row ${i + 1} is missing employee_name or pickup_address`);
      }
      const coords = this.parseRowCoordinates(
        latIdx !== -1 ? row[latIdx] : undefined,
        lngIdx !== -1 ? row[lngIdx] : undefined,
        `Row ${i + 1}`,
      );

      results.push({
        ...coords,
        employeeName: name,
        pickupAddress: addr,
        officeAddress: officeIdx !== -1 ? (row[officeIdx] || '').trim() : undefined,
        arrivalDateTime:
          (arrivalDateTimeIdx !== -1 ? (row[arrivalDateTimeIdx] || '').trim() : '') ||
          this.combineArrivalDateAndTime(
            arrivalDateIdx !== -1 ? (row[arrivalDateIdx] || '').trim() : '',
            arrivalTimeIdx !== -1 ? (row[arrivalTimeIdx] || '').trim() : '',
          ),
        logoutTime: logoutTimeIdx !== -1 ? (row[logoutTimeIdx] || '').trim() || undefined : undefined,
        phoneNumber: phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : undefined,
        gender: genderIdx !== -1 ? (row[genderIdx] || '').trim().toUpperCase() : undefined,
        employeeCode: empCodeIdx !== -1 ? (row[empCodeIdx] || '').trim() || undefined : undefined,
        email: emailIdx !== -1 ? (row[emailIdx] || '').trim() || undefined : undefined,
        department: deptIdx !== -1 ? (row[deptIdx] || '').trim() || undefined : undefined,
      });
    }

    return this.dedupeRoster(results);
  }

  private parseExcel(buffer: Buffer): ParsedRoster {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    } catch {
      throw new BadRequestException('Could not read the spreadsheet. Make sure it is a valid Excel or OpenDocument workbook.');
    }

    if (workbook.SheetNames.length === 0) {
      throw new BadRequestException('Spreadsheet contains no worksheets');
    }

    const results: RosterEmployeeRow[] = [];
    let rosterSheetCount = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        raw: false,
        defval: '',
        blankrows: true,
        dateNF: 'yyyy-mm-dd',
      });
      if (rows.length === 0) continue;

      let headerRowIndex = -1;
      let headers: string[] = [];
      let nameCol = -1;
      let addrCol = -1;
      let namePartCol = -1;
      let pickupCandidateHeaders: string[] = [];
      for (let rowIndex = 0; rowIndex < Math.min(rows.length, 30); rowIndex++) {
        const candidateHeaders = rows[rowIndex].map((value) => this.normalizeRosterHeader(value));
        let candidateNameCol = this.findEmployeeNameColumn(candidateHeaders);
        let candidateNamePartCol = -1;
        if (candidateNameCol === -1) {
          const firstNameCol = candidateHeaders.findIndex((header) => ['first_name', 'firstname', 'given_name'].includes(header));
          const lastNameCol = candidateHeaders.findIndex((header) => ['last_name', 'lastname', 'surname', 'family_name'].includes(header));
          if (firstNameCol !== -1 && lastNameCol !== -1) {
            candidateNameCol = firstNameCol;
            candidateNamePartCol = lastNameCol;
          }
        }
        const candidateAddrCol = this.findPickupAddressColumn(candidateHeaders);
        if (candidateNameCol !== -1 && candidateAddrCol !== -1) {
          headerRowIndex = rowIndex;
          headers = candidateHeaders;
          nameCol = candidateNameCol;
          namePartCol = candidateNamePartCol;
          addrCol = candidateAddrCol;
          break;
        }
        if (candidateNameCol !== -1) pickupCandidateHeaders = candidateHeaders;
      }

      if (headerRowIndex === -1) {
        if (pickupCandidateHeaders.length > 0) {
          throw new BadRequestException(
            `Worksheet "${sheetName}" has an employee name column but no recognizable pickup address column. Found headings: ${pickupCandidateHeaders.join(', ')}. Rename the home/pickup column to pickup_address, pickup_location, home_address, or employee_address. Office/destination address columns are not pickup columns.`,
          );
        }
        continue;
      }

      let officeCol = -1;
      let arrivalDateCol = -1;
      let arrivalTimeCol = -1;
      let arrivalDateTimeCol = -1;
      let phoneCol = -1;
      let genderCol = -1;
      let empCodeCol = -1;
      let emailCol = -1;
      let deptCol = -1;
      let logoutTimeCol = -1;

      headers.forEach((name, index) => {
        if (['office_address', 'office_destination', 'destination_address', 'destination', 'office'].some((alias) => name.startsWith(alias))) officeCol = index;
        if (['required_arrival_date', 'arrival_date', 'login_date', 'shift_date', 'scheduled_date', 'schedule_date', 'work_date'].some((alias) => name === alias || name.startsWith(`${alias}_`))) arrivalDateCol = index;
        if (
          ['required_arrival_time', 'arrival_time', 'login_time', 'deadline', 'reporting_time', 'office_login_time', 'shift_time', 'shift_start_time', 'start_time']
            .some((alias) => name === alias || name.includes(alias)) ||
          name === 'login' ||
          name.endsWith('_login')
        ) arrivalTimeCol = index;
        if (['required_arrival_datetime', 'arrival_datetime', 'login_datetime', 'shift_datetime'].some((alias) => name === alias || name.startsWith(`${alias}_`))) arrivalDateTimeCol = index;
        if (name.includes('phone') || name.includes('mobile') || name === 'contact' || name === 'contact_number') phoneCol = index;
        if (name.includes('gender') || name === 'sex') genderCol = index;
        if (['employee_code', 'emp_code', 'emp_id', 'employee_id', 'staff_id', 'code'].includes(name)) empCodeCol = index;
        if (['email', 'email_address', 'work_email', 'corporate_email'].includes(name)) emailCol = index;
        if (['department', 'dept', 'team'].includes(name)) deptCol = index;
        if (
          ['logout_time', 'required_logout_time', 'shift_end_time', 'departure_time'].some(
            (alias) => name === alias || name.includes(alias),
          ) ||
          name === 'logout'
        )
          logoutTimeCol = index;
      });

      rosterSheetCount++;
      const { latIdx: latCol, lngIdx: lngCol } = this.findCoordinateColumns(headers);

      for (let r = headerRowIndex + 1; r < rows.length; r++) {
        const row = rows[r];
        const valueAt = (index: number) => (index === -1 ? '' : this.excelCellToString(row[index] as ExcelJS.CellValue));
        const name = [valueAt(nameCol), valueAt(namePartCol)].filter(Boolean).join(' ');
        const addr = valueAt(addrCol);
        if (!name && !addr) continue;
        if (!name || !addr) {
          throw new BadRequestException(
            `Worksheet "${sheetName}" row ${r + 1} requires both employee name and pickup address`,
          );
        }
        const coords = this.parseRowCoordinates(
          latCol !== -1 ? valueAt(latCol) : undefined,
          lngCol !== -1 ? valueAt(lngCol) : undefined,
          `Worksheet "${sheetName}" row ${r + 1}`,
        );

        results.push({
          ...coords,
          employeeName: name,
          pickupAddress: addr,
          officeAddress: valueAt(officeCol),
          arrivalDateTime:
            valueAt(arrivalDateTimeCol) ||
            this.combineArrivalDateAndTime(valueAt(arrivalDateCol), valueAt(arrivalTimeCol)),
          logoutTime: valueAt(logoutTimeCol) || undefined,
          phoneNumber: valueAt(phoneCol) || undefined,
          gender: valueAt(genderCol).toUpperCase() || undefined,
          employeeCode: valueAt(empCodeCol) || undefined,
          email: valueAt(emailCol) || undefined,
          department: valueAt(deptCol) || undefined,
        });
      }
    }

    if (rosterSheetCount === 0) {
      throw new BadRequestException(
        'At least one worksheet must contain employee name and pickup address columns',
      );
    }
    return this.dedupeRoster(results);
  }

  /**
   * Identity = employee code, else phone (last 10 digits), else normalized name. Rows sharing an
   * identity are ambiguous (two addresses for one person) and are all excluded and reported.
   * Two different people who merely share a common name are both kept.
   */
  private dedupeRoster(rows: RosterEmployeeRow[]): ParsedRoster {
    const identityOf = (row: RosterEmployeeRow) => {
      const code = (row.employeeCode || '').trim().toLowerCase();
      if (code) return `code:${code}`;
      const digits = (row.phoneNumber || '').replace(/\D/g, '');
      if (digits.length >= 10) return `phone:${digits.slice(-10)}`;
      return `name:${this.normalizeEmployeeName(row.employeeName)}`;
    };
    const counts = new Map<string, number>();
    const firstName = new Map<string, string>();
    for (const row of rows) {
      const key = identityOf(row);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!firstName.has(key)) firstName.set(key, row.employeeName);
    }
    const duplicateNames = new Set<string>();
    const kept = rows.filter((row) => {
      const key = identityOf(row);
      if ((counts.get(key) ?? 0) > 1) {
        duplicateNames.add(firstName.get(key) ?? row.employeeName);
        return false;
      }
      return true;
    });
    return { rows: kept, duplicateEmployeeNames: Array.from(duplicateNames) };
  }

  private findCoordinateColumns(headers: string[]): { latIdx: number; lngIdx: number } {
    const latNames = ['latitude', 'lat', 'pickup_lat', 'pickup_latitude', 'home_lat', 'home_latitude'];
    const lngNames = ['longitude', 'lng', 'lon', 'long', 'pickup_lng', 'pickup_lon', 'pickup_longitude', 'home_lng', 'home_longitude'];
    return {
      latIdx: headers.findIndex((h) => latNames.includes(h)),
      lngIdx: headers.findIndex((h) => lngNames.includes(h)),
    };
  }

  /** Both blank -> geocode the address. One blank, unparsable, out of range or (0,0) -> 400. */
  private parseRowCoordinates(
    rawLat: unknown,
    rawLng: unknown,
    rowLabel: string,
  ): { latitude?: number; longitude?: number } {
    const latText = String(rawLat ?? '').trim();
    const lngText = String(rawLng ?? '').trim();
    if (!latText && !lngText) return {};
    const lat = Number(latText);
    const lng = Number(lngText);
    if (
      !latText ||
      !lngText ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180 ||
      (lat === 0 && lng === 0)
    ) {
      throw new BadRequestException(`${rowLabel} has invalid latitude/longitude (${latText || '-'}, ${lngText || '-'})`);
    }
    return { latitude: lat, longitude: lng };
  }

  private combineArrivalDateAndTime(date: string, time: string): string | undefined {
    const normalizedTime = time.trim();
    if (!normalizedTime) return undefined;
    if (!date.trim()) return normalizedTime;
    const normalizedDate = date.trim().replace(/\//g, '-');
    return `${normalizedDate}T${normalizedTime}`;
  }

  private excelCellToString(value: unknown): string {
    if (value instanceof Date) return value.toISOString().slice(0, 19);
    if (value === null || value === undefined) return '';
    if (typeof value === 'object' && 'text' in value) {
      return String(value.text || '').trim();
    }
    return String(value).trim();
  }

  private parseArrivalDateTime(value: string | Date): Date | undefined {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? undefined : value;
    }

    const input = value.trim();
    const timeOnly = /^(\d{1,2})(?::(\d{2})(?::(\d{2}))?)?\s*(AM|PM)?$/i.exec(input);
    if (timeOnly) {
      const [, rawHours, rawMinutes = '00', rawSeconds = '00', meridiem] = timeOnly;
      const hourValue = Number(rawHours);
      const minuteValue = Number(rawMinutes);
      const secondValue = Number(rawSeconds);
      if (meridiem && (hourValue < 1 || hourValue > 12)) return undefined;
      if (minuteValue > 59 || secondValue > 59 || (!meridiem && hourValue > 23)) return undefined;

      let hours = hourValue;
      if (meridiem) {
        hours %= 12;
        if (meridiem.toUpperCase() === 'PM') hours += 12;
      }

      const now = new Date();
      const localParts = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
        })
          .formatToParts(now)
          .map(({ type, value }) => [type, value]),
      );
      let localDate = `${localParts.year}-${localParts.month}-${localParts.day}`;
      const requestedSeconds = hours * 3600 + minuteValue * 60 + secondValue;
      const currentSeconds =
        Number(localParts.hour) * 3600 + Number(localParts.minute) * 60 + Number(localParts.second);
      if (requestedSeconds <= currentSeconds) {
        const nextDay = new Date(`${localDate}T00:00:00Z`);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        localDate = nextDay.toISOString().slice(0, 10);
      }
      const time = `${String(hours).padStart(2, '0')}:${String(minuteValue).padStart(2, '0')}:${String(secondValue).padStart(2, '0')}`;
      const parsed = new Date(`${localDate}T${time}+05:30`);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    const localDateTime = /^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}:\d{2}(?::\d{2})?)(?:\s*(AM|PM))?$/i.exec(input);
    if (localDateTime) {
      const [, date, rawTime, meridiem] = localDateTime;
      const [year, month, day] = date.split('-').map(Number);
      const dateCheck = new Date(0);
      dateCheck.setUTCFullYear(year, month - 1, day);
      dateCheck.setUTCHours(0, 0, 0, 0);
      if (
        month < 1 ||
        month > 12 ||
        day < 1 ||
        dateCheck.getUTCFullYear() !== year ||
        dateCheck.getUTCMonth() !== month - 1 ||
        dateCheck.getUTCDate() !== day
      ) {
        return undefined;
      }
      let time = rawTime;
      if (meridiem) {
        const [rawHours, minutes, seconds] = rawTime.split(':');
        const hourValue = Number(rawHours);
        if (hourValue < 1 || hourValue > 12) return undefined;
        let hours = Number(rawHours) % 12;
        if (meridiem.toUpperCase() === 'PM') hours += 12;
        time = `${String(hours).padStart(2, '0')}:${minutes}${seconds ? `:${seconds}` : ''}`;
      }
      const [hours, minutes, seconds = 0] = time.split(':').map(Number);
      if (hours > 23 || minutes > 59 || seconds > 59) return undefined;
      const parsed = new Date(`${date}T${time}+05:30`);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  }
}
