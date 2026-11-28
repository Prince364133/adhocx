import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FleetAdminRole } from '@adhocx/contracts';
import { FleetDriversService } from '../../src/domains/fleet/portal/drivers/fleet-drivers.service';
import { FleetFinanceService } from '../../src/domains/fleet/portal/earnings-payouts/fleet-finance.service';
import { FleetLiveOpsService } from '../../src/domains/fleet/portal/live-operations/fleet-live-ops.service';
import { FleetNotificationsService } from '../../src/domains/fleet/portal/notifications/fleet-notifications.service';
import { FleetSupportService } from '../../src/domains/fleet/portal/support/fleet-support.service';
import { DriversService } from '../../src/modules/drivers/drivers.service';

describe('Fleet Portal Performance, Concurrency & Upload Benchmarks (Phase 6)', () => {
  const TARGET_FLEET = 'fleet-bench-1';

  function createBenchmarkDb() {
    const driverRows: any[] = [];
    const tripRows: any[] = [];
    const notifRows: any[] = [];
    const now = new Date('2026-11-27T12:00:00.000Z');

    // Seed 1,000 drivers across 20 fleets (50 per fleet) and 10,000 trips (500 per fleet)
    for (let f = 0; f < 20; f++) {
      const fleetId = f === 0 ? TARGET_FLEET : `fleet-bench-${f + 1}`;
      for (let d = 0; d < 50; d++) {
        const driverId = `drv-${f}-${d}`;
        driverRows.push({
          id: driverId,
          fleetId,
          fullName: `Bench Driver ${f}-${d}`,
          phone: `99${String(f).padStart(2, '0')}${String(d).padStart(6, '0')}`,
          verificationStatus: 'VERIFIED',
          availabilityStatus: d % 3 === 0 ? 'BUSY' : 'AVAILABLE',
          vehiclePlate: `KA01F${String(f).padStart(2, '0')}${String(d).padStart(2, '0')}`,
          vehicleType: 'SEDAN',
          vehicleModel: 'Dzire',
          currentLat: 12.97,
          currentLng: 77.59,
          lastLocationAt: now,
          createdAt: now,
        });
      }
    }

    for (let t = 0; t < 10_000; t++) {
      const f = t % 20;
      const d = Math.floor(t / 20) % 50;
      tripRows.push({
        id: `trip-${t}`,
        driverId: `drv-${f}-${d}`,
        status: Math.floor(t / 20) % 10 === 0 ? 'IN_PROGRESS' : 'COMPLETED',
        pickupAddress: 'Pickup Point',
        dropAddress: 'Drop Point',
        totalDriverEarnings: 450,
        driverRate: 450,
        startedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (let n = 0; n < 200; n++) {
      notifRows.push({
        id: `notif-${n}`,
        fleetId: TARGET_FLEET,
        eventType: 'DRIVER_JOINED',
        title: `Event ${n}`,
        message: 'Driver updated',
        isRead: n % 2 === 0,
        createdAt: now,
      });
    }

    // Index trips by driverId to simulate PostgreSQL @@index([driverId, status]) query speed
    const tripsByDriver = new Map<string, any[]>();
    for (const tr of tripRows) {
      const arr = tripsByDriver.get(tr.driverId) || [];
      arr.push(tr);
      tripsByDriver.set(tr.driverId, arr);
    }

    const db: any = {
      driver: {
        findMany: jest.fn().mockImplementation(async ({ where, include, skip = 0, take = 20 }: any) => {
          const matched = driverRows.filter((r) => !where?.fleetId || r.fleetId === where.fleetId);
          const slice = matched.slice(skip, skip + take);
          if (include?.trips) {
            return slice.map((d) => ({ ...d, trips: tripsByDriver.get(d.id) || [] }));
          }
          return slice;
        }),
        count: jest.fn().mockImplementation(async ({ where }: any) =>
          driverRows.filter((r) => !where?.fleetId || r.fleetId === where.fleetId).length,
        ),
      },
      trip: {
        findMany: jest.fn().mockImplementation(async ({ where, take = 1000 }: any) => {
          const idSet = new Set<string>(where?.driverId?.in || []);
          const out: any[] = [];
          for (const drvId of idSet) {
            for (const tr of tripsByDriver.get(drvId) || []) {
              if (where?.status?.in ? where.status.in.includes(tr.status) : !where?.status || tr.status === where.status) {
                out.push(tr);
              }
            }
          }
          return out.slice(0, take);
        }),
      },
      fleetPayoutRequest: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      fleetNotification: {
        findMany: jest.fn().mockImplementation(async ({ where, skip = 0, take = 20 }: any) =>
          notifRows.filter((n) => n.fleetId === where.fleetId).slice(skip, skip + take),
        ),
        count: jest.fn().mockImplementation(async ({ where }: any) =>
          notifRows.filter((n) => n.fleetId === where.fleetId && (where.isRead === undefined || n.isRead === where.isRead)).length,
        ),
      },
    };

    return { db, driverRows, tripRows };
  }

  function p95(samplesMs: number[]): number {
    const sorted = [...samplesMs].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
    return sorted[idx];
  }

  it('keeps p95 < 250ms across Drivers, LiveOps, Earnings & Notifications with 1,000+ drivers and 10,000+ trips', async () => {
    const { db, driverRows, tripRows } = createBenchmarkDb();
    expect(driverRows.length).toBe(1000);
    expect(tripRows.length).toBe(10_000);

    const driversSvc = new FleetDriversService(db);
    const liveOpsSvc = new FleetLiveOpsService(db);
    const financeSvc = new FleetFinanceService(db);
    const notifSvc = new FleetNotificationsService(db);

    const iterations = 25;
    const timings: Record<string, number[]> = {
      drivers: [],
      liveOps: [],
      earnings: [],
      notifications: [],
    };

    for (let i = 0; i < iterations; i++) {
      let t0 = performance.now();
      const dRes = await driversSvc.listDrivers(TARGET_FLEET, { page: 1, limit: 20 });
      timings.drivers.push(performance.now() - t0);
      expect(dRes.items).toHaveLength(20);
      expect(dRes.total).toBe(50);

      t0 = performance.now();
      const lRes = await liveOpsSvc.getLiveOperations(TARGET_FLEET, {});
      timings.liveOps.push(performance.now() - t0);
      expect(lRes.rides.length).toBeGreaterThan(0);

      t0 = performance.now();
      const eRes = await financeSvc.getEarnings(TARGET_FLEET, {});
      timings.earnings.push(performance.now() - t0);
      expect(eRes.totalEarnings).toBeGreaterThan(0);

      t0 = performance.now();
      const nRes = await notifSvc.listNotifications(TARGET_FLEET, { page: 1, limit: 20 });
      timings.notifications.push(performance.now() - t0);
      expect(nRes.items).toHaveLength(20);
    }

    expect(p95(timings.drivers)).toBeLessThan(250);
    expect(p95(timings.liveOps)).toBeLessThan(250);
    expect(p95(timings.earnings)).toBeLessThan(250);
    expect(p95(timings.notifications)).toBeLessThan(250);
  });

  it('prevents race conditions on concurrent Driver Fleet Code associations (at most 1 winner, rest 409 Conflict)', async () => {
    let lockedFleetId: string | null = null;
    let txQueue = Promise.resolve();

    const db: any = {
      driver: {
        findUnique: jest.fn().mockImplementation(async () => ({
          id: 'drv-race-1',
          fullName: 'Race Driver',
          phone: '9998887766',
          fleetId: null, // both requests start with stale read before transaction CAS
        })),
        updateMany: jest.fn().mockImplementation(async ({ where, data }: any) => {
          if (where.id === 'drv-race-1' && lockedFleetId === null) {
            lockedFleetId = data.fleetId;
            return { count: 1 };
          }
          return { count: 0 };
        }),
      },
      fleet: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => ({
          id: where.code === 'FLT-AAAAA1' ? 'fleet-A' : 'fleet-B',
          name: where.code === 'FLT-AAAAA1' ? 'Fleet A' : 'Fleet B',
          code: where.code,
          status: 'ACTIVE',
          codeStatus: 'ACTIVE',
        })),
      },
      fleetDriverHistory: { create: jest.fn().mockResolvedValue({ id: 'h1' }) },
      fleetNotification: { create: jest.fn().mockResolvedValue({ id: 'n1' }) },
      $transaction: jest.fn().mockImplementation(async (cb: any) => {
        const run = txQueue.then(() => cb(db));
        txQueue = run.catch(() => undefined);
        return run;
      }),
    };

    const driversService = new DriversService(
      db,
      { getDocumentAccessUrl: async (v: string) => v } as any,
      { log: async () => undefined } as any,
    );

    const results = await Promise.allSettled([
      driversService.validateAndAssociateFleetCode('user-race-1', { fleetCode: 'FLT-AAAAA1' }),
      driversService.validateAndAssociateFleetCode('user-race-1', { fleetCode: 'FLT-BBBBB2' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    expect(lockedFleetId).not.toBeNull();
  });

  it('prevents double-draw race conditions on concurrent Fleet Payout requests exceeding eligible balance', async () => {
    const payoutsCommitted: any[] = [];
    let txLock = Promise.resolve();

    const db: any = {
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation(async (cb: any) => {
        const exec = txLock.then(() =>
          cb({
            driver: { findMany: async () => [{ id: 'd1' }] },
            trip: { findMany: async () => [{ totalDriverEarnings: 1000 }] },
            fleetPayoutRequest: {
              findMany: async () => payoutsCommitted,
              create: async ({ data }: any) => {
                const rec = {
                  id: randomUUID(),
                  currency: 'INR',
                  createdAt: new Date(),
                  ...data,
                };
                payoutsCommitted.push(rec);
                return rec;
              },
            },
          }),
        );
        txLock = exec.catch(() => undefined);
        return exec;
      }),
    };

    const financeService = new FleetFinanceService(db);
    const ctx = {
      userId: 'owner-1',
      fleetId: 'fleet-1',
      role: FleetAdminRole.FLEET_OWNER,
      permissions: ['VIEW_EARNINGS'],
      fullName: 'Owner',
    };

    const results = await Promise.allSettled([
      financeService.requestPayout(ctx, { amount: 700 }),
      financeService.requestPayout(ctx, { amount: 700 }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
    expect(payoutsCommitted.reduce((s, p) => s + p.amount, 0)).toBe(700);
  });

  it('enforces attachment MIME allowlist, path traversal guard & cross-fleet attachment isolation', async () => {
    const storageMock: any = {
      getPresignedUploadUrl: jest.fn().mockResolvedValue('https://r2.example.com/presigned-put'),
      saveFile: jest.fn().mockResolvedValue({
        filename: 'doc.pdf',
        originalName: 'doc.pdf',
        mimeType: 'application/pdf',
        storageProvider: 'r2',
      }),
      getDocumentAccessUrl: jest.fn().mockResolvedValue('https://r2.example.com/signed-get'),
    };
    const supportService = new FleetSupportService({} as any, storageMock);
    const ctx = {
      userId: 'u1',
      fleetId: 'fleet-a',
      role: FleetAdminRole.FLEET_OWNER,
      permissions: [],
      fullName: 'Fleet A Owner',
    };

    const presign = await supportService.presignAttachment(ctx, {
      fileName: '../../etc/passwd.pdf',
      mimeType: 'application/pdf',
    });
    expect(presign.key).toMatch(/^documents\/fleet-support\/fleet-a\//);
    expect(presign.key).not.toContain('..');
    expect(presign.uploadMode).toBe('S3_PRESIGNED');

    await expect(
      supportService.presignAttachment(ctx, { fileName: 'xss.svg', mimeType: 'image/svg+xml' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      supportService.uploadAttachmentFallback(ctx, { buffer: Buffer.alloc(0) }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      supportService.createTicket(ctx, {
        category: 'GENERAL',
        subject: 'Traversal attempt',
        description: 'Testing key guard',
        attachments: [
          {
            key: 'documents/fleet-support/fleet-b/stolen.pdf',
            fileName: 'stolen.pdf',
            mimeType: 'application/pdf',
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
