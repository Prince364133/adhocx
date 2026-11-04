import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';

export type OrgUnitKind = 'department' | 'costCenter';

export interface CreateOrgUnitInput {
  code: string;
  name: string;
}

const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{0,31}$/;

const KIND = {
  department: {
    delegate: 'corporateDepartment',
    employeeFk: 'departmentId',
    employeeText: 'department',
    audit: 'CORPORATE_DEPARTMENT_CREATED',
    entity: 'CORPORATE_DEPARTMENT',
  },
  costCenter: {
    delegate: 'corporateCostCenter',
    employeeFk: 'costCenterId',
    employeeText: 'costCenter',
    audit: 'CORPORATE_COST_CENTER_CREATED',
    entity: 'CORPORATE_COST_CENTER',
  },
} as const;

/**
 * Tenant-scoped departments and cost centers (code unique per tenant). Employees keep their
 * free-text `department` / `costCenter` columns (what the roster upload writes); creating a unit
 * links the employees whose text equals its code or name through the optional FK.
 */
@Injectable()
export class CorporateOrgStructureService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async create(kind: OrgUnitKind, tenantId: string, input: CreateOrgUnitInput, actorUserId?: string) {
    const k = KIND[kind];
    const code = String(input?.code ?? '').trim().toUpperCase();
    const name = String(input?.name ?? '').trim();
    if (!CODE_RE.test(code)) {
      throw new BadRequestException('code must be 1-32 characters: A-Z, 0-9, "_" or "-"');
    }
    if (name.length < 2) throw new BadRequestException('name must be at least 2 characters');

    const tenant = await this.db.corporateTenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) throw new NotFoundException(`Corporate tenant ${tenantId} not found`);

    let unit: any;
    try {
      unit = await (this.db as any)[k.delegate].create({ data: { tenantId, code, name } });
    } catch (err: any) {
      if (err?.code === 'P2002') throw new ConflictException(`${kind} code '${code}' already exists for this tenant`);
      throw err;
    }

    const linked = await this.db.corporateEmployee.updateMany({
      where: {
        tenantId,
        [k.employeeFk]: null,
        OR: [
          { [k.employeeText]: { equals: code, mode: 'insensitive' } },
          { [k.employeeText]: { equals: name, mode: 'insensitive' } },
        ],
      } as any,
      data: { [k.employeeFk]: unit.id } as any,
    });

    await this.audit.log({
      action: k.audit,
      userId: actorUserId,
      entityId: unit.id,
      entityType: k.entity,
      metadata: { tenantId, code, name, linkedEmployees: linked.count },
    });
    return { ...unit, linkedEmployees: linked.count };
  }

  async list(kind: OrgUnitKind, tenantId: string) {
    return (this.db as any)[KIND[kind].delegate].findMany({
      where: { tenantId },
      orderBy: { code: 'asc' },
      include: { _count: { select: { employees: true } } },
    });
  }
}
