import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  FleetAdminRole,
  FleetIncentiveEligibility,
  FleetIncentiveStatus,
  FleetIncentiveType,
  FleetShiftStatus,
} from '@adhocx/contracts';
import { FleetLiveOpsService } from '../src/domains/fleet/portal/live-operations/fleet-live-ops.service';
import { FleetFinanceService } from '../src/domains/fleet/portal/earnings-payouts/fleet-finance.service';
import { FleetFinanceController } from '../src/domains/fleet/portal/earnings-payouts/fleet-finance.controller';
import { FleetIncentivesService } from '../src/domains/fleet/portal/incentives/fleet-incentives.service';
import { FleetIncentivesController } from '../src/domains/fleet/portal/incentives/fleet-incentives.controller';
import { FleetShiftsService } from '../src/domains/fleet/portal/shifts/fleet-shifts.service';
import { DriversService } from '../src/modules/drivers/drivers.service';
import { TripsService } from '../src/modules/trips/trips.service';

describe('Fleet Portal Operations, Earnings, Incentives & Shifts (Phase 4)', () => {
  const ownerCtx = {
    userId: 'owner-1',
    fleetId: 'fleet-1',
    role: FleetAdminRole.FLEET_OWNER,
    permissions: ['VIEW_EARNINGS'],
    fullName: 'Fleet Owner',
  };

  describe('FleetLiveOpsService', () => {
    it('returns server lastRefreshedAt, fleet-scoped active rides, and marks stale GPS fixes (>120s)', async () => {
      const staleTime = new Date(Date.now() - 5 * 60 * 1000);
      const freshTime = new Date(Date.now() - 15 * 1000);

      const db: any = {
        driver: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'drv-1',
              fullName: 'Aarav Driver',
              availabilityStatus: 'BUSY',
              vehiclePlate: 'KA01AB1234',
              vehicleType: 'SEDAN',
              currentLat: 12.9716,
              currentLng: 77.5946,
              lastLocationAt: staleTime,
            },
            {
              id: 'drv-2',
              fullName: 'Vikram Driver',
              availabilityStatus: 'AVAILABLE',
              vehiclePlate: 'KA01AB9999',
              vehicleType: 'SUV',
              currentLat: 12.98,
              currentLng: 77.6,
              lastLocationAt: freshTime,
            },
          ]),
        },
        trip: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'trip-1',
              driverId: 'drv-1',
              status: 'IN_PROGRESS',
              pickupAddress: 'MG Road',
              dropAddress: 'Airport',
              startedAt: freshTime,
              updatedAt: freshTime,
            },
          ]),
        },
      };

      const service = new FleetLiveOpsService(db);
      const res = await service.getLiveOperations('fleet-1', {});

      expect(typeof res.lastRefreshedAt).toBe('string');
      expect(res.locationStaleAfterSeconds).toBe(120);
      expect(res.summary).toEqual({
        driversAvailable: 1,
        driversOnTrip: 1,
        activeRides: 1,
      });
      expect(res.rides).toHaveLength(1);
      expect(res.rides[0].tripId).toBe('trip-1');
      expect(res.rides[0].lastLocation?.isStale).toBe(true);
      expect(db.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { fleetId: 'fleet-1' } }),
      );
    });
  });

  describe('FleetFinanceService & RBAC', () => {
    it('enforces FLEET_OWNER metadata on payout & export endpoints', () => {
      const requestRoles = Reflect.getMetadata(
        'fleet_roles',
        FleetFinanceController.prototype.requestPayout,
      );
      const listRoles = Reflect.getMetadata(
        'fleet_roles',
        FleetFinanceController.prototype.listPayouts,
      );
      const exportRoles = Reflect.getMetadata(
        'fleet_roles',
        FleetFinanceController.prototype.exportEarnings,
      );
      expect(requestRoles).toEqual([FleetAdminRole.FLEET_OWNER]);
      expect(listRoles).toEqual([FleetAdminRole.FLEET_OWNER]);
      expect(exportRoles).toEqual([FleetAdminRole.FLEET_OWNER]);
    });

    it('aggregates fleet earnings, driver breakdown, and exports escaped CSV', async () => {
      const createdAt = new Date('2026-11-10T10:00:00.000Z');
      const db: any = {
        driver: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'd1', fullName: 'Rohan "Speed" Verma' },
            { id: 'd2', fullName: 'Kiran Nair' },
          ]),
        },
        trip: {
          findMany: jest.fn().mockResolvedValue([
            { driverId: 'd1', totalDriverEarnings: 1200, driverRate: 1200, createdAt },
            { driverId: 'd2', totalDriverEarnings: 800, driverRate: 800, createdAt },
          ]),
        },
        fleetPayoutRequest: {
          findMany: jest.fn().mockResolvedValue([{ amount: 500 }]),
        },
      };

      const service = new FleetFinanceService(db);
      const earnings = await service.getEarnings('fleet-1', {});
      expect(earnings.totalEarnings).toBe(2000);
      expect(earnings.pendingAmount).toBe(500);
      expect(earnings.driverBreakdown[0].driverId).toBe('d1');

      const csv = await service.exportEarningsCsv('fleet-1', {});
      expect(csv).toContain('Driver ID,Driver Name,Completed Trips,Earnings (INR)');
      expect(csv).toContain('"Rohan ""Speed"" Verma"');
    });

    it('rejects non-positive or over-balance payouts inside atomic transaction', async () => {
      const txMock: any = {
        driver: { findMany: jest.fn().mockResolvedValue([{ id: 'd1' }]) },
        trip: { findMany: jest.fn().mockResolvedValue([{ totalDriverEarnings: 1000 }]) },
        fleetPayoutRequest: {
          findMany: jest.fn().mockResolvedValue([{ amount: 600 }]),
          create: jest.fn(),
        },
      };
      const db: any = {
        $transaction: jest.fn().mockImplementation(async (cb) => cb(txMock)),
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };

      const service = new FleetFinanceService(db);

      await expect(
        service.requestPayout(ownerCtx, { amount: 0 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.requestPayout(ownerCtx, { amount: 450 }),
      ).rejects.toThrow(BadRequestException);

      txMock.fleetPayoutRequest.create.mockResolvedValue({
        id: 'pay-1',
        referenceCode: 'FPR-TEST',
        amount: 350,
        currency: 'INR',
        status: 'REQUESTED',
        createdAt: new Date('2026-11-27T10:00:00.000Z'),
      });

      const ok = await service.requestPayout(ownerCtx, { amount: 350 });
      expect(ok.status).toBe('REQUESTED');
      expect(ok.amount).toBe(350);
      expect(db.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it('lists minimum-trip shortfall records scoped to fleet', async () => {
      const now = new Date('2026-11-01T00:00:00.000Z');
      const db: any = {
        fleetShortfallRecord: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'sf-1',
              periodStart: now,
              periodEnd: now,
              minimumTripsRequired: 100,
              actualTripsOffered: 85,
              shortfallTrips: 15,
              compensationAmount: 2250,
              status: 'RECORDED',
              notes: 'Contracted weekly floor',
              createdAt: now,
            },
          ]),
        },
      };
      const service = new FleetFinanceService(db);
      const claims = await service.listShortfallClaims('fleet-1');
      expect(claims).toHaveLength(1);
      expect(claims[0].shortfallTrips).toBe(15);
      expect(claims[0].compensationAmount).toBe(2250);
    });
  });

  describe('FleetIncentivesService & Progress Hooks', () => {
    it('enforces FLEET_OWNER metadata on incentive mutations', () => {
      expect(
        Reflect.getMetadata('fleet_roles', FleetIncentivesController.prototype.create),
      ).toEqual([FleetAdminRole.FLEET_OWNER]);
      expect(
        Reflect.getMetadata('fleet_roles', FleetIncentivesController.prototype.update),
      ).toEqual([FleetAdminRole.FLEET_OWNER]);
    });

    it('rejects SELECTED incentives referencing foreign drivers outside fleetId', async () => {
      const db: any = {
        driver: { count: jest.fn().mockResolvedValue(1) },
      };
      const service = new FleetIncentivesService(db);
      await expect(
        service.createIncentive(ownerCtx, {
          name: 'Weekend Sprint',
          type: FleetIncentiveType.TARGET_BASED,
          eligibilityScope: FleetIncentiveEligibility.SELECTED,
          eligibleDriverIds: ['d-in-fleet', 'd-foreign'],
          targetTrips: 10,
          rewardAmount: 500,
          startsAt: '2026-11-27T00:00:00.000Z',
          endsAt: '2026-11-30T23:59:59.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates TARGET_BASED incentive and emits INCENTIVE_LIFECYCLE notification', async () => {
      const now = new Date('2026-11-27T00:00:00.000Z');
      const end = new Date('2026-11-30T23:59:59.000Z');
      const db: any = {
        fleetIncentive: {
          create: jest.fn().mockResolvedValue({
            id: 'inc-1',
            fleetId: 'fleet-1',
            name: '10 Trip Bonus',
            type: FleetIncentiveType.TARGET_BASED,
            eligibilityScope: FleetIncentiveEligibility.ALL,
            eligibleDriverIds: [],
            targetTrips: 10,
            requiredDurationMinutes: null,
            rewardAmount: 1000,
            startsAt: now,
            endsAt: end,
            status: FleetIncentiveStatus.ACTIVE,
            createdAt: now,
          }),
        },
        fleetNotification: { create: jest.fn().mockResolvedValue({}) },
      };
      const service = new FleetIncentivesService(db);
      const created = await service.createIncentive(ownerCtx, {
        name: '10 Trip Bonus',
        type: FleetIncentiveType.TARGET_BASED,
        eligibilityScope: FleetIncentiveEligibility.ALL,
        targetTrips: 10,
        rewardAmount: 1000,
        startsAt: now.toISOString(),
        endsAt: end.toISOString(),
      });
      expect(created.id).toBe('inc-1');
      expect(db.fleetNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fleetId: 'fleet-1',
            eventType: 'INCENTIVE_LIFECYCLE',
          }),
        }),
      );
    });

    it('throws NotFoundException when updating an incentive outside the fleet', async () => {
      const db: any = {
        fleetIncentive: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      const service = new FleetIncentivesService(db);
      await expect(
        service.updateIncentive(ownerCtx, 'foreign-inc', { status: FleetIncentiveStatus.PAUSED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates FleetIncentiveProgress on trip completion with INCENTIVE_APPROACHING and INCENTIVE_QUALIFIED alerts', async () => {
      const start = new Date('2026-11-27T09:00:00.000Z');
      const end = new Date('2026-11-27T09:45:00.000Z');

      const db: any = {
        fleetIncentive: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'inc-target',
              fleetId: 'fleet-1',
              name: '5 Trips Target',
              type: 'TARGET_BASED',
              targetTrips: 5,
              eligibilityScope: 'ALL',
              eligibleDriverIds: [],
              status: 'ACTIVE',
            },
            {
              id: 'inc-time',
              fleetId: 'fleet-1',
              name: '40m Shift Target',
              type: 'TIME_BASED',
              requiredDurationMinutes: 40,
              eligibilityScope: 'ALL',
              eligibleDriverIds: [],
              status: 'ACTIVE',
            },
          ]),
        },
        fleetIncentiveProgress: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce({ completedCount: 3, activeMinutes: 90, qualified: false })
            .mockResolvedValueOnce(null),
          upsert: jest.fn().mockResolvedValue({}),
        },
        driver: {
          findUnique: jest.fn().mockResolvedValue({ userId: 'drv-user-1', fullName: 'Aarav' }),
        },
        fleetNotification: {
          create: jest.fn().mockResolvedValue({}),
        },
      };
      const notifications: any = {
        emitEvent: jest.fn(),
        sendPushToUser: jest.fn().mockResolvedValue({ success: true }),
      };

      const tripsService = new TripsService(db, {} as any, notifications, {} as any);
      await tripsService.updateFleetIncentiveProgress('drv-1', 'fleet-1', start, end);

      // inc-target moves from 3/5 (60%) -> 4/5 (80%) => approaching
      // inc-time moves from 0/40 -> 45/40 => qualified
      expect(db.fleetIncentiveProgress.upsert).toHaveBeenCalledTimes(2);
      expect(db.fleetNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'INCENTIVE_APPROACHING', entityId: 'inc-target' }),
        }),
      );
      expect(db.fleetNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'INCENTIVE_QUALIFIED', entityId: 'inc-time' }),
        }),
      );
      expect(notifications.sendPushToUser).toHaveBeenCalledTimes(2);
    });

    it('exposes driver-side incentives without normal trip earnings on GET /drivers/me/incentives', async () => {
      const db: any = {
        driver: {
          findUnique: jest.fn().mockResolvedValue({ id: 'd1', fleetId: 'fleet-1' }),
        },
        fleetIncentive: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'inc-all',
              name: 'All Drivers Milestone',
              type: 'TARGET_BASED',
              eligibilityScope: 'ALL',
              eligibleDriverIds: [],
              targetTrips: 5,
              requiredDurationMinutes: null,
              rewardAmount: 750,
              startsAt: new Date('2026-11-27T00:00:00.000Z'),
              endsAt: new Date('2026-11-30T23:59:59.000Z'),
              status: 'ACTIVE',
              progresses: [{ completedCount: 2, activeMinutes: 35, qualified: false }],
            },
            {
              id: 'inc-other-driver',
              name: 'Excluded Driver Bonus',
              type: 'TARGET_BASED',
              eligibilityScope: 'SELECTED',
              eligibleDriverIds: ['d-someone-else'],
              targetTrips: 3,
              rewardAmount: 500,
              startsAt: new Date('2026-11-27T00:00:00.000Z'),
              endsAt: new Date('2026-11-30T23:59:59.000Z'),
              status: 'ACTIVE',
              progresses: [],
            },
          ]),
        },
      };
      const driversService = new DriversService(db, {} as any, {} as any);
      const list = await driversService.getMyFleetIncentives('user-1');

      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('inc-all');
      expect(list[0].progress.completedCount).toBe(2);
      expect(list[0]).not.toHaveProperty('totalEarnings');
      expect(list[0]).not.toHaveProperty('walletBalance');
    });
  });

  describe('FleetShiftsService (Feature Flagged)', () => {
    const originalFlag = process.env.ENABLE_FLEET_SHIFTS;

    afterEach(() => {
      if (originalFlag === undefined) {
        delete process.env.ENABLE_FLEET_SHIFTS;
      } else {
        process.env.ENABLE_FLEET_SHIFTS = originalFlag;
      }
    });

    it('blocks shifts endpoints when ENABLE_FLEET_SHIFTS !== true', async () => {
      delete process.env.ENABLE_FLEET_SHIFTS;
      const service = new FleetShiftsService({} as any);
      await expect(service.listShifts('fleet-1')).rejects.toThrow(ForbiddenException);
    });

    it('detects overlapping driver shifts and throws ConflictException when enabled', async () => {
      process.env.ENABLE_FLEET_SHIFTS = 'true';
      const db: any = {
        driver: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'd1',
            fullName: 'Aarav',
            vehiclePlate: 'KA01AB1234',
          }),
        },
        fleetShift: {
          findFirst: jest.fn().mockResolvedValue({ id: 's-existing', title: 'Morning Shift' }),
        },
      };
      const service = new FleetShiftsService(db);

      await expect(
        service.createShift('fleet-1', {
          driverId: 'd1',
          title: 'Midday Shift',
          shiftStart: '2026-11-27T08:00:00.000Z',
          shiftEnd: '2026-11-27T16:00:00.000Z',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('updates fleet shift status when enabled and blocks foreign shift updates', async () => {
      process.env.ENABLE_FLEET_SHIFTS = 'true';
      const now = new Date('2026-11-27T08:00:00.000Z');
      const db: any = {
        fleetShift: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({ id: 's1', fleetId: 'fleet-1' })
            .mockResolvedValueOnce(null),
          update: jest.fn().mockResolvedValue({
            id: 's1',
            fleetId: 'fleet-1',
            driverId: 'd1',
            driver: { fullName: 'Aarav', vehiclePlate: 'KA01AB1234' },
            title: 'Morning Shift',
            shiftStart: now,
            shiftEnd: now,
            status: FleetShiftStatus.CANCELLED,
            notes: null,
            createdAt: now,
          }),
        },
      };
      const service = new FleetShiftsService(db);
      const updated = await service.updateShift('fleet-1', 's1', {
        status: FleetShiftStatus.CANCELLED,
      });
      expect(updated.status).toBe(FleetShiftStatus.CANCELLED);

      await expect(
        service.updateShift('fleet-1', 'foreign-shift', { status: FleetShiftStatus.ACTIVE }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
