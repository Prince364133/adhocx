/**
 * Travel-time matrix port used by the corporate route planner.
 *
 * Implementations return an origins x destinations matrix of driving durations (seconds)
 * and road distances (meters) for a given departure time. Adapters:
 *  - GoogleTravelTimeMatrixAdapter: Google Routes API computeRouteMatrix (traffic-aware),
 *    chunked to Google element limits, cached in Redis by H3 cell pair + time bucket,
 *    with per-element haversine fallback.
 *  - HaversineTravelTimeMatrix: offline estimate (great-circle x tortuosity at a fixed speed).
 */
export interface MatrixPoint {
  latitude: number;
  longitude: number;
}

/**
 * Where the numbers came from:
 *  - GOOGLE: every element came from a live Google call
 *  - CACHE: every element came from the cache (originally Google data)
 *  - HAVERSINE: every element is a straight-line estimate
 *  - MIXED: any combination of the above
 */
export type TravelTimeSource = 'GOOGLE' | 'CACHE' | 'HAVERSINE' | 'MIXED';

export interface TravelTimeMatrix {
  /** durationSec[i][j] = driving seconds from origins[i] to destinations[j] */
  durationSec: number[][];
  /** distanceMeters[i][j] = road meters from origins[i] to destinations[j] */
  distanceMeters: number[][];
  source: TravelTimeSource;
}

export interface ITravelTimeMatrixPort {
  getMatrix(
    origins: MatrixPoint[],
    destinations: MatrixPoint[],
    departureTime: Date,
  ): Promise<TravelTimeMatrix>;
}

/** Nest DI token for the travel-time matrix port. */
export const TRAVEL_TIME_MATRIX_PORT = Symbol('TRAVEL_TIME_MATRIX_PORT');

/** Combine element sources into a matrix-level source label. */
export function combineSources(sources: Iterable<TravelTimeSource>): TravelTimeSource {
  const set = new Set<TravelTimeSource>();
  for (const s of sources) {
    if (s === 'MIXED') return 'MIXED';
    set.add(s);
  }
  if (set.size === 0) return 'HAVERSINE';
  if (set.size === 1) return set.values().next().value as TravelTimeSource;
  return 'MIXED';
}
