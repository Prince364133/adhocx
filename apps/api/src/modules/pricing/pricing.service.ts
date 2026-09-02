import { Injectable, Logger } from '@nestjs/common';
import { VehicleType } from '@adhocx/contracts';

/**
 * PricingService handles rate calculation logic.
 * Actual pricing rules and dynamic pricing are Milestone 2+ scope;
 * this module provides the service boundary per docs/08_FOLDER_STRUCTURE.md.
 */
@Injectable()
export class PricingService {
  protected readonly logger = new Logger(PricingService.name);

  /**
   * Calculate the driver rate for a trip.
   * Milestone 2: Implement actual pricing engine with base rates,
   * distance-based pricing, surge pricing, etc.
   */
  calculateDriverRate(vehicleType: VehicleType, _distanceKm?: number): number {
    // Base rates per vehicle type — placeholder values.
    // Actual rates to be configured via admin panel / database in Milestone 2.
    const baseRates: Record<VehicleType, number> = {
      [VehicleType.HATCHBACK]: 1200,
      [VehicleType.SEDAN]: 1500,
      [VehicleType.SUV]: 2000,
      [VehicleType.TEMPO_TRAVELLER]: 3500,
      [VehicleType.BUS]: 5000,
    };

    return baseRates[vehicleType] || 1500;
  }
}
