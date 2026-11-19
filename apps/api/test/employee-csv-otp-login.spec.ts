import { CorporateRoutePlannerService } from '../src/domains/corporate/routing/corporate-route-planner.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { UserRole } from '@adhocx/contracts';

describe('Ops CSV commit -> Employee OTP login provisioning', () => {
  it('commitPlanToDatabase creates EMPLOYEE user and links CorporateEmployee.userId', async () => {
    const users = new Map<string, any>();
    const employees = new Map<string, any>();
    let userSeq = 1;
    let empSeq = 1;

    const tx: any = {
      corporateRoute: {
        create: jest.fn(async ({ data }: any) => ({ id: `route-1`, ...data })),
      },
      corporateRouteStop: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: `stop-1`, ...data })),
      },
      corporateEmployee: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const emp of employees.values()) {
            if (where?.userId && emp.userId === where.userId) return emp;
            if (where?.tenantId === emp.tenantId && where?.employeeCode && emp.employeeCode === where.employeeCode) {
              return emp;
            }
            if (
              where?.tenantId === emp.tenantId &&
              where?.phoneNumber?.in &&
              where.phoneNumber.in.includes(emp.phoneNumber)
            ) {
              return emp;
            }
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const rec = { id: `emp-${empSeq++}`, userId: null, ...data };
          employees.set(rec.id, rec);
          return rec;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const rec = employees.get(where.id);
          Object.assign(rec, data);
          return rec;
        }),
      },
      corporateEmployeeLocation: {
        create: jest.fn(async ({ data }: any) => ({ id: 'loc-1', ...data })),
      },
      user: {
        findFirst: jest.fn(async ({ where }: any) => {
          for (const u of users.values()) {
            if (where?.phone?.in && where.phone.in.includes(u.phone)) return u;
            if (where?.email?.equals && u.email?.toLowerCase() === where.email.equals.toLowerCase()) return u;
          }
          return null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const rec = { id: `user-${userSeq++}`, ...data };
          users.set(rec.id, rec);
          return rec;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const rec = users.get(where.id);
          Object.assign(rec, data);
          return rec;
        }),
      },
    };

    const db: any = {
      vehiclePricingTier: {
        findMany: jest.fn(async () => [
          { vehicleType: 'SEDAN', categoryLabel: 'Sedan', maxSeats: 4, isActive: true },
        ]),
      },
      corporateOffice: {
        findUnique: jest.fn(async () => ({
          id: 'office-1',
          tenantId: 'tenant-1',
          name: 'Mindspace Hub',
          addressText: 'Mindspace IT Park, Hyderabad',
          latitude: 17.4416,
          longitude: 78.3806,
        })),
      },
      corporateTenantPolicy: {
        findFirst: jest.fn(async () => null),
      },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };

    const planner = new CorporateRoutePlannerService({} as any, {} as any, db);
    const result = await planner.commitPlanToDatabase({
      tenantId: 'tenant-1',
      officeId: 'office-1',
      shiftDate: '2026-11-19',
      shiftTime: '08:00',
      direction: 'LOGIN',
      vehicleCategory: 'SEDAN',
      stopDwellMinutes: 5,
      includeMetadata: true,
      plan: {
        office: { name: 'Mindspace Hub', lat: 17.4416, lng: 78.3806 },
        routes: [
          {
            cab: 1,
            cabType: 'SEDAN',
            departureDateTime: '2026-11-19T02:00:00.000Z',
            requiredArrivalDateTime: '2026-11-19T02:30:00.000Z',
            distanceKm: 8.5,
            driveMinutes: 25,
            stops: [
              {
                name: 'Aarav Sharma',
                phoneNumber: '+91 98765 43210',
                address: 'Gachibowli, Hyderabad',
                lat: 17.44,
                lng: 78.35,
                etaIso: '2026-11-19T02:00:00.000Z',
              },
            ],
          },
        ],
      } as any,
    });

    expect(result.routesCreated).toBe(1);
    expect(result.employeesLinked).toBe(1);
    expect(users.size).toBe(1);
    const createdUser = Array.from(users.values())[0];
    expect(createdUser).toMatchObject({
      phone: '+919876543210',
      fullName: 'Aarav Sharma',
      role: 'EMPLOYEE',
      corporateTenantId: 'tenant-1',
      status: 'ACTIVE',
    });
    expect(createdUser.email).toBeUndefined(); // synthetic @roster.corporate.local email not stored on users
    const createdEmp = Array.from(employees.values())[0];
    expect(createdEmp.userId).toBe(createdUser.id);
  });

  it('commitPlanToDatabase does not hijack an existing non-EMPLOYEE account sharing the phone', async () => {
    const existingDriver = { id: 'drv-user-1', phone: '+919876543211', role: 'DRIVER', corporateTenantId: null };
    const employees = new Map<string, any>();

    const tx: any = {
      corporateRoute: { create: jest.fn(async ({ data }: any) => ({ id: 'route-1', ...data })) },
      corporateRouteStop: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => ({ id: 'stop-1', ...data })),
      },
      corporateEmployee: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => {
          const rec = { id: 'emp-1', userId: null, ...data };
          employees.set(rec.id, rec);
          return rec;
        }),
        update: jest.fn(),
      },
      corporateEmployeeLocation: { create: jest.fn(async () => ({ id: 'loc-1' })) },
      user: {
        findFirst: jest.fn(async () => existingDriver),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const db: any = {
      vehiclePricingTier: {
        findMany: jest.fn(async () => [
          { vehicleType: 'SEDAN', categoryLabel: 'Sedan', maxSeats: 4, isActive: true },
        ]),
      },
      corporateOffice: {
        findUnique: jest.fn(async () => ({
          id: 'office-1',
          tenantId: 'tenant-1',
          name: 'Mindspace Hub',
          addressText: 'Mindspace IT Park, Hyderabad',
          latitude: 17.4416,
          longitude: 78.3806,
        })),
      },
      corporateTenantPolicy: { findFirst: jest.fn(async () => null) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    };

    const planner = new CorporateRoutePlannerService({} as any, {} as any, db);
    await planner.commitPlanToDatabase({
      tenantId: 'tenant-1',
      officeId: 'office-1',
      shiftDate: '2026-11-19',
      shiftTime: '08:00',
      direction: 'LOGIN',
      vehicleCategory: 'SEDAN',
      stopDwellMinutes: 5,
      plan: {
        office: { name: 'Mindspace Hub', lat: 17.4416, lng: 78.3806 },
        routes: [
          {
            cab: 1,
            cabType: 'SEDAN',
            departureDateTime: '2026-11-19T02:00:00.000Z',
            requiredArrivalDateTime: '2026-11-19T02:30:00.000Z',
            distanceKm: 5,
            driveMinutes: 15,
            stops: [
              {
                name: 'Driver Clash',
                phoneNumber: '+91 98765 43211',
                address: 'Madhapur, Hyderabad',
                lat: 17.44,
                lng: 78.38,
                etaIso: '2026-11-19T02:00:00.000Z',
              },
            ],
          },
        ],
      } as any,
    });

    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.corporateEmployee.update).not.toHaveBeenCalled();
    expect(employees.get('emp-1')?.userId).toBeNull();
  });

  it('AuthService.requestOtp auto-provisions and links unlinked CorporateEmployee on OTP login', async () => {
    const kv = new Map<string, string>();
    const redis: any = {
      get: jest.fn(async (k: string) => kv.get(k) ?? null),
      set: jest.fn(async (k: string, v: string) => {
        kv.set(k, v);
      }),
      del: jest.fn(async (k: string) => {
        kv.delete(k);
      }),
      checkRateLimit: jest.fn(async () => ({ allowed: true, remaining: 4 })),
    };

    const empRecord: any = {
      id: 'emp-99',
      tenantId: 'tenant-99',
      employeeCode: 'EMP-AA11BB22',
      fullName: 'Priya Reddy',
      phoneNumber: '+919876543211',
      email: 'emp-aa11bb22@roster.corporate.local',
      userId: null,
    };
    const createdUsers: any[] = [];
    const db: any = {
      user: {
        findFirst: jest.fn(async () => null),
        findUnique: jest.fn(async ({ where }: any) => createdUsers.find((u) => u.id === where.id) ?? null),
        create: jest.fn(async ({ data }: any) => {
          const u = { id: 'u-emp-99', ...data };
          createdUsers.push(u);
          return u;
        }),
      },
      corporateTenant: {
        findFirst: jest.fn(async () => null),
      },
      corporateEmployee: {
        findFirst: jest.fn(async () => empRecord),
        update: jest.fn(async ({ data }: any) => {
          Object.assign(empRecord, data);
          return empRecord;
        }),
      },
    };

    const notifications: any = { sendOtp: jest.fn(async () => undefined) };
    const jwt: any = { sign: jest.fn(() => 'jwt-token') };
    const config: any = { get: jest.fn(() => 300) };

    const auth = new AuthService(db, jwt, config, redis, notifications);
    const res = await auth.requestOtp({
      phone: '9876543211',
      channel: 'SMS',
      role: UserRole.EMPLOYEE,
      isRegister: false,
    } as any);

    expect(res.requestId).toBeTruthy();
    expect(createdUsers).toHaveLength(1);
    expect(createdUsers[0]).toMatchObject({
      phone: '+919876543211',
      fullName: 'Priya Reddy',
      role: UserRole.EMPLOYEE,
      corporateTenantId: 'tenant-99',
      status: 'ACTIVE',
    });
    expect(empRecord.userId).toBe('u-emp-99');
    expect(notifications.sendOtp).toHaveBeenCalledTimes(1);
  });
});
