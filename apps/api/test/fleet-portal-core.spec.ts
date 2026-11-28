import { ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FleetAdminRole } from '@adhocx/contracts';
import { FleetAuthGuard } from '../src/domains/fleet/portal/guards/fleet-auth.guard';
import { FleetRolesGuard } from '../src/domains/fleet/portal/guards/fleet-roles.guard';
import { FleetCodeService } from '../src/domains/fleet/portal/code/fleet-code.service';
import { FleetDriversService } from '../src/domains/fleet/portal/drivers/fleet-drivers.service';

describe('FleetDomainModule Portal Core (Phase 3)', () => {
  describe('FleetAuthGuard & FleetRolesGuard', () => {
    it('rejects requests without Bearer token (401)', async () => {
      const guard = new FleetAuthGuard({} as any, { get: () => 'secret' } as any, {} as any);
      const ctx: any = {
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      };
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects FLEET_MANAGER when FLEET_OWNER role is required (403)', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockImplementation((key) =>
          key === 'fleet_roles' ? [FleetAdminRole.FLEET_OWNER] : undefined,
        ),
      } as unknown as Reflector;
      const guard = new FleetRolesGuard(reflector);
      const ctx: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            fleetContext: {
              userId: 'u1',
              fleetId: 'f1',
              role: FleetAdminRole.FLEET_MANAGER,
              permissions: [],
              fullName: 'Manager',
            },
          }),
        }),
      };
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('FleetCodeService', () => {
    it('regenerates unique Fleet Code and emits notification without disconnecting drivers', async () => {
      const db: any = {
        fleet: {
          findUnique: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({
            id: 'f1',
            code: 'FLT-ABC123',
            codeStatus: 'ACTIVE',
            codeRotatedAt: new Date(),
          }),
        },
        fleetNotification: {
          create: jest.fn().mockResolvedValue({ id: 'n1' }),
        },
      };
      const service = new FleetCodeService(db);
      const res = await service.regenerateFleetCode({
        userId: 'u1',
        fleetId: 'f1',
        role: 'FLEET_OWNER',
        permissions: [],
        fullName: 'Owner',
      });

      expect(res.code).toBe('FLT-ABC123');
      expect(db.fleetNotification.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('FleetDriversService', () => {
    it('blocks cross-fleet driver inspection (404)', async () => {
      const db: any = {
        driver: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      const service = new FleetDriversService(db);
      await expect(service.getDriverDetail('fleet-a', 'driver-in-fleet-b')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('enforces 1:1 vehicle assignment within fleet (409 conflict on duplicate plate)', async () => {
      const db: any = {
        driver: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({ id: 'd1', fleetId: 'f1' })
            .mockResolvedValueOnce({ id: 'd2', fullName: 'Other Driver' }),
        },
      };
      const service = new FleetDriversService(db);
      await expect(
        service.reassignVehicle(
          { userId: 'u1', fleetId: 'f1', role: 'FLEET_OWNER', permissions: [], fullName: 'Owner' },
          'd1',
          { vehiclePlate: 'KA01AB1234' },
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
