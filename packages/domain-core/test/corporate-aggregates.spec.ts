import {
  CorporateRouteAggregate,
  CorporateInvoiceAggregate,
  Money,
} from '../src';

describe('Corporate Domain Aggregates (Clean Architecture & Invariants)', () => {
  describe('CorporateRouteAggregate', () => {
    it('should strictly enforce Sedan capacity limit (max 4 passengers)', () => {
      const stops = [
        {
          id: 's-1',
          stopSequence: 1,
          stopType: 'PICKUP' as const,
          latitude: 17.45,
          longitude: 78.38,
          plannedEta: new Date(),
          status: 'PENDING' as const,
          boardingOtp: '1234',
        },
        {
          id: 's-2',
          stopSequence: 2,
          stopType: 'PICKUP' as const,
          latitude: 17.46,
          longitude: 78.39,
          plannedEta: new Date(),
          status: 'PENDING' as const,
          boardingOtp: '1235',
        },
        {
          id: 's-3',
          stopSequence: 3,
          stopType: 'PICKUP' as const,
          latitude: 17.47,
          longitude: 78.40,
          plannedEta: new Date(),
          status: 'PENDING' as const,
          boardingOtp: '1236',
        },
        {
          id: 's-4',
          stopSequence: 4,
          stopType: 'PICKUP' as const,
          latitude: 17.48,
          longitude: 78.41,
          plannedEta: new Date(),
          status: 'PENDING' as const,
          boardingOtp: '1237',
        },
        {
          id: 's-5',
          stopSequence: 5,
          stopType: 'PICKUP' as const,
          latitude: 17.49,
          longitude: 78.42,
          plannedEta: new Date(),
          status: 'PENDING' as const,
          boardingOtp: '1238',
        },
      ];

      // 5 passengers in SEDAN -> Must fail!
      const failResult = CorporateRouteAggregate.create('route-fail', {
        tenantId: 'tenant-1',
        officeId: 'off-1',
        shiftDate: new Date(),
        shiftTime: '08:00',
        direction: 'LOGIN',
        vehicleCategory: 'SEDAN',
        stops,
        estDistanceMeters: 25000,
        targetPickup1Time: new Date(),
      });

      expect(failResult.isFailure).toBe(true);
      expect(failResult.error).toContain('Capacity violation: SEDAN cannot seat more than 4 passengers');

      // 4 passengers in SEDAN -> Must succeed!
      const successResult = CorporateRouteAggregate.create('route-ok', {
        tenantId: 'tenant-1',
        officeId: 'off-1',
        shiftDate: new Date(),
        shiftTime: '08:00',
        direction: 'LOGIN',
        vehicleCategory: 'SEDAN',
        stops: stops.slice(0, 4),
        estDistanceMeters: 20000,
        targetPickup1Time: new Date(),
      });

      expect(successResult.isSuccess).toBe(true);
      const route = successResult.getValue();
      expect(route.capacityLimit).toBe(4);
      expect(route.status).toBe('PLANNED');
    });

    it('should transition through lifecycle: PLANNED -> DISPATCHING -> ASSIGNED -> IN_TRANSIT -> COMPLETED', () => {
      const stops = [
        {
          id: 's-1',
          stopSequence: 1,
          stopType: 'PICKUP' as const,
          latitude: 17.45,
          longitude: 78.38,
          plannedEta: new Date(),
          status: 'BOARDED' as const,
          boardingOtp: '1234',
        },
      ];

      const routeResult = CorporateRouteAggregate.create('route-flow', {
        tenantId: 'tenant-1',
        officeId: 'off-1',
        shiftDate: new Date(),
        shiftTime: '08:00',
        direction: 'LOGIN',
        vehicleCategory: 'SEDAN',
        stops,
        estDistanceMeters: 15000,
        targetPickup1Time: new Date(),
      });

      const route = routeResult.getValue();
      expect(route.status).toBe('PLANNED');

      expect(route.dispatch().isSuccess).toBe(true);
      expect(route.status).toBe('DISPATCHING');

      expect(route.assignDriver('drv-1', 'veh-1').isSuccess).toBe(true);
      expect(route.status).toBe('ASSIGNED');
      expect(route.driverId).toBe('drv-1');

      expect(route.startTransit().isSuccess).toBe(true);
      expect(route.status).toBe('IN_TRANSIT');

      expect(route.complete().isSuccess).toBe(true);
      expect(route.status).toBe('COMPLETED');
    });
  });

  describe('CorporateInvoiceAggregate (Zero Float Math)', () => {
    it('should calculate subtotal, exact 5% GST, and total amount in integer paise using Money VO', () => {
      // 2 lines: ₹1,000 (100000 paise) and ₹2,000 (200000 paise)
      // Subtotal: 300000 paise (₹3,000)
      // 5% GST: (300000 * 5) / 100 = 15000 paise (₹150)
      // Total: 315000 paise (₹3,150)
      const lines = [
        {
          routeId: 'r-1',
          billableDistanceMeters: 20000,
          amount: Money.create(100000).getValue(),
        },
        {
          routeId: 'r-2',
          billableDistanceMeters: 35000,
          amount: Money.create(200000).getValue(),
        },
      ];

      const invoiceResult = CorporateInvoiceAggregate.create('inv-1', {
        tenantId: 'tenant-101',
        invoiceNumber: 'INV-202611-001',
        billingPeriodStart: new Date('2026-11-01'),
        billingPeriodEnd: new Date('2026-11-15'),
        lines,
        gstRatePct: 5,
      });

      expect(invoiceResult.isSuccess).toBe(true);
      const invoice = invoiceResult.getValue();

      expect(invoice.subtotal.amountInPaise).toBe(300000);
      expect(invoice.subtotal.formatINR()).toBe('₹3000.00');

      expect(invoice.gstAmount.amountInPaise).toBe(15000);
      expect(invoice.gstAmount.formatINR()).toBe('₹150.00');

      expect(invoice.totalAmount.amountInPaise).toBe(315000);
      expect(invoice.totalAmount.formatINR()).toBe('₹3150.00');

      // Test status transitions
      expect(invoice.status).toBe('DRAFT');
      expect(invoice.issue().isSuccess).toBe(true);
      expect(invoice.status).toBe('ISSUED');

      expect(invoice.markPaid().isSuccess).toBe(true);
      expect(invoice.status).toBe('PAID');

      // Cannot void paid invoice
      expect(invoice.void('Mistake').isFailure).toBe(true);
    });

    it('should reject invoice if billing period start is after end date', () => {
      const result = CorporateInvoiceAggregate.create('inv-bad', {
        tenantId: 'tenant-101',
        invoiceNumber: 'INV-BAD',
        billingPeriodStart: new Date('2026-11-20'),
        billingPeriodEnd: new Date('2026-11-10'),
        lines: [
          {
            routeId: 'r-1',
            billableDistanceMeters: 10000,
            amount: Money.create(50000).getValue(),
          },
        ],
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('billingPeriodStart cannot be after billingPeriodEnd');
    });
  });
});
