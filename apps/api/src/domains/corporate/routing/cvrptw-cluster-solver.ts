import { RouteCoord, haversineKm, GoogleRoutesV2Adapter, RouteRequestOptions } from './google-routes-v2.adapter';

export interface EmployeeRecord {
  employeeName: string;
  pickupAddress: string;
  phoneNumber?: string;
  gender?: string;
  employeeId?: string;
  coord: RouteCoord;
  matchedAddress: string;
  officeDistanceKm: number;
  outOfRadius: boolean;
}

export interface SolverConfig {
  loginTime: Date;
  logoutTime?: Date;
  bufferMinutes: number; // default 15
  pickupWaitMinutes: number; // default 5
  cabCapacity: number; // default 4
  officeRadiusKm: number; // default 50
  routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
}

export interface SolverPlannedStop {
  sequence: number;
  name: string;
  address: string;
  matchedAddress: string;
  lat: number;
  lng: number;
  eta: string;
  dwellUntil: string;
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
  // Format to 12-hour AM/PM string, e.g. "6:45 AM"
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

export function generate4DigitOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Clusters employees into cabs using spatial proximity and radial spread objective scoring.
 */
export function clusterEmployees(employees: EmployeeRecord[], capacity: number): EmployeeRecord[][] {
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
): Promise<SolverCalculatedRoute> {
  // 1. Furthest employee from office starts the cab route
  const sortedByDist = [...group].sort((a, b) => b.officeDistanceKm - a.officeDistanceKm);
  const driver = sortedByDist[0];
  const pending = group.filter((p) => p !== driver).sort((a, b) => b.officeDistanceKm - a.officeDistanceKm);

  const targetArrival = new Date(config.loginTime.getTime() - config.bufferMinutes * 60_000);
  const earliestDeparture = new Date(config.loginTime.getTime() - 12 * 3600_000);
  const initialDeparture = new Date(Math.max(targetArrival.getTime() - 2 * 3600_000, earliestDeparture.getTime()));

  const options: RouteRequestOptions = {
    routingPreference: config.routingPreference || 'TRAFFIC_AWARE',
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

  const dwellSeconds = group.length * config.pickupWaitMinutes * 60;
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
    const dwellUntil = new Date(currentTime.getTime() + config.pickupWaitMinutes * 60_000);
    const nextName = idx + 1 < people.length ? people[idx + 1].employeeName : officeName;
    const legSec = legSeconds[idx] ?? Math.round((route.durationSeconds / people.length));
    const legDistanceMeters = legs[idx]?.distanceMeters ?? Math.round(route.distanceMeters / people.length);
    const legArrival = new Date(dwellUntil.getTime() + legSec * 1000);

    stops.push({
      sequence: idx + 1,
      name: person.employeeName,
      address: person.pickupAddress,
      matchedAddress: person.matchedAddress,
      lat: person.coord.lat,
      lng: person.coord.lng,
      eta: formatClock(currentTime),
      dwellUntil: formatClock(dwellUntil),
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

  return {
    cab: cabNumber,
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

