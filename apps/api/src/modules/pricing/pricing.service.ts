import { Injectable, Logger } from '@nestjs/common';
import { VehicleType } from '@adhocx/contracts';

export interface VehiclePricingTier {
  baseFare: number;
  perKmRate: number;
  minimumKm: number;
}

/**
 * PricingService handles rate calculation logic for both:
 * 1. Fixed corporate dispatch rates (per vehicle type)
 * 2. Dynamic base fare floors for reverse-auction outstation bidding (Distance * Rate)
 */
@Injectable()
export class PricingService {
  protected readonly logger = new Logger(PricingService.name);

  private readonly pricingTiers: Record<VehicleType, VehiclePricingTier> = {
    [VehicleType.HATCHBACK]: { baseFare: 500, perKmRate: 11, minimumKm: 10 },
    [VehicleType.SEDAN]: { baseFare: 700, perKmRate: 13, minimumKm: 15 },
    [VehicleType.SUV]: { baseFare: 1000, perKmRate: 18, minimumKm: 20 },
    [VehicleType.TEMPO_TRAVELLER]: { baseFare: 2500, perKmRate: 26, minimumKm: 50 },
    [VehicleType.BUS]: { baseFare: 4500, perKmRate: 45, minimumKm: 100 },
    [VehicleType.TATA_ACE]: { baseFare: 600, perKmRate: 16, minimumKm: 10 },
    [VehicleType.PICKUP_TRUCK]: { baseFare: 900, perKmRate: 22, minimumKm: 15 },
  };

  /**
   * Calculate distance between two coordinate pairs using Haversine formula in kilometers.
   */
  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return Math.max(1, Number(dist.toFixed(2)));
  }

  /**
   * Calculate recommended minimum base fare floor for a route and vehicle class.
   */
  calculateMinimumFare(vehicleType: VehicleType, distanceKm: number): number {
    const tier = this.pricingTiers[vehicleType] || this.pricingTiers[VehicleType.SEDAN];
    const billableKm = Math.max(distanceKm, tier.minimumKm);
    const computedFare = tier.baseFare + billableKm * tier.perKmRate;
    return Math.round(computedFare);
  }

  /**
   * Calculate the driver rate for a trip.
   */
  calculateDriverRate(vehicleType: VehicleType, distanceKm?: number): number {
    if (distanceKm && distanceKm > 0) {
      return this.calculateMinimumFare(vehicleType, distanceKm);
    }

    const baseRates: Record<VehicleType, number> = {
      [VehicleType.HATCHBACK]: 1200,
      [VehicleType.SEDAN]: 1500,
      [VehicleType.SUV]: 2000,
      [VehicleType.TEMPO_TRAVELLER]: 3500,
      [VehicleType.BUS]: 5000,
      [VehicleType.TATA_ACE]: 1400,
      [VehicleType.PICKUP_TRUCK]: 1800,
    };

    return baseRates[vehicleType] || 1500;
  }
}
