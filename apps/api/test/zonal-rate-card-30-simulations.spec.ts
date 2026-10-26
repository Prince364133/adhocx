import { ZonalPricingService } from '../src/modules/pricing/zonal-pricing.service';
import { H3Service } from '../src/modules/locations/h3.service';
import {
  VENDOR_ZONAL_RATE_MATRIX,
  DRIVER_ZONAL_RATE_MATRIX,
  OfficeHubId,
  ZoneId,
  ZonalVehicleClass,
  TripDirection,
} from '../src/modules/pricing/zonal-pricing.constants';

describe('Zonal Rate Card - 32 Real-World Route Simulations & Leakage Verification', () => {
  let service: ZonalPricingService;
  let db: any;
  let audit: any;
  let snapshots: Map<string, any>;
  let seq: number;

  const ADMIN = { userId: '00000000-0000-4000-8000-000000000001', role: 'ADMIN' };
  const VENDOR = { userId: '00000000-0000-4000-8000-000000000002', role: 'VENDOR' };

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

  const OFFICE_HUBS: Record<OfficeHubId, { name: string; lat: number; lng: number }> = {
    HITEC_NANAKRAMGUDA: { name: 'HITEC Office Hub', lat: 17.4435, lng: 78.3772 },
    KOKAPET: { name: 'Kokapet SEZ Office Hub', lat: 17.385, lng: 78.3245 },
  };

  /** Real-world employee pickup/drop coordinates mapped across all 7 Hyderabad zones */
  const TEST_LOCATIONS: Array<{
    name: string;
    zoneId: ZoneId;
    localityId: string;
    lat: number;
    lng: number;
  }> = [
    // EXTRA (Within office perimeter)
    { name: 'Gachibowli DLF', zoneId: 'EXTRA', localityId: 'LOC_GACHIBOWLI', lat: 17.4401, lng: 78.3489 },
    { name: 'Kondapur City Area', zoneId: 'EXTRA', localityId: 'LOC_KONDAPUR_CITY_AREA', lat: 17.4611, lng: 78.3582 },

    // ZONE 6
    { name: 'Manikonda Marichettu', zoneId: 'ZONE_6', localityId: 'LOC_MANIKONDA', lat: 17.4042, lng: 78.3886 },
    { name: 'Mehdipatnam Bus Stand', zoneId: 'ZONE_6', localityId: 'LOC_MEHDIPATNAM', lat: 17.3916, lng: 78.4398 },
    { name: 'Tolichowki Cross Road', zoneId: 'ZONE_6', localityId: 'LOC_TOLICHOWKI', lat: 17.3986, lng: 78.4155 },
    { name: 'Narsingi Junction', zoneId: 'ZONE_6', localityId: 'LOC_NARSINGI', lat: 17.3802, lng: 78.3564 },

    // ZONE 5
    { name: 'Kukatpally KPHB Colony', zoneId: 'ZONE_5', localityId: 'LOC_KUKATPALLY', lat: 17.4849, lng: 78.4138 },
    { name: 'Begumpet Airport Road', zoneId: 'ZONE_5', localityId: 'LOC_BEGUMPET', lat: 17.4448, lng: 78.4682 },
    { name: 'Attapur Pillar 140', zoneId: 'ZONE_5', localityId: 'LOC_ATTAPUR', lat: 17.3712, lng: 78.4318 },
    { name: 'Moosapet Metro', zoneId: 'ZONE_5', localityId: 'LOC_MOOSAPET', lat: 17.47, lng: 78.425 },

    // ZONE 4
    { name: 'Malakpet Old City Gate', zoneId: 'ZONE_4', localityId: 'LOC_MALAKPET', lat: 17.3753, lng: 78.4983 },
    { name: 'Secunderabad Clock Tower', zoneId: 'ZONE_4', localityId: 'LOC_SECUNDERABAD', lat: 17.4399, lng: 78.4983 },
    { name: 'Dilsukhnagar Bus Depot', zoneId: 'ZONE_4', localityId: 'LOC_DILSUKHNAGAR', lat: 17.3688, lng: 78.5247 },
    { name: 'Bachupally Crossroads', zoneId: 'ZONE_4', localityId: 'LOC_BACHUPALLY', lat: 17.543, lng: 78.365 },

    // ZONE 3
    { name: 'LB Nagar Ring Road', zoneId: 'ZONE_3', localityId: 'LOC_LB_NAGAR', lat: 17.3457, lng: 78.5522 },
    { name: 'Uppal Metro Station', zoneId: 'ZONE_3', localityId: 'LOC_UPPAL', lat: 17.4018, lng: 78.5602 },
    { name: 'Chandrayangutta', zoneId: 'ZONE_3', localityId: 'LOC_CHANDRAYANGUTTA', lat: 17.3616, lng: 78.4747 },
    { name: 'Kompally D-Mart', zoneId: 'ZONE_3', localityId: 'LOC_KOMPALLY', lat: 17.5385, lng: 78.4862 },
    { name: 'Shamshabad Airport Approach', zoneId: 'ZONE_3', localityId: 'LOC_SHAMSHABAD', lat: 17.2403, lng: 78.4294 },

    // ZONE 2
    { name: 'Cherlapally Industrial Area', zoneId: 'ZONE_2', localityId: 'LOC_CHERLAPALLY', lat: 17.4568, lng: 78.6011 },
    { name: 'Hayathnagar Outer Border', zoneId: 'ZONE_2', localityId: 'LOC_HAYATHNAGAR', lat: 17.3242, lng: 78.6022 },
    { name: 'Pocharam IT Corridor', zoneId: 'ZONE_2', localityId: 'LOC_POCHARAM', lat: 17.465, lng: 78.65 },
    { name: 'Dammaiguda Lake Road', zoneId: 'ZONE_2', localityId: 'LOC_DAMMAIGUDA', lat: 17.502, lng: 78.59 },

    // ZONE 1 (Furthest Periphery)
    { name: 'Shamirpet Lake Road', zoneId: 'ZONE_1', localityId: 'LOC_SHAMIRPET', lat: 17.604, lng: 78.5714 },
    { name: 'Medchal Town Center', zoneId: 'ZONE_1', localityId: 'LOC_MEDCHAL', lat: 17.6297, lng: 78.4814 },
    { name: 'Ghatkesar Outer Toll', zoneId: 'ZONE_1', localityId: 'LOC_GHATKESAR', lat: 17.4475, lng: 78.6835 },
    { name: 'Ibrahimpatnam Junction', zoneId: 'ZONE_1', localityId: 'LOC_IBRAHIMPATNAM', lat: 17.1895, lng: 78.6508 },
  ];

  describe('32 Detailed Real-World Location Simulations with Zero Pricing Leakage', () => {
    const simulations: Array<{
      simId: number;
      hubId: OfficeHubId;
      locationIndex: number;
      vehicleClass: ZonalVehicleClass;
      direction: TripDirection;
      hasEscort: boolean;
    }> = [];

    let count = 1;
    for (const hubId of ['HITEC_NANAKRAMGUDA', 'KOKAPET'] as OfficeHubId[]) {
      for (let i = 0; i < TEST_LOCATIONS.length; i++) {
        if (count > 32) break;
        const vehicleClass: ZonalVehicleClass = count % 2 === 1 ? 'SEDAN' : 'SUV';
        const direction: TripDirection = count % 4 < 2 ? 'INBOUND_TO_OFFICE' : 'OUTBOUND_FROM_OFFICE';
        const hasEscort: boolean = count % 3 === 0;
        simulations.push({
          simId: count++,
          hubId,
          locationIndex: i,
          vehicleClass,
          direction,
          hasEscort,
        });
      }
    }

    test.each(simulations)(
      'Simulation #$simId: Hub $hubId, Location "$locationIndex", Vehicle $vehicleClass, Escort: $hasEscort',
      async ({ simId, hubId, locationIndex, vehicleClass, direction, hasEscort }) => {
        expect(simId).toBeGreaterThanOrEqual(1);
        const hub = OFFICE_HUBS[hubId];
        const location = TEST_LOCATIONS[locationIndex];
        const zoneId = location.zoneId;

        const pickupLat = direction === 'INBOUND_TO_OFFICE' ? location.lat : hub.lat;
        const pickupLng = direction === 'INBOUND_TO_OFFICE' ? location.lng : hub.lng;
        const dropLat = direction === 'INBOUND_TO_OFFICE' ? hub.lat : location.lat;
        const dropLng = direction === 'INBOUND_TO_OFFICE' ? hub.lng : location.lng;

        // 1. Execute live engine quote with ADMIN context to inspect complete snapshot
        const adminQuote: any = await service.createQuote(
          {
            officeHubId: hubId,
            vehicleType: vehicleClass,
            direction,
            hasEscort,
            localityId: location.localityId,
            pickupLat,
            pickupLng,
            dropLat,
            dropLng,
          },
          ADMIN,
        );

        // Verification of auto-quote approval
        expect(adminQuote.canAutoQuote).toBe(true);
        expect(adminQuote.locality.zoneId).toBe(zoneId);
        expect(adminQuote.officeHub.id).toBe(hubId);
        expect(adminQuote.vehicleType).toBe(vehicleClass);

        // Ground-truth rates from PDF Rate Card Matrix
        const vendorMatrixCell = VENDOR_ZONAL_RATE_MATRIX[hubId][zoneId];
        const expectedVendorBase =
          vehicleClass === 'SEDAN' ? vendorMatrixCell.sedan : vendorMatrixCell.suv;
        const expectedEscort = hasEscort
          ? vehicleClass === 'SEDAN'
            ? vendorMatrixCell.escortSedan
            : vendorMatrixCell.escortSuv
          : 0;
        const expectedVendorTotal = expectedVendorBase + expectedEscort;

        const driverMatrixCell = DRIVER_ZONAL_RATE_MATRIX[hubId][zoneId];
        const expectedDriverEarning =
          vehicleClass === 'SEDAN' ? driverMatrixCell.sedan : driverMatrixCell.suv;

        // 2. Strict match with Vendor Rate Card
        expect(adminQuote.baseFare).toBe(expectedVendorBase);
        expect(adminQuote.escortFee).toBe(expectedEscort);
        expect(adminQuote.totalAmount).toBe(expectedVendorTotal);

        // 3. Strict match with Driver Rate Card
        expect(adminQuote.internal.driverEarning).toBe(expectedDriverEarning);

        // 4. Margin assertion: Platform margin = Vendor Base - Driver Earning
        const expectedMargin = expectedVendorBase - expectedDriverEarning;
        expect(adminQuote.internal.platformSpread).toBe(expectedMargin);
        expect(expectedMargin).toBeGreaterThan(0);

        // 5. STRICT AUDIENCE VIEW VERIFICATION: DRIVER (Zero Vendor Rate Leakage)
        const snapshot = snapshots.get(adminQuote.quoteId);
        expect(snapshot).toBeDefined();

        const driverView: any = service.quoteView(snapshot, 'DRIVER');
        expect(driverView.offeredEarnings).toBe(expectedDriverEarning);
        expect(driverView.rateVersion).toBe('2026.1');
        // Vendor rates must NEVER exist on driver view
        expect(driverView.baseFare).toBeUndefined();
        expect(driverView.escortFee).toBeUndefined();
        expect(driverView.totalAmount).toBeUndefined();
        expect(driverView.internal).toBeUndefined();
        expect(driverView.platformSpread).toBeUndefined();

        // Check serialized JSON to ensure absolutely zero trace of vendor billing
        const driverViewStr = JSON.stringify(driverView);
        expect(driverViewStr).not.toContain(`"totalAmount":${expectedVendorTotal}`);
        expect(driverViewStr).not.toContain(`"platformSpread":${expectedMargin}`);

        // 6. STRICT AUDIENCE VIEW VERIFICATION: VENDOR (Zero Driver Rate Leakage)
        const vendorView: any = service.quoteView(snapshot, 'VENDOR');
        expect(vendorView.baseFare).toBe(expectedVendorBase);
        expect(vendorView.escortFee).toBe(expectedEscort);
        expect(vendorView.totalAmount).toBe(expectedVendorTotal);
        expect(vendorView.offeredEarnings).toBeUndefined();
        expect(vendorView.internal).toBeUndefined();

        // Also test direct createQuote as VENDOR actor
        const vendorActorQuote: any = await service.createQuote(
          {
            officeHubId: hubId,
            vehicleType: vehicleClass,
            direction,
            hasEscort,
            localityId: location.localityId,
            pickupLat,
            pickupLng,
            dropLat,
            dropLng,
          },
          VENDOR,
        );
        expect(vendorActorQuote.totalAmount).toBe(expectedVendorTotal);
        expect(vendorActorQuote.internal).toBeUndefined();
        expect(vendorActorQuote.offeredEarnings).toBeUndefined();
      },
    );
  });

  describe('Special Verification: User Screenshot Route (Nanakramguda to Old City / Malakpet)', () => {
    it('Zone 3 Sedan (Nanakramguda to Chandrayangutta / Charminar) MUST yield ₹900 Vendor and ₹765 Driver, with ₹900 hidden from Driver', async () => {
      const hub = OFFICE_HUBS.HITEC_NANAKRAMGUDA;
      const chandrayangutta = { lat: 17.3616, lng: 78.4747 };

      const quote: any = await service.createQuote(
        {
          officeHubId: 'HITEC_NANAKRAMGUDA',
          vehicleType: 'SEDAN',
          direction: 'OUTBOUND_FROM_OFFICE',
          hasEscort: false,
          localityId: 'LOC_CHANDRAYANGUTTA',
          pickupLat: hub.lat,
          pickupLng: hub.lng,
          dropLat: chandrayangutta.lat,
          dropLng: chandrayangutta.lng,
        },
        ADMIN,
      );

      // Verify canonical rates
      expect(quote.totalAmount).toBe(900); // Vendor corporate billed rate
      expect(quote.internal.driverEarning).toBe(765); // Driver assigned rate card
      expect(quote.internal.platformSpread).toBe(135); // Platform margin

      const snapshot = snapshots.get(quote.quoteId);
      const driverView: any = service.quoteView(snapshot, 'DRIVER');

      // The driver must see ONLY ₹765, NEVER ₹900 or ₹135 margin
      expect(driverView.offeredEarnings).toBe(765);
      expect(driverView.baseFare).toBeUndefined();
      expect(driverView.totalAmount).toBeUndefined();
      expect(driverView.internal).toBeUndefined();

      const serialized = JSON.stringify(driverView);
      expect(serialized).not.toContain('"amount":900');
      expect(serialized).not.toContain('"totalAmount":900');
      expect(serialized).not.toContain('"baseFare":900');
      expect(serialized).not.toContain('"platformSpread":135');
    });

    it('Zone 4 Sedan (Nanakramguda to Malakpet) MUST yield ₹800 Vendor and ₹680 Driver, with ₹800 hidden from Driver', async () => {
      const hub = OFFICE_HUBS.HITEC_NANAKRAMGUDA;
      const malakpet = { lat: 17.3753, lng: 78.4983 };

      const quote: any = await service.createQuote(
        {
          officeHubId: 'HITEC_NANAKRAMGUDA',
          vehicleType: 'SEDAN',
          direction: 'OUTBOUND_FROM_OFFICE',
          hasEscort: false,
          localityId: 'LOC_MALAKPET',
          pickupLat: hub.lat,
          pickupLng: hub.lng,
          dropLat: malakpet.lat,
          dropLng: malakpet.lng,
        },
        ADMIN,
      );

      // Verify canonical rates
      expect(quote.totalAmount).toBe(800); // Vendor corporate billed rate
      expect(quote.internal.driverEarning).toBe(680); // Driver assigned rate card
      expect(quote.internal.platformSpread).toBe(120); // Platform margin

      const snapshot = snapshots.get(quote.quoteId);
      const driverView: any = service.quoteView(snapshot, 'DRIVER');

      // The driver must see ONLY ₹680, NEVER ₹800 or ₹120 margin
      expect(driverView.offeredEarnings).toBe(680);
      expect(driverView.baseFare).toBeUndefined();
      expect(driverView.totalAmount).toBeUndefined();
      expect(driverView.internal).toBeUndefined();

      const serialized = JSON.stringify(driverView);
      expect(serialized).not.toContain('800');
      expect(serialized).not.toContain('120');
    });
  });
});
