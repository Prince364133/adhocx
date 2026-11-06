/**
 * AdhocX Corporate Minimum-Cost Cab Grouping and Tiered Slab Pricing Engine.
 *
 * Implements:
 * 1. Marginal multi-slab distance costing (e.g. 0-10km @ ₹14, 10-25km @ ₹12, >25km @ ₹10).
 * 2. Great-circle forward bearing and angular corridor distance calculation.
 * 3. Directional corridor penalty and radial corridor clustering.
 * 4. Cheapest cab selection respecting capacity requirements and fleet inventory quotas.
 * 5. Group merging for compatible angular corridors (<= 55 deg) and max trip length constraints.
 * 6. Financial projections (driver payout, expected corporate revenue, projected margin).
 */

export interface DistanceSlab {
  upToKm: number;
  ratePerKm: number;
}

export interface CabTypeConfig {
  name: 'sedan' | 'suv' | string;
  capacity: number;
  fleetCount: number;
  fixedCharge: number;
  perKmCharge: number;
  distanceSlabs: DistanceSlab[];
}

export interface PricingConfig {
  employeeRevenue: number;
  revenuePerKm: number;
  cabTypes: CabTypeConfig[];
}

export interface OptimizedRouteCost {
  cabType: string;
  distanceKm: number;
  driverPayout: number;
  revenue: number;
  margin: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CorridorableEmployee {
  employeeName: string;
  coord: GeoPoint;
  officeDistanceKm: number;
  [key: string]: any;
}

/**
 * Standard AdhocX ETS Tiered Pricing Schedule.
 * Matches production JSON configuration.
 */
export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  employeeRevenue: 1800.0,
  revenuePerKm: 0.0,
  cabTypes: [
    {
      name: 'sedan',
      capacity: 4,
      fleetCount: 100,
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
      fleetCount: 50,
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

/**
 * Calculates driver payout using tiered marginal distance slabs and fixed base fee.
 * Example: 12km in Sedan:
 *   Base = ₹350
 *   0-10 km: 10 * 14 = ₹140
 *   10-25 km: 2 * 12 = ₹24
 *   Total = 350 + 140 + 24 = ₹514
 */
export function calculateDistanceCharge(distanceKm: number, cab: CabTypeConfig): number {
  if (!cab.distanceSlabs || cab.distanceSlabs.length === 0) {
    return cab.fixedCharge + distanceKm * cab.perKmCharge;
  }

  let remaining = Math.max(0, distanceKm);
  let previousLimit = 0;
  let variable = 0;

  for (const slab of cab.distanceSlabs) {
    const slabDistance = Math.min(remaining, Math.max(0, slab.upToKm - previousLimit));
    variable += slabDistance * slab.ratePerKm;
    remaining -= slabDistance;
    if (remaining <= 0.000001) {
      break;
    }
    previousLimit = slab.upToKm;
  }

  if (remaining > 0.000001) {
    variable += remaining * cab.perKmCharge;
  }

  return Number((cab.fixedCharge + variable).toFixed(2));
}

/**
 * Calculates the forward initial bearing in degrees [0, 360) from first point to second point.
 */
export function calculateBearing(first: GeoPoint, second: GeoPoint): number {
  const lat1 = (first.lat * Math.PI) / 180;
  const lat2 = (second.lat * Math.PI) / 180;
  const deltaLng = ((second.lng - first.lng) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Calculates minimal angular distance between two bearings in degrees [0, 180].
 */
export function angularDistance(first: number, second: number): number {
  const diff = Math.abs(first - second) % 360;
  return Math.min(diff, 360 - diff);
}

/**
 * Evaluates angular spread penalty between a candidate passenger and current cab members relative to the office hub.
 */
export function corridorPenalty(
  employeeCoord: GeoPoint,
  officeCoord: GeoPoint,
  groupCoords: GeoPoint[],
): number {
  const employeeBearing = calculateBearing(officeCoord, employeeCoord);
  if (groupCoords.length === 0) {
    return 0;
  }
  const officeBearings = groupCoords.map((c) => calculateBearing(officeCoord, c));
  return Math.max(...officeBearings.map((b) => angularDistance(employeeBearing, b)));
}

/**
 * Selects the cheapest available cab vehicle type (Sedan vs SUV)
 * that satisfies capacity and has remaining quota in the fleet inventory.
 */
export function selectCheapestCab(
  distanceKm: number,
  employeesCount: number,
  pricing: PricingConfig = DEFAULT_PRICING_CONFIG,
  fleetUsed: Record<string, number> = {},
): CabTypeConfig | null {
  const choices = pricing.cabTypes.filter(
    (cab) => cab.capacity >= employeesCount && (fleetUsed[cab.name] || 0) < cab.fleetCount,
  );

  if (choices.length === 0) {
    return null;
  }

  return choices.reduce((cheapest, current) => {
    const cheapestCost = calculateDistanceCharge(distanceKm, cheapest);
    const currentCost = calculateDistanceCharge(distanceKm, current);
    return currentCost < cheapestCost ? current : cheapest;
  });
}

/**
 * Distance-seeded directional corridor clustering heuristic.
 * Groups employees along common arterial corridors radiating outward from the office hub.
 */
export function optimizeGroups<T extends CorridorableEmployee>(
  employees: T[],
  office: GeoPoint,
  pricing: PricingConfig = DEFAULT_PRICING_CONFIG,
  maxCapacity = 4,
  maxTripKm = 50,
): T[][] {
  let remaining = [...employees];
  const groups: T[][] = [];

  const maxCabCapacity = Math.max(
    ...pricing.cabTypes.map((c) => c.capacity),
    maxCapacity,
  );
  const effectiveLimit = Math.min(maxCapacity, maxCabCapacity);

  while (remaining.length > 0) {
    let seed: T;

    if (groups.length === 0) {
      // First seed is the employee furthest from office
      seed = remaining.reduce((furthest, current) =>
        current.officeDistanceKm > furthest.officeDistanceKm ? current : furthest,
      );
    } else {
      // Next seeds prioritize picking employees whose bearing to office is closest to an existing group
      seed = remaining.reduce((bestSeed, person) => {
        const personBearing = calculateBearing(office, person.coord);
        let minAngularDifference = 180;

        for (const group of groups) {
          for (const member of group) {
            const memberBearing = calculateBearing(office, member.coord);
            const angDist = angularDistance(personBearing, memberBearing);
            if (angDist < minAngularDifference) {
              minAngularDifference = angDist;
            }
          }
        }

        const score = 180 - minAngularDifference;

        const bestPersonBearing = calculateBearing(office, bestSeed.coord);
        let bestMinDiff = 180;
        for (const group of groups) {
          for (const member of group) {
            const memberBearing = calculateBearing(office, member.coord);
            const angDist = angularDistance(bestPersonBearing, memberBearing);
            if (angDist < bestMinDiff) {
              bestMinDiff = angDist;
            }
          }
        }
        const bestScore = 180 - bestMinDiff;

        return score < bestScore ? person : bestSeed;
      });
    }

    remaining = remaining.filter((p) => p !== seed);
    const group: T[] = [seed];

    while (group.length < effectiveLimit && remaining.length > 0) {
      // Find candidate minimizing corridor penalty and angular deviation from last added passenger
      const lastCoord = group[group.length - 1].coord;
      const groupCoords = group.map((p) => p.coord);

      let bestCandidate: T | null = null;
      let bestScore = Infinity;

      for (const person of remaining) {
        const penalty = corridorPenalty(person.coord, office, groupCoords);
        const angToLast = angularDistance(
          calculateBearing(person.coord, office),
          calculateBearing(lastCoord, office),
        );
        const score = penalty * 0.4 + angToLast;

        if (score < bestScore) {
          bestScore = score;
          bestCandidate = person;
        }
      }

      if (!bestCandidate) {
        break;
      }

      const proposed = [...group, bestCandidate];
      const roadEstimate =
        proposed.reduce((sum, p) => sum + p.officeDistanceKm, 0) / Math.max(1, proposed.length - 1);

      if (roadEstimate > maxTripKm) {
        break;
      }

      group.push(bestCandidate);
      remaining = remaining.filter((p) => p !== bestCandidate);
    }

    groups.push(group);
  }

  return mergeCompatibleGroups(groups, office, effectiveLimit, maxTripKm);
}

/**
 * Merges small compatible groups if combined capacity <= limit,
 * mutual corridor angle <= 55 degrees, and office span <= maxTripKm.
 */
export function mergeCompatibleGroups<T extends CorridorableEmployee>(
  groups: T[][],
  office: GeoPoint,
  capacity: number,
  maxTripKm: number,
): T[][] {
  const result: T[][] = groups.map((g) => [...g]);
  let changed = true;

  while (changed) {
    changed = false;
    for (let firstIndex = 0; firstIndex < result.length; firstIndex++) {
      for (let secondIndex = firstIndex + 1; secondIndex < result.length; secondIndex++) {
        const merged = [...result[firstIndex], ...result[secondIndex]];
        if (merged.length > capacity) {
          continue;
        }

        let maxCorridor = 0;
        for (const left of result[firstIndex]) {
          const leftBearing = calculateBearing(office, left.coord);
          for (const right of result[secondIndex]) {
            const rightBearing = calculateBearing(office, right.coord);
            const ang = angularDistance(leftBearing, rightBearing);
            if (ang > maxCorridor) {
              maxCorridor = ang;
            }
          }
        }

        if (maxCorridor > 55) {
          continue;
        }

        const officeSpan = Math.max(...merged.map((p) => p.officeDistanceKm));
        if (officeSpan <= maxTripKm) {
          result[firstIndex] = merged;
          result.splice(secondIndex, 1);
          changed = true;
          break;
        }
      }
      if (changed) {
        break;
      }
    }
  }

  return result;
}

