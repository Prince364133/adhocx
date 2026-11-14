import { RouteCoord, haversineKm, GoogleRoutesV2Adapter, RouteRequestOptions } from './google-routes-v2.adapter';
import {
  PricingConfig,
  calculateDistanceCharge,
  selectCheapestCab,
  optimizeGroups,
  orderPickupsByShortestPath,
  DEFAULT_PRICING_CONFIG,
} from './cost-optimizer';

export interface EmployeeRecord {
  employeeName: string;
  pickupAddress: string;
  phoneNumber?: string;
  gender?: string;
  employeeId?: string;
  employeeCode?: string;
  email?: string;
  department?: string;
  coord: RouteCoord;
  matchedAddress: string;
  officeDistanceKm: number;
  outOfRadius: boolean;
  bearingToOffice?: number;
}

export interface SolverConfig {
  loginTime: Date;
  logoutTime?: Date;
  bufferMinutes: number; // default 15
  pickupWaitMinutes: number; // standard/max 10
  cabCapacity: number; // maximum passengers per cab, default 6
  officeRadiusKm: number; // default 50
  maxTripKm?: number; // default 50
  routingPreference?: RouteRequestOptions['routingPreference'];
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  pricingConfig?: PricingConfig;
}

export interface SolverPlannedStop {
  sequence: number;
  name: string;
  address: string;
  matchedAddress: string;
  employeeId?: string;
  employeeCode?: string;
  phoneNumber?: string;
  gender?: string;
  email?: string;
  department?: string;
  lat: number;
  lng: number;
  eta: string;
  etaIso?: string;
  dwellUntil: string;
  dwellUntilIso?: string;
  dwellSeconds?: number;
  nextStop: string;
  travelToNextMinutes: number;
  distanceToNextKm: number;
  arrivalAtNext: string;
  officeDistanceKm: number;
  outOfRadius: boolean;
  boardingOtp?: string;
}

export interface SolverPlannedSegment {
  from: string;
  to: string;
  depart: string;
  arrive: string;
  minutes: number;
  distanceKm: number;
}

export interface SolverCalculatedRoute {
  cab: number;
  /** LOGIN: homes -> office (stops are pickups). LOGOUT: office -> homes (stops are drops). */
  direction?: 'LOGIN' | 'LOGOUT';
  office: { name: string; lat: number; lng: number };
  requiredArrival: string;
  requiredArrivalDateTime: string;
  departureDateTime: string;
  dwellSeconds?: number;
  cabType?: string;
  driverPayout?: number;
  corporateRevenue?: number;
  projectedMargin?: number;
  driverStart: string;
  sequence: string;
  stops: SolverPlannedStop[];
  segments: SolverPlannedSegment[];
  departure: string;
  arrival: string;
  distanceKm: number;
  driveMinutes: number;
  status: 'Meets deadline' | 'Misses deadline';
  bufferStatus: 'Meets buffer' | 'Misses buffer';
  timeSource: string;
  path: [number, number][]; // [lat, lng] array
  _departureSort?: Date;
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function generate4DigitOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Clusters employees into cabs using directional corridor bearings or pairwise Haversine proximity.
 */
export function clusterEmployees(
  employees: EmployeeRecord[],
  capacity: number,
  officeCoord?: RouteCoord,
  pricingConfig?: PricingConfig,
  maxTripKm?: number,
): EmployeeRecord[][] {
  if (officeCoord) {
    return optimizeGroups(
      employees,
      officeCoord,
      pricingConfig || DEFAULT_PRICING_CONFIG,
      capacity,
      maxTripKm || 50,
    );
  }

  let remaining = [...employees];
  const groups: EmployeeRecord[][] = [];

  while (remaining.length > capacity) {
    let bestGroup: EmployeeRecord[] | null = null;
    let bestScore: number | null = null;

    for (const seed of remaining) {
      // Find nearest neighbors to seed
      const others = remaining.filter((e) => e !== seed);
      others.sort((a, b) => haversineKm(seed.coord, a.coord) - haversineKm(seed.coord, b.coord));
      const nearest = others.slice(0, Math.max(capacity * 2, capacity - 1));
      const candidate = [seed, ...nearest.slice(0, capacity - 1)];

      // 1. Pairwise km between co-riders
      let pairwiseKm = 0;
      for (let i = 0; i < candidate.length; i++) {
        for (let j = i + 1; j < candidate.length; j++) {
          pairwiseKm += haversineKm(candidate[i].coord, candidate[j].coord);
        }
      }

      // 2. Radial spread relative to office
      const officeDists = candidate.map((p) => p.officeDistanceKm);
      const radialSpreadKm = Math.max(...officeDists) - Math.min(...officeDists);

      // Objective Score = Pairwise km + 0.35 * radial spread km
      const score = pairwiseKm + 0.35 * radialSpreadKm;

      if (bestScore === null || score < bestScore) {
        bestGroup = candidate;
        bestScore = score;
      }
    }

    if (bestGroup) {
      groups.push(bestGroup);
      const chosen = new Set(bestGroup);
      remaining = remaining.filter((e) => !chosen.has(e));
    } else {
      break;
    }
  }

  if (remaining.length > 0) {
    groups.push(remaining);
  }

  return groups;
}

/**
 * Solves traffic-aware route and itinerary for a single cab group.
 */
export async function solveCabRoute(
  cabNumber: number,
  group: EmployeeRecord[],
  officeName: string,
  officeCoord: RouteCoord,
  config: SolverConfig,
  routesAdapter: GoogleRoutesV2Adapter,
  pricingConfig: PricingConfig = DEFAULT_PRICING_CONFIG,
  fleetUsed: Record<string, number> = {},
): Promise<SolverCalculatedRoute> {
  // 1. Furthest employee from office starts the cab route
  const sortedByDist = [...group].sort((a, b) => b.officeDistanceKm - a.officeDistanceKm);
  const driver = sortedByDist[0];
  const pending = orderPickupsByShortestPath(group, officeCoord).filter((p) => p !== driver);

  const targetArrival = new Date(config.loginTime.getTime() - config.bufferMinutes * 60_000);
  const earliestDeparture = new Date(config.loginTime.getTime() - 12 * 3600_000);
  const initialDeparture = new Date(Math.max(targetArrival.getTime() - 2 * 3600_000, earliestDeparture.getTime()));

  const options: RouteRequestOptions = {
    routingPreference: config.routingPreference || 'TRAFFIC_UNAWARE',
    avoidTolls: config.avoidTolls,
    avoidHighways: config.avoidHighways,
  };

  // 2. Multi-pass iterative departure solver
  let route = await routesAdapter.computeRoute(
    driver.coord,
    pending.map((p) => p.coord),
    officeCoord,
    initialDeparture,
    options,
  );

  const pickupWaitMinutes = Math.min(Math.max(Number(config.pickupWaitMinutes) || 10, 1), 10);
  const stopDwellSeconds = Math.round(pickupWaitMinutes * 60);
  const dwellSeconds = group.length * stopDwellSeconds;
  let departure = new Date(
    Math.max(targetArrival.getTime() - (route.durationSeconds + dwellSeconds) * 1000, earliestDeparture.getTime()),
  );

  // Pass 1 refinement if departure differs by >60 seconds
  if (Math.abs(departure.getTime() - initialDeparture.getTime()) > 60_000) {
    route = await routesAdapter.computeRoute(
      driver.coord,
      pending.map((p) => p.coord),
      officeCoord,
      departure,
      options,
    );
    const refined = new Date(
      Math.max(targetArrival.getTime() - (route.durationSeconds + dwellSeconds) * 1000, earliestDeparture.getTime()),
    );

    // Pass 2 refinement
    if (Math.abs(refined.getTime() - departure.getTime()) > 60_000) {
      departure = refined;
      route = await routesAdapter.computeRoute(
        driver.coord,
        pending.map((p) => p.coord),
        officeCoord,
        departure,
        options,
      );
    }
  }

  const driveSeconds = route.durationSeconds;
  const arrival = new Date(departure.getTime() + (driveSeconds + dwellSeconds) * 1000);

  // 3. Order stops by Google's optimized intermediate indices
  const ordering = route.optimizedIntermediateWaypointIndex;
  const orderedPending: EmployeeRecord[] =
    ordering && ordering.length === pending.length ? ordering.map((idx) => pending[idx]) : pending;

  const people = [driver, ...orderedPending];
  const legs = Array.isArray(route.legs) ? route.legs : [];

  // Align leg durations
  const legSeconds = legs.map((l: any) => Number(l.durationSeconds) || 0);
  if (legSeconds.length > 0) {
    const sumLegs = legSeconds.reduce((a, b) => a + b, 0);
    legSeconds[legSeconds.length - 1] += Math.max(0, driveSeconds - sumLegs);
  }

  // 4. Build per-stop door-to-door itinerary
  let currentTime = new Date(departure.getTime());
  const stops: SolverPlannedStop[] = [];
  const segments: SolverPlannedSegment[] = [];

  for (let idx = 0; idx < people.length; idx++) {
    const person = people[idx];
    const dwellUntil = new Date(currentTime.getTime() + pickupWaitMinutes * 60_000);
    const nextName = idx + 1 < people.length ? people[idx + 1].employeeName : officeName;
    const legSec = legSeconds[idx] ?? Math.round((route.durationSeconds / people.length));
    const legDistanceMeters = legs[idx]?.distanceMeters ?? Math.round(route.distanceMeters / people.length);
    const legArrival = new Date(dwellUntil.getTime() + legSec * 1000);

    stops.push({
      sequence: idx + 1,
      name: person.employeeName,
      address: person.pickupAddress,
      matchedAddress: person.matchedAddress,
      employeeId: person.employeeId,
      employeeCode: person.employeeCode,
      phoneNumber: person.phoneNumber,
      gender: person.gender,
      email: person.email,
      department: person.department,
      lat: person.coord.lat,
      lng: person.coord.lng,
      eta: formatClock(currentTime),
      etaIso: currentTime.toISOString(),
      dwellUntil: formatClock(dwellUntil),
      dwellUntilIso: dwellUntil.toISOString(),
      dwellSeconds: stopDwellSeconds,
      nextStop: nextName,
      travelToNextMinutes: Number((legSec / 60).toFixed(1)),
      distanceToNextKm: Number((legDistanceMeters / 1000).toFixed(2)),
      arrivalAtNext: formatClock(legArrival),
      officeDistanceKm: person.officeDistanceKm,
      outOfRadius: person.outOfRadius,
      boardingOtp: generate4DigitOtp(),
    });

    segments.push({
      from: person.employeeName,
      to: nextName,
      depart: formatClock(dwellUntil),
      arrive: formatClock(legArrival),
      minutes: Number((legSec / 60).toFixed(1)),
      distanceKm: Number((legDistanceMeters / 1000).toFixed(2)),
    });

    currentTime = legArrival;
  }

  const meetsDeadline = arrival.getTime() <= config.loginTime.getTime();
  const meetsBuffer = arrival.getTime() <= targetArrival.getTime();

  const effectivePricing = config.pricingConfig || pricingConfig || DEFAULT_PRICING_CONFIG;
  const cabType = selectCheapestCab(route.distanceKm, group.length, effectivePricing, fleetUsed);
  if (!cabType) {
    throw new Error(`No compatible available vehicle for a route with ${group.length} passengers`);
  }
  if (cabType) {
    fleetUsed[cabType.name] = (fleetUsed[cabType.name] || 0) + 1;
  }
  const driverPayout = cabType ? calculateDistanceCharge(route.distanceKm, cabType) : 0;
  const corporateRevenue = Number(
    (
      (effectivePricing.employeeRevenue || 0) * group.length +
      (effectivePricing.revenuePerKm || 0) * route.distanceKm
    ).toFixed(2),
  );
  const projectedMargin = Number((corporateRevenue - driverPayout).toFixed(2));

  return {
    cab: cabNumber,
    direction: 'LOGIN',
    office: { name: officeName, lat: officeCoord.lat, lng: officeCoord.lng },
    requiredArrival: formatClock(config.loginTime),
    requiredArrivalDateTime: config.loginTime.toISOString(),
    departureDateTime: departure.toISOString(),
    dwellSeconds: stopDwellSeconds,
    cabType: cabType?.name || 'vehicle',
    driverPayout,
    corporateRevenue,
    projectedMargin,
    driverStart: `${driver.employeeName} - ${driver.pickupAddress}`,
    sequence: [...people.map((p) => p.employeeName), officeName].join(' -> '),
    stops,
    segments,
    departure: formatClock(departure),
    arrival: formatClock(arrival),
    distanceKm: route.distanceKm,
    driveMinutes: Number((driveSeconds / 60).toFixed(1)),
    status: meetsDeadline ? 'Meets deadline' : 'Misses deadline',
    bufferStatus: meetsBuffer ? 'Meets buffer' : 'Misses buffer',
    timeSource: route.isRealRoad ? 'Google Routes traffic aware' : 'High-fidelity road factor fallback',
    path: route.decodedPath,
    _departureSort: departure,
  };
}


/** Hand-over time budgeted at each LOGOUT drop (employee alights; no boarding wait). */
/**
 * LOGOUT itinerary for one cab: departs the office at the shift logout time (`config.loginTime`
 * carries the logout anchor) and drops employees nearest-first, ending at the farthest home.
 * Stops are drops; `departureDateTime` = office departure = `requiredArrivalDateTime`.
 */
export async function solveLogoutCabRoute(
  cabNumber: number,
  group: EmployeeRecord[],
  officeName: string,
  officeCoord: RouteCoord,
  config: SolverConfig,
  routesAdapter: GoogleRoutesV2Adapter,
  pricingConfig: PricingConfig = DEFAULT_PRICING_CONFIG,
  fleetUsed: Record<string, number> = {},
): Promise<SolverCalculatedRoute> {
  const pickupWaitMinutes = Math.min(Math.max(Number(config.pickupWaitMinutes) || 5, 1), 10);
  const dropDwellSeconds = Math.round(pickupWaitMinutes * 60);
  const people = orderPickupsByShortestPath(group, officeCoord).reverse();
  const departure = new Date(config.loginTime.getTime());
  const options: RouteRequestOptions = {
    routingPreference: config.routingPreference || 'TRAFFIC_UNAWARE',
    avoidTolls: config.avoidTolls,
    avoidHighways: config.avoidHighways,
  };

  const last = people[people.length - 1];
  const route = await routesAdapter.computeRoute(
    officeCoord,
    people.slice(0, -1).map((p) => p.coord),
    last.coord,
    departure,
    options,
  );

  const legs = Array.isArray(route.legs) ? route.legs : [];
  const legSeconds = people.map((_, i) => Number(legs[i]?.durationSeconds) || Math.round(route.durationSeconds / people.length));
  const sumLegs = legSeconds.reduce((a, b) => a + b, 0);
  if (legSeconds.length > 0) legSeconds[legSeconds.length - 1] += Math.max(0, route.durationSeconds - sumLegs);

  const stops: SolverPlannedStop[] = [];
  const segments: SolverPlannedSegment[] = [];
  let clock = new Date(departure.getTime());
  let fromName = officeName;
  for (let idx = 0; idx < people.length; idx++) {
    const person = people[idx];
    const legSec = legSeconds[idx];
    const legDistanceMeters = legs[idx]?.distanceMeters ?? Math.round(route.distanceMeters / people.length);
    const arrive = new Date(clock.getTime() + legSec * 1000);
    const handOverUntil = new Date(arrive.getTime() + dropDwellSeconds * 1000);
    const next = people[idx + 1];
    segments.push({
      from: fromName,
      to: person.employeeName,
      depart: formatClock(clock),
      arrive: formatClock(arrive),
      minutes: Number((legSec / 60).toFixed(1)),
      distanceKm: Number((legDistanceMeters / 1000).toFixed(2)),
    });
    stops.push({
      sequence: idx + 1,
      name: person.employeeName,
      address: person.pickupAddress,
      matchedAddress: person.matchedAddress,
      employeeId: person.employeeId,
      employeeCode: person.employeeCode,
      phoneNumber: person.phoneNumber,
      gender: person.gender,
      email: person.email,
      department: person.department,
      lat: person.coord.lat,
      lng: person.coord.lng,
      eta: formatClock(arrive),
      etaIso: arrive.toISOString(),
      dwellUntil: formatClock(handOverUntil),
      dwellUntilIso: handOverUntil.toISOString(),
      dwellSeconds: dropDwellSeconds,
      nextStop: next ? next.employeeName : 'End of route',
      travelToNextMinutes: next ? Number(((legSeconds[idx + 1] ?? 0) / 60).toFixed(1)) : 0,
      distanceToNextKm: next ? Number((((legs[idx + 1]?.distanceMeters ?? 0) as number) / 1000).toFixed(2)) : 0,
      arrivalAtNext: next ? formatClock(new Date(handOverUntil.getTime() + (legSeconds[idx + 1] ?? 0) * 1000)) : '',
      officeDistanceKm: person.officeDistanceKm,
      outOfRadius: person.outOfRadius,
    });
    clock = handOverUntil;
    fromName = person.employeeName;
  }

  const effectivePricing = config.pricingConfig || pricingConfig || DEFAULT_PRICING_CONFIG;
  const cabType = selectCheapestCab(route.distanceKm, group.length, effectivePricing, fleetUsed);
  if (!cabType) {
    throw new Error(`No compatible available vehicle for a route with ${group.length} passengers`);
  }
  fleetUsed[cabType.name] = (fleetUsed[cabType.name] || 0) + 1;
  const driverPayout = calculateDistanceCharge(route.distanceKm, cabType);
  const corporateRevenue = Number(
    (
      (effectivePricing.employeeRevenue || 0) * group.length +
      (effectivePricing.revenuePerKm || 0) * route.distanceKm
    ).toFixed(2),
  );
  const arrival = clock;

  return {
    cab: cabNumber,
    direction: 'LOGOUT',
    office: { name: officeName, lat: officeCoord.lat, lng: officeCoord.lng },
    requiredArrival: formatClock(departure),
    requiredArrivalDateTime: departure.toISOString(),
    departureDateTime: departure.toISOString(),
    dwellSeconds: dropDwellSeconds,
    cabType: cabType.name || 'vehicle',
    driverPayout,
    corporateRevenue,
    projectedMargin: Number((corporateRevenue - driverPayout).toFixed(2)),
    driverStart: `${officeName} (office departure)`,
    sequence: [officeName, ...people.map((p) => p.employeeName)].join(' -> '),
    stops,
    segments,
    departure: formatClock(departure),
    arrival: formatClock(arrival),
    distanceKm: route.distanceKm,
    driveMinutes: Number((route.durationSeconds / 60).toFixed(1)),
    status: 'Meets deadline',
    bufferStatus: 'Meets buffer',
    timeSource: route.isRealRoad ? 'Google Routes traffic aware' : 'High-fidelity road factor fallback',
    path: route.decodedPath,
    _departureSort: departure,
  };
}
