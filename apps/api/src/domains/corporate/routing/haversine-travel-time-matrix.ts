import { ITravelTimeMatrixPort, MatrixPoint, TravelTimeMatrix } from './travel-time-matrix.port';

export interface HaversineMatrixOptions {
  /** Average door-to-door urban speed. Default 25 km/h (Indian metro peak-hour average). */
  speedKmh?: number;
  /** Road distance / straight-line distance. Default 1.3. */
  tortuosityFactor?: number;
}

export function haversineMeters(a: MatrixPoint, b: MatrixPoint): number {
  const R = 6371000;
  const phi1 = (a.latitude * Math.PI) / 180;
  const phi2 = (b.latitude * Math.PI) / 180;
  const dPhi = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLambda = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Offline fallback: straight-line distance x tortuosity at a fixed average speed.
 * It is a coarse estimate; it ignores traffic, one-ways, rivers and flyovers, so it is
 * only used when no road-network data is available.
 */
export class HaversineTravelTimeMatrix implements ITravelTimeMatrixPort {
  private readonly speedMps: number;
  private readonly tortuosity: number;

  constructor(options: HaversineMatrixOptions = {}) {
    this.speedMps = ((options.speedKmh ?? 25) * 1000) / 3600;
    this.tortuosity = options.tortuosityFactor ?? 1.3;
  }

  estimate(a: MatrixPoint, b: MatrixPoint): { durationSec: number; distanceMeters: number } {
    const meters = Math.round(haversineMeters(a, b) * this.tortuosity);
    return { distanceMeters: meters, durationSec: Math.round(meters / this.speedMps) };
  }

  async getMatrix(origins: MatrixPoint[], destinations: MatrixPoint[]): Promise<TravelTimeMatrix> {
    const durationSec: number[][] = [];
    const distanceMeters: number[][] = [];
    for (const o of origins) {
      const dRow: number[] = [];
      const mRow: number[] = [];
      for (const d of destinations) {
        const e = this.estimate(o, d);
        dRow.push(e.durationSec);
        mRow.push(e.distanceMeters);
      }
      durationSec.push(dRow);
      distanceMeters.push(mRow);
    }
    return { durationSec, distanceMeters, source: 'HAVERSINE' };
  }
}
