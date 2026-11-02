import { Test, TestingModule } from '@nestjs/testing';
import * as ExcelJS from 'exceljs';
import { RosterTemplateService } from '../src/domains/corporate/rosters/roster-template.service';
import { RosterIngestionService } from '../src/domains/corporate/rosters/roster-ingestion.service';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';

describe('Corporate Roster Ingestion & Template Service', () => {
  let templateService: RosterTemplateService;
  let ingestionService: RosterIngestionService;

  const mockDb: any = {
    corporateTenant: {
      findUnique: jest.fn(),
    },
    corporateOffice: {
      findMany: jest.fn(),
    },
    corporateEmployee: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    corporateEmployeeLocation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    corporateRoster: {
      create: jest.fn(),
    },
    corporateTransportRequest: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockDb)),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RosterTemplateService,
        RosterIngestionService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    templateService = module.get<RosterTemplateService>(RosterTemplateService);
    ingestionService = module.get<RosterIngestionService>(RosterIngestionService);
  });

  describe('RosterTemplateService', () => {
    it('should generate a valid XLSX buffer with required header columns', async () => {
      const buffer = await templateService.generateTemplateBuffer();
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(1000);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const sheet = workbook.getWorksheet('Roster_Template');
      expect(sheet).toBeDefined();

      const headerRow = sheet!.getRow(1);
      const headers = headerRow.values as string[];

      expect(headers).toContain('employee_id*');
      expect(headers).toContain('full_name*');
      expect(headers).toContain('email*');
      expect(headers).toContain('phone_number*');
      expect(headers).toContain('gender*');
      expect(headers).toContain('office_code*');
      expect(headers).toContain('roster_date*');
      expect(headers).toContain('login_time');
      expect(headers).toContain('logout_time');
      expect(headers).toContain('home_address*');
    });
  });

  describe('RosterIngestionService - dryRunValidateRoster', () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';

    beforeEach(() => {
      mockDb.corporateTenant.findUnique.mockResolvedValue({
        id: tenantId,
        name: 'Acme Technologies Hyderabad',
        status: 'ACTIVE',
      });

      mockDb.corporateOffice.findMany.mockResolvedValue([
        {
          id: '22222222-2222-2222-2222-222222222222',
          code: 'HYD-HQ',
          latitude: 17.444,
          longitude: 78.377,
        },
      ]);
    });

    it('should successfully validate valid rows', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Roster');
      sheet.addRow([
        'employee_id*',
        'full_name*',
        'email*',
        'phone_number*',
        'gender*',
        'department',
        'cost_center',
        'office_code*',
        'roster_date*',
        'login_time',
        'logout_time',
        'home_address*',
        'landmark',
        'latitude',
        'longitude',
        'special_notes',
      ]);
      sheet.addRow([
        'EMP001',
        'Rahul Verma',
        'rahul.v@acme.com',
        '9876543210',
        'MALE',
        'Engineering',
        'CC-ENG',
        'HYD-HQ',
        '2026-11-10',
        '08:00',
        '17:00',
        'Flat 401, Cyber Towers, HITEC City',
        'Near Shilparamam',
        17.4504,
        78.3808,
        '',
      ]);

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const result = await ingestionService.dryRunValidateRoster(tenantId, buffer);

      expect(result.isValid).toBe(true);
      expect(result.totalRows).toBe(1);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(0);
      expect(result.loginRequestsCount).toBe(1);
      expect(result.logoutRequestsCount).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch errors when mandatory fields are missing or invalid', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Roster');
      sheet.addRow([
        'employee_id*',
        'full_name*',
        'email*',
        'phone_number*',
        'gender*',
        'department',
        'cost_center',
        'office_code*',
        'roster_date*',
        'login_time',
        'logout_time',
        'home_address*',
      ]);
      // Missing email, invalid phone, non-existent office
      sheet.addRow([
        '',
        'R',
        'invalid-email',
        '123',
        'INVALID_GENDER',
        '',
        '',
        'UNKNOWN_OFFICE',
        '2026-11-10',
        '',
        '',
        '',
      ]);

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const result = await ingestionService.dryRunValidateRoster(tenantId, buffer);

      expect(result.isValid).toBe(false);
      expect(result.validRows).toBe(0);
      expect(result.invalidRows).toBe(1);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);

      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain('employee_id');
      expect(fields).toContain('full_name');
      expect(fields).toContain('email');
      expect(fields).toContain('phone_number');
      expect(fields).toContain('gender');
      expect(fields).toContain('office_code');
    });

    it('should reject internal duplicate shift bookings for same employee', async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Roster');
      sheet.addRow([
        'employee_id*',
        'full_name*',
        'email*',
        'phone_number*',
        'gender*',
        'department',
        'cost_center',
        'office_code*',
        'roster_date*',
        'login_time',
        'logout_time',
        'home_address*',
        'landmark',
        'latitude',
        'longitude',
      ]);
      sheet.addRow([
        'EMP001',
        'Rahul Verma',
        'rahul.v@acme.com',
        '9876543210',
        'MALE',
        'Eng',
        'CC1',
        'HYD-HQ',
        '2026-11-10',
        '08:00',
        '',
        'Kondapur Hyderabad',
        '',
        17.46,
        78.36,
      ]);
      sheet.addRow([
        'EMP001',
        'Rahul Verma',
        'rahul.v@acme.com',
        '9876543210',
        'MALE',
        'Eng',
        'CC1',
        'HYD-HQ',
        '2026-11-10',
        '08:00',
        '',
        'Kondapur Hyderabad',
        '',
        17.46,
        78.36,
      ]);

      const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      const result = await ingestionService.dryRunValidateRoster(tenantId, buffer);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.toLowerCase().includes('duplicate login request'))).toBe(true);
    });
  });
});
