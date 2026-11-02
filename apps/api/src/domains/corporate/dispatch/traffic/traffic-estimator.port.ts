/**
 * Port: traffic-aware route duration estimation for the Dynamic Dispatch Advancer (DDA).
 *
 * Implementations MUST NOT throw for upstream failures; they degrade to a heuristic estimate
 * and report `source: 'HEURISTIC'` so callers can decide how much to trust the number.
 */
export const TRAFFIC_ESTIMATOR_PORT = Symbol('TRAFFIC_ESTIMATOR_PORT');

export interface TrafficWaypoint {
  latitude: number;
  longitude: number;
}

export type TrafficEstimateSource = 'GOOGLE' | 'HEURISTIC';

export interface TrafficRouteEstimate {
  /** Driving time predicted for the departure time, including congestion (no stop dwell). */
  durationInTrafficSec: number;
  /** Driving time with free-flowing traffic (no stop dwell). */
  staticDurationSec: number;
  distanceMeters: number;
  source: TrafficEstimateSource;
  /** True when the value was served from cache rather than a fresh computation. */
  cached?: boolean;
}

export interface TrafficEstimateHints {
  /** Planner's known route distance; used by the heuristic when waypoints are insufficient. */
  distanceMetersHint?: number;
  /** Planner's known traffic-free drive time; used by the heuristic as its static baseline. */
  staticDurationSecHint?: number;
}

export interface ITrafficEstimatorPort {
  /**
   * @param waypoints ordered [origin, ...intermediate stops, destination]
   * @param departureTime when the vehicle leaves the origin
   */
  estimateRouteDuration(
    waypoints: TrafficWaypoint[],
    departureTime: Date,
    hints?: TrafficEstimateHints,
  ): Promise<TrafficRouteEstimate>;
}
