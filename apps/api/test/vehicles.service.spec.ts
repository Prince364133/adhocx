import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesService } from '../src/modules/vehicles/vehicles.service';
import { DatabaseService } from '../src/database/database.service';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let mockDb: { vehicle: { findMany: jest.Mock } };

  beforeEach(async () => {
    mockDb = {
      vehicle: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find vehicles by driver ID', async () => {
    const mockVehicles = [
      { id: 'veh-1', driverId: 'drv-1', registrationNumber: 'DL01AB1234', model: 'Dzire' },
    ];
    mockDb.vehicle.findMany.mockResolvedValue(mockVehicles);

    const result = await service.findByDriver('drv-1');
    expect(result).toEqual(mockVehicles);
    expect(mockDb.vehicle.findMany).toHaveBeenCalledWith({
      where: { driverId: 'drv-1' },
    });
  });
});
