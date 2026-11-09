import { PricingService } from '../src/modules/pricing/pricing.service';

/**
 * PricingService is now only the vehicle category catalogue and platform policy settings.
 * Trip prices come exclusively from the distance pricing engine.
 */
describe('PricingService (vehicle catalogue, no prices)', () => {
  function build(rows: any[] = []) {
    const store = new Map(rows.map((r) => [r.vehicleType, r]));
    const db: any = {
      vehiclePricingTier: {
        count: jest.fn(async () => store.size),
        findMany: jest.fn(async () => [...store.values()]),
        findUnique: jest.fn(async ({ where }: any) => store.get(where.vehicleType) ?? null),
        create: jest.fn(async ({ data }: any) => {
          const row = { id: `id-${data.vehicleType}`, updatedAt: new Date(), ...data };
          store.set(data.vehicleType, row);
          return row;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const row = { ...store.get(where.vehicleType), ...data, updatedAt: new Date() };
          store.set(where.vehicleType, row);
          return row;
        }),
      },
      systemPolicyConfig: { findUnique: jest.fn(async () => ({ id: 'p' })), create: jest.fn() },
      trip: { count: jest.fn(async () => 0) },
    };
    return { svc: new PricingService(db), db };
  }

  it('first boot seeds category names only; responses carry no price fields', async () => {
    const { svc, db } = build();
    await svc.seedCatalogueIfEmpty();
    const seeded = db.vehiclePricingTier.create.mock.calls.map((c: any[]) => c[0].data);
    expect(seeded.length).toBeGreaterThan(0);
    for (const row of seeded) {
      expect(row).toMatchObject({ baseFare: 0, baseKm: 0, perKmRate: 0 });
    }
    const list = await svc.getAllPricingTiers();
    for (const cat of list) {
      expect(cat).not.toHaveProperty('baseFare');
      expect(cat).not.toHaveProperty('perKmRate');
      expect(cat).not.toHaveProperty('driverSharePercent');
      expect(cat.maxSeats).toBeGreaterThan(0);
    }
  });

  it('admins add and edit categories; prices cannot be set through the catalogue', async () => {
    const { svc, db } = build();
    await svc.createPricingTier({ vehicleType: 'ev sedan', categoryLabel: 'EV Sedan', seatingCapacity: '4 + 1 Passengers' });
    expect(db.vehiclePricingTier.create.mock.calls[0][0].data).toMatchObject({ vehicleType: 'EV_SEDAN', perKmRate: 0 });
    await svc.updatePricingTier('EV_SEDAN', { categoryLabel: 'Electric Sedan', perKmRate: 99 } as any);
    expect(db.vehiclePricingTier.update.mock.calls[0][0].data).not.toHaveProperty('perKmRate');
  });

  it('deleting deactivates (history is kept) and is refused while trips are running', async () => {
    const { svc, db } = build([{ id: 'x', vehicleType: 'SEDAN', categoryLabel: 'Sedan', seatingCapacity: '4', isActive: true, updatedAt: new Date() }]);
    await svc.deletePricingTier('SEDAN');
    expect(db.vehiclePricingTier.update).toHaveBeenCalledWith({ where: { vehicleType: 'SEDAN' }, data: { isActive: false } });
    db.trip.count.mockResolvedValueOnce(2);
    await expect(svc.deletePricingTier('SEDAN')).rejects.toThrow(/active trip/);
  });

  it('deactivating through edit is refused while trips are running', async () => {
    const { svc, db } = build([{ id: 'x', vehicleType: 'SUV', categoryLabel: 'SUV', seatingCapacity: '6', isActive: true, updatedAt: new Date() }]);
    db.trip.count.mockResolvedValueOnce(1);
    await expect(svc.updatePricingTier('SUV', { isActive: false })).rejects.toThrow(/active trip/);
    expect(db.vehiclePricingTier.update).not.toHaveBeenCalled();
    await svc.updatePricingTier('SUV', { categoryLabel: 'Large SUV' });
    expect(db.trip.count).toHaveBeenCalledTimes(1);
  });
});
