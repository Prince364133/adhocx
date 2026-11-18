import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import {
  generateDriverReferralCode,
  normalizeReferralIdentifier,
  maskPhoneNumber,
} from './referral-code.util';
import {
  ReferralStatus,
  TripStatus,
  ValidateReferralResponseDto,
  DriverReferralDashboardDto,
  ClaimReferralResponseDto,
} from '@adhocx/contracts';

export const REFERRAL_MILESTONE_RIDES = 100;
export const REFERRAL_DEFAULT_REWARD_RUPEES = 500;
export const REFERRAL_DEFAULT_REWARD_PAISE = 50000;
export const REFERRAL_WELCOME_BONUS_RUPEES = 250;

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly db: DatabaseService,
  ) {}

  /**
   * Determine reward amount based on referrer's historical verified referral count.
   * Bronze (0-2 verified): ₹500 (50,000 paise)
   * Silver (3-8 verified): ₹650 (65,000 paise)
   * Gold (9+ verified): ₹800 (80,000 paise)
   */
  getRewardPaiseForTier(verifiedCount: number): number {
    if (verifiedCount >= 9) {
      return 80000; // ₹800
    }
    if (verifiedCount >= 3) {
      return 65000; // ₹650
    }
    return 50000; // ₹500
  }

  getTierInfo(verifiedCount: number): {
    tier: 'BRONZE' | 'SILVER' | 'GOLD';
    rewardRupees: number;
    nextTier?: 'SILVER' | 'GOLD';
    referralsToNextTier?: number;
  } {
    if (verifiedCount >= 9) {
      return {
        tier: 'GOLD',
        rewardRupees: 800,
      };
    }
    if (verifiedCount >= 3) {
      return {
        tier: 'SILVER',
        rewardRupees: 650,
        nextTier: 'GOLD',
        referralsToNextTier: 9 - verifiedCount,
      };
    }
    return {
      tier: 'BRONZE',
      rewardRupees: 500,
      nextTier: 'SILVER',
      referralsToNextTier: 3 - verifiedCount,
    };
  }

  /**
   * Ensure the given driver has a unique referral code.
   */
  async ensureDriverReferralCode(driverId: string): Promise<string> {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      select: { id: true, referralCode: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (driver.referralCode) {
      return driver.referralCode;
    }

    // Generate unique code with collision retry loop
    for (let attempts = 0; attempts < 10; attempts++) {
      const candidateCode = generateDriverReferralCode();
      const existing = await this.db.driver.findUnique({
        where: { referralCode: candidateCode },
        select: { id: true },
      });
      if (!existing) {
        await this.db.driver.update({
          where: { id: driverId },
          data: { referralCode: candidateCode },
        });
        this.logger.log(`Assigned referral code ${candidateCode} to driver ${driverId}`);
        return candidateCode;
      }
    }

    throw new ConflictException('Failed to generate unique referral code. Please retry.');
  }

  /**
   * Validate a referral code or phone number entered during registration.
   */
  async validateReferrer(rawIdentifier: string): Promise<ValidateReferralResponseDto> {
    if (!rawIdentifier || !rawIdentifier.trim()) {
      return { valid: false, message: 'Please provide a referral code or phone number.' };
    }

    const normalized = normalizeReferralIdentifier(rawIdentifier);
    if (!normalized) {
      return { valid: false, message: 'Invalid referral code or phone format.' };
    }

    // Try finding by referral code first
    let referrer = await this.db.driver.findFirst({
      where: {
        referralCode: { equals: normalized, mode: 'insensitive' },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        vehicleType: true,
        verificationStatus: true,
      },
    });

    // If not found and input looks like a phone number (10 digits)
    if (!referrer && /^\d{10}$/.test(normalized)) {
      const phoneVariants = [
        normalized,
        `+91${normalized}`,
        `91${normalized}`,
        `+91 ${normalized}`,
      ];

      referrer = await this.db.driver.findFirst({
        where: {
          phone: { in: phoneVariants },
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          vehicleType: true,
          verificationStatus: true,
        },
      });
    }

    if (!referrer) {
      return {
        valid: false,
        message: 'No registered driver found matching this referral code or phone number.',
      };
    }

    return {
      valid: true,
      message: 'Verified AdhocX Driver Partner',
      referrer: {
        id: referrer.id,
        fullName: referrer.fullName,
        phoneMasked: maskPhoneNumber(referrer.phone),
        vehicleType: referrer.vehicleType || undefined,
      },
    };
  }

  /**
   * Link referee driver to referrer on registration.
   */
  async linkReferralOnSignup(refereeDriverId: string, rawIdentifier: string): Promise<boolean> {
    const valResult = await this.validateReferrer(rawIdentifier);
    if (!valResult.valid || !valResult.referrer) {
      return false;
    }

    const referrerId = valResult.referrer.id;
    if (referrerId === refereeDriverId) {
      this.logger.warn(`Driver ${refereeDriverId} attempted self-referral`);
      return false;
    }

    // Check if referee is already linked
    const existingReferral = await this.db.driverReferral.findUnique({
      where: { refereeDriverId },
    });
    if (existingReferral) {
      return false;
    }

    // Determine tier reward based on referrer's current referral tier
    const verifiedCount = await this.db.driverReferral.count({
      where: {
        referrerDriverId: referrerId,
        status: { in: [ReferralStatus.UNLOCKED_READY_TO_CLAIM, ReferralStatus.CLAIMED] },
      },
    });
    const rewardPaise = this.getRewardPaiseForTier(verifiedCount);

    await this.db.$transaction(async (tx) => {
      // 1. Create referral record with tier-based reward
      await tx.driverReferral.create({
        data: {
          referrerDriverId: referrerId,
          refereeDriverId: refereeDriverId,
          rewardPaise,
          status: ReferralStatus.PENDING_VERIFICATION,
        },
      });

      // 2. Link referrer on Driver model
      await tx.driver.update({
        where: { id: refereeDriverId },
        data: {
          referredById: referrerId,
          referredAt: new Date(),
        },
      });
    });

    this.logger.log(`Linked referee driver ${refereeDriverId} to referrer ${referrerId}`);
    return true;
  }

  /**
   * Hook called when a driver's KYC is verified by Admin or Digio.
   */
  async onRefereeKycApproved(refereeDriverId: string): Promise<void> {
    const referral = await this.db.driverReferral.findUnique({
      where: { refereeDriverId },
    });

    if (!referral) return;

    if (referral.status === ReferralStatus.PENDING_VERIFICATION) {
      await this.db.driverReferral.update({
        where: { id: referral.id },
        data: {
          status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
          refereeVerifiedAt: new Date(),
        },
      });

      this.logger.log(
        `Referral ${referral.id} unlocked: referee ${refereeDriverId} is verified. Ready for referrer ${referral.referrerDriverId} to claim after milestone.`,
      );
    }
  }

  /**
   * Fetch driver referral dashboard stats, 100-ride milestone, and list of referees.
   */
  async getDashboard(userId: string): Promise<DriverReferralDashboardDto> {
    const driver = await this.db.driver.findUnique({
      where: { userId },
      include: {
        referralsMade: {
          include: {
            refereeDriver: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                vehiclePhotoUrl: true,
                verificationStatus: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const referralCode = await this.ensureDriverReferralCode(driver.id);

    // Compute effective completed trips
    const completedTripsCount = await this.db.trip.count({
      where: {
        driverId: driver.id,
        status: TripStatus.COMPLETED,
      },
    });
    const completedRides = Math.max(driver.totalTrips || 0, completedTripsCount);
    const milestoneReached = completedRides >= REFERRAL_MILESTONE_RIDES;
    const ridesRemainingToMilestone = Math.max(0, REFERRAL_MILESTONE_RIDES - completedRides);

    let vaultLockedRupees = 0;
    let claimableRupees = 0;
    let claimedRupees = 0;
    let verifiedCount = 0;

    const referees = driver.referralsMade.map((ref) => {
      const rewardRs = Math.round(ref.rewardPaise / 100);
      const isVerified =
        ref.status === ReferralStatus.UNLOCKED_READY_TO_CLAIM ||
        ref.status === ReferralStatus.CLAIMED;

      if (isVerified) {
        verifiedCount++;
      }

      if (ref.status === ReferralStatus.CLAIMED) {
        claimedRupees += rewardRs;
      } else if (ref.status === ReferralStatus.UNLOCKED_READY_TO_CLAIM) {
        if (milestoneReached) {
          claimableRupees += rewardRs;
        } else {
          vaultLockedRupees += rewardRs;
        }
      } else if (ref.status === ReferralStatus.PENDING_VERIFICATION) {
        vaultLockedRupees += rewardRs;
      }

      const isClaimable =
        milestoneReached && ref.status === ReferralStatus.UNLOCKED_READY_TO_CLAIM;

      return {
        id: ref.id,
        refereeName: ref.refereeDriver?.fullName || 'Driver Partner',
        refereePhoneMasked: maskPhoneNumber(ref.refereeDriver?.phone),
        refereePhotoUrl: ref.refereeDriver?.vehiclePhotoUrl || undefined,
        status: ref.status,
        rewardRupees: rewardRs,
        isClaimable,
        createdAt: ref.createdAt.toISOString(),
        refereeVerifiedAt: ref.refereeVerifiedAt?.toISOString(),
        claimedAt: ref.claimedAt?.toISOString(),
      };
    });

    const tierInfo = this.getTierInfo(verifiedCount);

    return {
      referralCode,
      phone: driver.phone || undefined,
      totalReferrals: driver.referralsMade.length,
      verifiedReferrals: verifiedCount,
      vaultLockedRupees,
      claimableRupees,
      claimedRupees,
      completedRides,
      milestoneRides: REFERRAL_MILESTONE_RIDES,
      milestoneReached,
      ridesRemainingToMilestone,
      currentTier: tierInfo.tier,
      currentRewardRupees: tierInfo.rewardRupees,
      nextTier: tierInfo.nextTier,
      referralsToNextTier: tierInfo.referralsToNextTier,
      referees,
    };
  }

  /**
   * Dual-Sided Enhancement #2:
   * Credit ₹250 Welcome Fuel Bonus to referee driver when they complete 10 trips.
   */
  async checkAndCreditRefereeWelcomeBonus(driverId: string): Promise<boolean> {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      select: { id: true, referredById: true, totalTrips: true, walletBalance: true },
    });

    if (!driver || !driver.referredById) {
      return false;
    }

    if ((driver.totalTrips || 0) < 10) {
      return false;
    }

    const existingBonus = await this.db.ledgerEntry.findFirst({
      where: {
        accountId: driver.id,
        referenceType: 'REFERRAL_WELCOME_BONUS',
      },
    });

    if (existingBonus) {
      return false;
    }

    const welcomeBonusRs = REFERRAL_WELCOME_BONUS_RUPEES;
    await this.db.$transaction(async (tx) => {
      const updated = await tx.driver.update({
        where: { id: driver.id },
        data: {
          walletBalance: { increment: welcomeBonusRs },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: driver.id,
          entryType: 'CREDIT',
          amount: welcomeBonusRs,
          balanceAfter: updated.walletBalance,
          referenceType: 'REFERRAL_WELCOME_BONUS',
          referenceId: driver.id,
          description: `Referral Welcome Bonus: Completed 10 rides milestone (+₹${welcomeBonusRs})`,
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    this.logger.log(`Credited ₹${welcomeBonusRs} referral welcome bonus to referee driver ${driverId}`);
    return true;
  }

  /**
   * Claim a single referral reward into the driver's withdrawal wallet.
   * Requires driver to have reached 100 completed trips milestone.
   */
  async claimReward(userId: string, referralId: string): Promise<ClaimReferralResponseDto> {
    const driver = await this.db.driver.findUnique({
      where: { userId },
      select: { id: true, fullName: true, totalTrips: true, walletBalance: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const completedTripsCount = await this.db.trip.count({
      where: {
        driverId: driver.id,
        status: TripStatus.COMPLETED,
      },
    });
    const completedRides = Math.max(driver.totalTrips || 0, completedTripsCount);

    if (completedRides < REFERRAL_MILESTONE_RIDES) {
      throw new BadRequestException(
        `100 completed rides milestone required to claim referral rewards. Current progress: ${completedRides}/${REFERRAL_MILESTONE_RIDES} rides.`,
      );
    }

    const referral = await this.db.driverReferral.findFirst({
      where: {
        id: referralId,
        referrerDriverId: driver.id,
      },
      include: {
        refereeDriver: {
          select: { fullName: true },
        },
      },
    });

    if (!referral) {
      throw new NotFoundException('Referral reward not found');
    }

    if (referral.status === ReferralStatus.CLAIMED) {
      throw new BadRequestException('This referral reward has already been claimed into your wallet.');
    }

    if (referral.status !== ReferralStatus.UNLOCKED_READY_TO_CLAIM) {
      throw new BadRequestException(
        'This referral is pending KYC verification of the referred driver and cannot be claimed yet.',
      );
    }

    const rewardRupees = Math.round(referral.rewardPaise / 100);

    // Atomic transaction: mark claimed and credit driver wallet balance via immutable ledger
    await this.db.$transaction(async (tx) => {
      // 1. Conditional update to prevent race conditions
      const updatedReferral = await tx.driverReferral.updateMany({
        where: {
          id: referralId,
          status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
        },
        data: {
          status: ReferralStatus.CLAIMED,
          claimedAt: new Date(),
        },
      });

      if (updatedReferral.count === 0) {
        throw new ConflictException('Referral was already claimed or updated concurrently.');
      }

      // 2. Increment driver wallet balance
      const updatedDriver = await tx.driver.update({
        where: { id: driver.id },
        data: {
          walletBalance: { increment: rewardRupees },
        },
      });

      // 3. Create immutable ledger entry
      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: driver.id,
          entryType: 'CREDIT',
          amount: rewardRupees,
          balanceAfter: updatedDriver.walletBalance,
          referenceType: 'REFERRAL_BONUS',
          referenceId: referral.id,
          description: `Referral Bonus: Onboarding ${referral.refereeDriver?.fullName || 'Driver Partner'} (+â‚¹${rewardRupees})`,
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    const updatedDriver = await this.db.driver.findUnique({
      where: { id: driver.id },
      select: { walletBalance: true },
    });

    return {
      success: true,
      claimedAmountRupees: rewardRupees,
      newWalletBalance: Number(updatedDriver?.walletBalance || 0),
      claimedReferralIds: [referralId],
      message: `â‚¹${rewardRupees} has been successfully added to your withdrawal wallet!`,
    };
  }

  /**
   * Bulk claim all unlocked rewards for the driver.
   */
  async claimAllRewards(userId: string): Promise<ClaimReferralResponseDto> {
    const driver = await this.db.driver.findUnique({
      where: { userId },
      select: { id: true, fullName: true, totalTrips: true, walletBalance: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const completedTripsCount = await this.db.trip.count({
      where: {
        driverId: driver.id,
        status: TripStatus.COMPLETED,
      },
    });
    const completedRides = Math.max(driver.totalTrips || 0, completedTripsCount);

    if (completedRides < REFERRAL_MILESTONE_RIDES) {
      throw new BadRequestException(
        `100 completed rides milestone required to claim referral rewards. Current progress: ${completedRides}/${REFERRAL_MILESTONE_RIDES} rides.`,
      );
    }

    const eligibleReferrals = await this.db.driverReferral.findMany({
      where: {
        referrerDriverId: driver.id,
        status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
      },
      include: {
        refereeDriver: {
          select: { fullName: true },
        },
      },
    });

    if (eligibleReferrals.length === 0) {
      throw new BadRequestException('No eligible referral rewards to claim at this time.');
    }

    let totalRewardRupees = 0;
    const claimedIds: string[] = [];

    for (const ref of eligibleReferrals) {
      totalRewardRupees += Math.round(ref.rewardPaise / 100);
      claimedIds.push(ref.id);
    }

    await this.db.$transaction(async (tx) => {
      // 1. Update referrals to CLAIMED
      await tx.driverReferral.updateMany({
        where: {
          id: { in: claimedIds },
          status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
        },
        data: {
          status: ReferralStatus.CLAIMED,
          claimedAt: new Date(),
        },
      });

      // 2. Increment driver wallet
      const updatedDriver = await tx.driver.update({
        where: { id: driver.id },
        data: {
          walletBalance: { increment: totalRewardRupees },
        },
      });

      // 3. Create immutable ledger entry
      await tx.ledgerEntry.create({
        data: {
          accountType: 'DRIVER',
          accountId: driver.id,
          entryType: 'CREDIT',
          amount: totalRewardRupees,
          balanceAfter: updatedDriver.walletBalance,
          referenceType: 'REFERRAL_BONUS_BULK',
          referenceId: driver.id,
          description: `Referral Bonus: Bulk claim for ${claimedIds.length} driver(s) (+â‚¹${totalRewardRupees})`,
        },
      });
    }, { timeout: 30000, maxWait: 10000 });

    const updatedDriver = await this.db.driver.findUnique({
      where: { id: driver.id },
      select: { walletBalance: true },
    });

    return {
      success: true,
      claimedAmountRupees: totalRewardRupees,
      newWalletBalance: Number(updatedDriver?.walletBalance || 0),
      claimedReferralIds: claimedIds,
      message: `â‚¹${totalRewardRupees} has been successfully added to your withdrawal wallet!`,
    };
  }
}
