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

  describe('KYC Approval Trigger', () => {
    it('6. Automatically unlocks referral when referee KYC is approved', async () => {
      db.driverReferral.findUnique.mockResolvedValue({
        id: 'referral-uuid-1',
        referrerDriverId: mockReferrerDriver.id,
        refereeDriverId: mockRefereeDriver.id,
        status: ReferralStatus.PENDING_VERIFICATION,
      });

      await service.onRefereeKycApproved(mockRefereeDriver.id);

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
    it('7. Rejects reward claim if driver has completed only 99 rides (Milestone not reached)', async () => {
      db.driver.findUnique.mockResolvedValue({
        ...mockReferrerDriver,
        totalTrips: 99,
      });
      db.trip.count.mockResolvedValue(99);

      await expect(
        service.claimReward(mockReferrerDriver.userId, 'referral-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('8. Successfully claims reward when driver reaches 100 rides milestone and credits wallet', async () => {
      db.driver.findUnique
        .mockResolvedValueOnce({
          ...mockReferrerDriver,
          totalTrips: 100,
        })
        .mockResolvedValueOnce({
          walletBalance: 1700.0,
        });
      db.trip.count.mockResolvedValue(100);

      db.driverReferral.findFirst.mockResolvedValue({
        id: 'referral-uuid-1',
        referrerDriverId: mockReferrerDriver.id,
        refereeDriverId: mockRefereeDriver.id,
        rewardPaise: 50000, // â‚¹500
        status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
        refereeDriver: { fullName: 'Suresh Patel' },
      });

      db.driverReferral.updateMany.mockResolvedValue({ count: 1 });
      db.driver.update.mockResolvedValue({
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

    it('9. Rejects duplicate claim if referral was already claimed', async () => {
      db.driver.findUnique.mockResolvedValue({
        ...mockReferrerDriver,
        totalTrips: 105,
      });
      db.trip.count.mockResolvedValue(105);

      db.driverReferral.findFirst.mockResolvedValue({
        id: 'referral-uuid-1',
        referrerDriverId: mockReferrerDriver.id,
        status: ReferralStatus.CLAIMED,
      });

      await expect(
        service.claimReward(mockReferrerDriver.userId, 'referral-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('10. Prevents concurrent race condition via optimistic lock check', async () => {
      db.driver.findUnique.mockResolvedValue({
        ...mockReferrerDriver,
        totalTrips: 100,
      });
      db.trip.count.mockResolvedValue(100);

      db.driverReferral.findFirst.mockResolvedValue({
        id: 'referral-uuid-1',
        referrerDriverId: mockReferrerDriver.id,
        rewardPaise: 50000,
        status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
      });

      // Another transaction updated count first -> 0 rows updated
      db.driverReferral.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.claimReward(mockReferrerDriver.userId, 'referral-uuid-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Tier Multiplier System (Bronze, Silver, Gold)', () => {
    it('11. Accurately calculates dynamic tier multipliers and next tier thresholds', () => {
      // Bronze: 0-2 verified
      expect(service.getRewardPaiseForTier(0)).toBe(50000);
      expect(service.getRewardPaiseForTier(2)).toBe(50000);
      expect(service.getTierInfo(0)).toEqual({
        tier: 'BRONZE',
        rewardRupees: 500,
        nextTier: 'SILVER',
        referralsToNextTier: 3,
      });

      // Silver: 3-8 verified
      expect(service.getRewardPaiseForTier(3)).toBe(65000);
      expect(service.getRewardPaiseForTier(8)).toBe(65000);
      expect(service.getTierInfo(5)).toEqual({
        tier: 'SILVER',
        rewardRupees: 650,
        nextTier: 'GOLD',
        referralsToNextTier: 4,
      });

      // Gold: 9+ verified
      expect(service.getRewardPaiseForTier(9)).toBe(80000);
      expect(service.getRewardPaiseForTier(15)).toBe(80000);
      expect(service.getTierInfo(10)).toEqual({
        tier: 'GOLD',
        rewardRupees: 800,
      });
    });
  });

  describe('Dual-Sided Reciprocity: 10-Ride Welcome Fuel Bonus', () => {
    it('12. Credits â‚¹250 Welcome Fuel Bonus to referee upon completing 10 rides', async () => {
      db.driver.findUnique.mockResolvedValue({
        id: mockRefereeDriver.id,
        referredById: mockReferrerDriver.id,
        totalTrips: 10,
        walletBalance: 350.0,
      });

      // Not credited previously
      db.ledgerEntry.findFirst = jest.fn().mockResolvedValue(null);
      db.driver.update.mockResolvedValue({
        id: mockRefereeDriver.id,
        walletBalance: 600.0,
      });

      const credited = await service.checkAndCreditRefereeWelcomeBonus(mockRefereeDriver.id);

      expect(credited).toBe(true);
      expect(db.driver.update).toHaveBeenCalledWith({
        where: { id: mockRefereeDriver.id },
        data: {
          walletBalance: { increment: 250 },
        },
      });
      expect(db.ledgerEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountType: 'DRIVER',
          accountId: mockRefereeDriver.id,
          entryType: 'CREDIT',
          amount: 250,
          balanceAfter: 600.0,
          referenceType: 'REFERRAL_WELCOME_BONUS',
        }),
      });
    });

    it('13. Idempotently skips welcome bonus if already credited', async () => {
      db.driver.findUnique.mockResolvedValue({
        id: mockRefereeDriver.id,
        referredById: mockReferrerDriver.id,
        totalTrips: 12,
        walletBalance: 600.0,
      });

      // Already exists in ledger
      db.ledgerEntry.findFirst = jest.fn().mockResolvedValue({
        id: 'ledger-bonus-1',
        referenceType: 'REFERRAL_WELCOME_BONUS',
      });

      const credited = await service.checkAndCreditRefereeWelcomeBonus(mockRefereeDriver.id);
      expect(credited).toBe(false);
      expect(db.driver.update).not.toHaveBeenCalled();
    });
  });
});

