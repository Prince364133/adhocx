import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { toDateOnly } from '../replanning/cutoff-policy';

export interface RosterActor {
  id?: string;
  role?: string;
  corporateRole?: string | null;
}

export interface RosterApproveResult {
  rosterId: string;
  status: 'APPROVED';
  version: number;
  idempotent: boolean;
  approvedById: string | null;
  approvedAt: Date | null;
}

export interface RosterPublishResult {
  rosterId: string;
  status: 'PUBLISHED';
  version: number;
  idempotent: boolean;
  entries: number;
  requestsCreated: number;
  /** Lines whose request already existed (same idempotencyHash, e.g. from an earlier version). */
  duplicatesSkipped: number;
  /** Lines not turned into demand because their shift day is a holiday. */
  holidaySkipped: number;
}

const REQUEST_BATCH = 1000;

/**
 * Roster version lifecycle DRAFT -> APPROVED -> PUBLISHED (CP-ROS-02).
 * Every transition is a conditional update (`updateMany where status = from`), so concurrent
 * clicks / instances produce exactly one transition; the loser gets an idempotent result.
 * Publishing turns the version's CorporateRosterEntry lines into APPROVED transport requests with
 * `createMany(skipDuplicates)` on the unique idempotencyHash: re-publishing, or publishing a newer
 * version that repeats commutes, never duplicates demand. The autonomous planner picks the
 * APPROVED requests up from there.
 */
@Injectable()
export class RosterLifecycleService {
  private readonly logger = new Logger(RosterLifecycleService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async approve(rosterId: string, actor: RosterActor = {}, now: Date = new Date()): Promise<RosterApproveResult> {
    const claim = await this.db.corporateRoster.updateMany({
      where: { id: rosterId, status: 'DRAFT' },
      data: { status: 'APPROVED', approvedById: actor.id ?? null, approvedAt: now },
    });
    const roster: any = await this.db.corporateRoster.findUnique({
      where: { id: rosterId },
      select: { id: true, status: true, version: true, approvedById: true, approvedAt: true, tenantId: true },
    });
    if (!roster) throw new NotFoundException(`Corporate roster ${rosterId} not found`);
    if (claim.count === 0 && roster.status !== 'APPROVED') {
      throw new ConflictException(`Roster ${rosterId} is ${roster.status}; only a DRAFT roster can be approved`);
    }
    if (claim.count === 1) {
      await this.audit.log({
        action: 'CORPORATE_ROSTER_APPROVED',
        userId: actor.id,
        actorRole: actor.corporateRole ?? actor.role,
        entityId: rosterId,
        entityType: 'CORPORATE_ROSTER',
        metadata: { tenantId: roster.tenantId, version: roster.version },
      });
    }
    return {
      rosterId,
      status: 'APPROVED',
      version: roster.version,
      idempotent: claim.count === 0,
      approvedById: roster.approvedById ?? null,
      approvedAt: roster.approvedAt ?? null,
    };
  }

  async publish(rosterId: string, actor: RosterActor = {}, now: Date = new Date()): Promise<RosterPublishResult> {
    const result = await this.db.$transaction(async (tx: any) => {
      const claim = await tx.corporateRoster.updateMany({
        where: { id: rosterId, status: 'APPROVED' },
        data: { status: 'PUBLISHED', publishedById: actor.id ?? null, publishedAt: now },
      });
      const roster: any = await tx.corporateRoster.findUnique({
        where: { id: rosterId },
        select: { id: true, tenantId: true, status: true, version: true },
      });
      if (!roster) throw new NotFoundException(`Corporate roster ${rosterId} not found`);
      if (claim.count === 0) {
        if (roster.status === 'PUBLISHED') {
          return { roster, idempotent: true, entries: 0, created: 0, holidaySkipped: 0 };
        }
        throw new ConflictException(`Roster ${rosterId} is ${roster.status}; approve it before publishing`);
      }

      const entries: any[] = await tx.corporateRosterEntry.findMany({ where: { rosterId } });
      const holidays = await this.loadHolidays(tx, roster.tenantId, entries);
      const isHoliday = (e: any) => {
        const day = toDateOnly(e.shiftDate);
        return holidays.has(`*:${day}`) || holidays.has(`${e.officeId}:${day}`);
      };
      const lines = entries.filter((e) => !isHoliday(e));

      let created = 0;
      for (let i = 0; i < lines.length; i += REQUEST_BATCH) {
        const res = await tx.corporateTransportRequest.createMany({
          data: lines.slice(i, i + REQUEST_BATCH).map((e) => ({
            tenantId: e.tenantId,
            rosterId,
            employeeId: e.employeeId,
            scheduledDate: e.scheduledDate,
            shiftTime: e.shiftTime,
            direction: e.direction,
            pickupLat: e.pickupLat,
            pickupLng: e.pickupLng,
            dropoffLat: e.dropoffLat,
            dropoffLng: e.dropoffLng,
            h3PickupIndex: e.h3PickupIndex,
            status: 'APPROVED',
            idempotencyHash: e.idempotencyHash,
          })),
          skipDuplicates: true,
        });
        created += res.count;
      }
      return { roster, idempotent: false, entries: entries.length, created, holidaySkipped: entries.length - lines.length };
    });

    const out: RosterPublishResult = {
      rosterId,
      status: 'PUBLISHED',
      version: result.roster.version,
      idempotent: result.idempotent,
      entries: result.entries,
      requestsCreated: result.created,
      duplicatesSkipped: result.entries - result.holidaySkipped - result.created,
      holidaySkipped: result.holidaySkipped,
    };
    if (!result.idempotent) {
      await this.audit.log({
        action: 'CORPORATE_ROSTER_PUBLISHED',
        userId: actor.id,
        actorRole: actor.corporateRole ?? actor.role,
        entityId: rosterId,
        entityType: 'CORPORATE_ROSTER',
        metadata: { tenantId: result.roster.tenantId, ...out } as any,
      });
      this.logger.log(
        `Roster ${rosterId} v${out.version} published: ${out.requestsCreated} requests, ` +
          `${out.duplicatesSkipped} duplicates, ${out.holidaySkipped} holiday lines skipped`,
      );
    }
    return out;
  }

  /** Holiday keys `<officeId>:<day>` and `*:<day>` (tenant-wide) covering the entries' shift days. */
  private async loadHolidays(tx: any, tenantId: string, entries: any[]): Promise<Set<string>> {
    if (entries.length === 0) return new Set();
    const days = entries.map((e) => toDateOnly(e.shiftDate)).sort();
    const rows: any[] = await tx.corporateHoliday.findMany({
      where: {
        tenantId,
        holidayDate: {
          gte: new Date(`${days[0]}T00:00:00.000Z`),
          lte: new Date(`${days[days.length - 1]}T00:00:00.000Z`),
        },
      },
      select: { officeId: true, holidayDate: true },
    });
    return new Set(rows.map((h) => `${h.officeId ?? '*'}:${toDateOnly(h.holidayDate)}`));
  }
}
