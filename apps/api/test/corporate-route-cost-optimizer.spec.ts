import {
  CabTypeConfig,
  PricingConfig,
  calculateDistanceCharge,
  calculateBearing,
  angularDistance,
  corridorPenalty,
  selectCheapestCab,
  optimizeGroups,
  mergeCompatibleGroups,
} from '../src/domains/corporate/routing/cost-optimizer';

describe('Corporate Route Cost Optimizer & Corridor Heuristic Suite', () => {
  const office = { lat: 17.4, lng: 78.5 };

  const customPricing: PricingConfig = {
    employeeRevenue: 1800.0,
    revenuePerKm: 0.0,
    cabTypes: [
      {
        name: 'sedan',
        capacity: 4,
        fleetCount: 5,
        fixedCharge: 350.0,
        perKmCharge: 14.0,
        distanceSlabs: [
          { upToKm: 10, ratePerKm: 14.0 },
          { upToKm: 25, ratePerKm: 12.0 },
          { upToKm: 1000, ratePerKm: 10.0 },
        ],
      },
      {
        name: 'suv',
        capacity: 6,
        fleetCount: 5,
        fixedCharge: 500.0,
        perKmCharge: 16.0,
        distanceSlabs: [
          { upToKm: 10, ratePerKm: 16.0 },
          { upToKm: 25, ratePerKm: 14.0 },
          { upToKm: 1000, ratePerKm: 12.0 },
        ],
      },
    ],
  };

  function createEmployee(name: string, lat: number, lng: number, officeDistanceKm: number) {
    return {
      employeeName: name,
      coord: { lat, lng },
      officeDistanceKm,
    };
  }

  describe('1. Tiered Slab Distance Costing', () => {
    it('should calculate distance charge with multi-tier marginal slabs for Sedan', () => {
      const sedan = customPricing.cabTypes[0];

      // 12 km trip:
      // Fixed: 350
      // 0-10 km @ 14 = 140
      // 10-12 km @ 12 = 24
      // Total = 350 + 140 + 24 = 514
      const charge12Km = calculateDistanceCharge(12, sedan);
      expect(charge12Km).toBe(514);

      // 30 km trip:
      // Fixed: 350
      // 0-10 km @ 14 = 140
      // 10-25 km @ 12 = 180
      // 25-30 km @ 10 = 50
      // Total = 350 + 140 + 180 + 50 = 720
      const charge30Km = calculateDistanceCharge(30, sedan);
      expect(charge30Km).toBe(720);
    });

    it('should calculate distance charge with multi-tier marginal slabs for SUV', () => {
      const suv = customPricing.cabTypes[1];

      // 20 km trip in SUV:
      // Fixed: 500
      // 0-10 km @ 16 = 160
      // 10-20 km @ 14 = 140
      // Total = 500 + 160 + 140 = 800
      const charge20Km = calculateDistanceCharge(20, suv);
      expect(charge20Km).toBe(800);
    });

    it('should fall back to linear perKmCharge when no slabs are defined', () => {
      const flatCab: CabTypeConfig = {
        name: 'flat-cab',
        capacity: 4,
        fleetCount: 10,
        fixedCharge: 200,
        perKmCharge: 15,
        distanceSlabs: [],
      };

      const charge = calculateDistanceCharge(10, flatCab);
      expect(charge).toBe(350); // 200 + 10 * 15
    });
  });

  describe('2. Great-Circle Bearings & Angular Distance', () => {
    it('should calculate correct angular distance between bearings crossing 0/360 boundary', () => {
      expect(angularDistance(350, 10)).toBe(20);
      expect(angularDistance(10, 350)).toBe(20);
      expect(angularDistance(0, 180)).toBe(180);
      expect(angularDistance(90, 270)).toBe(180);
      expect(angularDistance(45, 90)).toBe(45);
    });

    it('should compute forward bearing from office to coordinate points', () => {
      // Due north point
      const north = { lat: 18.4, lng: 78.5 };
      const northBearing = calculateBearing(office, north);
      expect(northBearing).toBeCloseTo(0, 0);

      // Due east point
      const east = { lat: 17.4, lng: 79.5 };
      const eastBearing = calculateBearing(office, east);
      expect(eastBearing).toBeCloseTo(90, 0);

      // Due south point
      const south = { lat: 16.4, lng: 78.5 };
      const southBearing = calculateBearing(office, south);
      expect(southBearing).toBeCloseTo(180, 0);
    });
  });

  describe('3. Corridor Clustering & Penalty Evaluation', () => {
    it('should calculate high corridor penalty for employee located in opposite quadrant', () => {
      const northGroup = [
        createEmployee('N1', 18.0, 78.5, 66),
        createEmployee('N2', 17.9, 78.5, 55),
      ];

      const northCandidate = createEmployee('N3', 18.1, 78.5, 77);
      const southCandidate = createEmployee('S1', 16.8, 78.5, 66);

      const penaltyNorth = corridorPenalty(
        northCandidate.coord,
        office,
        northGroup.map((p) => p.coord),
      );
      const penaltySouth = corridorPenalty(
        southCandidate.coord,
        office,
        northGroup.map((p) => p.coord),
      );

      expect(penaltyNorth).toBeLessThan(15);
      expect(penaltySouth).toBeGreaterThan(160);
    });

    it('should optimize groups without mixing employees in opposite radial corridors', () => {
      const employees = [
        createEmployee('north-a', 18.0, 78.5, 66),
        createEmployee('north-b', 17.9, 78.5, 55),
        createEmployee('south-a', 16.9, 78.5, 55),
        createEmployee('south-b', 17.0, 78.5, 44),
      ];

      const groups = optimizeGroups(employees, office, customPricing, 4, 70);

      expect(groups.length).toBe(2);
      for (const group of groups) {
        const names = group.map((p) => p.employeeName);
        const hasNorth = names.some((n) => n.startsWith('north'));
        const hasSouth = names.some((n) => n.startsWith('south'));
        // North and South should not be mixed into the same cab group
        expect(hasNorth && hasSouth).toBe(false);
      }
    });

    it('groups pickups by nearby location and keeps opposite corridors in smaller cabs', () => {
      const employees = [
        createEmployee('east-a', 17.4, 78.55, 5.3),
        createEmployee('north-a', 17.45, 78.5, 5.6),
        createEmployee('east-b', 17.401, 78.551, 5.4),
        createEmployee('north-b', 17.451, 78.501, 5.7),
        createEmployee('east-c', 17.399, 78.552, 5.5),
      ];

      const groups = optimizeGroups(employees, office, customPricing, 6, 50);

      expect(groups.map((group) => group.length).sort()).toEqual([2, 3]);
      expect(groups.every((group) => group.length <= 6)).toBe(true);
      for (const group of groups) {
        expect(new Set(group.map((person) => person.employeeName.split('-')[0])).size).toBe(1);
      }
      expect(groups.flat().map((person) => person.employeeName).sort()).toEqual(
        employees.map((person) => person.employeeName).sort(),
      );
    });

    it('keeps pickups separate when sharing would add excessive passenger detour', () => {
      const employees = [
        createEmployee('far-north', 17.58, 78.5, 20),
        createEmployee('near-southeast', 17.489, 78.593, 14),
      ];

      const groups = optimizeGroups(employees, office, customPricing, 6, 50);

      expect(groups.map((group) => group.length)).toEqual([1, 1]);
    });

    it('should merge compatible groups if mutual corridor angle is <= 55 degrees', () => {
      const group1 = [createEmployee('N1', 17.8, 78.5, 44)];
      const group2 = [createEmployee('N2', 17.9, 78.5, 55)];

      const merged = mergeCompatibleGroups([group1, group2], office, 4, 70);
      expect(merged.length).toBe(1);
      expect(merged[0].length).toBe(2);
    });
  });

  describe('4. Optimal Cab Selection & Fleet Quota Management', () => {
    it('should choose Sedan when capacity <= 4 and Sedan is cheaper than SUV', () => {
      const fleetUsed: Record<string, number> = {};
      const chosen = selectCheapestCab(15, 3, customPricing, fleetUsed);

      expect(chosen).toBeDefined();
      expect(chosen?.name).toBe('sedan');
    });

    it('should choose SUV when capacity requirement is 5 or 6 passengers', () => {
      const fleetUsed: Record<string, number> = {};
      const chosen = selectCheapestCab(15, 5, customPricing, fleetUsed);

      expect(chosen).toBeDefined();
      expect(chosen?.name).toBe('suv');
    });

    it('should switch to SUV when Sedan fleet inventory is exhausted', () => {
      const fleetUsed: Record<string, number> = { sedan: 5 }; // max sedan fleet is 5
      const chosen = selectCheapestCab(15, 3, customPricing, fleetUsed);

      expect(chosen).toBeDefined();
      expect(chosen?.name).toBe('suv');
    });

    it('should return null when all capable vehicle fleets are exhausted', () => {
      const fleetUsed: Record<string, number> = { sedan: 5, suv: 5 };
      const chosen = selectCheapestCab(15, 3, customPricing, fleetUsed);

      expect(chosen).toBeNull();
    });
  });
});
