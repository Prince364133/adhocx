/**
 * wire/billing-payouts: rate-card HTTP layer, effective-dated invoice pricing, payout batch
 * maker-checker -> provider submit -> signed confirmations -> reconciliation, invoice disputes and
 * credit notes, and the "no driver payout / margin in corporate responses" guarantee.
 *
 * Runs on the in-memory FakeDb (real where-clause evaluation, unique constraints, conditional
 * updateMany). All instants are explicit UTC ISO strings, so the suite is TZ-independent
 * (run under IST and TZ=UTC).
 */
import 'reflect-metadata';
import { createHmac } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@adhocx/contracts';
import { CorporateAccessGuard } from '../src/common/guards/corporate-access.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { CorporateBillingService } from '../src/domains/corporate/billing/corporate-billing.service';
import { CorporateBillingController } from '../src/domains/corporate/billing/corporate-billing.controller';
import { RateCardService } from '../src/domains/corporate/billing/rate-card.service';
import { CorporateRateCardAdminService } from '../src/domains/corporate/billing/corporate-rate-card-admin.service';
import { CorporateRateCardController } from '../src/domains/corporate/billing/corporate-rate-card.controller';
import { CorporatePayoutService } from '../src/domains/corporate/billing/corporate-payout.service';
import { CorporatePayoutWebhookController } from '../src/domains/corporate/billing/corporate-payout-webhook.controller';
import { CorporateInvoiceDisputeService } from '../src/domains/corporate/billing/corporate-invoice-dispute.service';
import { MockPayoutProviderAdapter } from '../src/domains/corporate/billing/payout-provider.port';
import { findForbiddenKeys } from '../src/domains/corporate/billing/corporate-response-guard';
import { FakeDb, makeAudit, makeNotifications } from './helpers/corporate-ws-d-fakes';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SECRET = 'whsec-test-corporate-payouts';
const T1 = { id: 'tenant-1', code: 'ACME', name: 'Acme', legalEntityName: 'Acme Pvt Ltd', status: 'ACTIVE' };
const T2 = { id: 'tenant-2', code: 'GLOBEX', name: 'Globex', legalEntityName: 'Globex Pvt Ltd', status: 'ACTIVE' };
const admin = { id: 'u-admin-maker', role: UserRole.ADMIN };
const checker = { id: 'u-admin-checker', role: UserRole.ADMIN };
const corpAdmin1 = { id: 'u-ca1', role: UserRole.CORPORATE_ADMIN, corporateTenantId: T1.id };
const finance1 = { id: 'u-fin1', role: UserRole.CORPORATE_MANAGER, corporateTenantId: T1.id, corporateRole: 'FINANCE' };

/** v1 from 1 Oct IST; v2 from 16 Nov 00:00 IST (= 15 Nov 18:30 UTC). */
const CARD_V1 = {
  tenantId: T1.id,
  vehicleCategory: 'SEDAN',
  baseFarePaise: '40000',
  baseDistanceMeters: 10000,
  perKmPaise: '2500',
  perExtraStopPaise: '1000',
  minimumPaise: '50000',
  noShowPaise: '5000',
  cancellationPaise: '30000',
  effectiveFrom: '2026-09-30T18:30:00.000Z',
};
const CARD_V2 = {
  ...CARD_V1,
  baseFarePaise: '45000',
  perKmPaise: '3000',
  noShowPaise: '6000',
  cancellationPaise: '35000',
  effectiveFrom: '2026-11-15T18:30:00.000Z',
};

/** Independent re-statement of the card formula (not the production helper). */
function expectedTrip(card: typeof CARD_V1, km: number, stops: number, noShows: number): bigint {
  const extraKm = BigInt(Math.max(0, km - 10));
  const metered = BigInt(card.baseFarePaise) + extraKm * BigInt(card.perKmPaise) + BigInt(stops - 1) * BigInt(card.perExtraStopPaise);
  const minimum = BigInt(card.minimumPaise);
  return (metered < minimum ? minimum : metered) + BigInt(noShows) * BigInt(card.noShowPaise);
}

const sign = (raw: string) => createHmac('sha256', SECRET).update(raw).digest('hex');

function build() {
  const db = new FakeDb();
  for (const t of [T1, T2]) db.insert('corporateTenant', { ...t, gstin: null });
  db.insert('corporateOffice', { id: 'off-1', tenantId: T1.id, code: 'HQ', name: 'HQ', addressText: 'Hyderabad' });
  db.insert('corporateOffice', { id: 'off-2', tenantId: T2.id, code: 'HQ', name: 'HQ', addressText: 'Pune' });
  for (const d of ['drv-1', 'drv-2', 'drv-3']) db.insert('driver', { id: d, userId: `u-${d}`, fullName: d, phone: null });

  const notifications = makeNotifications();
  const audit = makeAudit();
  const provider = new MockPayoutProviderAdapter();
  const rateCards = new RateCardService(db as any);
  const payouts = new CorporatePayoutService(db as any, notifications as any, audit as any, provider);
  const billing = new CorporateBillingService(db as any, notifications as any, audit as any, rateCards, payouts);
  const rateAdmin = new CorporateRateCardAdminService(db as any, audit as any, rateCards);
  const disputes = new CorporateInvoiceDisputeService(db as any, notifications as any, audit as any);
  const billingController = new CorporateBillingController(billing, payouts, disputes);
  const rateController = new CorporateRateCardController(rateAdmin);
  const webhook = new CorporatePayoutWebhookController(payouts);

  let seq = 0;
  const addRoute = (o: { at: string; km: number; stops?: number; noShows?: number; status?: string; updatedAt?: string; tenantId?: string }) => {
    const id = `route-${++seq}`;
    const at = new Date(o.at);
    db.insert('corporateRoute', {
      id,
      tenantId: o.tenantId ?? T1.id,
      officeId: o.tenantId === T2.id ? 'off-2' : 'off-1',
      shiftDate: new Date(`${o.at.slice(0, 10)}T00:00:00.000Z`),
      shiftTime: '08:00',
      direction: 'LOGIN',
      vehicleCategory: 'SEDAN',
      maxCapacity: 4,
      assignedPassengerCount: o.stops ?? 2,
      targetPickup1Time: at,
      targetOfficeArrivalTime: new Date(at.getTime() + 3600_000),
      estDistanceMeters: o.km * 1000,
      estDurationSeconds: 3600,
      status: o.status ?? 'COMPLETED',
      driverId: 'drv-1',
      updatedAt: o.updatedAt ? new Date(o.updatedAt) : at,
    });
    const stops = o.stops ?? 2;
    for (let i = 0; i < stops; i++) {
      db.insert('corporateRouteStop', {
        id: `${id}-s${i + 1}`,
        routeId: id,
        stopSequence: i + 1,
        stopType: 'PICKUP',
        status: i < (o.noShows ?? 0) ? 'NO_SHOW' : 'BOARDED',
      });
    }
    return id;
  };

  let earnSeq = 0;
  const addEarning = (driverId: string, paise: bigint) =>
    db.insert('corporateDriverEarning', {
      id: `earn-${++earnSeq}`,
      driverId,
      routeId: `route-x-${earnSeq}`,
      routeFarePaise: paise,
      totalEarnedPaise: paise,
      payoutStatus: 'UNPAID',
      payoutBatchId: null,
      createdAt: new Date(Date.UTC(2026, 10, 1, 0, earnSeq)),
    }).id as string;

  /** Signed callback through the real controller (raw bytes as received). */
  const callback = async (body: Record<string, unknown>, signature?: string | null) => {
    const raw = JSON.stringify(body);
    return webhook.providerCallback({ rawBody: Buffer.from(raw) }, JSON.parse(raw), signature === null ? undefined : signature ?? sign(raw));
  };

  return { db, provider, rateCards, payouts, billing, rateAdmin, disputes, billingController, rateController, webhook, addRoute, addEarning, callback, audit, notifications };
}

function ctx(controller: any, method: string, req: any): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => controller.prototype[method],
    getClass: () => controller,
  } as unknown as ExecutionContext;
}
const req = (user: any, init: { params?: any; query?: any; body?: any } = {}) =>
  ({ user, params: {}, query: {}, body: {}, headers: {}, ...init }) as any;

/** Approve with a different checker, then submit. */
async function approvedAndSubmitted(env: ReturnType<typeof build>, key = 'batch-key-0001') {
  const batch: any = await env.billing.createPayoutBatch({}, admin.id, key);
  await env.billing.approvePayoutBatch(batch.id, checker.id);
  const submitted = await env.payouts.submitBatch(batch.id, checker.id);
  return { batchId: batch.id as string, submitted };
}

const payoutsOf = (db: FakeDb, batchId: string) =>
  db.all('corporatePayout').filter((p) => p.batchId === batchId && p.kind === 'PAYOUT');

beforeEach(() => {
  process.env.CORPORATE_PAYOUT_WEBHOOK_SECRET = SECRET;
});
afterAll(() => {
  delete process.env.CORPORATE_PAYOUT_WEBHOOK_SECRET;
});

// ---------------------------------------------------------------------------
// A. Rate cards
// ---------------------------------------------------------------------------

describe('A. versioned rate cards (corporate-rate-card.controller)', () => {
  it('a new version closes the previous version at its effectiveFrom and both stay listed', async () => {
    const env = build();
    const v1: any = await env.rateController.createCorporateCard(CARD_V1 as any, req(admin));
    const v2: any = await env.rateController.createCorporateCard(CARD_V2 as any, req(admin));
    expect([v1.version, v2.version]).toEqual([1, 2]);

    const stored = env.db.tables.corporateRateCard.get(v1.id)!;
    expect(stored.effectiveTo.toISOString()).toBe(CARD_V2.effectiveFrom);
    expect(v2.effectiveTo).toBeNull();

    const list: any[] = await env.rateController.listCorporateCards(req(admin), T1.id, undefined, '2026-11-10T00:00:00.000Z');
    expect(list.map((c) => [c.version, c.inEffect])).toEqual([[2, false], [1, true]]);
    // Selection is the one RateCardService uses for invoices.
    expect((await env.rateCards.findClientRateCard(T1.id, 'sedan', new Date('2026-11-15T18:29:59.000Z')))!.id).toBe(v1.id);
    expect((await env.rateCards.findClientRateCard(T1.id, 'SEDAN', new Date('2026-11-15T18:30:00.000Z')))!.id).toBe(v2.id);
  });

  it('a version is never replaced: effectiveFrom at/before the previous version is 409; money must be integer paise', async () => {
    const env = build();
    await env.rateAdmin.createCorporateCard(CARD_V1 as any, admin.id);
    await expect(env.rateAdmin.createCorporateCard({ ...CARD_V2, effectiveFrom: CARD_V1.effectiveFrom } as any, admin.id)).rejects.toThrow(ConflictException);
    await expect(env.rateAdmin.createCorporateCard({ ...CARD_V2, perKmPaise: '25.5' } as any, admin.id)).rejects.toThrow(BadRequestException);
    expect(env.db.all('corporateRateCard')).toHaveLength(1);
  });

  it('a used version is never edited: closing it over already-invoiced trips is refused', async () => {
    const env = build();
    const v1: any = await env.rateAdmin.createCorporateCard(CARD_V1 as any, admin.id);
    env.addRoute({ at: '2026-11-20T02:30:00.000Z', km: 12 });
    await env.billing.generateInvoiceBatch({ tenantId: T1.id, billingPeriodStart: '2026-11-01', billingPeriodEnd: '2026-11-30' });
    const before = { ...env.db.tables.corporateRateCard.get(v1.id)! };

    // v2 from 16 Nov would re-price the 20 Nov trip already invoiced with v1.
    await expect(env.rateAdmin.createCorporateCard(CARD_V2 as any, admin.id)).rejects.toThrow(ConflictException);
    await expect(env.rateAdmin.retireCorporateCard(v1.id, { effectiveTo: '2026-11-18T00:00:00.000Z' }, admin.id)).rejects.toThrow(ConflictException);
    expect(env.db.tables.corporateRateCard.get(v1.id)).toEqual(before);

    // A cut after the last invoiced trip is fine.
    const v2: any = await env.rateAdmin.createCorporateCard({ ...CARD_V2, effectiveFrom: '2026-11-25T18:30:00.000Z' } as any, admin.id);
    expect(v2.version).toBe(2);
  });

  it('retire closes the window (history keeps its price) and is not repeatable', async () => {
    const env = build();
    const v1: any = await env.rateAdmin.createCorporateCard(CARD_V1 as any, admin.id);
    const retired: any = await env.rateAdmin.retireCorporateCard(v1.id, { effectiveTo: '2026-11-10T00:00:00.000Z' }, admin.id);
    expect(retired).toMatchObject({ isActive: false, version: 1 });
    expect(retired.retiredAt).toBeTruthy();

    const inside = await env.billing.resolveClientFare(T1.id, 'SEDAN', 12000, 1, { at: new Date('2026-11-05T02:30:00.000Z') });
    const after = await env.billing.resolveClientFare(T1.id, 'SEDAN', 12000, 1, { at: new Date('2026-11-12T02:30:00.000Z') });
    expect(inside.rateCardId).toBe(v1.id);
    expect(after.rateCardId).toBeUndefined(); // default fare (logged), never a retired card
    await expect(env.rateAdmin.retireCorporateCard(v1.id, {}, admin.id)).rejects.toThrow(ConflictException);
  });

  it('driver cards: cannot start in the past; a new version closes the previous one for dispatch lookups', async () => {
    const env = build();
    await expect(
      env.rateAdmin.createDriverCard({ basePayoutPaise: '30000', perKmPaise: '1800', effectiveFrom: '2026-01-01T00:00:00.000Z' }, admin.id),
    ).rejects.toThrow(BadRequestException);

    const t0 = Date.now() + 60_000;
    const d1: any = await env.rateAdmin.createDriverCard({ basePayoutPaise: '30000', perKmPaise: '1800', effectiveFrom: new Date(t0).toISOString() }, admin.id);
    const d2: any = await env.rateAdmin.createDriverCard({ basePayoutPaise: '32000', perKmPaise: '2000', effectiveFrom: new Date(t0 + 3600_000).toISOString() }, admin.id);
    expect(env.db.tables.corporateDriverRateCard.get(d1.id)!.effectiveTo.getTime()).toBe(t0 + 3600_000);
    expect((await env.rateCards.findDriverRateCard('SEDAN', new Date(t0 + 1000)))!.id).toBe(d1.id);
    expect((await env.rateCards.findDriverRateCard('SEDAN', new Date(t0 + 3600_000)))!.id).toBe(d2.id);
    expect((await env.billing.resolveDriverPayout('SEDAN', 15000, new Date(t0 + 3600_000))).totalPayoutPaise).toBe(32000n + 5n * 2000n);
  });

  it('corporate roles read only their own tenant corporate card; driver cards and all writes are ADMIN-only; there is no edit route', async () => {
    const env = build();
    await env.rateAdmin.createCorporateCard(CARD_V1 as any, admin.id);
    await env.rateAdmin.createCorporateCard({ ...CARD_V1, tenantId: T2.id } as any, admin.id);
    const guard = new CorporateAccessGuard(new Reflector(), env.db as any);

    const own = req(corpAdmin1, { query: {} });
    await expect(guard.canActivate(ctx(CorporateRateCardController, 'listCorporateCards', own))).resolves.toBe(true);
    expect(own.query.tenantId).toBe(T1.id);
    const rows: any[] = await env.rateController.listCorporateCards(own, own.query.tenantId);
    expect(rows.map((r) => r.tenantId)).toEqual([T1.id]);

    await expect(
      guard.canActivate(ctx(CorporateRateCardController, 'listCorporateCards', req(corpAdmin1, { query: { tenantId: T2.id } }))),
    ).rejects.toThrow(ForbiddenException);

    const roles = new RolesGuard(new Reflector());
    for (const m of ['listDriverCards', 'createDriverCard', 'retireDriverCard', 'createCorporateCard', 'retireCorporateCard']) {
      expect(Reflect.getMetadata(ROLES_KEY, (CorporateRateCardController.prototype as any)[m])).toEqual([UserRole.ADMIN]);
      expect(() => roles.canActivate(ctx(CorporateRateCardController, m, req(corpAdmin1)))).toThrow(ForbiddenException);
    }
    const methods = Object.getOwnPropertyNames(CorporateRateCardController.prototype)
      .map((n) => Reflect.getMetadata(METHOD_METADATA, (CorporateRateCardController.prototype as any)[n]))
      .filter((m) => m !== undefined);
    // RequestMethod: 0 GET, 1 POST, 2 PUT, 3 DELETE, 4 PATCH
    expect(methods.every((m) => m === 0 || m === 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// B. Invoice pricing
// ---------------------------------------------------------------------------

describe('B. generateInvoiceBatch prices every line from the card in effect on the trip date', () => {
  it('splits a mid-period change, applies minimum, extra stops, no-shows and late cancellation only', async () => {
    const env = build();
    const v1: any = await env.rateAdmin.createCorporateCard(CARD_V1 as any, admin.id);
    const v2: any = await env.rateAdmin.createCorporateCard(CARD_V2 as any, admin.id);
    const before = env.addRoute({ at: '2026-11-15T18:29:00.000Z', km: 20, stops: 3, noShows: 1 }); // v1 (23:59 IST 15 Nov)
    const after = env.addRoute({ at: '2026-11-16T02:30:00.000Z', km: 20, stops: 3, noShows: 1 }); // v2
    const short = env.addRoute({ at: '2026-11-03T02:30:00.000Z', km: 4, stops: 1 }); // minimum applies
    const late = env.addRoute({ at: '2026-11-20T02:30:00.000Z', km: 15, status: 'CANCELLED', updatedAt: '2026-11-20T00:30:00.000Z' });
    env.addRoute({ at: '2026-11-21T02:30:00.000Z', km: 15, status: 'CANCELLED', updatedAt: '2026-11-19T00:00:00.000Z' }); // early

    const inv: any = await env.billing.generateInvoiceBatch({ tenantId: T1.id, billingPeriodStart: '2026-11-01', billingPeriodEnd: '2026-11-30', gstRatePct: 5 });
    const line = (routeId: string) => inv.lines.find((l: any) => l.routeId === routeId);

    expect(line(before)).toMatchObject({ rateCardId: v1.id, rateCardVersion: 1, noShowCount: 1, lineType: 'TRIP', amountPaise: String(expectedTrip(CARD_V1, 20, 3, 1)) });
    expect(line(after)).toMatchObject({ rateCardId: v2.id, rateCardVersion: 2, amountPaise: String(expectedTrip(CARD_V2, 20, 3, 1)) });
    expect(line(short).amountPaise).toBe(CARD_V1.minimumPaise);
    expect(line(late)).toMatchObject({ lineType: 'CANCELLATION', amountPaise: CARD_V2.cancellationPaise, rateCardVersion: 2 });
    expect(inv.lines).toHaveLength(4); // early cancellation is never billed

    const subtotal = expectedTrip(CARD_V1, 20, 3, 1) + expectedTrip(CARD_V2, 20, 3, 1) + 50000n + 35000n;
    expect(inv.subtotalPaise).toBe(String(subtotal));
    expect(inv.gstPaise).toBe(String((subtotal * 5n) / 100n));
    expect(() => JSON.stringify(inv)).not.toThrow();

    // Routes are billed once.
    await expect(env.billing.generateInvoiceBatch({ tenantId: T1.id, billingPeriodStart: '2026-11-01', billingPeriodEnd: '2026-11-30' })).rejects.toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// C. Payout batches, provider, callbacks, reconciliation
// ---------------------------------------------------------------------------

describe('C. payout batch FSM', () => {
  it('creates one PENDING payout per driver with a unique idempotencyKey; batch totals equal the rows', async () => {
    const env = build();
    env.addEarning('drv-1', 40000n);
    env.addEarning('drv-1', 50001n);
    env.addEarning('drv-2', 60000n);
    const res: any = await env.billingController.createPayoutBatch({ idempotencyKey: 'batch-key-0001' }, req(admin));

    expect(res).toMatchObject({ status: 'SUBMITTED', totalDrivers: 2, totalRoutes: 3, createdByUserId: admin.id });
    const rows = payoutsOf(env.db, res.id);
    expect(rows.map((p) => [p.driverId, p.status, p.grossPaise, p.tdsPaise, p.netPaise]).sort()).toEqual([
      ['drv-1', 'PENDING', 90001n, 900n, 89101n],
      ['drv-2', 'PENDING', 60000n, 600n, 59400n],
    ]);
    expect(new Set(rows.map((p) => p.idempotencyKey)).size).toBe(2);
    expect(res.netPayoutPaise).toBe(String(89101n + 59400n));
    expect(env.db.all('corporateDriverEarning').every((e) => e.payoutStatus === 'PROCESSING' && e.payoutBatchId === res.id)).toBe(true);
  });

  it('same idempotency key -> same batch; concurrent makers never claim the same earning twice', async () => {
    const env = build();
    env.addEarning('drv-1', 40000n);
    const a: any = await env.billing.createPayoutBatch({}, admin.id, 'batch-key-0001');
    const b: any = await env.billing.createPayoutBatch({}, admin.id, 'batch-key-0001');
    expect(b.id).toBe(a.id);
    await expect(env.billing.createPayoutBatch({}, admin.id, 'batch-key-0002')).rejects.toThrow(BadRequestException);
    expect(env.db.all('corporatePayoutBatch')).toHaveLength(1);
    expect(env.db.all('corporatePayout')).toHaveLength(1);
  });

  it('maker == checker is 403; a different checker approves; approve twice is refused', async () => {
    const env = build();
    env.addEarning('drv-1', 40000n);
    const batch: any = await env.billing.createPayoutBatch({}, admin.id, 'batch-key-0001');
    await expect(env.billingController.approvePayoutBatch(batch.id, req(admin))).rejects.toThrow(ForbiddenException);
    expect(env.db.tables.corporatePayoutBatch.get(batch.id)!.status).toBe('SUBMITTED');

    const approved: any = await env.billingController.approvePayoutBatch(batch.id, req(checker));
    expect(approved).toMatchObject({ status: 'APPROVED', approvedByUserId: checker.id });
    await expect(env.billing.approvePayoutBatch(batch.id, 'u-third')).rejects.toThrow(BadRequestException);
  });

  it('submit is refused before approval; after approval it sends every payout once and marks nothing PAID', async () => {
    const env = build();
    env.addEarning('drv-1', 40000n);
    env.addEarning('drv-2', 70000n);
    const batch: any = await env.billing.createPayoutBatch({}, admin.id, 'batch-key-0001');
    await expect(env.billingController.submitPayoutBatch(batch.id, req(checker))).rejects.toThrow(BadRequestException);

    await env.billing.approvePayoutBatch(batch.id, checker.id);
    const res: any = await env.billingController.submitPayoutBatch(batch.id, req(checker));
    expect(res.status).toBe('PROCESSING');
    expect(res.payouts.map((p: any) => p.status)).toEqual(['PROCESSING', 'PROCESSING']);
    expect(res.payouts.every((p: any) => p.providerPayoutId && !p.paidAt)).toBe(true);
    expect(env.provider.transfers.size).toBe(2);
    expect(env.db.all('corporateDriverEarning').every((e) => e.payoutStatus === 'PROCESSING')).toBe(true);
    expect(() => JSON.stringify(res)).not.toThrow();
  });

  it('duplicate / concurrent submit never creates a second transfer', async () => {
    const env = build();
    env.addEarning('drv-1', 40000n);
    const { batchId } = await approvedAndSubmitted(env);
    await Promise.all([env.payouts.submitBatch(batchId), env.payouts.submitBatch(batchId)]);
    expect(env.provider.calls).toHaveLength(1);
    expect(env.provider.transfers.size).toBe(1);
  });

  it('a rejected payout is FAILED; retry reuses the same idempotencyKey and the batch returns to PROCESSING', async () => {
    const env = build();
    env.addEarning('drv-1', 40000n);
    env.addEarning('drv-2', 70000n);
    env.provider.rejectNextFor('drv-2');
    const { batchId } = await approvedAndSubmitted(env);
    const failed = payoutsOf(env.db, batchId).find((p) => p.driverId === 'drv-2')!;
    expect(failed).toMatchObject({ status: 'FAILED', failureReason: 'MOCK_BENEFICIARY_REJECTED', attemptCount: 1 });
    expect(env.db.tables.corporatePayoutBatch.get(batchId)!.status).toBe('PROCESSING'); // drv-1 still in flight

    await env.payouts.submitBatch(batchId, checker.id);
    const keys = env.provider.calls.filter((c) => c.driverId === 'drv-2').map((c) => c.idempotencyKey);
    expect(keys).toEqual([failed.idempotencyKey, failed.idempotencyKey]);
    expect(env.db.tables.corporatePayout.get(failed.id)).toMatchObject({ status: 'PROCESSING', attemptCount: 2 });
    expect(env.provider.calls.filter((c) => c.driverId === 'drv-1')).toHaveLength(1); // in-flight payout not re-sent
  });

  it('legacy processPayoutBatch submits through the provider and never marks PAID', async () => {
    const env = build();
    env.addEarning('drv-1', 40000n);
    const batch: any = await env.billing.createPayoutBatch({}, admin.id, 'batch-key-0001');
    await env.billing.approvePayoutBatch(batch.id, checker.id);
    const res: any = await env.billing.processPayoutBatch(batch.id, 'IMPS-CLAIMED-BY-CALLER');
    expect(res.status).toBe('PROCESSING');
    expect(env.db.all('corporatePayout').some((p) => p.status === 'PAID')).toBe(false);
    expect(env.db.all('corporateDriverEarning').some((e) => e.payoutStatus === 'PAID')).toBe(false);
  });
});

describe('C2. signed provider callback', () => {
  it('has no JWT/role guards, and a bad, missing or unconfigured signature is 401 with no effect', async () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, CorporatePayoutWebhookController)).toBeUndefined();
    expect(Reflect.getMetadata(GUARDS_METADATA, CorporatePayoutWebhookController.prototype.providerCallback)).toBeUndefined();

    const env = build();
    env.addEarning('drv-1', 40000n);
    const { batchId } = await approvedAndSubmitted(env);
    const p = payoutsOf(env.db, batchId)[0];
    const body = { eventId: 'evt-1', idempotencyKey: p.idempotencyKey, status: 'PAID', amountPaise: String(p.netPaise) };

    await expect(env.callback(body, 'deadbeef')).rejects.toThrow(UnauthorizedException);
    await expect(env.callback(body, sign(JSON.stringify(body)).replace(/.$/, (c) => (c === '0' ? '1' : '0')))).rejects.toThrow(UnauthorizedException);
    await expect(env.callback(body, null)).rejects.toThrow(UnauthorizedException);
    // Signature over different bytes than were received (tampered body).
    await expect(env.callback({ ...body, amountPaise: '1' }, sign(JSON.stringify(body)))).rejects.toThrow(UnauthorizedException);
    delete process.env.CORPORATE_PAYOUT_WEBHOOK_SECRET;
    await expect(env.callback(body)).rejects.toThrow(UnauthorizedException);

    expect(env.db.tables.corporatePayout.get(p.id)!.status).toBe('PROCESSING');
    expect(env.db.all('corporatePayoutProviderEvent')).toHaveLength(0);
  });

  it('PAID confirmation marks the payout and its earnings PAID; a replayed eventId is ignored', async () => {
    const env = build();
    env.addEarning('drv-1', 40000n);
    env.addEarning('drv-1', 10000n);
    const { batchId } = await approvedAndSubmitted(env);
    const p = payoutsOf(env.db, batchId)[0];
    const body = { eventId: 'evt-paid-1', idempotencyKey: p.idempotencyKey, status: 'PAID', amountPaise: String(p.netPaise), providerReference: 'UTR123' };

    const first: any = await env.callback(body);
    expect(first).toMatchObject({ received: true, duplicate: false, outcome: 'APPLIED' });
    expect(env.db.tables.corporatePayout.get(p.id)).toMatchObject({ status: 'PAID', providerReference: 'UTR123' });
    expect(env.db.all('corporateDriverEarning').every((e) => e.payoutStatus === 'PAID')).toBe(true);
    expect(env.db.tables.corporatePayoutBatch.get(batchId)!.status).toBe('PAID');

    const auditCalls = env.audit.log.mock.calls.length;
    const replay: any = await env.callback(body);
    expect(replay).toMatchObject({ received: true, duplicate: true });
    expect(env.db.all('corporatePayoutProviderEvent')).toHaveLength(1);
    expect(env.audit.log.mock.calls.length).toBe(auditCalls);
  });

  it('REVERSED adds a compensating record, keeps the original, and makes the earnings payable again', async () => {
    const env = build();
    env.addEarning('drv-1', 40000n);
    const { batchId } = await approvedAndSubmitted(env);
    const p = payoutsOf(env.db, batchId)[0];
    await env.callback({ eventId: 'evt-a', idempotencyKey: p.idempotencyKey, status: 'PAID', amountPaise: String(p.netPaise) });
    const res: any = await env.callback({ eventId: 'evt-b', idempotencyKey: p.idempotencyKey, status: 'REVERSED', amountPaise: String(p.netPaise) });
    expect(res.outcome).toBe('APPLIED');

    const rows = env.db.all('corporatePayout');
    expect(rows).toHaveLength(2);
    const reversal = rows.find((r) => r.kind === 'REVERSAL')!;
    expect(reversal).toMatchObject({ reversalOfId: p.id, status: 'REVERSED', netPaise: -p.netPaise, grossPaise: -p.grossPaise, idempotencyKey: `${p.idempotencyKey}:reversal` });
    expect(env.db.tables.corporatePayout.get(p.id)).toMatchObject({ status: 'REVERSED', kind: 'PAYOUT', netPaise: p.netPaise });
    expect(env.db.all('corporateDriverEarning')[0]).toMatchObject({ payoutStatus: 'UNPAID', payoutBatchId: null });

    // A second reversal of the same payout is impossible.
    const again: any = await env.callback({ eventId: 'evt-c', idempotencyKey: p.idempotencyKey, status: 'REVERSED', amountPaise: String(p.netPaise) });
    expect(again.outcome).toBe('NOOP_SAME_STATE');
    expect(env.db.all('corporatePayout')).toHaveLength(2);
  });

  it('callback body is validated after the signature (400), and PAID needs an amount', async () => {
    const env = build();
    await expect(env.callback({ eventId: 'evt-x', idempotencyKey: 'k', status: 'SETTLED' })).rejects.toThrow(BadRequestException);
    await expect(env.callback({ eventId: 'evt-x', idempotencyKey: 'k', status: 'PAID' })).rejects.toThrow(BadRequestException);
    await expect(env.callback({ eventId: 'evt-x', status: 'FAILED' })).rejects.toThrow(BadRequestException);
  });
});

describe('C3. reconciliation', () => {
  it('lists amount / status mismatches and unmatched confirmations; a clean window is clean', async () => {
    const env = build();
    env.addEarning('drv-1', 40000n);
    env.addEarning('drv-2', 70000n);
    env.addEarning('drv-3', 20000n);
    const { batchId } = await approvedAndSubmitted(env);
    const [p1, p2, p3] = ['drv-1', 'drv-2', 'drv-3'].map((d) => payoutsOf(env.db, batchId).find((p) => p.driverId === d)!);
    const from = new Date(Date.now() - 60_000).toISOString();

    await env.callback({ eventId: 'e1', idempotencyKey: p1.idempotencyKey, status: 'PAID', amountPaise: String(p1.netPaise) });
    const clean: any = await env.billingController.getReconciliation(from, new Date(Date.now() + 60_000).toISOString());
    expect(clean).toMatchObject({ clean: true, mismatches: [], unmatchedConfirmations: [] });

    const mm: any = await env.callback({ eventId: 'e2', idempotencyKey: p2.idempotencyKey, status: 'PAID', amountPaise: String(p2.netPaise - 1n) });
    expect(mm.outcome).toBe('AMOUNT_MISMATCH');
    await env.callback({ eventId: 'e3', idempotencyKey: p3.idempotencyKey, status: 'PAID', amountPaise: String(p3.netPaise) });
    const illegal: any = await env.callback({ eventId: 'e4', idempotencyKey: p3.idempotencyKey, status: 'FAILED' });
    expect(illegal.outcome).toBe('ILLEGAL_TRANSITION');
    await env.callback({ eventId: 'e5', idempotencyKey: 'cpo:unknown', status: 'PAID', amountPaise: '100' });

    const rec: any = await env.billingController.getReconciliation(from, new Date(Date.now() + 60_000).toISOString());
    expect(rec.clean).toBe(false);
    expect(rec.mismatches.map((m: any) => [m.driverId, m.reason, m.payoutStatus, m.providerStatus]).sort()).toEqual([
      ['drv-2', 'AMOUNT_MISMATCH', 'PROCESSING', 'PAID'],
      ['drv-3', 'STATUS_MISMATCH', 'PAID', 'FAILED'],
    ]);
    expect(rec.unmatchedConfirmations).toEqual([expect.objectContaining({ eventId: 'e5', idempotencyKey: 'cpo:unknown' })]);
    expect(env.db.tables.corporatePayout.get(p2.id)!.status).toBe('PROCESSING'); // mismatch never applied
    expect(() => JSON.stringify(rec)).not.toThrow();
  });

  it('rejects missing, inverted and oversized ranges', async () => {
    const env = build();
    await expect(env.payouts.getReconciliation(undefined, '2026-11-30')).rejects.toThrow(BadRequestException);
    await expect(env.payouts.getReconciliation('2026-11-30', '2026-11-01')).rejects.toThrow(BadRequestException);
    await expect(env.payouts.getReconciliation('2026-01-01', '2026-11-30')).rejects.toThrow(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// D. Disputes and credit notes
// ---------------------------------------------------------------------------

describe('D. invoice disputes and credit notes', () => {
  async function invoiced(env: ReturnType<typeof build>) {
    await env.rateAdmin.createCorporateCard(CARD_V1 as any, admin.id);
    env.addRoute({ at: '2026-11-03T02:30:00.000Z', km: 20 });
    env.addRoute({ at: '2026-11-04T02:30:00.000Z', km: 30 });
    const inv: any = await env.billing.generateInvoiceBatch({ tenantId: T1.id, billingPeriodStart: '2026-11-01', billingPeriodEnd: '2026-11-30', gstRatePct: 18 });
    return inv;
  }

  it('corporate roles may dispute only their own tenant invoices (FINANCE included)', async () => {
    const env = build();
    const inv = await invoiced(env);
    const other: any = env.db.insert('corporateInvoice', { id: 'inv-t2', tenantId: T2.id, invoiceNumber: 'INV-T2', subtotalPaise: 1000n, gstPaise: 50n, totalAmountPaise: 1050n, status: 'ISSUED' });
    const guard = new CorporateAccessGuard(new Reflector(), env.db as any);

    await expect(guard.canActivate(ctx(CorporateBillingController, 'raiseDispute', req(corpAdmin1, { params: { id: inv.id } })))).resolves.toBe(true);
    await expect(guard.canActivate(ctx(CorporateBillingController, 'raiseDispute', req(finance1, { params: { id: inv.id } })))).resolves.toBe(true);
    await expect(guard.canActivate(ctx(CorporateBillingController, 'raiseDispute', req(corpAdmin1, { params: { id: other.id } })))).rejects.toThrow(ForbiddenException);
    const readOnly = { ...finance1, corporateRole: 'READ_ONLY' };
    await expect(guard.canActivate(ctx(CorporateBillingController, 'raiseDispute', req(readOnly, { params: { id: inv.id } })))).rejects.toThrow(ForbiddenException);
    for (const m of ['acceptDispute', 'rejectDispute']) {
      expect(Reflect.getMetadata(ROLES_KEY, (CorporateBillingController.prototype as any)[m])).toEqual([UserRole.ADMIN]);
    }
  });

  it('accept issues one credit note with the invoice GST ratio; the issued invoice is never edited', async () => {
    const env = build();
    const inv = await invoiced(env);
    const invoiceBefore = { ...env.db.tables.corporateInvoice.get(inv.id)! };
    const d: any = await env.billingController.raiseDispute(inv.id, { reason: 'Cab arrived 40 min late', claimedAmountPaise: '20000' }, req(corpAdmin1));
    expect(d).toMatchObject({ status: 'OPEN', tenantId: T1.id, claimedAmountPaise: '20000' });

    const res: any = await env.billingController.acceptDispute(d.id, { approvedAmountPaise: '15000', note: 'partial' }, req(admin));
    expect(res.dispute).toMatchObject({ status: 'ACCEPTED', approvedAmountPaise: '15000', resolvedByUserId: admin.id });
    expect(res.creditNote).toMatchObject({ subtotalPaise: '15000', gstPaise: String((15000n * 18n) / 100n), totalPaise: String(15000n + 2700n) });
    expect(res.creditNote.creditNoteNumber).toBe(`CN-${inv.invoiceNumber}-01`);
    await expect(env.disputes.acceptDispute(d.id, {}, admin.id)).rejects.toThrow(ConflictException);
    await expect(env.disputes.rejectDispute(d.id, { note: 'late' }, admin.id)).rejects.toThrow(ConflictException);

    expect(env.db.tables.corporateInvoice.get(inv.id)).toEqual(invoiceBefore);
    expect(env.db.all('corporateCreditNote')).toHaveLength(1);
  });

  it('credits can never exceed the invoice subtotal; reject needs a reason; lists are tenant-scoped', async () => {
    const env = build();
    const inv = await invoiced(env);
    const subtotal = BigInt(inv.subtotalPaise);
    await expect(env.disputes.raiseDispute(inv.id, { reason: 'whole thing wrong', claimedAmountPaise: String(subtotal + 1n) }, corpAdmin1.id)).rejects.toThrow(BadRequestException);

    const a: any = await env.disputes.raiseDispute(inv.id, { reason: 'first claim here', claimedAmountPaise: String(subtotal - 100n) }, corpAdmin1.id);
    const b: any = await env.disputes.raiseDispute(inv.id, { reason: 'second claim here', claimedAmountPaise: '500' }, corpAdmin1.id);
    await env.disputes.acceptDispute(a.id, {}, admin.id);
    await expect(env.disputes.acceptDispute(b.id, {}, admin.id)).rejects.toThrow(ConflictException);
    await expect(env.disputes.rejectDispute(b.id, {}, admin.id)).rejects.toThrow(BadRequestException);
    const rejected: any = await env.disputes.rejectDispute(b.id, { note: 'already credited' }, admin.id);
    expect(rejected.status).toBe('REJECTED');

    env.db.insert('corporateInvoiceDispute', { id: 'disp-t2', tenantId: T2.id, invoiceId: 'inv-x', reason: 'x', claimedAmountPaise: 1n, status: 'OPEN', createdAt: new Date() });
    const guard = new CorporateAccessGuard(new Reflector(), env.db as any);
    const r = req(corpAdmin1, { query: {} });
    await guard.canActivate(ctx(CorporateBillingController, 'listDisputes', r));
    const list: any[] = await env.billingController.listDisputes(r, r.query.tenantId);
    expect(list.map((x) => x.tenantId)).toEqual([T1.id, T1.id]);
    const notes: any[] = await env.billingController.listCreditNotes(r, r.query.tenantId);
    expect(notes).toHaveLength(1);
    await expect(guard.canActivate(ctx(CorporateBillingController, 'listCreditNotes', req(corpAdmin1, { query: { tenantId: T2.id } })))).rejects.toThrow(ForbiddenException);
  });
});

// ---------------------------------------------------------------------------
// E. No driver payout / margin in corporate-facing responses
// ---------------------------------------------------------------------------

describe('E. corporate-facing responses never include driver payout or margin fields', () => {
  it('scans every serialized corporate-readable billing response', async () => {
    const env = build();
    await env.rateAdmin.createCorporateCard(CARD_V1 as any, admin.id);
    const routeId = env.addRoute({ at: '2026-11-03T02:30:00.000Z', km: 20, noShows: 1 });
    env.db.insert('corporateDriverEarning', { id: 'earn-r', driverId: 'drv-1', routeId, totalEarnedPaise: 30000n, routeFarePaise: 30000n, payoutStatus: 'UNPAID', createdAt: new Date() });
    const inv: any = await env.billing.generateInvoiceBatch({ tenantId: T1.id, billingPeriodStart: '2026-11-01', billingPeriodEnd: '2026-11-30' });
    const corp = req(corpAdmin1, { query: { tenantId: T1.id } });
    const dispute: any = await env.billingController.raiseDispute(inv.id, { reason: 'please review the no show', claimedAmountPaise: '5000' }, corp);
    await env.disputes.acceptDispute(dispute.id, {}, admin.id);

    const responses: Record<string, unknown> = {
      listInvoices: await env.billingController.listInvoices(T1.id, undefined, undefined, undefined, corp),
      getInvoiceById: await env.billingController.getInvoiceById(inv.id, corp),
      raiseDispute: dispute,
      listDisputes: await env.billingController.listDisputes(corp, T1.id),
      listCreditNotes: await env.billingController.listCreditNotes(corp, T1.id),
      listCorporateCards: await env.rateController.listCorporateCards(corp, T1.id),
      // Service-level views (before the controller filter) are already clean by construction.
      svcInvoice: await env.billing.getInvoiceById(inv.id),
      svcInvoices: await env.billing.listInvoices(T1.id),
      svcCards: await env.rateAdmin.listCorporateCards(T1.id),
      svcDisputes: await env.disputes.listDisputes(T1.id),
    };
    for (const [name, value] of Object.entries(responses)) {
      const serialized = JSON.parse(JSON.stringify(value));
      expect({ name, leaks: findForbiddenKeys(serialized) }).toEqual({ name, leaks: [] });
      expect(JSON.stringify(value)).not.toMatch(/payout|earning|margin|tdsPaise|driverId/i);
    }

    // Control: the scanner does flag an admin payout view.
    env.addEarning('drv-1', 40000n);
    const batch: any = await env.billing.createPayoutBatch({}, admin.id, 'batch-key-0009');
    expect(findForbiddenKeys(JSON.parse(JSON.stringify(await env.payouts.getBatch(batch.id)))).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// F. One-month simulation, single tenant
// ---------------------------------------------------------------------------

describe('F. one-month simulation (single tenant, November 2026)', () => {
  it('rate change mid-month -> invoice -> dispute -> credit note -> maker-checker -> submit with a failure -> retry -> callbacks -> clean reconciliation', async () => {
    const env = build();
    const from = new Date(Date.now() - 60_000).toISOString();

    // 1. Rate changes mid-period (v2 from 16 Nov IST).
    const v1: any = await env.rateAdmin.createCorporateCard(CARD_V1 as any, admin.id);
    const v2: any = await env.rateAdmin.createCorporateCard(CARD_V2 as any, admin.id);

    // 30 days x (login 08:00 IST + logout 18:00 IST), 3 drivers in rotation; every 7th trip one no-show.
    let expectedSubtotal = 0n;
    let trip = 0;
    const drivers = ['drv-1', 'drv-2', 'drv-3'];
    const owed = new Map<string, bigint>();
    for (let day = 1; day <= 30; day++) {
      const dd = String(day).padStart(2, '0');
      for (const utc of ['02:30', '12:30']) {
        trip++;
        const at = `2026-11-${dd}T${utc}:00.000Z`;
        const km = 8 + (trip % 17);
        const noShows = trip % 7 === 0 ? 1 : 0;
        env.addRoute({ at, km, stops: 3, noShows });
        const card = new Date(at) >= new Date(CARD_V2.effectiveFrom) ? CARD_V2 : CARD_V1;
        expectedSubtotal += expectedTrip(card, km, 3, noShows);
        const d = drivers[trip % 3];
        const pay = (await env.billing.resolveDriverPayout('SEDAN', km * 1000, new Date(at))).totalPayoutPaise;
        env.addEarning(d, pay);
        owed.set(d, (owed.get(d) ?? 0n) + pay);
      }
    }

    const inv: any = await env.billing.generateInvoiceBatch({ tenantId: T1.id, billingPeriodStart: '2026-11-01', billingPeriodEnd: '2026-11-30', gstRatePct: 5 });
    expect(inv.lines).toHaveLength(60);
    expect(inv.subtotalPaise).toBe(String(expectedSubtotal));
    const versions = inv.lines.map((l: any) => l.rateCardVersion);
    expect(versions.filter((v: number) => v === 1)).toHaveLength(30); // 1-15 Nov
    expect(versions.filter((v: number) => v === 2)).toHaveLength(30); // 16-30 Nov
    expect(new Set(inv.lines.map((l: any) => l.rateCardId))).toEqual(new Set([v1.id, v2.id]));

    // 2. Invoice -> dispute -> credit note.
    const dispute: any = await env.billingController.raiseDispute(inv.id, { reason: 'Two trips double counted', claimedAmountPaise: inv.lines[0].amountPaise }, req(corpAdmin1));
    const credit: any = await env.billingController.acceptDispute(dispute.id, { note: 'verified' }, req(admin));
    expect(BigInt(credit.creditNote.totalPaise)).toBe(BigInt(inv.lines[0].amountPaise) + (BigInt(inv.lines[0].amountPaise) * BigInt(inv.gstPaise)) / BigInt(inv.subtotalPaise));
    expect(env.db.tables.corporateInvoice.get(inv.id)!.subtotalPaise).toBe(expectedSubtotal);

    // 3. Payout batch: maker == checker rejected, a different checker approves.
    const batch: any = await env.billingController.createPayoutBatch({ idempotencyKey: 'nov-2026-payouts' }, req(admin));
    expect(batch.totalDrivers).toBe(3);
    expect(BigInt(batch.grossPaise)).toBe([...owed.values()].reduce((a, b) => a + b, 0n));
    await expect(env.billingController.approvePayoutBatch(batch.id, req(admin))).rejects.toThrow(ForbiddenException);
    await env.billingController.approvePayoutBatch(batch.id, req(checker));

    // 4. Submit: drv-2's payout fails and is retried with the same key.
    env.provider.rejectNextFor('drv-2');
    await env.billingController.submitPayoutBatch(batch.id, req(checker));
    const failed = payoutsOf(env.db, batch.id).find((p) => p.driverId === 'drv-2')!;
    expect(failed.status).toBe('FAILED');
    await env.billingController.submitPayoutBatch(batch.id, req(checker));
    expect(env.provider.calls.filter((c) => c.driverId === 'drv-2').map((c) => c.idempotencyKey)).toEqual([failed.idempotencyKey, failed.idempotencyKey]);
    expect(env.provider.transfers.size).toBe(3);
    expect(env.db.all('corporatePayout').some((p) => p.status === 'PAID')).toBe(false);

    // 5. Callbacks arrive (one replayed).
    for (const p of payoutsOf(env.db, batch.id)) {
      const body = { eventId: `evt-${p.driverId}`, providerPayoutId: p.providerPayoutId, status: 'PAID', amountPaise: String(p.netPaise), providerReference: `UTR-${p.driverId}` };
      expect(((await env.callback(body)) as any).outcome).toBe('APPLIED');
    }
    expect(((await env.callback({ eventId: 'evt-drv-1', providerPayoutId: 'x', status: 'PAID', amountPaise: '1' })) as any).duplicate).toBe(true);

    // 6. Reconciliation is clean; batch and every earning are PAID; nothing was deleted.
    const rec: any = await env.billingController.getReconciliation(from, new Date(Date.now() + 60_000).toISOString());
    expect(rec).toMatchObject({ clean: true, payoutsChecked: 3, confirmationsChecked: 3 });
    expect(env.db.tables.corporatePayoutBatch.get(batch.id)!.status).toBe('PAID');
    expect(env.db.all('corporateDriverEarning').every((e) => e.payoutStatus === 'PAID')).toBe(true);
    expect(env.db.all('corporatePayout')).toHaveLength(3);
    const net = payoutsOf(env.db, batch.id).reduce((a, p) => a + p.netPaise, 0n);
    expect(String(net)).toBe(batch.netPayoutPaise);
  });
});
