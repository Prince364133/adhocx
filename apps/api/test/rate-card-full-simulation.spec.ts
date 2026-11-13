import { HttpStatus, BadRequestException } from '@nestjs/common';
import {
  DistancePricingService,
  evaluatePeakTime,
} from '../src/modules/pricing/distance-pricing.service';

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
        return (
          (v.lte === undefined || t <= new Date(v.lte).getTime()) &&
          (v.gt === undefined || t > new Date(v.gt).getTime())
        );
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
    findMany: async ({ where = {}, include }: Row = {}) =>
      [...this.plans.values()]
        .filter((p) => matches(p, where))
        .map((p) => this.withSlabs(p, include)),
    findFirst: async ({ where = {}, include }: Row = {}) => {
      const hit = [...this.plans.values()]
        .filter((p) => matches(p, where))
        .sort((a, b) => +b.effectiveFrom - +a.effectiveFrom)[0];
      return hit ? this.withSlabs(hit, include) : null;
    },
    findUnique: async ({ where, include }: Row) => {
      const hit = where.vehicleCategory_version
        ? [...this.plans.values()].find(
            (p) =>
              p.vehicleCategory === where.vehicleCategory_version.vehicleCategory &&
              p.version === where.vehicleCategory_version.version,
          )
        : this.plans.get(where.id);
      return hit ? this.withSlabs(hit, include) : null;
    },
    create: async ({ data, include }: Row) => {
      const { slabs, ...rest } = data;
      const plan = {
        id: uid('plan'),
        status: 'DRAFT',
        effectiveFrom: new Date(),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...rest,
      };
      this.plans.set(plan.id, plan);
      for (const s of slabs?.create ?? []) {
        const slabId = uid('slab');
        this.slabs.set(slabId, { ...s, id: slabId, planId: plan.id });
      }
      return this.withSlabs(plan, include);
    },
    update: async ({ where, data }: Row) => {
      const p = this.plans.get(where.id)!;
      Object.assign(p, data, { updatedAt: new Date() });
      return { ...p };
    },
    updateMany: async ({ where, data }: Row) => {
      const hits = [...this.plans.values()].filter((p) => matches(p, where));
      hits.forEach((p) => Object.assign(p, data));
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
}

const ADMIN = { id: 'admin-1', name: 'Pricing Admin' };
const PICKUP = { latitude: 17.4435, longitude: 78.3772, address: 'HITEC City' };
const DROP = { latitude: 17.3616, longitude: 78.4747, address: 'Charminar' };

describe('Condition-Based Rate Card Engine — Full Lifecycle & Simulation Suite', () => {
  let db: FakePricingDb;
  let maps: any;
  let svc: DistancePricingService;

  beforeEach(() => {
    db = new FakePricingDb();
    maps = {
      computeVerifiedRoadDistance: jest.fn(async (_p: any, _d: any) => ({
        distanceMeters: 22400, // 22.4 km
        durationSeconds: 1800,
        routeDescription: 'Via Outer Ring Road',
        routingPreference: 'TRAFFIC_UNAWARE',
        source: 'GOOGLE_ROUTES',
      })),
    };
    svc = new DistancePricingService(db as any, maps as any);
  });

  // =========================================================================
  // 1. Peak Hours Timing & Anti-Collapse Overlap Validation
  // =========================================================================
  describe('1. Peak Hours Timing Engine & Anti-Collapse Validation', () => {
    const windows = [
      { start: '08:00', end: '11:00', label: 'Morning Peak' },
      { start: '17:00', end: '21:30', label: 'Evening Peak' },
    ];

    it('validates non-overlapping peak windows without error', () => {
      expect(() => svc.validatePeakWindows(windows)).not.toThrow();
    });

    it('rejects overlapping windows (Anti-Collapse Guard)', () => {
      const badWindows = [
        { start: '08:00', end: '11:30', label: 'Morning Peak' },
        { start: '11:00', end: '14:00', label: 'Midday Peak' }, // 11:00 overlaps 11:30
      ];
      expect(() => svc.validatePeakWindows(badWindows)).toThrow(BadRequestException);
    });

    it('rejects identical start and end times', () => {
      expect(() =>
        svc.validatePeakWindows([{ start: '09:00', end: '09:00', label: 'Zero Duration' }]),
      ).toThrow(BadRequestException);
    });

    it('evaluates exact boundaries deterministically', () => {
      // 07:59 -> Off-peak
      const t1 = new Date('2026-11-12T07:59:00+05:30');
      expect(evaluatePeakTime(t1, windows).isPeak).toBe(false);

      // 08:00 -> Morning Peak starts
      const t2 = new Date('2026-11-12T08:00:00+05:30');
      const r2 = evaluatePeakTime(t2, windows);
      expect(r2.isPeak).toBe(true);
      expect(r2.activeWindow?.label).toBe('Morning Peak');

      // 10:59 -> Still Morning Peak
      const t3 = new Date('2026-11-12T10:59:00+05:30');
      expect(evaluatePeakTime(t3, windows).isPeak).toBe(true);

      // 11:00 -> Morning Peak ends (Non-Peak)
      const t4 = new Date('2026-11-12T11:00:00+05:30');
      expect(evaluatePeakTime(t4, windows).isPeak).toBe(false);

      // 17:00 -> Evening Peak starts
      const t5 = new Date('2026-11-12T17:00:00+05:30');
      const r5 = evaluatePeakTime(t5, windows);
      expect(r5.isPeak).toBe(true);
      expect(r5.activeWindow?.label).toBe('Evening Peak');

      // 21:30 -> Evening Peak ends
      const t6 = new Date('2026-11-12T21:30:00+05:30');
      expect(evaluatePeakTime(t6, windows).isPeak).toBe(false);
    });

    it('evaluates overnight peak windows across midnight', () => {
      const overnight = [{ start: '22:00', end: '02:00', label: 'Late Night Peak' }];
      expect(evaluatePeakTime(new Date('2026-11-12T23:30:00+05:30'), overnight).isPeak).toBe(true);
      expect(evaluatePeakTime(new Date('2026-11-12T01:15:00+05:30'), overnight).isPeak).toBe(true);
      expect(evaluatePeakTime(new Date('2026-11-12T02:30:00+05:30'), overnight).isPeak).toBe(false);
    });
  });

  // =========================================================================
  // 2. Distance Step Generation & Contiguity Guarantee (0–100 km)
  // =========================================================================
  describe('2. Distance Step Slabs & Contiguity Verification', () => {
    it('validates contiguous slabs from 0 m to 100,000 m (100 km)', () => {
      // Step generator simulation: 10 km steps up to 100 km
      const slabs: any[] = [];
      let minM = 0;
      for (let i = 1; i <= 10; i++) {
        const maxM = i * 10000;
        slabs.push({
          minDistanceMExclusive: minM,
          maxDistanceMInclusive: maxM,
          vendorPricePaise: (300 + i * 100) * 100,
          driverPayoutPaise: (200 + i * 80) * 100,
          vendorPeakPricePaise: (360 + i * 120) * 100,
          driverPeakPayoutPaise: (240 + i * 96) * 100,
        });
        minM = maxM;
      }

      // Must validate with 0 gaps and 0 overlaps
      expect(() => svc.validateSlabs(slabs)).not.toThrow();
    });

    it('rejects slabs with gaps or overlapping distance bounds', () => {
      const gapSlabs = [
        { minDistanceMExclusive: 0, maxDistanceMInclusive: 10000, vendorPricePaise: 50000, driverPayoutPaise: 40000 },
        { minDistanceMExclusive: 15000, maxDistanceMInclusive: 25000, vendorPricePaise: 90000, driverPayoutPaise: 70000 }, // Gap 10k-15k
      ];
      expect(() => svc.validateSlabs(gapSlabs)).toThrow(BadRequestException);

      const overlapSlabs = [
        { minDistanceMExclusive: 0, maxDistanceMInclusive: 15000, vendorPricePaise: 50000, driverPayoutPaise: 40000 },
        { minDistanceMExclusive: 10000, maxDistanceMInclusive: 25000, vendorPricePaise: 90000, driverPayoutPaise: 70000 }, // Overlap 10k-15k
      ];
      expect(() => svc.validateSlabs(overlapSlabs)).toThrow(BadRequestException);
    });

    it('rejects negative gross margin (driver payout > vendor price)', () => {
      const deficitSlabs = [
        { minDistanceMExclusive: 0, maxDistanceMInclusive: 10000, vendorPricePaise: 40000, driverPayoutPaise: 50000 },
      ];
      expect(() => svc.validateSlabs(deficitSlabs)).toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 3. Four Condition Cards & Real-Time Margin Calculations
  // =========================================================================
  describe('3. Condition Cards & Margin Health Calculations', () => {
    let activePlanId: string;

    beforeEach(async () => {
      // Create and publish a full 10-slab plan (0-100 km)
      const slabs = [
        { minDistanceMExclusive: 0, maxDistanceMInclusive: 10000, vendorPricePaise: 50000, driverPayoutPaise: 38000, vendorPeakPricePaise: 60000, driverPeakPayoutPaise: 45000 },
        { minDistanceMExclusive: 10000, maxDistanceMInclusive: 20000, vendorPricePaise: 75000, driverPayoutPaise: 56000, vendorPeakPricePaise: 90000, driverPeakPayoutPaise: 67000 },
        { minDistanceMExclusive: 20000, maxDistanceMInclusive: 30000, vendorPricePaise: 100000, driverPayoutPaise: 74000, vendorPeakPricePaise: 120000, driverPeakPayoutPaise: 88000 },
        { minDistanceMExclusive: 30000, maxDistanceMInclusive: 50000, vendorPricePaise: 150000, driverPayoutPaise: 110000, vendorPeakPricePaise: 180000, driverPeakPayoutPaise: 132000 },
        { minDistanceMExclusive: 50000, maxDistanceMInclusive: 100000, vendorPricePaise: 280000, driverPayoutPaise: 200000, vendorPeakPricePaise: 336000, driverPeakPayoutPaise: 240000 },
      ];

      const draft = await svc.createDraftPlan(
        {
          vehicleCategory: 'SEDAN',
          name: 'Sedan Fleet Dynamic Condition Plan',
          peakWindows: [
            { start: '08:30', end: '11:00', label: 'Morning Peak' },
            { start: '17:30', end: '21:00', label: 'Evening Peak' },
          ],
          slabs,
        },
        ADMIN,
      );

      const published = await svc.publishPlan(draft.id, { reason: 'Deploying condition-based rate cards' }, ADMIN);
      activePlanId = published.id;
    });

    it('returns separated Vendor Rate Card (standard & peak prices) without exposing driver payouts', async () => {
      const vendorCard = await svc.getActiveVendorRateCard('SEDAN');
      expect(vendorCard.vehicleCategory).toBe('SEDAN');
      expect(vendorCard.slabs.length).toBe(5);

      const slab1 = vendorCard.slabs[0];
      expect(slab1.minKm).toBe(0);
      expect(slab1.maxKm).toBe(10);
      expect(slab1.vendorPriceRupees).toBe(500);
      expect(slab1.vendorPeakPriceRupees).toBe(600);
      // Ensure driver payout is not in vendor slab representation
      expect((slab1 as any).driverPayoutRupees).toBeUndefined();
    });

    it('returns separated Driver Rate Card (standard & peak payouts) without exposing vendor charges', async () => {
      const driverCard = await svc.getActiveDriverRateCard('SEDAN');
      expect(driverCard.vehicleCategory).toBe('SEDAN');
      expect(driverCard.slabs.length).toBe(5);

      const slab1 = driverCard.slabs[0];
      expect(slab1.minKm).toBe(0);
      expect(slab1.maxKm).toBe(10);
      expect(slab1.driverPayoutRupees).toBe(380);
      expect(slab1.driverPeakPayoutRupees).toBe(450);
      // Ensure vendor price is not in driver slab representation
      expect((slab1 as any).vendorPriceRupees).toBeUndefined();
    });

    it('returns vendor and driver rates without platform spread metrics', async () => {
      const plan = await svc.getPlanById(activePlanId);

      const s1 = plan.slabs[0];
      expect(s1.vendorPriceRupees).toBe(500);
      expect(s1.driverPayoutRupees).toBe(380);
      expect(s1).not.toHaveProperty('grossSpreadPaise');
      expect(s1).not.toHaveProperty('grossMarginPercent');

      const s3 = plan.slabs[2];
      expect(s3.vendorPeakPricePaise).toBe(120000);
      expect(s3.driverPeakPayoutPaise).toBe(88000);
      expect(s3).not.toHaveProperty('peakGrossSpreadPaise');
    });
  });

  // =========================================================================
  // 4. End-to-End Quotation, Dispatch Payout & Simulation Execution
  // =========================================================================
  describe('4. Simulation & Quotation Integration Runs', () => {
    beforeEach(async () => {
      const slabs = [
        { minDistanceMExclusive: 0, maxDistanceMInclusive: 15000, vendorPricePaise: 60000, driverPayoutPaise: 45000, vendorPeakPricePaise: 75000, driverPeakPayoutPaise: 55000 },
        { minDistanceMExclusive: 15000, maxDistanceMInclusive: 30000, vendorPricePaise: 90000, driverPayoutPaise: 68000, vendorPeakPricePaise: 110000, driverPeakPayoutPaise: 82000 },
        { minDistanceMExclusive: 30000, maxDistanceMInclusive: 60000, vendorPricePaise: 150000, driverPayoutPaise: 112000, vendorPeakPricePaise: 185000, driverPeakPayoutPaise: 135000 },
        { minDistanceMExclusive: 60000, maxDistanceMInclusive: 100000, vendorPricePaise: 250000, driverPayoutPaise: 190000, vendorPeakPricePaise: 300000, driverPeakPayoutPaise: 225000 },
      ];

      const draft = await svc.createDraftPlan(
        {
          vehicleCategory: 'ALL',
          name: 'Universal Matrix Plan',
          peakWindows: [
            { start: '08:00', end: '11:00', label: 'Morning Rush' },
            { start: '17:00', end: '20:30', label: 'Evening Rush' },
          ],
          slabs,
        },
        ADMIN,
      );
      await svc.publishPlan(draft.id, { reason: 'Go live' }, ADMIN);
    });

    it('generates vendor quote applying Standard rate during off-peak hours', async () => {
      const quote = await svc.createVendorQuote(
        {
          pickup: PICKUP,
          drop: DROP,
          vehicleCategory: 'ALL',
          pickupTime: '2026-11-12T14:30:00+05:30', // 2:30 PM (Off-Peak)
        } as any,
        'vendor-user-1',
      );

      expect(quote.displayedKm).toBe(22.4); // Matches 15km - 30km slab
      expect(quote.isPeak).toBe(false);
      expect(quote.vendorPriceRupees).toBe(900); // Standard vendor rate ₹900
      expect((quote as any).driverPayoutRupees).toBeUndefined(); // Payout hidden from vendor
    });

    it('generates vendor quote applying Peak rate during morning peak hours', async () => {
      const quote = await svc.createVendorQuote(
        {
          pickup: PICKUP,
          drop: DROP,
          vehicleCategory: 'ALL',
          pickupTime: '2026-11-12T09:15:00+05:30', // 9:15 AM (Morning Rush Peak)
        } as any,
        'vendor-user-1',
      );

      expect(quote.displayedKm).toBe(22.4);
      expect(quote.isPeak).toBe(true);
      expect(quote.activeWindowLabel).toBe('Morning Rush');
      expect(quote.vendorPriceRupees).toBe(1100); // Peak vendor rate ₹1,100
    });

    it('resolves driver payout correctly for route during peak and non-peak hours', async () => {
      // Off-peak driver payout (2:30 PM)
      const offPeak = await svc.driverPayoutForRoute(PICKUP, DROP, 'ALL', '2026-11-12T14:30:00+05:30');
      expect(offPeak.isPeak).toBe(false);
      expect(offPeak.driverPayoutPaise).toBe(68000); // ₹680 standard payout

      // Morning peak driver payout (9:15 AM)
      const peak = await svc.driverPayoutForRoute(PICKUP, DROP, 'ALL', '2026-11-12T09:15:00+05:30');
      expect(peak.isPeak).toBe(true);
      expect(peak.driverPayoutPaise).toBe(82000); // ₹820 peak payout
    });

    it('executes live simulation endpoint providing complete 4-condition comparison', async () => {
      // Simulate 22.4 km ride at 9:15 AM (Peak)
      const simPeak = await svc.simulateCalculation({
        distanceKm: 22.4,
        vehicleCategory: 'ALL',
        pickupTime: '2026-11-12T09:15:00+05:30',
      });

      expect(simPeak.isPeak).toBe(true);
      expect(simPeak.activeWindowLabel).toBe('Morning Rush');
      expect(simPeak.vendorPriceRupees).toBe(1100);
      expect(simPeak.driverPayoutRupees).toBe(820);
      expect(simPeak).not.toHaveProperty('grossSpreadRupees');
      expect(simPeak).not.toHaveProperty('grossMarginPercent');

      // Side-by-side standard breakdown is also returned for admin comparison
      expect(simPeak.standard.vendorPriceRupees).toBe(900);
      expect(simPeak.standard.driverPayoutRupees).toBe(680);

      // Side-by-side peak breakdown
      expect(simPeak.peak.vendorPriceRupees).toBe(1100);
      expect(simPeak.peak.driverPayoutRupees).toBe(820);
    });

    it('rejects trips exceeding the maximum configured distance (e.g. 110 km on 100 km cap)', async () => {
      await expect(
        svc.simulateCalculation({
          distanceKm: 110, // exceeds max 100km
          vehicleCategory: 'ALL',
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      });
    });

    it('stores windows and peak rates in their own columns, never in the plan name', async () => {
      const plan = [...db.plans.values()].find((p) => p.status === 'ACTIVE')!;
      expect(plan.name).toBe('Universal Matrix Plan');
      expect(plan.peakWindowsJson).toEqual([
        { start: '08:00', end: '11:00', label: 'Morning Rush' },
        { start: '17:00', end: '20:30', label: 'Evening Rush' },
      ]);
      const slab = [...db.slabs.values()].find((s) => s.planId === plan.id && s.minDistanceMExclusive === 15000)!;
      expect(slab.vendorPeakPricePaise).toBe(110000);
      expect(slab.driverPeakPayoutPaise).toBe(82000);
    });

    it('records the priced-for period on the quote', async () => {
      const q = await svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'ALL', pickupTime: '2026-11-12T09:15:00+05:30' } as any, 'v-1');
      const row = db.quotes.get(q.quoteId)!;
      expect(row.isPeak).toBe(true);
      expect(row.pricedForTime.toISOString()).toBe('2026-11-12T03:45:00.000Z');
    });

    it('refuses to book a peak reporting time on an off-peak quote (and vice versa)', async () => {
      const offPeak = await svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'ALL', pickupTime: '2026-11-12T14:30:00+05:30' } as any, 'v-1');
      await expect(
        svc.lockPricingSnapshotForBooking(offPeak.quoteId, 'v-1', { reportingTime: '2026-11-12T09:15:00+05:30' }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT, response: { code: 'PRICING_QUOTE_MISMATCH' } });

      const peak = await svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'ALL', pickupTime: '2026-11-12T09:15:00+05:30' } as any, 'v-1');
      await expect(
        svc.lockPricingSnapshotForBooking(peak.quoteId, 'v-1', { reportingTime: '2026-11-13T15:00:00+05:30' }),
      ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });

      // Same period (another peak minute, another day) books fine at the quoted price.
      const ok = await svc.lockPricingSnapshotForBooking(peak.quoteId, 'v-1', { reportingTime: '2026-11-13T10:30:00+05:30' });
      expect(ok.vendorPricePaise).toBe(110000);
      expect(ok.driverPayoutPaise).toBe(82000);
    });

    it('rejects an unparseable pickup time instead of pricing it off-peak', async () => {
      await expect(
        svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'ALL', pickupTime: 'tomorrow 9am' } as any, 'v-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. Backward compatibility & draft semantics', () => {
    const legacySlabs = [
      { minDistanceMExclusive: 0, maxDistanceMInclusive: 30000, vendorPricePaise: 90000, driverPayoutPaise: 68000 },
    ];

    it('a plan without windows or peak rates prices every hour at its standard rate (no surprise surcharge)', async () => {
      const draft = await svc.createDraftPlan({ vehicleCategory: 'ALL', slabs: legacySlabs }, ADMIN);
      expect(draft.peakWindows).toEqual([]);
      await svc.publishPlan(draft.id, { reason: 'legacy' }, ADMIN);

      const q = await svc.createVendorQuote({ pickup: PICKUP, drop: DROP, vehicleCategory: 'ALL', pickupTime: '2026-11-12T09:15:00+05:30' } as any, 'v-1');
      expect(q.isPeak).toBe(false);
      expect(q.vendorPriceRupees).toBe(900);
      const payout = await svc.driverPayoutForRoute(PICKUP, DROP, 'ALL', '2026-11-12T18:00:00+05:30');
      expect(payout.driverPayoutPaise).toBe(68000);
    });

    it('rejects a peak rate that pays the driver more than the vendor is charged', () => {
      expect(() =>
        svc.validateSlabs([{ ...legacySlabs[0], vendorPeakPricePaise: 70000, driverPeakPayoutPaise: 80000 }]),
      ).toThrow(/peak/);
      // Peak payout above the standard vendor charge, with no peak vendor rate set, is also a loss.
      expect(() => svc.validateSlabs([{ ...legacySlabs[0], driverPeakPayoutPaise: 95000 }])).toThrow(/peak/);
    });

    it('draft edits keep windows when omitted, clear them with [], and audit the change', async () => {
      const draft = await svc.createDraftPlan(
        { vehicleCategory: 'ALL', slabs: legacySlabs, peakWindows: [{ start: '08:00', end: '11:00' }] },
        ADMIN,
      );
      let updated = await svc.updateDraftSlabs(draft.id, legacySlabs as any, ADMIN, 'rates only');
      expect(updated.peakWindows).toHaveLength(1);

      updated = await svc.updateDraftSlabs(draft.id, legacySlabs as any, ADMIN, 'peak off', { peakWindows: [] });
      expect(updated.peakWindows).toEqual([]);
      const audit = db.audits.filter((a) => a.action === 'UPDATE_SLABS').pop()!;
      expect(audit.oldValueJson.peakWindows).toHaveLength(1);
      expect(audit.newValueJson.peakWindows).toEqual([]);
    });

    it('a cloned draft inherits the source plan windows and peak rates', async () => {
      const src = await svc.createDraftPlan(
        {
          vehicleCategory: 'SUV',
          slabs: [{ ...legacySlabs[0], vendorPeakPricePaise: 99000, driverPeakPayoutPaise: 75000 }],
          peakWindows: [{ start: '17:00', end: '20:00' }],
        },
        ADMIN,
      );
      const clone = await svc.createDraftPlan({ vehicleCategory: 'SUV', cloneFromPlanId: src.id }, ADMIN);
      expect(clone.peakWindows).toEqual([{ start: '17:00', end: '20:00', label: 'Window #1' }]);
      expect(clone.slabs[0].vendorPeakPricePaise).toBe(99000);
      expect(clone.slabs[0].driverPeakPayoutPaise).toBe(75000);
    });
  });
});
