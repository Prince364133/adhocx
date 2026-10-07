import { BadRequestException, ConflictException, ForbiddenException, GoneException } from '@nestjs/common';
import { ZonalPricingService } from '../src/modules/pricing/zonal-pricing.service';
import { H3Service } from '../src/modules/locations/h3.service';
import { LOCALITY_MASTER, localityIdFor } from '../src/modules/pricing/zonal-pricing.constants';

/**
 * Acceptance tests for the Hyderabad corporate zonal rate card.
 * Test names reference the PRD acceptance IDs in users.pdf (V ATxx) and driver.pdf (D ATxx).
 */

// Independent transcription of the PDF tables (INR) used as the release check.
const PDF_VENDOR: Record<string, number[]> = {
  // zone: [HITEC Sedan, HITEC SUV, Kokapet Sedan, Kokapet SUV]
  EXTRA: [500, 700, 600, 800],
  ZONE_6: [600, 900, 700, 900],
  ZONE_5: [700, 1000, 800, 1100],
  ZONE_4: [800, 1100, 900, 1200],
  ZONE_3: [900, 1200, 1000, 1300],
  ZONE_2: [1000, 1300, 1100, 1400],
  ZONE_1: [1100, 1400, 1200, 1500],
};
const PDF_DRIVER: Record<string, number[]> = {
  EXTRA: [425, 595, 510, 680],
  ZONE_6: [510, 765, 595, 765],
  ZONE_5: [595, 850, 680, 935],
  ZONE_4: [680, 935, 765, 1020],
  ZONE_3: [765, 1020, 850, 1105],
  ZONE_2: [850, 1105, 935, 1190],
  ZONE_1: [935, 1190, 1020, 1275],
};
const PDF_ESCORT: Record<string, number[]> = {
  // zone: [HITEC Sedan, HITEC SUV, Kokapet Sedan, Kokapet SUV]
  EXTRA: [200, 300, 300, 400],
  ZONE_6: [200, 300, 300, 400],
  ZONE_5: [300, 400, 300, 400],
  ZONE_4: [300, 400, 300, 400],
  ZONE_3: [400, 500, 400, 500],
  ZONE_2: [400, 500, 400, 500],
  ZONE_1: [400, 500, 400, 500],
};

const PIN = {
  HITEC_OFFICE: { lat: 17.4435, lng: 78.3772 },
  KOKAPET_OFFICE: { lat: 17.385, lng: 78.3245 },
  MALAKPET: { lat: 17.3753, lng: 78.4983 },
  KUKATPALLY: { lat: 17.4849, lng: 78.4138 },
  SHAMIRPET: { lat: 17.604, lng: 78.5714 },
  GACHIBOWLI: { lat: 17.4401, lng: 78.3489 },
  TOLICHOWKI: { lat: 17.3986, lng: 78.4155 },
  BACHUPALLY: { lat: 17.543, lng: 78.365 },
  MOOSAPET: { lat: 17.47, lng: 78.425 },
};

const ADMIN = { userId: '00000000-0000-4000-8000-000000000001', role: 'ADMIN' };
const VENDOR = { userId: '00000000-0000-4000-8000-000000000002', role: 'VENDOR' };

function inbound(employee: { lat: number; lng: number }, office: { lat: number; lng: number }) {
  return { pickupLat: employee.lat, pickupLng: employee.lng, dropLat: office.lat, dropLng: office.lng, direction: 'INBOUND_TO_OFFICE' };
}
function outbound(office: { lat: number; lng: number }, employee: { lat: number; lng: number }) {
  return { pickupLat: office.lat, pickupLng: office.lng, dropLat: employee.lat, dropLng: employee.lng, direction: 'OUTBOUND_FROM_OFFICE' };
}

describe('ZonalPricingService (corporate zonal rate card)', () => {
  let service: ZonalPricingService;
  let db: any;
  let audit: any;
  let snapshots: Map<string, any>;
  let seq: number;

  beforeEach(() => {
    snapshots = new Map();
    seq = 0;
    db = {
      rateCardVersion: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'v' }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      localityMaster: {
        createMany: jest.fn().mockResolvedValue({ count: 240 }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      zonalQuoteSnapshot: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          const id = `00000000-0000-4000-9000-${String(++seq).padStart(12, '0')}`;
          const row = { id, requirementId: null, createdAt: new Date(), ...data };
          snapshots.set(id, row);
          return row;
        }),
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => snapshots.get(where.id) ?? null),
        updateMany: jest.fn().mockImplementation(async ({ where, data }: any) => {
          const row = snapshots.get(where.id);
          if (!row || row.requirementId !== null) return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        }),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(db)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new ZonalPricingService(db, audit, new H3Service());
  });

  const quote = (overrides: Record<string, unknown>, actor = VENDOR) =>
    service.createQuote(
      {
        officeHubId: 'HITEC_NANAKRAMGUDA',
        vehicleType: 'SEDAN',
        hasEscort: false,
        ...inbound(PIN.MALAKPET, PIN.HITEC_OFFICE),
        localityId: 'LOC_MALAKPET',
        ...overrides,
      } as any,
      actor,
    ) as Promise<any>;

  describe('Release check: all 28 matrix values match the PDFs', () => {
    it('vendor and driver cards equal users.pdf / driver.pdf for every hub, zone and vehicle', async () => {
      const vendor = await service.getVendorRateCard();
      const driver = await service.getDriverRateCard();
      let cells = 0;
      for (const zone of Object.keys(PDF_VENDOR)) {
        const [hs, hu, ks, ku] = PDF_VENDOR[zone];
        expect(vendor.matrix.HITEC_NANAKRAMGUDA[zone]).toMatchObject({ sedan: hs, suv: hu });
        expect(vendor.matrix.KOKAPET[zone]).toMatchObject({ sedan: ks, suv: ku });
        const [ehs, ehu, eks, eku] = PDF_ESCORT[zone];
        expect(vendor.matrix.HITEC_NANAKRAMGUDA[zone]).toMatchObject({ escortSedan: ehs, escortSuv: ehu });
        expect(vendor.matrix.KOKAPET[zone]).toMatchObject({ escortSedan: eks, escortSuv: eku });
        const [ds, du, dks, dku] = PDF_DRIVER[zone];
        expect(driver.matrix.HITEC_NANAKRAMGUDA[zone]).toEqual({ sedan: ds, suv: du });
        expect(driver.matrix.KOKAPET[zone]).toEqual({ sedan: dks, suv: dku });
        cells += 4;
      }
      expect(cells).toBe(28);
    });

    it('driver card exposes no vendor collections or escort surcharges (D01 / D AT09)', async () => {
      const driver = await service.getDriverRateCard();
      expect(JSON.stringify(driver.matrix)).not.toMatch(/escort/i);
    });

    it('locality master has 240 records with distinct Kondapur IDs and no excluded names', async () => {
      const all = await service.searchLocalities();
      expect(all).toHaveLength(240);
      expect(new Set(all.map((l) => l.id)).size).toBe(240);
      expect(all.find((l) => /osmig|old mig/i.test(l.name))).toBeUndefined();
    });
  });

  describe('Vendor PRD acceptance tests', () => {
    it('V AT01: HITEC Sedan, Zone 5, no escort -> 700', async () => {
      const q = await quote({ localityId: 'LOC_KUKATPALLY', ...inbound(PIN.KUKATPALLY, PIN.HITEC_OFFICE) });
      expect(q.canAutoQuote).toBe(true);
      expect(q.locality.zoneId).toBe('ZONE_5');
      expect(q.totalAmount).toBe(700);
      expect(q.escortFee).toBe(0);
    });

    it('V AT02: Kokapet SUV, Extra, escort selected -> 800 + 400 = 1,200', async () => {
      const q = await quote({
        officeHubId: 'KOKAPET',
        vehicleType: 'SUV',
        hasEscort: true,
        localityId: 'LOC_GACHIBOWLI',
        ...outbound(PIN.KOKAPET_OFFICE, PIN.GACHIBOWLI),
      });
      expect(q.baseFare).toBe(800);
      expect(q.escortFee).toBe(400);
      expect(q.totalAmount).toBe(1200);
      expect(q.lineItems.map((l: any) => l.code)).toEqual(['BASE', 'ESCORT']);
    });

    it('V AT03: HITEC Sedan, Zone 6, escort not selected -> 600 with no automatic 200 surcharge', async () => {
      const q = await quote({ localityId: 'LOC_TOLICHOWKI', ...inbound(PIN.TOLICHOWKI, PIN.HITEC_OFFICE) });
      expect(q.totalAmount).toBe(600);
      expect(q.escortFee).toBe(0);
      expect(q.lineItems).toHaveLength(1);
    });

    it('V AT04: Bachupally, Moosapet, Shamirpet resolve to Zones 4, 5 and 1', async () => {
      const zone = async (id: string, pin: { lat: number; lng: number }) =>
        (await quote({ localityId: id, ...inbound(pin, PIN.HITEC_OFFICE) })).locality.zoneId;
      expect(await zone('LOC_BACHUPALLY', PIN.BACHUPALLY)).toBe('ZONE_4');
      expect(await zone('LOC_MOOSAPET', PIN.MOOSAPET)).toBe('ZONE_5');
      expect(await zone('LOC_SHAMIRPET', PIN.SHAMIRPET)).toBe('ZONE_1');
    });

    it('V AT05 / D AT08: two Kondapur results with distinct IDs; outskirts cannot auto-quote', async () => {
      const results = await service.searchLocalities('kondapur');
      expect(results.map((r) => r.id).sort()).toEqual(['LOC_KONDAPUR_CITY_AREA', 'LOC_KONDAPUR_OUTSKIRTS']);
      expect(results.find((r) => r.id === 'LOC_KONDAPUR_OUTSKIRTS')).toMatchObject({ reviewStatus: 'INACTIVE', bookable: false });

      const q = await quote({ localityId: 'LOC_KONDAPUR_OUTSKIRTS', ...inbound(PIN.SHAMIRPET, PIN.HITEC_OFFICE) });
      expect(q).toMatchObject({ canAutoQuote: false, requiresOpsReview: true, reasonCode: 'LOCALITY_INACTIVE' });
      expect(db.zonalQuoteSnapshot.create).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'ZONAL_QUOTE_REVIEW_REQUIRED' }));
    });

    it('starred localities (e.g. Pebel City) cannot produce an automatic quote', async () => {
      const q = await quote({ localityId: 'LOC_PEBEL_CITY', ...inbound(PIN.KUKATPALLY, PIN.HITEC_OFFICE) });
      expect(q).toMatchObject({ canAutoQuote: false, reasonCode: 'LOCALITY_PENDING_REVIEW' });
      const starred = LOCALITY_MASTER.filter((l) => l.requiresReview);
      for (const l of starred) {
        const r = await quote({ localityId: localityIdFor(l.name), ...inbound(PIN.KUKATPALLY, PIN.HITEC_OFFICE) });
        expect(r.canAutoQuote).toBe(false);
      }
    });

    it('V AT06: a quote can never exceed base + selected escort ceiling', async () => {
      const q = await quote({ hasEscort: true });
      const snap = snapshots.get(q.quoteId);
      expect(snap.totalFarePaise).toBe(snap.baseFarePaise + snap.escortFarePaise);
      expect(snap.totalFarePaise).toBe(80000 + 30000);
    });

    it('V AT10: vendor quote view omits driver payout and margin; admin view includes them', async () => {
      const vendorView = await quote({});
      expect(vendorView.internal).toBeUndefined();
      expect(JSON.stringify(vendorView)).not.toMatch(/driver|platform|spread/i);
      const adminView = await quote({}, ADMIN);
      expect(adminView.internal).toEqual({ driverRateVersion: '2026.1', driverEarning: 680, platformSpread: 120, escortPayable: 0 });
    });
  });

  describe('Driver PRD acceptance tests', () => {
    it('D AT01: HITEC Sedan Zone 5 offer is 595', async () => {
      const q = await quote({ localityId: 'LOC_KUKATPALLY', ...inbound(PIN.KUKATPALLY, PIN.HITEC_OFFICE) }, ADMIN);
      expect(q.internal.driverEarning).toBe(595);
      const driverView: any = service.quoteView(snapshots.get(q.quoteId), 'DRIVER');
      expect(driverView.offeredEarnings).toBe(595);
      expect(JSON.stringify(driverView)).not.toMatch(/totalAmount|baseFare|escort|platform/i);
    });

    it('D AT02: Kokapet SUV Zone 1 offer is 1,275 from the driver table', async () => {
      const q = await quote(
        { officeHubId: 'KOKAPET', vehicleType: 'SUV', localityId: 'LOC_SHAMIRPET', ...outbound(PIN.KOKAPET_OFFICE, PIN.SHAMIRPET) },
        ADMIN,
      );
      expect(q.internal.driverEarning).toBe(1275);
    });

    it('D AT04: vendor escort fee is not copied into driver earnings or reduced by 15%', async () => {
      const withEscort = await quote({ hasEscort: true }, ADMIN);
      const without = await quote({ hasEscort: false }, ADMIN);
      expect(withEscort.internal.driverEarning).toBe(without.internal.driverEarning);
      expect(withEscort.internal.escortPayable).toBe(300);
    });
  });

  describe('Endpoint and locality resolution rules', () => {
    it('rejects both-endpoints-in-hub, neither-endpoint-in-hub and wrong-hub selections', async () => {
      expect((await quote({ ...inbound(PIN.HITEC_OFFICE, PIN.KOKAPET_OFFICE) })).reasonCode).toBe('BOTH_ENDPOINTS_IN_HUB');
      expect((await quote({ ...inbound(PIN.MALAKPET, PIN.SHAMIRPET) })).reasonCode).toBe('NO_OFFICE_ENDPOINT');
      expect((await quote({ officeHubId: 'KOKAPET' })).reasonCode).toBe('OFFICE_PIN_OUTSIDE_SELECTED_HUB');
      // Direction says the office is the pickup, but the pickup pin is the employee home.
      expect((await quote({ direction: 'OUTBOUND_FROM_OFFICE' })).reasonCode).toBe('OFFICE_PIN_OUTSIDE_SELECTED_HUB');
    });

    it('never classifies by substring; aliases resolve to exactly one record', () => {
      expect(service.findLocality('Old Malakpet Colony')).toBeNull();
      expect(service.findLocality('Banjara Hills')).toBeNull();
      expect(service.findLocality('Nexampuri')?.name).toBe('Neknampur');
      expect(service.findLocality('Manaikonda')?.name).toBe('Manikonda');
      expect(service.findLocality('Osmig')).toBeNull();
    });

    it('unlisted locality IDs go to operations review instead of a default zone', async () => {
      const q = await quote({ localityId: 'LOC_BANJARA_HILLS' });
      expect(q).toMatchObject({ canAutoQuote: false, reasonCode: 'UNLISTED_LOCALITY' });
    });

    it('a verified locality pin rejects employee pins outside the locality', async () => {
      db.localityMaster.findMany.mockResolvedValue(
        LOCALITY_MASTER.map((l) => ({
          displayName: l.name,
          zoneId: l.zoneId,
          aliases: [],
          reviewStatus: l.inactive ? 'INACTIVE' : l.requiresReview ? 'PENDING_REVIEW' : 'VERIFIED',
          centerLat: l.name === 'Malakpet' ? PIN.MALAKPET.lat : null,
          centerLng: l.name === 'Malakpet' ? PIN.MALAKPET.lng : null,
          h3IndexRes8: l.name === 'Malakpet' ? new H3Service().latLngToCell(PIN.MALAKPET.lat, PIN.MALAKPET.lng, 8) : null,
          notes: null,
          version: 1,
        })),
      );
      await service.reload();
      expect((await quote({})).canAutoQuote).toBe(true);
      const far = await quote({ ...inbound(PIN.SHAMIRPET, PIN.HITEC_OFFICE) });
      expect(far.reasonCode).toBe('PIN_OUTSIDE_LOCALITY');
    });

    it('supports SEDAN and SUV only', async () => {
      await expect(quote({ vehicleType: 'HATCHBACK' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('identical inputs and versions produce identical amounts (deterministic)', async () => {
      const a = await quote({}, ADMIN);
      const b = await quote({}, ADMIN);
      expect({ ...a, quoteId: 0, expiresAt: 0 }).toEqual({ ...b, quoteId: 0, expiresAt: 0 });
    });
  });

  describe('Plan simulations', () => {
    it('Simulation 1: Malakpet -> HITEC Sedan: vendor 800, driver 680, platform 120', async () => {
      const q = await quote({}, ADMIN);
      expect(q).toMatchObject({ direction: 'INBOUND_TO_OFFICE', totalAmount: 800, locality: { zoneId: 'ZONE_4' } });
      expect(q.internal).toMatchObject({ driverEarning: 680, platformSpread: 120 });
    });

    it('Simulation 2: Kokapet -> Shamirpet SUV + escort: vendor 2,000, driver 1,275, escort 500, platform 225', async () => {
      const q = await quote(
        { officeHubId: 'KOKAPET', vehicleType: 'SUV', hasEscort: true, localityId: 'LOC_SHAMIRPET', ...outbound(PIN.KOKAPET_OFFICE, PIN.SHAMIRPET) },
        ADMIN,
      );
      expect(q).toMatchObject({ direction: 'OUTBOUND_FROM_OFFICE', baseFare: 1500, escortFee: 500, totalAmount: 2000 });
      expect(q.internal).toMatchObject({ driverEarning: 1275, escortPayable: 500, platformSpread: 225 });
    });
  });

  describe('Booking integration (V03 / V AT08)', () => {
    const booking = { vehicleType: 'SEDAN', pickupLat: PIN.MALAKPET.lat, pickupLng: PIN.MALAKPET.lng, dropLat: PIN.HITEC_OFFICE.lat, dropLng: PIN.HITEC_OFFICE.lng };

    it('accepts a fresh quote owned by the vendor', async () => {
      const q = await quote({});
      const res = await service.validateQuoteForBooking(q.quoteId, VENDOR.userId, booking);
      expect(res.snapshot.totalFarePaise).toBe(80000);
      expect(res.alreadyBookedRequirementId).toBeUndefined();
    });

    it('rejects another account, expired quotes, changed vehicle and moved pins', async () => {
      const q = await quote({});
      await expect(service.validateQuoteForBooking(q.quoteId, ADMIN.userId, booking)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.validateQuoteForBooking(q.quoteId, VENDOR.userId, { ...booking, vehicleType: 'SUV' })).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.validateQuoteForBooking(q.quoteId, VENDOR.userId, { ...booking, pickupLat: 17.39 })).rejects.toBeInstanceOf(BadRequestException);
      snapshots.get(q.quoteId).expiresAt = new Date(Date.now() - 1000);
      await expect(service.validateQuoteForBooking(q.quoteId, VENDOR.userId, booking)).rejects.toBeInstanceOf(GoneException);
    });

    it('a quote binds to exactly one requirement; resubmission reports the original booking', async () => {
      const q = await quote({});
      await service.consumeQuote(db, q.quoteId, 'req-1');
      await expect(service.consumeQuote(db, q.quoteId, 'req-2')).rejects.toBeInstanceOf(ConflictException);
      const res = await service.validateQuoteForBooking(q.quoteId, VENDOR.userId, booking);
      expect(res.alreadyBookedRequirementId).toBe('req-1');
    });

    it('V AT07 / D AT05: publishing a new rate version does not change a stored quote', async () => {
      const q = await quote({}, ADMIN);
      const before = { ...snapshots.get(q.quoteId) };
      db.rateCardVersion.findUnique.mockResolvedValue(fullVersion('VENDOR', '2026.2', 'DRAFT', 99900));
      await service.publishVersion('ver-2', 'Quarterly rate revision approved by finance', ADMIN);
      expect(snapshots.get(q.quoteId)).toEqual(before);
    });
  });

  describe('Rate card administration', () => {
    it('seeds 28-row VENDOR and DRIVER versions and the locality master once', async () => {
      await service.ensureSeedData();
      expect(db.rateCardVersion.create).toHaveBeenCalledTimes(2);
      for (const call of db.rateCardVersion.create.mock.calls) {
        expect(call[0].data.rows.create).toHaveLength(28);
        expect(call[0].data.status).toBe('ACTIVE');
      }
      const driverRows = db.rateCardVersion.create.mock.calls.find((c: any) => c[0].data.audience === 'DRIVER')[0].data.rows.create;
      expect(driverRows.every((r: any) => r.escortMaxPaise === 0)).toBe(true);
      expect(db.localityMaster.createMany.mock.calls[0][0].data).toHaveLength(240);
      expect(db.localityMaster.createMany.mock.calls[0][0].skipDuplicates).toBe(true);
    });

    it('publishing retires the previous ACTIVE version and audits the change', async () => {
      db.rateCardVersion.findUnique.mockResolvedValue(fullVersion('VENDOR', '2026.2', 'DRAFT'));
      db.rateCardVersion.findFirst.mockResolvedValueOnce({ version: '2026.1' });
      const res = await service.publishVersion('ver-2', 'Quarterly rate revision approved by finance', ADMIN);
      expect(res).toMatchObject({ status: 'ACTIVE', previousVersion: '2026.1' });
      expect(db.rateCardVersion.updateMany).toHaveBeenCalledWith({ where: { audience: 'VENDOR', status: 'ACTIVE' }, data: { status: 'RETIRED' } });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'RATE_CARD_PUBLISHED' }));
    });

    it('rolling back to a RETIRED version is audited as a rollback', async () => {
      db.rateCardVersion.findUnique.mockResolvedValue(fullVersion('VENDOR', '2026.1', 'RETIRED'));
      await service.publishVersion('ver-1', 'Rollback after pricing incident #42', ADMIN);
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'RATE_CARD_ROLLED_BACK' }));
    });

    it('refuses to publish incomplete versions or re-publish the active one', async () => {
      const incomplete = fullVersion('VENDOR', '2026.3', 'DRAFT');
      incomplete.rows.pop();
      db.rateCardVersion.findUnique.mockResolvedValue(incomplete);
      await expect(service.publishVersion('ver-3', 'Incomplete version attempt', ADMIN)).rejects.toBeInstanceOf(BadRequestException);
      db.rateCardVersion.findUnique.mockResolvedValue(fullVersion('VENDOR', '2026.1', 'ACTIVE'));
      await expect(service.publishVersion('ver-1', 'Re-publish attempt here', ADMIN)).rejects.toBeInstanceOf(ConflictException);
    });

    it('draft creation requires 28 unique rows and forces driver escort to zero', async () => {
      const rows = fullVersion('DRIVER', 'x', 'DRAFT').rows.map((r: any) => ({ ...r, escortMaxPaise: 5000 }));
      await service.createDraftVersion({ audience: 'DRIVER', version: '2026.2', effectiveFrom: '2026-11-01T00:00:00Z', rows, reason: 'November driver card update' } as any, ADMIN);
      const created = db.rateCardVersion.create.mock.calls[0][0].data;
      expect(created.status).toBe('DRAFT');
      expect(created.rows.create.every((r: any) => r.escortMaxPaise === 0)).toBe(true);

      const dupRows = [...rows.slice(0, 27), rows[0]];
      await expect(
        service.createDraftVersion({ audience: 'DRIVER', version: '2026.3', effectiveFrom: '2026-11-01T00:00:00Z', rows: dupRows, reason: 'Duplicate row attempt' } as any, ADMIN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('locality updates compute the H3 pin cell and are audited with previous values', async () => {
      await service.updateLocality('LOC_KONDAPUR_OUTSKIRTS', { reviewStatus: 'VERIFIED', centerLat: 17.47, centerLng: 78.33, reason: 'Ops verified outskirts pin on site' } as any, ADMIN);
      const call = db.localityMaster.update.mock.calls[0][0];
      expect(call.where).toEqual({ displayName: 'Kondapur (outskirts)' });
      expect(call.data.h3IndexRes8).toMatch(/^88/);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ZONAL_LOCALITY_UPDATED', metadata: expect.objectContaining({ previous: expect.objectContaining({ reviewStatus: 'INACTIVE' }) }) }),
      );
    });
  });
});

function fullVersion(audience: string, version: string, status: string, basePaise = 50000) {
  const rows: any[] = [];
  for (const hubId of ['HITEC_NANAKRAMGUDA', 'KOKAPET']) {
    for (const zoneId of ['EXTRA', 'ZONE_6', 'ZONE_5', 'ZONE_4', 'ZONE_3', 'ZONE_2', 'ZONE_1']) {
      for (const vehicleType of ['SEDAN', 'SUV']) {
        rows.push({ hubId, zoneId, vehicleType, baseAmountPaise: basePaise, escortMaxPaise: 0 });
      }
    }
  }
  return { id: `ver-${version}`, audience, version, status, effectiveFrom: new Date(), rows };
}
