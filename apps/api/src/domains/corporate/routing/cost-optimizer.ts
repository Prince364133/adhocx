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

import { haversineKm } from './google-routes-v2.adapter';

export interface DistanceSlab {
  upToKm: number;
  ratePerKm: number;
}

export interface CabTypeConfig {
  name: string;
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

// File planning has no live fleet inventory; enforce quotas only when explicitly configured.
const DEFAULT_PLANNING_FLEET_COUNT = Number.MAX_SAFE_INTEGER;
const MAX_PICKUP_DETOUR_KM = 6; // About 15 minutes at the fallback's 25 km/h.

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
  cabTypes: [{
    name: 'vehicle',
    capacity: 4,
    fleetCount: DEFAULT_PLANNING_FLEET_COUNT,
    fixedCharge: 350.0,
    perKmCharge: 14.0,
    distanceSlabs: [
      { upToKm: 10, ratePerKm: 14.0 },
      { upToKm: 25, ratePerKm: 12.0 },
      { upToKm: 1000, ratePerKm: 10.0 },
    ],
  }],
};

/**
 * Calculates driver payout using tiered marginal distance slabs and fixed base fee.
 * Example: 12km:
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

export function orderPickupsByShortestPath<T extends CorridorableEmployee>(
  group: T[],
  office: GeoPoint,
): T[] {
  const pending = [...group].sort((a, b) => b.officeDistanceKm - a.officeDistanceKm);
  let current = pending.shift();
  if (!current) return [];

  const ordered = [current];
  while (pending.length > 0) {
    let nearestIndex = 0;
    let nearestDistanceKm =
      haversineKm(current.coord, pending[0].coord) +
      haversineKm(pending[0].coord, office) -
      haversineKm(current.coord, office);
    for (let index = 1; index < pending.length; index++) {
      const candidateDistanceKm =
        haversineKm(current.coord, pending[index].coord) +
        haversineKm(pending[index].coord, office) -
        haversineKm(current.coord, office);
      if (candidateDistanceKm < nearestDistanceKm) {
        nearestIndex = index;
        nearestDistanceKm = candidateDistanceKm;
      }
    }

    current = pending.splice(nearestIndex, 1)[0];
    ordered.push(current);
  }

  return ordered;
}

function estimateClusterRouteKm<T extends CorridorableEmployee>(group: T[], office: GeoPoint): number {
  const ordered = orderPickupsByShortestPath(group, office);
  let distanceKm = 0;
  for (let index = 1; index < ordered.length; index++) {
    distanceKm += haversineKm(ordered[index - 1].coord, ordered[index].coord);
  }
  const lastPickup = ordered[ordered.length - 1];
  return lastPickup ? distanceKm + haversineKm(lastPickup.coord, office) : 0;
}

function hasAcceptablePickupDetours<T extends CorridorableEmployee>(group: T[], office: GeoPoint): boolean {
  const ordered = orderPickupsByShortestPath(group, office);
  let remainingDistanceKm = haversineKm(ordered[ordered.length - 1].coord, office);

  for (let index = ordered.length - 1; index >= 0; index--) {
    if (index < ordered.length - 1) {
      remainingDistanceKm += haversineKm(ordered[index].coord, ordered[index + 1].coord);
    }
    if (remainingDistanceKm - ordered[index].officeDistanceKm > MAX_PICKUP_DETOUR_KM) {
      return false;
    }
  }

  return true;
}

/**
 * Selects the cheapest configured vehicle category that satisfies capacity and fleet inventory.
 */
export function selectCheapestCab(
  distanceKm: number,
  employeesCount: number,
  pricing: PricingConfig = DEFAULT_PRICING_CONFIG,
  fleetUsed: Record<string, number> = {},
): CabTypeConfig | null {
  const choices = pricing.cabTypes.filter(
    (cab) =>
      cab.capacity >= employeesCount &&
      (fleetUsed[cab.name] || 0) < cab.fleetCount,
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
 * Merges nearby pickup routes when combining them does not add distance and respects
 * cab capacity and corridor compatibility.
 */
export function optimizeGroups<T extends CorridorableEmployee>(
  employees: T[],
  office: GeoPoint,
  pricing: PricingConfig = DEFAULT_PRICING_CONFIG,
  maxCapacity = 4,
  _maxTripKm = 50,
): T[][] {
  const maxCabCapacity = Math.max(...pricing.cabTypes.map((cab) => cab.capacity), maxCapacity);
  const effectiveLimit = Math.min(maxCapacity, maxCabCapacity);
  const bearings = employees.map((employee) => calculateBearing(office, employee.coord));
  const candidates: Array<{ first: number; second: number; savingsKm: number }> = [];

  for (let first = 0; first < employees.length; first++) {
    for (let second = first + 1; second < employees.length; second++) {
      if (angularDistance(bearings[first], bearings[second]) > 55) continue;

      const savingsKm =
        employees[first].officeDistanceKm +
        employees[second].officeDistanceKm -
        haversineKm(employees[first].coord, employees[second].coord);
      if (savingsKm >= -0.001) candidates.push({ first, second, savingsKm });
    }
  }
  candidates.sort((a, b) => b.savingsKm - a.savingsKm);

  const groups = employees.map((employee) => [employee]);
  const groupForEmployee = employees.map((_, index) => index);
  const employeeIndex = new Map(employees.map((employee, index) => [employee, index]));

  for (const candidate of candidates) {
    const firstGroupIndex = groupForEmployee[candidate.first];
    const secondGroupIndex = groupForEmployee[candidate.second];
    if (firstGroupIndex === secondGroupIndex) continue;

    const firstGroup = groups[firstGroupIndex];
    const secondGroup = groups[secondGroupIndex];
    const merged = [...firstGroup, ...secondGroup];
    if (merged.length > effectiveLimit) continue;

    let maxCorridor = 0;
    for (const first of firstGroup) {
      for (const second of secondGroup) {
        maxCorridor = Math.max(
          maxCorridor,
          angularDistance(bearings[employeeIndex.get(first)!], bearings[employeeIndex.get(second)!]),
        );
      }
    }
    if (maxCorridor > 55) continue;

    const separateDistanceKm =
      estimateClusterRouteKm(firstGroup, office) + estimateClusterRouteKm(secondGroup, office);
    const mergedDistanceKm = estimateClusterRouteKm(merged, office);
    if (
      mergedDistanceKm > separateDistanceKm + 0.001 ||
      !hasAcceptablePickupDetours(merged, office)
    ) {
      continue;
    }

    groups[firstGroupIndex] = merged;
    groups[secondGroupIndex] = [];
    for (const employee of merged) {
      groupForEmployee[employeeIndex.get(employee)!] = firstGroupIndex;
    }
  }

  return groups
    .filter((group) => group.length > 0)
    .sort(
      (a, b) =>
        Math.max(...b.map((employee) => employee.officeDistanceKm)) -
        Math.max(...a.map((employee) => employee.officeDistanceKm)),
    );
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
