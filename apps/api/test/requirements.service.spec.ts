import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsService } from '../src/modules/requirements/requirements.service';
import { DatabaseService } from '../src/database/database.service';
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PricingService } from '../src/modules/pricing/pricing.service';
import { ZonalPricingService } from '../src/modules/pricing/zonal-pricing.service';
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
  let pricingService: any;
  let notifications: any;
  let audit: any;
  let zonalPricing: any;

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
      bid: {
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
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(db)),
    };

    dispatchService = {
      dispatchRequirement: jest.fn().mockResolvedValue({ offersCreated: 2 }),
    };

    pricingService = {
      calculateDistanceKm: jest.fn().mockReturnValue(15),
      calculateRoadDistanceAndEta: jest.fn().mockResolvedValue({ distanceKm: 15, durationMinutes: 30, durationSeconds: 1800, isRealRoad: true }),
      calculateDriverRate: jest.fn().mockReturnValue(800),
      calculateMinimumFare: jest.fn().mockReturnValue(800),
      calculateSurgeMultiplier: jest.fn().mockReturnValue(1.0),
    };

    notifications = {
      emitEvent: jest.fn(),
      sendPush: jest.fn(),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    zonalPricing = {
      validateQuoteForBooking: jest.fn(),
      consumeQuote: jest.fn().mockResolvedValue(undefined),
      quoteView: jest.fn((snap: any, viewer: string) =>
        viewer === 'ADMIN' ? { quoteId: snap.id, internal: { driverEarning: snap.driverFarePaise / 100 } } : { quoteId: snap.id },
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        { provide: DatabaseService, useValue: db },
        { provide: DispatchService, useValue: dispatchService },
        { provide: ZonalPricingService, useValue: zonalPricing },
        { provide: PricingService, useValue: pricingService },
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
      bids: [],
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
    db.requirement.findUnique.mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000001',
      vendorId: 'vnd-1',
      status: RequirementStatus.POSTED,
      offers: [{ id: 'off-1', driverId: 'drv-1', status: OfferStatus.SENT }],
      bids: [],
    });

    db.requirement.update.mockResolvedValue({
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
  });

  it('should reject cancellation if requirement is already COMPLETED', async () => {
    db.vendor.findUnique.mockResolvedValue({ id: 'vnd-1', userId: 'usr-vnd-1' });
    db.requirement.findUnique.mockResolvedValue({
      id: 'a0000000-0000-0000-0000-000000000001',
      vendorId: 'vnd-1',
      status: RequirementStatus.COMPLETED,
      offers: [],
      bids: [],
    });

    await expect(
      service.cancelRequirement('a0000000-0000-0000-0000-000000000001', 'usr-vnd-1', { reason: 'Late cancel' }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  describe('corporate zonal bookings', () => {
    const now = new Date();
    const snapshot = {
      id: '11111111-1111-4111-8111-111111111111',
      requirementId: null,
      totalFarePaise: 80000,
      driverFarePaise: 68000,
      platformFeePaise: 12000,
    };
    const zonalDto: any = {
      vehicleType: VehicleType.SEDAN,
      quantity: 1,
      pickupLocation: { latitude: 17.3753, longitude: 78.4983, address: 'Malakpet' },
      dropLocation: { latitude: 17.4435, longitude: 78.3772, address: 'HITEC City' },
      reportingTime: now.toISOString(),
      zonalQuoteId: snapshot.id,
    };

    beforeEach(() => {
      db.vendor.findUnique.mockResolvedValue({
        id: 'vnd-1',
        userId: 'usr-vnd-1',
        verificationStatus: VerificationStatus.VERIFIED,
        escrowBalance: 10000,
      });
      db.requirement.create.mockImplementation(async ({ data }: any) => ({ id: 'req-z1', ...data, createdAt: now, updatedAt: now }));
    });

    it('prices the trip from the stored quote and consumes it inside the booking transaction', async () => {
      zonalPricing.validateQuoteForBooking.mockResolvedValue({ snapshot });

      const result = await service.createRequirement('usr-vnd-1', zonalDto);

      expect(db.requirement.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ ratePerVehicle: 800, totalAmount: 800 }) }),
      );
      expect(zonalPricing.consumeQuote).toHaveBeenCalledWith(db, snapshot.id, 'req-z1');
      expect(db.vendor.update).toHaveBeenCalledWith(expect.objectContaining({ data: { escrowBalance: { decrement: 800 } } }));
      expect(pricingService.calculateDriverRate).not.toHaveBeenCalled();
      // Vendor response never carries driver payout or margin (V AT10).
      expect(JSON.stringify(result.zonalQuote)).not.toMatch(/driver|platform|internal/i);
    });

    it('V AT06: rejects a client amount that differs from the quote (e.g. +20 platform fee) and logs it', async () => {
      zonalPricing.validateQuoteForBooking.mockResolvedValue({ snapshot });

      await expect(service.createRequirement('usr-vnd-1', { ...zonalDto, ratePerVehicle: 820 })).rejects.toThrow(
        /does not match the quoted corporate rate/,
      );
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'ZONAL_QUOTE_AMOUNT_MISMATCH' }));
      expect(db.requirement.create).not.toHaveBeenCalled();
      expect(db.vendor.update).not.toHaveBeenCalled();
    });

    it('V AT08: resubmitting an already-booked quote returns the original trip without a second debit', async () => {
      zonalPricing.validateQuoteForBooking.mockResolvedValue({ snapshot, alreadyBookedRequirementId: 'req-z1' });
      db.requirement.findUnique.mockResolvedValue({
        id: 'req-z1',
        vendorId: 'vnd-1',
        vehicleType: VehicleType.SEDAN,
        quantity: 1,
        assignedQuantity: 0,
        pickupLat: 17.3753,
        pickupLng: 78.4983,
        pickupAddress: 'Malakpet',
        dropLat: 17.4435,
        dropLng: 78.3772,
        dropAddress: 'HITEC City',
        reportingTime: now,
        ratePerVehicle: 800,
        totalAmount: 800,
        status: RequirementStatus.POSTED,
        createdAt: now,
        updatedAt: now,
        zonalQuote: { ...snapshot, requirementId: 'req-z1' },
      });

      const result = await service.createRequirement('usr-vnd-1', zonalDto);

      expect(result.id).toBe('req-z1');
      expect(db.requirement.create).not.toHaveBeenCalled();
      expect(db.vendor.update).not.toHaveBeenCalled();
      expect(dispatchService.dispatchRequirement).not.toHaveBeenCalled();
    });

    it('rejects zonal quotes on bidding requirements', async () => {
      await expect(
        service.createRequirement('usr-vnd-1', { ...zonalDto, fulfillmentMode: 'BIDDING' }),
      ).rejects.toThrow(/direct dispatch/);
    });

    it('non-zonal direct dispatch trips keep standard pricing (no implicit zonal quote)', async () => {
      await service.createRequirement('usr-vnd-1', { ...zonalDto, zonalQuoteId: undefined });
      expect(zonalPricing.validateQuoteForBooking).not.toHaveBeenCalled();
      expect(pricingService.calculateDriverRate).toHaveBeenCalled();
      expect(zonalPricing.consumeQuote).not.toHaveBeenCalled();
    });

    it('vendor-role accounts without a vendor profile cannot read other requirements', async () => {
      db.vendor.findUnique.mockResolvedValue(null);
      db.requirement.findUnique.mockResolvedValue({ id: '99999999-9999-9999-9999-999999999999', vendorId: 'vnd-other', offers: [], bids: [], assignments: [] });
      await expect(service.getRequirementDetails('99999999-9999-9999-9999-999999999999', 'usr-new', 'VENDOR')).rejects.toThrow(/Not authorized/);
    });
  });
});
