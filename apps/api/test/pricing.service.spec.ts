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
      systemPolicyConfig: {
        findUnique: jest.fn(async () => ({
          id: 'p',
          driverMonthlyFee: 499,
          driverTrialDays: 15,
          minWithdrawalAmount: 1000,
          escortFee: 300,
          updatedAt: new Date(),
        })),
        create: jest.fn(),
        upsert: jest.fn(async ({ create, update }: any) => ({
          id: 'p',
          ...create,
          ...update,
          updatedAt: new Date(),
        })),
      },
      trip: { count: jest.fn(async () => 0) },
    };
    return { svc: new PricingService(db), db };
  }

  it('does not seed vehicle categories on first boot', async () => {
    const { svc, db } = build();
    await svc.seedPolicyIfMissing();
    expect(db.vehiclePricingTier.create).not.toHaveBeenCalled();
    const list = await svc.getAllPricingTiers();
    expect(list).toEqual([]);
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

  it('reads platform policy defaults', async () => {
    const { svc } = build();
    const initial = await svc.getPolicyConfig();
    expect(initial.escortFee).toBe(300);
    expect(initial.minWithdrawalAmount).toBe(1000);
    expect(initial).not.toHaveProperty('commissionPercent');
  });
});
