import { assertVehiclePlateAvailable } from '../src/common/utils/uniqueness.util';

describe('Shared Vehicle Registration (Multi-Driver Vehicle Support)', () => {
  it('should allow multiple drivers to register and share the exact same vehicle number', async () => {
    const mockDb: any = {
      vehicle: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'veh-1',
            driverId: 'driver-1',
            registrationNumber: 'DL01AB1234',
          },
        ]),
      },
      driver: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'driver-1',
          vehiclePlate: 'DL01AB1234',
        }),
      },
    };

    // Driver 2 registering the same vehicle DL01AB1234 should NOT throw ConflictException
    await expect(
      assertVehiclePlateAvailable(mockDb, 'DL01AB1234', {
        excludeDriverId: 'driver-2',
        excludeUserId: 'user-2',
      }),
    ).resolves.not.toThrow();
  });
});
