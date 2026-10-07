import { Test, TestingModule } from '@nestjs/testing';
import { LocationsService } from '../src/modules/locations/locations.service';
import { H3Service } from '../src/modules/locations/h3.service';
import { DatabaseService } from '../src/database/database.service';
import { DriverAvailability, VerificationStatus, VehicleType } from '@adhocx/contracts';

describe('LocationsService', () => {
  let service: LocationsService;
  let h3Service: H3Service;
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
        H3Service,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    h3Service = module.get<H3Service>(H3Service);
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

  describe('Uber H3 Spatial Grid Integration', () => {
    it('should convert coordinates to a valid Uber H3 Resolution 8 cell', () => {
      // Hyderabad Cyber Towers (17.4435, 78.3772)
      const h3Cell = service.latLngToH3(17.4435, 78.3772, 8);
      expect(h3Cell).toBe('8860a259bbfffff');
      expect(h3Service.isValidCell(h3Cell)).toBe(true);
    });

    it('should get centroid coordinates from an H3 cell', () => {
      const coords = service.h3ToLatLng('8860a259bbfffff');
      expect(coords.latitude).toBeCloseTo(17.4434, 3);
      expect(coords.longitude).toBeCloseTo(78.3796, 3);
    });

    it('should generate concentric hexagonal disks for wave dispatch', () => {
      const origin = '8860a259bbfffff';
      const disk0 = service.getH3Disk(origin, 0);
      const disk1 = service.getH3Disk(origin, 1);
      const disk2 = service.getH3Disk(origin, 2);

      // k=0 -> 1 cell
      expect(disk0.length).toBe(1);
      expect(disk0[0]).toBe(origin);

      // k=1 -> 7 cells (origin + 6 equidistant neighbors)
      expect(disk1.length).toBe(7);
      expect(disk1).toContain(origin);

      // k=2 -> 19 cells
      expect(disk2.length).toBe(19);
    });

    it('should generate non-overlapping rings for incremental wave escalation', () => {
      const origin = '8860a259bbfffff';
      const ring1 = service.getH3Ring(origin, 1);
      const ring2 = service.getH3Ring(origin, 2);

      // Ring 1 has exactly 6 hollow neighbor cells
      expect(ring1.length).toBe(6);
      expect(ring1).not.toContain(origin);

      // Ring 2 has exactly 12 hollow outer neighbor cells
      expect(ring2.length).toBe(12);

      // Disjoint sets: Ring 1 and Ring 2 have zero overlap
      const ring1Set = new Set(ring1);
      const overlap = ring2.filter((c) => ring1Set.has(c));
      expect(overlap.length).toBe(0);
    });

    it('should fall back smoothly to database when searching drivers via H3 without Redis', async () => {
      const drivers = [
        {
          id: 'drv-h3-1',
          availabilityStatus: DriverAvailability.AVAILABLE,
          verificationStatus: VerificationStatus.VERIFIED,
          currentLat: 17.4435,
          currentLng: 78.3772,
        },
      ];
      mockDb.driver.findMany.mockResolvedValue(drivers);

      const candidates = await service.findNearbyDriversByH3(17.4435, 78.3772, 2, VehicleType.SEDAN);
      expect(candidates.length).toBe(1);
      expect(candidates[0].driverId).toBe('drv-h3-1');
      expect(candidates[0].h3Cell).toBeDefined();
    });
  });
});
