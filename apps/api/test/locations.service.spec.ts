import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from '../src/modules/locations/locations.service';
import { DatabaseService } from '../src/database/database.service';
import { DriverAvailability, VerificationStatus, VehicleType } from '@adhocx/contracts';

describe('LocationsService', () => {
  let service: LocationsService;
  let mockDb: {
    driver: { update: jest.Mock; findMany: jest.Mock };
    $queryRawUnsafe: jest.Mock;
  };

  beforeEach(async () => {
    mockDb = {
      driver: {
        update: jest.fn().mockResolvedValue({ id: 'drv-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('PostGIS not available in test')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should update driver location and timestamp', async () => {
    await service.updateDriverLocation('drv-1', 28.6139, 77.2090);

    expect(mockDb.driver.update).toHaveBeenCalledWith({
      where: { id: 'drv-1' },
      data: {
        currentLat: 28.6139,
        currentLng: 77.2090,
        lastLocationAt: expect.any(Date),
      },
    });
  });

  it('should calculate accurate Haversine distance between two coordinates', () => {
    // Delhi Connaught Place to Noida Sector 62 ~ 17 km
    const dist = service.calculateDistanceKm(28.6315, 77.2167, 28.6280, 77.3649);
    expect(dist).toBeGreaterThan(14);
    expect(dist).toBeLessThan(18);
  });

  it('should find nearby drivers using Haversine calculation fallback', async () => {
    const drivers = [
      {
        id: 'drv-near',
        availabilityStatus: DriverAvailability.AVAILABLE,
        verificationStatus: VerificationStatus.VERIFIED,
        currentLat: 28.6140, // ~100m away
        currentLng: 77.2091,
      },
      {
        id: 'drv-far',
        availabilityStatus: DriverAvailability.AVAILABLE,
        verificationStatus: VerificationStatus.VERIFIED,
        currentLat: 28.4595, // ~25km away in Gurgaon
        currentLng: 77.0266,
      },
    ];

    mockDb.driver.findMany.mockResolvedValue(drivers);

    // Search radius: 5km around Delhi (28.6139, 77.2090)
    const results = await service.findNearbyDrivers(28.6139, 77.2090, 5, VehicleType.SEDAN);

    expect(results.length).toBe(1);
    expect(results[0].driverId).toBe('drv-near');
    expect(results[0].distanceKm).toBeLessThan(1);
  });
});
