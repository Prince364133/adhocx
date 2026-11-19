import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ReferralsService } from '../src/modules/drivers/referrals/referrals.service';
import { DatabaseService } from '../src/database/database.service';
import { ReferralStatus } from '@adhocx/contracts';

describe('Driver Referral Flow & 100-Ride Milestone Guard', () => {
  let service: ReferralsService;
  let db: any;

  const mockReferrerDriver = {
    id: 'referrer-driver-uuid-1111',
    userId: 'referrer-user-uuid-1111',
    fullName: 'Rajesh Kumar',
    phone: '+919876543210',
    referralCode: 'ADH9K28M',
    totalTrips: 45,
    walletBalance: 1200.0,
    vehicleType: 'SEDAN',
    verificationStatus: 'VERIFIED',
  };

  const mockRefereeDriver = {
    id: 'referee-driver-uuid-2222',
    userId: 'referee-user-uuid-2222',
    fullName: 'Suresh Patel',
    phone: '+919812345678',
    referralCode: 'ADH3M87L',
    totalTrips: 0,
    walletBalance: 0.0,
    vehicleType: 'SEDAN',
    verificationStatus: 'PENDING',
  };

  beforeEach(async () => {
    db = {
      driver: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      driverReferral: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      trip: {
        count: jest.fn().mockResolvedValue(0),
      },
      ledgerEntry: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(db)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralsService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();

    service = module.get<ReferralsService>(ReferralsService);
  });

  describe('Referral Identifier Resolution', () => {
    it('1. Resolves referrer by 8-character referral code (case-insensitive)', async () => {
      db.driver.findFirst.mockResolvedValue(mockReferrerDriver);

      const result = await service.validateReferrer('adh9k28m');
      expect(result.valid).toBe(true);
      expect(result.referrer?.id).toBe(mockReferrerDriver.id);
      expect(result.referrer?.fullName).toBe('Rajesh Kumar');
      expect(result.referrer?.phoneMasked).toContain('•••');
    });

    it('2. Resolves referrer by 10-digit registered mobile number', async () => {
      db.driver.findFirst
        .mockResolvedValueOnce(null) // code lookup returns null
        .mockResolvedValueOnce(mockReferrerDriver); // phone lookup returns match

      const result = await service.validateReferrer('9876543210');
      expect(result.valid).toBe(true);
      expect(result.referrer?.id).toBe(mockReferrerDriver.id);
      expect(result.referrer?.fullName).toBe('Rajesh Kumar');
    });

    it('3. Returns invalid when identifier does not exist', async () => {
      db.driver.findFirst.mockResolvedValue(null);

      const result = await service.validateReferrer('INVALID99');
      expect(result.valid).toBe(false);
      expect(result.referrer).toBeUndefined();
    });
  });

  describe('Referral Linking on Registration', () => {
    it('4. Links referee driver and creates referral in PENDING_VERIFICATION', async () => {
      db.driver.findFirst.mockResolvedValue(mockReferrerDriver);
      db.driverReferral.findUnique.mockResolvedValue(null);

      const linked = await service.linkReferralOnSignup(mockRefereeDriver.id, 'ADH9K28M');
      expect(linked).toBe(true);
      expect(db.driverReferral.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          referrerDriverId: mockReferrerDriver.id,
          refereeDriverId: mockRefereeDriver.id,
          status: ReferralStatus.PENDING_VERIFICATION,
          rewardPaise: 50000,
        }),
      });
    });

    it('5. Disallows self-referral (driver cannot refer themselves)', async () => {
      db.driver.findFirst.mockResolvedValue(mockReferrerDriver);

      const linked = await service.linkReferralOnSignup(mockReferrerDriver.id, 'ADH9K28M');
      expect(linked).toBe(false);
      expect(db.driverReferral.create).not.toHaveBeenCalled();
    });
  });

  describe('Referee 100-Ride Milestone & KYC Approval', () => {
    it('6. Does not unlock referral on KYC if referee has not completed 100 rides', async () => {
      db.driverReferral.findUnique.mockResolvedValue({
        id: 'referral-uuid-1',
        referrerDriverId: mockReferrerDriver.id,
        refereeDriverId: mockRefereeDriver.id,
        status: ReferralStatus.PENDING_VERIFICATION,
        refereeDriver: { ...mockRefereeDriver, totalTrips: 15 },
      });
      db.trip.count.mockResolvedValue(15);

      await service.onRefereeKycApproved(mockRefereeDriver.id);

      expect(db.driverReferral.update).toHaveBeenCalledWith({
        where: { id: 'referral-uuid-1' },
        data: {
          status: ReferralStatus.PENDING_VERIFICATION,
          refereeVerifiedAt: expect.any(Date),
        },
      });
    });

    it('7. Unlocks referral when referee completes 100 rides and is KYC verified', async () => {
      db.driverReferral.findUnique.mockResolvedValue({
        id: 'referral-uuid-1',
        referrerDriverId: mockReferrerDriver.id,
        refereeDriverId: mockRefereeDriver.id,
        status: ReferralStatus.PENDING_VERIFICATION,
        refereeDriver: { ...mockRefereeDriver, totalTrips: 100, verificationStatus: 'VERIFIED' },
        referrerDriver: { id: mockReferrerDriver.id, userId: mockReferrerDriver.userId },
      });
      db.trip.count.mockResolvedValue(100);

      const result = await service.onRefereeCompletedMilestone(mockRefereeDriver.id);

      expect(result?.unlocked).toBe(true);
      expect(result?.referrerUserId).toBe(mockReferrerDriver.userId);
      expect(db.driverReferral.update).toHaveBeenCalledWith({
        where: { id: 'referral-uuid-1' },
        data: {
          status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
          refereeVerifiedAt: expect.any(Date),
        },
      });
    });
  });

  describe('100-Ride Milestone Guard & Vault Claims', () => {
    it('8. Rejects reward claim if referee driver has completed only 99 rides (Milestone not reached)', async () => {
      db.driver.findFirst.mockResolvedValue(mockReferrerDriver);
      db.driverReferral.findFirst.mockResolvedValue({
        id: 'referral-uuid-1',
        referrerDriverId: mockReferrerDriver.id,
        refereeDriverId: mockRefereeDriver.id,
        rewardPaise: 50000,
        status: ReferralStatus.PENDING_VERIFICATION,
        refereeDriver: { ...mockRefereeDriver, totalTrips: 99, verificationStatus: 'VERIFIED' },
      });
      db.trip.count.mockResolvedValue(99);

      await expect(
        service.claimReward(mockReferrerDriver.userId, 'referral-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('9. Successfully claims reward when referee driver reaches 100 rides milestone and credits referrer wallet', async () => {
      db.driver.findFirst.mockResolvedValue(mockReferrerDriver);
      db.trip.count.mockResolvedValue(100);

      db.driverReferral.findFirst.mockResolvedValue({
        id: 'referral-uuid-1',
        referrerDriverId: mockReferrerDriver.id,
        refereeDriverId: mockRefereeDriver.id,
        rewardPaise: 50000, // ₹500
        status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
        refereeDriver: { ...mockRefereeDriver, fullName: 'Suresh Patel', totalTrips: 100, verificationStatus: 'VERIFIED' },
      });

      db.driverReferral.updateMany.mockResolvedValue({ count: 1 });
      db.driver.update.mockResolvedValue({
        ...mockReferrerDriver,
        walletBalance: 1700.0,
      });
      db.driver.findUnique.mockResolvedValue({
        ...mockReferrerDriver,
        walletBalance: 1700.0,
      });

      const claimResult = await service.claimReward(mockReferrerDriver.userId, 'referral-uuid-1');

      expect(claimResult.success).toBe(true);
      expect(claimResult.claimedAmountRupees).toBe(500);
      expect(claimResult.newWalletBalance).toBe(1700.0);

      // Verify immutable financial ledger entry was created
      expect(db.ledgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountType: 'DRIVER',
          accountId: mockReferrerDriver.id,
          entryType: 'CREDIT',
          amount: 500,
          referenceType: 'REFERRAL_BONUS',
          referenceId: 'referral-uuid-1',
        }),
      });
    });

    it('10. Rejects duplicate claim if referral was already claimed', async () => {
      db.driver.findFirst.mockResolvedValue(mockReferrerDriver);

      db.driverReferral.findFirst.mockResolvedValue({
        id: 'referral-uuid-1',
        referrerDriverId: mockReferrerDriver.id,
        status: ReferralStatus.CLAIMED,
        refereeDriver: { ...mockRefereeDriver, totalTrips: 105, verificationStatus: 'VERIFIED' },
      });

      await expect(
        service.claimReward(mockReferrerDriver.userId, 'referral-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('11. Prevents concurrent race condition via optimistic lock check', async () => {
      db.driver.findFirst.mockResolvedValue(mockReferrerDriver);
      db.trip.count.mockResolvedValue(100);

      db.driverReferral.findFirst.mockResolvedValue({
        id: 'referral-uuid-1',
        referrerDriverId: mockReferrerDriver.id,
        refereeDriverId: mockRefereeDriver.id,
        rewardPaise: 50000,
        status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
        refereeDriver: { ...mockRefereeDriver, totalTrips: 100, verificationStatus: 'VERIFIED' },
      });

      // Another transaction updated count first -> 0 rows updated
      db.driverReferral.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.claimReward(mockReferrerDriver.userId, 'referral-uuid-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('6-Character Unique Referral Code Generator', () => {
    it('12. Generates a unique 6-character alphanumeric referral code', async () => {
      db.driver.findFirst.mockResolvedValue({
        id: 'new-driver-id-333',
        referralCode: null,
      });
      db.driver.findUnique.mockResolvedValue(null);
      db.driver.update.mockResolvedValue({ id: 'new-driver-id-333' });

      const code = await service.ensureDriverReferralCode('new-driver-id-333');
      expect(code).toHaveLength(6);
      expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
      expect(/[A-Z]/.test(code)).toBe(true); // not all digits
    });
  });

  describe('Flat ₹500 Referral Reward Rule', () => {
    it('11. Accurately calculates flat ₹500 reward for driver referrals', () => {
      expect(service.getRewardPaiseForTier(0)).toBe(50000);
      expect(service.getRewardPaiseForTier(5)).toBe(50000);
      expect(service.getRewardPaiseForTier(15)).toBe(50000);
      expect(service.getTierInfo(0)).toEqual({
        tier: 'BRONZE',
        rewardRupees: 500,
      });
    });
  });

  describe('Referee Reward Rule', () => {
    it('12. Confirms referee driver receives no bonus (only referrer receives ₹500)', async () => {
      const credited = await service.checkAndCreditRefereeWelcomeBonus(mockRefereeDriver.id);
      expect(credited).toBe(false);
      expect(db.driver.update).not.toHaveBeenCalled();
    });
  });
});

