import 'reflect-metadata';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FleetAdminRole } from '@adhocx/contracts';
import { FleetFinanceService } from '../../../src/domains/fleet/portal/earnings-payouts/fleet-finance.service';
import { DriversService } from '../../../src/modules/drivers/drivers.service';
import {
  assertInvariant,
  assertNonProductionEnvironment,
  createSimulatedFleetDb,
  resolveConfirmedLiveDbHost,
  runStep,
  SimulationReport,
  SimulationStepResult,
  writeSimulationReport,
} from './sim-runner';

async function run() {
  assertNonProductionEnvironment();
  const liveHost = resolveConfirmedLiveDbHost();
  const db: any = liveHost ? new PrismaClient() : createSimulatedFleetDb();

  const financeService = new FleetFinanceService(db);
  const driversService = new DriversService(
    db,
    { getDocumentAccessUrl: async (v: string) => v } as any,
    { log: async () => undefined } as any,
  );

  const steps: SimulationStepResult[] = [];
  const tag = Date.now().toString(36).toUpperCase();

  let fleetId = '';
  let adminId = '';
  let driverId = '';
  let driverUserId = '';
  let cleanupVerified: boolean;
  let passed = false;
  let failure: unknown = null;

  try {
    await runStep(steps, 'Seed Fleet, Fleet Owner, Driver & Completed Trips', async () => {
      const fleet = await db.fleet.create({
        data: {
          name: `Earnings Sim Fleet ${tag}`,
          code: `FLT-ERN${tag.slice(-3)}`,
          ownerName: 'Earnings Owner',
          phone: '9998886601',
          status: 'ACTIVE',
        },
      });
      fleetId = fleet.id;

      const admin = await db.fleetAdminUser.create({
        data: {
          fleetId,
          fullName: 'Earnings Owner',
          phone: '9998886601',
          passwordHash: 'sim-hash',
          role: 'FLEET_OWNER',
          status: 'ACTIVE',
        },
      });
      adminId = admin.id;

      driverUserId = randomUUID();
      if (liveHost) {
        await db.user.create({
          data: {
            id: driverUserId,
            phone: `99903${Date.now().toString().slice(-5)}`,
            fullName: 'Sim Earning Driver',
            role: 'DRIVER',
            status: 'ACTIVE',
          },
        });
      }
      const drv = await db.driver.create({
        data: {
          userId: driverUserId,
          fleetId,
          fullName: 'Sim Earning Driver',
          phone: `99903${Date.now().toString().slice(-5)}`,
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          walletBalance: 2500,
        },
      });
      driverId = drv.id;

      await db.trip.create({
        data: {
          driverId,
          vendorId: randomUUID(),
          requirementId: randomUUID(),
          assignmentId: randomUUID(),
          status: 'COMPLETED',
          pickupAddress: 'Indiranagar',
          dropAddress: 'Electronic City',
          totalDriverEarnings: 1400,
          driverRate: 1400,
        },
      });
      await db.trip.create({
        data: {
          driverId,
          vendorId: randomUUID(),
          requirementId: randomUUID(),
          assignmentId: randomUUID(),
          status: 'COMPLETED',
          pickupAddress: 'Whitefield',
          dropAddress: 'Hebbal',
          totalDriverEarnings: 1100,
          driverRate: 1100,
        },
      });
      return 'Seeded ₹2,500 completed earnings across 2 trips';
    });

    await runStep(steps, 'Verify Fleet Owner sees earnings while Driver API hides normal earnings', async () => {
      const fleetEarnings = await financeService.getEarnings(fleetId, {});
      assertInvariant(fleetEarnings.totalEarnings === 2500, 'Fleet earnings total equals ₹2,500');
      assertInvariant(fleetEarnings.driverBreakdown[0].earnings === 2500, 'Driver breakdown visible to Fleet Owner');

      const driverProfile = await driversService.getProfile(driverUserId);
      assertInvariant((driverProfile as any).walletBalance === undefined, 'Driver profile omits walletBalance');
      assertInvariant((driverProfile as any).isFleetDriver === true, 'Driver marked as fleet driver');
      return 'Owner sees ₹2,500; Driver response hides walletBalance cleanly';
    });

    const ownerCtx = {
      userId: adminId,
      fleetId,
      role: FleetAdminRole.FLEET_OWNER,
      permissions: ['VIEW_EARNINGS'],
      fullName: 'Earnings Owner',
    };

    await runStep(steps, 'Reject over-balance payout and accept valid payout request', async () => {
      let rejected = false;
      try {
        await financeService.requestPayout(ownerCtx, { amount: 3000 });
      } catch (err) {
        if (err instanceof BadRequestException) rejected = true;
      }
      assertInvariant(rejected, 'Over-balance payout rejected with BadRequestException');

      const payout = await financeService.requestPayout(ownerCtx, { amount: 1800, notes: 'Sim payout' });
      assertInvariant(payout.status === 'REQUESTED' && payout.amount === 1800, 'Payout REQUESTED state persisted');

      const history = await financeService.listPayouts(fleetId, { page: 1, limit: 10 });
      assertInvariant(history.items.length === 1 && history.items[0].referenceCode === payout.referenceCode, 'Payout query verified');
      return `Rejected ₹3,000 over-balance; persisted payout ${payout.referenceCode} for ₹1,800`;
    });

    passed = true;
  } catch (err) {
    failure = err;
  } finally {
    await db.fleetPayoutRequest.deleteMany({ where: { fleetId } });
    if (driverId) await db.trip.deleteMany({ where: { driverId } });
    if (driverId) await db.driver.deleteMany({ where: { id: driverId } });
    if (fleetId) await db.fleetAdminUser.deleteMany({ where: { fleetId } });
    if (fleetId) await db.fleet.delete({ where: { id: fleetId } }).catch(() => null);
    if (liveHost && driverUserId) {
      await db.user?.deleteMany?.({ where: { id: driverUserId } });
    }
    const left = fleetId ? await db.fleetPayoutRequest.count({ where: { fleetId } }) : 0;
    cleanupVerified = left === 0;
    if (liveHost && typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  }

  const report: SimulationReport = {
    suite: 'fleet-earnings-payout',
    mode: liveHost ? 'LIVE_DB' : 'ISOLATED_SERVICE_HARNESS',
    executedAt: new Date().toISOString(),
    passed: passed && cleanupVerified,
    cleanupVerified,
    steps,
  };

  const outDir = path.resolve(__dirname, 'reports');
  const { jsonPath, mdPath } = writeSimulationReport(report, outDir);
  console.log(`[fleet-earnings-payout] passed=${report.passed} cleanup=${cleanupVerified}`);
  console.log(`Reports written: ${jsonPath}, ${mdPath}`);
  if (failure) console.error(failure);
  if (!report.passed) process.exit(1);
}

void run();
