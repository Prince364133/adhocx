import { OfferStatus, RequirementStatus } from '@adhocx/contracts';
import { DriverBehaviorService, OfferOutcomeInput } from '../src/modules/dispatch/driver-behavior.service';

/**
 * Minimal in-memory stand-in for the Prisma calls DriverBehaviorService makes, with real
 * increment / conditional-update semantics so the atomicity guarantees are exercised.
 */
function makeDb() {
  const drivers = new Map<string, any>();
  const offers = new Map<string, any>();

  const matches = (row: any, where: any): boolean =>
    Object.entries(where).every(([k, cond]: [string, any]) => {
      const v = row[k];
      if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
        if ('gte' in cond && !(v >= cond.gte)) return false;
        if ('gt' in cond && !(v > cond.gt)) return false;
        if ('lt' in cond && !(v < cond.lt)) return false;
        return true;
      }
      return v === cond;
    });

  const apply = (row: any, data: any) => {
    for (const [k, val] of Object.entries<any>(data)) {
      if (val && typeof val === 'object' && 'increment' in val) row[k] += val.increment;
      else if (val && typeof val === 'object' && 'decrement' in val) row[k] -= val.decrement;
      else row[k] = val;
    }
  };

  const db: any = {
    driver: {
      update: jest.fn(async ({ where, data }: any) => {
        const row = drivers.get(where.id);
        apply(row, data);
        return { ...row };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of drivers.values()) {
          if (matches(row, where)) {
            apply(row, data);
            count++;
          }
        }
        return { count };
      }),
    },
    offer: {
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const row of offers.values()) {
          if (matches(row, where)) {
            apply(row, data);
            count++;
          }
        }
        return { count };
      }),
      findMany: jest.fn(async ({ where, take }: any) =>
        Array.from(offers.values())
          .filter((o) => matches(o, where))
          .sort((a, b) => b.respondedAt - a.respondedAt)
          .slice(0, take),
      ),
    },
  };
  return { db, drivers, offers };
}

describe('DriverBehaviorService (acceptance rate & anti-cherry-picking)', () => {
  let db: any;
  let drivers: Map<string, any>;
  let offers: Map<string, any>;
  let notifications: any;
  let service: DriverBehaviorService;
  let seq = 0;

  const openReq = { status: RequirementStatus.DISPATCHING, quantity: 1, assignedQuantity: 0 };

  const newOffer = (status: OfferStatus, distanceKm: number | null = 1.5) => {
    const id = `off-${++seq}`;
    offers.set(id, { id, driverId: 'drv-1', status, countsForAr: false, respondedAt: new Date(Date.now() + seq) });
    return { offerId: id, driverId: 'drv-1', distanceKm, seenAt: new Date(), requirement: openReq };
  };

  const record = (status: OfferStatus, outcome: OfferOutcomeInput['outcome'], extra: Partial<OfferOutcomeInput> = {}) =>
    service.recordOutcome({ ...newOffer(status), outcome, ...extra });

  beforeEach(() => {
    ({ db, drivers, offers } = makeDb());
    drivers.set('drv-1', {
      id: 'drv-1',
      trustScore: 90,
      acceptedOffers: 0,
      declinedOffers: 0,
      consecutiveDeclines: 0,
      cooldownUntil: null,
      cooldownLevel: 0,
      lastCooldownAt: null,
      acceptanceRate: 100,
    });
    notifications = { emitEvent: jest.fn() };
    service = new DriverBehaviorService(db, notifications, { log: jest.fn().mockResolvedValue(undefined) } as any);
    delete process.env.AR_PENALTY_MODE;
    delete process.env.AR_EXPIRY_REQUIRES_SEEN;
  });

  it('rewards an accept: +0.25 trust, streak reset, AR stays 100', async () => {
    drivers.get('drv-1').consecutiveDeclines = 2;
    await record(OfferStatus.ACCEPTED, 'ACCEPTED');
    const d = drivers.get('drv-1');
    expect(d.trustScore).toBeCloseTo(90.25);
    expect(d.consecutiveDeclines).toBe(0);
    expect(d.acceptedOffers).toBe(1);
    expect(d.acceptanceRate).toBe(100);
  });

  it('penalizes a nearby decline (-1.5) and lowers AR', async () => {
    await record(OfferStatus.ACCEPTED, 'ACCEPTED');
    await record(OfferStatus.DECLINED, 'DECLINED');
    const d = drivers.get('drv-1');
    expect(d.trustScore).toBeCloseTo(90.25 - 1.5);
    expect(d.consecutiveDeclines).toBe(1);
    expect(d.acceptanceRate).toBe(50);
  });

  it('far decline (> nearbyKm) counts toward AR but costs no trust and no streak', async () => {
    await service.recordOutcome({ ...newOffer(OfferStatus.DECLINED, 12), outcome: 'DECLINED' });
    const d = drivers.get('drv-1');
    expect(d.trustScore).toBe(90);
    expect(d.consecutiveDeclines).toBe(0);
    expect(d.acceptanceRate).toBe(0);
  });

  it('3 consecutive nearby skips trigger a 3-minute cooldown and reset the streak', async () => {
    await record(OfferStatus.DECLINED, 'DECLINED');
    await record(OfferStatus.EXPIRED, 'EXPIRED');
    const decision = await record(OfferStatus.DECLINED, 'DECLINED');

    const d = drivers.get('drv-1');
    expect(decision.cooldownApplied).toBe(true);
    expect(d.consecutiveDeclines).toBe(0);
    const minutes = (d.cooldownUntil.getTime() - Date.now()) / 60000;
    expect(minutes).toBeGreaterThan(2.9);
    expect(minutes).toBeLessThanOrEqual(3);
    expect(notifications.emitEvent).toHaveBeenCalledWith('driver:drv-1', 'DRIVER_COOLDOWN', expect.objectContaining({ cooldownMinutes: 3 }));
  });

  it('a repeat offender within 24h escalates the cooldown ladder (3 -> 10 -> 30)', async () => {
    for (let i = 0; i < 3; i++) await record(OfferStatus.DECLINED, 'DECLINED');
    expect(drivers.get('drv-1').cooldownLevel).toBe(0);
    for (let i = 0; i < 3; i++) await record(OfferStatus.DECLINED, 'DECLINED');
    expect(drivers.get('drv-1').cooldownLevel).toBe(1);
    for (let i = 0; i < 3; i++) await record(OfferStatus.DECLINED, 'DECLINED');
    const d = drivers.get('drv-1');
    expect(d.cooldownLevel).toBe(2);
    expect((d.cooldownUntil.getTime() - Date.now()) / 60000).toBeGreaterThan(29);
  });

  it('ignores outcomes when the requirement was already closed or full', async () => {
    const closed = await record(OfferStatus.EXPIRED, 'EXPIRED', {
      requirement: { status: RequirementStatus.FULFILLED, quantity: 1, assignedQuantity: 1 },
    });
    const cancelled = await record(OfferStatus.DECLINED, 'DECLINED', {
      requirement: { status: RequirementStatus.CANCELLED, quantity: 1, assignedQuantity: 0 },
    });
    expect(closed.counted).toBe(false);
    expect(cancelled.counted).toBe(false);
    expect(drivers.get('drv-1').trustScore).toBe(90);
    expect(drivers.get('drv-1').declinedOffers).toBe(0);
  });

  it('does not hold an unseen expiry against the driver (push never delivered)', async () => {
    const decision = await record(OfferStatus.EXPIRED, 'EXPIRED', { seenAt: null });
    expect(decision.reason).toBe('offer_not_seen');
    expect(drivers.get('drv-1').trustScore).toBe(90);
  });

  it('counts each offer exactly once even if reported twice', async () => {
    const input = { ...newOffer(OfferStatus.DECLINED), outcome: 'DECLINED' as const };
    await service.recordOutcome(input);
    const second = await service.recordOutcome(input);
    expect(second.reason).toBe('already_counted');
    expect(drivers.get('drv-1').declinedOffers).toBe(1);
    expect(drivers.get('drv-1').trustScore).toBeCloseTo(88.5);
  });

  it('concurrent outcomes never lose updates', async () => {
    await Promise.all([
      record(OfferStatus.ACCEPTED, 'ACCEPTED'),
      record(OfferStatus.DECLINED, 'DECLINED', { distanceKm: 20 }),
      record(OfferStatus.ACCEPTED, 'ACCEPTED'),
      record(OfferStatus.DECLINED, 'DECLINED', { distanceKm: 20 }),
    ]);
    const d = drivers.get('drv-1');
    expect(d.acceptedOffers).toBe(2);
    expect(d.declinedOffers).toBe(2);
    expect(d.acceptanceRate).toBe(50);
  });

  it('clamps trust to [0, 100]', async () => {
    drivers.get('drv-1').trustScore = 99.9;
    await record(OfferStatus.ACCEPTED, 'ACCEPTED');
    expect(drivers.get('drv-1').trustScore).toBe(100);
    drivers.get('drv-1').trustScore = 0.5;
    await record(OfferStatus.DECLINED, 'DECLINED');
    expect(drivers.get('drv-1').trustScore).toBe(0);
  });

  it('AR uses a rolling window of the last 50 counted offers', async () => {
    for (let i = 0; i < 50; i++) await record(OfferStatus.DECLINED, 'DECLINED', { distanceKm: 20 });
    expect(drivers.get('drv-1').acceptanceRate).toBe(0);
    for (let i = 0; i < 25; i++) await record(OfferStatus.ACCEPTED, 'ACCEPTED');
    expect(drivers.get('drv-1').acceptanceRate).toBe(50);
  });

  it('shadow mode tracks AR but applies no trust penalty or cooldown', async () => {
    process.env.AR_PENALTY_MODE = 'shadow';
    for (let i = 0; i < 3; i++) await record(OfferStatus.DECLINED, 'DECLINED');
    const d = drivers.get('drv-1');
    expect(d.trustScore).toBe(90);
    expect(d.cooldownUntil).toBeNull();
    expect(d.acceptanceRate).toBe(0);
  });

  it('off mode does nothing', async () => {
    process.env.AR_PENALTY_MODE = 'off';
    await record(OfferStatus.DECLINED, 'DECLINED');
    expect(drivers.get('drv-1').declinedOffers).toBe(0);
  });
});
