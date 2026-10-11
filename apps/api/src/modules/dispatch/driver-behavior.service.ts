import { Injectable, Logger, Optional } from '@nestjs/common';
import { OfferStatus, RequirementStatus } from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { DispatchConfig } from './dispatch.config';

export type OfferOutcome = 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface OfferOutcomeInput {
  offerId: string;
  driverId: string;
  outcome: OfferOutcome;
  /** Dispatch-time road distance stored on the offer. */
  distanceKm: number | null;
  seenAt: Date | null;
  /** Requirement state at the moment the driver acted (or the offer lapsed). */
  requirement: { status: string; quantity: number; assignedQuantity: number } | null;
}

export interface OutcomeDecision {
  counted: boolean;
  penalized: boolean;
  cooldownApplied: boolean;
  reason: string;
}

const CLOSED_REQUIREMENT_STATUSES: string[] = [
  RequirementStatus.CANCELLED,
  RequirementStatus.COMPLETED,
  RequirementStatus.FULFILLED,
];

/**
 * Single source of truth for acceptance-rate (AR) tracking and anti-cherry-picking penalties.
 *
 * Policy:
 *  - ACCEPTED: counts toward AR window, resets consecutive declines, small trust reward.
 *  - DECLINED / EXPIRED: ignored if the requirement was already closed/full (driver could not
 *    have helped) or, for expiries, if the app never displayed the offer. Otherwise counts toward AR.
 *    Nearby offers (dispatch-time road distance <= nearbyKm) additionally cost trust and advance the
 *    consecutive-decline counter; reaching the limit triggers an escalating cooldown.
 *
 * All counter writes are single atomic UPDATE statements so concurrent outcomes never lose updates.
 */
@Injectable()
export class DriverBehaviorService {
  private readonly logger = new Logger(DriverBehaviorService.name);

  constructor(
    private readonly db: DatabaseService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  decide(input: OfferOutcomeInput): OutcomeDecision {
    if (input.outcome === 'ACCEPTED') {
      return { counted: true, penalized: false, cooldownApplied: false, reason: 'accepted' };
    }

    const req = input.requirement;
    if (!req || CLOSED_REQUIREMENT_STATUSES.includes(req.status) || req.assignedQuantity >= req.quantity) {
      return { counted: false, penalized: false, cooldownApplied: false, reason: 'requirement_closed' };
    }

    if (input.outcome === 'EXPIRED' && DispatchConfig.expiryRequiresSeen && !input.seenAt) {
      return { counted: false, penalized: false, cooldownApplied: false, reason: 'offer_not_seen' };
    }

    const nearby = input.distanceKm !== null && input.distanceKm !== undefined && input.distanceKm <= DispatchConfig.nearbyKm;
    return {
      counted: true,
      penalized: nearby,
      cooldownApplied: false,
      reason: nearby ? 'nearby_skip' : 'far_skip',
    };
  }

  async recordOutcome(input: OfferOutcomeInput): Promise<OutcomeDecision> {
    const mode = DispatchConfig.penaltyMode;
    const decision = this.decide(input);
    if (mode === 'off' || !decision.counted) {
      return decision;
    }

    try {
      // Mark the offer as part of the rolling window (idempotent: only first marker wins).
      const marked = await this.db.offer.updateMany({
        where: { id: input.offerId, countsForAr: false },
        data: { countsForAr: true, respondedAt: new Date() },
      });
      if (marked.count === 0) {
        return { ...decision, counted: false, penalized: false, reason: 'already_counted' };
      }

      if (input.outcome === 'ACCEPTED') {
        await this.db.driver.update({
          where: { id: input.driverId },
          data: {
            acceptedOffers: { increment: 1 },
            consecutiveDeclines: 0,
            ...(mode === 'enforce' ? { trustScore: { increment: DispatchConfig.acceptReward } } : {}),
          },
        });
      } else {
        const applyPenalty = decision.penalized && mode === 'enforce';
        const updated = await this.db.driver.update({
          where: { id: input.driverId },
          data: {
            declinedOffers: { increment: 1 },
            ...(decision.penalized ? { consecutiveDeclines: { increment: 1 } } : {}),
            ...(applyPenalty ? { trustScore: { decrement: DispatchConfig.declinePenalty } } : {}),
          },
          select: { consecutiveDeclines: true, cooldownLevel: true, lastCooldownAt: true },
        });

        if (decision.penalized && updated.consecutiveDeclines >= DispatchConfig.consecutiveDeclineLimit) {
          if (mode === 'enforce') {
            decision.cooldownApplied = await this.applyCooldown(input.driverId, updated.cooldownLevel, updated.lastCooldownAt);
          } else {
            this.logger.log(`[shadow] Driver ${input.driverId} would enter cooldown (${updated.consecutiveDeclines} nearby skips)`);
            await this.db.driver.updateMany({
              where: { id: input.driverId, consecutiveDeclines: { gte: DispatchConfig.consecutiveDeclineLimit } },
              data: { consecutiveDeclines: 0 },
            });
          }
        }
      }

      await this.clampTrust(input.driverId);
      await this.refreshAcceptanceRate(input.driverId);

      if (mode === 'shadow' && decision.penalized) {
        this.logger.log(`[shadow] Driver ${input.driverId} would lose ${DispatchConfig.declinePenalty} trust for ${input.outcome} on offer ${input.offerId}`);
      }
    } catch (err: any) {
      this.logger.warn(`Behaviour accounting failed for offer ${input.offerId}: ${err.message}`);
    }

    return decision;
  }

  /** Recompute AR from the last N counted offers (DB is the source of truth). */
  async refreshAcceptanceRate(driverId: string): Promise<number> {
    const recent = await this.db.offer.findMany({
      where: { driverId, countsForAr: true },
      orderBy: { respondedAt: 'desc' },
      take: DispatchConfig.arWindow,
      select: { status: true },
    });
    const accepted = recent.filter((o) => o.status === OfferStatus.ACCEPTED).length;
    const rate = recent.length === 0 ? 100 : Number(((accepted / recent.length) * 100).toFixed(1));
    await this.db.driver.update({ where: { id: driverId }, data: { acceptanceRate: rate } });
    return rate;
  }

  private async clampTrust(driverId: string): Promise<void> {
    await this.db.driver.updateMany({ where: { id: driverId, trustScore: { gt: 100 } }, data: { trustScore: 100 } });
    await this.db.driver.updateMany({ where: { id: driverId, trustScore: { lt: 0 } }, data: { trustScore: 0 } });
  }

  private async applyCooldown(driverId: string, currentLevel: number, lastCooldownAt: Date | null): Promise<boolean> {
    const ladder = DispatchConfig.cooldownLadderMinutes;
    const repeatWithinDay = lastCooldownAt && Date.now() - new Date(lastCooldownAt).getTime() < 24 * 60 * 60 * 1000;
    const level = repeatWithinDay ? Math.min(currentLevel + 1, ladder.length - 1) : 0;
    const minutes = ladder[level];
    const now = new Date();
    const cooldownUntil = new Date(now.getTime() + minutes * 60 * 1000);

    // Conditional claim: only one concurrent outcome may convert the streak into a cooldown.
    const claimed = await this.db.driver.updateMany({
      where: { id: driverId, consecutiveDeclines: { gte: DispatchConfig.consecutiveDeclineLimit } },
      data: { consecutiveDeclines: 0, cooldownUntil, cooldownLevel: level, lastCooldownAt: now },
    });
    if (claimed.count === 0) return false;

    this.notifications?.emitEvent(`driver:${driverId}`, 'DRIVER_COOLDOWN', {
      cooldownMinutes: minutes,
      cooldownUntil: cooldownUntil.toISOString(),
      message: `You are paused from new offers for ${minutes} minutes after skipping ${DispatchConfig.consecutiveDeclineLimit} nearby matching trips in a row.`,
    });
    await this.audit?.log({
      actorRole: 'SYSTEM',
      action: 'DRIVER_COOLDOWN_APPLIED',
      entityType: 'DRIVER',
      entityId: driverId,
      metadata: { minutes, level },
    }).catch(() => undefined);
    this.logger.log(`Driver ${driverId} placed in ${minutes}m cooldown (level ${level})`);
    return true;
  }
}
