import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { IRequirementRepository } from '@adhocx/domain-core';
import { PrismaRequirementRepository } from '../../infrastructure/repositories/prisma-requirement.repository';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { AuditService } from '../../modules/audit/audit.service';
import { DatabaseService } from '../../database/database.service';

export interface AcceptBidCommand {
  requirementId: string;
  bidId: string;
  requesterId: string;
}

@Injectable()
export class AcceptBidUseCase {
  constructor(
    @Inject(PrismaRequirementRepository)
    private readonly requirementRepo: IRequirementRepository,
    private readonly db: DatabaseService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  public async execute(command: AcceptBidCommand): Promise<{ success: boolean; requirementId: string; bidId: string }> {
    const requirement = await this.requirementRepo.findById(command.requirementId);
    if (!requirement) {
      throw new NotFoundException(`Requirement ${command.requirementId} not found`);
    }

    if (requirement.requesterId !== command.requesterId) {
      throw new BadRequestException('Only the requirement creator can accept bids');
    }

    const rawBid = await this.db.bid.findUnique({
      where: { id: command.bidId },
    });
    if (!rawBid || rawBid.requirementId !== command.requirementId) {
      throw new NotFoundException(`Bid ${command.bidId} not found for requirement ${command.requirementId}`);
    }

    if (rawBid.status !== 'PENDING') {
      throw new BadRequestException(`Cannot accept bid with status ${rawBid.status}`);
    }

    // Atomic persistence in database transaction
    await this.db.$transaction(async (tx) => {
      // 1. Mark accepted bid
      await tx.bid.update({
        where: { id: command.bidId },
        data: { status: 'ACCEPTED' },
      });

      // 2. Reject all other bids
      await tx.bid.updateMany({
        where: {
          requirementId: command.requirementId,
          id: { not: command.bidId },
          status: 'PENDING',
        },
        data: { status: 'REJECTED' },
      });

      // 3. Update requirement status
      await tx.requirement.update({
        where: { id: command.requirementId },
        data: {
          status: 'FULFILLED',
          totalAmount: rawBid.bidAmount,
        },
      });
    });

    await this.audit.log({
      action: 'BID_ACCEPTED',
      entityId: command.requirementId,
      entityType: 'Requirement',
      userId: command.requesterId,
      actorRole: 'VENDOR',
    });

    this.notifications.emitEvent(`driver:${rawBid.driverId}`, 'BID_WON', {
      requirementId: command.requirementId,
      bidId: command.bidId,
      fare: Number(rawBid.bidAmount),
    });

    return {
      success: true,
      requirementId: command.requirementId,
      bidId: command.bidId,
    };
  }
}
