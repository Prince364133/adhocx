import * as fs from 'fs';
import * as path from 'path';
import { NotFoundException } from '@nestjs/common';
import { FleetAdminRole, FleetIncentiveStatus, FleetShiftStatus } from '@adhocx/contracts';
import { FleetCodeService } from '../src/domains/fleet/portal/code/fleet-code.service';
import { FleetDashboardService } from '../src/domains/fleet/portal/dashboard/fleet-dashboard.service';
import { FleetDriversService } from '../src/domains/fleet/portal/drivers/fleet-drivers.service';
import { FleetFinanceService } from '../src/domains/fleet/portal/earnings-payouts/fleet-finance.service';
import { FleetIncentivesService } from '../src/domains/fleet/portal/incentives/fleet-incentives.service';
import { FleetLiveOpsService } from '../src/domains/fleet/portal/live-operations/fleet-live-ops.service';
import { FleetNotificationsService } from '../src/domains/fleet/portal/notifications/fleet-notifications.service';
import { FleetShiftsService } from '../src/domains/fleet/portal/shifts/fleet-shifts.service';
import { FleetSupportService } from '../src/domains/fleet/portal/support/fleet-support.service';

describe('Fleet Portal Cross-Tenant Penetration & Security Audit (Phase 6)', () => {
  const FLEET_A = 'fleet-a-1111';
  const FLEET_B = 'fleet-b-2222';
  const fleetBCtx = {
    userId: 'owner-b',
    fleetId: FLEET_B,
    role: FleetAdminRole.FLEET_OWNER,
    permissions: ['VIEW_EARNINGS'],
    fullName: 'Owner B',
  };

  it('blocks Fleet B from reading or mutating any Fleet A resource across all portal services (404/scoped filters)', async () => {
    const db: any = {
      driver: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      trip: { findMany: jest.fn().mockResolvedValue([]) },
      fleet: {
        findUnique: jest.fn().mockResolvedValue({
          id: FLEET_B,
          name: 'Fleet B',
          code: 'FLT-B',
          codeStatus: 'ACTIVE',
        }),
      },
      fleetPayoutRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      fleetShortfallRecord: { findMany: jest.fn().mockResolvedValue([]) },
      fleetIncentive: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      fleetIncentiveProgress: { findMany: jest.fn().mockResolvedValue([]) },
      fleetSupportTicket: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      fleetNotification: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      fleetShift: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const driversSvc = new FleetDriversService(db);
    const incentivesSvc = new FleetIncentivesService(db);
    const supportSvc = new FleetSupportService(db);
    const notifsSvc = new FleetNotificationsService(db);
    const shiftsSvc = new FleetShiftsService(db);

    process.env.ENABLE_FLEET_SHIFTS = 'true';
    try {
      await expect(driversSvc.getDriverDetail(FLEET_B, 'fleet-a-driver')).rejects.toThrow(NotFoundException);
      await expect(
        driversSvc.reassignVehicle(fleetBCtx, 'fleet-a-driver', { vehiclePlate: 'KA01AA1111' }),
      ).rejects.toThrow(NotFoundException);
      await expect(driversSvc.removeDriver(fleetBCtx, 'fleet-a-driver')).rejects.toThrow(NotFoundException);
      await expect(
        incentivesSvc.updateIncentive(fleetBCtx, 'fleet-a-inc', { status: FleetIncentiveStatus.PAUSED }),
      ).rejects.toThrow(NotFoundException);
      await expect(incentivesSvc.getIncentiveProgress(FLEET_B, 'fleet-a-inc')).rejects.toThrow(NotFoundException);
      await expect(supportSvc.getTicketDetail(FLEET_B, 'fleet-a-ticket')).rejects.toThrow(NotFoundException);
      await expect(
        supportSvc.replyToTicket(fleetBCtx, 'fleet-a-ticket', { body: 'Cross-tenant poke' }),
      ).rejects.toThrow(NotFoundException);
      await expect(notifsSvc.markRead(FLEET_B, 'fleet-a-notif')).rejects.toThrow(NotFoundException);
      await expect(
        shiftsSvc.updateShift(FLEET_B, 'fleet-a-shift', { status: FleetShiftStatus.CANCELLED }),
      ).rejects.toThrow(NotFoundException);
    } finally {
      delete process.env.ENABLE_FLEET_SHIFTS;
    }

    // List operations strictly filter by FLEET_B and never accept FLEET_A
    const dashboardSvc = new FleetDashboardService(db);
    const liveOpsSvc = new FleetLiveOpsService(db);
    const financeSvc = new FleetFinanceService(db);
    const codeSvc = new FleetCodeService(db);

    await dashboardSvc.getDashboard(FLEET_B, {});
    await liveOpsSvc.getLiveOperations(FLEET_B, {});
    await financeSvc.getEarnings(FLEET_B, {});
    await financeSvc.listPayouts(FLEET_B, { page: 1, limit: 10 });
    await financeSvc.listShortfallClaims(FLEET_B);
    await codeSvc.getFleetCode(FLEET_B);

    for (const call of db.driver.findMany.mock.calls) {
      expect(call[0]?.where?.fleetId).toBe(FLEET_B);
      expect(call[0]?.where?.fleetId).not.toBe(FLEET_A);
    }
    for (const call of db.fleetPayoutRequest.findMany.mock.calls) {
      expect(call[0]?.where?.fleetId).toBe(FLEET_B);
    }
  });

  it('contains no hardcoded JWT fallback secrets or forbidden standalone modules in apps/fleet', () => {
    const fleetPortalDir = path.resolve(__dirname, '../src/domains/fleet');
    const portalFiles: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts')) portalFiles.push(full);
      }
    };
    walk(fleetPortalDir);

    for (const f of portalFiles) {
      const content = fs.readFileSync(f, 'utf8');
      expect(content).not.toMatch(/dev[-_]?secret|fallback[-_]?secret|hardcoded/i);
    }

    const sidebarSrc = fs.readFileSync(
      path.resolve(__dirname, '../../fleet/src/components/layout/Sidebar.tsx'),
      'utf8',
    );
    expect(sidebarSrc).not.toMatch(/href:\s*['"]\/trips['"]/);
    expect(sidebarSrc).not.toMatch(/href:\s*['"]\/vehicles['"]/);
    expect(sidebarSrc).not.toMatch(/href:\s*['"]\/settings['"]/);
    expect(sidebarSrc).not.toMatch(/href:\s*['"]\/coupons['"]/);
  });
});
