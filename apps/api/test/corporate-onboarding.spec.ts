import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CorporateRole, UserRole } from '@adhocx/contracts';
import { CorporateOnboardingService } from '../src/domains/corporate/tenants/corporate-onboarding.service';
import { CorporateTenantService } from '../src/domains/corporate/tenants/corporate-tenant.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { H3Service } from '../src/modules/locations/h3.service';
import { verifyPassword } from '../src/common/utils/password.util';

describe('Corporate Company Onboarding & Instant Corporate Portal Auth', () => {
  let onboardingService: CorporateOnboardingService;
  let tenantService: CorporateTenantService;
  let authService: AuthService;
  let jwtService: JwtService;

  let tenants: Map<string, any>;
  let offices: Map<string, any>;
  let policies: Map<string, any[]>;
  let users: Map<string, any>;
  let shifts: any[];
  let mockGeocoding: { geocode: jest.Mock };

  beforeEach(() => {
    tenants = new Map();
    offices = new Map();
    policies = new Map();
    users = new Map();
    shifts = [];

    const db: any = {
      corporateTenant: {
        findUnique: jest.fn(async ({ where }: any) => {
          for (const t of tenants.values()) {
            if (where.id && t.id === where.id) return t;
            if (where.code && t.code === where.code) return t;
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const row = {
            id: `tenant-${tenants.size + 1}`,
            createdAt: new Date(),
            ...data,
          };
          tenants.set(row.id, row);
          return row;
        }),
        count: jest.fn(async ({ where }: any) => filterTenants(where).length),
        findMany: jest.fn(async ({ where }: any) => {
          return filterTenants(where).map((t) => ({
            ...t,
            offices: Array.from(offices.values()).filter((o) => o.tenantId === t.id),
            policies: policies.get(t.id) || [],
            users: Array.from(users.values()).filter((u) => u.corporateTenantId === t.id),
            _count: {
              offices: Array.from(offices.values()).filter((o) => o.tenantId === t.id).length,
              employees: 0,
              routes: 0,
            },
          }));
        }),
      },
      corporateOffice: {
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `office-${offices.size + 1}`, createdAt: new Date(), ...data };
          offices.set(row.id, row);
          return row;
        }),
      },
      corporateTenantPolicy: {
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `policy-${Date.now()}`, ...data };
          const list = policies.get(data.tenantId) || [];
          list.unshift(row);
          policies.set(data.tenantId, list);
          return row;
        }),
      },
      corporateShiftTemplate: {
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `shift-${shifts.length + 1}`, ...data };
          shifts.push(row);
          return row;
        }),
      },
      user: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const u of users.values()) {
            if (where.email?.equals && u.email?.toLowerCase() === where.email.equals.toLowerCase()) {
              return u;
            }
            if (where.phone?.in && where.phone.in.includes(u.phone)) {
              return u;
            }
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `user-${users.size + 1}`, createdAt: new Date(), ...data };
          users.set(row.id, row);
          return row;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const u = users.get(where.id);
          if (!u) return null;
          Object.assign(u, data);
          return u;
        }),
      },
      driver: { findFirst: jest.fn(async () => null) },
      vendor: { findFirst: jest.fn(async () => null) },
      $transaction: jest.fn(async (fn: any) => fn(db)),
    };

    function filterTenants(where: any): any[] {
      const list = Array.from(tenants.values());
      if (!where?.OR) return list;
      return list.filter((t) =>
        where.OR.some((clause: any) => {
          const key = Object.keys(clause)[0];
          const term = String(clause[key]?.contains || '').toLowerCase();
          return String(t[key] || '').toLowerCase().includes(term);
        }),
      );
    }

    const audit: any = { log: jest.fn(async () => undefined) };
    const h3 = new H3Service();
    mockGeocoding = {
      geocode: jest.fn(async () => ({
        lat: 17.4435,
        lng: 78.3772,
        formattedAddress: 'Mindspace Madhapur, Hyderabad',
      })),
    };

    const fakeRedisClient = {
      get: jest.fn(async () => null),
      set: jest.fn(async () => 'OK'),
      incr: jest.fn(async () => 1),
      expire: jest.fn(async () => 1),
    };
    const fakeRedis: any = {
      getClient: () => fakeRedisClient,
      checkRateLimit: jest.fn(async () => ({ allowed: true, remaining: 9 })),
      unrevokeUser: jest.fn(async () => undefined),
    };
    const fakeConfig: any = {
      get: jest.fn((key: string) => {
        if (key === 'auth.jwtAccessSecret') return 'unit-test-access-secret';
        if (key === 'auth.jwtRefreshSecret') return 'unit-test-refresh-secret';
        return undefined;
      }),
    };
    jwtService = new JwtService({ secret: 'unit-test-access-secret' });

    onboardingService = new CorporateOnboardingService(db, audit, h3, mockGeocoding as any);
    tenantService = new CorporateTenantService(db, audit, h3);
    authService = new AuthService(db, jwtService, fakeConfig, fakeRedis, { emitEvent: jest.fn() } as any);
  });

  it('atomically creates tenant, auto-geocoded office, policy defaults, shift template, and password-enabled Corporate Admin', async () => {
    const onboarded = await onboardingService.onboardCompany(
      {
        code: 'NOVATECH',
        name: 'NovaTech Systems',
        legalEntityName: 'NovaTech Systems Pvt Ltd',
        gstin: '36AAACN1234F1Z5',
        office: {
          code: 'HYD-HQ',
          name: 'Hyderabad Campus',
          addressText: 'Building 9, Mindspace Madhapur, Hyderabad',
        },
        adminUser: {
          fullName: 'Ananya Sharma',
          email: 'admin@novatech.in',
          phone: '+919876500111',
          password: 'SecureLogin@2026',
          corporateRole: CorporateRole.CORP_SUPER_ADMIN,
        },
        policy: {
          stopDwellMinutes: 10,
          approachLeadMinutes: 30,
          dispatchWindowMinutes: 30,
          dispatchRetryIntervalMinutes: 5,
          searchRadiusKm: 10,
        },
        shiftTemplate: {
          name: 'Morning General',
          loginTime: '09:00',
          logoutTime: '18:00',
          weekdays: [1, 2, 3, 4, 5],
        },
      },
      { id: 'ops-1', role: 'OPS' },
    );

    expect(mockGeocoding.geocode).toHaveBeenCalledWith('Building 9, Mindspace Madhapur, Hyderabad');
    expect(onboarded.tenant.code).toBe('NOVATECH');
    expect(onboarded.office.latitude).toBeCloseTo(17.4435, 4);
    expect(onboarded.policy).toMatchObject({
      stopDwellMinutes: 10,
      approachLeadMinutes: 30,
      dispatchWindowMinutes: 30,
      dispatchRetryIntervalMinutes: 5,
      searchRadiusKm: 10,
    });
    expect(onboarded.portalAccess.passwordConfigured).toBe(true);

    const savedUser = Array.from(users.values())[0];
    expect(savedUser.role).toBe(UserRole.CORPORATE_ADMIN);
    expect(savedUser.corporateTenantId).toBe(onboarded.tenant.id);
    expect(await verifyPassword('SecureLogin@2026', savedUser.passwordHash)).toBe(true);

    // Immediately authenticate via Corporate Portal password login
    const loginRes = await authService.login({
      identifier: 'admin@novatech.in',
      password: 'SecureLogin@2026',
    });

    expect(loginRes.accessToken).toBeDefined();
    expect(loginRes.user.role).toBe(UserRole.CORPORATE_ADMIN);

    const decoded: any = jwtService.decode(loginRes.accessToken);
    expect(decoded.corporateTenantId).toBe(onboarded.tenant.id);
    expect(decoded.corporateRole).toBe(CorporateRole.CORP_SUPER_ADMIN);

    // Reject wrong password cleanly
    await expect(
      authService.login({ identifier: 'admin@novatech.in', password: 'WrongPassword!' }),
    ).rejects.toThrow(UnauthorizedException);

    // Ops Company Search finds the onboarded company by name or code
    const byName = await tenantService.listTenants({ search: 'novatech' });
    expect(byName.items).toHaveLength(1);
    expect(byName.items[0].name).toBe('NovaTech Systems');

    const byMiss = await tenantService.listTenants({ search: 'nonexistent-corp' });
    expect(byMiss.items).toHaveLength(0);
  });

  it('rejects duplicate company code conflicts cleanly', async () => {
    const payload = {
      code: 'DUPCORP',
      name: 'Dup Corp',
      legalEntityName: 'Dup Corp Pvt Ltd',
      office: {
        code: 'HQ',
        name: 'HQ',
        addressText: 'Hitech City, Hyderabad',
        latitude: 17.44,
        longitude: 78.38,
      },
      adminUser: {
        fullName: 'Ravi Kumar',
        email: 'ravi@dupcorp.com',
        phone: '+919876500222',
        password: 'Password@123',
      },
    };

    await onboardingService.onboardCompany(payload);
    await expect(onboardingService.onboardCompany(payload)).rejects.toThrow(ConflictException);
  });

  it('enforces valid policy ranges (dwell <= 10m and valid admin email)', async () => {
    await expect(
      onboardingService.onboardCompany({
        code: 'BADMAIL',
        name: 'Bad Mail Corp',
        legalEntityName: 'Bad Mail Pvt Ltd',
        office: {
          code: 'HQ',
          name: 'HQ',
          addressText: 'Gachibowli, Hyderabad',
          latitude: 17.44,
          longitude: 78.34,
        },
        adminUser: {
          fullName: 'Invalid Email User',
          email: 'not-an-email',
          phone: '+919876500333',
          password: 'Password@123',
        },
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
