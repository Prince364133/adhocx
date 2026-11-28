import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DriversService } from '../src/modules/drivers/drivers.service';

describe('Driver Fleet Code Association & Earnings Redaction', () => {
  function createService(dbOverrides: any) {
    const mockDb: any = {
      driver: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      fleet: {
        findUnique: jest.fn(),
      },
      fleetDriverHistory: {
        create: jest.fn(),
      },
      fleetNotification: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([]),
      ...dbOverrides,
    };
    const mockStorage: any = { getDocumentAccessUrl: jest.fn() };
    const mockAudit: any = { log: jest.fn() };
    return { service: new DriversService(mockDb, mockStorage, mockAudit), db: mockDb };
  }

  it('rejects already-associated driver with ALREADY_IN_FLEET conflict (one-fleet rule)', async () => {
    const { service } = createService({
      driver: {
        findUnique: jest.fn().mockResolvedValue({ id: 'd1', fleetId: 'existing-fleet' }),
      },
    });
    await expect(
      service.validateAndAssociateFleetCode('user-1', { fleetCode: 'FLT-123456' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects invalid Fleet Code (404)', async () => {
    const { service } = createService({
      driver: {
        findUnique: jest.fn().mockResolvedValue({ id: 'd1', fleetId: null }),
      },
      fleet: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      service.validateAndAssociateFleetCode('user-1', { fleetCode: 'FLT-NONE' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects disabled Fleet Code (400)', async () => {
    const { service } = createService({
      driver: {
        findUnique: jest.fn().mockResolvedValue({ id: 'd1', fleetId: null }),
      },
      fleet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'f1', status: 'ACTIVE', codeStatus: 'DISABLED' }),
      },
    });
    await expect(
      service.validateAndAssociateFleetCode('user-1', { fleetCode: 'FLT-OFF' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('associates unlinked existing driver cleanly without creating duplicate account', async () => {
    const { service, db } = createService({
      driver: {
        findUnique: jest.fn().mockResolvedValue({ id: 'd1', fullName: 'Ravi', phone: '9876543210', fleetId: null }),
        update: jest.fn().mockReturnValue({}),
      },
      fleet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'f1', name: 'Metro Fleet', code: 'FLT-OK1234', status: 'ACTIVE', codeStatus: 'ACTIVE' }),
      },
    });

    const result = await service.validateAndAssociateFleetCode('user-1', { fleetCode: 'flt-ok1234' });
    expect(result.associated).toBe(true);
    expect(result.driverId).toBe('d1');
    expect(result.fleetCode).toBe('FLT-OK1234');
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('omits walletBalance from driver profile when driver belongs to a fleet', async () => {
    const { service } = createService({
      driver: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'd1',
          userId: 'u1',
          fullName: 'Fleet Driver',
          phone: '9876543210',
          verificationStatus: 'VERIFIED',
          availabilityStatus: 'AVAILABLE',
          walletBalance: 9999,
          fleetId: 'f1',
          kycDocuments: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
    });

    const profile = await service.getProfile('u1');
    expect(profile.walletBalance).toBeUndefined();
    expect(profile.isFleetDriver).toBe(true);
    expect(profile.fleetId).toBe('f1');
  });
});
