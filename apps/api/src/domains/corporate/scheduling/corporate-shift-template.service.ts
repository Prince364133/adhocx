import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';
import { isValidShiftDate, isValidShiftTime } from '../replanning/cutoff-policy';
import { isOvernightShift } from './shift-calendar';

export interface CreateShiftTemplateInput {
  officeId: string;
  name: string;
  loginTime: string;
  logoutTime: string;
  /** ISO weekdays 1 (Mon) .. 7 (Sun). Defaults to Mon-Fri. */
  weekdays?: number[];
  /** Derived from the times when omitted; must agree with them when given. */
  isOvernight?: boolean;
}

export interface CreateHolidayInput {
  /** Omitted => holiday for every office of the tenant. */
  officeId?: string | null;
  holidayDate: string;
  name: string;
}

/** Shift templates (CP-ROS-01) and holidays. Office-scoped callers only see / write their offices. */
@Injectable()
export class CorporateShiftTemplateService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async createShiftTemplate(tenantId: string, input: CreateShiftTemplateInput, actorUserId?: string, officeScope?: string[] | null) {
    const name = String(input?.name ?? '').trim();
    if (name.length < 1 || name.length > 64) throw new BadRequestException('name must be 1-64 characters');
    if (!isValidShiftTime(input?.loginTime) || !isValidShiftTime(input?.logoutTime)) {
      throw new BadRequestException('loginTime and logoutTime must be HH:mm');
    }
    if (input.loginTime === input.logoutTime) throw new BadRequestException('loginTime and logoutTime must differ');
    const weekdays = [...new Set(input.weekdays ?? [1, 2, 3, 4, 5])].sort();
    if (weekdays.length === 0 || weekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
      throw new BadRequestException('weekdays must be ISO weekdays 1 (Mon) .. 7 (Sun)');
    }
    const overnight = isOvernightShift(input.loginTime, input.logoutTime);
    if (input.isOvernight !== undefined && input.isOvernight !== overnight) {
      throw new BadRequestException(
        `isOvernight=${input.isOvernight} contradicts ${input.loginTime} -> ${input.logoutTime} (overnight iff logout <= login)`,
      );
    }
    await this.assertOffice(tenantId, input.officeId, officeScope);

    try {
      const template = await this.db.corporateShiftTemplate.create({
        data: {
          tenantId,
          officeId: input.officeId,
          name,
          loginTime: input.loginTime,
          logoutTime: input.logoutTime,
          weekdays,
          isOvernight: overnight,
        },
      });
      await this.audit.log({
        action: 'CORPORATE_SHIFT_TEMPLATE_CREATED',
        userId: actorUserId,
        entityId: template.id,
        entityType: 'CORPORATE_SHIFT_TEMPLATE',
        metadata: { tenantId, officeId: input.officeId, name, loginTime: input.loginTime, logoutTime: input.logoutTime, weekdays, overnight },
      });
      return template;
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException(`Shift template '${name}' already exists for this office`);
      throw err;
    }
  }

  async listShiftTemplates(tenantId: string, officeId?: string, officeScope?: string[] | null) {
    return this.db.corporateShiftTemplate.findMany({
      where: { tenantId, ...this.officeFilter(officeId, officeScope) },
      orderBy: [{ officeId: 'asc' }, { loginTime: 'asc' }],
    });
  }

  async createHoliday(tenantId: string, input: CreateHolidayInput, actorUserId?: string, officeScope?: string[] | null) {
    if (!isValidShiftDate(input?.holidayDate)) throw new BadRequestException('holidayDate must be YYYY-MM-DD');
    const name = String(input?.name ?? '').trim();
    if (name.length < 2) throw new BadRequestException('name must be at least 2 characters');
    const officeId = input.officeId || null;
    if (officeId) {
      await this.assertOffice(tenantId, officeId, officeScope);
    } else if (officeScope) {
      throw new ForbiddenException('Office-scoped users can only create holidays for their own offices');
    }
    try {
      const holiday = await this.db.corporateHoliday.create({
        data: { tenantId, officeId, holidayDate: new Date(`${input.holidayDate}T00:00:00.000Z`), name },
      });
      await this.audit.log({
        action: 'CORPORATE_HOLIDAY_CREATED',
        userId: actorUserId,
        entityId: holiday.id,
        entityType: 'CORPORATE_HOLIDAY',
        metadata: { tenantId, officeId, holidayDate: input.holidayDate, name },
      });
      return holiday;
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException(`A holiday already exists on ${input.holidayDate}`);
      throw err;
    }
  }

  async listHolidays(tenantId: string, from?: string, to?: string, officeScope?: string[] | null) {
    if ((from && !isValidShiftDate(from)) || (to && !isValidShiftDate(to))) {
      throw new BadRequestException('from / to must be YYYY-MM-DD');
    }
    return this.db.corporateHoliday.findMany({
      where: {
        tenantId,
        ...(officeScope ? { OR: [{ officeId: null }, { officeId: { in: officeScope } }] } : {}),
        ...(from || to
          ? {
              holidayDate: {
                ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}),
              },
            }
          : {}),
      },
      orderBy: { holidayDate: 'asc' },
    });
  }

  private officeFilter(officeId?: string, officeScope?: string[] | null): Record<string, unknown> {
    if (officeId) {
      if (officeScope && !officeScope.includes(officeId)) {
        throw new ForbiddenException('Office is outside your corporate office scope');
      }
      return { officeId };
    }
    return officeScope ? { officeId: { in: officeScope } } : {};
  }

  private async assertOffice(tenantId: string, officeId: string, officeScope?: string[] | null): Promise<void> {
    if (!officeId) throw new BadRequestException('officeId is required');
    if (officeScope && !officeScope.includes(officeId)) {
      throw new ForbiddenException('Office is outside your corporate office scope');
    }
    const office = await this.db.corporateOffice.findFirst({ where: { id: officeId, tenantId }, select: { id: true } });
    if (!office) throw new NotFoundException(`Office ${officeId} not found for tenant ${tenantId}`);
  }
}
