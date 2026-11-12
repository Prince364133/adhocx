import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCorporateTransportZoneDto, UpdateCorporateTransportZoneDto } from '@adhocx/contracts';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';

const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{0,31}$/;

@Injectable()
export class CorporateTransportZoneService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(tenantId: string, includeInactive = false, officeScope?: string[] | null) {
    return this.db.corporateTransportZone.findMany({
      where: {
        tenantId,
        ...(!includeInactive ? { isActive: true } : {}),
        ...(officeScope ? { officeId: { in: officeScope } } : {}),
      },
      include: { office: { select: { id: true, code: true, name: true, isActive: true } } },
      orderBy: [{ office: { name: 'asc' } }, { code: 'asc' }],
    });
  }

  async create(tenantId: string, input: CreateCorporateTransportZoneDto, actorUserId?: string) {
    const data = await this.validateInput(tenantId, input);
    try {
      const zone = await this.db.corporateTransportZone.create({
        data: { tenantId, ...data, isActive: input.isActive ?? true },
      });
      await this.audit.log({
        action: 'CORPORATE_TRANSPORT_ZONE_CREATED',
        userId: actorUserId,
        entityId: zone.id,
        entityType: 'CORPORATE_TRANSPORT_ZONE',
        metadata: { tenantId, officeId: zone.officeId, code: zone.code },
      });
      return zone;
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException(`Transport zone code '${input.code}' already exists for this tenant`);
      }
      throw error;
    }
  }

  async update(
    tenantId: string,
    zoneId: string,
    input: UpdateCorporateTransportZoneDto,
    actorUserId?: string,
    officeScope?: string[] | null,
  ) {
    const existing = await this.db.corporateTransportZone.findFirst({ where: { id: zoneId, tenantId } });
    if (!existing) throw new NotFoundException(`Transport zone ${zoneId} not found in tenant ${tenantId}`);
    if (officeScope && !officeScope.includes(existing.officeId)) {
      throw new ForbiddenException('Transport zone office is outside your corporate office scope');
    }

    const data = await this.validateInput(tenantId, input, existing);
    try {
      const zone = await this.db.corporateTransportZone.update({
        where: { id: zoneId },
        data: {
          ...data,
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });
      await this.audit.log({
        action: input.isActive === false ? 'CORPORATE_TRANSPORT_ZONE_DEACTIVATED' : 'CORPORATE_TRANSPORT_ZONE_UPDATED',
        userId: actorUserId,
        entityId: zone.id,
        entityType: 'CORPORATE_TRANSPORT_ZONE',
        metadata: { tenantId, updates: input },
      });
      return zone;
    } catch (error: unknown) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException(`Transport zone code '${input.code}' already exists for this tenant`);
      }
      throw error;
    }
  }

  private async validateInput(
    tenantId: string,
    input: Partial<CreateCorporateTransportZoneDto>,
    existing?: {
      officeId: string;
      code: string;
      name: string;
      serviceArea: string;
      description: string | null;
      pickupLocations: unknown;
      dropLocations: unknown;
    },
  ) {
    const officeId = input.officeId ?? existing?.officeId;
    if (!officeId) throw new BadRequestException('officeId is required');
    const allowInactiveOffice = Boolean(existing && (input.officeId === undefined || input.officeId === existing.officeId));
    const office = await this.db.corporateOffice.findFirst({
      where: { id: officeId, tenantId, ...(!allowInactiveOffice ? { isActive: true } : {}) },
      select: { id: true },
    });
    if (!office) throw new BadRequestException('Transport zone office must belong to this tenant and be active when assigning a new office');

    const code = input.code?.trim().toUpperCase() ?? existing?.code;
    if (!code || !CODE_RE.test(code)) {
      throw new BadRequestException('code must be 1-32 characters: A-Z, 0-9, "_" or "-"');
    }
    const name = input.name?.trim() ?? existing?.name;
    if (!name || name.length < 2) throw new BadRequestException('name must be at least 2 characters');
    const serviceArea = input.serviceArea?.trim() ?? existing?.serviceArea;
    if (!serviceArea) throw new BadRequestException('serviceArea is required');

    const asLocationList = (value: string[] | undefined, previous: unknown): string[] => {
      if (value === undefined) return Array.isArray(previous) ? previous.filter((item): item is string => typeof item === 'string') : [];
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw new BadRequestException('Pickup and drop locations must be lists of text addresses');
      }
      return value.map((item) => item.trim()).filter(Boolean);
    };

    return {
      officeId,
      code,
      name,
      description: input.description !== undefined ? input.description.trim() || null : existing?.description,
      serviceArea,
      pickupLocations: asLocationList(input.pickupLocations, existing?.pickupLocations),
      dropLocations: asLocationList(input.dropLocations, existing?.dropLocations),
    };
  }
}
