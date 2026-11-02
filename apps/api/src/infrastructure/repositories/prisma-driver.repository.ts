import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { IDriverRepository, DriverAggregate } from '@adhocx/domain-core';
import { PrismaDriverMapper } from '../mappers/prisma-driver.mapper';

@Injectable()
export class PrismaDriverRepository implements IDriverRepository {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string): Promise<DriverAggregate | null> {
    const raw = await this.db.driver.findUnique({
      where: { id },
    });
    return raw ? PrismaDriverMapper.toDomain(raw) : null;
  }

  async findByUserId(userId: string): Promise<DriverAggregate | null> {
    const raw = await this.db.driver.findUnique({
      where: { userId },
    });
    return raw ? PrismaDriverMapper.toDomain(raw) : null;
  }

  async save(driver: DriverAggregate): Promise<void> {
    const data = PrismaDriverMapper.toPersistence(driver);
    await this.db.driver.update({
      where: { id: driver.id },
      data: {
        verificationStatus: data.verificationStatus,
        availabilityStatus: data.availabilityStatus,
        currentLat: data.currentLat,
        currentLng: data.currentLng,
        trustScore: data.trustScore,
        rejectionReason: data.rejectionReason,
      },
    });
  }

  async findOnlineDriversInH3Cells(_h3Cells: string[]): Promise<DriverAggregate[]> {
    // In production, spatial filtering by H3 or PostGIS bounding polygon
    const raws = await this.db.driver.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
      },
      take: 100,
    });
    return raws.map((r) => PrismaDriverMapper.toDomain(r));
  }
}
