import { Test, TestingModule } from '@nestjs/testing';
import { RequirementsService } from '../src/modules/requirements/requirements.service';
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { DispatchSchedulerService } from '../src/modules/dispatch/dispatch-scheduler.service';
import { DatabaseService } from '../src/database/database.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PricingService } from '../src/modules/pricing/pricing.service';
import { ZonalPricingService } from '../src/modules/pricing/zonal-pricing.service';
import { RedisService } from '../src/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import {
  RequirementStatus,
  VerificationStatus,
  VehicleType,
} from '@adhocx/contracts';

describe('Scheduled Trips & Automated 30s Pre-Dispatch Simulation Suite', () => {
  let requirementsService: RequirementsService;
  let dispatchService: DispatchService;
  let scheduler: DispatchSchedulerService;
  let db: any;
  let notifications: any;
  let audit: any;
  let pricingService: any;
  let zonalPricing: any;

  beforeEach(async () => {
    // In-memory fallback Redis
    const redis = new RedisService({ get: () => undefined } as unknown as ConfigService);
    scheduler = new DispatchSchedulerService(redis);

    db = {
      vendor: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'vnd-1',
          userId: 'usr-vnd-1',
          verificationStatus: VerificationStatus.VERIFIED,
          escrowBalance: 50000,
        }),
        update: jest.fn().mockResolvedValue({
          id: 'vnd-1',
          userId: 'usr-vnd-1',
          verificationStatus: VerificationStatus.VERIFIED,
          escrowBalance: 49200,
        }),
      },
      requirement: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      offer: {
        updateMany: jest.fn(),
      },
      bid: {
        updateMany: jest.fn(),
      },
      trip: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
      ledgerEntry: {
        create: jest.fn().mockResolvedValue({ id: 'led-1' }),
      },
      payment: {
        create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(db)),
    };

    notifications = {
      emitEvent: jest.fn(),
      sendPush: jest.fn().mockResolvedValue(undefined),
      sendPushToUser: jest.fn().mockResolvedValue({ success: true }),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    pricingService = {
      calculateDistanceKm: jest.fn().mockReturnValue(15),
      calculateRoadDistanceAndEta: jest.fn().mockResolvedValue({
        distanceKm: 15,
        durationMinutes: 30,
        durationSeconds: 1800,
        isRealRoad: true,
      }),
      calculateDriverRate: jest.fn().mockReturnValue(800),
      calculateMinimumFare: jest.fn().mockReturnValue(800),
      calculateSurgeMultiplier: jest.fn().mockReturnValue(1.0),
    };

    zonalPricing = {
      validateQuoteForBooking: jest.fn(),
      consumeQuote: jest.fn().mockResolvedValue(undefined),
      quoteView: jest.fn((snap: any) => ({ quoteId: snap.id })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequirementsService,
        {
          provide: DispatchService,
          useValue: {
            dispatchRequirement: jest.fn().mockResolvedValue({ offersCreated: 3 }),
            handleScheduledJob: null,
            handleScheduledPreDispatchAlert: null,
            handleScheduledTriggerDispatch: null,
          },
        },
        { provide: DatabaseService, useValue: db },
        { provide: NotificationsService, useValue: notifications },
        { provide: AuditService, useValue: audit },
        { provide: PricingService, useValue: pricingService },
        { provide: ZonalPricingService, useValue: zonalPricing },
        { provide: DispatchSchedulerService, useValue: scheduler },
      ],
    }).compile();

    requirementsService = module.get<RequirementsService>(RequirementsService);
    dispatchService = module.get<DispatchService>(DispatchService);
  });

  describe('Simulation 1: Direct Dispatch ("Ride Now" flow)', () => {
    it('triggers immediate dispatch waves and does NOT schedule delayed jobs when reportingTime is now', async () => {
      const now = new Date();
      const mockCreatedReq = {
        id: '11111111-1111-4111-8111-111111111111',
        vendorId: 'vnd-1',
        vehicleType: VehicleType.SEDAN,
        quantity: 1,
        assignedQuantity: 0,
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        pickupAddress: 'Connaught Place, New Delhi',
        dropAddress: 'Sector 62, Noida',
        reportingTime: now,
        ratePerVehicle: 800,
        totalAmount: 800,
        status: RequirementStatus.POSTED,
        createdAt: now,
        updatedAt: now,
        vendor: { id: 'vnd-1', userId: 'usr-vnd-1' },
      };

      db.requirement.create.mockResolvedValue(mockCreatedReq);

      const scheduleSpy = jest.spyOn(scheduler, 'schedule');

      const result = await requirementsService.createRequirement(
        'usr-vnd-1',
        {
          vehicleType: VehicleType.SEDAN,
          quantity: 1,
          pickupLocation: { latitude: 28.6139, longitude: 77.2090, address: 'Connaught Place, New Delhi' },
          dropLocation: { latitude: 28.6289, longitude: 77.3649, address: 'Sector 62, Noida' },
          reportingTime: now.toISOString(),
          isScheduled: false,
        },
      );

      // 1. Dispatch was immediately called
      expect(dispatchService.dispatchRequirement).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');

      // 2. Scheduler was NOT called
      expect(scheduleSpy).not.toHaveBeenCalled();

      // 3. Response DTO reflects immediate ride
      expect(result.isScheduled).toBe(false);
      expect(result.id).toBe('11111111-1111-4111-8111-111111111111');
    });

    it('forces immediate dispatch when isScheduled is false even if reportingTime has clock skew or timezone difference', async () => {
      const now = new Date();
      db.requirement.create.mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        vendorId: 'vnd-1',
        vehicleType: VehicleType.SEDAN,
        quantity: 1,
        assignedQuantity: 0,
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        pickupAddress: 'HITEC City, Hyderabad',
        dropAddress: 'Gachibowli, Hyderabad',
        reportingTime: now,
        ratePerVehicle: 800,
        totalAmount: 800,
        status: RequirementStatus.POSTED,
        createdAt: now,
        updatedAt: now,
        vendor: { id: 'vnd-1', userId: 'usr-vnd-1' },
      });
      const scheduleSpy = jest.spyOn(scheduler, 'schedule');
      (dispatchService.dispatchRequirement as jest.Mock).mockClear();
      scheduleSpy.mockClear();

      const result = await requirementsService.createRequirement(
        'usr-vnd-1',
        {
          vehicleType: VehicleType.SEDAN,
          quantity: 1,
          pickupLocation: { latitude: 28.6139, longitude: 77.2090, address: 'HITEC City, Hyderabad' },
          dropLocation: { latitude: 28.6289, longitude: 77.3649, address: 'Gachibowli, Hyderabad' },
          reportingTime: '2026-10-30T17:00:00.000',
          isScheduled: false,
        },
      );

      expect(dispatchService.dispatchRequirement).toHaveBeenCalled();
      expect(scheduleSpy).not.toHaveBeenCalled();
      expect(result.isScheduled).toBe(false);
    });
  });

  describe('Simulation 2: Scheduled Ride Creation & Deferred Timers', () => {
    it('defers dispatch and schedules 30s pre-alert and dispatch timers at correct timestamps', async () => {
      const nowMs = Date.now();
      const departureTime = new Date(nowMs + 2 * 60 * 60 * 1000); // 2 hours in future

      const mockCreatedReq = {
        id: '22222222-2222-4222-8222-222222222222',
        vendorId: 'vnd-1',
        vehicleType: VehicleType.SUV,
        quantity: 1,
        assignedQuantity: 0,
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        pickupAddress: 'Cyber City, Gurugram',
        dropAddress: 'IGI Airport T3, New Delhi',
        reportingTime: departureTime,
        ratePerVehicle: 1200,
        totalAmount: 1200,
        status: RequirementStatus.POSTED,
        createdAt: new Date(nowMs),
        updatedAt: new Date(nowMs),
        vendor: { id: 'vnd-1', userId: 'usr-vnd-1' },
      };

      db.requirement.create.mockResolvedValue(mockCreatedReq);

      const scheduleSpy = jest.spyOn(scheduler, 'schedule');

      const result = await requirementsService.createRequirement(
        'usr-vnd-1',
        {
          vehicleType: VehicleType.SUV,
          quantity: 1,
          pickupLocation: { latitude: 28.6139, longitude: 77.2090, address: 'Cyber City, Gurugram' },
          dropLocation: { latitude: 28.5562, longitude: 77.1000, address: 'IGI Airport T3, New Delhi' },
          reportingTime: departureTime.toISOString(),
          isScheduled: true,
        },
      );

      // 1. Immediate dispatch was NOT called
      expect(dispatchService.dispatchRequirement).not.toHaveBeenCalled();

      // 2. Both notify and dispatch timers were scheduled in Redis/Scheduler
      expect(scheduleSpy).toHaveBeenCalledTimes(2);

      const notifyCall = scheduleSpy.mock.calls.find((c) => c[0] === 'schedule-notify:22222222-2222-4222-8222-222222222222');
      const dispatchCall = scheduleSpy.mock.calls.find((c) => c[0] === 'schedule-dispatch:22222222-2222-4222-8222-222222222222');

      expect(notifyCall).toBeDefined();
      expect(dispatchCall).toBeDefined();

      const notifyAtMs = notifyCall![1];
      const dispatchAtMs = dispatchCall![1];

      // 3. Exactly 30 seconds difference between pre-dispatch alert and driver search trigger
      expect(dispatchAtMs - notifyAtMs).toBe(30 * 1000);

      // 4. Vendor received REQUIREMENT_SCHEDULED event
      expect(notifications.emitEvent).toHaveBeenCalledWith(
        'vendor:vnd-1',
        'REQUIREMENT_SCHEDULED',
        expect.objectContaining({
          requirementId: '22222222-2222-4222-8222-222222222222',
          reportingTime: departureTime.toISOString(),
        }),
      );

      // 5. Response DTO marks ride as scheduled
      expect(result.isScheduled).toBe(true);
    });

    it('respects explicit scheduledTriggerTime if provided', async () => {
      const nowMs = Date.now();
      const departureTime = new Date(nowMs + 3 * 60 * 60 * 1000);
      const explicitTriggerTime = new Date(nowMs + 45 * 60 * 1000); // trigger search 45 mins from now

      const mockCreatedReq = {
        id: '33333333-3333-4333-8333-333333333333',
        vendorId: 'vnd-1',
        vehicleType: VehicleType.SEDAN,
        quantity: 1,
        assignedQuantity: 0,
        pickupLat: 28.6139,
        pickupLng: 77.2090,
        pickupAddress: 'Noida Sec 18',
        dropAddress: 'Connaught Place',
        reportingTime: departureTime,
        ratePerVehicle: 650,
        totalAmount: 650,
        status: RequirementStatus.POSTED,
        createdAt: new Date(nowMs),
        updatedAt: new Date(nowMs),
        vendor: { id: 'vnd-1', userId: 'usr-vnd-1' },
      };

      db.requirement.create.mockResolvedValue(mockCreatedReq);
      const scheduleSpy = jest.spyOn(scheduler, 'schedule');

      await requirementsService.createRequirement(
        'usr-vnd-1',
        {
          vehicleType: VehicleType.SEDAN,
          quantity: 1,
          pickupLocation: { latitude: 28.6139, longitude: 77.2090, address: 'Noida Sec 18' },
          dropLocation: { latitude: 28.6289, longitude: 77.3649, address: 'Connaught Place' },
          reportingTime: departureTime.toISOString(),
          isScheduled: true,
          scheduledTriggerTime: explicitTriggerTime.toISOString(),
        },
      );

      const dispatchCall = scheduleSpy.mock.calls.find((c) => c[0] === 'schedule-dispatch:33333333-3333-4333-8333-333333333333');
      const notifyCall = scheduleSpy.mock.calls.find((c) => c[0] === 'schedule-notify:33333333-3333-4333-8333-333333333333');

      expect(dispatchCall![1]).toBe(explicitTriggerTime.getTime());
      expect(notifyCall![1]).toBe(explicitTriggerTime.getTime() - 30 * 1000);
    });
  });

  describe('Simulation 3: Pre-Dispatch 30s Alert Notification Execution', () => {
    it('notifies vendor and user with exact 30s alert via SSE and in-app feed notification', async () => {
      const realDispatchService = new (DispatchService as any)(
        db,
        { findNearbyDrivers: jest.fn() },
        notifications,
        audit,
        scheduler,
      );

      const reportingDate = new Date(Date.now() + 60 * 60 * 1000);
      db.requirement.findUnique.mockResolvedValue({
        id: '44444444-4444-4444-8444-444444444444',
        vendorId: 'vnd-1',
        vehicleType: 'SEDAN',
        pickupAddress: 'Aerocity, Delhi',
        dropAddress: 'Cyber Hub, Gurugram',
        reportingTime: reportingDate,
        status: RequirementStatus.POSTED,
        vendor: { id: 'vnd-1', userId: 'usr-vnd-1' },
      });

      await realDispatchService.handleScheduledJob('schedule-notify:44444444-4444-4444-8444-444444444444');

      // 1. Emitted real-time alert to vendor channel
      expect(notifications.emitEvent).toHaveBeenCalledWith(
        'vendor:vnd-1',
        'SCHEDULED_RIDE_DISPATCH_ALERT',
        expect.objectContaining({
          requirementId: '44444444-4444-4444-8444-444444444444',
          secondsRemaining: 30,
          message: expect.stringContaining('finding drivers in 30 seconds'),
        }),
      );

      // 2. Emitted real-time alert to user channel
      expect(notifications.emitEvent).toHaveBeenCalledWith(
        'user:usr-vnd-1',
        'SCHEDULED_RIDE_DISPATCH_ALERT',
        expect.objectContaining({
          requirementId: '44444444-4444-4444-8444-444444444444',
          secondsRemaining: 30,
        }),
      );

      // 3. Sent in-app feed notification and push
      expect(notifications.sendPushToUser).toHaveBeenCalledWith(
        'usr-vnd-1',
        expect.objectContaining({
          title: 'Trip Dispatch Alert: 30 Seconds',
          body: expect.stringContaining('finding drivers in 30 seconds'),
          saveInApp: true,
        }),
      );
    });
  });

  describe('Simulation 4: Automated Driver Search Trigger at Dispatch Time', () => {
    it('triggers dispatchRequirement and emits SCHEDULED_RIDE_DISPATCHING event when dispatch job fires', async () => {
      const realDispatchService = new (DispatchService as any)(
        db,
        { findNearbyDrivers: jest.fn() },
        notifications,
        audit,
        scheduler,
      );

      realDispatchService.dispatchRequirement = jest.fn().mockResolvedValue({ offersCreated: 2 });

      db.requirement.findUnique.mockResolvedValue({
        id: '55555555-5555-4555-8555-555555555555',
        vendorId: 'vnd-1',
        vehicleType: 'SEDAN',
        reportingTime: new Date(Date.now() + 15 * 60 * 1000),
        status: RequirementStatus.POSTED,
        vendor: { id: 'vnd-1', userId: 'usr-vnd-1' },
      });

      await realDispatchService.handleScheduledJob('schedule-dispatch:55555555-5555-4555-8555-555555555555');

      // 1. Automated driver matching waves triggered
      expect(realDispatchService.dispatchRequirement).toHaveBeenCalledWith('55555555-5555-4555-8555-555555555555');

      // 2. Real-time active matching event emitted
      expect(notifications.emitEvent).toHaveBeenCalledWith(
        'vendor:vnd-1',
        'SCHEDULED_RIDE_DISPATCHING',
        expect.objectContaining({
          requirementId: '55555555-5555-4555-8555-555555555555',
          status: RequirementStatus.DISPATCHING,
        }),
      );
    });
  });

  describe('Simulation 5: User Cancellation of Scheduled Trip', () => {
    it('cancels both delayed timers from the scheduler and transitions status to CANCELLED', async () => {
      const cancelSpy = jest.spyOn(scheduler, 'cancel');

      const mockCancelledReq = {
        id: '66666666-6666-4666-8666-666666666666',
        vendorId: 'vnd-1',
        status: RequirementStatus.CANCELLED,
        reportingTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        ratePerVehicle: 800,
        totalAmount: 800,
        createdAt: new Date(),
        updatedAt: new Date(),
        vendor: { id: 'vnd-1', userId: 'usr-vnd-1' },
      };

      db.requirement.findUnique
        .mockResolvedValueOnce({
          id: '66666666-6666-4666-8666-666666666666',
          vendorId: 'vnd-1',
          status: RequirementStatus.POSTED,
          assignedQuantity: 0,
          quantity: 1,
          reportingTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          offers: [],
          bids: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce(mockCancelledReq);

      db.requirement.update.mockResolvedValue(mockCancelledReq);

      const result = await requirementsService.cancelRequirement(
        '66666666-6666-4666-8666-666666666666',
        'usr-vnd-1',
        { reason: 'Client rescheduled trip' },
      );

      // 1. Both jobs cancelled from scheduler
      expect(cancelSpy).toHaveBeenCalledWith('schedule-notify:66666666-6666-4666-8666-666666666666');
      expect(cancelSpy).toHaveBeenCalledWith('schedule-dispatch:66666666-6666-4666-8666-666666666666');

      // 2. Requirement status is CANCELLED
      expect(result.status).toBe(RequirementStatus.CANCELLED);
    });

    it('safely skips alerts and dispatching if requirement was cancelled prior to execution', async () => {
      const realDispatchService = new (DispatchService as any)(
        db,
        { findNearbyDrivers: jest.fn() },
        notifications,
        audit,
        scheduler,
      );
      realDispatchService.dispatchRequirement = jest.fn();

      db.requirement.findUnique.mockResolvedValue({
        id: '77777777-7777-4777-8777-777777777777',
        vendorId: 'vnd-1',
        status: RequirementStatus.CANCELLED,
        vendor: { id: 'vnd-1', userId: 'usr-vnd-1' },
      });

      // Notify job should do nothing
      await realDispatchService.handleScheduledJob('schedule-notify:77777777-7777-4777-8777-777777777777');
      expect(notifications.emitEvent).not.toHaveBeenCalled();
      expect(notifications.sendPushToUser).not.toHaveBeenCalled();

      // Dispatch job should do nothing
      await realDispatchService.handleScheduledJob('schedule-dispatch:77777777-7777-4777-8777-777777777777');
      expect(realDispatchService.dispatchRequirement).not.toHaveBeenCalled();
    });
  });

  describe('Simulation 6: Full Timeline Clock Simulation (Tick from T-35s to T+1s)', () => {
    it('fires notify at T-30s and dispatch at T in chronological order', async () => {
      const realDispatchService = new (DispatchService as any)(
        db,
        { findNearbyDrivers: jest.fn() },
        notifications,
        audit,
        scheduler,
      );
      realDispatchService.dispatchRequirement = jest.fn().mockResolvedValue({ offersCreated: 1 });

      scheduler.registerHandler(async (member) => {
        await realDispatchService.handleScheduledJob(member);
      });

      const baseTime = 100_000;
      const notifyTime = baseTime + 10_000;      // 110,000 (30s before dispatch)
      const dispatchTime = notifyTime + 30_000;  // 140,000 (dispatch time)

      db.requirement.findUnique.mockResolvedValue({
        id: '88888888-8888-4888-8888-888888888888',
        vendorId: 'vnd-1',
        vehicleType: 'SEDAN',
        pickupAddress: 'Pickup Point',
        dropAddress: 'Drop Point',
        reportingTime: new Date(dispatchTime + 15 * 60 * 1000),
        status: RequirementStatus.POSTED,
        vendor: { id: 'vnd-1', userId: 'usr-vnd-1' },
      });

      // Schedule both jobs
      await scheduler.schedule('schedule-notify:88888888-8888-4888-8888-888888888888', notifyTime);
      await scheduler.schedule('schedule-dispatch:88888888-8888-4888-8888-888888888888', dispatchTime);

      // Tick before notify time (e.g. 105,000): nothing should fire
      const tick1 = await scheduler.tick(105_000);
      expect(tick1).toEqual([]);
      expect(notifications.emitEvent).not.toHaveBeenCalled();
      expect(realDispatchService.dispatchRequirement).not.toHaveBeenCalled();

      // Tick at notify time (110,000): pre-dispatch alert fires
      const tick2 = await scheduler.tick(110_000);
      expect(tick2).toEqual(['schedule-notify:88888888-8888-4888-8888-888888888888']);
      expect(notifications.emitEvent).toHaveBeenCalledWith(
        'vendor:vnd-1',
        'SCHEDULED_RIDE_DISPATCH_ALERT',
        expect.anything(),
      );
      expect(realDispatchService.dispatchRequirement).not.toHaveBeenCalled();

      // Tick at dispatch time (140,000): driver dispatch fires
      const tick3 = await scheduler.tick(140_000);
      expect(tick3).toEqual(['schedule-dispatch:88888888-8888-4888-8888-888888888888']);
      expect(realDispatchService.dispatchRequirement).toHaveBeenCalledWith('88888888-8888-4888-8888-888888888888');
    });
  });
});
