/**
 * Corporate ETS - Routing Engine Controller & Wire Integration Suite
 *
 * Validates CorporateRoutingController HTTP endpoints:
 * 1. planFromFile: multipart upload, parsing, geocoding, clustering, traffic routing
 * 2. planStream: Server-Sent Events (SSE) streaming progress
 * 3. commitPlan: atomic database persistence of planned routes and stops
 * 4. downloadSampleTemplate: XLSX and CSV binary delivery
 * 5. exportPlanToExcel: multi-sheet formatted workbook export
 * 6. Access control and @CorporateTenantScoped metadata enforcement
 */
import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { CorporateRoutingController } from '../src/domains/corporate/routing/corporate-routing.controller';
import { CorporateRoutePlannerService } from '../src/domains/corporate/routing/corporate-route-planner.service';
import { GoogleGeocodingAdapter } from '../src/domains/corporate/routing/google-geocoding.adapter';
import { GoogleRoutesV2Adapter } from '../src/domains/corporate/routing/google-routes-v2.adapter';
import { generateSampleCsv } from '../src/domains/corporate/routing/sample-roster-generator';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { CORPORATE_TENANT_SCOPED_KEY } from '../src/common/decorators/corporate-resource.decorator';

function createMockExpressResponse() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let bodyData: any = null;
  const writtenChunks: string[] = [];

  const res: any = {
    statusCode,
    headers,
    setHeader: jest.fn((k: string, v: string) => {
      headers[k.toLowerCase()] = v;
      return res;
    }),
    status: jest.fn((code: number) => {
      statusCode = code;
      res.statusCode = code;
      return res;
    }),
    send: jest.fn((data: any) => {
      bodyData = data;
      return res;
    }),
    write: jest.fn((chunk: string) => {
      writtenChunks.push(chunk);
      return true;
    }),
    flushHeaders: jest.fn(),
    end: jest.fn(),
    _getData: () => bodyData,
    _getWrittenChunks: () => writtenChunks,
  };
  return res;
}

describe('Corporate ETS - Routing Planner Controller & Wire Suite', () => {
  let controller: CorporateRoutingController;
  let plannerService: CorporateRoutePlannerService;
  let mockGeocoding: GoogleGeocodingAdapter;
  let mockRoutes: GoogleRoutesV2Adapter;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      corporateRoute: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'route-test-101', ...data })),
      },
      corporateRouteStop: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'stop-test-101', ...data })),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(mockDb)),
    };

    mockGeocoding = {
      geocode: jest.fn().mockResolvedValue({
        lat: 17.4435,
        lng: 78.3772,
        matchedAddress: 'Mindspace IT Park, Hitec City, Hyderabad',
        partialMatch: false,
        isRealGeocode: true,
      }),
      batchGeocode: jest.fn().mockResolvedValue(
        new Map([
          [
            'kondapur, hyderabad',
            {
              lat: 17.4699,
              lng: 78.3578,
              matchedAddress: 'Kondapur, Hyderabad',
              partialMatch: false,
              isRealGeocode: true,
            },
          ],
          [
            'gachibowli, hyderabad',
            {
              lat: 17.4401,
              lng: 78.3489,
              matchedAddress: 'Gachibowli, Hyderabad',
              partialMatch: false,
              isRealGeocode: true,
            },
          ],
        ]),
      ),
    } as any;

    mockRoutes = {
      computeRoute: jest.fn().mockResolvedValue({
        distanceMeters: 14200,
        durationSeconds: 1800,
        polyline: 'w{cmEayw_Nh@?b@?~A',
        legDurations: [600, 1200],
        legs: [
          { durationSeconds: 600, distanceMeters: 5000 },
          { durationSeconds: 1200, distanceMeters: 9200 },
        ],
      }),
    } as any;

    plannerService = new CorporateRoutePlannerService(mockGeocoding, mockRoutes, mockDb);
    controller = new CorporateRoutingController({} as any, mockDb, plannerService);
  });

  // -------------------------------------------------------------------------
  // 1. Synchronous planFromFile Endpoint
  // -------------------------------------------------------------------------
  describe('POST /corporate/routes/plan-from-file', () => {
    it('should throw BadRequestException if file is missing or empty', async () => {
      await expect(
        controller.planFromFile(null as any, { office: 'Mindspace', deadline: '2026-11-10T08:00' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.planFromFile({ buffer: null } as any, { office: 'Mindspace', deadline: '2026-11-10T08:00' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if office address is missing', async () => {
      const csv = generateSampleCsv();
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from(csv),
        originalname: 'roster.csv',
      } as any;

      await expect(
        controller.planFromFile(mockFile, { office: '', deadline: '2026-11-10T08:00' }),
      ).rejects.toThrow('office address is required');
    });

    it('should throw BadRequestException if deadline is missing', async () => {
      const csv = generateSampleCsv();
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from(csv),
        originalname: 'roster.csv',
      } as any;

      await expect(
        controller.planFromFile(mockFile, { office: 'Mindspace', deadline: '' }),
      ).rejects.toThrow('loginTime (or deadline) is required');
    });

    it('should plan routes successfully from valid CSV file buffer', async () => {
      const csv = generateSampleCsv();
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from(csv),
        originalname: 'sample-pickups.csv',
      } as any;

      const result = await controller.planFromFile(mockFile, {
        office: 'Mindspace IT Park, Hitec City, Hyderabad',
        deadline: '2026-11-10T08:00',
        cabCapacity: '4',
        officeRadiusKm: '50',
      });

      expect(result).toBeDefined();
      expect(result.employeeCount).toBeGreaterThanOrEqual(1);
      expect(result.cabCount).toBeGreaterThanOrEqual(1);
      expect(result.routes).toBeInstanceOf(Array);
      expect(result.routes[0]).toHaveProperty('cab', 1);
      expect(result.routes[0]).toHaveProperty('stops');
    });
  });

  // -------------------------------------------------------------------------
  // 2. Server-Sent Events (SSE) Streaming Endpoint
  // -------------------------------------------------------------------------
  describe('POST /corporate/routes/plan-stream', () => {
    it('should stream real-time progress events over text/event-stream and end', async () => {
      const csv = generateSampleCsv();
      const mockFile: Express.Multer.File = {
        buffer: Buffer.from(csv),
        originalname: 'sample.csv',
      } as any;

      const res = createMockExpressResponse();

      await controller.planStream(
        mockFile,
        {
          office: 'Mindspace IT Park, Hitec City',
          deadline: '2026-11-10T08:00',
          cabCapacity: '4',
        },
        res,
      );

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(res.end).toHaveBeenCalled();

      const chunks = res._getWrittenChunks();
      expect(chunks.length).toBeGreaterThan(0);

      // Verify that progress events and completion events were streamed
      const combined = chunks.join('');
      expect(combined).toContain('event: progress');
      expect(combined).toContain('event: complete');
      expect(combined).toContain('Route calculation completed successfully!');
    });
  });

  // -------------------------------------------------------------------------
  // 3. Database Route Plan Commit
  // -------------------------------------------------------------------------
  describe('POST /corporate/routes/commit-plan', () => {
    it('should validate required fields and persist routes and stops atomically', async () => {
      await expect(
        controller.commitPlan({
          tenantId: '',
          officeId: '',
          shiftDate: '',
          shiftTime: '',
          direction: 'LOGIN',
          plan: null as any,
        }),
      ).rejects.toThrow(BadRequestException);

      const planMock: any = {
        employeeCount: 2,
        cabCount: 1,
        officeRadiusKm: 50,
        outOfRadiusCount: 0,
        bufferedDeadline: '07:45',
        office: { name: 'Mindspace', lat: 17.44, lng: 78.38 },
        routes: [
          {
            cab: 1,
            passengerCount: 2,
            departureTime: '06:45',
            arrivalTime: '07:45',
            totalRideMinutes: 60,
            directDistanceKm: 18.5,
            roadDistanceKm: 22.1,
            status: 'Meets deadline',
            bufferStatus: '15m buffer intact',
            sequence: 'A -> B -> HQ',
            stops: [
              {
                stopSequence: 1,
                name: 'Employee 1',
                pickupAddress: 'Kondapur, Hyderabad',
                matchedAddress: 'Kondapur, Hyderabad',
                lat: 17.46,
                lng: 78.35,
                eta: '06:45',
                dwellUntil: '06:50',
                distanceToNextKm: 5,
                travelToNextMinutes: 15,
                officeDistanceKm: 8,
                outOfRadius: false,
              },
            ],
          },
        ],
      };

      const commitResult = await controller.commitPlan({
        tenantId: 'tenant-acme-1',
        officeId: 'office-hyd-1',
        shiftDate: '2026-11-10',
        shiftTime: '08:00',
        direction: 'LOGIN',
        plan: planMock,
      });

      expect(commitResult).toEqual({
        routesCreated: 1,
        stopsCreated: 2,
      });
      expect(mockDb.corporateRoute.create).toHaveBeenCalled();
      expect(mockDb.corporateRouteStop.create).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 4. Sample Template Generation
  // -------------------------------------------------------------------------
  describe('GET /corporate/routes/sample-template', () => {
    it('should return CSV text when format=csv is queried', async () => {
      const res = createMockExpressResponse();
      await controller.downloadSampleTemplate('csv', res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="sample-employee-pickups.csv"',
      );
      expect(res.send).toHaveBeenCalled();
      const csvData = res._getData();
      expect(csvData).toContain('employee_name');
      expect(csvData).toContain('pickup_address');
    });

    it('should return XLSX binary buffer when format is xlsx or omitted', async () => {
      const res = createMockExpressResponse();
      await controller.downloadSampleTemplate('xlsx', res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="sample-employee-pickups.xlsx"',
      );
      expect(res.send).toHaveBeenCalled();
      const buffer = res._getData();
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Excel Export Endpoint
  // -------------------------------------------------------------------------
  describe('POST /corporate/routes/export-plan', () => {
    it('should validate plan object and export multi-sheet formatted workbook', async () => {
      const res = createMockExpressResponse();

      await expect(controller.exportPlanToExcel(null as any, res)).rejects.toThrow(BadRequestException);

      const planMock: any = {
        employeeCount: 2,
        cabCount: 1,
        officeRadiusKm: 50,
        outOfRadiusCount: 0,
        bufferedDeadline: '07:45',
        office: { name: 'Mindspace Hub', lat: 17.44, lng: 78.38 },
        routes: [
          {
            cab: 1,
            passengerCount: 2,
            departureTime: '06:45',
            arrivalTime: '07:45',
            totalRideMinutes: 60,
            directDistanceKm: 18.5,
            roadDistanceKm: 22.1,
            status: 'Meets deadline',
            bufferStatus: '15m buffer intact',
            sequence: 'A -> B -> HQ',
            stops: [
              {
                stopSequence: 1,
                name: 'Sneha Reddy',
                pickupAddress: 'Kondapur, Hyderabad',
                matchedAddress: 'Kondapur, Hyderabad',
                lat: 17.46,
                lng: 78.35,
                eta: '06:45',
                dwellUntil: '06:50',
                distanceToNextKm: 5,
                travelToNextMinutes: 15,
                officeDistanceKm: 8,
                outOfRadius: false,
              },
            ],
          },
        ],
      };

      await controller.exportPlanToExcel(planMock, res);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.send).toHaveBeenCalled();
      const buffer = res._getData();
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Security & Scoping Annotations Verification
  // -------------------------------------------------------------------------
  describe('Security & Scoping Annotations', () => {
    it('every public endpoint has @Roles and @CorporateTenantScoped', () => {
      const proto = CorporateRoutingController.prototype;
      const methods = ['planFromFile', 'planStream', 'commitPlan', 'downloadSampleTemplate', 'exportPlanToExcel', 'optimizeRoutes'];

      for (const m of methods) {
        const roles = Reflect.getMetadata(ROLES_KEY, (proto as any)[m]);
        expect(roles).toBeDefined();
        expect(roles.length).toBeGreaterThan(0);

        const scoped = Reflect.getMetadata(CORPORATE_TENANT_SCOPED_KEY, (proto as any)[m]);
        expect(scoped).toBe(true);
      }
    });
  });
});
