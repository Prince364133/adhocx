import 'reflect-metadata';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import {
  FleetAdminRole,
  FleetIncentiveEligibility,
  FleetIncentiveType,
} from '@adhocx/contracts';
import { FleetIncentivesService } from '../../../src/domains/fleet/portal/incentives/fleet-incentives.service';
import { FleetNotificationsService } from '../../../src/domains/fleet/portal/notifications/fleet-notifications.service';
import { FleetSupportService } from '../../../src/domains/fleet/portal/support/fleet-support.service';
import { DriversService } from '../../../src/modules/drivers/drivers.service';
import { TripsService } from '../../../src/modules/trips/trips.service';
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

  const incentivesService = new FleetIncentivesService(db);
  const supportService = new FleetSupportService(db);
  const notificationsService = new FleetNotificationsService(db);
  const driversService = new DriversService(
    db,
    { getDocumentAccessUrl: async (v: string) => v } as any,
    { log: async () => undefined } as any,
  );
  const pushCalls: any[] = [];
  const tripsService = new TripsService(
    db,
    {} as any,
    {
      emitEvent: () => undefined,
      sendPushToUser: async (userId: string, payload: any) => {
        pushCalls.push({ userId, payload });
        return { success: true };
      },
    } as any,
    { log: async () => undefined } as any,
  );

  const steps: SimulationStepResult[] = [];
  const tag = Date.now().toString(36).toUpperCase();

  let fleetId = '';
  let adminId = '';
  let driverId = '';
  let driverUserId = '';
  let targetIncentiveId = '';
  let timeIncentiveId = '';
  let ticketId = '';
  let cleanupVerified: boolean;
  let passed = false;
  let failure: unknown = null;

  try {
    await runStep(steps, 'Seed Fleet, Fleet Owner, and Associated Driver', async () => {
      const fleet = await db.fleet.create({
        data: {
          name: `Incentives Sim Fleet ${tag}`,
          code: `FLT-INC${tag.slice(-3)}`,
          ownerName: 'Incentives Owner',
          phone: '9998885501',
          status: 'ACTIVE',
        },
      });
      fleetId = fleet.id;

      const admin = await db.fleetAdminUser.create({
        data: {
          fleetId,
          fullName: 'Incentives Owner',
          phone: '9998885501',
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
            phone: `99904${Date.now().toString().slice(-5)}`,
            fullName: 'Sim Incentive Driver',
            role: 'DRIVER',
            status: 'ACTIVE',
          },
        });
      }
      const drv = await db.driver.create({
        data: {
          userId: driverUserId,
          fleetId,
          fullName: 'Sim Incentive Driver',
          phone: `99904${Date.now().toString().slice(-5)}`,
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
        },
      });
      driverId = drv.id;
      return `Seeded fleet ${fleetId} and driver ${driverId}`;
    });

    const ownerCtx = {
      userId: adminId,
      fleetId,
      role: FleetAdminRole.FLEET_OWNER,
      permissions: ['VIEW_EARNINGS'],
      fullName: 'Incentives Owner',
    };

    await runStep(steps, 'Create Target-Based & Time-Based incentives', async () => {
      const startsAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const target = await incentivesService.createIncentive(ownerCtx, {
        name: '5-Trip Milestone',
        type: FleetIncentiveType.TARGET_BASED,
        eligibilityScope: FleetIncentiveEligibility.ALL,
        targetTrips: 5,
        rewardAmount: 1000,
        startsAt,
        endsAt,
      });
      targetIncentiveId = target.id;

      const time = await incentivesService.createIncentive(ownerCtx, {
        name: '90-Min Active Bonus',
        type: FleetIncentiveType.TIME_BASED,
        eligibilityScope: FleetIncentiveEligibility.SELECTED,
        eligibleDriverIds: [driverId],
        requiredDurationMinutes: 90,
        rewardAmount: 600,
        startsAt,
        endsAt,
      });
      timeIncentiveId = time.id;

      return `Created TARGET_BASED (${targetIncentiveId}) & TIME_BASED (${timeIncentiveId})`;
    });

    await runStep(steps, 'Simulate 5 trips updating FleetIncentiveProgress, Driver /me/incentives & notifications', async () => {
      for (let i = 1; i <= 5; i++) {
        const end = new Date();
        const start = new Date(end.getTime() - 20 * 60 * 1000);
        await tripsService.updateFleetIncentiveProgress(driverId, fleetId, start, end);
      }

      const targetProgress = await incentivesService.getIncentiveProgress(fleetId, targetIncentiveId);
      const timeProgress = await incentivesService.getIncentiveProgress(fleetId, timeIncentiveId);
      assertInvariant(
        targetProgress[0].completedCount === 5 && targetProgress[0].qualified === true,
        'Target incentive qualified after 5 trips',
      );
      assertInvariant(
        timeProgress[0].activeMinutes === 100 && timeProgress[0].qualified === true,
        'Time incentive qualified after 100 active minutes',
      );

      const driverIncentives = await driversService.getMyFleetIncentives(driverUserId);
      assertInvariant(driverIncentives.length === 2, 'Driver views both active incentives & progress');
      assertInvariant(!('totalEarnings' in driverIncentives[0]), 'Normal earnings absent from driver incentives view');

      const notifs = await notificationsService.listNotifications(fleetId, { page: 1, limit: 20 });
      assertInvariant(notifs.items.some((n) => n.eventType === 'INCENTIVE_APPROACHING'), 'INCENTIVE_APPROACHING recorded');
      assertInvariant(notifs.items.some((n) => n.eventType === 'INCENTIVE_QUALIFIED'), 'INCENTIVE_QUALIFIED recorded');
      assertInvariant(pushCalls.length >= 2, 'Driver push notifications triggered');
      return `Verified progress qualification, Driver view, INCENTIVE_APPROACHING & INCENTIVE_QUALIFIED`;
    });

    await runStep(steps, 'Create support ticket with attachment, fetch thread & post reply', async () => {
      const presign = await supportService.presignAttachment(ownerCtx, {
        fileName: 'trip-receipt.pdf',
        mimeType: 'application/pdf',
      });

      const createdTicket = await supportService.createTicket(ownerCtx, {
        category: 'INCENTIVE',
        subject: 'Incentive payout verification',
        description: 'Confirming bonus payout schedule for 5-trip milestone.',
        attachments: [
          {
            key: presign.key,
            fileName: 'trip-receipt.pdf',
            mimeType: 'application/pdf',
          },
        ],
      });
      ticketId = createdTicket.id;

      await supportService.replyToTicket(ownerCtx, ticketId, {
        body: 'Adding driver trip log summary.',
      });

      const detail = await supportService.getTicketDetail(fleetId, ticketId);
      assertInvariant(detail.messages.length === 2, 'Support thread contains initial description + reply');

      const notifs = await notificationsService.listNotifications(fleetId, { page: 1, limit: 30 });
      assertInvariant(notifs.items.some((n) => n.eventType === 'SUPPORT_TICKET_REPLY'), 'SUPPORT_TICKET_REPLY recorded');
      return `Verified support ticket ${createdTicket.ticketNumber} thread & SUPPORT_TICKET_REPLY alert`;
    });

    passed = true;
  } catch (err) {
    failure = err;
  } finally {
    await db.fleetNotification.deleteMany({ where: { fleetId } });
    await db.fleetSupportTicket.deleteMany({ where: { fleetId } });
    await db.fleetIncentiveProgress.deleteMany({ where: { fleetId } });
    await db.fleetIncentive.deleteMany({ where: { fleetId } });
    if (driverId) await db.driver.deleteMany({ where: { id: driverId } });
    if (fleetId) await db.fleetAdminUser.deleteMany({ where: { fleetId } });
    if (fleetId) await db.fleet.delete({ where: { id: fleetId } }).catch(() => null);
    if (liveHost && driverUserId) {
      await db.user?.deleteMany?.({ where: { id: driverUserId } });
    }
    const leftTickets = fleetId ? await db.fleetSupportTicket.count({ where: { fleetId } }) : 0;
    cleanupVerified = leftTickets === 0;
    if (liveHost && typeof db.$disconnect === 'function') {
      await db.$disconnect();
    }
  }

  const report: SimulationReport = {
    suite: 'fleet-incentives-support',
    mode: liveHost ? 'LIVE_DB' : 'ISOLATED_SERVICE_HARNESS',
    executedAt: new Date().toISOString(),
    passed: passed && cleanupVerified,
    cleanupVerified,
    steps,
  };

  const outDir = path.resolve(__dirname, 'reports');
  const { jsonPath, mdPath } = writeSimulationReport(report, outDir);
  console.log(`[fleet-incentives-support] passed=${report.passed} cleanup=${cleanupVerified}`);
  console.log(`Reports written: ${jsonPath}, ${mdPath}`);
  if (failure) console.error(failure);
  if (!report.passed) process.exit(1);
}

void run();
