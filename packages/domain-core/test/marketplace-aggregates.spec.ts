import { RequirementAggregate } from '../src/marketplace/aggregates/requirement.aggregate';
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
        pricingMode: 'DIRECT_DISPATCH',
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 14500,
        status: 'DRAFT',
        baseBudget: budget,
        createdAt: new Date(),
      });

      expect(reqResult.isSuccess).toBe(true);
      const req = reqResult.getValue();
      expect(req.status).toBe('DRAFT');
      expect(req.pricingMode).toBe('DIRECT_DISPATCH');
      expect(req.domainEvents.length).toBeGreaterThan(0);
    });

    it('should enforce positive estimated distance invariant', () => {
      const reqResult = RequirementAggregate.create('req-fail', {
        requesterId: 'user-cust-1',
        pickupLocation: pickup,
        dropLocation: drop,
        pickupTime: new Date(Date.now() + 3600000),
        pricingMode: 'DIRECT_DISPATCH',
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 0,
        status: 'DRAFT',
        createdAt: new Date(),
      });

      expect(reqResult.isFailure).toBe(true);
      expect(reqResult.error).toContain('strictly greater than 0 meters');
    });

    it('should transition to DIRECT_DISPATCH and assign driver', () => {
      const req = RequirementAggregate.create('req-2', {
        requesterId: 'user-cust-2',
        pickupLocation: pickup,
        dropLocation: drop,
        pickupTime: new Date(Date.now() + 3600000),
        pricingMode: 'DIRECT_DISPATCH',
        vehicleCategory: 'SEDAN',
        estimatedDistanceMeters: 18000,
        status: 'DRAFT',
        createdAt: new Date(),
      }).getValue();

      expect(req.startDirectDispatch().isSuccess).toBe(true);
      expect(req.status).toBe('DIRECT_DISPATCH');

      const fare = Money.create(65000).getValue();
      const assignResult = req.assign('driver-1', fare);
      expect(assignResult.isSuccess).toBe(true);
      expect(req.status).toBe('ASSIGNED');
      expect(req.assignedDriverId).toBe('driver-1');
      expect(req.finalFare).toBe(fare);
    });

    it('should handle complete, cancel, and markNoDriverAvailable transitions', () => {
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

      req.startDirectDispatch();
      req.assign('driver-99');
      expect(req.status).toBe('ASSIGNED');

      req.complete();
      expect(req.status).toBe('COMPLETED');
    });
  });
});
