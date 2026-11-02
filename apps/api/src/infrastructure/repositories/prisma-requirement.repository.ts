import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { IRequirementRepository, RequirementAggregate } from '@adhocx/domain-core';
import { PrismaRequirementMapper } from '../mappers/prisma-requirement.mapper';

@Injectable()
export class PrismaRequirementRepository implements IRequirementRepository {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string): Promise<RequirementAggregate | null> {
    const raw = await this.db.requirement.findUnique({
      where: { id },
    });
    return raw ? PrismaRequirementMapper.toDomain(raw) : null;
  }

  async save(requirement: RequirementAggregate): Promise<void> {
    const data = PrismaRequirementMapper.toPersistence(requirement);
    await this.db.requirement.update({
      where: { id: requirement.id },
      data: {
        status: data.status,
        totalAmount: data.totalAmount,
      },
    });
  }

  async findPendingDirectDispatch(limit: number = 50): Promise<RequirementAggregate[]> {
    const raws = await this.db.requirement.findMany({
      where: {
        status: 'POSTED',
        fulfillmentMode: 'DIRECT_DISPATCH',
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return raws.map((r) => PrismaRequirementMapper.toDomain(r));
  }
}
