import { Requirement as PrismaRequirement } from '@prisma/client';
import {
  RequirementAggregate,
  RequirementLifecycleStatus,
  MarketplacePricingMode,
  MarketplaceVehicleCategory,
  GeoPoint,
  Money,
} from '@adhocx/domain-core';

export class PrismaRequirementMapper {
  public static toDomain(raw: PrismaRequirement): RequirementAggregate {
    const pickupLoc = GeoPoint.create(Number(raw.pickupLat), Number(raw.pickupLng)).getValue();
    const dropLoc = GeoPoint.create(Number(raw.dropLat), Number(raw.dropLng)).getValue();

    let lifecycleStatus: RequirementLifecycleStatus = 'DRAFT';
    switch (raw.status) {
      case 'DRAFT':
        lifecycleStatus = 'DRAFT';
        break;
      case 'POSTED':
      case 'DISPATCHING':
        lifecycleStatus = 'DIRECT_DISPATCH';
        break;
      case 'PARTIALLY_FULFILLED':
      case 'FULFILLED':
        lifecycleStatus = 'ASSIGNED';
        break;
      case 'IN_PROGRESS':
        lifecycleStatus = 'IN_PROGRESS';
        break;
      case 'COMPLETED':
        lifecycleStatus = 'COMPLETED';
        break;
      case 'CANCELLED':
        lifecycleStatus = 'CANCELLED';
        break;
      case 'NO_DRIVER_AVAILABLE':
        lifecycleStatus = 'NO_DRIVER_AVAILABLE';
        break;
    }

    const pricingMode: MarketplacePricingMode = 'DIRECT_DISPATCH';

    let category: MarketplaceVehicleCategory = 'SEDAN';
    const rawCategory = raw.vehicleType?.toUpperCase() || '';
    if (rawCategory.includes('SUV')) category = 'SUV';
    else if (rawCategory.includes('HATCHBACK')) category = 'HATCHBACK';
    else if (rawCategory.includes('AUTO')) category = 'AUTO';

    const baseBudgetPaise = raw.suggestedBudget ? Math.round(Number(raw.suggestedBudget) * 100) : 0;
    const finalFarePaise = raw.totalAmount ? Math.round(Number(raw.totalAmount) * 100) : 0;

    return RequirementAggregate.reconstitute(raw.id, {
      requesterId: raw.vendorId,
      pickupLocation: pickupLoc,
      dropLocation: dropLoc,
      pickupTime: raw.reportingTime,
      pricingMode,
      vehicleCategory: category,
      estimatedDistanceMeters: Math.round(pickupLoc.distanceToMeters(dropLoc)),
      status: lifecycleStatus,
      baseBudget: baseBudgetPaise > 0 ? Money.create(baseBudgetPaise).getValue() : undefined,
      finalFare: finalFarePaise > 0 ? Money.create(finalFarePaise).getValue() : undefined,
      cancellationReason: raw.notes ?? undefined,
      createdAt: raw.createdAt,
    });
  }

  public static toPersistence(aggregate: RequirementAggregate): any {
    return {
      id: aggregate.id,
      vendorId: aggregate.requesterId,
      fulfillmentMode: 'DIRECT_DISPATCH',
      vehicleType: aggregate.vehicleCategory,
      pickupLat: aggregate.pickupLocation.latitude,
      pickupLng: aggregate.pickupLocation.longitude,
      dropLat: aggregate.dropLocation.latitude,
      dropLng: aggregate.dropLocation.longitude,
      reportingTime: aggregate.pickupTime,
      status:
        aggregate.status === 'COMPLETED'
          ? 'COMPLETED'
          : aggregate.status === 'CANCELLED'
            ? 'CANCELLED'
            : aggregate.status === 'ASSIGNED'
              ? 'FULFILLED'
              : 'POSTED',
      totalAmount: aggregate.finalFare ? aggregate.finalFare.amountInRupees : 0,
    };
  }
}
