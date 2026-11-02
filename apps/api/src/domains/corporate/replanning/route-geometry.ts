/**
 * Pure route geometry used by incremental re-planning. Mirrors the cost model of
 * RouteSolverService (haversine x 1.25 tortuosity, 30 km/h, 300 s dwell per passenger stop)
 * so re-planned routes stay consistent with freshly solved ones.
 */

export const STOP_DWELL_SECONDS = 300;
export const AVERAGE_URBAN_SPEED_KMH = 30;
export const ROAD_TORTUOSITY_FACTOR = 1.25;
export const OFFICE_ARRIVAL_BUFFER_MINUTES = 10;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteTimings {
  /** Planned ETA for each passenger stop, in passenger order. */
  passengerEtas: Date[];
  officeEta: Date;
  targetPickup1Time: Date;
  targetOfficeArrivalTime: Date;
  estDistanceMeters: number;
  estDurationSeconds: number;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371e3;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dp = ((b.lat - a.lat) * Math.PI) / 180;
  const dl = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function roadMeters(a: LatLng, b: LatLng): number {
  return haversineMeters(a, b) * ROAD_TORTUOSITY_FACTOR;
}

function legSeconds(meters: number): number {
  return Math.round((meters / (AVERAGE_URBAN_SPEED_KMH * 1000)) * 3600);
}

/** Ordered physical path: LOGIN = passengers then office; LOGOUT = office then passengers. */
function path(direction: string, passengers: LatLng[], office: LatLng): LatLng[] {
  return direction === 'LOGOUT' ? [office, ...passengers] : [...passengers, office];
}

export function routeDistanceMeters(direction: string, passengers: LatLng[], office: LatLng): number {
  const pts = path(direction, passengers, office);
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += roadMeters(pts[i - 1], pts[i]);
  return total;
}

/**
 * Recomputes all planned times.
 *  LOGIN : anchor = office arrival (fixed); pickups are scheduled backwards from it.
 *  LOGOUT: anchor = office departure (fixed); drops are scheduled forwards from it.
 */
export function computeTimings(
  direction: string,
  passengers: LatLng[],
  office: LatLng,
  anchor: Date,
): RouteTimings {
  const n = passengers.length;
  if (n === 0) {
    return {
      passengerEtas: [],
      officeEta: new Date(anchor),
      targetPickup1Time: new Date(anchor),
      targetOfficeArrivalTime: new Date(anchor),
      estDistanceMeters: 0,
      estDurationSeconds: 0,
    };
  }

  if (direction === 'LOGOUT') {
    let distance = 0;
    let driving = 0;
    const etas: Date[] = [];
    let cursor = anchor.getTime();
    let prev = office;
    for (let i = 0; i < n; i++) {
      const m = roadMeters(prev, passengers[i]);
      const s = legSeconds(m);
      distance += Math.round(m);
      driving += s;
      cursor += (s + (i > 0 ? STOP_DWELL_SECONDS : 0)) * 1000;
      etas.push(new Date(cursor));
      prev = passengers[i];
    }
    return {
      passengerEtas: etas,
      officeEta: new Date(anchor),
      targetPickup1Time: new Date(anchor),
      targetOfficeArrivalTime: new Date(anchor),
      estDistanceMeters: distance,
      estDurationSeconds: driving + n * STOP_DWELL_SECONDS,
    };
  }

  const legs: number[] = [0];
  let distance = 0;
  let driving = 0;
  for (let i = 1; i < n; i++) {
    const m = roadMeters(passengers[i - 1], passengers[i]);
    const s = legSeconds(m);
    legs.push(s);
    distance += Math.round(m);
    driving += s;
  }
  const officeLeg = roadMeters(passengers[n - 1], office);
  distance += Math.round(officeLeg);
  driving += legSeconds(officeLeg);
  const total = driving + n * STOP_DWELL_SECONDS;
  const pickup1 = new Date(anchor.getTime() - total * 1000);
  const etas: Date[] = [];
  let cursor = pickup1.getTime();
  for (let i = 0; i < n; i++) {
    if (i > 0) cursor += (STOP_DWELL_SECONDS + legs[i]) * 1000;
    etas.push(new Date(cursor));
  }
  return {
    passengerEtas: etas,
    officeEta: new Date(anchor),
    targetPickup1Time: pickup1,
    targetOfficeArrivalTime: new Date(anchor),
    estDistanceMeters: distance,
    estDurationSeconds: total,
  };
}

/** Cheapest-insertion position for a new passenger; returns index into `passengers`. */
export function cheapestInsertion(
  direction: string,
  passengers: LatLng[],
  office: LatLng,
  candidate: LatLng,
): { index: number; addedMeters: number } {
  const base = routeDistanceMeters(direction, passengers, office);
  let best = { index: passengers.length, addedMeters: Number.POSITIVE_INFINITY };
  for (let i = 0; i <= passengers.length; i++) {
    const trial = [...passengers.slice(0, i), candidate, ...passengers.slice(i)];
    const added = routeDistanceMeters(direction, trial, office) - base;
    if (added < best.addedMeters) best = { index: i, addedMeters: added };
  }
  return best;
}
