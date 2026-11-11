import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { GoogleGeocodingAdapter } from '../src/domains/corporate/routing/google-geocoding.adapter';
import { GoogleRoutesV2Adapter } from '../src/domains/corporate/routing/google-routes-v2.adapter';
import * as XLSX from '@e965/xlsx';
import {
  CorporateRoutePlannerService,
  PlanRoutesFromFileOptions,
} from '../src/domains/corporate/routing/corporate-route-planner.service';
import {
  clusterEmployees,
  EmployeeRecord,
} from '../src/domains/corporate/routing/cvrptw-cluster-solver';
import {
  generateSampleCsv,
  generateSampleExcelBuffer,
} from '../src/domains/corporate/routing/sample-roster-generator';
import {
  DEFAULT_PRICING_CONFIG,
  selectCheapestCab,
} from '../src/domains/corporate/routing/cost-optimizer';

describe('Corporate ETS - Route Planner Engine & Spatial Clustering Suite', () => {
  jest.setTimeout(45000);
  let service: CorporateRoutePlannerService;
  let geocodingAdapter: GoogleGeocodingAdapter;

  const redisStore = new Map<string, string>();
  const mockRedisService = {
    get: jest.fn().mockImplementation(async (key: string) => redisStore.get(key) || null),
    set: jest.fn().mockImplementation(async (key: string, val: string) => {
      redisStore.set(key, val);
      return 'OK';
    }),
  };

  const mockDbService = {
    $transaction: jest.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
      const mockTx = {
        corporateRoute: {
          create: jest.fn().mockImplementation(async ({ data }: any) => ({
            id: 'mock-route-id-' + Math.random().toString(36).substring(2, 7),
            ...data,
          })),
        },
        corporateRouteStop: {
          create: jest.fn().mockImplementation(async ({ data }: any) => ({
            id: 'mock-stop-id-' + Math.random().toString(36).substring(2, 7),
            ...data,
          })),
        },
      };
      return cb(mockTx);
    }),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateRoutePlannerService,
        GoogleGeocodingAdapter,
        GoogleRoutesV2Adapter,
        { provide: RedisService, useValue: mockRedisService },
        { provide: DatabaseService, useValue: mockDbService },
      ],
    }).compile();

    service = module.get<CorporateRoutePlannerService>(CorporateRoutePlannerService);
    geocodingAdapter = module.get<GoogleGeocodingAdapter>(GoogleGeocodingAdapter);
  });

  describe('Automatic vehicle assignment', () => {
    it.each([1, 2, 3])('assigns %i riders to a sedan', (passengers) => {
      expect(selectCheapestCab(20, passengers, DEFAULT_PRICING_CONFIG)?.name).toBe('sedan');
    });

    it('does not exhaust default cab availability on large rosters', () => {
      const fleetUsed: Record<string, number> = {};

      for (let route = 0; route < 100; route++) {
        const cab = selectCheapestCab(20, 6, DEFAULT_PRICING_CONFIG, fleetUsed);

        expect(cab?.name).toBe('suv');
        if (cab) fleetUsed[cab.name] = (fleetUsed[cab.name] || 0) + 1;
      }
    });

    describe('Spreadsheet roster ingestion', () => {
      const formats: Array<{ extension: string; bookType: XLSX.BookType }> = [
        { extension: 'xlsx', bookType: 'xlsx' },
        { extension: 'xlsm', bookType: 'xlsm' },
        { extension: 'xlsb', bookType: 'xlsb' },
        { extension: 'xls', bookType: 'biff8' },
        { extension: 'ods', bookType: 'ods' },
      ];

      it.each(formats)('reads .$extension workbooks and combines roster worksheets', async ({ bookType }) => {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet([['Notes'], ['Roster rows are on another worksheet']]),
          'Notes',
        );
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet([
            ['employee_name', 'pickup_address', 'office_address', 'required_arrival_date', 'required_arrival_time'],
            ['Employee One', 'Hitec City, Hyderabad', 'Mindspace IT Park, Hitec City, Hyderabad', '2099-01-02', '08:00'],
          ]),
          'Morning Roster',
        );
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet([
            ['employee_name', 'pickup_address', 'office_address', 'required_arrival_date', 'required_arrival_time'],
            ['Employee Two', 'Madhapur, Hyderabad', 'Financial District, Hyderabad', '2099-01-02', '09:00'],
          ]),
          'Evening Roster',
        );
        const fileBuffer = Buffer.from(XLSX.write(workbook, { bookType, type: 'buffer' }));

        const parsed = await (service as any).parseExcel(fileBuffer);

        expect(parsed.rows.map((row: { employeeName: string }) => row.employeeName)).toEqual([
          'Employee One',
          'Employee Two',
        ]);
        expect(parsed.rows.map((row: { pickupAddress: string }) => row.pickupAddress)).toEqual([
          'Hitec City, Hyderabad',
          'Madhapur, Hyderabad',
        ]);
      });

      it('recognizes Copart-style pickup headings, title rows, and separate first/last name columns', async () => {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet([
            ['Copart Employee Schedule'],
            ['First Name', 'Last Name', 'Employee Home Address', 'Office Location', 'Required Arrival Date', 'Required Arrival Time'],
            ['Aarav', 'Deshmukh', 'Kondapur, Hyderabad', 'Financial District, Hyderabad', '2099-01-02', '08:00'],
          ]),
          'Copart Employee Schedule',
        );

        const parsed = await (service as any).parseExcel(
          Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })),
        );

        expect(parsed.rows).toHaveLength(1);
        expect(parsed.rows[0]).toMatchObject({
          employeeName: 'Aarav Deshmukh',
          pickupAddress: 'Kondapur, Hyderabad',
          officeAddress: 'Financial District, Hyderabad',
        });
      });

      it('accepts an employee login time without an arrival date', () => {
        const csv = [
          'employee_name,pickup_address,office_address,employee_login_time',
          '"Login Time Employee","Kondapur, Hyderabad","Mindspace IT Park, Hyderabad","08:30 AM"',
        ].join('\n');
        const parsedRoster = (service as any).parseCsv(Buffer.from(csv));

        expect(parsedRoster.rows[0].arrivalDateTime).toBe('08:30 AM');
        const loginDateTime = (service as any).parseArrivalDateTime(parsedRoster.rows[0].arrivalDateTime) as Date;
        const parts = Object.fromEntries(
          new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          })
            .formatToParts(loginDateTime)
            .map(({ type, value }) => [type, value]),
        );

        expect(loginDateTime.getTime()).toBeGreaterThan(Date.now());
        expect(parts.hour).toBe('08');
        expect(parts.minute).toBe('30');
      });

      it('provides actual worksheet headings when no pickup column can be recognized', async () => {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet([
            ['Employee Name', 'Office Address'],
            ['Aarav Deshmukh', 'Financial District, Hyderabad'],
          ]),
          'Employee Schedule',
        );

        let error: Error | undefined;
        try {
          await (service as any).parseExcel(
            Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })),
          );
        } catch (caught) {
          error = caught as Error;
        }
        expect(error?.message).toContain('Found headings: employee_name, office_address');
      });

      it('excludes every row for a duplicated name across worksheets', async () => {
        const workbook = XLSX.utils.book_new();
        const headers = [
          'employee_name',
          'pickup_address',
          'office_address',
          'required_arrival_date',
          'required_arrival_time',
        ];
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet([headers, ['Aarav Deshmukh', 'Address One']]),
          'Main Roster',
        );
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet([headers, ['  aarav   deshmukh ', 'Address Two']]),
          'Duplicate Roster',
        );

        const parsed = await (service as any).parseExcel(
          Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })),
        );

        expect(parsed.rows).toHaveLength(0);
        expect(parsed.duplicateEmployeeNames).toEqual(['Aarav Deshmukh']);
      });

      it('reports duplicate names before rejecting a roster with no unique employees', async () => {
        const csv = [
          'employee_name,pickup_address,office_address,required_arrival_date,required_arrival_time',
          '"Aarav Deshmukh","Address One","Office","2099-01-02","08:00"',
          '" aarav   deshmukh ","Address Two","Office","2099-01-02","08:00"',
        ].join('\n');
        const onProgress = jest.fn();

        await expect(service.planFromFile(Buffer.from(csv), 'duplicate.csv', {}, onProgress)).rejects.toThrow(
          'no valid employee pickup rows',
        );
        expect(onProgress).toHaveBeenCalledWith(
          'duplicates_excluded',
          3,
          expect.stringContaining('Aarav Deshmukh'),
          { duplicateEmployeeNames: ['Aarav Deshmukh'] },
        );
      });

      it('rejects unsupported roster file extensions', async () => {
        await expect(service.planFromFile(Buffer.from('not a roster'), 'employees.pdf', {})).rejects.toThrow(
          'Unsupported roster file type',
        );
      });
    });

    it.each([4, 5, 6])('assigns %i riders to an SUV', (passengers) => {
      expect(selectCheapestCab(20, passengers, DEFAULT_PRICING_CONFIG)?.name).toBe('suv');
    });

    it('does not assign more than six riders to a sedan or SUV', () => {
      expect(selectCheapestCab(20, 7, DEFAULT_PRICING_CONFIG)).toBeNull();
    });
  });

  describe('Google Routes toll avoidance and distance preference', () => {
    it('sends the shortest-distance preference and toll avoidance modifier to Google', async () => {
      const previousApiKey = process.env.GOOGLE_MAPS_API_KEY;
      process.env.GOOGLE_MAPS_API_KEY = 'test-api-key';
      const adapter = new GoogleRoutesV2Adapter();
      const postJson = jest.spyOn(adapter as any, 'postJson').mockResolvedValue({
        routes: [{ duration: '300s', distanceMeters: 9000, legs: [], polyline: { encodedPolyline: '' } }],
      });

      try {
        await adapter.computeRoute(
          { lat: 17.4, lng: 78.4 },
          [{ lat: 17.41, lng: 78.41 }],
          { lat: 17.42, lng: 78.42 },
          new Date('2026-11-10T08:00:00Z'),
          { routingPreference: 'TRAFFIC_UNAWARE', avoidTolls: true },
        );

        const payload = JSON.parse(String(postJson.mock.calls[0][2]));
        expect(payload.routingPreference).toBe('TRAFFIC_UNAWARE');
        expect(payload.routeModifiers).toEqual({ avoidTolls: true, avoidHighways: false });
      } finally {
        postJson.mockRestore();
        if (previousApiKey === undefined) {
          delete process.env.GOOGLE_MAPS_API_KEY;
        } else {
          process.env.GOOGLE_MAPS_API_KEY = previousApiKey;
        }
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Geocoding & Redis Caching', () => {
    it('should geocode office destination and cache coordinates in memory and Redis', async () => {
      const address = 'Mindspace IT Park, Hitec City, Hyderabad';
      const result = await geocodingAdapter.geocode(address);

      expect(result).toBeDefined();
      expect(result.lat).toBeCloseTo(17.44, 1);
      expect(result.lng).toBeCloseTo(78.38, 1);

      // Second call should hit cache without network lookup
      const cached = await geocodingAdapter.geocode(address);
      expect(cached.lat).toBe(result.lat);
      expect(cached.lng).toBe(result.lng);
    });

    it('should batch geocode multiple unique employee pickup addresses', async () => {
      const addresses = [
        'Aparna Sarovar, Nallagandla, Hyderabad',
        'My Home Bhooja, Silpa Gram, Madhapur, Hyderabad',
        'Prestige High Fields, Financial District, Hyderabad',
      ];

      const resultMap = await geocodingAdapter.batchGeocode(addresses);
      expect(resultMap.size).toBe(3);
      for (const addr of addresses) {
        const item = resultMap.get(addr.toLowerCase());
        expect(item).toBeDefined();
        expect(item?.lat).toBeGreaterThan(17.0);
        expect(item?.lng).toBeGreaterThan(78.0);
      }
    });
  });

  describe('2. Spatial Proximity & Radial Spread Clustering', () => {
    it('should cluster employees into vehicle capacity groups using pairwise km and radial spread', () => {
      const mockEmployees: EmployeeRecord[] = [
        {
          employeeName: 'Emp 1',
          pickupAddress: 'Hitec City',
          coord: { lat: 17.4435, lng: 78.3772 },
          matchedAddress: 'Hitec City',
          officeDistanceKm: 2.1,
          outOfRadius: false,
        },
        {
          employeeName: 'Emp 2',
          pickupAddress: 'Madhapur',
          coord: { lat: 17.4483, lng: 78.3915 },
          matchedAddress: 'Madhapur',
          officeDistanceKm: 3.5,
          outOfRadius: false,
        },
        {
          employeeName: 'Emp 3',
          pickupAddress: 'Kondapur',
          coord: { lat: 17.4699, lng: 78.3578 },
          matchedAddress: 'Kondapur',
          officeDistanceKm: 5.2,
          outOfRadius: false,
        },
        {
          employeeName: 'Emp 4',
          pickupAddress: 'Gachibowli',
          coord: { lat: 17.4401, lng: 78.3489 },
          matchedAddress: 'Gachibowli',
          officeDistanceKm: 6.0,
          outOfRadius: false,
        },
        {
          employeeName: 'Emp 5',
          pickupAddress: 'Kukatpally',
          coord: { lat: 17.4947, lng: 78.3996 },
          matchedAddress: 'Kukatpally',
          officeDistanceKm: 11.2,
          outOfRadius: false,
        },
      ];

      const groups = clusterEmployees(mockEmployees, 4);

      // 5 employees with capacity 4 -> exactly 2 groups (4 + 1)
      expect(groups.length).toBe(2);
      expect(groups[0].length).toBeLessThanOrEqual(4);
      expect(groups[1].length).toBeLessThanOrEqual(4);
      const totalGrouped = groups.reduce((acc, g) => acc + g.length, 0);
      expect(totalGrouped).toBe(5);
    });
  });

  describe('3. Multi-Stop Traffic Routing & Iterative Departure Solver', () => {
    it('should plan separate routes by each employee row office and required arrival time', async () => {
      const csv = [
        'employee_name,pickup_address,office_address,required_arrival_date,required_arrival_time',
        '"Employee One","Hitec City, Hyderabad","Mindspace IT Park, Hitec City, Hyderabad","2099-01-02","08:00"',
        '"Employee Two","Madhapur, Hyderabad","Financial District, Hyderabad","2099-01-02","09:00"',
      ].join('\n');

      const result = await service.planFromFile(Buffer.from(csv), 'employee-routes.csv', {
        cabCapacity: 4,
        maxTripKm: 500,
      });

      expect(result.employeeCount).toBe(2);
      expect(result.routes).toHaveLength(2);
      expect(result.offices.map(({ name }) => name).sort()).toEqual([
        'Financial District, Hyderabad',
        'Mindspace IT Park, Hitec City, Hyderabad',
      ]);
      expect(result.routes.map(({ office }) => office.name).sort()).toEqual([
        'Financial District, Hyderabad',
        'Mindspace IT Park, Hitec City, Hyderabad',
      ]);
      expect(result.routes.map(({ requiredArrival }) => requiredArrival).sort()).toEqual(['8:00 AM', '9:00 AM']);
    });

    it('should calculate departure time, leg ETAs, 5-min dwell buffers, and arrival time', async () => {
      const csv = generateSampleCsv();
      const csvBuffer = Buffer.from(csv, 'utf-8');

      const loginTime = new Date('2026-11-10T08:00:00Z');
      const options: PlanRoutesFromFileOptions = {
        office: 'Mindspace IT Park, Hitec City, Hyderabad',
        loginTime,
        officeRadiusKm: 50,
        bufferMinutes: 15,
        pickupWaitMinutes: 5,
        cabCapacity: 6,
        routingPreference: 'TRAFFIC_AWARE',
      };

      const result = await service.planFromFile(csvBuffer, 'employees.csv', options);

      expect(result).toBeDefined();
      expect(result.employeeCount).toBe(12);
      expect(result.cabCount).toBeGreaterThanOrEqual(2);
      expect(result.routes).toHaveLength(result.cabCount);
      expect(result.routes.reduce((count, route) => count + route.stops.length, 0)).toBe(result.employeeCount);

      for (const route of result.routes) {
        expect(route.stops.length).toBeLessThanOrEqual(6);
        expect(route.cabType).toBe(route.stops.length <= 3 ? 'sedan' : 'suv');
        expect(route.departure).toBeDefined();
        expect(route.arrival).toBeDefined();
        expect(route.distanceKm).toBeGreaterThanOrEqual(0);
        expect(route.driveMinutes).toBeGreaterThan(0);
        expect(route.status).toBe('Meets deadline');
        expect(route.path.length).toBeGreaterThan(0);

        // Every stop must have dwell interval and OTP
        for (const stop of route.stops) {
          expect(stop.eta).toBeDefined();
          expect(stop.dwellUntil).toBeDefined();
          expect(stop.boardingOtp).toBeDefined();
          expect(stop.boardingOtp?.length).toBe(4);
        }
      }
    });

    it('should flag employees outside office catchment radius with alert', async () => {
      const csv = `employee_name,pickup_address\n"Local Employee","Hitec City, Hyderabad"\n"Far Employee","Shamshabad Airport, Hyderabad"`;
      const csvBuffer = Buffer.from(csv, 'utf-8');

      const options: PlanRoutesFromFileOptions = {
        office: 'Hitec City, Hyderabad',
        loginTime: new Date('2026-11-10T08:00:00Z'),
        officeRadiusKm: 10, // strict 10km radius
        bufferMinutes: 15,
        pickupWaitMinutes: 5,
        cabCapacity: 4,
      };

      const result = await service.planFromFile(csvBuffer, 'employees.csv', options);
      expect(result.employeeCount).toBe(2);
      expect(result.outOfRadiusCount).toBeGreaterThanOrEqual(1);

      const farStop = result.routes.flatMap((r) => r.stops).find((s) => s.name === 'Far Employee');
      expect(farStop).toBeDefined();
      expect(farStop?.outOfRadius).toBe(true);
    });
  });

  describe('4. Commit to Database & Export Workflow', () => {
    it('should commit calculated route plan into PostgreSQL database', async () => {
      const csv = generateSampleCsv();
      const plan = await service.planFromFile(Buffer.from(csv), 'sample.csv', {
        office: 'Mindspace IT Park, Hitec City',
        loginTime: new Date('2026-11-10T08:00:00Z'),
        cabCapacity: 4,
      });

      const commitResult = await service.commitPlanToDatabase({
        tenantId: '00000000-0000-4000-8000-000000000001',
        officeId: '00000000-0000-4000-8000-000000000002',
        shiftDate: '2026-11-10',
        shiftTime: '08:00',
        direction: 'LOGIN',
        vehicleCategory: 'SEDAN',
        plan,
      });

      expect(commitResult.routesCreated).toBe(plan.cabCount);
      expect(commitResult.stopsCreated).toBe(plan.employeeCount + plan.cabCount);
      expect(mockDbService.$transaction).toHaveBeenCalled();
    });

    it('should reject committing a plan with multiple office destinations', async () => {
      await expect(
        service.commitPlanToDatabase({
          tenantId: '00000000-0000-4000-8000-000000000001',
          officeId: '00000000-0000-4000-8000-000000000002',
          shiftDate: '2026-11-10',
          shiftTime: '08:00',
          direction: 'LOGIN',
          plan: {
            office: { name: 'Office A', lat: 17.44, lng: 78.38 },
            routes: [
              { office: { name: 'Office A', lat: 17.44, lng: 78.38 }, stops: [] },
              { office: { name: 'Office B', lat: 17.45, lng: 78.39 }, stops: [] },
            ],
          } as any,
        }),
      ).rejects.toThrow('Plans with multiple office destinations cannot be committed');
      expect(mockDbService.$transaction).not.toHaveBeenCalled();
    });

    it('should generate downloadable sample Excel and CSV templates', async () => {
      const sampleCsv = generateSampleCsv();
      expect(sampleCsv).toContain('employee_name,pickup_address,office_address,required_arrival_date,required_arrival_time');
      expect(sampleCsv).toContain('Aarav Sharma');
      expect(sampleCsv).toContain('Mindspace IT Park, Hitec City, Hyderabad');

      const sampleExcel = await generateSampleExcelBuffer();
      expect(sampleExcel).toBeInstanceOf(Buffer);
      expect(sampleExcel.length).toBeGreaterThan(1000);
    });

    it('should export calculated plan into formatted multi-sheet Excel file', async () => {
      const csv = generateSampleCsv();
      const plan = await service.planFromFile(Buffer.from(csv), 'sample.csv', {
        office: 'Mindspace IT Park, Hitec City',
        loginTime: new Date('2026-11-10T08:00:00Z'),
        cabCapacity: 4,
      });

      const excelBuffer = await service.exportPlanToExcel(plan);
      expect(excelBuffer).toBeInstanceOf(Buffer);
      expect(excelBuffer.length).toBeGreaterThan(1500);
    });
  });
});
