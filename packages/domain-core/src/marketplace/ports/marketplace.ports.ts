import { RequirementAggregate } from '../aggregates/requirement.aggregate';
import { BidAggregate } from '../aggregates/bid.aggregate';

export interface IRequirementRepository {
  findById(id: string): Promise<RequirementAggregate | null>;
  save(requirement: RequirementAggregate): Promise<void>;
  findOpenForBidding(limit?: number): Promise<RequirementAggregate[]>;
  findPendingDirectDispatch(limit?: number): Promise<RequirementAggregate[]>;
}

export interface IBidRepository {
  findById(id: string): Promise<BidAggregate | null>;
  findByRequirementId(requirementId: string): Promise<BidAggregate[]>;
  save(bid: BidAggregate): Promise<void>;
  rejectAllExcept(requirementId: string, winningBidId: string): Promise<void>;
}

