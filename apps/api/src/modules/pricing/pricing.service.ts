import { Injectable, Logger } from '@nestjs/common';
import { VehicleType } from '@adhocx/contracts';

export interface VehiclePricingTier {
  id: string;
  vehicleType: VehicleType;
  categoryLabel: string;
  seatingCapacity: string;
  description: string;
  baseFare: number;
  baseKm: number;
  perKmRate: number;
  driverSharePercent: number;
  platformFeePercent: number;
  surgeMultiplier: number;
  status: 'ACTIVE' | 'INACTIVE';
  updatedAt: string;
}

@Injectable()
export class PricingService {
  protected readonly logger = new Logger(PricingService.name);

  private pricingTiers: Record<VehicleType, VehiclePricingTier> = {
    [VehicleType.SEDAN]: {
      id: 'rc-sedan',
      vehicleType: VehicleType.SEDAN,
      categoryLabel: 'Prime Sedan',
      seatingCapacity: '4 + 1 Passengers',
      description: 'Compact & executive 4-seater sedans (Dzire, Aura, Etios, Tigor)',
      baseFare: 800,
      baseKm: 40,
      perKmRate: 14.5,
      driverSharePercent: 90,
      platformFeePercent: 10,
      surgeMultiplier: 1.0,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    },
    [VehicleType.SUV]: {
      id: 'rc-suv',
      vehicleType: VehicleType.SUV,
      categoryLabel: 'Fleet SUV & MUV',
      seatingCapacity: '6 + 1 Passengers',
      description: '6-7 seater commercial SUVs (Innova Crysta, Ertiga, Carens, Marazzo)',
      baseFare: 1400,
      baseKm: 40,
      perKmRate: 19.0,
      driverSharePercent: 90,
      platformFeePercent: 10,
      surgeMultiplier: 1.0,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    },
    [VehicleType.TEMPO_TRAVELLER]: {
      id: 'rc-tempo',
      vehicleType: VehicleType.TEMPO_TRAVELLER,
      categoryLabel: 'Tempo Mini Coach',
      seatingCapacity: '12 - 16 Passengers',
      description: '12-16 seater minibuses for corporate team transport & pilgrimages',
      baseFare: 3200,
      baseKm: 80,
      perKmRate: 28.0,
      driverSharePercent: 88,
      platformFeePercent: 12,
      surgeMultiplier: 1.0,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    },
    [VehicleType.BUS]: {
      id: 'rc-bus',
      vehicleType: VehicleType.BUS,
      categoryLabel: 'Commercial Coach Bus',
      seatingCapacity: '24 - 40 Passengers',
      description: '24-40 seater commercial coaches with pushback seating & luggage hold',
      baseFare: 6500,
      baseKm: 100,
      perKmRate: 45.0,
      driverSharePercent: 88,
      platformFeePercent: 12,
      surgeMultiplier: 1.0,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    },
    [VehicleType.HATCHBACK]: {
      id: 'rc-hatchback',
      vehicleType: VehicleType.HATCHBACK,
      categoryLabel: 'Compact Hatchback',
      seatingCapacity: '4 + 1 Passengers',
      description: 'Budget city runabout cabs (WagonR, Tiago, Celerio)',
      baseFare: 500,
      baseKm: 20,
      perKmRate: 11.0,
      driverSharePercent: 90,
      platformFeePercent: 10,
      surgeMultiplier: 1.0,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    },
    [VehicleType.TATA_ACE]: {
      id: 'rc-tata-ace',
      vehicleType: VehicleType.TATA_ACE,
      categoryLabel: 'Mini Logistics Truck',
      seatingCapacity: 'Driver + 1 Helper',
      description: 'Sub-1 ton intra-city cargo transport (Tata Ace, Mahindra Bolero Maxi)',
      baseFare: 600,
      baseKm: 15,
      perKmRate: 16.0,
      driverSharePercent: 90,
      platformFeePercent: 10,
      surgeMultiplier: 1.0,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    },
    [VehicleType.PICKUP_TRUCK]: {
      id: 'rc-pickup',
      vehicleType: VehicleType.PICKUP_TRUCK,
      categoryLabel: 'Heavy Commercial Pickup',
      seatingCapacity: 'Driver + 1 Helper',
      description: '1.5-2 ton commercial flatbed & container transport',
      baseFare: 900,
      baseKm: 20,
      perKmRate: 22.0,
      driverSharePercent: 88,
      platformFeePercent: 12,
      surgeMultiplier: 1.0,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
    },
  };

  getAllPricingTiers(): VehiclePricingTier[] {
    return Object.values(this.pricingTiers);
  }

  getPricingTier(vehicleType: VehicleType): VehiclePricingTier {
    return this.pricingTiers[vehicleType] || this.pricingTiers[VehicleType.SEDAN];
  }

  updatePricingTier(vehicleType: VehicleType, dto: Partial<VehiclePricingTier>): VehiclePricingTier {
    const existing = this.pricingTiers[vehicleType] || this.pricingTiers[VehicleType.SEDAN];
    const updated: VehiclePricingTier = {
      ...existing,
      ...dto,
      driverSharePercent:
        dto.platformFeePercent !== undefined ? 100 - dto.platformFeePercent : (dto.driverSharePercent ?? existing.driverSharePercent),
      updatedAt: new Date().toISOString(),
    };

    this.pricingTiers[vehicleType] = updated;
    this.logger.log(`Pricing tier updated for ${vehicleType}: baseFare=₹${updated.baseFare}, perKm=₹${updated.perKmRate}`);
    return updated;
  }

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
    const billableKm = Math.max(distanceKm, tier.baseKm);
    const computedFare = (tier.baseFare + (billableKm - tier.baseKm) * tier.perKmRate) * (tier.surgeMultiplier || 1.0);
    return Math.round(computedFare);
  }

  /**
   * Calculate the driver rate for a trip.
   */
  calculateDriverRate(vehicleType: VehicleType, distanceKm?: number): number {
    if (distanceKm && distanceKm > 0) {
      return this.calculateMinimumFare(vehicleType, distanceKm);
    }

    const tier = this.pricingTiers[vehicleType] || this.pricingTiers[VehicleType.SEDAN];
    return tier.baseFare;
  }
}

