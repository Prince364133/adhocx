import { RequirementAggregate } from '../aggregates/requirement.aggregate';

export interface IRequirementRepository {
  findById(id: string): Promise<RequirementAggregate | null>;
  save(requirement: RequirementAggregate): Promise<void>;
  findPendingDirectDispatch(limit?: number): Promise<RequirementAggregate[]>;
}
