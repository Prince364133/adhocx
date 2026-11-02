import { ValueObject } from '../common/value-object';
import { Result } from '../common/result';
import { GeoPoint } from './geo-point.vo';
import * as h3 from 'h3-js';

interface H3IndexProps {
  index: string;
  resolution: number;
}

/**
 * H3Index Value Object.
 * Encapsulates Uber H3 Discrete Global Grid hexagonal spatial indexing.
 * Default resolution: 8 (~460m hex edge, standard for urban route pickups).
 */
export class H3Index extends ValueObject<H3IndexProps> {
  get index(): string {
    return this.props.index;
  }

  get resolution(): number {
    return this.props.resolution;
  }

  private constructor(props: H3IndexProps) {
    super(props);
  }

  public static fromIndex(index: string): Result<H3Index> {
    if (!index || typeof index !== 'string') {
      return Result.fail<H3Index>('H3 index must be a non-empty string');
    }
    if (!h3.isValidCell(index)) {
      return Result.fail<H3Index>(`Invalid H3 cell index: ${index}`);
    }
    const resolution = h3.getResolution(index);
    return Result.ok<H3Index>(new H3Index({ index, resolution }));
  }

  public static fromGeoPoint(geoPoint: GeoPoint, resolution: number = 8): Result<H3Index> {
    if (resolution < 0 || resolution > 15) {
      return Result.fail<H3Index>(`Invalid H3 resolution ${resolution}. Must be between 0 and 15`);
    }
    const index = h3.latLngToCell(geoPoint.latitude, geoPoint.longitude, resolution);
    return Result.ok<H3Index>(new H3Index({ index, resolution }));
  }

  /**
   * Calculates the k-ring of neighboring cells.
   * For resolution 8:
   *   k = 6 represents ~5 km radius (127 cells)
   *   k = 12 represents ~10 km radius (469 cells)
   */
  public getNeighboringCells(kRingRadius: number): string[] {
    return h3.gridDisk(this.index, kRingRadius);
  }

  /**
   * Get 5 km primary search ring for autonomous dispatch.
   */
  public get5KmDispatchRing(): string[] {
    return this.getNeighboringCells(6);
  }

  /**
   * Get 10 km expanded search ring for fallback dispatch.
   */
  public get10KmDispatchRing(): string[] {
    return this.getNeighboringCells(12);
  }
}

