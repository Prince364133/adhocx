import { ValueObject } from '../common/value-object';
import { Result } from '../common/result';

interface GeoPointProps {
  latitude: number;
  longitude: number;
}

/**
 * GeoPoint Value Object.
 * Represents a geographic coordinate in WGS-84 coordinate system.
 */
export class GeoPoint extends ValueObject<GeoPointProps> {
  get latitude(): number {
    return this.props.latitude;
  }

  get longitude(): number {
    return this.props.longitude;
  }

  private constructor(props: GeoPointProps) {
    super(props);
  }

  public static create(latitude: number, longitude: number): Result<GeoPoint> {
    if (typeof latitude !== 'number' || isNaN(latitude)) {
      return Result.fail<GeoPoint>('Invalid latitude: must be a valid number');
    }
    if (typeof longitude !== 'number' || isNaN(longitude)) {
      return Result.fail<GeoPoint>('Invalid longitude: must be a valid number');
    }
    if (latitude < -90 || latitude > 90) {
      return Result.fail<GeoPoint>(`Latitude ${latitude} is out of bounds [-90, 90]`);
    }
    if (longitude < -180 || longitude > 180) {
      return Result.fail<GeoPoint>(`Longitude ${longitude} is out of bounds [-180, 180]`);
    }

    return Result.ok<GeoPoint>(new GeoPoint({ latitude, longitude }));
  }

  /**
   * Calculates Haversine distance in meters to another GeoPoint.
   */
  public distanceToMeters(other: GeoPoint): number {
    const R = 6371000; // Earth radius in meters
    const lat1Rad = (this.latitude * Math.PI) / 180;
    const lat2Rad = (other.latitude * Math.PI) / 180;
    const deltaLatRad = ((other.latitude - this.latitude) * Math.PI) / 180;
    const deltaLonRad = ((other.longitude - this.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * PostGIS Well-Known Text (WKT) format: POINT(lon lat)
   */
  public toWkt(): string {
    return `POINT(${this.longitude} ${this.latitude})`;
  }
}

