/**
 * 50-ride dispatch simulation against a REAL PostgreSQL database.
 *
 * Every ride goes through the production services (RequirementsService, DispatchService,
 * OffersService, TripsService, ReviewsService, DriverBehaviorService, DispatchSchedulerService).
 * Only side channels are stubbed: push/SSE (recorded), audit, fare pricing, and Google routing
 * (deterministic matrix, including a river-crossing driver and an outage).
 *
 * Time: offer windows and cooldowns are "fast-forwarded" by moving their timestamps into the past
 * and ticking the scheduler, which is exactly what the clock passing would do.
 *
 * Global invariants are asserted after every batch:
 *   - assignedQuantity == live trips and never exceeds quantity (no overbooking)
 *   - no driver ever holds two active trips
 *   - no offer ever reaches a driver with the wrong vehicle type
 *   - trust score within [0, 100]; driver AR counters equal the offers actually counted
 *   - closed requirements have no live offers
 *   - every vendor wallet equals opening balance + ledger credits - ledger debits
 *
 * Run (needs a disposable local database; refuses anything else):
 *   SIMULATION_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/adhocx_sim npm run test:sim
 */
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  DriverAvailability,
  OfferStatus,
  RequirementStatus,
  TripStatus,
  UserRole,
  VehicleType,
  VerificationStatus,
} from '@adhocx/contracts';
import { DatabaseService } from '../../src/database/database.service';
import { DispatchService } from '../../src/modules/dispatch/dispatch.service';
import { DispatchSchedulerService } from '../../src/modules/dispatch/dispatch-scheduler.service';
import { DriverBehaviorService } from '../../src/modules/dispatch/driver-behavior.service';
import { OffersService } from '../../src/modules/offers/offers.service';
import { RequirementsService } from '../../src/modules/requirements/requirements.service';
import { TripsService } from '../../src/modules/trips/trips.service';
import { ReviewsService } from '../../src/modules/reviews/reviews.service';
import { LocationsService } from '../../src/modules/locations/locations.service';
import { H3Service } from '../../src/modules/locations/h3.service';
import { DriverEtaResult, LatLng } from '../../src/modules/locations/google-maps.service';

const SIM_URL = process.env.SIMULATION_DATABASE_URL || '';
const isSafeTarget = (() => {
  try {
    const u = new URL(SIM_URL);
    return ['localhost', '127.0.0.1'].includes(u.hostname) && /(sim|test)/i.test(u.pathname);
  } catch {
    return false;
  }
})();

const describeSim = isSafeTarget ? describe : describe.skip;
if (!isSafeTarget) {
  // eslint-disable-next-line no-console
  console.warn('[dispatch-simulation] skipped: set SIMULATION_DATABASE_URL to a LOCAL *_sim/*_test database');
}

jest.setTimeout(600_000);

const PICKUP = { latitude: 28.4595, longitude: 77.0266, address: 'Cyber Hub, Gurugram' };
const DROP = { latitude: 28.5355, longitude: 77.391, address: 'Sector 62, Noida' };
const VENDOR_OPENING_BALANCE = 1_000_000;
const RATE = 1500;

describeSim('Dispatch simulation: 50 rides on real Postgres', () => {
  let prisma: PrismaClient;
  let db: DatabaseService;
  let scheduler: DispatchSchedulerService;
  let dispatch: DispatchService;
  let offers: OffersService;
  let requirements: RequirementsService;
  let trips: TripsService;
  let reviews: ReviewsService;
  let behavior: DriverBehaviorService;
  const events: { channel: string; event: string; payload: any }[] = [];

  // Deterministic routing stub (Phase B of two-phase routing)
  const routing = {
    overrides: new Map<string, number>(), // "lat,lng" -> ETA minutes
    outage: false,
    calls: 0,
    async computeDriverEtaMatrix(origins: LatLng[], dest: LatLng): Promise<DriverEtaResult[]> {
      routing.calls++;
      if (routing.outage) throw new Error('simulated Google outage');
      return origins.map((o) => {
        const key = `${Number(o.latitude).toFixed(4)},${Number(o.longitude).toFixed(4)}`;
        const aerial = Math.hypot((o.latitude - dest.latitude) * 111, (o.longitude - dest.longitude) * 111 * Math.cos((dest.latitude * Math.PI) / 180));
        const roadKm = Number((aerial * 1.3).toFixed(2));
        const eta = routing.overrides.get(key) ?? Math.max(2, Math.round((roadKm / 25) * 60));
        return { etaMinutes: eta, distanceKm: routing.overrides.has(key) ? roadKm * 4 : roadKm, isRealRoad: true };
      });
    },
  };

  const drivers = new Map<string, { id: string; userId: string; type: VehicleType; lat: number; lng: number }>();
  const vendors: { id: string; userId: string }[] = [];
  let ridesBooked = 0;

  // ------------------------------------------------------------------ helpers

  const wipe = async () => {
    const tables: { tablename: string }[] = await prisma.$queryRawUnsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'`,
    );
    if (tables.length) {
      await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`);
    }
  };

  const seedDriver = async (key: string, type: VehicleType, lat: number, lng: number, opts: Partial<{ trust: number; rating: number; trips: number; noGps: boolean }> = {}) => {
    const user = await prisma.user.create({
      data: { phone: `+9190000${String(drivers.size).padStart(5, '0')}`, fullName: key, role: 'DRIVER', status: 'ACTIVE' },
    });
    const d = await prisma.driver.create({
      data: {
        userId: user.id,
        fullName: key,
        phone: user.phone,
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        vehicleType: type,
        vehiclePlate: `HR26${key.toUpperCase().slice(-4)}`,
        trustScore: opts.trust ?? 95,
        averageRating: opts.rating ?? 4.8,
        ratingCount: opts.trips ?? 40,
        totalTrips: opts.trips ?? 40,
        currentLat: opts.noGps ? null : lat,
        currentLng: opts.noGps ? null : lng,
        lastLocationAt: opts.noGps ? null : new Date(),
      },
    });
    drivers.set(key, { id: d.id, userId: user.id, type, lat, lng });
    return d;
  };

  const D = (key: string) => drivers.get(key)!;
  const keyOf = (driverId: string) => Array.from(drivers.entries()).find(([, v]) => v.id === driverId)?.[0] ?? driverId;

  const book = async (vendorIdx: number, vehicleType: VehicleType, quantity = 1) => {
    const res = await requirements.createRequirement(vendors[vendorIdx].userId, {
      vehicleType,
      quantity,
      pickupLocation: PICKUP,
      dropLocation: DROP,
      reportingTime: new Date(Date.now() + 3600_000).toISOString(),
      ratePerVehicle: RATE,
    } as any);
    ridesBooked++;
    return res.id;
  };

  const liveOffers = (requirementId: string) =>
    prisma.offer.findMany({ where: { requirementId, status: OfferStatus.SENT }, orderBy: { createdAt: 'asc' } });

  /** Driver apps display their pending offers (delivery receipt). */
  const driversSeeOffers = async (requirementId: string) => {
    for (const o of await liveOffers(requirementId)) {
      await offers.markOfferSeen(o.id, D(keyOf(o.driverId)).userId);
    }
  };

  /** The offer window lapses: move expiry into the past and let the scheduler fire. */
  const lapseWave = async (requirementId: string) => {
    await prisma.offer.updateMany({
      where: { requirementId, status: OfferStatus.SENT },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await scheduler.tick(Date.now() + 120_000);
  };

  /** Wall-clock minutes pass for cooldown purposes. */
  const advanceMinutes = async (minutes: number) => {
    const shift = minutes * 60_000;
    const cooling = await prisma.driver.findMany({ where: { cooldownUntil: { not: null } } });
    for (const d of cooling) {
      await prisma.driver.update({
        where: { id: d.id },
        data: {
          cooldownUntil: new Date(d.cooldownUntil!.getTime() - shift),
          lastCooldownAt: d.lastCooldownAt ? new Date(d.lastCooldownAt.getTime() - shift) : null,
        },
      });
    }
  };

  const accept = (offerId: string, driverId: string) => offers.acceptOffer(offerId, D(keyOf(driverId)).userId);

  const tripFor = (requirementId: string, driverId: string) =>
    prisma.trip.findFirstOrThrow({ where: { requirementId, driverId, status: { not: TripStatus.CANCELLED } } });

  const completeTrip = async (tripId: string) => {
    const trip = await prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
    const userId = D(keyOf(trip.driverId)).userId;
    const back = D(keyOf(trip.driverId));
    await trips.markArrived(tripId, userId);
    await trips.startTrip(tripId, userId, { otp: trip.otp!, currentLocation: { latitude: back.lat, longitude: back.lng } } as any);
    // Driver finishes and heads back to their usual zone (keeps the simulated supply local)
    await trips.completeTrip(tripId, userId, { currentLocation: { latitude: back.lat, longitude: back.lng } } as any);
  };

  const review = (vendorIdx: number, tripId: string, rating: number) =>
    reviews.createReview(vendors[vendorIdx].userId, { tripId, rating, feedback: `sim rating ${rating}` } as any);

  /** Book -> first live offer accepted -> ride completed -> customer reviews. */
  const happyRide = async (vendorIdx: number, vehicleType: VehicleType, rating = 5) => {
    const reqId = await book(vendorIdx, vehicleType);
    const [first] = await liveOffers(reqId);
    expect(first).toBeDefined();
    await accept(first.id, first.driverId);
    const trip = await tripFor(reqId, first.driverId);
    await completeTrip(trip.id);
    await review(vendorIdx, trip.id, rating);
    return { reqId, driverId: first.driverId, tripId: trip.id };
  };

  const setOnline = async (keys: string[], online: boolean) => {
    for (const k of keys) {
      await prisma.driver.update({
        where: { id: D(k).id },
        data: { availabilityStatus: online ? DriverAvailability.AVAILABLE : DriverAvailability.OFFLINE },
      });
    }
  };

  const dispatchableNow = async (key: string) => {
    const d = await prisma.driver.findUniqueOrThrow({ where: { id: D(key).id } });
    return !d.cooldownUntil || d.cooldownUntil.getTime() <= Date.now();
  };

  const sedanKeys = () => Array.from(drivers.entries()).filter(([, v]) => v.type === VehicleType.SEDAN).map(([k]) => k);

  const assertInvariants = async () => {
    const reqs = await prisma.requirement.findMany({ include: { trips: true, offers: { include: { driver: true } } } });
    for (const r of reqs) {
      const liveTrips = r.trips.filter((t) => t.status !== TripStatus.CANCELLED).length;
      expect({ req: r.id, assigned: r.assignedQuantity }).toEqual({ req: r.id, assigned: liveTrips });
      expect(r.assignedQuantity).toBeLessThanOrEqual(r.quantity);
      for (const o of r.offers) {
        expect({ offer: o.id, type: o.driver.vehicleType }).toEqual({ offer: o.id, type: r.vehicleType });
      }
      if (r.status === RequirementStatus.CANCELLED || r.status === RequirementStatus.COMPLETED) {
        expect(r.offers.filter((o) => o.status === OfferStatus.SENT)).toHaveLength(0);
      }
    }

    const allDrivers = await prisma.driver.findMany({ include: { trips: true, offers: true } });
    for (const d of allDrivers) {
      const active = d.trips.filter((t) => ['ASSIGNED', 'ARRIVED', 'IN_PROGRESS'].includes(t.status));
      expect({ driver: d.fullName, active: active.length <= 1 }).toEqual({ driver: d.fullName, active: true });
      expect(d.trustScore).toBeGreaterThanOrEqual(0);
      expect(d.trustScore).toBeLessThanOrEqual(100);
      const counted = d.offers.filter((o) => o.countsForAr);
      expect({ driver: d.fullName, accepted: d.acceptedOffers, declined: d.declinedOffers }).toEqual({
        driver: d.fullName,
        accepted: counted.filter((o) => o.status === OfferStatus.ACCEPTED).length,
        declined: counted.filter((o) => o.status === OfferStatus.DECLINED || o.status === OfferStatus.EXPIRED).length,
      });
    }

    for (const v of vendors) {
      const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: v.id } });
      const ledger = await prisma.ledgerEntry.findMany({ where: { accountType: 'VENDOR', accountId: v.id } });
      const credits = ledger.filter((l) => l.entryType === 'CREDIT').reduce((s, l) => s + Number(l.amount), 0);
      const debits = ledger.filter((l) => l.entryType === 'DEBIT').reduce((s, l) => s + Number(l.amount), 0);
      expect(Number(vendor.escrowBalance)).toBeCloseTo(VENDOR_OPENING_BALANCE + credits - debits, 2);
    }
  };

  // ------------------------------------------------------------------ setup

  beforeAll(async () => {
    process.env.REVIEW_GATE_START_AT = '2020-01-01T00:00:00.000Z';
    process.env.DISPATCH_MAX_WAVES = '5';
    process.env.AR_PENALTY_MODE = 'enforce';

    prisma = new PrismaClient({ datasources: { db: { url: SIM_URL } } });
    await prisma.$connect();
    db = prisma as unknown as DatabaseService;
    await wipe();

    const notifications: any = new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === 'emitEvent') {
            return (channel: string, event: string, payload: any) => {
              events.push({ channel, event, payload });
            };
          }
          return async () => ({ success: true });
        },
      },
    );
    const audit: any = { log: async () => undefined };
    const pricing: any = {
      calculateRoadDistanceAndEta: async () => ({ distanceKm: 32, durationMinutes: 55, durationSeconds: 3300, isRealRoad: true }),
      calculateDriverRate: () => RATE,
      calculateMinimumFare: () => RATE,
      calculateDistanceKm: () => 32,
      calculateSurgeMultiplier: () => 1,
    };

    const locations = new LocationsService(db, new H3Service(), undefined);
    scheduler = new DispatchSchedulerService(undefined); // in-process job store, ticked manually
    behavior = new DriverBehaviorService(db, notifications, audit);
    dispatch = new DispatchService(db, locations, notifications, audit, routing as any, undefined, scheduler, behavior);
    scheduler.registerHandler((m) => dispatch.handleScheduledJob(m));
    offers = new OffersService(db, dispatch, notifications, audit, undefined, behavior);
    requirements = new RequirementsService(db, dispatch, pricing, {} as any, notifications, audit);
    trips = new TripsService(db, dispatch, notifications, audit, locations);
    reviews = new ReviewsService(db, notifications, audit);

    // Supply around Cyber Hub (pickup). sedan-2 is aerially the closest sedan but across a
    // barrier: 40 minutes by road.
    await seedDriver('sedan-1', VehicleType.SEDAN, 28.4625, 77.03, { trust: 96 });
    await seedDriver('sedan-2', VehicleType.SEDAN, 28.4598, 77.0269, { trust: 97 });
    await seedDriver('sedan-3', VehicleType.SEDAN, 28.468, 77.04, { trust: 92 });
    await seedDriver('sedan-4', VehicleType.SEDAN, 28.475, 77.045, { trust: 90 });
    await seedDriver('sedan-5', VehicleType.SEDAN, 28.49, 77.06, { trust: 88 });
    await seedDriver('sedan-rookie', VehicleType.SEDAN, 28.465, 77.035, { trust: 100, trips: 3 });
    await seedDriver('suv-1', VehicleType.SUV, 28.4605, 77.028, { trust: 98 });
    await seedDriver('suv-2', VehicleType.SUV, 28.47, 77.04, { trust: 94 });
    await seedDriver('suv-3', VehicleType.SUV, 28.485, 77.055, { trust: 91 });
    await seedDriver('suv-4', VehicleType.SUV, 28.51, 77.075, { trust: 86 });
    await seedDriver('hatch-1', VehicleType.HATCHBACK, 28.461, 77.028, { trust: 96 });
    await seedDriver('hatch-2', VehicleType.HATCHBACK, 28.472, 77.042, { trust: 93 });
    await seedDriver('hatch-3', VehicleType.HATCHBACK, 28.495, 77.065, { trust: 89 });
    await seedDriver('sedan-offline', VehicleType.SEDAN, 28.4596, 77.0267);
    await setOnline(['sedan-offline'], false);
    const unverified = await seedDriver('sedan-unverified', VehicleType.SEDAN, 28.4597, 77.0268);
    await prisma.driver.update({ where: { id: unverified.id }, data: { verificationStatus: VerificationStatus.PENDING } });

    routing.overrides.set('28.4598,77.0269', 40);

    for (let i = 0; i < 10; i++) {
      const user = await prisma.user.create({
        data: { phone: `+9180000${String(i).padStart(5, '0')}`, fullName: `Customer ${i + 1}`, role: 'VENDOR', status: 'ACTIVE' },
      });
      const vendor = await prisma.vendor.create({
        data: {
          userId: user.id,
          fullName: `Customer ${i + 1}`,
          organizationName: `Org ${i + 1}`,
          verificationStatus: 'VERIFIED',
          escrowBalance: VENDOR_OPENING_BALANCE,
        },
      });
      vendors.push({ id: vendor.id, userId: user.id });
    }
  });

  afterAll(async () => {
    delete process.env.REVIEW_GATE_START_AT;
    delete process.env.DISPATCH_MAX_WAVES;
    delete process.env.AR_PENALTY_MODE;
    await prisma?.$disconnect();
  });

  afterEach(async () => {
    await assertInvariants();
  });

  // ------------------------------------------------------------------ rides

  it('Rides 1-10: sedan bookings reach only sedans; road ETA beats aerial distance; full lifecycle + review', async () => {
    for (let ride = 1; ride <= 10; ride++) {
      const reqId = await book(ride - 1, VehicleType.SEDAN);
      const wave = await liveOffers(reqId);
      const offeredKeys = wave.map((o) => keyOf(o.driverId));

      expect(wave.length).toBeGreaterThan(0);
      expect(wave.length).toBeLessThanOrEqual(2); // remaining * 2 oversubscription
      for (const k of offeredKeys) expect(D(k).type).toBe(VehicleType.SEDAN);
      expect(offeredKeys).not.toContain('sedan-offline');
      expect(offeredKeys).not.toContain('sedan-unverified');
      // Aerially closest sedan is 40 min away by road -> never in a 2-driver wave 1
      expect(offeredKeys).not.toContain('sedan-2');
      // Rookie exploration slot
      expect(offeredKeys).toContain('sedan-rookie');
      // Dispatch-time snapshot stored for later behaviour decisions
      expect(wave.every((o) => o.distanceKm !== null && o.etaMinutes !== null && o.waveNumber === 1)).toBe(true);

      const chosen = wave[ride % wave.length];
      await accept(chosen.id, chosen.driverId);
      const trip = await tripFor(reqId, chosen.driverId);
      await completeTrip(trip.id);
      await review(ride - 1, trip.id, 5);

      const req = await prisma.requirement.findUniqueOrThrow({ where: { id: reqId } });
      expect(req.status).toBe(RequirementStatus.COMPLETED);
    }
  });

  it('Rides 11-15: SUV bookings never reach the nearer sedans/hatchbacks; customer cancels before pickup', async () => {
    for (let ride = 11; ride <= 15; ride++) {
      const vendorIdx = ride - 11;
      const reqId = await book(vendorIdx, VehicleType.SUV);
      const wave = await liveOffers(reqId);
      expect(wave.length).toBeGreaterThan(0);
      for (const o of wave) expect(D(keyOf(o.driverId)).type).toBe(VehicleType.SUV);

      if (ride <= 13) {
        // Accept, then customer cancels the trip before pickup -> capacity reopens, replacement wave is SUV-only
        await accept(wave[0].id, wave[0].driverId);
        const trip = await tripFor(reqId, wave[0].driverId);
        const trustBefore = (await prisma.driver.findUniqueOrThrow({ where: { id: wave[0].driverId } })).trustScore;
        await trips.cancelTrip(trip.id, vendors[vendorIdx].userId, UserRole.VENDOR, { reason: 'plans changed' } as any);
        await new Promise((r) => setTimeout(r, 300)); // replacement dispatch is fire-and-forget

        const after = await prisma.driver.findUniqueOrThrow({ where: { id: wave[0].driverId } });
        expect(after.trustScore).toBe(trustBefore); // customer cancel never penalizes the driver
        const req = await prisma.requirement.findUniqueOrThrow({ where: { id: reqId } });
        expect(req.assignedQuantity).toBe(0);
        const replacement = await liveOffers(reqId);
        for (const o of replacement) {
          expect(D(keyOf(o.driverId)).type).toBe(VehicleType.SUV);
          expect(o.driverId).not.toBe(wave[0].driverId);
        }
      }

      // Customer then cancels the whole booking -> live offers cancelled, unfilled capacity refunded
      await requirements.cancelRequirement(reqId, vendors[vendorIdx].userId, { reason: 'no longer needed' } as any);
      expect(await liveOffers(reqId)).toHaveLength(0);
      const refund = await prisma.ledgerEntry.findFirst({ where: { referenceId: reqId, referenceType: 'REQUIREMENT_REFUND' } });
      expect(Number(refund?.amount)).toBe(RATE);

      // Late wave timer firing on a cancelled booking is a no-op (no penalties for cancelled offers)
      const declinedBefore = await prisma.driver.aggregate({ _sum: { declinedOffers: true } });
      await lapseWave(reqId);
      const declinedAfter = await prisma.driver.aggregate({ _sum: { declinedOffers: true } });
      expect(declinedAfter._sum.declinedOffers).toBe(declinedBefore._sum.declinedOffers);
    }
  });

  it('Rides 16-25: wave 1 times out -> wave 2 goes to NEW same-type drivers; only seen nearby skips are penalized', async () => {
    for (let ride = 16; ride <= 25; ride++) {
      const vendorIdx = (ride - 16) % 10;
      const reqId = await book(vendorIdx, VehicleType.SEDAN);
      const wave1 = await liveOffers(reqId);
      expect(wave1.length).toBeGreaterThan(0);

      const seen = ride % 2 === 0; // half the waves: push delivered and displayed
      if (seen) await driversSeeOffers(reqId);
      const before = new Map(
        (await prisma.driver.findMany({ where: { id: { in: wave1.map((o) => o.driverId) } } })).map((d) => [d.id, d]),
      );

      await lapseWave(reqId);

      for (const o of wave1) {
        const expired = await prisma.offer.findUniqueOrThrow({ where: { id: o.id } });
        expect(expired.status).toBe(OfferStatus.EXPIRED);
        const d = await prisma.driver.findUniqueOrThrow({ where: { id: o.driverId } });
        const b = before.get(o.driverId)!;
        const nearby = (o.distanceKm ?? 99) <= 3.5;
        if (seen) {
          expect(d.declinedOffers).toBe(b.declinedOffers + 1);
          if (nearby && !(d.cooldownUntil && d.cooldownUntil > new Date() && d.consecutiveDeclines === 0 && b.consecutiveDeclines === 2)) {
            expect(d.trustScore).toBeCloseTo(Math.max(0, b.trustScore - 1.5), 5);
          }
        } else {
          expect(d.declinedOffers).toBe(b.declinedOffers); // unseen expiry is not held against the driver
          expect(d.trustScore).toBe(b.trustScore);
        }
      }

      const wave2 = await liveOffers(reqId);
      const wave1Drivers = new Set(wave1.map((o) => o.driverId));
      for (const o of wave2) {
        expect(wave1Drivers.has(o.driverId)).toBe(false);
        expect(D(keyOf(o.driverId)).type).toBe(VehicleType.SEDAN);
        expect(o.waveNumber).toBe(2);
      }

      if (wave2.length > 0) {
        await accept(wave2[0].id, wave2[0].driverId);
        const trip = await tripFor(reqId, wave2[0].driverId);
        await completeTrip(trip.id);
        await review(vendorIdx, trip.id, 4);
      } else {
        await requirements.cancelRequirement(reqId, vendors[vendorIdx].userId, { reason: 'no supply' } as any).catch(() => undefined);
      }
      await advanceMinutes(5); // rides spread across the hour; cooldowns lapse
    }
  });

  it('Rides 26-30: cherry-picking driver declines 3 nearby rides -> cooldown, skipped, then eligible again', async () => {
    const others = sedanKeys().filter((k) => k !== 'sedan-1' && k !== 'sedan-offline' && k !== 'sedan-unverified');
    await setOnline(others, false); // late night: only sedan-1 online
    await advanceMinutes(60);
    // sedan-1 may carry a skip streak from earlier timeouts; an accepted ride resets it (streaks
    // intentionally persist across rides until the driver accepts or serves a cooldown)
    const warmup = await happyRide(9, VehicleType.SEDAN);
    expect(keyOf(warmup.driverId)).toBe('sedan-1');
    const start = await prisma.driver.findUniqueOrThrow({ where: { id: D('sedan-1').id } });
    expect(start.consecutiveDeclines).toBe(0);

    for (let ride = 26; ride <= 28; ride++) {
      const reqId = await book(ride - 26, VehicleType.SEDAN);
      const [offer] = await liveOffers(reqId);
      expect(keyOf(offer.driverId)).toBe('sedan-1');
      await offers.declineOffer(offer.id, D('sedan-1').userId, 'too short');
      await new Promise((r) => setTimeout(r, 200));
      const req = await prisma.requirement.findUniqueOrThrow({ where: { id: reqId } });
      expect(req.status).toBe(RequirementStatus.NO_DRIVER_AVAILABLE); // nobody else online
      await requirements.cancelRequirement(reqId, vendors[ride - 26].userId, { reason: 'no driver' } as any);
    }

    const cooled = await prisma.driver.findUniqueOrThrow({ where: { id: D('sedan-1').id } });
    expect(cooled.trustScore).toBeCloseTo(start.trustScore - 4.5, 5);
    expect(cooled.consecutiveDeclines).toBe(0); // streak converted into a cooldown
    expect(cooled.cooldownUntil!.getTime()).toBeGreaterThan(Date.now() + 2.5 * 60_000);
    expect(cooled.acceptanceRate).toBeLessThan(start.acceptanceRate);
    expect(events.some((e) => e.channel === `driver:${D('sedan-1').id}` && e.event === 'DRIVER_COOLDOWN')).toBe(true);

    // Ride 29: sedan-1 is in cooldown -> skipped even though it is the only sedan online
    const r29 = await book(3, VehicleType.SEDAN);
    expect(await liveOffers(r29)).toHaveLength(0);
    // Supply comes back online; customer retries -> another driver gets it
    await setOnline(others, true);
    await requirements.retryRequirement(r29, vendors[3].userId);
    const retryWave = await liveOffers(r29);
    expect(retryWave.length).toBeGreaterThan(0);
    expect(retryWave.map((o) => keyOf(o.driverId))).not.toContain('sedan-1');
    await accept(retryWave[0].id, retryWave[0].driverId);
    const t29 = await tripFor(r29, retryWave[0].driverId);
    await completeTrip(t29.id);
    await review(3, t29.id, 5);

    // Ride 30: once the cooldown window passes it lapses by itself -> sedan-1 eligible again.
    // (A repeat offender within 24h climbs the 3 -> 10 -> 30 minute ladder, so wait out the real window.)
    const cd = await prisma.driver.findUniqueOrThrow({ where: { id: D('sedan-1').id } });
    const ladder = [3, 10, 30];
    const expectedMinutes = ladder[cd.cooldownLevel];
    expect(Math.round((cd.cooldownUntil!.getTime() - cd.lastCooldownAt!.getTime()) / 60_000)).toBe(expectedMinutes);
    await advanceMinutes(expectedMinutes - 1);
    expect(await dispatchableNow('sedan-1')).toBe(false); // still cooling one minute before expiry
    await advanceMinutes(1);
    await setOnline(others, false);
    const r30 = await book(4, VehicleType.SEDAN);
    const [o30] = await liveOffers(r30);
    expect(keyOf(o30.driverId)).toBe('sedan-1');
    await accept(o30.id, o30.driverId);
    const afterAccept = await prisma.driver.findUniqueOrThrow({ where: { id: D('sedan-1').id } });
    expect(afterAccept.consecutiveDeclines).toBe(0);
    const t30 = await tripFor(r30, o30.driverId);
    await completeTrip(t30.id);
    await review(4, t30.id, 3);
    await setOnline(others, true);
  });

  it('Rides 31-35: concurrent accepts never overbook (1-seat, multi-cab, same-driver double accept)', async () => {
    await advanceMinutes(60);
    // Rides 31-33: two drivers race for a 1-seat ride
    for (let ride = 31; ride <= 33; ride++) {
      const vendorIdx = ride - 31 + 5;
      const reqId = await book(vendorIdx, VehicleType.HATCHBACK);
      const wave = await liveOffers(reqId);
      expect(wave.length).toBe(2);
      const results = await Promise.allSettled(wave.map((o) => accept(o.id, o.driverId)));
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(rejected.reason).toBeInstanceOf(ConflictException);
      const req = await prisma.requirement.findUniqueOrThrow({ where: { id: reqId } });
      expect(req.assignedQuantity).toBe(1);
      expect(await prisma.trip.count({ where: { requirementId: reqId } })).toBe(1);
      const t = await prisma.trip.findFirstOrThrow({ where: { requirementId: reqId } });
      await completeTrip(t.id);
      await review(vendorIdx, t.id, 5);
    }

    // Ride 34: 2-cab booking, 4 offers, all 4 drivers accept at once -> exactly 2 trips, assignedQuantity 2
    const r34 = await book(8, VehicleType.SEDAN, 2);
    const w34 = await liveOffers(r34);
    expect(w34.length).toBe(4);
    const res34 = await Promise.allSettled(w34.map((o) => accept(o.id, o.driverId)));
    expect(res34.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    const req34 = await prisma.requirement.findUniqueOrThrow({ where: { id: r34 } });
    expect(req34.assignedQuantity).toBe(2);
    expect(req34.status).toBe(RequirementStatus.FULFILLED);
    for (const t of await prisma.trip.findMany({ where: { requirementId: r34 } })) {
      await completeTrip(t.id);
      await review(8, t.id, 5);
    }

    // Ride 35: one driver holds offers for two different rides and accepts both simultaneously
    const suvOthers = ['suv-2', 'suv-3', 'suv-4'];
    await setOnline(suvOthers, false);
    const r35a = await book(9, VehicleType.SUV);
    const r35b = await book(0, VehicleType.SUV);
    const [oa] = await liveOffers(r35a);
    const [ob] = await liveOffers(r35b);
    expect(oa.driverId).toBe(D('suv-1').id);
    expect(ob.driverId).toBe(D('suv-1').id);
    const both = await Promise.allSettled([accept(oa.id, oa.driverId), accept(ob.id, ob.driverId)]);
    expect(both.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const active = await prisma.trip.count({ where: { driverId: D('suv-1').id, status: TripStatus.ASSIGNED } });
    expect(active).toBe(1);
    const won = await prisma.trip.findFirstOrThrow({ where: { driverId: D('suv-1').id, status: TripStatus.ASSIGNED } });
    const lostReq = won.requirementId === r35a ? r35b : r35a;
    const lostVendor = won.requirementId === r35a ? 0 : 9;
    const wonVendor = won.requirementId === r35a ? 9 : 0;
    await completeTrip(won.id);
    await review(wonVendor, won.id, 5);
    await setOnline(suvOthers, true);
    await requirements.cancelRequirement(lostReq, vendors[lostVendor].userId, { reason: 'took another cab' } as any);
  });

  it('Rides 36-40: driver cancellation, cancel-vs-accept race, and the wave cap', async () => {
    // Ride 36: driver cancels after assignment -> -5 trust, replacement wave excludes them
    const r36 = await book(1, VehicleType.SEDAN);
    const [o36] = await liveOffers(r36);
    await accept(o36.id, o36.driverId);
    const before36 = await prisma.driver.findUniqueOrThrow({ where: { id: o36.driverId } });
    const t36 = await tripFor(r36, o36.driverId);
    await trips.cancelTrip(t36.id, D(keyOf(o36.driverId)).userId, UserRole.DRIVER, { reason: 'vehicle issue' } as any);
    await new Promise((r) => setTimeout(r, 300));
    const after36 = await prisma.driver.findUniqueOrThrow({ where: { id: o36.driverId } });
    expect(after36.trustScore).toBeCloseTo(Math.max(0, before36.trustScore - 5), 5);
    expect(after36.availabilityStatus).toBe(DriverAvailability.AVAILABLE);
    const repl = await liveOffers(r36);
    expect(repl.length).toBeGreaterThan(0);
    expect(repl.map((o) => o.driverId)).not.toContain(o36.driverId);
    await accept(repl[0].id, repl[0].driverId);
    const t36b = await tripFor(r36, repl[0].driverId);
    await completeTrip(t36b.id);
    await review(1, t36b.id, 5);

    // Rides 37-38: customer cancels while a driver accepts at the same moment -> exactly one wins
    for (let ride = 37; ride <= 38; ride++) {
      const vIdx = ride - 35;
      const reqId = await book(vIdx, VehicleType.HATCHBACK);
      const [o] = await liveOffers(reqId);
      const [cancelRes, acceptRes] = await Promise.allSettled([
        requirements.cancelRequirement(reqId, vendors[vIdx].userId, { reason: 'race' } as any),
        accept(o.id, o.driverId),
      ]);
      const req = await prisma.requirement.findUniqueOrThrow({ where: { id: reqId } });
      const tripCount = await prisma.trip.count({ where: { requirementId: reqId } });
      const refunded = await prisma.ledgerEntry.count({ where: { referenceId: reqId, referenceType: 'REQUIREMENT_REFUND' } });
      if (cancelRes.status === 'fulfilled' && acceptRes.status === 'rejected') {
        expect(req.status).toBe(RequirementStatus.CANCELLED);
        expect(tripCount).toBe(0);
        expect(refunded).toBe(1);
      } else {
        expect(acceptRes.status).toBe('fulfilled');
        expect(tripCount).toBe(1);
        expect(refunded).toBe(0); // never both a trip and a refund for the same cab
        const t = await prisma.trip.findFirstOrThrow({ where: { requirementId: reqId } });
        await completeTrip(t.id);
        await review(vIdx, t.id, 5);
      }
    }

    // Ride 39: offers keep timing out -> after DISPATCH_MAX_WAVES the booking stops spamming drivers
    process.env.DISPATCH_MAX_WAVES = '2';
    const r39 = await book(4, VehicleType.SEDAN);
    await lapseWave(r39); // wave 1 -> wave 2
    expect((await liveOffers(r39)).every((o) => o.waveNumber === 2)).toBe(true);
    await lapseWave(r39); // wave 2 lapses -> cap reached
    const req39 = await prisma.requirement.findUniqueOrThrow({ where: { id: r39 } });
    expect(req39.status).toBe(RequirementStatus.NO_DRIVER_AVAILABLE);
    expect(await liveOffers(r39)).toHaveLength(0);
    expect(events.some((e) => e.event === 'REQUIREMENT_NO_DRIVERS' && e.payload.requirementId === r39 && e.payload.reason === 'wave_limit')).toBe(true);

    // Ride 40: customer retries the capped booking -> fresh wave budget, ride completes
    await requirements.retryRequirement(r39, vendors[4].userId);
    const retry = await liveOffers(r39);
    expect(retry.length).toBeGreaterThan(0);
    ridesBooked++; // a retried booking is a separate dispatch attempt in the ride count
    await accept(retry[0].id, retry[0].driverId);
    const t39 = await tripFor(r39, retry[0].driverId);
    await completeTrip(t39.id);
    await review(4, t39.id, 5);
    process.env.DISPATCH_MAX_WAVES = '5';
  });

  it('Rides 41-45: mandatory review gate (block, multi-cab chain, rating impact, cutoff)', async () => {
    await advanceMinutes(60);
    // Ride 41: completed but NOT reviewed
    const r41 = await book(2, VehicleType.SEDAN);
    const [o41] = await liveOffers(r41);
    await accept(o41.id, o41.driverId);
    const t41 = await tripFor(r41, o41.driverId);
    await completeTrip(t41.id);

    // Ride 42 attempt is blocked with a structured 403; no money moves
    const balanceBefore = (await prisma.vendor.findUniqueOrThrow({ where: { id: vendors[2].id } })).escrowBalance;
    const err = await book(2, VehicleType.SEDAN).catch((e) => e);
    ridesBooked--; // blocked attempt created nothing
    expect(err).toBeInstanceOf(ForbiddenException);
    expect(err.getResponse()).toEqual(
      expect.objectContaining({ error: 'MANDATORY_REVIEW_PENDING', details: expect.objectContaining({ tripId: t41.id, pendingCount: 1 }) }),
    );
    expect((await prisma.vendor.findUniqueOrThrow({ where: { id: vendors[2].id } })).escrowBalance).toEqual(balanceBefore);
    const pending = await trips.getPendingReview(vendors[2].userId);
    expect(pending).toEqual(expect.objectContaining({ pending: true, pendingCount: 1 }));
    expect(pending.trip.id).toBe(t41.id);

    // 1-star review lowers the driver's average and unblocks the customer
    const drvBefore = await prisma.driver.findUniqueOrThrow({ where: { id: o41.driverId } });
    await review(2, t41.id, 1);
    const drvAfter = await prisma.driver.findUniqueOrThrow({ where: { id: o41.driverId } });
    expect(drvAfter.averageRating).toBeLessThan(drvBefore.averageRating);
    // Duplicate review is rejected (client closes the sheet on 409)
    await expect(review(2, t41.id, 5)).rejects.toThrow('already submitted');

    // Ride 42 (now allowed): a 2-cab booking -> two reviews owed, oldest first, one at a time
    const r42 = await book(2, VehicleType.SEDAN, 2);
    const w42 = await liveOffers(r42);
    await accept(w42[0].id, w42[0].driverId);
    await accept(w42[1].id, w42[1].driverId);
    const t42 = await prisma.trip.findMany({ where: { requirementId: r42 } });
    for (const t of t42) await completeTrip(t.id);
    const p42 = await trips.getPendingReview(vendors[2].userId);
    expect(p42.pendingCount).toBe(2);
    await review(2, p42.trip.id, 5);
    const blocked = await book(2, VehicleType.SEDAN).catch((e) => e);
    ridesBooked--;
    expect(blocked).toBeInstanceOf(ForbiddenException);
    expect(blocked.getResponse().details.pendingCount).toBe(1);
    const p42b = await trips.getPendingReview(vendors[2].userId);
    await review(2, p42b.trip.id, 4);

    // Ride 43: unblocked after both reviews
    const r43 = await happyRide(2, VehicleType.HATCHBACK);
    expect(r43.reqId).toBeDefined();

    // Ride 44: a trip completed BEFORE the gate launch never blocks (historical customers)
    process.env.REVIEW_GATE_START_AT = new Date(Date.now() + 1000).toISOString();
    const r44 = await book(6, VehicleType.SEDAN);
    const [o44] = await liveOffers(r44);
    await accept(o44.id, o44.driverId);
    const t44 = await tripFor(r44, o44.driverId);
    await completeTrip(t44.id);
    await prisma.trip.update({ where: { id: t44.id }, data: { completedAt: new Date('2025-01-01T00:00:00Z') } });
    expect((await trips.getPendingReview(vendors[6].userId)).pending).toBe(false);

    // Ride 45: the same customer books again without being blocked
    const r45 = await happyRide(6, VehicleType.SUV);
    expect(r45.reqId).toBeDefined();
    process.env.REVIEW_GATE_START_AT = '2020-01-01T00:00:00.000Z';
    await review(6, t44.id, 5); // tidy up so later rides are not blocked under the old cutoff
  });

  it('Rides 46-50: restart mid-wave, duplicate reapers, Google outage, no-GPS driver, rookie fairness', async () => {
    await advanceMinutes(60);
    // Ride 46: API restarts while wave 1 counts down (in-memory jobs lost) -> rehydration restores the timer
    const r46 = await book(7, VehicleType.SEDAN);
    const w46 = await liveOffers(r46);
    scheduler = new DispatchSchedulerService(undefined);
    scheduler.registerHandler((m) => dispatch.handleScheduledJob(m));
    (dispatch as any).scheduler = scheduler;
    await dispatch.rehydratePendingWaveTimers();
    await lapseWave(r46);
    for (const o of w46) expect((await prisma.offer.findUniqueOrThrow({ where: { id: o.id } })).status).toBe(OfferStatus.EXPIRED);
    const w46b = await liveOffers(r46);
    expect(w46b.length).toBeGreaterThan(0);
    await accept(w46b[0].id, w46b[0].driverId);
    const t46 = await tripFor(r46, w46b[0].driverId);
    await completeTrip(t46.id);
    await review(7, t46.id, 5);

    // Ride 47: two API instances reap the same expired wave at the same instant -> processed once
    const r47 = await book(8, VehicleType.HATCHBACK);
    const w47 = await liveOffers(r47);
    await driversSeeOffers(r47);
    const declinedBefore = await prisma.driver.findMany({ where: { id: { in: w47.map((o) => o.driverId) } } });
    await prisma.offer.updateMany({ where: { requirementId: r47, status: OfferStatus.SENT }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const [a, b] = await Promise.all([dispatch.reapExpiredOffersAndRedispatch(r47), dispatch.reapExpiredOffersAndRedispatch(r47)]);
    expect(a.expiredCount + b.expiredCount).toBe(w47.length);
    for (const d of declinedBefore) {
      const now47 = await prisma.driver.findUniqueOrThrow({ where: { id: d.id } });
      expect(now47.declinedOffers).toBe(d.declinedOffers + 1);
    }
    const waves47 = await prisma.offer.groupBy({ by: ['waveNumber'], where: { requirementId: r47 }, _count: true });
    expect(waves47.every((w) => w.waveNumber <= 2)).toBe(true);
    const live47 = await liveOffers(r47);
    if (live47.length > 0) {
      await accept(live47[0].id, live47[0].driverId);
      const t47 = await tripFor(r47, live47[0].driverId);
      await completeTrip(t47.id);
      await review(8, t47.id, 5);
    } else {
      await requirements.cancelRequirement(r47, vendors[8].userId, { reason: 'no supply' } as any).catch(() => undefined);
    }

    // Ride 48: Google routing is down -> dispatch still succeeds on road-factor estimates
    routing.outage = true;
    const r48 = await happyRide(9, VehicleType.SEDAN);
    expect(r48.reqId).toBeDefined();
    routing.outage = false;

    // Ride 49: a driver with no GPS fix is still dispatchable (ranked last), never treated as 0 km away
    await seedDriver('suv-nogps', VehicleType.SUV, 0, 0, { noGps: true, trust: 100 });
    await setOnline(['suv-1', 'suv-2', 'suv-3', 'suv-4'], false);
    const r49 = await book(5, VehicleType.SUV);
    const [o49] = await liveOffers(r49);
    expect(keyOf(o49.driverId)).toBe('suv-nogps');
    expect(o49.distanceKm).toBeNull();
    expect(o49.etaMinutes).toBeNull();
    await prisma.offer.update({ where: { id: o49.id }, data: { seenAt: new Date() } });
    await offers.declineOffer(o49.id, D('suv-nogps').userId);
    const nogps = await prisma.driver.findUniqueOrThrow({ where: { id: D('suv-nogps').id } });
    expect(nogps.trustScore).toBe(100); // unknown distance is never "nearby"
    await setOnline(['suv-1', 'suv-2', 'suv-3', 'suv-4'], true);
    await requirements.retryRequirement(r49, vendors[5].userId);
    const w49 = await liveOffers(r49);
    await accept(w49[0].id, w49[0].driverId);
    const t49 = await tripFor(r49, w49[0].driverId);
    await completeTrip(t49.id);
    await review(5, t49.id, 5);

    // Ride 50: rookie exploration — the rookie appears in the wave despite a lower composite score
    const r50 = await book(0, VehicleType.SEDAN);
    const w50 = await liveOffers(r50);
    expect(w50.map((o) => keyOf(o.driverId))).toContain('sedan-rookie');
    const rookieOffer = w50.find((o) => keyOf(o.driverId) === 'sedan-rookie')!;
    await accept(rookieOffer.id, rookieOffer.driverId);
    const t50 = await tripFor(r50, rookieOffer.driverId);
    await completeTrip(t50.id);
    await review(0, t50.id, 5);

    expect(ridesBooked).toBeGreaterThanOrEqual(50);
  });

  it('Summary: aggregate health after the full simulation', async () => {
    const [reqs, completedTrips, cancelledTrips, expired, declined, cooldowns] = await Promise.all([
      prisma.requirement.count(),
      prisma.trip.count({ where: { status: TripStatus.COMPLETED } }),
      prisma.trip.count({ where: { status: TripStatus.CANCELLED } }),
      prisma.offer.count({ where: { status: OfferStatus.EXPIRED } }),
      prisma.offer.count({ where: { status: OfferStatus.DECLINED } }),
      prisma.driver.count({ where: { lastCooldownAt: { not: null } } }),
    ]);
    // eslint-disable-next-line no-console
    console.log(
      `[dispatch-simulation] rides=${ridesBooked} requirements=${reqs} completedTrips=${completedTrips} ` +
        `cancelledTrips=${cancelledTrips} expiredOffers=${expired} declinedOffers=${declined} driversCooledDown=${cooldowns} routingCalls=${routing.calls}`,
    );
    expect(reqs).toBeGreaterThanOrEqual(49);
    expect(completedTrips).toBeGreaterThanOrEqual(35);
    expect(await prisma.offer.count({ where: { status: OfferStatus.SENT, requirement: { status: { in: ['CANCELLED', 'COMPLETED'] } } } })).toBe(0);
  });
});
