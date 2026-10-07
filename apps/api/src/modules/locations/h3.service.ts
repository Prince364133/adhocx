import { Injectable } from '@nestjs/common';
import * as h3 from 'h3-js';

export interface H3Coordinates {
  latitude: number;
  longitude: number;
}

export interface H3CellInfo {
  cellIndex: string;
  resolution: number;
  centroid: H3Coordinates;
  boundary: H3Coordinates[];
}

/**
 * Uber H3 Discrete Global Grid System (DGGS) Service for AdhocX.
 *
 * Implements hexagonal spatial partitioning at Resolution 8:
 * - Average hexagon edge length: ~461 meters
 * - Average hexagon area: ~0.737 km² (73.7 hectares)
 * - Ideal for urban cab dispatch, localized supply-demand balancing,
 *   and non-overlapping wave expansion.
 */
@Injectable()
export class H3Service {
  public static readonly DEFAULT_RESOLUTION = 8;
  public static readonly HUB_RESOLUTION = 7; // ~1.22 km edge, ~5.16 km² area for office corridors

  /**
   * Convert latitude/longitude coordinates to an H3 hex cell index string.
   */
  latLngToCell(latitude: number, longitude: number, resolution = H3Service.DEFAULT_RESOLUTION): string {
    return h3.latLngToCell(latitude, longitude, resolution);
  }

  /**
   * Get the centroid (center latitude and longitude) of an H3 hex cell index.
   */
  cellToLatLng(cellIndex: string): H3Coordinates {
    const [latitude, longitude] = h3.cellToLatLng(cellIndex);
    return { latitude, longitude };
  }

  /**
   * Get the 6 vertex coordinates forming the polygon boundary of a hexagon.
   * Useful for map GeoJSON rendering and driver coverage visualizations.
   */
  cellToBoundary(cellIndex: string): H3Coordinates[] {
    const rawCoords = h3.cellToBoundary(cellIndex);
    return rawCoords.map(([latitude, longitude]) => ({ latitude, longitude }));
  }

  /**
   * Get comprehensive metadata for an H3 cell.
   */
  getCellInfo(cellIndex: string): H3CellInfo {
    return {
      cellIndex,
      resolution: h3.getResolution(cellIndex),
      centroid: this.cellToLatLng(cellIndex),
      boundary: this.cellToBoundary(cellIndex),
    };
  }

  /**
   * Find all hexagonal cells within k steps from the origin cell (solid disk).
   * k=0 -> 1 cell (origin only)
   * k=1 -> 7 cells (origin + 6 immediate neighbors)
   * k=2 -> 19 cells
   * k=3 -> 37 cells
   */
  gridDisk(originCell: string, kRing: number): string[] {
    if (kRing <= 0) return [originCell];
    return h3.gridDisk(originCell, kRing);
  }

  /**
   * Find only the hollow ring of cells at distance k from origin cell (no interior).
   * This is key for zero-overlap incremental wave dispatch:
   * Wave 1 -> Ring 0 & 1
   * Wave 2 -> Ring 2 only (12 new cells, 0 duplicate alerts)
   * Wave 3 -> Ring 3 only (18 new cells, 0 duplicate alerts)
   */
  gridRing(originCell: string, kRing: number): string[] {
    if (kRing === 0) return [originCell];
    return h3.gridRingUnsafe(originCell, kRing);
  }

  /**
   * Calculate discrete grid distance (hop count) between two H3 cells.
   */
  gridDistance(cellA: string, cellB: string): number {
    try {
      return h3.gridDistance(cellA, cellB);
    } catch (_) {
      // If cells are across different base cells or disconnected
      return -1;
    }
  }

  /**
   * Check if two cells share a boundary edge (are immediate neighbors).
   */
  areNeighbors(cellA: string, cellB: string): boolean {
    return h3.areNeighborCells(cellA, cellB);
  }

  /**
   * Validate if a given string is a valid H3 hexadecimal index.
   */
  isValidCell(cellIndex: string): boolean {
    return h3.isValidCell(cellIndex);
  }

  /**
   * Generate canonical H3 index for a corporate office hub.
   */
  getHubCell(latitude: number, longitude: number, resolution = H3Service.DEFAULT_RESOLUTION): string {
    return this.latLngToCell(latitude, longitude, resolution);
  }
}
