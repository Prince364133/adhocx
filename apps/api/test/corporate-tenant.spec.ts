import { CorporateTenantService } from '../src/domains/corporate/tenants/corporate-tenant.service';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { H3Service } from '../src/modules/locations/h3.service';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('CorporateTenantService', () => {
  let service: CorporateTenantService;
  let mockDb: any;
  let mockAudit: any;
  let mockH3Service: any;

  beforeEach(() => {
    mockDb = {
      corporateTenant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      corporateOffice: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      corporateEmployee: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      corporateEmployeeLocation: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockDb)),
    };

    mockAudit = {
      log: jest.fn(),
    };

    mockH3Service = {
      latLngToCell: jest.fn(
        (lat: number, lng: number, res: number) =>
          `h3_hex_${res}_${lat.toFixed(2)}_${lng.toFixed(2)}`,
      ),
    };

    service = new CorporateTenantService(
      mockDb as unknown as DatabaseService,
      mockAudit as unknown as AuditService,
      mockH3Service as unknown as H3Service,
    );
  });

  describe('Tenant Onboarding', () => {
    it('lists companies with profile overview data and normalized office coordinates', async () => {
      mockDb.corporateTenant.count.mockResolvedValue(1);
      mockDb.corporateTenant.findMany.mockResolvedValue([
        {
          id: 'tenant-101',
          code: 'ACME',
          name: 'Acme',
          legalEntityName: 'Acme Ltd',
          status: 'ACTIVE',
          offices: [{ id: 'office-1', latitude: '17.4', longitude: '78.4' }],
        },
      ]);

      const result = await service.listTenants({ page: 1, limit: 20 });

      expect(mockDb.corporateTenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            offices: expect.objectContaining({ take: 10 }),
            policies: expect.objectContaining({ take: 1 }),
            users: expect.objectContaining({ take: 5 }),
            _count: { select: { offices: true, employees: true, routes: true } },
          }),
        }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].offices[0]).toMatchObject({ latitude: 17.4, longitude: 78.4 });
      expect(result.pagination.total).toBe(1);
    });

    it('should create a corporate tenant with uppercase code', async () => {
      mockDb.corporateTenant.findUnique.mockResolvedValue(null);
      mockDb.corporateTenant.create.mockResolvedValue({
        id: 'tenant-101',
        code: 'ACME',
        name: 'Acme Technologies',
        legalEntityName: 'Acme Tech India Pvt Ltd',
        gstin: '36AAACA1234A1Z5',
        status: 'ACTIVE',
      });

      const result = await service.createTenant({
        code: 'acme',
        name: 'Acme Technologies',
        legalEntityName: 'Acme Tech India Pvt Ltd',
        gstin: '36AAACA1234A1Z5',
      });

      expect(mockDb.corporateTenant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'ACME',
          status: 'ACTIVE',
        }),
      });
      expect(result.id).toBe('tenant-101');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CORPORATE_TENANT_CREATED' }),
      );
    });

    it('should throw ConflictException if tenant code is already registered', async () => {
      mockDb.corporateTenant.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.createTenant({
          code: 'ACME',
          name: 'Acme Dupe',
          legalEntityName: 'Acme Dupe Pvt Ltd',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Office Campus Management', () => {
    it('should create an office campus and compute H3 Res 8 index', async () => {
      mockDb.corporateTenant.findUnique.mockResolvedValue({ id: 'tenant-101' });
      mockDb.corporateOffice.create.mockResolvedValue({
        id: 'office-1',
        tenantId: 'tenant-101',
        code: 'HYD_HQ',
        name: 'Hyderabad Headquarters',
        addressText: 'HITEC City, Madhapur, Hyderabad',
        latitude: 17.4474,
        longitude: 78.3762,
        h3Res8Index: 'h3_hex_8_17.45',
      });

      const result = await service.createOffice('tenant-101', {
        code: 'hyd_hq',
        name: 'Hyderabad Headquarters',
        addressText: 'HITEC City, Madhapur, Hyderabad',
        latitude: 17.4474,
        longitude: 78.3762,
      });

      expect(mockH3Service.latLngToCell).toHaveBeenCalledWith(17.4474, 78.3762, 8);
      expect(result.h3Res8Index).toBe('h3_hex_8_17.45');
      expect(result.code).toBe('HYD_HQ');
    });

    it('should reject office creation with invalid latitude/longitude', async () => {
      mockDb.corporateTenant.findUnique.mockResolvedValue({ id: 'tenant-101' });

      await expect(
        service.createOffice('tenant-101', {
          code: 'BAD_COORDS',
          name: 'Bad Coordinates Office',
          addressText: 'Nowhere',
          latitude: 120.5, // Invalid > 90
          longitude: 78.3,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Employee Management & Geocoding', () => {
    it('should create employee with geocoded coordinates and H3 cell index', async () => {
      mockDb.corporateTenant.findUnique.mockResolvedValue({ id: 'tenant-101' });
      mockDb.corporateOffice.findFirst.mockResolvedValue({
        id: 'office-1',
        latitude: { toNumber: () => 17.4474 },
        longitude: { toNumber: () => 78.3762 },
      });
      mockDb.corporateEmployee.findFirst
        .mockResolvedValueOnce(null) // Check existing duplicate code
        .mockResolvedValueOnce({
          // getEmployeeById return
          id: 'emp-1',
          employeeCode: 'EMP001',
          fullName: 'John Doe',
          locations: [{ latitude: 17.45, longitude: 78.38, h3Res8Index: 'h3_hex_8_17.45' }],
        });

      mockDb.corporateEmployee.create.mockResolvedValue({
        id: 'emp-1',
        tenantId: 'tenant-101',
        employeeCode: 'EMP001',
        fullName: 'John Doe',
      });

      const result = await service.createEmployee('tenant-101', {
        officeId: 'office-1',
        employeeCode: 'emp001',
        fullName: 'John Doe',
        email: 'john@acme.com',
        phoneNumber: '+919876543210',
        gender: 'MALE' as any,
        homeAddress: 'Plot 42, Jubilee Hills, Hyderabad',
        latitude: 17.45,
        longitude: 78.38,
      });

      expect(mockH3Service.latLngToCell).toHaveBeenCalledWith(17.45, 78.38, 8);
      expect(result.employeeCode).toBe('EMP001');
    });

    it('should use geocoding fallback when latitude/longitude are omitted', async () => {
      mockDb.corporateTenant.findUnique.mockResolvedValue({ id: 'tenant-101' });
      mockDb.corporateOffice.findFirst.mockResolvedValue({
        id: 'office-1',
        latitude: { toNumber: () => 17.4474 },
        longitude: { toNumber: () => 78.3762 },
      });
      mockDb.corporateEmployee.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'emp-2',
          employeeCode: 'EMP002',
          locations: [{ h3Res8Index: 'h3_hex_8_resolved' }],
        });

      mockDb.corporateEmployee.create.mockResolvedValue({ id: 'emp-2' });

      const result = await service.createEmployee('tenant-101', {
        officeId: 'office-1',
        employeeCode: 'EMP002',
        fullName: 'Jane Smith',
        email: 'jane@acme.com',
        phoneNumber: '+919876543211',
        gender: 'FEMALE' as any,
        homeAddress: 'Kondapur, Hyderabad',
        // coordinates omitted
      });

      expect(mockH3Service.latLngToCell).toHaveBeenCalled();
      expect(result.id).toBe('emp-2');
    });

    it('should throw ConflictException on duplicate employee code', async () => {
      mockDb.corporateTenant.findUnique.mockResolvedValue({ id: 'tenant-101' });
      mockDb.corporateOffice.findFirst.mockResolvedValue({ id: 'office-1' });
      mockDb.corporateEmployee.findFirst.mockResolvedValue({ id: 'existing-emp' });

      await expect(
        service.createEmployee('tenant-101', {
          officeId: 'office-1',
          employeeCode: 'DUPE_CODE',
          fullName: 'Duplicate Emp',
          email: 'dupe@acme.com',
          phoneNumber: '+919876543299',
          gender: 'MALE' as any,
          homeAddress: 'Hyderabad',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
