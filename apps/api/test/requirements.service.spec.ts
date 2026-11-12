import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsService } from '../src/modules/requirements/requirements.service';
import { DatabaseService } from '../src/database/database.service';
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { DistancePricingService } from '../src/modules/pricing/distance-pricing.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  RequirementStatus,
  VerificationStatus,
  VehicleType,
  OfferStatus,
  InvalidStateTransitionError,
} from '@adhocx/contracts';

describe('RequirementsService Unit Tests', () => {
  let service: RequirementsService;
  let db: any;
  let dispatchService: any;
  let distancePricing: any;
  let notifications: any;
  let audit: any;
  const quotedAt = new Date();

  beforeEach(async () => {
    db = {
      vendor: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'vnd-1', verificationStatus: VerificationStatus.VERIFIED }),
      },
      requirement: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      offer: {
        updateMany: jest.fn(),
      },
      ledgerEntry: {
        create: jest.fn().mockResolvedValue({ id: 'led-1' }),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
      },
      trip: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      tripPricingSnapshot: { create: jest.fn().mockResolvedValue({ id: 'snap-1' }) },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(db)),
    };

    dispatchService = {
      dispatchRequirement: jest.fn().mockResolvedValue({ offersCreated: 2 }),
    };

    // Distance engine double: a quote of ₹1,500 per vehicle (driver payout ₹1,200).
    distancePricing = {
      createVendorQuote: jest.fn().mockResolvedValue({ quoteId: 'q-auto' }),
      lockPricingSnapshotForBooking: jest.fn(async (quoteId: string) => ({
        quote: { id: quoteId, planId: 'plan-1', createdAt: quotedAt },
        planVersion: '1',
        distanceM: 22400,
        slabId: 'slab-4',
        vendorPricePaise: 150000,
        driverPayoutPaise: 120000,
        grossSpreadPaise: 30000,
      })),
      consumeQuote: jest.fn().mockResolvedValue(undefined),
      findBookingForQuote: jest.fn().mockResolvedValue(null),
    };

    notifications = {
      emitEvent: jest.fn(),
      sendPush: jest.fn(),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        { provide: DatabaseService, useValue: db },
        { provide: DispatchService, useValue: dispatchService },
        { provide: DistancePricingService, useValue: distancePricing },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<RequirementsService>(RequirementsService);
  });

  it('should create requirement, compute totalAmount, and trigger auto-dispatch for VERIFIED vendor', async () => {
    db.vendor.findUnique.mockResolvedValue({
      id: 'vnd-1',
      userId: 'usr-vnd-1',
      verificationStatus: VerificationStatus.VERIFIED,
      escrowBalance: 10000,
    });

    const now = new Date();
    db.requirement.create.mockResolvedValue({
      id: 'req-1',
      vendorId: 'vnd-1',
      vehicleType: VehicleType.SEDAN,
      quantity: 2,
      assignedQuantity: 0,
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      pickupAddress: 'Connaught Place',
      dropLat: 28.5355,
      dropLng: 77.3910,
      dropAddress: 'Noida Sector 62',
      reportingTime: now,
      ratePerVehicle: 1500,
      totalAmount: 3000,
      status: RequirementStatus.POSTED,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.createRequirement('usr-vnd-1', {
      vehicleType: VehicleType.SEDAN,
      quantity: 2,
      pickupLocation: { latitude: 28.6139, longitude: 77.2090, address: 'Connaught Place' },
      dropLocation: { latitude: 28.5355, longitude: 77.3910, address: 'Noida Sector 62' },
      reportingTime: now.toISOString(),
      ratePerVehicle: 1500,
    });

    expect(result.id).toBe('req-1');
    expect(result.totalAmount).toBe(3000);
    expect(result.status).toBe(RequirementStatus.POSTED);
    expect(dispatchService.dispatchRequirement).toHaveBeenCalledWith('req-1');
  });

  describe('mandatory review gate', () => {
    const bookingDto = () => ({
      vehicleType: VehicleType.SEDAN,
      quantity: 1,
      pickupLocation: { latitude: 28.6139, longitude: 77.209, address: 'CP' },
      dropLocation: { latitude: 28.5355, longitude: 77.391, address: 'Noida' },
      reportingTime: new Date().toISOString(),
      ratePerVehicle: 1500,
    });

    beforeEach(() => {
      db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1', verificationStatus: VerificationStatus.VERIFIED });
    });

    it('blocks booking with a structured 403 naming the oldest unreviewed trip', async () => {
      db.trip.findFirst.mockResolvedValue({ id: 'trip-old', driver: { fullName: 'Aarav', vehiclePlate: 'DL1C1234', user: null } });
      db.trip.count.mockResolvedValue(2);

      const err = await service.createRequirement('usr-vnd-1', bookingDto() as any).catch((e) => e);

      expect(err.getStatus()).toBe(403);
      expect(err.getResponse()).toEqual(
        expect.objectContaining({
          error: 'MANDATORY_REVIEW_PENDING',
          details: expect.objectContaining({ tripId: 'trip-old', pendingCount: 2, driverName: 'Aarav' }),
        }),
      );
      expect(db.requirement.create).not.toHaveBeenCalled();
      expect(db.trip.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { completedAt: 'asc' } }),
      );
    });

    it('reaches the client as error.code + error.details through the global HttpExceptionFilter', async () => {
      db.trip.findFirst.mockResolvedValue({ id: 'trip-old', driver: { fullName: 'Aarav', vehiclePlate: null, user: null } });
      db.trip.count.mockResolvedValue(1);
      const err = await service.createRequirement('usr-vnd-1', bookingDto() as any).catch((e) => e);

      const json = jest.fn();
      const res = { status: jest.fn().mockReturnValue({ json }) };
      new HttpExceptionFilter().catch(err, { switchToHttp: () => ({ getResponse: () => res }) } as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(json.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'MANDATORY_REVIEW_PENDING',
            details: expect.objectContaining({ tripId: 'trip-old', pendingCount: 1 }),
          }),
        }),
      );
    });

    it('only considers trips completed after the gate cutoff and without an open dispute', async () => {
      process.env.REVIEW_GATE_START_AT = '2026-10-12T00:00:00.000Z';
      db.trip.findFirst.mockResolvedValue({ id: 'trip-x', driver: null });
      await service.createRequirement('usr-vnd-1', bookingDto() as any).catch(() => undefined);

      const where = db.trip.findFirst.mock.calls[0][0].where;
      expect(where.completedAt).toEqual({ gte: new Date('2026-10-12T00:00:00.000Z') });
      expect(where.reviews).toEqual({ none: { reviewerId: 'usr-vnd-1' } });
      expect(where.disputes).toBeDefined();
      delete process.env.REVIEW_GATE_START_AT;
    });

    it('can be disabled with REVIEW_GATE_ENABLED=false', async () => {
      process.env.REVIEW_GATE_ENABLED = 'false';
      db.trip.findFirst.mockResolvedValue({ id: 'trip-old', driver: null });
      db.requirement.create.mockResolvedValue({
        id: 'req-9', vendorId: 'vnd-1', vehicleType: VehicleType.SEDAN, quantity: 1, assignedQuantity: 0,
        pickupLat: 1, pickupLng: 1, pickupAddress: 'a', dropLat: 1, dropLng: 1, dropAddress: 'b',
        reportingTime: new Date(), ratePerVehicle: 1500, totalAmount: 1500, status: RequirementStatus.POSTED,
        createdAt: new Date(), updatedAt: new Date(),
      });
      try {
        const res = await service.createRequirement('usr-vnd-1', bookingDto() as any);
        expect(res.id).toBe('req-9');
        expect(db.trip.findFirst).not.toHaveBeenCalled();
      } finally {
        delete process.env.REVIEW_GATE_ENABLED;
      }
    });
  });

  it('should return requirement details with remaining quantity and offers count', async () => {
    const now = new Date();
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.requirement.findUnique.mockResolvedValue({
      id: 'req-1',
      vendorId: 'vnd-1',
      vehicleType: VehicleType.SEDAN,
      quantity: 5,
      assignedQuantity: 2,
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      pickupAddress: 'CP',
      dropLat: 28.5355,
      dropLng: 77.3910,
      dropAddress: 'Noida',
      reportingTime: now,
      ratePerVehicle: 1200,
      totalAmount: 6000,
      status: RequirementStatus.PARTIALLY_FULFILLED,
      createdAt: now,
      updatedAt: now,
      offers: [
        { id: 'off-1', createdAt: now, expiresAt: now },
        { id: 'off-2', createdAt: now, expiresAt: now },
        { id: 'off-3', createdAt: now, expiresAt: now },
      ],
      assignments: [
        {
          id: 'asg-1',
          driverId: 'drv-1',
          driver: { fullName: 'Driver One', phone: '+919876543210', vehiclePlate: 'DL01A1234' },
          trip: { status: 'ASSIGNED' },
        },
      ],
    });

    const result = await service.getRequirementDetails('a0000000-0000-0000-0000-000000000001', 'usr-vnd-1');
    expect(result.remainingQuantity).toBe(3);
    expect(result.offersCount).toBe(3);
    expect(result.assignedDrivers).toHaveLength(1);
    expect(result.assignedDrivers![0].driverName).toBe('Driver One');
  });

  it('should cancel requirement and invalidate pending SENT offers', async () => {
    const now = new Date();
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.requirement.findUnique.mockResolvedValueOnce({
      id: 'a0000000-0000-0000-0000-000000000001',
      vendorId: 'vnd-1',
      status: RequirementStatus.POSTED,
      offers: [{ id: 'off-1', driverId: 'drv-1', status: OfferStatus.SENT }],
    });
    db.requirement.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    db.vendor.update.mockResolvedValue({ id: 'vnd-1', escrowBalance: 1000 });

    // Post-lock read-back inside the cancellation transaction
    db.requirement.findUnique.mockResolvedValueOnce({
      id: 'a0000000-0000-0000-0000-000000000001',
      vendorId: 'vnd-1',
      vehicleType: VehicleType.SEDAN,
      quantity: 1,
      assignedQuantity: 0,
      pickupLat: 28.6139,
      pickupLng: 77.2090,
      pickupAddress: 'CP',
      dropLat: 28.5355,
      dropLng: 77.3910,
      dropAddress: 'Noida',
      reportingTime: now,
      ratePerVehicle: 1000,
      totalAmount: 1000,
      status: RequirementStatus.CANCELLED,
      createdAt: now,
      updatedAt: now,
    });

    const result = await service.cancelRequirement('a0000000-0000-0000-0000-000000000001', 'usr-vnd-1', {
      reason: 'Client cancelled event',
    });

    expect(result.status).toBe(RequirementStatus.CANCELLED);
    expect(db.offer.updateMany).toHaveBeenCalledWith({
      where: { requirementId: 'a0000000-0000-0000-0000-000000000001', status: OfferStatus.SENT },
      data: { status: OfferStatus.CANCELLED },
    });
    expect(notifications.emitEvent).toHaveBeenCalledWith(
      'driver:drv-1',
      'OFFER_CANCELLED',
      expect.anything(),
    );
    // Refund computed from the post-lock read-back (1 unassigned of 1 -> full refund)
    expect(db.vendor.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { escrowBalance: { increment: 1000 } } }),
    );
  });

  it('cancellation loses cleanly to a concurrent accept: no refund, offers untouched', async () => {
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.requirement.findUnique.mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000001',
      vendorId: 'vnd-1',
      status: RequirementStatus.DISPATCHING,
      offers: [{ id: 'off-1', driverId: 'drv-1', status: OfferStatus.SENT }],
    });
    db.requirement.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    db.vendor.update.mockClear();
    db.offer.updateMany.mockClear();

    await expect(
      service.cancelRequirement('a0000000-0000-0000-0000-000000000001', 'usr-vnd-1', { reason: 'x' }),
    ).rejects.toThrow('Requirement changed while cancelling');
    expect(db.vendor.update).not.toHaveBeenCalled();
    expect(db.offer.updateMany).not.toHaveBeenCalled();
  });

  it('should reject cancellation if requirement is already COMPLETED', async () => {
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.requirement.findUnique.mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000001',
      vendorId: 'vnd-1',
      status: RequirementStatus.COMPLETED,
      offers: [],
    });

    await expect(
      service.cancelRequirement('a0000000-0000-0000-0000-000000000001', 'usr-vnd-1', { reason: 'Late cancel' }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  describe('distance-priced bookings', () => {
    const now = new Date();
    const dto: any = {
      vehicleType: VehicleType.SEDAN,
      quantity: 1,
      pickupLocation: { latitude: 17.3753, longitude: 78.4983, address: 'Malakpet' },
      dropLocation: { latitude: 17.4435, longitude: 78.3772, address: 'HITEC City' },
      reportingTime: now.toISOString(),
      quoteId: '11111111-1111-4111-8111-111111111111',
    };

    beforeEach(() => {
      db.vendor.findUnique.mockResolvedValue({
        id: 'vnd-1',
        userId: 'usr-vnd-1',
        verificationStatus: VerificationStatus.VERIFIED,
        escrowBalance: 10000,
      });
      db.vendor.update.mockResolvedValue({ id: 'vnd-1', escrowBalance: 8500 });
      db.requirement.create.mockImplementation(async ({ data }: any) => ({ id: 'req-d1', ...data, createdAt: now, updatedAt: now }));
    });

    it('prices from the quote, consumes it and stores the snapshot inside the booking transaction', async () => {
      const result = await service.createRequirement('usr-vnd-1', dto);

      expect(distancePricing.lockPricingSnapshotForBooking).toHaveBeenCalledWith(dto.quoteId, 'usr-vnd-1', {
        pickup: dto.pickupLocation,
        drop: dto.dropLocation,
        vehicleCategory: VehicleType.SEDAN,
        // The quote's peak/non-peak period is checked against the trip's own reporting time.
        reportingTime: dto.reportingTime,
      });
      expect(db.requirement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ratePerVehicle: 1500, totalAmount: 1500 }) }),
      );
      expect(distancePricing.consumeQuote).toHaveBeenCalledWith(db, dto.quoteId, 'req-d1');
      expect(db.tripPricingSnapshot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ requirementId: 'req-d1', vendorPricePaise: 150000, driverPayoutPaise: 120000, distanceM: 22400 }),
      });
      expect(db.vendor.update).toHaveBeenCalledWith(expect.objectContaining({ data: { escrowBalance: { decrement: 1500 } } }));
      // The vendor response never carries the driver payout or the spread.
      expect(JSON.stringify(result)).not.toMatch(/driverPayout|grossSpread|120000|1200\b/);
    });

    it('never trusts a client-supplied price: the server quote wins', async () => {
      await service.createRequirement('usr-vnd-1', { ...dto, ratePerVehicle: 1 });
      expect(db.requirement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ratePerVehicle: 1500 }) }),
      );
    });

    it('re-sending an already-booked quote returns the original booking without a second debit', async () => {
      distancePricing.findBookingForQuote.mockResolvedValue('req-d1');
      db.requirement.findUnique.mockResolvedValue({
        id: 'req-d1', vendorId: 'vnd-1', vehicleType: VehicleType.SEDAN, quantity: 1, assignedQuantity: 0,
        pickupLat: 17.3753, pickupLng: 78.4983, pickupAddress: 'Malakpet', dropLat: 17.4435, dropLng: 78.3772,
        dropAddress: 'HITEC City', reportingTime: now, ratePerVehicle: 1500, totalAmount: 1500,
        status: RequirementStatus.POSTED, createdAt: now, updatedAt: now,
      });
      const result = await service.createRequirement('usr-vnd-1', dto);
      expect(result.id).toBe('req-d1');
      expect(db.requirement.create).not.toHaveBeenCalled();
      expect(db.vendor.update).not.toHaveBeenCalled();
    });

    it('without a quote, an automatic quote is made; if pricing fails the booking is refused (no fallback price)', async () => {
      distancePricing.createVendorQuote.mockRejectedValueOnce(
        new HttpException({ code: 'PRICING_ROUTE_UNAVAILABLE', message: 'Maps down' }, HttpStatus.SERVICE_UNAVAILABLE),
      );
      await expect(service.createRequirement('usr-vnd-1', { ...dto, quoteId: undefined })).rejects.toMatchObject({
        status: HttpStatus.SERVICE_UNAVAILABLE,
      });
      expect(db.requirement.create).not.toHaveBeenCalled();
      expect(db.vendor.update).not.toHaveBeenCalled();

      await service.createRequirement('usr-vnd-1', { ...dto, quoteId: undefined });
      expect(distancePricing.createVendorQuote).toHaveBeenLastCalledWith(
        // Priced for the reporting time, not the moment of booking.
        { pickup: dto.pickupLocation, drop: dto.dropLocation, vehicleCategory: VehicleType.SEDAN, pickupTime: dto.reportingTime },
        'usr-vnd-1',
      );
    });

    it('a quote used by a concurrent booking aborts the transaction', async () => {
      distancePricing.consumeQuote.mockRejectedValueOnce(new HttpException('This quote has already been used', HttpStatus.CONFLICT));
      await expect(service.createRequirement('usr-vnd-1', dto)).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
      expect(db.tripPricingSnapshot.create).not.toHaveBeenCalled();
    });

    it('a concurrent booking that spent the wallet makes this one fail instead of overdrawing', async () => {
      db.vendor.update.mockResolvedValueOnce({ id: 'vnd-1', escrowBalance: -500 });
      await expect(service.createRequirement('usr-vnd-1', dto)).rejects.toThrow(/Insufficient AdhocX Wallet balance/);
      expect(distancePricing.consumeQuote).not.toHaveBeenCalled();
    });

    it('vendor-role accounts without a vendor profile cannot read other requirements', async () => {
      db.vendor.findUnique.mockResolvedValue(null);
      db.requirement.findUnique.mockResolvedValue({ id: '99999999-9999-9999-9999-999999999999', vendorId: 'vnd-other', offers: [], assignments: [] });
      await expect(service.getRequirementDetails('99999999-9999-9999-9999-999999999999', 'usr-new', 'VENDOR')).rejects.toThrow(/Not authorized/);
    });

    it('persists hasEscort and escortFarePaise on the locked TripPricingSnapshot', async () => {
      distancePricing.lockPricingSnapshotForBooking.mockResolvedValueOnce({
        quote: { id: 'q-esc', planId: 'plan-1', createdAt: quotedAt },
        planVersion: '1',
        distanceM: 22400,
        slabId: 'slab-4',
        vendorPricePaise: 180000,
        driverPayoutPaise: 120000,
        grossSpreadPaise: 30000,
        hasEscort: true,
        escortFarePaise: 30000,
      });

      const created = await service.createRequirement('usr-vnd-1', { ...dto, quoteId: 'q-esc', hasEscort: true });

      expect(db.tripPricingSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hasEscort: true,
            escortFarePaise: 30000,
            vendorPricePaise: 180000,
            driverPayoutPaise: 120000,
            grossSpreadPaise: 30000,
          }),
        }),
      );
      expect(created.hasEscort).toBe(true);
      expect(created.escortFareRupees).toBe(300);
    });
  });
});
