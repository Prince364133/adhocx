import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as XLSX from '@e965/xlsx';
import { DatabaseService } from '../../../database/database.service';
import { GoogleGeocodingAdapter } from './google-geocoding.adapter';
import { GoogleRoutesV2Adapter, RouteRequestOptions, haversineKm } from './google-routes-v2.adapter';
import {
  clusterEmployees,
  solveCabRoute,
  EmployeeRecord,
  SolverConfig,
  SolverCalculatedRoute,
  formatClock,
} from './cvrptw-cluster-solver';
import {
  PricingConfig,
  DEFAULT_PRICING_CONFIG,
} from './cost-optimizer';

export interface PlanRoutesFromFileOptions {
  office?: string; // Legacy shared office; new rosters should provide office_address per row.
  loginTime?: string | Date; // Legacy shared deadline; new rosters should provide arrival date/time per row.
  logoutTime?: string | Date;
  officeRadiusKm?: number; // default 50
  maxTripKm?: number; // default 50
  bufferMinutes?: number; // default 15
  pickupWaitMinutes?: number; // default 5
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
  plan: PlanRoutesResult;
}

interface RosterEmployeeRow {
  employeeName: string;
  pickupAddress: string;
  officeAddress?: string;
  arrivalDateTime?: string;
  phoneNumber?: string;
  gender?: string;
  employeeId?: string;
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

    const sharedOffice = options.office?.trim();
    const sharedArrival = options.loginTime ? this.parseArrivalDateTime(options.loginTime) : undefined;
    const rowsWithTargets = activeRows.map((row, index) => {
      const officeAddress = row.officeAddress?.trim() || sharedOffice;
      const arrivalDateTime = row.arrivalDateTime || sharedArrival;
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

    const maxTripKm = Number(options.maxTripKm) || 50;
    const pricingConfig = options.pricingConfig || DEFAULT_PRICING_CONFIG;

    const config: Omit<SolverConfig, 'loginTime'> = {
      logoutTime: options.logoutTime ? new Date(options.logoutTime) : undefined,
      officeRadiusKm: Number(options.officeRadiusKm) || 50,
      maxTripKm,
      bufferMinutes: Number(options.bufferMinutes) || 15,
      pickupWaitMinutes: Number(options.pickupWaitMinutes) || 5,
      cabCapacity: Number(options.cabCapacity) || 6,
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
    const uniqueAddresses = Array.from(
      new Set([...rowsWithTargets.map((row) => row.pickupAddress), ...Array.from(officesByKey.values(), (office) => office.name)]),
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
      const geo = geocodeMap.get(row.pickupAddress.toLowerCase());
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
      const cabRoute = await solveCabRoute(
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

  /**
   * Commits calculated route plan directly into production database.
   */
  async commitPlanToDatabase(dto: CommitPlanDto): Promise<{ routesCreated: number; stopsCreated: number }> {
    const { tenantId, officeId, shiftDate, shiftTime, direction, vehicleCategory = 'SEDAN', plan } = dto;

    if (!plan || !plan.routes || plan.routes.length === 0) {
      throw new BadRequestException('No routes present in the plan to commit');
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

    let stopsCreated = 0;

    await this.db.$transaction(async (tx) => {
      for (const route of plan.routes) {
        const firstStop = route.stops[0];

        const targetPickup1Time = route.departureDateTime
          ? new Date(route.departureDateTime)
          : firstStop
            ? new Date(`${shiftDate}T00:00:00Z`)
            : new Date();
        const targetOfficeArrivalTime = route.requiredArrivalDateTime
          ? new Date(route.requiredArrivalDateTime)
          : new Date(`${shiftDate}T${shiftTime}:00Z`);
        const indiaParts = Object.fromEntries(
          new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          })
            .formatToParts(targetOfficeArrivalTime)
            .map(({ type, value }) => [type, value]),
        );
        const routeShiftDate = `${indiaParts.year}-${indiaParts.month}-${indiaParts.day}`;
        const routeShiftTime = `${indiaParts.hour}:${indiaParts.minute}`;

        const effectiveCategory = route.cabType?.toUpperCase() === 'SUV' ? 'SUV' : (vehicleCategory || 'SEDAN');
        const effectiveMaxCapacity = effectiveCategory === 'SUV' ? 6 : 3;

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
            targetPickup1Time,
            targetOfficeArrivalTime,
            estDistanceMeters: Math.round(route.distanceKm * 1000),
            estDurationSeconds: Math.round(route.driveMinutes * 60),
          },
        });

        // Create stops
        for (const stop of route.stops) {
          await tx.corporateRouteStop.create({
            data: {
              routeId: createdRoute.id,
              stopSequence: stop.sequence,
              stopType: 'PICKUP',
              latitude: stop.lat,
              longitude: stop.lng,
              plannedEta: targetPickup1Time,
              dwellBufferSeconds: 300,
              boardingOtp: stop.boardingOtp || '1234',
              status: 'PENDING',
            },
          });
          stopsCreated++;
        }

        // Add Office Dropoff Stop
        await tx.corporateRouteStop.create({
          data: {
            routeId: createdRoute.id,
            stopSequence: route.stops.length + 1,
            stopType: 'DROPOFF',
            latitude: route.office?.lat ?? plan.office.lat,
            longitude: route.office?.lng ?? plan.office.lng,
            plannedEta: targetOfficeArrivalTime,
            dwellBufferSeconds: 0,
            boardingOtp: '0000',
            status: 'PENDING',
          },
        });
        stopsCreated++;
      }
    });

    return {
      routesCreated: plan.routes.length,
      stopsCreated,
    };
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
    const phoneIdx = headers.findIndex((h) => h === 'phone_number' || h === 'phone' || h === 'mobile');
    const genderIdx = headers.findIndex((h) => h === 'gender' || h === 'sex');

    if (nameIdx === -1 || addrIdx === -1) {
      throw new BadRequestException(
        `CSV header must identify employee name and pickup address columns. Found: ${headers.join(', ')}. Use headers such as employee_name and pickup_address or pickup_location.`,
      );
    }

    const results: RosterEmployeeRow[] = [];
    const seenNames = new Map<string, string>();
    const duplicateNames = new Map<string, string>();

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
      const normalizedName = this.normalizeEmployeeName(name);
      if (seenNames.has(normalizedName)) {
        duplicateNames.set(normalizedName, seenNames.get(normalizedName) || name);
      } else {
        seenNames.set(normalizedName, name);
      }

      results.push({
        employeeName: name,
        pickupAddress: addr,
        officeAddress: officeIdx !== -1 ? (row[officeIdx] || '').trim() : undefined,
        arrivalDateTime:
          (arrivalDateTimeIdx !== -1 ? (row[arrivalDateTimeIdx] || '').trim() : '') ||
          this.combineArrivalDateAndTime(
            arrivalDateIdx !== -1 ? (row[arrivalDateIdx] || '').trim() : '',
            arrivalTimeIdx !== -1 ? (row[arrivalTimeIdx] || '').trim() : '',
          ),
        phoneNumber: phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : undefined,
        gender: genderIdx !== -1 ? (row[genderIdx] || '').trim().toUpperCase() : undefined,
      });
    }

    return {
      rows: results.filter((row) => !duplicateNames.has(this.normalizeEmployeeName(row.employeeName))),
      duplicateEmployeeNames: Array.from(duplicateNames.values()),
    };
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
    const seenNames = new Map<string, string>();
    const duplicateNames = new Map<string, string>();
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
        if (name.includes('phone') || name.includes('mobile')) phoneCol = index;
        if (name.includes('gender')) genderCol = index;
      });

      rosterSheetCount++;

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
        const normalizedName = this.normalizeEmployeeName(name);
        if (seenNames.has(normalizedName)) {
          duplicateNames.set(normalizedName, seenNames.get(normalizedName) || name);
        } else {
          seenNames.set(normalizedName, name);
        }

        results.push({
          employeeName: name,
          pickupAddress: addr,
          officeAddress: valueAt(officeCol),
          arrivalDateTime:
            valueAt(arrivalDateTimeCol) ||
            this.combineArrivalDateAndTime(valueAt(arrivalDateCol), valueAt(arrivalTimeCol)),
          phoneNumber: valueAt(phoneCol) || undefined,
          gender: valueAt(genderCol).toUpperCase() || undefined,
        });
      }
    }

    if (rosterSheetCount === 0) {
      throw new BadRequestException(
        'At least one worksheet must contain employee name and pickup address columns',
      );
    }
    return {
      rows: results.filter((row) => !duplicateNames.has(this.normalizeEmployeeName(row.employeeName))),
      duplicateEmployeeNames: Array.from(duplicateNames.values()),
    };
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
