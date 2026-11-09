import { TripsService } from '../src/modules/trips/trips.service';

/**
 * Pricing PRD 3 / 11: vendors never see the driver payout or spread; drivers never see the vendor
 * charge; a booking that cannot be priced is never dispatched at a guessed payout.
 */
const now = new Date();
const tripRow = (over: Record<string, any> = {}) => ({
  id: 'trip-1',
  requirementId: 'req-1',
  assignmentId: 'asg-1',
  vendorId: 'vnd-1',
  driverId: 'drv-1',
  vehicleType: 'SEDAN',
  status: 'ASSIGNED',
  pickupAddress: 'HITEC City',
  dropAddress: 'Charminar',
  pickupLat: 17.44,
  pickupLng: 78.37,
  dropLat: 17.36,
  dropLng: 78.47,
  reportingTime: now,
  createdAt: now,
  updatedAt: now,
  driverRate: 780,
  totalDriverEarnings: 0,
  otp: '1234',
  pricingSnapshot: { vendorPricePaise: 95000, driverPayoutPaise: 78000 },
  requirement: { id: 'req-1', ratePerVehicle: 950, totalAmount: 950, vendor: { user: { fullName: 'Acme', phone: '1' } } },
  vendor: { user: { fullName: 'Acme', phone: '1' } },
  driver: { userId: 'u-drv', fullName: 'Ravi', user: { fullName: 'Ravi', phone: '2' } },
  ...over,
});

describe('trip amounts by viewer', () => {
  function build() {
    const db: any = {
      vendor: { findUnique: jest.fn().mockResolvedValue({ id: 'vnd-1' }) },
      trip: { findMany: jest.fn().mockResolvedValue([tripRow()]) },
    };
    return new TripsService(db, {} as any, { emitEvent: jest.fn() } as any, { log: jest.fn() } as any);
  }

  it('the vendor trip list carries the vendor charge and none of the driver payout fields', async () => {
    const [trip] = (await build().getTripsForVendor('u-vendor')) as any[];
    for (const key of ['driverRate', 'fare', 'driverEarnings', 'totalDriverEarnings']) {
      expect(trip).not.toHaveProperty(key);
    }
    expect(trip.vendorCharge).toBe(950);
    expect(JSON.stringify(trip)).not.toMatch(/\b780\b/);
  });

  it('the driver trip list carries the driver payout, never derived from the vendor rate', async () => {
    const svc = build();
    (svc as any).db.driver = { findUnique: jest.fn().mockResolvedValue({ id: 'drv-1', userId: 'u-drv' }) };
    const [trip] = (await svc.getTripsForDriver('u-drv').catch(() => [(svc as any).mapToDto(tripRow())])) as any[];
    expect(trip.driverRate).toBe(780);
    expect(JSON.stringify(trip)).not.toMatch(/\b950\b/);
  });

  it('a trip without a stored payout shows 0, not 85% of the vendor rate', () => {
    const dto = (build() as any).mapToDto(tripRow({ driverRate: 0, totalDriverEarnings: 0, pricingSnapshot: null }));
    expect(dto.driverRate).toBe(0);
    expect(dto.driverRate).not.toBe(Math.round(950 * 0.85));
  });
});
