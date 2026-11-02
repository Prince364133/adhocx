import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { IRequirementRepository, IDriverRepository, H3Index } from '@adhocx/domain-core';
import { AuditService } from '../../modules/audit/audit.service';

export interface DispatchRequirementCommand {
  requirementId: string;
  requestedByUserId: string;
}

export interface DispatchRequirementResult {
  requirementId: string;
  dispatched: boolean;
  status: string;
  eligibleDriverCount: number;
  candidateDriverIds: string[];
}

@Injectable()
export class DispatchRequirementUseCase {
  constructor(
    @Inject('IRequirementRepository') private readonly requirementRepo: IRequirementRepository,
    @Inject('IDriverRepository') private readonly driverRepo: IDriverRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(command: DispatchRequirementCommand): Promise<DispatchRequirementResult> {
    const requirement = await this.requirementRepo.findById(command.requirementId);
    if (!requirement) {
      throw new NotFoundException(`Requirement '${command.requirementId}' not found`);
    }

    // Must be in DIRECT_DISPATCH pricing mode
    if (requirement.pricingMode !== 'DIRECT_DISPATCH') {
      throw new BadRequestException(
        `Cannot run direct dispatch on requirement with pricingMode '${requirement.pricingMode}'. Must be DIRECT_DISPATCH.`,
      );
    }

    // Transition to DIRECT_DISPATCH state if DRAFT or retrying
    if (requirement.status === 'DRAFT' || requirement.status === 'NO_DRIVER_AVAILABLE') {
      const startRes = requirement.startDirectDispatch();
      if (startRes.isFailure) {
        throw new BadRequestException(startRes.error);
      }
    } else if (requirement.status !== 'DIRECT_DISPATCH') {
      throw new BadRequestException(
        `Cannot dispatch requirement in status '${requirement.status}'. Must be DRAFT or DIRECT_DISPATCH.`,
      );
    }

    // 1. Calculate H3 index for pickup location (res 8, ~460m hex edge)
    const h3Res = H3Index.fromGeoPoint(requirement.pickupLocation, 8);
    if (h3Res.isFailure) {
      throw new BadRequestException(h3Res.error);
    }
    const h3Index = h3Res.getValue();

    // 2. Primary 5 km spatial ring search
    const primaryCells = h3Index.get5KmDispatchRing();
    let candidates = await this.driverRepo.findOnlineDriversInH3Cells(primaryCells);
    let eligible = candidates.filter((d) => d.canAcceptOffers());

    // 3. Fallback to 10 km ring if no candidates found in primary ring
    if (eligible.length === 0) {
      const fallbackCells = h3Index.get10KmDispatchRing();
      candidates = await this.driverRepo.findOnlineDriversInH3Cells(fallbackCells);
      eligible = candidates.filter((d) => d.canAcceptOffers());
    }

    // 4. Handle 0 eligible drivers
    if (eligible.length === 0) {
      requirement.markNoDriverAvailable();
      await this.requirementRepo.save(requirement);

      await this.audit.log({
        userId: command.requestedByUserId,
        action: 'REQUIREMENT_DISPATCH_NO_DRIVERS',
        entityType: 'REQUIREMENT',
        entityId: requirement.id,
        metadata: {
          searchRings: ['5km', '10km'],
          foundCandidates: 0,
        },
      });

      return {
        requirementId: requirement.id,
        dispatched: false,
        status: requirement.status,
        eligibleDriverCount: 0,
        candidateDriverIds: [],
      };
    }

    // 5. Eligible candidates found: persist requirement
    await this.requirementRepo.save(requirement);

    const candidateIds = eligible.map((d) => d.id);

    await this.audit.log({
      userId: command.requestedByUserId,
      action: 'REQUIREMENT_DISPATCH_BROADCAST',
      entityType: 'REQUIREMENT',
      entityId: requirement.id,
      metadata: {
        candidateCount: candidateIds.length,
        candidateIds,
      },
    });

    return {
      requirementId: requirement.id,
      dispatched: true,
      status: requirement.status,
      eligibleDriverCount: candidateIds.length,
      candidateDriverIds: candidateIds,
    };
  }
}

