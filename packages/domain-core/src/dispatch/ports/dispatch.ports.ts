import { DriverOfferAggregate, DriverOfferStatus } from '../aggregates/driver-offer.aggregate';

/**
 * IDriverOfferRepository Port.
 * Pure interface for DriverOffer persistence.
 */
export interface IDriverOfferRepository {
  findById(offerId: string): Promise<DriverOfferAggregate | null>;
  findActiveOfferByDriverId(driverId: string): Promise<DriverOfferAggregate | null>;
  findByRouteId(routeId: string, status?: DriverOfferStatus[]): Promise<DriverOfferAggregate[]>;
  save(offer: DriverOfferAggregate): Promise<void>;
}

/**
 * ISpatialDriverIndexPort.
 * Pure interface for geospatial driver queries (e.g. Uber H3 / Redis Geo).
 */
export interface ISpatialDriverIndexPort {
  /**
   * Returns list of driver IDs currently located inside the given H3 cells who are online & available.
   */
  findAvailableDriversInH3Cells(h3Cells: string[]): Promise<string[]>;
}

