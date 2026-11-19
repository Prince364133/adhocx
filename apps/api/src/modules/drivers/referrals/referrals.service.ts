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
  VerificationStatus,
  DriverAvailability,
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
   * Ensure the given driver has a unique permanent 6-character alphanumeric referral code.
   * If the driver currently has no code, or an invalid/old format code (e.g. 10-digit phone, 8 chars, or ADHOCX),
   * a fresh, permanent 6-character alphanumeric code is generated and saved to the database.
   */
  async ensureDriverReferralCode(driverId: string): Promise<string> {
    const driver = await this.db.driver.findFirst({
      where: {
        OR: [
          { id: driverId },
          { userId: driverId },
        ],
      },
      select: {
        id: true,
        referralCode: true,
        phone: true,
        user: { select: { phone: true } },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const currentCode = driver.referralCode?.trim().toUpperCase();
    const isAlreadyValid6Char =
      currentCode &&
      currentCode.length === 6 &&
      /^[A-Z0-9]{6}$/.test(currentCode) &&
      /[A-Z]/.test(currentCode) &&
      !/^\d{6}$/.test(currentCode) &&
      currentCode !== 'ADHOCX';

    if (isAlreadyValid6Char) {
      return currentCode;
    }

    // Generate and persist a permanent, collision-free 6-character alphanumeric code
    for (let attempts = 0; attempts < 30; attempts++) {
      const candidateCode = generateDriverReferralCode();
      if (candidateCode === 'ADHOCX') continue;
      const collision = await this.db.driver.findUnique({
        where: { referralCode: candidateCode },
        select: { id: true },
      });
      if (!collision) {
        try {
          await this.db.driver.update({
            where: { id: driver.id },
            data: { referralCode: candidateCode },
          });
          this.logger.log(`Assigned unique 6-char referral code ${candidateCode} to driver ${driver.id}`);
          return candidateCode;
        } catch (err: any) {
          this.logger.warn(`Collision or update retry on referral code ${candidateCode}: ${err?.message}`);
        }
      }
    }

    // Deterministic collision fallback: 6-character uppercase alphanumeric (never ADHOCX)
    const seed = (driver.id.replace(/[^A-Z0-9]/gi, '') + 'ADH8K9').toUpperCase();
    let fallback = seed.slice(0, 6);
    if (fallback === 'ADHOCX' || !/[A-Z]/.test(fallback) || /^\d{6}$/.test(fallback)) {
      fallback = 'AX7K2M';
    }

    try {
      await this.db.driver.update({
        where: { id: driver.id },
        data: { referralCode: fallback },
      });
    } catch (_) {}

    return fallback;
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
      include: { refereeDriver: true },
    });

    if (!referral) return;

    const refereeTrips = await this.db.trip.count({
      where: {
        driverId: refereeDriverId,
        status: TripStatus.COMPLETED,
      },
    });
    const refereeRides = Math.max(referral.refereeDriver?.totalTrips || 0, refereeTrips);
    const isMilestoneCompleted = refereeRides >= REFERRAL_MILESTONE_RIDES;

    await this.db.driverReferral.update({
      where: { id: referral.id },
      data: {
        refereeVerifiedAt: new Date(),
        status: isMilestoneCompleted
          ? ReferralStatus.UNLOCKED_READY_TO_CLAIM
          : referral.status,
      },
    });

    this.logger.log(
      `Referee KYC approved for ${refereeDriverId}. Rides: ${refereeRides}/${REFERRAL_MILESTONE_RIDES}. Status: ${isMilestoneCompleted ? 'UNLOCKED_READY_TO_CLAIM' : referral.status}`,
    );
  }

  /**
   * Hook called when a referee driver completes a trip.
   * Unlocks ₹500 reward for the referrer if referee has completed 100 rides.
   */
  async onRefereeCompletedMilestone(refereeDriverId: string): Promise<{
    unlocked: boolean;
    referrerUserId?: string;
    refereeName?: string;
  } | null> {
    const referral = await this.db.driverReferral.findUnique({
      where: { refereeDriverId },
      include: {
        refereeDriver: true,
        referrerDriver: { select: { id: true, userId: true } },
      },
    });

    if (!referral) return null;

    if (referral.status !== ReferralStatus.PENDING_VERIFICATION) {
      return null;
    }

    const refereeTrips = await this.db.trip.count({
      where: {
        driverId: refereeDriverId,
        status: TripStatus.COMPLETED,
      },
    });
    const refereeRides = Math.max(referral.refereeDriver?.totalTrips || 0, refereeTrips);

    if (refereeRides < REFERRAL_MILESTONE_RIDES) {
      return null;
    }

    const isKycVerified =
      String(referral.refereeDriver?.verificationStatus) === 'VERIFIED';

    if (!isKycVerified) {
      return null;
    }

    await this.db.driverReferral.update({
      where: { id: referral.id },
      data: {
        status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
        refereeVerifiedAt: referral.refereeVerifiedAt || new Date(),
      },
    });

    this.logger.log(`Referral ${referral.id} unlocked: referee ${refereeDriverId} completed 100 rides milestone.`);

    return {
      unlocked: true,
      referrerUserId: referral.referrerDriver.userId,
      refereeName: referral.refereeDriver?.fullName || 'Driver Partner',
    };
  }

  /**
   * Fetch driver referral dashboard stats, live referee progress, and list of referees.
   */
  async getDashboard(userId: string): Promise<DriverReferralDashboardDto> {
    let driver: any = await this.db.driver.findFirst({
      where: {
        OR: [
          { userId },
          { id: userId },
        ],
      },
      include: {
        user: true,
        referralsMade: {
          include: {
            refereeDriver: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                vehiclePhotoUrl: true,
                verificationStatus: true,
                totalTrips: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!driver) {
      const user = await this.db.user.findUnique({ where: { id: userId } });
      if (user) {
        try {
          driver = await this.db.driver.create({
            data: {
              userId: user.id,
              fullName: user.fullName || 'Driver Partner',
              phone: user.phone || undefined,
              verificationStatus: VerificationStatus.PENDING,
              availabilityStatus: DriverAvailability.OFFLINE,
            },
            include: {
              user: true,
              referralsMade: true,
            },
          });
        } catch (_) {
          driver = await this.db.driver.findFirst({
            where: {
              OR: [{ userId: user.id }, { phone: user.phone || undefined }],
            },
            include: { user: true, referralsMade: true },
          });
        }
      }
    }

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const referralCode = await this.ensureDriverReferralCode(driver.id);
    const effectivePhone = driver.phone || driver.user?.phone || undefined;

    let vaultLockedRupees = 0;
    let claimableRupees = 0;
    let claimedRupees = 0;
    let verifiedCount = 0;
    let completedMilestonesCount = 0;

    const referralsMade = (driver.referralsMade || []) as any[];

    // Fetch live completed trip counts for all referee drivers in parallel
    const refereeTripCounts = await Promise.all(
      referralsMade.map(async (ref: any) => {
        if (!ref.refereeDriverId) return 0;
        return this.db.trip.count({
          where: {
            driverId: ref.refereeDriverId,
            status: TripStatus.COMPLETED,
          },
        });
      }),
    );

    const referees = await Promise.all(
      referralsMade.map(async (ref: any, index: number) => {
        const rewardRs = Math.round(ref.rewardPaise / 100);
        const actualTrips = refereeTripCounts[index];
        const refereeCompletedRides = Math.max(ref.refereeDriver?.totalTrips || 0, actualTrips);
        const milestoneRides = REFERRAL_MILESTONE_RIDES;
        const milestoneReached = refereeCompletedRides >= milestoneRides;
        const ridesRemaining = Math.max(0, milestoneRides - refereeCompletedRides);
        const progressPercentage = Math.min(100, Math.round((refereeCompletedRides / milestoneRides) * 100));

        const isKycVerified =
          String(ref.refereeDriver?.verificationStatus) === 'VERIFIED';

        if (isKycVerified) {
          verifiedCount++;
        }

        if (milestoneReached) {
          completedMilestonesCount++;
        }

        let currentStatus = ref.status;
        // Auto-unlock if referee reached 100 rides and is verified, but referral was still PENDING_VERIFICATION
        if (milestoneReached && isKycVerified && ref.status === ReferralStatus.PENDING_VERIFICATION) {
          currentStatus = ReferralStatus.UNLOCKED_READY_TO_CLAIM;
          try {
            await this.db.driverReferral.update({
              where: { id: ref.id },
              data: {
                status: ReferralStatus.UNLOCKED_READY_TO_CLAIM,
                refereeVerifiedAt: ref.refereeVerifiedAt || new Date(),
              },
            });
          } catch (_) {}
        }

        const isClaimable =
          currentStatus === ReferralStatus.UNLOCKED_READY_TO_CLAIM &&
          milestoneReached &&
          isKycVerified;

        if (currentStatus === ReferralStatus.CLAIMED) {
          claimedRupees += rewardRs;
        } else if (isClaimable) {
          claimableRupees += rewardRs;
        } else {
          vaultLockedRupees += rewardRs;
        }

        return {
          id: ref.id,
          refereeDriverId: ref.refereeDriverId,
          refereeName: ref.refereeDriver?.fullName || 'Driver Partner',
          refereePhoneMasked: maskPhoneNumber(ref.refereeDriver?.phone),
          refereePhotoUrl: ref.refereeDriver?.vehiclePhotoUrl || undefined,
          status: currentStatus,
          rewardRupees: rewardRs,
          isClaimable,
          refereeCompletedRides,
          milestoneRides,
          ridesRemaining,
          progressPercentage,
          isKycVerified,
          createdAt: ref.createdAt.toISOString(),
          refereeVerifiedAt: ref.refereeVerifiedAt?.toISOString(),
          claimedAt: ref.claimedAt?.toISOString(),
        };
      }),
    );

    const tierInfo = this.getTierInfo(verifiedCount);

    return {
      referralCode,
      phone: effectivePhone,
      totalReferrals: driver.referralsMade.length,
      verifiedReferrals: verifiedCount,
      activeRefereesCount: driver.referralsMade.length - completedMilestonesCount,
      completedMilestonesCount,
      vaultLockedRupees,
      claimableRupees,
      claimedRupees,
      completedRides: 0,
      milestoneRides: REFERRAL_MILESTONE_RIDES,
      milestoneReached: completedMilestonesCount > 0,
      ridesRemainingToMilestone: 0,
      currentTier: tierInfo.tier,
      currentRewardRupees: tierInfo.rewardRupees,
      nextTier: tierInfo.nextTier,
      referralsToNextTier: tierInfo.referralsToNextTier,
      referees,
    };
  }

  /**
   * Only the referring driver receives ₹500 per verified driver upon the referee reaching their 100-ride milestone.
   * The referee driver receives no bonus.
   */
  async checkAndCreditRefereeWelcomeBonus(_driverId: string): Promise<boolean> {
    return false;
  }

  /**
   * Claim a single referral reward into the driver's withdrawal wallet.
   * Requires the REFEREE driver to have completed the 100 rides milestone and passed KYC.
   */
  async claimReward(userId: string, referralId: string): Promise<ClaimReferralResponseDto> {
    const driver = await this.db.driver.findFirst({
      where: {
        OR: [
          { userId },
          { id: userId },
        ],
      },
      select: { id: true, fullName: true, totalTrips: true, walletBalance: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const referral = await this.db.driverReferral.findFirst({
      where: {
        id: referralId,
        referrerDriverId: driver.id,
      },
      include: {
        refereeDriver: {
          select: {
            id: true,
            fullName: true,
            totalTrips: true,
            verificationStatus: true,
          },
        },
      },
    });

    if (!referral) {
      throw new NotFoundException('Referral reward not found');
    }

    if (referral.status === ReferralStatus.CLAIMED) {
      throw new BadRequestException('This referral reward has already been claimed into your wallet.');
    }

    // Verify the REFEREE driver has completed the 100-ride milestone
    const refereeTrips = await this.db.trip.count({
      where: {
        driverId: referral.refereeDriverId,
        status: TripStatus.COMPLETED,
      },
    });
    const refereeRides = Math.max(referral.refereeDriver?.totalTrips || 0, refereeTrips);

    if (refereeRides < REFERRAL_MILESTONE_RIDES) {
      throw new BadRequestException(
        `Referred driver partner has completed ${refereeRides}/${REFERRAL_MILESTONE_RIDES} rides. They must complete 100 rides to unlock your ₹500 reward.`,
      );
    }

    const isKycVerified =
      String(referral.refereeDriver?.verificationStatus) === 'VERIFIED';

    if (!isKycVerified) {
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
          status: { in: [ReferralStatus.UNLOCKED_READY_TO_CLAIM, ReferralStatus.PENDING_VERIFICATION] },
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
          description: `Referral Bonus: Referred driver ${referral.refereeDriver?.fullName || referral.refereeDriverId} completed 100 rides (+₹${rewardRupees})`,
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
      message: `₹${rewardRupees} has been successfully added to your withdrawal wallet!`,
    };
  }

  /**
   * Bulk claim all unlocked rewards for the driver where referee reached 100 rides.
   */
  async claimAllRewards(userId: string): Promise<ClaimReferralResponseDto> {
    const driver = await this.db.driver.findFirst({
      where: {
        OR: [
          { userId },
          { id: userId },
        ],
      },
      select: { id: true, fullName: true, totalTrips: true, walletBalance: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const candidateReferrals = await this.db.driverReferral.findMany({
      where: {
        referrerDriverId: driver.id,
        status: { in: [ReferralStatus.UNLOCKED_READY_TO_CLAIM, ReferralStatus.PENDING_VERIFICATION] },
      },
      include: {
        refereeDriver: {
          select: { id: true, fullName: true, totalTrips: true, verificationStatus: true },
        },
      },
    });

    const eligibleReferrals: any[] = [];
    for (const ref of candidateReferrals) {
      const actualTrips = await this.db.trip.count({
        where: { driverId: ref.refereeDriverId, status: TripStatus.COMPLETED },
      });
      const refereeRides = Math.max(ref.refereeDriver?.totalTrips || 0, actualTrips);
      const isKycVerified =
        String(ref.refereeDriver?.verificationStatus) === 'VERIFIED';

      if (refereeRides >= REFERRAL_MILESTONE_RIDES && isKycVerified) {
        eligibleReferrals.push(ref);
      }
    }

    if (eligibleReferrals.length === 0) {
      throw new BadRequestException('No eligible referral rewards to claim at this time (requires referred driver to complete 100 rides & pass KYC).');
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
          status: { in: [ReferralStatus.UNLOCKED_READY_TO_CLAIM, ReferralStatus.PENDING_VERIFICATION] },
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
          description: `Referral Bonus: Bulk claim for ${claimedIds.length} driver(s) completing 100 rides (+₹${totalRewardRupees})`,
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
      message: `₹${totalRewardRupees} has been successfully added to your withdrawal wallet!`,
    };
  }
}
