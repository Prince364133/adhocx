import { HttpStatus } from '@nestjs/common';
import { DistancePricingService } from '../src/modules/pricing/distance-pricing.service';
import { RouteUnavailableError } from '../src/modules/locations/google-maps.service';
import { PRD_SAMPLE_SLABS } from './helpers/distance-pricing-fixtures';

/**
 * Dynamic Distance-Based Pricing Engine (PRD v1.0) — acceptance criteria (section 11) and the
 * rules behind them. Runs against an in-memory stand-in for the pricing tables.
 */

type Row = Record<string, any>;
let seq = 0;
const uid = (p: string) => `${p}-${++seq}`;

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === 'OR') return (v as Row[]).some((w) => matches(row, w));
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('in' in v) return (v.in as any[]).includes(row[k]);
      if ('not' in v) return row[k] !== v.not;
      if ('lte' in v || 'gt' in v) {
        const t = new Date(row[k]).getTime();
        return (v.lte === undefined || t <= new Date(v.lte).getTime()) && (v.gt === undefined || t > new Date(v.gt).getTime());
      }
    }
    return row[k] === v;
  });
}

class FakePricingDb {
  plans = new Map<string, Row>();
  slabs = new Map<string, Row>();
  audits: Row[] = [];
  quotes = new Map<string, Row>();

  private withSlabs(plan: Row, include?: Row) {
    if (!include?.slabs) return { ...plan };
    const where = include.slabs.where ?? {};
    const slabs = [...this.slabs.values()]
      .filter((s) => s.planId === plan.id && matches(s, where))
      .sort((a, b) => a.minDistanceMExclusive - b.minDistanceMExclusive);
    return { ...plan, slabs };
  }

  pricingPlan = {
    findMany: async ({ where = {}, include }: Row = {}) => [...this.plans.values()].filter((p) => matches(p, where)).map((p) => this.withSlabs(p, include)),
    findFirst: async ({ where = {}, include }: Row = {}) => {
      const hit = [...this.plans.values()].filter((p) => matches(p, where)).sort((a, b) => +b.effectiveFrom - +a.effectiveFrom)[0];
      return hit ? this.withSlabs(hit, include) : null;
    },
    findUnique: async ({ where, include }: Row) => {
      const hit = where.vehicleCategory_version
        ? [...this.plans.values()].find((p) => p.vehicleCategory === where.vehicleCategory_version.vehicleCategory && p.version === where.vehicleCategory_version.version)
        : this.plans.get(where.id);
      return hit ? this.withSlabs(hit, include) : null;
    },
    create: async ({ data, include }: Row) => {
      const { slabs, ...rest } = data;
      const plan = { id: uid('plan'), status: 'DRAFT', effectiveFrom: new Date(), effectiveTo: null, createdAt: new Date(), updatedAt: new Date(), ...rest };
      this.plans.set(plan.id, plan);
      for (const s of slabs?.create ?? []) this.slabs.set(uid('slab'), { ...s, id: undefined, planId: plan.id });
      for (const [id, s] of this.slabs) if (!s.id) s.id = id;
      return this.withSlabs(plan, include);
    },
    update: async ({ where, data }: Row) => {
      const p = this.plans.get(where.id)!;
      Object.assign(p, data, { updatedAt: new Date() });
      this.assertOneActive();
      return { ...p };
    },
    updateMany: async ({ where, data }: Row) => {
      const hits = [...this.plans.values()].filter((p) => matches(p, where));
      hits.forEach((p) => Object.assign(p, data));
      this.assertOneActive();
      return { count: hits.length };
    },
  };

  pricingSlab = {
    deleteMany: async ({ where }: Row) => {
      for (const [id, s] of this.slabs) if (matches(s, where)) this.slabs.delete(id);
      return { count: 0 };
    },
    createMany: async ({ data }: Row) => {
      for (const s of data) {
        const id = uid('slab');
        this.slabs.set(id, { ...s, id });
      }
      return { count: data.length };
    },
  };

  pricingAudit = {
    create: async ({ data }: Row) => {
      const a = { id: uid('audit'), entityType: 'PRICING_PLAN', timestamp: new Date(), ...data };
      this.audits.push(a);
      return a;
    },
    findMany: async ({ where = {} }: Row = {}) => this.audits.filter((a) => matches(a, where)).reverse(),
  };

  tripQuote = {
    create: async ({ data }: Row) => {
      const q = { id: uid('quote'), createdAt: new Date(), consumedAt: null, requirementId: null, ...data };
      this.quotes.set(q.id, q);
      return { ...q };
    },
    findUnique: async ({ where, include }: Row) => {
      const q = this.quotes.get(where.id);
      if (!q) return null;
      return include?.plan ? { ...q, plan: this.plans.get(q.planId) ?? null } : { ...q };
    },
    updateMany: async ({ where, data }: Row) => {
      const hits = [...this.quotes.values()].filter((q) => matches(q, where));
      hits.forEach((q) => Object.assign(q, data));
      return { count: hits.length };
    },
  };

  $transaction = async (fn: any) => fn(this);

  /** Mirrors the partial unique index pricing_plans_one_active_per_category. */
  private assertOneActive() {
    const active = new Map<string, number>();
    for (const p of this.plans.values()) {
      if (p.status === 'ACTIVE') active.set(p.vehicleCategory, (active.get(p.vehicleCategory) ?? 0) + 1);
    }
    for (const [cat, n] of active) if (n > 1) throw new Error(`unique violation: ${n} ACTIVE plans for ${cat}`);
  }
}

const ADMIN = { id: 'admin-1', name: 'Pricing Admin' };
const PICKUP = { latitude: 17.4435, longitude: 78.3772, address: 'HITEC City' };
const DROP = { latitude: 17.3616, longitude: 78.4747, address: 'Charminar' };

function build(opts: { distanceM?: number; mapsError?: RouteUnavailableError; rateLimited?: boolean } = {}) {
  const db = new FakePricingDb();
  const maps = {
    computeVerifiedRoadDistance: jest.fn(async () => {
      if (opts.mapsError) throw opts.mapsError;
      return { distanceMeters: opts.distanceM ?? 22400, durationSeconds: 1800, routeDescription: 'Via ORR', routingPreference: 'TRAFFIC_UNAWARE', source: 'GOOGLE_ROUTES' };
    }),
  };
  const redis = { checkRateLimit: jest.fn(async () => ({ allowed: !opts.rateLimited, remaining: 0, resetAfter: 600 })) };
  const svc = new DistancePricingService(db as any, maps as any, redis as any);
  return { svc, db, maps };
}

/** Publishes a plan the way an admin does: draft with slabs, then publish. */
async function publishPlan(svc: DistancePricingService, category: string, slabs = PRD_SAMPLE_SLABS) {
  const draft = await svc.createDraftPlan({ vehicleCategory: category, slabs } as any, ADMIN);
  return svc.publishPlan(draft.id, { reason: 'go live' } as any, ADMIN);
}

describe('PRD 11: acceptance criteria', () => {
  it('a 10 km route resolves to the first slab and 10.001 km to the second', async () => {
    const { svc } = build();
    await publishPlan(svc, 'ALL');
    const plan = await svc.resolveActivePlan('ALL');
    expect(svc.resolveSlab(plan, 10000)).toMatchObject({ vendorPricePaise: 50000 });
    expect(svc.resolveSlab(plan, 10001)).toMatchObject({ vendorPricePaise: 65000 });
  });

  it('admin changes >20-25 km to Rs 975 / Rs 790: new 22.4 km quotes use it, a confirmed trip keeps Rs 950 / Rs 780', async () => {
    const { svc, db } = build({ distanceM: 22400 });
    const v1 = await publishPlan(svc, 'SEDAN');

    // A trip confirmed before the change.
    const before = await svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'SEDAN' } as any, 'vendor-1');
    expect(before.vendorPricePaise).toBe(95000);
    const booked = await svc.lockPricingSnapshotForBooking(before.quoteId, 'vendor-1');
    await svc.consumeQuote(db, before.quoteId, 'req-old');
    const oldSnapshot = { vendorPricePaise: booked.vendorPricePaise, driverPayoutPaise: booked.driverPayoutPaise };

    // Admin edits through a new version (draft -> publish).
    const draft = await svc.createDraftPlan({ vehicleCategory: 'SEDAN', cloneFromPlanId: v1.id } as any, ADMIN);
    const edited = PRD_SAMPLE_SLABS.map((s) => (s.minDistanceMExclusive === 20000 ? { ...s, vendorPricePaise: 97500, driverPayoutPaise: 79000 } : s));
    await svc.updateDraftSlabs(draft.id, edited as any, ADMIN, 'Fuel price revision');
    await svc.publishPlan(draft.id, { reason: 'Fuel price revision' } as any, ADMIN);

    const after = await svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'SEDAN' } as any, 'vendor-1');
    expect(after.vendorPricePaise).toBe(97500);
    expect((await svc.driverPayoutForRoute(PICKUP, DROP, 'SEDAN')).driverPayoutPaise).toBe(79000);
    expect(oldSnapshot).toEqual({ vendorPricePaise: 95000, driverPayoutPaise: 78000 });
    expect(db.quotes.get(before.quoteId)).toMatchObject({ vendorPricePaise: 95000, driverPayoutPaise: 78000, status: 'CONFIRMED' });
    expect(db.plans.get(v1.id)!.status).toBe('RETIRED');
  });

  it('the vendor quote never exposes the driver payout or margin; the driver rate card never exposes the vendor charge', async () => {
    const { svc } = build();
    await publishPlan(svc, 'ALL');
    const quote = await svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'SEDAN' } as any, 'vendor-1');
    expect(JSON.stringify(quote)).not.toMatch(/driver|payout|spread|margin/i);
    const driverCard = await svc.getActiveDriverRateCard('ALL');
    expect(JSON.stringify(driverCard)).not.toMatch(/vendor|spread|margin/i);
    const vendorCard = await svc.getActiveVendorRateCard('ALL');
    expect(JSON.stringify(vendorCard)).not.toMatch(/driver|payout|spread|margin/i);
  });

  it('overlapping or gapped slabs cannot be saved or published', async () => {
    const { svc } = build();
    const gap = [PRD_SAMPLE_SLABS[0], { ...PRD_SAMPLE_SLABS[1], minDistanceMExclusive: 11000 }];
    const overlap = [PRD_SAMPLE_SLABS[0], { ...PRD_SAMPLE_SLABS[1], minDistanceMExclusive: 9000 }];
    await expect(svc.createDraftPlan({ vehicleCategory: 'ALL', slabs: gap } as any, ADMIN)).rejects.toThrow(/Gap/);
    await expect(svc.createDraftPlan({ vehicleCategory: 'ALL', slabs: overlap } as any, ADMIN)).rejects.toThrow(/overlap/);
    const draft = await svc.createDraftPlan({ vehicleCategory: 'ALL', slabs: PRD_SAMPLE_SLABS } as any, ADMIN);
    await expect(svc.updateDraftSlabs(draft.id, gap as any, ADMIN)).rejects.toThrow(/Gap/);
    await expect(
      svc.createDraftPlan({ vehicleCategory: 'ALL', slabs: [{ ...PRD_SAMPLE_SLABS[0], driverPayoutPaise: 60000 }] } as any, ADMIN),
    ).rejects.toThrow(/cannot be less than driver payout/);
  });

  it('a Google Maps failure or a missing slab produces no quote (no invented amount)', async () => {
    const down = build({ mapsError: new RouteUnavailableError('MAPS_ERROR', 'timeout') });
    await publishPlan(down.svc, 'ALL');
    await expect(down.svc.createVendorQuote({ pickup: PICKUP, drop: DROP } as any, 'v')).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });
    expect(down.db.quotes.size).toBe(0);

    const noKey = build({ mapsError: new RouteUnavailableError('NO_API_KEY', 'no key') });
    await publishPlan(noKey.svc, 'ALL');
    await expect(noKey.svc.createVendorQuote({ pickup: PICKUP, drop: DROP } as any, 'v')).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
    });

    const noRoute = build({ mapsError: new RouteUnavailableError('NO_ROUTE', 'no road') });
    await publishPlan(noRoute.svc, 'ALL');
    await expect(noRoute.svc.createVendorQuote({ pickup: PICKUP, drop: DROP } as any, 'v')).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
    });

    const far = build({ distanceM: 52000 });
    await publishPlan(far.svc, 'ALL');
    await expect(far.svc.createVendorQuote({ pickup: PICKUP, drop: DROP } as any, 'v')).rejects.toMatchObject({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      response: expect.objectContaining({ code: 'PRICING_DISTANCE_NOT_CONFIGURED' }),
    });
    expect(far.db.quotes.size).toBe(0);
  });

  it('every pricing change records actor, old/new values, effective time and reason', async () => {
    const { svc, db } = build();
    const v1 = await publishPlan(svc, 'ALL');
    const draft = await svc.createDraftPlan({ vehicleCategory: 'ALL', cloneFromPlanId: v1.id } as any, ADMIN);
    await svc.updateDraftSlabs(draft.id, PRD_SAMPLE_SLABS.map((s) => ({ ...s, vendorPricePaise: s.vendorPricePaise + 1000 })) as any, ADMIN, 'Q4 rates');
    await svc.publishPlan(draft.id, { reason: 'Q4 rates' } as any, ADMIN);

    const update = db.audits.find((a) => a.action === 'UPDATE_SLABS')!;
    expect(update).toMatchObject({ actorId: 'admin-1', actorName: 'Pricing Admin', reason: 'Q4 rates' });
    expect(update.oldValueJson[0].vendorPricePaise).toBe(50000);
    expect(update.newValueJson[0].vendorPricePaise).toBe(51000);
    const publish = db.audits.filter((a) => a.action === 'PUBLISH_PLAN').pop()!;
    expect(publish.oldValueJson).toMatchObject({ replacedPlanId: v1.id });
    expect(publish.newValueJson).toMatchObject({ status: 'ACTIVE', effectiveFrom: expect.any(String) });
  });

  it('an admin can add a >40-45 km slab without code changes', async () => {
    const { svc } = build({ distanceM: 42000 });
    const v1 = await publishPlan(svc, 'ALL');
    await expect(svc.createVendorQuote({ pickup: PICKUP, drop: DROP } as any, 'v')).rejects.toThrow(/No price is configured/);
    const draft = await svc.createDraftPlan({ vehicleCategory: 'ALL', cloneFromPlanId: v1.id } as any, ADMIN);
    await svc.updateDraftSlabs(
      draft.id,
      [...PRD_SAMPLE_SLABS, { minDistanceMExclusive: 40000, maxDistanceMInclusive: 45000, vendorPricePaise: 155000, driverPayoutPaise: 128000 }] as any,
      ADMIN,
    );
    await svc.publishPlan(draft.id, { reason: 'Add 45 km band' } as any, ADMIN);
    await expect(svc.createVendorQuote({ pickup: PICKUP, drop: DROP } as any, 'v')).resolves.toMatchObject({ vendorPricePaise: 155000 });
  });
});

describe('versions, publishing and scheduling', () => {
  it('there are no built-in rates: a draft needs slabs or an active plan to copy', async () => {
    const { svc } = build();
    await expect(svc.createDraftPlan({ vehicleCategory: 'SUV' } as any, ADMIN)).rejects.toThrow(/Provide the distance slabs/);
    await expect(svc.resolveActivePlan('SUV')).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
  });

  it('only DRAFT plans can be edited; live prices change only by publishing a new version', async () => {
    const { svc } = build();
    const live = await publishPlan(svc, 'ALL');
    await expect(svc.updateDraftSlabs(live.id, PRD_SAMPLE_SLABS as any, ADMIN)).rejects.toThrow(/Only DRAFT plans can be edited/);
    await expect(svc.publishPlan(live.id, { reason: 'again' } as any, ADMIN)).rejects.toThrow(/Only a DRAFT/);
  });

  it('a scheduled plan stays inactive until its time, then replaces the active plan', async () => {
    const { svc, db } = build();
    const v1 = await publishPlan(svc, 'ALL');
    const draft = await svc.createDraftPlan({ vehicleCategory: 'ALL', cloneFromPlanId: v1.id } as any, ADMIN);
    const at = new Date(Date.now() + 3600_000);
    const scheduled = await svc.publishPlan(draft.id, { reason: 'next month', effectiveFrom: at.toISOString() } as any, ADMIN);
    expect(scheduled.status).toBe('SCHEDULED');
    expect((await svc.resolveActivePlan('ALL')).id).toBe(v1.id);

    expect(await svc.activateDuePlans(new Date(at.getTime() + 1000))).toEqual([draft.id]);
    expect(db.plans.get(draft.id)!.status).toBe('ACTIVE');
    expect(db.plans.get(v1.id)!.status).toBe('RETIRED');
    expect(db.audits.some((a) => a.action === 'ACTIVATE_SCHEDULED_PLAN')).toBe(true);
    expect(await svc.activateDuePlans(new Date(at.getTime() + 2000))).toEqual([]); // idempotent
  });

  it('deactivating the live plan stops quotes for that category (no silent fallback price)', async () => {
    const { svc } = build();
    const live = await publishPlan(svc, 'SUV');
    await svc.retirePlan(live.id, 'rates under review', ADMIN);
    await expect(svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'SUV' } as any, 'v')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PRICING_NO_ACTIVE_PLAN' }),
    });
  });

  it('categories are isolated: SUV uses its own plan; a category without one uses the explicit ALL plan only', async () => {
    const { svc } = build({ distanceM: 22400 });
    await publishPlan(svc, 'ALL');
    await publishPlan(svc, 'SUV', PRD_SAMPLE_SLABS.map((s) => ({ ...s, vendorPricePaise: s.vendorPricePaise + 30000, driverPayoutPaise: s.driverPayoutPaise + 20000 })));
    expect((await svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'SUV' } as any, 'v')).vendorPricePaise).toBe(125000);
    expect((await svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'SEDAN' } as any, 'v')).vendorPricePaise).toBe(95000);
  });
});

describe('quotes and booking', () => {
  async function quoted(overrides: Parameters<typeof build>[0] = {}) {
    const ctx = build(overrides);
    await publishPlan(ctx.svc, 'ALL');
    const quote = await ctx.svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'SEDAN' } as any, 'vendor-1');
    return { ...ctx, quote };
  }

  it('records the distance source and routing policy on the quote', async () => {
    const { db, quote } = await quoted();
    expect(db.quotes.get(quote.quoteId)).toMatchObject({ routeSource: 'GOOGLE_ROUTES', routingPreference: 'TRAFFIC_UNAWARE', routeDistanceM: 22400 });
  });

  it('a quote books once: the second consume is refused', async () => {
    const { svc, db, quote } = await quoted();
    await svc.consumeQuote(db, quote.quoteId, 'req-1');
    await expect(svc.consumeQuote(db, quote.quoteId, 'req-2')).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    await expect(svc.findBookingForQuote(quote.quoteId, 'vendor-1')).resolves.toBe('req-1');
    await expect(svc.lockPricingSnapshotForBooking(quote.quoteId, 'vendor-1')).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });

  it("another vendor's quote looks like a missing quote", async () => {
    const { svc, quote } = await quoted();
    await expect(svc.lockPricingSnapshotForBooking(quote.quoteId, 'vendor-2')).rejects.toThrow(/Quote not found/);
  });

  it('an expired quote needs a fresh quote', async () => {
    const { svc, db, quote } = await quoted();
    db.quotes.get(quote.quoteId)!.expiresAt = new Date(Date.now() - 1000);
    await expect(svc.lockPricingSnapshotForBooking(quote.quoteId, 'vendor-1')).rejects.toMatchObject({ status: HttpStatus.GONE });
    await expect(svc.consumeQuote(db, quote.quoteId, 'req-1')).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });

  it('changing pickup, drop or vehicle type after quoting requires a new quote', async () => {
    const { svc, quote } = await quoted();
    const moved = { latitude: PICKUP.latitude + 0.01, longitude: PICKUP.longitude };
    await expect(svc.lockPricingSnapshotForBooking(quote.quoteId, 'vendor-1', { pickup: moved, drop: DROP })).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
    });
    await expect(
      svc.lockPricingSnapshotForBooking(quote.quoteId, 'vendor-1', { pickup: PICKUP, drop: DROP, vehicleCategory: 'SUV' }),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    await expect(
      svc.lockPricingSnapshotForBooking(quote.quoteId, 'vendor-1', { pickup: PICKUP, drop: DROP, vehicleCategory: 'SEDAN' }),
    ).resolves.toMatchObject({ vendorPricePaise: 95000 });
  });

  it('quotes are rate limited per vendor', async () => {
    const { svc } = build({ rateLimited: true });
    await publishPlan(svc, 'ALL');
    await expect(svc.createVendorQuote({ pickup: PICKUP, drop: DROP } as any, 'v')).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });
});
