import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UpdateFleetCodeStatusDto } from '@adhocx/contracts';
import { DatabaseService } from '../../../../database/database.service';
import { FleetRequestContext } from '../guards/fleet.decorators';

@Injectable()
export class FleetCodeService {
  constructor(private readonly db: DatabaseService) {}

  async getFleetCode(fleetId: string) {
    const fleet = await this.db.fleet.findUnique({
      where: { id: fleetId },
      select: {
        id: true,
        name: true,
        code: true,
        codeStatus: true,
        codeRotatedAt: true,
        status: true,
      },
    });
    if (!fleet) {
      throw new NotFoundException({
        errorCode: 'FLEET_NOT_FOUND',
        message: 'Fleet record not found.',
      });
    }
    return fleet;
  }

  private async generateUniqueCode(): Promise<string> {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let attempt = 0; attempt < 12; attempt++) {
      const bytes = randomBytes(6);
      let suffix = '';
      for (let i = 0; i < 6; i++) {
        suffix += chars.charAt(bytes[i] % chars.length);
      }
      const code = `FLT-${suffix}`;
      const exists = await this.db.fleet.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!exists) return code;
    }
    throw new Error('Unable to generate unique Fleet Code.');
  }

  async regenerateFleetCode(ctx: FleetRequestContext) {
    const newCode = await this.generateUniqueCode();
    const now = new Date();

    const updated = await this.db.fleet.update({
      where: { id: ctx.fleetId },
      data: {
        code: newCode,
        codeStatus: 'ACTIVE',
        codeRotatedAt: now,
      },
      select: {
        id: true,
        code: true,
        codeStatus: true,
        codeRotatedAt: true,
      },
    });

    await this.db.fleetNotification.create({
      data: {
        fleetId: ctx.fleetId,
        eventType: 'FLEET_CODE_CHANGED',
        title: 'Fleet Code Regenerated',
        message: `Fleet Code was regenerated to ${newCode} by ${ctx.fullName}. Existing fleet drivers remain associated.`,
        entityType: 'FLEET',
        entityId: ctx.fleetId,
        actionUrl: '/dashboard',
      },
    });

    return updated;
  }

  async updateCodeStatus(ctx: FleetRequestContext, dto: UpdateFleetCodeStatusDto) {
    const updated = await this.db.fleet.update({
      where: { id: ctx.fleetId },
      data: {
        codeStatus: dto.status,
      },
      select: {
        id: true,
        code: true,
        codeStatus: true,
        codeRotatedAt: true,
      },
    });

    await this.db.fleetNotification.create({
      data: {
        fleetId: ctx.fleetId,
        eventType: 'FLEET_CODE_CHANGED',
        title: `Fleet Code ${dto.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}`,
        message: `Fleet Code ${updated.code} was ${dto.status === 'ACTIVE' ? 'enabled' : 'disabled'} for new driver associations${dto.reason ? `: ${dto.reason}` : '.'}`,
        entityType: 'FLEET',
        entityId: ctx.fleetId,
        actionUrl: '/dashboard',
      },
    });

    return updated;
  }
}
