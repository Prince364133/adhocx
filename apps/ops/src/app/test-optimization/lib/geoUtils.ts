/**
 * Main facade for Route Optimization Testing Lab geospatial and routing utilities.
 */

export * from './fleetOptimizer.ts';
export * from './csvValidator.ts';
export * from './geocodingService.ts';
export * from './googleRoutesService.ts';
export * from './candidateGenerator.ts';
export * from './scoringEngine.ts';

// Backward compatibility aliases
import { clusterEmployeesWithSweep } from './fleetOptimizer.ts';
import { buildAuthoritativeGoogleMapsUrl } from './candidateGenerator.ts';
import { parseRawCsv } from './csvValidator.ts';

export const clusterEmployeesWithFleet = clusterEmployeesWithSweep;
export const buildGoogleMapsUrl = buildAuthoritativeGoogleMapsUrl;
export const parseCsvText = parseRawCsv;
