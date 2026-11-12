import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';

export type OrgUnitKind = 'department' | 'costCenter';

export interface CreateOrgUnitInput {
  code: string;
  name: string;
  departmentHead?: string;
  officeId?: string;
  description?: string;
  isActive?: boolean;
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

  async create(
    kind: OrgUnitKind,
    tenantId: string,
    input: CreateOrgUnitInput,
    actorUserId?: string,
  ) {
    const k = KIND[kind];
    const code = String(input?.code ?? '').trim().toUpperCase();
    const name = String(input?.name ?? '').trim();
    if (!CODE_RE.test(code)) {
      throw new BadRequestException('code must be 1-32 characters: A-Z, 0-9, "_" or "-"');
    }
    if (name.length < 2) throw new BadRequestException('name must be at least 2 characters');

    const tenant = await this.db.corporateTenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) throw new NotFoundException(`Corporate tenant ${tenantId} not found`);

    if (kind === 'department' && input.officeId) {
      const office = await this.db.corporateOffice.findFirst({
        where: { id: input.officeId, tenantId, isActive: true },
        select: { id: true },
      });
      if (!office) throw new BadRequestException('Department office must be active and belong to this tenant');
    }

    let unit: any;
    try {
      unit = await (this.db as any)[k.delegate].create({
        data: {
          tenantId,
          code,
          name,
          isActive: input.isActive ?? true,
          ...(kind === 'department'
            ? {
                departmentHead: input.departmentHead?.trim() || null,
                officeId: input.officeId || null,
                description: input.description?.trim() || null,
              }
            : {}),
        },
      });
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

  async list(kind: OrgUnitKind, tenantId: string, includeInactive = false, officeScope?: string[] | null) {
    return (this.db as any)[KIND[kind].delegate].findMany({
      where: {
        tenantId,
        ...(!includeInactive ? { isActive: true } : {}),
        ...(kind === 'department' && officeScope
          ? { OR: [{ officeId: null }, { officeId: { in: officeScope } }] }
          : {}),
      },
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { employees: true } },
        ...(kind === 'department' ? { office: { select: { id: true, code: true, name: true } } } : {}),
      },
    });
  }

  async updateDepartment(
    tenantId: string,
    departmentId: string,
    input: Partial<CreateOrgUnitInput>,
    actorUserId?: string,
    officeScope?: string[] | null,
  ) {
    const existing = await this.db.corporateDepartment.findFirst({
      where: { id: departmentId, tenantId },
      include: { _count: { select: { employees: true } } },
    });
    if (!existing) throw new NotFoundException(`Department ${departmentId} not found in tenant ${tenantId}`);
    if (officeScope && existing.officeId && !officeScope.includes(existing.officeId)) {
      throw new ForbiddenException('Department office is outside your corporate office scope');
    }

    if (input.officeId !== undefined && input.officeId !== null && input.officeId !== '') {
      const office = await this.db.corporateOffice.findFirst({
        where: { id: input.officeId, tenantId, isActive: true },
        select: { id: true },
      });
      if (!office) throw new BadRequestException('Department office must be active and belong to this tenant');
    }
    if (input.isActive === false && existing.isActive && existing._count.employees > 0) {
      throw new BadRequestException('Reassign employees from this department before deactivating it');
    }

    const code = input.code?.trim().toUpperCase();
    if (code && !CODE_RE.test(code)) {
      throw new BadRequestException('code must be 1-32 characters: A-Z, 0-9, "_" or "-"');
    }
    const name = input.name?.trim();
    if (name !== undefined && name.length < 2) throw new BadRequestException('name must be at least 2 characters');

    let updated: any;
    try {
      updated = await this.db.corporateDepartment.update({
        where: { id: departmentId },
        data: {
          ...(code !== undefined ? { code } : {}),
          ...(name !== undefined ? { name } : {}),
          ...(input.departmentHead !== undefined ? { departmentHead: input.departmentHead.trim() || null } : {}),
          ...(input.officeId !== undefined ? { officeId: input.officeId || null } : {}),
          ...(input.description !== undefined ? { description: input.description.trim() || null } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException(`Department code '${code}' already exists for this tenant`);
      }
      throw err;
    }

    await this.audit.log({
      action: input.isActive === false ? 'CORPORATE_DEPARTMENT_DEACTIVATED' : 'CORPORATE_DEPARTMENT_UPDATED',
      userId: actorUserId,
      entityId: departmentId,
      entityType: 'CORPORATE_DEPARTMENT',
      metadata: { tenantId, updates: input },
    });
    return updated;
  }
}
