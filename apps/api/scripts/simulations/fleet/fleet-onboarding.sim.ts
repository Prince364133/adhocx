import 'reflect-metadata';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { FleetAdminRole } from '@adhocx/contracts';
import { FleetCodeService } from '../../../src/domains/fleet/portal/code/fleet-code.service';
import { FleetDriversService } from '../../../src/domains/fleet/portal/drivers/fleet-drivers.service';
import { FleetNotificationsService } from '../../../src/domains/fleet/portal/notifications/fleet-notifications.service';
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

  const fleetCodeService = new FleetCodeService(db);
  const fleetDriversService = new FleetDriversService(db);
  const notificationsService = new FleetNotificationsService(db);
  const driversService = new DriversService(
    db,
    { getDocumentAccessUrl: async (v: string) => v } as any,
    { log: async () => undefined } as any,
  );

  const steps: SimulationStepResult[] = [];
  const tag = Date.now().toString(36).toUpperCase();
  const fleetACode = `FLT-SIMA${tag.slice(-3)}`;
  const fleetBCode = `FLT-SIMB${tag.slice(-3)}`;

  let fleetAId = '';
  let fleetBId = '';
  let driver1Id = '';
  let driver1UserId = '';
  let driver2Id = '';
  let driver2UserId = '';
  let cleanupVerified: boolean;
  let passed = false;
  let failure: unknown = null;

  try {
    await runStep(steps, 'Seed Fleets A & B + Fleet Owner', async () => {
      const fleetA = await db.fleet.create({
        data: {
          name: `Sim Fleet A ${tag}`,
          code: fleetACode,
          codeStatus: 'ACTIVE',
          ownerName: 'Sim Owner A',
          phone: '9998887701',
          email: `owner-a-${tag}@sim.adhocx.local`,
          status: 'ACTIVE',
        },
      });
      const fleetB = await db.fleet.create({
        data: {
          name: `Sim Fleet B ${tag}`,
          code: fleetBCode,
          codeStatus: 'ACTIVE',
          ownerName: 'Sim Owner B',
          phone: '9998887702',
          email: `owner-b-${tag}@sim.adhocx.local`,
          status: 'ACTIVE',
        },
      });
      fleetAId = fleetA.id;
      fleetBId = fleetB.id;
      return `Created Fleets ${fleetACode} & ${fleetBCode}`;
    });

    const ownerCtx = {
      userId: randomUUID(),
      fleetId: fleetAId,
      role: FleetAdminRole.FLEET_OWNER,
      permissions: ['VIEW_EARNINGS'],
      fullName: 'Sim Owner A',
    };

    await runStep(steps, 'Owner fetches Fleet Code and onboards Driver 1 via Code', async () => {
      const codeInfo = await fleetCodeService.getFleetCode(fleetAId);
      assertInvariant(codeInfo.code === fleetACode, 'Fetched Fleet Code matches seeded fleet');

      driver1UserId = randomUUID();
      if (liveHost) {
        await db.user.create({
          data: {
            id: driver1UserId,
            phone: `99901${Date.now().toString().slice(-5)}`,
            fullName: 'Sim Driver One',
            role: 'DRIVER',
            status: 'ACTIVE',
          },
        });
      }
      const d1 = await db.driver.create({
        data: {
          userId: driver1UserId,
          fullName: 'Sim Driver One',
          phone: `99901${Date.now().toString().slice(-5)}`,
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          vehiclePlate: `KA01SIM${tag.slice(-3)}`,
          vehicleType: 'SEDAN',
          vehicleModel: 'Dzire',
        },
      });
      driver1Id = d1.id;

      const joined = await driversService.validateAndAssociateFleetCode(driver1UserId, {
        fleetCode: codeInfo.code,
      });
      assertInvariant(joined.associated && joined.fleetId === fleetAId, 'Driver 1 linked to Fleet A');
      return `Driver ${driver1Id} associated via ${codeInfo.code}`;
    });

    await runStep(steps, 'Verify FleetDriverHistory & DRIVER_JOINED notification', async () => {
      const history = await db.fleetDriverHistory.findMany({
        where: { fleetId: fleetAId, driverId: driver1Id },
      });
      assertInvariant(history.some((h: any) => h.action === 'ASSIGNED'), 'ASSIGNED history entry exists');

      const notifs = await notificationsService.listNotifications(fleetAId, { page: 1, limit: 20 });
      assertInvariant(
        notifs.items.some((n) => n.eventType === 'DRIVER_JOINED' && n.entityId === driver1Id),
        'DRIVER_JOINED notification persisted for Fleet A',
      );
      return `Verified history + DRIVER_JOINED unread notification`;
    });

    await runStep(steps, 'Enforce one-fleet rule (409 block when joining Fleet B)', async () => {
      let blocked = false;
      try {
        await driversService.validateAndAssociateFleetCode(driver1UserId, {
          fleetCode: fleetBCode,
        });
      } catch (err) {
        if (err instanceof ConflictException) blocked = true;
      }
      assertInvariant(blocked, 'Already-associated driver blocked from joining Fleet B');
      return 'Second-fleet association cleanly rejected with 409 Conflict';
    });

    await runStep(steps, 'Test late association without duplicate driver account & 1:1 vehicle reassignment', async () => {
      driver2UserId = randomUUID();
      if (liveHost) {
        await db.user.create({
          data: {
            id: driver2UserId,
            phone: `99902${Date.now().toString().slice(-5)}`,
            fullName: 'Sim Driver Two',
            role: 'DRIVER',
            status: 'ACTIVE',
          },
        });
      }
      const d2 = await db.driver.create({
        data: {
          userId: driver2UserId,
          fullName: 'Sim Driver Two',
          phone: `99902${Date.now().toString().slice(-5)}`,
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          vehiclePlate: `KA02SIM${tag.slice(-3)}`,
          vehicleType: 'SUV',
        },
      });
      driver2Id = d2.id;

      const joined2 = await driversService.validateAndAssociateFleetCode(driver2UserId, {
        fleetCode: fleetACode,
      });
      assertInvariant(joined2.driverId === driver2Id, 'Reused existing driver account without duplicate');

      await fleetDriversService.removeDriver(ownerCtx, driver1Id, 'Simulation handoff');
      const d1After = await db.driver.findUnique({ where: { id: driver1Id } });
      assertInvariant(d1After.fleetId === null, 'Driver 1 removed from fleet');

      const reassigned = await fleetDriversService.reassignVehicle(ownerCtx, driver2Id, {
        vehiclePlate: `KA01SIM${tag.slice(-3)}`,
        vehicleType: 'SEDAN',
      });
      assertInvariant(reassigned.vehiclePlate === `KA01SIM${tag.slice(-3)}`, '1:1 vehicle freed and reassigned to Driver 2');
      return 'Late association + removal + 1:1 vehicle transfer verified';
    });

    passed = true;
  } catch (err) {
    failure = err;
  } finally {
    await db.fleetNotification.deleteMany({ where: { fleetId: { in: [fleetAId, fleetBId].filter(Boolean) } } });
    await db.fleetDriverHistory.deleteMany({ where: { fleetId: { in: [fleetAId, fleetBId].filter(Boolean) } } });
    await db.driver.deleteMany({ where: { id: { in: [driver1Id, driver2Id].filter(Boolean) } } });
    if (liveHost) {
      await db.user?.deleteMany?.({ where: { id: { in: [driver1UserId, driver2UserId].filter(Boolean) } } });
    }
    if (fleetAId) await db.fleet.delete({ where: { id: fleetAId } }).catch(() => null);
    if (fleetBId) await db.fleet.delete({ where: { id: fleetBId } }).catch(() => null);

    const remainingDrivers = driver1Id
      ? await db.driver.count({ where: { id: { in: [driver1Id, driver2Id].filter(Boolean) } } })
      : 0;
    cleanupVerified = remainingDrivers === 0;
    if (liveHost && typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  }

  const report: SimulationReport = {
    suite: 'fleet-onboarding',
    mode: liveHost ? 'LIVE_DB' : 'ISOLATED_SERVICE_HARNESS',
    executedAt: new Date().toISOString(),
    passed: passed && cleanupVerified,
    cleanupVerified,
    steps,
  };

  const outDir = path.resolve(__dirname, 'reports');
  const { jsonPath, mdPath } = writeSimulationReport(report, outDir);
  console.log(`[fleet-onboarding] passed=${report.passed} cleanup=${cleanupVerified}`);
  console.log(`Reports written: ${jsonPath}, ${mdPath}`);
  if (failure) console.error(failure);
  if (!report.passed) process.exit(1);
}

void run();
