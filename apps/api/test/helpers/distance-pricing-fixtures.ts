import { DistancePricingService } from '../../src/modules/pricing/distance-pricing.service';

/**
 * Test data for the distance pricing engine (PRD v1.0 illustrative table). Production rates are
 * never in code: they live in pricing_plans / pricing_slabs and are edited in the admin panel.
 */
export const PRD_SAMPLE_SLABS = [
  { minDistanceMExclusive: 0, maxDistanceMInclusive: 10000, vendorPricePaise: 50000, driverPayoutPaise: 40000 },
  { minDistanceMExclusive: 10000, maxDistanceMInclusive: 15000, vendorPricePaise: 65000, driverPayoutPaise: 52000 },
  { minDistanceMExclusive: 15000, maxDistanceMInclusive: 20000, vendorPricePaise: 80000, driverPayoutPaise: 65000 },
  { minDistanceMExclusive: 20000, maxDistanceMInclusive: 25000, vendorPricePaise: 95000, driverPayoutPaise: 78000 },
  { minDistanceMExclusive: 25000, maxDistanceMInclusive: 30000, vendorPricePaise: 110000, driverPayoutPaise: 90000 },
  { minDistanceMExclusive: 30000, maxDistanceMInclusive: 35000, vendorPricePaise: 125000, driverPayoutPaise: 102000 },
  { minDistanceMExclusive: 35000, maxDistanceMInclusive: 40000, vendorPricePaise: 140000, driverPayoutPaise: 115000 },
];

export const samplePlan = (category = 'ALL', slabs = PRD_SAMPLE_SLABS) => ({
  id: `plan-${category.toLowerCase()}`,
  vehicleCategory: category,
  version: '1',
  slabs: slabs.map((s, i) => ({ ...s, id: `slab-${i + 1}`, active: true })),
});

const engine = new DistancePricingService({} as any, {} as any);

/** Vendor charge and driver payout (rupees) for a route distance in meters, from the sample plan. */
export function priceFor(distanceMeters: number, plan = samplePlan()) {
  const slab = engine.resolveSlab(plan, distanceMeters);
  return { vendorRupees: slab.vendorPricePaise / 100, driverRupees: slab.driverPayoutPaise / 100, slabId: slab.id };
}
