import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
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
  office: string; // Office address
  loginTime: string | Date;
  logoutTime?: string | Date;
  officeRadiusKm?: number; // default 50
  maxTripKm?: number; // default 50
  bufferMinutes?: number; // default 15
  pickupWaitMinutes?: number; // default 5
  cabCapacity?: number; // default 4
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
  bufferedDeadline: string;
  office: { name: string; lat: number; lng: number };
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
    const isCsv = fileName.toLowerCase().endsWith('.csv');
    const rawRows = isCsv
      ? this.parseCsv(fileBuffer)
      : await this.parseExcel(fileBuffer);

    this.logger.log(`Planning routes for ${fileName} (${rawRows?.length || 0} employees)`);

    if (!rawRows || rawRows.length === 0) {
      throw new BadRequestException('Uploaded file contains no valid employee pickup rows');
    }
    if (rawRows.length > 1000) {
      throw new BadRequestException('Exceeded maximum of 1,000 employees per planning batch');
    }

    const officeName = (options.office || '').trim();
    if (!officeName) {
      throw new BadRequestException('Office destination address is required');
    }

    const loginTime = new Date(options.loginTime);
    if (isNaN(loginTime.getTime())) {
      throw new BadRequestException('Invalid login_time date format');
    }

    // Excluded employee filtering
    let activeRows = rawRows;
    if (options.excludedEmployees && options.excludedEmployees.length > 0) {
      const excludedSet = new Set(
        options.excludedEmployees
          .map((e) => (e || '').trim().toLowerCase())
          .filter(Boolean),
      );
      activeRows = rawRows.filter(
        (r) => !excludedSet.has(r.employeeName.trim().toLowerCase()),
      );
      if (activeRows.length === 0) {
        throw new BadRequestException('No employees remain after exclusions');
      }
    }

    const maxTripKm = Number(options.maxTripKm) || 50;
    const pricingConfig = options.pricingConfig || DEFAULT_PRICING_CONFIG;

    const config: SolverConfig = {
      loginTime,
      logoutTime: options.logoutTime ? new Date(options.logoutTime) : undefined,
      officeRadiusKm: Number(options.officeRadiusKm) || 50,
      maxTripKm,
      bufferMinutes: Number(options.bufferMinutes) || 15,
      pickupWaitMinutes: Number(options.pickupWaitMinutes) || 5,
      cabCapacity: Number(options.cabCapacity) || 4,
      routingPreference: options.routingPreference || 'TRAFFIC_UNAWARE',
      avoidTolls: options.avoidTolls !== false,
      avoidHighways: Boolean(options.avoidHighways),
      pricingConfig,
    };

    if (onProgress) {
      onProgress('start', 5, `Geocoding office destination: ${officeName}`);
    }

    // 1. Geocode office
    const officeCoord = await this.geocodingAdapter.geocode(officeName);

    if (onProgress) {
      onProgress('office_geocoded', 15, `Office geocoded at (${officeCoord.lat}, ${officeCoord.lng})`, {
        office: officeName,
        coordinates: officeCoord,
      });
    }

    // 2. Batch geocode all unique employee addresses
    const uniqueAddresses = Array.from(new Set(activeRows.map((r) => r.pickupAddress)));
    const geocodeMap = await this.geocodingAdapter.batchGeocode(
      uniqueAddresses,
      6,
      (completed, total, addr) => {
        if (onProgress) {
          const pct = 15 + Math.round((completed / total) * 35); // 15% -> 50%
          onProgress('geocoded', pct, `Geocoding addresses: ${completed}/${total}`, {
            completed,
            total,
            address: addr,
          });
        }
      },
    );

    // 3. Assemble employee records with radial distances and catchment alerts
    const employeeRecords: EmployeeRecord[] = [];
    const excludedByDistance: Array<{
      name: string;
      address: string;
      matchedAddress?: string;
      lat: number;
      lng: number;
      officeDistanceKm: number;
    }> = [];

    for (const row of activeRows) {
      const geo = geocodeMap.get(row.pickupAddress.toLowerCase()) || {
        lat: 17.44,
        lng: 78.38,
        matchedAddress: row.pickupAddress,
        partialMatch: true,
        isRealGeocode: false,
      };

      const distKm = Number(haversineKm(geo, officeCoord).toFixed(2));
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
        employeeRecords.push(record);
      }
    }

    if (employeeRecords.length === 0) {
      throw new BadRequestException(
        `No employees are within the ${maxTripKm} km cab distance limit (${excludedByDistance.length} excluded)`,
      );
    }

    if (onProgress) {
      onProgress(
        'clustering',
        55,
        `Clustering ${employeeRecords.length} employees into directional corridors (max ${config.cabCapacity} per cab, max trip ${maxTripKm} km)`,
      );
    }

    // 4. Cluster into cabs using directional corridor bearings
    const groups = clusterEmployees(employeeRecords, config.cabCapacity, officeCoord, pricingConfig, maxTripKm);

    // 5. Multi-pass traffic solve for each cab with dynamic vehicle category selection
    const routes: SolverCalculatedRoute[] = [];
    const fleetUsed: Record<string, number> = {};

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const cabRoute = await solveCabRoute(
        i + 1,
        group,
        officeName,
        officeCoord,
        config,
        this.routesAdapter,
        pricingConfig,
        fleetUsed,
      );
      routes.push(cabRoute);

      if (onProgress) {
        const pct = 55 + Math.round(((i + 1) / groups.length) * 40); // 55% -> 95%
        onProgress(
          'route_complete',
          pct,
          `Solved Route ${i + 1} of ${groups.length} [${cabRoute.cabType?.toUpperCase() || 'SEDAN'}] (${cabRoute.distanceKm} km, payout: ₹${cabRoute.driverPayout})`,
          {
            route: cabRoute,
            completed: i + 1,
            total: groups.length,
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

    const outOfRadiusCount = employeeRecords.filter((e) => e.outOfRadius).length;
    const targetArrival = new Date(config.loginTime.getTime() - config.bufferMinutes * 60_000);

    const totalKm = Number(routes.reduce((sum, r) => sum + (r.distanceKm || 0), 0).toFixed(2));
    const totalDriverPayout = Number(routes.reduce((sum, r) => sum + (r.driverPayout || 0), 0).toFixed(2));
    const expectedCorporateRevenue = Number(routes.reduce((sum, r) => sum + (r.corporateRevenue || 0), 0).toFixed(2));
    const projectedMargin = Number((expectedCorporateRevenue - totalDriverPayout).toFixed(2));

    const result: PlanRoutesResult = {
      employeeCount: employeeRecords.length,
      cabCount: routes.length,
      officeRadiusKm: config.officeRadiusKm,
      maxTripKm,
      outOfRadiusCount,
      excludedByDistanceCount: excludedByDistance.length,
      excludedByDistance,
      bufferedDeadline: formatClock(targetArrival),
      office: {
        name: officeName,
        lat: officeCoord.lat,
        lng: officeCoord.lng,
      },
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
        `Successfully planned ${routes.length} routes for ${employeeRecords.length} employees. Total km: ${totalKm}, Margin: ₹${projectedMargin}`,
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

    let stopsCreated = 0;

    await this.db.$transaction(async (tx) => {
      for (const route of plan.routes) {
        const firstStop = route.stops[0];

        const targetPickup1Time = firstStop ? new Date(`${shiftDate}T00:00:00Z`) : new Date();
        const targetOfficeArrivalTime = new Date(`${shiftDate}T${shiftTime}:00Z`);

        const effectiveCategory = route.cabType?.toUpperCase() === 'SUV' ? 'SUV' : (vehicleCategory || 'SEDAN');
        const effectiveMaxCapacity = effectiveCategory === 'SUV' ? 6 : 4;

        const createdRoute = await tx.corporateRoute.create({
          data: {
            tenantId,
            officeId,
            shiftDate: new Date(shiftDate),
            shiftTime,
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
            latitude: plan.office.lat,
            longitude: plan.office.lng,
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

  private parseCsv(buffer: Buffer): { employeeName: string; pickupAddress: string; phoneNumber?: string; gender?: string; employeeId?: string }[] {
    const text = buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new BadRequestException('CSV requires a header row and at least one employee row');
    }

    const headers = lines[0].split(',').map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase().replace(/[\s-]+/g, '_'));
    const nameIdx = headers.findIndex((h) => h === 'employee_name' || h === 'name' || h === 'emp_name');
    const addrIdx = headers.findIndex((h) => h === 'pickup_address' || h === 'address' || h === 'location');
    const phoneIdx = headers.findIndex((h) => h === 'phone_number' || h === 'phone' || h === 'mobile');
    const genderIdx = headers.findIndex((h) => h === 'gender' || h === 'sex');

    if (nameIdx === -1 || addrIdx === -1) {
      throw new BadRequestException('CSV header must contain "employee_name" and "pickup_address" columns');
    }

    const results: { employeeName: string; pickupAddress: string; phoneNumber?: string; gender?: string; employeeId?: string }[] = [];
    const seenNames = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      // Split with quotes handling
      const row = this.parseCsvLine(lines[i]);
      const name = (row[nameIdx] || '').trim();
      const addr = (row[addrIdx] || '').trim();
      if (!name && !addr) continue;

      if (!name || !addr) {
        throw new BadRequestException(`Row ${i + 1} is missing employee_name or pickup_address`);
      }
      if (seenNames.has(name.toLowerCase())) {
        throw new BadRequestException(`Duplicate employee name detected: "${name}" at row ${i + 1}`);
      }
      seenNames.add(name.toLowerCase());

      results.push({
        employeeName: name,
        pickupAddress: addr,
        phoneNumber: phoneIdx !== -1 ? (row[phoneIdx] || '').trim() : undefined,
        gender: genderIdx !== -1 ? (row[genderIdx] || '').trim().toUpperCase() : undefined,
      });
    }

    return results;
  }

  private async parseExcel(buffer: Buffer): Promise<{ employeeName: string; pickupAddress: string; phoneNumber?: string; gender?: string; employeeId?: string }[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('Excel workbook contains no sheets');
    }

    const headerRow = sheet.getRow(1);
    const headers: { [key: number]: string } = {};
    headerRow.eachCell((cell, colNum) => {
      headers[colNum] = String(cell.value || '')
        .trim()
        .toLowerCase()
        .replace(/[*()]/g, '')
        .replace(/[\s-]+/g, '_');
    });

    let nameCol = -1;
    let addrCol = -1;
    let phoneCol = -1;
    let genderCol = -1;

    for (const [col, name] of Object.entries(headers)) {
      const c = Number(col);
      if (name.includes('name')) nameCol = c;
      if (name.includes('address') || name.includes('location')) addrCol = c;
      if (name.includes('phone') || name.includes('mobile')) phoneCol = c;
      if (name.includes('gender')) genderCol = c;
    }

    if (nameCol === -1 || addrCol === -1) {
      throw new BadRequestException('Excel sheet header must contain employee name and pickup address columns');
    }

    const results: { employeeName: string; pickupAddress: string; phoneNumber?: string; gender?: string }[] = [];
    const seen = new Set<string>();

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const name = String(row.getCell(nameCol).value || '').trim();
      const addr = String(row.getCell(addrCol).value || '').trim();
      if (!name && !addr) continue;
      if (!name || !addr) {
        throw new BadRequestException(`Row ${r} requires both employee name and pickup address`);
      }
      if (seen.has(name.toLowerCase())) {
        throw new BadRequestException(`Duplicate employee name: "${name}" at row ${r}`);
      }
      seen.add(name.toLowerCase());

      results.push({
        employeeName: name,
        pickupAddress: addr,
        phoneNumber: phoneCol !== -1 ? String(row.getCell(phoneCol).value || '').trim() : undefined,
        gender: genderCol !== -1 ? String(row.getCell(genderCol).value || '').trim().toUpperCase() : undefined,
      });
    }

    return results;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ''));
    return result;
  }
}
