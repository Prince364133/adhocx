import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AdminService } from '../src/modules/admin/admin.service';
import { DatabaseService } from '../src/database/database.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { RedisService } from '../src/redis/redis.service';
import { VerificationStatus, UserRole } from '@adhocx/contracts';

describe('Admin Vendor Manual Creation & Vendor Login Simulation', () => {
  let adminService: AdminService;
  let db: any;
  let audit: any;
  let redis: any;

  // In-memory simulated storage
  const mockUsers: any[] = [];
  const mockVendors: any[] = [];
  const mockAuditLogs: any[] = [];
  const mockRedisStore: Record<string, string> = {};

  beforeEach(async () => {
    mockUsers.length = 0;
    mockVendors.length = 0;
    mockAuditLogs.length = 0;
    for (const k of Object.keys(mockRedisStore)) delete mockRedisStore[k];

    db = {
      $transaction: jest.fn(async (cb: any, _options?: any) => cb(db)),
      user: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (where?.phone?.in) {
            return mockUsers.find((u) => where.phone.in.includes(u.phone)) || null;
          }
          if (where?.phone) {
            return mockUsers.find((u) => u.phone === where.phone) || null;
          }
          if (where?.email?.equals) {
            return mockUsers.find((u) => u.email?.toLowerCase() === where.email.equals.toLowerCase()) || null;
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const user = {
            id: `usr-${mockUsers.length + 1}`,
            phone: data.phone,
            email: data.email,
            fullName: data.fullName,
            role: data.role,
            status: data.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          mockUsers.push(user);
          return user;
        }),
      },
      vendor: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (where?.phone?.in) {
            return mockVendors.find((v) => where.phone.in.includes(v.phone)) || null;
          }
          return null;
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          return mockVendors.find((v) => v.id === where.id || v.userId === where.userId) || null;
        }),
        create: jest.fn(async ({ data, include }: any) => {
          const user = mockUsers.find((u) => u.id === data.userId);
          const vendor = {
            id: `vnd-${mockVendors.length + 1}`,
            userId: data.userId,
            organizationName: data.organizationName,
            fullName: data.fullName,
            phone: data.phone,
            gstNumber: data.gstNumber,
            address: data.address,
            verificationStatus: data.verificationStatus,
            approvedAt: data.approvedAt,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...(include?.user ? { user } : {}),
          };
          mockVendors.push(vendor);
          return vendor;
        }),
      },
      driver: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    audit = {
      log: jest.fn(async (entry: any) => {
        mockAuditLogs.push(entry);
      }),
    };

    redis = {
      get: jest.fn(async (key: string) => mockRedisStore[key] || null),
      set: jest.fn(async (key: string, val: string) => {
        mockRedisStore[key] = val;
      }),
      del: jest.fn(async (key: string) => {
        delete mockRedisStore[key];
      }),
      revokeUserSessions: jest.fn().mockResolvedValue(undefined),
      unrevokeUser: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DatabaseService, useValue: db },
        { provide: AuditService, useValue: audit },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    adminService = module.get<AdminService>(AdminService);
  });

  describe('Step 1: Admin Portal Vendor Manual Creation', () => {
    it('successfully onboards a new vendor from admin panel with valid data', async () => {
      const dto = {
        organizationName: 'Shree Balaji Logistics LLP',
        fullName: 'Vikram Seth',
        phone: '9845012345',
        email: 'vikram@shreebalajilogistics.com',
        gstNumber: '29ABCDE1234F1Z5',
        city: 'Bengaluru',
        address: 'HSR Layout Sector 2, 27th Main',
        verificationStatus: VerificationStatus.VERIFIED,
      };

      const vendor = await adminService.createVendor('admin-user-id', dto);

      expect(vendor).toBeDefined();
      expect(vendor.organizationName).toBe('Shree Balaji Logistics LLP');
      expect(vendor.fullName).toBe('Vikram Seth');
      expect(vendor.phone).toBe('+919845012345');
      expect(vendor.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(vendor.approvedAt).toBeInstanceOf(Date);

      // Verify User record in mock database
      const user = mockUsers.find((u) => u.phone === '+919845012345');
      expect(user).toBeDefined();
      expect(user.role).toBe(UserRole.VENDOR);
      expect(user.status).toBe('ACTIVE');

      // Verify transaction timeout guard was passed
      expect(db.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 30000, maxWait: 10000 },
      );

      // Verify audit log entry
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-user-id',
          action: 'ADMIN_VENDOR_CREATED',
          entityType: 'VENDOR',
          entityId: vendor.id,
          metadata: expect.objectContaining({
            organizationName: 'Shree Balaji Logistics LLP',
            phone: '+919845012345',
            email: 'vikram@shreebalajilogistics.com',
            verificationStatus: VerificationStatus.VERIFIED,
          }),
        }),
      );
    });

    it('rejects duplicate vendor creation when mobile number is already taken', async () => {
      // Seed existing user
      mockUsers.push({
        id: 'existing-usr',
        phone: '+919845012345',
        role: UserRole.DRIVER,
        status: 'ACTIVE',
      });

      const dto = {
        organizationName: 'Another Logistics Co',
        fullName: 'Another Contact',
        phone: '9845012345', // same number
      };

      await expect(adminService.createVendor('admin-user-id', dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockVendors).toHaveLength(0);
    });

    it('rejects invalid or incomplete phone number with BadRequestException', async () => {
      const dto = {
        organizationName: 'Fast Move Corp',
        fullName: 'John Doe',
        phone: '98450', // incomplete
      };

      await expect(adminService.createVendor('admin-user-id', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockVendors).toHaveLength(0);
    });

    it('rejects conflicting email address with ConflictException', async () => {
      mockUsers.push({
        id: 'existing-email-usr',
        phone: '+919111122222',
        email: 'shared@logistics.com',
        role: UserRole.VENDOR,
        status: 'ACTIVE',
      });

      const dto = {
        organizationName: 'New Fleet Brand',
        fullName: 'New Contact',
        phone: '9845099999',
        email: 'shared@logistics.com',
      };

      await expect(adminService.createVendor('admin-user-id', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('Step 2: Vendor Login via Untouched OTP Verification Flow', () => {
    it('authenticates newly created vendor account with phone number and OTP', async () => {
      // Create vendor via admin
      await adminService.createVendor('admin-1', {
        organizationName: 'Mega Corp Express',
        fullName: 'Sunil Kumar',
        phone: '9876543210',
        verificationStatus: VerificationStatus.VERIFIED,
      });

      // Simulated login OTP request
      const phoneE164 = '+919876543210';
      const testOtp = '123456';
      mockRedisStore[`otp_direct:${phoneE164}`] = testOtp;

      // Simulated login verification: user exists in DB with role VENDOR
      const foundUser = await db.user.findFirst({
        where: { phone: phoneE164 },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser.role).toBe(UserRole.VENDOR);
      expect(foundUser.status).toBe('ACTIVE');

      // Check linked vendor profile
      const foundVendor = await db.vendor.findUnique({
        where: { userId: foundUser.id },
      });
      expect(foundVendor).toBeDefined();
      expect(foundVendor.organizationName).toBe('Mega Corp Express');
      expect(foundVendor.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(foundVendor.approvedAt).toBeInstanceOf(Date);
    });
  });
});
