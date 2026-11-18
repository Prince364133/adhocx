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
  /**
   * Flat referral reward of ₹500 (50,000 paise) per verified driver partner.
   */
  getRewardPaiseForTier(_verifiedCount: number): number {
    return REFERRAL_DEFAULT_REWARD_PAISE;
  }

  getTierInfo(_verifiedCount: number): {
    tier: 'BRONZE' | 'SILVER' | 'GOLD';
    rewardRupees: number;
    nextTier?: 'SILVER' | 'GOLD';
    referralsToNextTier?: number;
  } {
    return {
      tier: 'BRONZE',
      rewardRupees: REFERRAL_DEFAULT_REWARD_RUPEES,
    };
  }

  /**
   * Ensure the given driver has a unique referral code.
   * By default, the driver's registered 10-digit phone number is used as their primary referral code.
   */
  async ensureDriverReferralCode(driverId: string): Promise<string> {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      select: { id: true, referralCode: true, phone: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const cleanDigits = (driver.phone || '').replace(/\D/g, '');
    const phone10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

    if (phone10) {
      if (driver.referralCode !== phone10) {
        await this.db.driver.update({
          where: { id: driverId },
          data: { referralCode: phone10 },
        });
      }
      return phone10;
    }

    if (driver.referralCode) {
      return driver.referralCode;
    }

    // Fallback if driver has no phone registered
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

    return driver.id.slice(0, 8).toUpperCase();
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

    // Flat reward: ₹500 (50,000 paise) per verified driver partner
    const rewardPaise = REFERRAL_DEFAULT_REWARD_PAISE;

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
   * Only the referring driver receives ₹500 per verified driver upon reaching their 100-ride milestone.
   * The referee driver receives no bonus.
   */
  async checkAndCreditRefereeWelcomeBonus(_driverId: string): Promise<boolean> {
    return false;
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
