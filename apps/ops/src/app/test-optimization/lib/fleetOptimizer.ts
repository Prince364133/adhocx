import type {
  TestEmployee,
  VehicleCategorySelection,
  OptimizationConstraints,
  SafetyPolicyConfig,
  UnassignedEmployeeRecord,
} from '../types.ts';

export interface FleetClusterGroup {
  cabIndex: number;
  vehicleCategory: 'SEDAN' | 'SUV';
  capacity: number;
  passengers: TestEmployee[];
  totalDirectSumKm: number;
}

export interface DistanceSlab {
  upToKm: number;
  ratePerKm: number;
}

export interface FleetVehiclePricing {
  name: 'SEDAN' | 'SUV';
  capacity: number;
  fixedCharge: number;
  perKmCharge: number;
  distanceSlabs: DistanceSlab[];
}

/**
 * Standard Production AdhocX ETS Tiered Pricing Schedule.
 * Sedan: Fixed ₹350, 0-10km @ ₹14, 10-25km @ ₹12, >25km @ ₹10.
 * SUV:   Fixed ₹500, 0-10km @ ₹16, 10-25km @ ₹14, >25km @ ₹12.
 */
export const FLEET_PRICING_CONFIG: Record<'SEDAN' | 'SUV', FleetVehiclePricing> = {
  SEDAN: {
    name: 'SEDAN',
    capacity: 4,
    fixedCharge: 350.0,
    perKmCharge: 14.0,
    distanceSlabs: [
      { upToKm: 10, ratePerKm: 14.0 },
      { upToKm: 25, ratePerKm: 12.0 },
      { upToKm: Infinity, ratePerKm: 10.0 },
    ],
  },
  SUV: {
    name: 'SUV',
    capacity: 6,
    fixedCharge: 500.0,
    perKmCharge: 16.0,
    distanceSlabs: [
      { upToKm: 10, ratePerKm: 16.0 },
      { upToKm: 25, ratePerKm: 14.0 },
      { upToKm: Infinity, ratePerKm: 12.0 },
    ],
  },
};

/**
 * Calculates driver payout using marginal multi-tier distance slabs and base fee.
 * Example for Sedan @ 12km:
 *   Base = ₹350
 *   0-10 km: 10 * 14 = ₹140
 *   10-12 km: 2 * 12 = ₹24
 *   Total = 350 + 140 + 24 = ₹514
 */
export function calculateDistanceCharge(
  distanceKm: number,
  vehicleType: 'SEDAN' | 'SUV' = 'SEDAN',
): number {
  const config = FLEET_PRICING_CONFIG[vehicleType] || FLEET_PRICING_CONFIG.SEDAN;
  let remaining = Math.max(0, distanceKm);
  let previousLimit = 0;
  let variable = 0;

  for (const slab of config.distanceSlabs) {
    const slabDistance = Math.min(remaining, Math.max(0, slab.upToKm - previousLimit));
    variable += slabDistance * slab.ratePerKm;
    remaining -= slabDistance;
    if (remaining <= 0.000001) break;
    previousLimit = slab.upToKm;
  }

  if (remaining > 0.000001) {
    variable += remaining * config.perKmCharge;
  }

  return Number((config.fixedCharge + variable).toFixed(2));
}

/**
 * Calculates Haversine distance in kilometers between two lat/lng coordinates.
 * Returns 9999 km if either point has invalid or uninitialized (0, 0) coordinates to prevent false co-location.
 */
export function haversineDistanceKm(
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null,
): number {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    return 9999;
  }
  if (lat1 === lat2 && lon1 === lon2) return 0;
  // Guard: (0, 0) Null Island indicates missing geocode, not a valid co-location
  if ((lat1 === 0 && lon1 === 0) || (lat2 === 0 && lon2 === 0)) {
    return 9999;
  }

  const R = 6371; // Earth radius in km
  const p = Math.PI / 180;
  const dLat = (lat2 - lat1) * p;
  const dLon = (lon2 - lon1) * p;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * p) * Math.cos(lat2 * p) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Estimates road distance from Haversine using urban circuity factor (1.35x).
 */
export function estimateRoadDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return Number((haversineDistanceKm(lat1, lon1, lat2, lon2) * 1.35).toFixed(2));
}

/**
 * Estimates urban travel duration in minutes at 28 km/h average city transit speed.
 */
export function estimateTravelMinutes(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return Math.max(3, Math.round((distanceKm / 28) * 60));
}

/**
 * True Spherical Great-Circle Forward Bearing (Azimuth) in degrees [0, 360).
 * Due North = 0°, Due East = 90°, Due South = 180°, Due West = 270°.
 * Matches production API navigation standard.
 */
export function calculateBearingDegrees(
  lat1Deg: number,
  lon1Deg: number,
  lat2Deg: number,
  lon2Deg: number,
): number {
  const lat1 = (lat1Deg * Math.PI) / 180;
  const lat2 = (lat2Deg * Math.PI) / 180;
  const dLon = ((lon2Deg - lon1Deg) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Calculates minimal angular distance between two bearings in degrees [0, 180].
 */
export function angularDistanceDegrees(deg1: number, deg2: number): number {
  const diff = Math.abs(deg1 - deg2) % 360;
  return Math.min(diff, 360 - diff);
}

interface EnrichedPolarEmployee extends TestEmployee {
  bearingDeg: number;
  distanceToOffice: number;
}

export interface PassengerDetourDetail {
  employeeId: string;
  employeeName: string;
  directDistanceKm: number;
  inCabDistanceKm: number;
  idf: number; // inCabDistanceKm / directDistanceKm
  excessDistanceKm: number;
}

/**
 * Calculates individual in-cab journey distance and Individual Detour Factor (IDF)
 * for every passenger in a stop sequence ending at the office hub.
 */
export function calculatePassengerDetours(
  sequence: TestEmployee[],
  officeLat: number,
  officeLng: number,
): {
  details: PassengerDetourDetail[];
  averageIdf: number;
  maxIdf: number;
  worstPassengerName: string;
} {
  if (sequence.length === 0) {
    return { details: [], averageIdf: 1.0, maxIdf: 1.0, worstPassengerName: '' };
  }

  // Precompute leg distances from each stop to the next, ending at office
  const legDistances: number[] = [];
  for (let i = 0; i < sequence.length - 1; i++) {
    legDistances.push(
      estimateRoadDistanceKm(
        sequence[i].lat,
        sequence[i].lng,
        sequence[i + 1].lat,
        sequence[i + 1].lng,
      ),
    );
  }
  const last = sequence[sequence.length - 1];
  legDistances.push(estimateRoadDistanceKm(last.lat, last.lng, officeLat, officeLng));

  // In-cab distance for passenger i is the sum of legs from stop i to office
  const details: PassengerDetourDetail[] = sequence.map((p, i) => {
    let inCabKm = 0;
    for (let k = i; k < legDistances.length; k++) {
      inCabKm += legDistances[k];
    }
    inCabKm = Number(inCabKm.toFixed(2));
    const directKm =
      p.directDistanceKm && p.directDistanceKm > 0
        ? p.directDistanceKm
        : Math.max(0.5, estimateRoadDistanceKm(p.lat, p.lng, officeLat, officeLng));
    const idf = Number((inCabKm / directKm).toFixed(2));
    const excessDistanceKm = Number(Math.max(0, inCabKm - directKm).toFixed(2));

    return {
      employeeId: p.id,
      employeeName: p.name,
      directDistanceKm: directKm,
      inCabDistanceKm: inCabKm,
      idf,
      excessDistanceKm,
    };
  });

  const sumIdf = details.reduce((sum, d) => sum + d.idf, 0);
  const averageIdf = Number((sumIdf / details.length).toFixed(2));
  let maxIdf = 1.0;
  let worstPassengerName = '';
  for (const d of details) {
    if (d.idf > maxIdf) {
      maxIdf = d.idf;
      worstPassengerName = d.employeeName;
    }
  }

  return {
    details,
    averageIdf,
    maxIdf,
    worstPassengerName,
  };
}

export interface FleetCandidateSolution {
  clusters: EnrichedPolarEmployee[][];
  vehicleTypes: ('SEDAN' | 'SUV')[];
  totalPayout: number;
  totalDistanceKm: number;
  totalVehicles: number;
  averageIdf: number;
  maxIdf: number;
  globalScore: number;
  isFeasible: boolean;
  feasibilityReason?: string;
}

/**
 * Evaluates a single passenger group with a candidate vehicle category.
 * Calculates exact TSP route sequence, total road distance, individual detours (IDF),
 * driver payout under tiered distance slabs, and hard constraint compliance.
 */
export function evaluateCabGroup(
  passengers: EnrichedPolarEmployee[],
  officeLat: number,
  officeLng: number,
  vehicleType: 'SEDAN' | 'SUV',
  maxTripKm: number = 50,
  safetyOptions?: SequencingSafetyOptions,
): {
  isFeasible: boolean;
  feasibilityReason?: string;
  orderedPassengers: EnrichedPolarEmployee[];
  distanceKm: number;
  driverPayout: number;
  averageIdf: number;
  maxIdf: number;
  excessDetourScore: number;
} {
  const capacity = vehicleType === 'SUV' ? 6 : 4;
  if (passengers.length === 0) {
    return {
      isFeasible: true,
      orderedPassengers: [],
      distanceKm: 0,
      driverPayout: 0,
      averageIdf: 1.0,
      maxIdf: 1.0,
      excessDetourScore: 0,
    };
  }

  // Hard Constraint: Capacity
  if (passengers.length > capacity) {
    return {
      isFeasible: false,
      feasibilityReason: `Capacity exceeded: ${passengers.length} employees > ${capacity} seats (${vehicleType})`,
      orderedPassengers: passengers,
      distanceKm: 9999,
      driverPayout: 9999,
      averageIdf: 9.9,
      maxIdf: 9.9,
      excessDetourScore: 9999,
    };
  }

  // Optimize stop sequence using TSP
  const seqResult = optimizeClusterPickupSequence(
    passengers,
    officeLat,
    officeLng,
    'MIN_DISTANCE',
    safetyOptions,
  );

  const empMap = new Map(passengers.map((p) => [p.id, p]));
  const ordered: EnrichedPolarEmployee[] = seqResult.orderedPassengers
    .map((p) => empMap.get(p.id)!)
    .filter(Boolean);

  const distanceKm = seqResult.totalDistanceKm;

  // Hard Constraint: Female Night Safety (when male is present and no escort)
  if (safetyOptions?.isNightShift && !safetyOptions?.hasEscort && !seqResult.safetyCompliant) {
    return {
      isFeasible: false,
      feasibilityReason: 'Female night-shift safety violation: female at edge stop with male in cab',
      orderedPassengers: ordered,
      distanceKm,
      driverPayout: 9999,
      averageIdf: 9.9,
      maxIdf: 9.9,
      excessDetourScore: 9999,
    };
  }

  // Calculate passenger detours (IDF)
  const detourResult = calculatePassengerDetours(ordered, officeLat, officeLng);
  const avgIdf = detourResult.averageIdf;
  const maxIdf = detourResult.maxIdf;

  // Hard Constraint: Maximum Route Distance (allow solitary long commuters, but multi-stop routes must respect limit)
  if (passengers.length > 1 && distanceKm > maxTripKm) {
    return {
      isFeasible: false,
      feasibilityReason: `Route distance ${distanceKm} km exceeds max trip limit ${maxTripKm} km`,
      orderedPassengers: ordered,
      distanceKm,
      driverPayout: 9999,
      averageIdf: avgIdf,
      maxIdf,
      excessDetourScore: 9999,
    };
  }

  // Hard Constraint: Extreme Passenger Detour (IDF > 1.85 for multi-stop routes with substantial direct distance)
  const hasExtremeDetour = detourResult.details.some(
    (d) => d.directDistanceKm >= 3.0 && d.idf > 1.85 && d.excessDistanceKm > 4.0,
  );
  if (passengers.length > 1 && hasExtremeDetour) {
    return {
      isFeasible: false,
      feasibilityReason: `Extreme passenger detour detected (IDF ${maxIdf} > 1.85 limit)`,
      orderedPassengers: ordered,
      distanceKm,
      driverPayout: 9999,
      averageIdf: avgIdf,
      maxIdf,
      excessDetourScore: 9999,
    };
  }

  // Driver Payout under tiered distance slabs
  const driverPayout = calculateDistanceCharge(distanceKm, vehicleType);

  // Detour quality penalty: penalize riders experiencing IDF > 1.25
  let excessDetourScore = 0;
  for (const d of detourResult.details) {
    if (d.idf > 1.25) {
      excessDetourScore += (d.idf - 1.25) * 120;
    }
  }

  return {
    isFeasible: true,
    orderedPassengers: ordered,
    distanceKm,
    driverPayout,
    averageIdf: avgIdf,
    maxIdf,
    excessDetourScore,
  };
}

/**
 * Global cache for pure group evaluations, cleared at the start of each fleet optimization run.
 */
const groupEvalCache = new Map<string, ReturnType<typeof evaluateCabGroup>>();

export function getCachedCabGroupEval(
  passengers: EnrichedPolarEmployee[],
  officeLat: number,
  officeLng: number,
  vehicleType: 'SEDAN' | 'SUV',
  maxTripKm: number = 50,
  safetyOptions?: SequencingSafetyOptions,
): ReturnType<typeof evaluateCabGroup> {
  if (passengers.length === 0) {
    return evaluateCabGroup(passengers, officeLat, officeLng, vehicleType, maxTripKm, safetyOptions);
  }
  const key = `${vehicleType}:${safetyOptions?.isNightShift ? 'N' : 'D'}:${passengers.map((p) => p.id).sort().join(',')}`;
  let cached = groupEvalCache.get(key);
  if (!cached) {
    cached = evaluateCabGroup(passengers, officeLat, officeLng, vehicleType, maxTripKm, safetyOptions);
    groupEvalCache.set(key, cached);
  }
  return cached;
}

function getGroupScore(evalResult: ReturnType<typeof evaluateCabGroup>): number {
  if (!evalResult.isFeasible) return 100000;
  return Number((evalResult.driverPayout + evalResult.distanceKm * 1.2 + evalResult.excessDetourScore).toFixed(2));
}

function determineGroupVehicleType(
  group: EnrichedPolarEmployee[],
  officeLat: number,
  officeLng: number,
  vehicleSelection: VehicleCategorySelection,
  maxTripKm: number,
  safetyOptions?: SequencingSafetyOptions,
): 'SEDAN' | 'SUV' {
  if (vehicleSelection === 'SUV') return 'SUV';
  if (vehicleSelection === 'SEDAN') return 'SEDAN';
  if (group.length >= 5) return 'SUV';
  return 'SEDAN';
}

/**
 * Evaluates a complete candidate fleet configuration against hard operational constraints
 * and calculates the multi-objective global optimization score.
 *
 * Hierarchy:
 * 1. Hard Constraints: Capacity, Distance, Detour, Safety, Single-Assignment.
 * 2. Objective Function: Total Driver Payout + Vehicle Deployment Overhead (₹200/cab) + Total Distance + Detour Penalty.
 */
export function evaluateFleetCandidate(
  candidateGroups: EnrichedPolarEmployee[][],
  officeLat: number,
  officeLng: number,
  vehicleSelection: VehicleCategorySelection = 'ALL',
  maxTripKm: number = 50,
  safetyOptions?: SequencingSafetyOptions,
): FleetCandidateSolution {
  const activeGroups = candidateGroups.filter((g) => g.length > 0);

  let totalPayout = 0;
  let totalDistanceKm = 0;
  let totalDetourPenalty = 0;
  let sumAvgIdf = 0;
  let overallMaxIdf = 1.0;
  let isFeasible = true;
  let feasibilityReason: string | undefined;

  const vehicleTypes: ('SEDAN' | 'SUV')[] = [];
  const evaluatedGroups: EnrichedPolarEmployee[][] = [];

  for (const group of activeGroups) {
    const chosenType = determineGroupVehicleType(
      group,
      officeLat,
      officeLng,
      vehicleSelection,
      maxTripKm,
      safetyOptions,
    );

    const evalResult = getCachedCabGroupEval(group, officeLat, officeLng, chosenType, maxTripKm, safetyOptions);

    if (!evalResult.isFeasible) {
      isFeasible = false;
      if (!feasibilityReason) {
        feasibilityReason = evalResult.feasibilityReason;
      }
    }

    vehicleTypes.push(chosenType);
    evaluatedGroups.push(evalResult.orderedPassengers);
    totalPayout += evalResult.driverPayout;
    totalDistanceKm += evalResult.distanceKm;
    totalDetourPenalty += evalResult.excessDetourScore;
    sumAvgIdf += evalResult.averageIdf;
    overallMaxIdf = Math.max(overallMaxIdf, evalResult.maxIdf);
  }

  const cabCount = evaluatedGroups.length;
  const avgIdf = cabCount > 0 ? Number((sumAvgIdf / cabCount).toFixed(2)) : 1.0;
  totalPayout = Number(totalPayout.toFixed(2));
  totalDistanceKm = Number(totalDistanceKm.toFixed(2));

  // Global Objective Function:
  // Direct Payout + Vehicle Deployment Overhead (₹200 per vehicle) + Distance Cost (₹1.20/km) + Detour Penalty
  const vehicleDeploymentOverhead = cabCount * 200.0;
  const distanceCost = totalDistanceKm * 1.2;
  const globalScore = isFeasible
    ? Number((totalPayout + vehicleDeploymentOverhead + distanceCost + totalDetourPenalty).toFixed(2))
    : Number((totalPayout + vehicleDeploymentOverhead + distanceCost + totalDetourPenalty + 100000).toFixed(2));

  return {
    clusters: evaluatedGroups,
    vehicleTypes,
    totalPayout,
    totalDistanceKm,
    totalVehicles: cabCount,
    averageIdf: avgIdf,
    maxIdf: Number(overallMaxIdf.toFixed(2)),
    globalScore,
    isFeasible,
    feasibilityReason,
  };
}

/**
 * Generates alternative candidate fleet partitions using complementary heuristics:
 * 1. Sedan-First Clarke-Wright Savings (Capacity 4).
 * 2. Corridor-SUV-First Packing (Collinear corridor packing into 5-6 passenger SUVs, remainder in Sedans).
 * 3. Dynamic Hybrid Savings (Allows merges up to 6 for tight collinear corridors).
 */
export function generateCandidatePartitions(
  enriched: EnrichedPolarEmployee[],
  officeLat: number,
  officeLng: number,
  vehicleSelection: VehicleCategorySelection = 'ALL',
  maxTripKm: number = 50,
): EnrichedPolarEmployee[][][] {
  if (enriched.length === 0) return [];

  const candidates: EnrichedPolarEmployee[][][] = [];

  // =========================================================================
  // Candidate Partition 1: Sedan-First Clarke-Wright Savings (Capacity 4)
  // =========================================================================
  {
    const targetCap = vehicleSelection === 'SUV' ? 6 : 4;
    const sorted = [...enriched].sort((a, b) => a.bearingDeg - b.bearingDeg);
    const n = sorted.length;
    const cwPairs: Array<{ i: number; j: number; score: number }> = [];

    const maxNeighbors = n > 80 ? 30 : n;
    for (let i = 0; i < n; i++) {
      const a = sorted[i];
      const limit = Math.min(n, i + maxNeighbors);
      for (let j = i + 1; j < limit; j++) {
        const b = sorted[j];
        const angDiff = angularDistanceDegrees(a.bearingDeg, b.bearingDeg);
        if (angDiff > 85) continue;

        const directA = a.distanceToOffice;
        const directB = b.distanceToOffice;
        const interDist = haversineDistanceKm(a.lat, a.lng, b.lat, b.lng);
        const rawSavings = directA + directB - interDist;

        if (rawSavings > 0.001) {
          const corridorAlignment = Math.max(0.05, Math.cos((angDiff * Math.PI) / 180));
          cwPairs.push({ i, j, score: rawSavings * corridorAlignment });
        }
      }
    }
    cwPairs.sort((x, y) => y.score - x.score);

    const groups: EnrichedPolarEmployee[][] = sorted.map((e) => [e]);
    const groupOf = sorted.map((_, idx) => idx);

    for (const pair of cwPairs) {
      const g1Idx = groupOf[pair.i];
      const g2Idx = groupOf[pair.j];
      if (g1Idx === g2Idx) continue;

      const g1 = groups[g1Idx];
      const g2 = groups[g2Idx];
      const merged = [...g1, ...g2];
      if (merged.length > targetCap) continue;

      let maxAng = 0;
      for (const m1 of g1) {
        for (const m2 of g2) {
          maxAng = Math.max(maxAng, angularDistanceDegrees(m1.bearingDeg, m2.bearingDeg));
        }
      }
      if (maxAng > 85) continue;

      const estDist = calculateSequenceDistance(merged, officeLat, officeLng);
      if (estDist > maxTripKm) continue;

      groups[g1Idx] = merged;
      groups[g2Idx] = [];
      for (const m of merged) {
        const oIdx = sorted.findIndex((e) => e.id === m.id);
        groupOf[oIdx] = g1Idx;
      }
    }

    candidates.push(groups.filter((g) => g.length > 0));
  }

  // =========================================================================
  // Candidate Partition 2: Corridor-SUV-First Packing (for ALL & SUV modes)
  // In dense radial corridors, groups 5-6 collinear commuters directly into SUVs
  // =========================================================================
  if (vehicleSelection !== 'SEDAN' && enriched.length >= 5) {
    const sortedByBearing = [...enriched].sort((a, b) => a.bearingDeg - b.bearingDeg);
    const suvGroups: EnrichedPolarEmployee[][] = [];
    const used = new Set<string>();

    for (let i = 0; i < sortedByBearing.length; i++) {
      const seed = sortedByBearing[i];
      if (used.has(seed.id)) continue;

      // Find collinear candidates within 45 degrees of seed
      const corridorCandidates = sortedByBearing.filter(
        (e) => !used.has(e.id) && angularDistanceDegrees(seed.bearingDeg, e.bearingDeg) <= 45,
      );

      // Sort candidate riders from furthest to nearest to office; break ties with angular bearing
      corridorCandidates.sort((a, b) => {
        const dDiff = b.distanceToOffice - a.distanceToOffice;
        if (Math.abs(dDiff) > 0.5) return dDiff;
        return a.bearingDeg - b.bearingDeg;
      });

      if (corridorCandidates.length >= 5) {
        // Form a 5-6 rider SUV
        const suvRiders = corridorCandidates.slice(0, Math.min(6, corridorCandidates.length));
        const estDist = optimizeClusterPickupSequence(suvRiders, officeLat, officeLng).totalDistanceKm;
        if (estDist <= maxTripKm) {
          suvRiders.forEach((r) => used.add(r.id));
          suvGroups.push(suvRiders);
          continue;
        }
      }

      // Otherwise pack up to 4 into a Sedan
      const sedanRiders = corridorCandidates.slice(0, Math.min(4, corridorCandidates.length));
      sedanRiders.forEach((r) => used.add(r.id));
      suvGroups.push(sedanRiders);
    }

    // Clean up any remaining riders
    for (const emp of enriched) {
      if (!used.has(emp.id)) {
        suvGroups.push([emp]);
      }
    }

    candidates.push(suvGroups);
  }

  // =========================================================================
  // Candidate Partition 3: Dynamic Savings with SUV Awareness (for moderate datasets)
  // =========================================================================
  if (vehicleSelection !== 'SEDAN' && enriched.length >= 5 && enriched.length <= 40) {
    const n = enriched.length;
    const cwPairs: Array<{ i: number; j: number; score: number }> = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = enriched[i];
        const b = enriched[j];
        const angDiff = angularDistanceDegrees(a.bearingDeg, b.bearingDeg);
        if (angDiff > 60) continue;

        const rawSavings = a.distanceToOffice + b.distanceToOffice - haversineDistanceKm(a.lat, a.lng, b.lat, b.lng);
        if (rawSavings > 0.001) {
          const corridorAlignment = Math.max(0.1, Math.cos((angDiff * Math.PI) / 180));
          cwPairs.push({ i, j, score: rawSavings * corridorAlignment });
        }
      }
    }
    cwPairs.sort((x, y) => y.score - x.score);

    const groups: EnrichedPolarEmployee[][] = enriched.map((e) => [e]);
    const groupOf = enriched.map((_, idx) => idx);

    for (const pair of cwPairs) {
      const g1Idx = groupOf[pair.i];
      const g2Idx = groupOf[pair.j];
      if (g1Idx === g2Idx) continue;

      const g1 = groups[g1Idx];
      const g2 = groups[g2Idx];
      const merged = [...g1, ...g2];
      if (merged.length > 6) continue;

      let maxAng = 0;
      for (const m1 of g1) {
        for (const m2 of g2) {
          maxAng = Math.max(maxAng, angularDistanceDegrees(m1.bearingDeg, m2.bearingDeg));
        }
      }
      if (merged.length > 4 && maxAng > 50) continue;
      if (maxAng > 65) continue;

      const estDist = calculateSequenceDistance(merged, officeLat, officeLng);
      if (estDist > maxTripKm) continue;

      groups[g1Idx] = merged;
      groups[g2Idx] = [];
      for (const m of merged) {
        const oIdx = enriched.findIndex((e) => e.id === m.id);
        groupOf[oIdx] = g1Idx;
      }
    }

    candidates.push(groups.filter((g) => g.length > 0));
  }

  return candidates;
}

/**
 * Global Fleet Local Search & Improvement Loop using High-Performance Delta Evaluations.
 *
 * Neighborhood Operators:
 * 1. 2-Sedans -> 1-SUV Merge (Collinear consolidation).
 * 2. Corridor Split & Rebalance (Eliminates the 24 Sedan + 1 SUV ceiling).
 * 3. 1-Relocate (Inter-route commuter transfer).
 */
export function optimizeFleetWithLocalSearch(
  initialGroups: EnrichedPolarEmployee[][],
  officeLat: number,
  officeLng: number,
  vehicleSelection: VehicleCategorySelection = 'ALL',
  maxTripKm: number = 50,
  safetyOptions?: SequencingSafetyOptions,
): FleetCandidateSolution {
  let currentGroups = initialGroups.filter((g) => g.length > 0).map((g) => [...g]);
  if (currentGroups.length === 0) {
    return evaluateFleetCandidate([], officeLat, officeLng, vehicleSelection, maxTripKm, safetyOptions);
  }

  // Pre-evaluate initial groups using cached solver
  let currentEvals = currentGroups.map((g) => {
    const vType = determineGroupVehicleType(g, officeLat, officeLng, vehicleSelection, maxTripKm, safetyOptions);
    return {
      vType,
      res: getCachedCabGroupEval(g, officeLat, officeLng, vType, maxTripKm, safetyOptions),
    };
  });

  let improved = true;
  let iterations = 0;
  const isLargeFleet = currentGroups.length > 12;
  const maxIterations = isLargeFleet ? 1 : 2;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    // -----------------------------------------------------------------------
    // Pass 1: 2 Sedans -> 1 SUV Merge Evaluation (Delta-based)
    // -----------------------------------------------------------------------
    if (vehicleSelection !== 'SEDAN' && currentGroups.length >= 2) {
      for (let i = 0; i < currentGroups.length; i++) {
        const maxJ = isLargeFleet ? Math.min(i + 5, currentGroups.length) : currentGroups.length;
        for (let j = i + 1; j < maxJ; j++) {
          const g1 = currentGroups[i];
          const g2 = currentGroups[j];
          const combinedCount = g1.length + g2.length;
          if (combinedCount < 5 || combinedCount > 6) continue;

          // Radial corridor divergence check between representative stops
          if (angularDistanceDegrees(g1[0].bearingDeg, g2[0].bearingDeg) > 50) continue;

          let maxAng = 0;
          for (const m1 of g1) {
            for (const m2 of g2) {
              maxAng = Math.max(maxAng, angularDistanceDegrees(m1.bearingDeg, m2.bearingDeg));
            }
          }
          if (maxAng > 55) continue;

          const merged = [...g1, ...g2];
          const evalMerged = getCachedCabGroupEval(merged, officeLat, officeLng, 'SUV', maxTripKm, safetyOptions);
          if (!evalMerged.isFeasible) continue;

          // Delta: new merged group cost + 1 vehicle overhead (200) vs old 2 groups + 2 vehicles overhead (400)
          const oldCost = getGroupScore(currentEvals[i].res) + getGroupScore(currentEvals[j].res) + 400;
          const newCost = getGroupScore(evalMerged) + 200;

          if (newCost < oldCost - 2.0) {
            currentGroups[i] = evalMerged.orderedPassengers;
            currentEvals[i] = { vType: 'SUV', res: evalMerged };
            currentGroups.splice(j, 1);
            currentEvals.splice(j, 1);
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
      if (improved) continue;
    }

    // -----------------------------------------------------------------------
    // Pass 2: Corridor Split & Rebalance (4+4 -> 6 SUV + 2 Sedan, or 4+3 -> 6 SUV + 1 Sedan)
    // -----------------------------------------------------------------------
    if (vehicleSelection !== 'SEDAN' && currentGroups.length >= 2) {
      for (let i = 0; i < currentGroups.length; i++) {
        const maxJ = isLargeFleet ? Math.min(i + 4, currentGroups.length) : currentGroups.length;
        for (let j = i + 1; j < maxJ; j++) {
          const g1 = currentGroups[i];
          const g2 = currentGroups[j];
          const combined = [...g1, ...g2];
          if (combined.length < 7 || combined.length > 8) continue;

          if (angularDistanceDegrees(g1[0].bearingDeg, g2[0].bearingDeg) > 45) continue;

          let maxAng = 0;
          for (const m1 of g1) {
            for (const m2 of g2) {
              maxAng = Math.max(maxAng, angularDistanceDegrees(m1.bearingDeg, m2.bearingDeg));
            }
          }
          if (maxAng > 50) continue;

          combined.sort((a, b) => b.distanceToOffice - a.distanceToOffice);
          const trialSuv = combined.slice(0, 6);
          const trialSedan = combined.slice(6);

          const evalSuv = getCachedCabGroupEval(trialSuv, officeLat, officeLng, 'SUV', maxTripKm, safetyOptions);
          const evalSedan = getCachedCabGroupEval(trialSedan, officeLat, officeLng, 'SEDAN', maxTripKm, safetyOptions);

          if (!evalSuv.isFeasible || !evalSedan.isFeasible) continue;

          const oldCost = getGroupScore(currentEvals[i].res) + getGroupScore(currentEvals[j].res);
          const newCost = getGroupScore(evalSuv) + getGroupScore(evalSedan);

          if (newCost < oldCost - 5.0) {
            currentGroups[i] = evalSuv.orderedPassengers;
            currentEvals[i] = { vType: 'SUV', res: evalSuv };
            currentGroups[j] = evalSedan.orderedPassengers;
            currentEvals[j] = { vType: 'SEDAN', res: evalSedan };
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
      if (improved) continue;
    }

    // -----------------------------------------------------------------------
    // Pass 3: 1-Relocate (Inter-route commuter transfer)
    // -----------------------------------------------------------------------
    const maxCapacity = vehicleSelection === 'SEDAN' ? 4 : 6;
    for (let i = 0; i < currentGroups.length; i++) {
      // Focus relocate moves on splinter groups (size <= 3) or groups with excess detour
      if (currentGroups[i].length >= 4 && currentEvals[i].res.averageIdf <= 1.25) continue;

      for (let pIdx = 0; pIdx < currentGroups[i].length; pIdx++) {
        const emp = currentGroups[i][pIdx];

        const startJ = isLargeFleet ? Math.max(0, i - 4) : 0;
        const endJ = isLargeFleet ? Math.min(currentGroups.length, i + 5) : currentGroups.length;
        for (let j = startJ; j < endJ; j++) {
          if (i === j) continue;
          if (currentGroups[j].length >= maxCapacity) continue;

          // Corridor check between emp and target group centroid (tight 40 deg window)
          if (angularDistanceDegrees(emp.bearingDeg, currentGroups[j][0].bearingDeg) > 40) continue;

          let maxAng = 0;
          for (const m of currentGroups[j]) {
            maxAng = Math.max(maxAng, angularDistanceDegrees(emp.bearingDeg, m.bearingDeg));
          }
          if (maxAng > 45) continue;

          const newG1 = currentGroups[i].filter((_, idx) => idx !== pIdx);
          const newG2 = [...currentGroups[j], emp];

          const type1 = determineGroupVehicleType(newG1, officeLat, officeLng, vehicleSelection, maxTripKm, safetyOptions);
          const type2 = determineGroupVehicleType(newG2, officeLat, officeLng, vehicleSelection, maxTripKm, safetyOptions);

          const newEval1 = newG1.length > 0
            ? getCachedCabGroupEval(newG1, officeLat, officeLng, type1, maxTripKm, safetyOptions)
            : null;
          const newEval2 = getCachedCabGroupEval(newG2, officeLat, officeLng, type2, maxTripKm, safetyOptions);

          if (!newEval2.isFeasible || (newEval1 && !newEval1.isFeasible)) continue;

          const oldCost = getGroupScore(currentEvals[i].res) + getGroupScore(currentEvals[j].res) + 400;
          const newCost = (newEval1 ? getGroupScore(newEval1) + 200 : 0) + getGroupScore(newEval2) + 200;

          if (newCost < oldCost - 3.0) {
            currentGroups[j] = newEval2.orderedPassengers;
            currentEvals[j] = { vType: type2, res: newEval2 };

            if (newG1.length === 0) {
              currentGroups.splice(i, 1);
              currentEvals.splice(i, 1);
            } else {
              currentGroups[i] = newEval1!.orderedPassengers;
              currentEvals[i] = { vType: type1, res: newEval1! };
            }
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
      if (improved) break;
    }

    // -----------------------------------------------------------------------
    // Pass 4: Cross-Cab Swap (Swap 1,1 between adjacent corridors)
    // -----------------------------------------------------------------------
    if (!isLargeFleet && currentGroups.length >= 2) {
      for (let i = 0; i < currentGroups.length; i++) {
        // Restrict to immediately adjacent corridor neighbors (i+1, i+2) for sub-second O(C) scalability
        const maxJ = Math.min(i + 2, currentGroups.length - 1);
        for (let j = i + 1; j <= maxJ; j++) {
          if (angularDistanceDegrees(currentGroups[i][0].bearingDeg, currentGroups[j][0].bearingDeg) > 35) continue;

          for (let aIdx = 0; aIdx < currentGroups[i].length; aIdx++) {
            const empA = currentGroups[i][aIdx];
            for (let bIdx = 0; bIdx < currentGroups[j].length; bIdx++) {
              const empB = currentGroups[j][bIdx];

              if (angularDistanceDegrees(empA.bearingDeg, currentGroups[j][0].bearingDeg) > 40) continue;
              if (angularDistanceDegrees(empB.bearingDeg, currentGroups[i][0].bearingDeg) > 40) continue;

              const swappedG1 = currentGroups[i].map((e, idx) => (idx === aIdx ? empB : e));
              const swappedG2 = currentGroups[j].map((e, idx) => (idx === bIdx ? empA : e));

              const type1 = currentEvals[i].vType;
              const type2 = currentEvals[j].vType;

              const eval1 = getCachedCabGroupEval(swappedG1, officeLat, officeLng, type1, maxTripKm, safetyOptions);
              const eval2 = getCachedCabGroupEval(swappedG2, officeLat, officeLng, type2, maxTripKm, safetyOptions);

              if (!eval1.isFeasible || !eval2.isFeasible) continue;

              const oldCost = getGroupScore(currentEvals[i].res) + getGroupScore(currentEvals[j].res);
              const newCost = getGroupScore(eval1) + getGroupScore(eval2);

              if (newCost < oldCost - 2.5) {
                currentGroups[i] = eval1.orderedPassengers;
                currentEvals[i] = { vType: type1, res: eval1 };
                currentGroups[j] = eval2.orderedPassengers;
                currentEvals[j] = { vType: type2, res: eval2 };
                improved = true;
                break;
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) continue;
    }

    // -----------------------------------------------------------------------
    // Pass 5: Inter-Route 2-opt* (Tail exchange for crossing route segments)
    // -----------------------------------------------------------------------
    if (!isLargeFleet && currentGroups.length >= 2) {
      for (let i = 0; i < currentGroups.length; i++) {
        // Restrict to immediately adjacent corridor neighbors for linear-time efficiency
        const maxJ = Math.min(i + 2, currentGroups.length - 1);
        for (let j = i + 1; j <= maxJ; j++) {
          const g1 = currentGroups[i];
          const g2 = currentGroups[j];
          if (g1.length < 2 || g2.length < 2) continue;
          if (angularDistanceDegrees(g1[0].bearingDeg, g2[0].bearingDeg) > 35) continue;

          for (let split1 = 1; split1 < g1.length; split1++) {
            for (let split2 = 1; split2 < g2.length; split2++) {
              const head1 = g1.slice(0, split1);
              const tail1 = g1.slice(split1);
              const head2 = g2.slice(0, split2);
              const tail2 = g2.slice(split2);

              const cap1 = currentEvals[i].vType === 'SUV' ? 6 : 4;
              const cap2 = currentEvals[j].vType === 'SUV' ? 6 : 4;
              if (head1.length + tail2.length > cap1 || head2.length + tail1.length > cap2) continue;

              const type1 = currentEvals[i].vType;
              const type2 = currentEvals[j].vType;

              const eval1 = getCachedCabGroupEval([...head1, ...tail2], officeLat, officeLng, type1, maxTripKm, safetyOptions);
              const eval2 = getCachedCabGroupEval([...head2, ...tail1], officeLat, officeLng, type2, maxTripKm, safetyOptions);

              if (!eval1.isFeasible || !eval2.isFeasible) continue;

              const oldCost = getGroupScore(currentEvals[i].res) + getGroupScore(currentEvals[j].res);
              const newCost = getGroupScore(eval1) + getGroupScore(eval2);

              if (newCost < oldCost - 3.0) {
                currentGroups[i] = eval1.orderedPassengers;
                currentEvals[i] = { vType: type1, res: eval1 };
                currentGroups[j] = eval2.orderedPassengers;
                currentEvals[j] = { vType: type2, res: eval2 };
                improved = true;
                break;
              }
            }
            if (improved) break;
          }
          if (improved) break;
        }
        if (improved) break;
      }
      if (improved) continue;
    }
  }

  return evaluateFleetCandidate(
    currentGroups,
    officeLat,
    officeLng,
    vehicleSelection,
    maxTripKm,
    safetyOptions,
  );
}

/**
 * Enterprise Global Fleet Optimization Engine.
 *
 * 1. Evaluates multiple global fleet candidate configurations across all corridors.
 * 2. Runs bounded local search (2-Sedan to 1-SUV merges, 4+4 rebalancing, 1-relocate, 1-swap).
 * 3. Compares complete fleet allocations against hard operational constraints and tiered driver payout.
 * 4. Selects the globally minimal-cost, passenger-friendly fleet configuration.
 * 5. Guarantees every employee is assigned exactly once with zero duplicate or omitted riders.
 */
export function clusterEmployeesWithSweep(
  employees: TestEmployee[],
  officeLat: number,
  officeLng: number,
  vehicleSelection: VehicleCategorySelection = 'ALL',
  maxTripKm: number = 50,
  constraints?: Partial<OptimizationConstraints>,
  safetyPolicy?: SafetyPolicyConfig,
): FleetClusterGroup[] & { unassignedEmployees?: UnassignedEmployeeRecord[] } {
  if (!employees || employees.length === 0) return [];

  // Reset pure solver evaluation cache per fleet optimization invocation
  groupEvalCache.clear();

  // 1. Enrich employees with spherical Great-Circle bearings and distances to office
  const enriched: EnrichedPolarEmployee[] = employees.map((emp) => {
    const bearingDeg = calculateBearingDegrees(officeLat, officeLng, emp.lat, emp.lng);
    const distanceToOffice = haversineDistanceKm(emp.lat, emp.lng, officeLat, officeLng);
    return {
      ...emp,
      bearingDeg,
      distanceToOffice,
    };
  });

  // 2. Generate multiple candidate fleet partitions
  const candidatePartitions = generateCandidatePartitions(
    enriched,
    officeLat,
    officeLng,
    vehicleSelection,
    maxTripKm,
  );

  // 3. Optimize top candidate partitions using the Local Search Improvement Loop
  let bestSolution: FleetCandidateSolution | null = null;

  // For high performance on large datasets, prioritize the top candidate partitions
  const partitionsToOptimize =
    enriched.length > 50
      ? [candidatePartitions[0]]
      : candidatePartitions.length <= 2
      ? candidatePartitions
      : candidatePartitions
          .map((p) => ({
            p,
            quickScore: evaluateFleetCandidate(p, officeLat, officeLng, vehicleSelection, maxTripKm).globalScore,
          }))
          .sort((a, b) => a.quickScore - b.quickScore)
          .slice(0, 2)
          .map((item) => item.p);

  for (const partition of partitionsToOptimize) {
    const optimized = optimizeFleetWithLocalSearch(
      partition,
      officeLat,
      officeLng,
      vehicleSelection,
      maxTripKm,
    );

    if (!bestSolution) {
      bestSolution = optimized;
    } else {
      // Prioritize feasible solutions, then minimal global score
      if (optimized.isFeasible && !bestSolution.isFeasible) {
        bestSolution = optimized;
      } else if (optimized.isFeasible === bestSolution.isFeasible) {
        if (optimized.globalScore < bestSolution.globalScore) {
          bestSolution = optimized;
        }
      }
    }
  }

  if (!bestSolution || bestSolution.clusters.length === 0) {
    // Fallback: assign each employee to an individual vehicle
    const fallbackGroups = enriched.map((e) => [e]);
    bestSolution = evaluateFleetCandidate(
      fallbackGroups,
      officeLat,
      officeLng,
      vehicleSelection,
      maxTripKm,
    );
  }

  // 4. Invariant Verification: Single Assignment Invariant
  // Verify that every single input employee appears in the winning fleet exactly once
  const assignedIds = new Set<string>();
  const verifiedClusters: EnrichedPolarEmployee[][] = [];

  for (const cluster of bestSolution.clusters) {
    const filtered: EnrichedPolarEmployee[] = [];
    for (const p of cluster) {
      if (!assignedIds.has(p.id)) {
        assignedIds.add(p.id);
        filtered.push(p);
      }
    }
    if (filtered.length > 0) {
      verifiedClusters.push(filtered);
    }
  }

  // Check for any unassigned commuters and allocate them safely
  for (const emp of enriched) {
    if (!assignedIds.has(emp.id)) {
      assignedIds.add(emp.id);
      verifiedClusters.push([emp]);
    }
  }

  // 5. Sort final clusters by furthest distance to office descending
  verifiedClusters.sort((a, b) => {
    const maxA = Math.max(...a.map((p) => p.distanceToOffice));
    const maxB = Math.max(...b.map((p) => p.distanceToOffice));
    return maxB - maxA;
  });

  // 6. Map to FleetClusterGroup with physical quota enforcement and vehicle substitution
  const allocatedGroups: FleetClusterGroup[] = [];
  const unassignedEmployees: UnassignedEmployeeRecord[] = [];

  const availSedans = constraints?.availableSedans ?? Infinity;
  const availSUVs = constraints?.availableSUVs ?? Infinity;

  let usedSedans = 0;
  let usedSUVs = 0;

  for (let idx = 0; idx < verifiedClusters.length; idx++) {
    const cluster = verifiedClusters[idx];
    let category: 'SEDAN' | 'SUV' = 'SEDAN';
    let capacity = 4;

    if (vehicleSelection === 'SUV') {
      category = 'SUV';
      capacity = 6;
    } else if (vehicleSelection === 'SEDAN') {
      category = 'SEDAN';
      capacity = 4;
    } else {
      // In 'ALL' mode:
      if (cluster.length >= 5) {
        category = 'SUV';
        capacity = 6;
      } else {
        // Vehicle substitution: If Sedans are exhausted but SUVs are available, substitute an SUV
        if (usedSedans >= availSedans && usedSUVs < availSUVs) {
          category = 'SUV';
          capacity = 6;
        } else {
          category = 'SEDAN';
          capacity = 4;
        }
      }
    }

    // Check physical fleet inventory bounds
    if (category === 'SEDAN' && usedSedans >= availSedans) {
      cluster.forEach((emp) => {
        unassignedEmployees.push({
          employeeId: emp.id,
          employeeName: emp.name,
          pickupAddress: emp.pickupAddress,
          reason: 'FLEET_EXHAUSTED',
          recommendation: `Sedan fleet limit reached (${availSedans} Sedans deployed). Allocate 1 additional vehicle or schedule Wave 2 dispatch 30 mins later.`,
        });
      });
      continue;
    }

    if (category === 'SUV' && usedSUVs >= availSUVs) {
      cluster.forEach((emp) => {
        unassignedEmployees.push({
          employeeId: emp.id,
          employeeName: emp.name,
          pickupAddress: emp.pickupAddress,
          reason: 'FLEET_EXHAUSTED',
          recommendation: `SUV fleet limit reached (${availSUVs} SUVs deployed). Allocate 1 additional vehicle or schedule Wave 2 dispatch 30 mins later.`,
        });
      });
      continue;
    }

    if (category === 'SEDAN') usedSedans++;
    if (category === 'SUV') usedSUVs++;

    const totalDirectSumKm = Number(
      cluster.reduce(
        (sum, p) =>
          sum +
          (p.directDistanceKm ||
            estimateRoadDistanceKm(p.lat, p.lng, officeLat, officeLng)),
        0,
      ).toFixed(1),
    );

    allocatedGroups.push({
      cabIndex: allocatedGroups.length + 1,
      vehicleCategory: category,
      capacity,
      passengers: cluster,
      totalDirectSumKm,
    });
  }

  const result: FleetClusterGroup[] & { unassignedEmployees?: UnassignedEmployeeRecord[] } = allocatedGroups as any;
  if (unassignedEmployees.length > 0) {
    result.unassignedEmployees = unassignedEmployees;
  }
  return result;
}

/**
 * Calculates the Gini Detour Fairness Coefficient for the fleet (0 = completely equal, 1 = maximum inequality).
 */
export function calculateGiniDetourCoefficient(idfs: number[]): number {
  if (!idfs || idfs.length <= 1) return 0;
  const n = idfs.length;
  let sumDiff = 0;
  let sumVal = 0;
  for (let i = 0; i < n; i++) {
    sumVal += idfs[i];
    for (let j = 0; j < n; j++) {
      sumDiff += Math.abs(idfs[i] - idfs[j]);
    }
  }
  if (sumVal <= 0.00001) return 0;
  return Number((sumDiff / (2 * n * sumVal)).toFixed(4));
}

/**
 * Evaluates the total road journey distance for a given sequence of pickup stops to office.
 */
export function calculateSequenceDistance(
  sequence: TestEmployee[],
  officeLat: number,
  officeLng: number,
): number {
  if (sequence.length === 0) return 0;
  let totalKm = 0;

  for (let i = 0; i < sequence.length - 1; i++) {
    totalKm += estimateRoadDistanceKm(
      sequence[i].lat,
      sequence[i].lng,
      sequence[i + 1].lat,
      sequence[i + 1].lng,
    );
  }

  const last = sequence[sequence.length - 1];
  totalKm += estimateRoadDistanceKm(last.lat, last.lng, officeLat, officeLng);
  return Number(totalKm.toFixed(2));
}

/**
 * Generates all permutations of an array.
 */
function permute<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];

  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    const permutations = permute(rest);
    for (const p of permutations) {
      result.push([current, ...p]);
    }
  }

  return result;
}

export interface SequencingSafetyOptions {
  isNightShift?: boolean;
  isLogout?: boolean;
  hasEscort?: boolean;
}

/**
 * Checks if a sequence conforms to enterprise female night-shift safety:
 * When a male is in the cab between 20:00 and 06:00, a female passenger must not be
 * the first pickup (LOGIN) or last drop (LOGOUT), unless a security escort is assigned.
 */
export function isSequenceSafetyCompliant(
  sequence: TestEmployee[],
  options?: SequencingSafetyOptions,
): boolean {
  if (!options?.isNightShift || options?.hasEscort || sequence.length < 2) {
    return true;
  }

  const g = (p: TestEmployee) => (p.gender || '').toUpperCase();
  const hasMale = sequence.some((p) => g(p) === 'MALE');
  const hasFemale = sequence.some((p) => g(p) === 'FEMALE');

  // Single-gender cabs (all-female or all-male) are safe
  if (!hasMale || !hasFemale) {
    return true;
  }

  const edgePassenger = options.isLogout ? sequence[sequence.length - 1] : sequence[0];
  return g(edgePassenger) !== 'FEMALE';
}

/**
 * Optimizes the pickup sequence for a single cab cluster.
 * For N <= 7: Solves exact TSP permutation minimizing total distance and in-cab ride penalty,
 * enforcing female night-shift safety as a hard constraint.
 * For N > 7: Runs Nearest-Neighbor greedy search followed by 2-Opt local search.
 */
export function optimizeClusterPickupSequence(
  passengers: TestEmployee[],
  officeLat: number,
  officeLng: number,
  optimizationObjective: 'MIN_DISTANCE' | 'MIN_TIME' | 'BALANCED' = 'MIN_DISTANCE',
  safetyOptions?: SequencingSafetyOptions,
): {
  orderedPassengers: TestEmployee[];
  totalDistanceKm: number;
  sequencingMethod: 'EXACT_PERMUTATION' | 'GREEDY_2OPT';
  totalEvaluatedSequences: number;
  safetyCompliant: boolean;
  escortRequired: boolean;
} {
  if (passengers.length <= 1) {
    const isSafe = isSequenceSafetyCompliant(passengers, safetyOptions);
    return {
      orderedPassengers: [...passengers],
      totalDistanceKm:
        passengers.length === 1
          ? estimateRoadDistanceKm(passengers[0].lat, passengers[0].lng, officeLat, officeLng)
          : 0,
      sequencingMethod: 'EXACT_PERMUTATION',
      totalEvaluatedSequences: 1,
      safetyCompliant: isSafe,
      escortRequired: !isSafe,
    };
  }

  // Exact Permutation Solver for N <= 7
  if (passengers.length <= 7) {
    const allPermutations = permute(passengers);
    let bestSequence = allPermutations[0];
    let bestScore = Infinity;
    let foundSafeSequence = false;

    // First pass: evaluate sequences that satisfy female night safety
    for (const seq of allPermutations) {
      const isSafe = isSequenceSafetyCompliant(seq, safetyOptions);
      if (safetyOptions?.isNightShift && !safetyOptions?.hasEscort && !isSafe) {
        continue; // Hard constraint filter: discard unsafe permutations
      }

      foundSafeSequence = true;
      const routeKm = calculateSequenceDistance(seq, officeLat, officeLng);

      // Inward Directional Flow & Backtracking Penalty
      let backtrackPenalty = 0;
      let cumulativeRideKm = 0;
      let legSum = 0;

      for (let i = 0; i < seq.length - 1; i++) {
        const d1 = haversineDistanceKm(seq[i].lat, seq[i].lng, officeLat, officeLng);
        const d2 = haversineDistanceKm(seq[i + 1].lat, seq[i + 1].lng, officeLat, officeLng);
        if (d2 > d1 + 0.8) {
          backtrackPenalty += (d2 - d1) * 2.5;
        }

        legSum += estimateRoadDistanceKm(seq[i].lat, seq[i].lng, seq[i + 1].lat, seq[i + 1].lng);
        cumulativeRideKm += legSum;
      }

      let score: number;
      if (optimizationObjective === 'MIN_DISTANCE') {
        score = routeKm + backtrackPenalty * 0.15;
      } else if (optimizationObjective === 'MIN_TIME') {
        const avgRide = cumulativeRideKm / Math.max(1, seq.length);
        score = routeKm * 0.45 + avgRide * 0.45 + backtrackPenalty * 1.5;
      } else {
        const avgRide = cumulativeRideKm / Math.max(1, seq.length);
        score = routeKm * 0.60 + avgRide * 0.25 + backtrackPenalty * 1.0;
      }

      if (score < bestScore) {
        bestScore = score;
        bestSequence = seq;
      }
    }

    // If no permutation satisfied the constraint (e.g. impossible edge case), fallback to optimal
    // unconstrained sequence and flag escortRequired
    let escortRequired = false;
    if (!foundSafeSequence) {
      escortRequired = true;
      for (const seq of allPermutations) {
        const routeKm = calculateSequenceDistance(seq, officeLat, officeLng);
        if (routeKm < bestScore) {
          bestScore = routeKm;
          bestSequence = seq;
        }
      }
    }

    const totalDist = calculateSequenceDistance(bestSequence, officeLat, officeLng);
    return {
      orderedPassengers: bestSequence,
      totalDistanceKm: totalDist,
      sequencingMethod: 'EXACT_PERMUTATION',
      totalEvaluatedSequences: allPermutations.length,
      safetyCompliant: !escortRequired,
      escortRequired,
    };
  }

  // Heuristic: Greedy Nearest Neighbor + 2-Opt for N > 7
  let evaluatedCount = 0;
  const isNight = !!safetyOptions?.isNightShift;
  const isLogout = !!safetyOptions?.isLogout;
  const hasEscort = !!safetyOptions?.hasEscort;

  const unvisited = [...passengers].sort((a, b) => {
    const dA = haversineDistanceKm(a.lat, a.lng, officeLat, officeLng);
    const dB = haversineDistanceKm(b.lat, b.lng, officeLat, officeLng);
    return dB - dA;
  });

  // If night shift, ensure first rider chosen for LOGIN is male if males exist
  const hasMale = unvisited.some((p) => (p.gender || '').toUpperCase() === 'MALE');
  let firstRiderIdx = 0;
  if (isNight && !hasEscort && !isLogout && hasMale) {
    firstRiderIdx = unvisited.findIndex((p) => (p.gender || '').toUpperCase() === 'MALE');
    if (firstRiderIdx === -1) firstRiderIdx = 0;
  }

  const currentRoute: TestEmployee[] = [unvisited.splice(firstRiderIdx, 1)[0]];
  while (unvisited.length > 0) {
    const last = currentRoute[currentRoute.length - 1];
    let nearestIdx = 0;
    let minD = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      evaluatedCount++;
      const d = haversineDistanceKm(last.lat, last.lng, unvisited[i].lat, unvisited[i].lng);
      if (d < minD) {
        minD = d;
        nearestIdx = i;
      }
    }

    currentRoute.push(unvisited.splice(nearestIdx, 1)[0]);
  }

  // 2-Opt Local Search with refined convergence threshold (0.005 km = 5 meters)
  let improved = true;
  let iterations = 0;
  while (improved && iterations < 50) {
    improved = false;
    iterations++;

    for (let i = 0; i < currentRoute.length - 1; i++) {
      for (let k = i + 1; k < currentRoute.length; k++) {
        evaluatedCount++;
        const newRoute = [
          ...currentRoute.slice(0, i),
          ...currentRoute.slice(i, k + 1).reverse(),
          ...currentRoute.slice(k + 1),
        ];

        // Enforce safety constraint on candidate swap
        if (!isSequenceSafetyCompliant(newRoute, safetyOptions)) {
          continue;
        }

        const oldDist = calculateSequenceDistance(currentRoute, officeLat, officeLng);
        const newDist = calculateSequenceDistance(newRoute, officeLat, officeLng);

        if (newDist < oldDist - 0.005) {
          currentRoute.splice(0, currentRoute.length, ...newRoute);
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  const finalDist = calculateSequenceDistance(currentRoute, officeLat, officeLng);
  const safe = isSequenceSafetyCompliant(currentRoute, safetyOptions);

  return {
    orderedPassengers: currentRoute,
    totalDistanceKm: finalDist,
    sequencingMethod: 'GREEDY_2OPT',
    totalEvaluatedSequences: evaluatedCount,
    safetyCompliant: safe,
    escortRequired: !safe,
  };
}

/**
 * Evaluates permutations to discover a genuine viable alternative sequence.
 * Only returns an alternative if it is distinct and within an acceptable distance detour
 * threshold (<= 28% of shortest distance) without severe outward backtracking.
 */
export function findParetoAlternativeSequence(
  passengers: TestEmployee[],
  officeLat: number,
  officeLng: number,
  excludeSequences: TestEmployee[][] = [],
  safetyOptions?: SequencingSafetyOptions,
): {
  orderedPassengers: TestEmployee[];
  totalDistanceKm: number;
} | null {
  if (passengers.length <= 2) return null;

  const excludedKeys = new Set(
    excludeSequences.map((seq) => seq.map((p) => p.id).join(',')),
  );

  if (passengers.length <= 7) {
    const allPermutations = permute(passengers);
    const candidateList: Array<{
      seq: TestEmployee[];
      dist: number;
      score: number;
    }> = [];

    const shortestDist = Math.min(
      ...allPermutations.map((p) => calculateSequenceDistance(p, officeLat, officeLng)),
    );

    for (const seq of allPermutations) {
      const key = seq.map((p) => p.id).join(',');
      if (excludedKeys.has(key)) continue;

      if (!isSequenceSafetyCompliant(seq, safetyOptions)) continue;

      const dist = calculateSequenceDistance(seq, officeLat, officeLng);
      if (dist > shortestDist * 1.28) continue; // Max 28% detour cap

      let backtrackPenalty = 0;
      let cumulativeRideKm = 0;
      let legSum = 0;

      for (let i = 0; i < seq.length - 1; i++) {
        const d1 = haversineDistanceKm(seq[i].lat, seq[i].lng, officeLat, officeLng);
        const d2 = haversineDistanceKm(seq[i + 1].lat, seq[i + 1].lng, officeLat, officeLng);
        if (d2 > d1 + 0.8) {
          backtrackPenalty += (d2 - d1) * 2.5;
        }
        legSum += estimateRoadDistanceKm(seq[i].lat, seq[i].lng, seq[i + 1].lat, seq[i + 1].lng);
        cumulativeRideKm += legSum;
      }

      if (backtrackPenalty > 3.5) continue;

      const score = dist * 0.65 + (cumulativeRideKm / seq.length) * 0.25 + backtrackPenalty * 1.0;
      candidateList.push({ seq, dist, score });
    }

    if (candidateList.length === 0) return null;

    candidateList.sort((a, b) => a.score - b.score);
    return {
      orderedPassengers: candidateList[0].seq,
      totalDistanceKm: candidateList[0].dist,
    };
  }

  // For N > 7, generate alternative by reversing intermediate stops
  const alt = [
    passengers[0],
    ...passengers.slice(1, passengers.length - 1).reverse(),
    passengers[passengers.length - 1],
  ];
  return {
    orderedPassengers: alt,
    totalDistanceKm: calculateSequenceDistance(alt, officeLat, officeLng),
  };
}

/**
 * Determines whether two employees share the exact same physical pickup location / nodal stop.
 * Industry Standard (MoveInSync / Routematic):
 * - Co-located if identical normalized pickup addresses (e.g. both boarding at same society gate), OR
 * - Valid geographic distance is within 60 meters (<= 0.06 km) AND they do not have contradictory locality names.
 */
export function isCoLocatedPickup(
  p1?: { id?: string; pickupAddress?: string; formattedAddress?: string; lat?: number; lng?: number } | null,
  p2?: { id?: string; pickupAddress?: string; formattedAddress?: string; lat?: number; lng?: number } | null,
): boolean {
  if (!p1 || !p2) return false;
  if (p1.id && p2.id && p1.id === p2.id) return false;

  const addr1 = (p1.pickupAddress || '').toLowerCase().trim();
  const addr2 = (p2.pickupAddress || '').toLowerCase().trim();

  // 1. Exact or near-exact user-specified pickup address
  if (addr1 && addr2) {
    const norm1 = addr1.replace(/[\s,.-]+/g, ' ');
    const norm2 = addr2.replace(/[\s,.-]+/g, ' ');
    if (norm1 === norm2) return true;
  }

  // 2. Geographic proximity check: requires valid non-zero coordinates
  const hasCoords1 = typeof p1.lat === 'number' && typeof p1.lng === 'number' && p1.lat !== 0 && p1.lng !== 0;
  const hasCoords2 = typeof p2.lat === 'number' && typeof p2.lng === 'number' && p2.lat !== 0 && p2.lng !== 0;

  if (hasCoords1 && hasCoords2) {
    const distKm = haversineDistanceKm(p1.lat, p1.lng, p2.lat, p2.lng);
    // Strict 60m threshold for shared society / building gate
    if (distKm <= 0.06) {
      // Guard against false geocode collisions: if addresses mention different known localities, do not merge!
      if (addr1 && addr2) {
        const majorLocalities = [
          'tarnaka',
          'peerzadiguda',
          'uppal',
          'boduppal',
          'secunderabad',
          'begumpet',
          'ameerpet',
          'kukatpally',
          'kphb',
          'miyapur',
          'madhapur',
          'gachibowli',
          'kondapur',
          'hitec city',
          'nanakramguda',
          'manikonda',
          'jubilee hills',
          'banjara hills',
          'dilsukhnagar',
          'lb nagar',
          'malakpet',
          'mehdipatnam',
          'alwal',
          'kompally',
          'ecil',
          'moula ali',
          'nacharam',
          'habsiguda',
        ];

        for (const loc of majorLocalities) {
          const has1 = addr1.includes(loc);
          const has2 = addr2.includes(loc);
          if (has1 !== has2) {
            // One address has this locality and the other does not -> distinct localities!
            return false;
          }
        }
      }
      return true;
    }
  }

  return false;
}

/**
 * Schedules pickup times backwards from the required office shift arrival time.
 * - Industry Standard Nodal Clustering: Employees at the exact same location (within 60m or identical address)
 *   share the EXACT SAME pickup time and the cab incurs only a single boarding dwell.
 * - Enforces dwell buffer per physical stop, eliminating artificial delays for co-located commuters.
 * - Uses authoritative route leg travel times when provided by Google Routes API.
 * - Safely handles midnight crossovers using full epoch timestamps.
 */
export function schedulePickupTimes(
  passengers: TestEmployee[],
  totalDurationMinutes: number,
  shiftTimeStr: string,
  stopDwellMinutes: number = 5,
  officeBufferMinutes: number = 10,
  routeLegs?: Array<{ distanceKm: number; durationMinutes: number }>,
): {
  scheduledPassengers: TestEmployee[];
  departureTimeStr: string;
  arrivalTimeStr: string;
} {
  if (!passengers || passengers.length === 0) {
    return { scheduledPassengers: [], departureTimeStr: '', arrivalTimeStr: '' };
  }

  const [shiftH, shiftM] = shiftTimeStr.split(':').map((s) => Number(s) || 0);
  const targetOfficeArrival = new Date();
  targetOfficeArrival.setHours(shiftH, shiftM, 0, 0);

  // Arrive at office officeBufferMinutes before shift time
  const targetBufferArrivalMs = targetOfficeArrival.getTime() - officeBufferMinutes * 60000;
  const targetBufferArrival = new Date(targetBufferArrivalMs);

  // 1. Group sequential passengers into Physical Nodal Stops (Co-located Pickups <= 0.06 km)
  interface NodalStop {
    stopIndex: number;
    passengers: TestEmployee[];
    lat: number;
    lng: number;
  }

  const nodalStops: NodalStop[] = [];
  passengers.forEach((p) => {
    const lastStop = nodalStops[nodalStops.length - 1];
    const isCoLocated = Boolean(lastStop && isCoLocatedPickup(lastStop.passengers[0], p));

    if (isCoLocated) {
      lastStop.passengers.push(p);
    } else {
      nodalStops.push({
        stopIndex: nodalStops.length + 1,
        passengers: [p],
        lat: p.lat,
        lng: p.lng,
      });
    }
  });

  // Dwell is applied per distinct physical stop
  const physicalStopCount = nodalStops.length;
  const totalDwellMinutes = physicalStopCount * stopDwellMinutes;
  const totalTripMinutes = totalDurationMinutes + totalDwellMinutes;

  // Safe epoch subtraction across midnight
  const departureMs = targetBufferArrivalMs - totalTripMinutes * 60000;
  const departureDate = new Date(departureMs);

  // 2. Schedule each physical stop along the route
  let cumulativeMinutes = 0;
  const scheduledPassengers: TestEmployee[] = [];

  nodalStops.forEach((stop, stopIdx) => {
    if (stopIdx > 0) {
      const prevStop = nodalStops[stopIdx - 1];
      const legDuration =
        routeLegs && routeLegs[stopIdx - 1]
          ? routeLegs[stopIdx - 1].durationMinutes
          : null;
      const legKm = estimateRoadDistanceKm(prevStop.lat, prevStop.lng, stop.lat, stop.lng);
      const estMin =
        legDuration !== null
          ? Math.max(1, Math.round(legDuration))
          : Math.max(1, Math.round(estimateTravelMinutes(legKm)));
      cumulativeMinutes += estMin;
    }

    const stopArrivalMs = departureMs + cumulativeMinutes * 60000;
    const estTime = new Date(stopArrivalMs);
    const pickupTimeStr = estTime.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // All passengers at this physical stop get the EXACT SAME scheduled pickup time!
    stop.passengers.forEach((p) => {
      p.pickupSequence = stop.stopIndex;
      p.estimatedPickupTime = pickupTimeStr;
      scheduledPassengers.push(p);
    });

    cumulativeMinutes += stopDwellMinutes;
  });

  const departureTimeStr = departureDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const arrivalTimeStr = targetBufferArrival.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return {
    scheduledPassengers,
    departureTimeStr,
    arrivalTimeStr,
  };
}
