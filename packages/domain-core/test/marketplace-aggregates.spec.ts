import { RequirementAggregate } from '../src/marketplace/aggregates/requirement.aggregate';
import { BidAggregate } from '../src/marketplace/aggregates/bid.aggregate';
import { Money } from '../src/value-objects/money.vo';
import { GeoPoint } from '../src/value-objects/geo-point.vo';

describe('Marketplace Demand Context - Aggregates & Invariants', () => {
  const pickup = GeoPoint.create(17.4474, 78.3762).getValue();
  const drop = GeoPoint.create(17.4123, 78.4089).getValue();

  describe('RequirementAggregate', () => {
    it('should create a valid requirement with DRAFT status', () => {
      const budget = Money.create(50000).getValue(); // ₹500
      const reqResult = RequirementAggregate.create('req-1', {
        requesterId: 'user-cust-1',
        pickupLocation: pickup,
        dropLocation: drop,
        pickupTime: new Date(Date.now() + 3600000),
        pricingMode: 'BIDDING',
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 14500,
        status: 'DRAFT',
        baseBudget: budget,
        createdAt: new Date(),
      });

      expect(reqResult.isSuccess).toBe(true);
      const req = reqResult.getValue();
      expect(req.status).toBe('DRAFT');
      expect(req.pricingMode).toBe('BIDDING');
      expect(req.domainEvents.length).toBeGreaterThan(0);
    });

    it('should enforce positive estimated distance invariant', () => {
      const reqResult = RequirementAggregate.create('req-fail', {
        requesterId: 'user-cust-1',
        pickupLocation: pickup,
        dropLocation: drop,
        pickupTime: new Date(Date.now() + 3600000),
        pricingMode: 'BIDDING',
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 0,
        status: 'DRAFT',
        createdAt: new Date(),
      });

      expect(reqResult.isFailure).toBe(true);
      expect(reqResult.error).toContain('strictly greater than 0 meters');
    });

    it('should transition to OPEN_FOR_BIDDING and assign winning bid', () => {
      const req = RequirementAggregate.create('req-2', {
        requesterId: 'user-cust-2',
        pickupLocation: pickup,
        dropLocation: drop,
        pickupTime: new Date(Date.now() + 3600000),
        pricingMode: 'BIDDING',
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 18000,
        status: 'DRAFT',
        createdAt: new Date(),
      }).getValue();

      expect(req.openForBidding().isSuccess).toBe(true);
      expect(req.status).toBe('OPEN_FOR_BIDDING');

      const winningFare = Money.create(65000).getValue();
      const assignResult = req.assign('driver-1', 'bid-101', winningFare);
      expect(assignResult.isSuccess).toBe(true);
      expect(req.status).toBe('ASSIGNED');
      expect(req.assignedDriverId).toBe('driver-1');
      expect(req.winningBidId).toBe('bid-101');
    });

    it('should transition to DIRECT_DISPATCH for on-demand requirements', () => {
      const req = RequirementAggregate.create('req-direct', {
        requesterId: 'user-cust-3',
        pickupLocation: pickup,
        dropLocation: drop,
        pickupTime: new Date(Date.now() + 1800000),
        pricingMode: 'DIRECT_DISPATCH',
        vehicleCategory: 'HATCHBACK',
        estimatedDistanceMeters: 9000,
        status: 'DRAFT',
        createdAt: new Date(),
      }).getValue();

      expect(req.startDirectDispatch().isSuccess).toBe(true);
      expect(req.status).toBe('DIRECT_DISPATCH');

      req.markNoDriverAvailable();
      expect(req.status).toBe('NO_DRIVER_AVAILABLE');
    });
  });

  describe('BidAggregate', () => {
    it('should create a valid bid with positive amount', () => {
      const amount = Money.create(45000).getValue(); // ₹450
      const bidResult = BidAggregate.create('bid-1', {
        requirementId: 'req-2',
        driverId: 'drv-88',
        vehicleId: 'veh-99',
        amount,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(),
      });

      expect(bidResult.isSuccess).toBe(true);
      const bid = bidResult.getValue();
      expect(bid.amount.formatINR()).toBe('₹450.00');
      expect(bid.status).toBe('PENDING');
      expect(bid.isExpired()).toBe(false);
    });

    it('should reject non-positive quotation amounts', () => {
      const zeroAmount = Money.zero();
      const bidResult = BidAggregate.create('bid-bad', {
        requirementId: 'req-2',
        driverId: 'drv-88',
        vehicleId: 'veh-99',
        amount: zeroAmount,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(),
      });

      expect(bidResult.isFailure).toBe(true);
      expect(bidResult.error).toContain('strictly positive');
    });

    it('should accept a pending non-expired bid', () => {
      const amount = Money.create(52000).getValue();
      const bid = BidAggregate.create('bid-win', {
        requirementId: 'req-2',
        driverId: 'drv-99',
        vehicleId: 'veh-100',
        amount,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 600000),
        createdAt: new Date(),
      }).getValue();

      const acceptResult = bid.accept();
      expect(acceptResult.isSuccess).toBe(true);
      expect(bid.status).toBe('ACCEPTED');

      // Subsequent reject should fail
      expect(bid.reject().isFailure).toBe(true);
    });

    it('should fail to accept an expired bid', () => {
      const amount = Money.create(52000).getValue();
      const bid = BidAggregate.create('bid-exp', {
        requirementId: 'req-2',
        driverId: 'drv-99',
        vehicleId: 'veh-100',
        amount,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 1000),
        createdAt: new Date(),
      }).getValue();

      const futureTime = new Date(Date.now() + 5000);
      const acceptResult = bid.accept(futureTime);
      expect(acceptResult.isFailure).toBe(true);
      expect(bid.status).toBe('EXPIRED');
    });
  });
});

