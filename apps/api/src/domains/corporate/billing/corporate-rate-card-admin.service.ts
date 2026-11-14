import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AuditService } from '../../../modules/audit/audit.service';
import {
  CreateCorporateRateCardDto,
  CreateDriverRateCardDto,
  RetireRateCardDto,
  normalizeCategory,
  parseInstant,
  parsePaise,
  serializeMoney,
} from './corporate-billing-wire.types';
import { selectCardAt } from './corporate-fare-math';
import { RateCardService } from './rate-card.service';

/** Driver cards price live dispatch offers, so they can never start or end in the past. */
const DRIVER_CARD_CLOCK_SKEW_MS = 60_000;

/**
 * Versioned rate-card administration (create new version / list / retire).
 *
 * Rules
 * - There is no edit. A change is a new version; it closes the previous version's effectiveTo at
 *   the new version's effectiveFrom. That close (and retire) only ever shortens a window and is
 *   refused when it would change the price of anything already priced by that version:
 *   corporate cards -> any invoice line priced by the version with a trip at/after the cut;
 *   driver cards -> any cut in the past (dispatch prices offers from the live card).
 * - Retire sets effectiveTo (+ isActive=false, retiredAt), so history keeps its price.
 * - Corporate cards are tenant-owned and visible to that tenant; driver cards are internal.
 */
@Injectable()
export class CorporateRateCardAdminService {
  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    /** Effective-dated lookups and version listings (shared with billing and dispatch). */
    private readonly rateCards: RateCardService,
  ) {}

  // ---------------------------------------------------------------------------
  // Corporate (client) cards
  // ---------------------------------------------------------------------------

  public async createCorporateCard(dto: CreateCorporateRateCardDto, actorUserId?: string) {
    if (!dto?.tenantId) throw new BadRequestException('tenantId is required');
    const tenant = await this.db.corporateTenant.findUnique({ where: { id: dto.tenantId }, select: { id: true } });
    if (!tenant) throw new NotFoundException(`Corporate tenant ${dto.tenantId} not found`);

    const vehicleCategory = await this.normalizeActiveCategory(dto.vehicleCategory);
    const effectiveFrom = parseInstant(dto.effectiveFrom, 'effectiveFrom');
    const terms = {
      baseFarePaise: parsePaise(dto.baseFarePaise, 'baseFarePaise', { required: true })!,
      baseDistanceMeters: this.parseMeters(dto.baseDistanceMeters),
      perKmPaise: parsePaise(dto.perKmPaise, 'perKmPaise', { required: true })!,
      perExtraStopPaise: parsePaise(dto.perExtraStopPaise, 'perExtraStopPaise') ?? 0n,
      perHourPaise: parsePaise(dto.perHourPaise, 'perHourPaise') ?? null,
      minimumPaise: parsePaise(dto.minimumPaise, 'minimumPaise') ?? 0n,
      noShowPaise: parsePaise(dto.noShowPaise, 'noShowPaise') ?? 0n,
      cancellationPaise: parsePaise(dto.cancellationPaise, 'cancellationPaise') ?? 0n,
    };

    const created = await this.db.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`corporate-rate-card:${dto.tenantId}:${vehicleCategory}`}::text))`;
      const latest = await tx.corporateRateCard.findFirst({
        where: { tenantId: dto.tenantId, vehicleCategory },
        orderBy: { version: 'desc' },
      });
      await this.closePrevious(tx, 'corporate', latest, effectiveFrom);
      return tx.corporateRateCard.create({
        data: {
          tenantId: dto.tenantId,
          vehicleCategory,
          ...terms,
          effectiveFrom,
          effectiveTo: null,
          isActive: true,
          version: (latest?.version ?? 0) + 1,
          createdByUserId: actorUserId ?? null,
        },
      });
    });

    await this.audit.log({
      action: 'CORPORATE_RATE_CARD_VERSION_CREATED',
      userId: actorUserId,
      actorRole: 'ADMIN',
      entityId: created.id,
      entityType: 'CORPORATE_RATE_CARD',
      metadata: { tenantId: dto.tenantId, vehicleCategory, version: created.version, effectiveFrom: effectiveFrom.toISOString() },
    });
    return this.toCorporateView(created);
  }

  public async listCorporateCards(
    tenantId: string | undefined,
    query: { vehicleCategory?: string; at?: string; includeRetired?: string | boolean } = {},
  ) {
    const rows: any[] = await this.rateCards.listClientRateCards({
      tenantId,
      vehicleCategory: query.vehicleCategory ? normalizeCategory(query.vehicleCategory) : undefined,
    });
    const at = query.at ? parseInstant(query.at, 'at') : new Date();
    const includeRetired = query.includeRetired === true || query.includeRetired === 'true';
    // The version in effect per (tenant, category), using the same selection rule as invoicing.
    const inEffectIds = new Set<string>();
    const groups = new Map<string, any[]>();
    for (const r of rows) {
      const k = `${r.tenantId}|${String(r.vehicleCategory).toUpperCase()}`;
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    for (const [k, list] of groups) {
      const hit = RateCardService.selectClientCard(list, k.split('|')[1], at);
      if (hit) inEffectIds.add(hit.id);
    }
    return rows
      .filter((r) => includeRetired || !r.retiredAt)
      .sort((x, y) => String(x.tenantId).localeCompare(String(y.tenantId)) ||
        String(x.vehicleCategory).localeCompare(String(y.vehicleCategory)) || (y.version ?? 0) - (x.version ?? 0))
      .map((r) => ({ ...this.toCorporateView(r), inEffect: inEffectIds.has(r.id) }));
  }

  public async retireCorporateCard(id: string, dto: RetireRateCardDto = {}, actorUserId?: string) {
    const card = await this.db.corporateRateCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException(`Corporate rate card ${id} not found`);
    const retired = await this.retire('corporate', card, dto, actorUserId);
    return this.toCorporateView(retired);
  }

  // ---------------------------------------------------------------------------
  // Driver cards (internal; never visible to corporate roles)
  // ---------------------------------------------------------------------------

  public async createDriverCard(dto: CreateDriverRateCardDto, actorUserId?: string) {
    const vehicleCategory = await this.normalizeActiveCategory(dto?.vehicleCategory);
    const effectiveFrom = parseInstant(dto?.effectiveFrom, 'effectiveFrom');
    if (effectiveFrom.getTime() < Date.now() - DRIVER_CARD_CLOCK_SKEW_MS) {
      throw new BadRequestException('A driver rate card version cannot start in the past (live offers are priced from it)');
    }
    const terms = {
      basePayoutPaise: parsePaise(dto.basePayoutPaise, 'basePayoutPaise', { required: true })!,
      baseDistanceMeters: this.parseMeters(dto.baseDistanceMeters),
      perKmPaise: parsePaise(dto.perKmPaise, 'perKmPaise', { required: true })!,
      tollReimbursementPaise: parsePaise(dto.tollReimbursementPaise, 'tollReimbursementPaise') ?? 0n,
      perHourPaise: parsePaise(dto.perHourPaise, 'perHourPaise') ?? null,
      minimumPaise: parsePaise(dto.minimumPaise, 'minimumPaise') ?? 0n,
      noShowPaise: parsePaise(dto.noShowPaise, 'noShowPaise') ?? 0n,
      cancellationPaise: parsePaise(dto.cancellationPaise, 'cancellationPaise') ?? 0n,
    };

    const created = await this.db.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`corporate-driver-rate-card:${vehicleCategory}`}::text))`;
      const latest = await tx.corporateDriverRateCard.findFirst({
        where: { vehicleCategory },
        orderBy: { version: 'desc' },
      });
      await this.closePrevious(tx, 'driver', latest, effectiveFrom);
      return tx.corporateDriverRateCard.create({
        data: {
          vehicleCategory,
          ...terms,
          effectiveFrom,
          effectiveTo: null,
          isActive: true,
          version: (latest?.version ?? 0) + 1,
          createdByUserId: actorUserId ?? null,
        },
      });
    });

    await this.audit.log({
      action: 'CORPORATE_DRIVER_RATE_CARD_VERSION_CREATED',
      userId: actorUserId,
      actorRole: 'ADMIN',
      entityId: created.id,
      entityType: 'CORPORATE_DRIVER_RATE_CARD',
      metadata: { vehicleCategory, version: created.version, effectiveFrom: effectiveFrom.toISOString() },
    });
    return serializeMoney(created);
  }

  public async listDriverCards(query: { vehicleCategory?: string; at?: string; includeRetired?: string | boolean } = {}) {
    const category = query.vehicleCategory ? normalizeCategory(query.vehicleCategory) : undefined;
    const rows: any[] = await this.rateCards.listDriverRateCards({ vehicleCategory: category });
    const at = query.at ? parseInstant(query.at, 'at') : new Date();
    const includeRetired = query.includeRetired === true || query.includeRetired === 'true';
    // In effect = what RateCardService.findDriverRateCard (dispatch offer pricing) would pick.
    const inEffectIds = new Set<string>();
    for (const cat of new Set(rows.map((r) => String(r.vehicleCategory).toUpperCase()))) {
      const hit = selectCardAt(rows.filter((r) => r.isActive !== false), cat, at);
      if (hit) inEffectIds.add(hit.id);
    }
    return rows
      .filter((r) => includeRetired || !r.retiredAt)
      .sort((x, y) => String(x.vehicleCategory).localeCompare(String(y.vehicleCategory)) || (y.version ?? 0) - (x.version ?? 0))
      .map((r) => ({ ...serializeMoney(r), inEffect: inEffectIds.has(r.id) }));
  }

  public async retireDriverCard(id: string, dto: RetireRateCardDto = {}, actorUserId?: string) {
    const card = await this.db.corporateDriverRateCard.findUnique({ where: { id } });
    if (!card) throw new NotFoundException(`Driver rate card ${id} not found`);
    return serializeMoney(await this.retire('driver', card, dto, actorUserId));
  }

  // ---------------------------------------------------------------------------
  // Shared rules
  // ---------------------------------------------------------------------------

  /** Close the latest version at `cut` (the new version's effectiveFrom), if it is still open there. */
  private async closePrevious(tx: any, kind: 'corporate' | 'driver', latest: any | null, cut: Date): Promise<void> {
    if (!latest) return;
    if (cut.getTime() <= new Date(latest.effectiveFrom).getTime()) {
      throw new ConflictException(
        `effectiveFrom must be after version ${latest.version}'s effectiveFrom (${new Date(latest.effectiveFrom).toISOString()}); versions are never replaced`,
      );
    }
    const openAtCut = latest.effectiveTo === null || latest.effectiveTo === undefined || new Date(latest.effectiveTo) > cut;
    if (!openAtCut) return;
    await this.assertNotUsedFrom(tx, kind, latest, cut);
    const model = kind === 'corporate' ? tx.corporateRateCard : tx.corporateDriverRateCard;
    const closed = await model.updateMany({
      where: { id: latest.id, effectiveTo: latest.effectiveTo ?? null },
      data: { effectiveTo: cut },
    });
    if (closed.count === 0) throw new ConflictException('Rate card changed concurrently; retry');
  }

  private async retire(kind: 'corporate' | 'driver', card: any, dto: RetireRateCardDto, actorUserId?: string) {
    if (card.retiredAt) throw new ConflictException(`Rate card version ${card.version} is already retired`);
    const requested = dto?.effectiveTo ? parseInstant(dto.effectiveTo, 'effectiveTo') : new Date();
    const from = new Date(card.effectiveFrom);
    let cut = requested < from ? from : requested; // a never-started version ends at its start
    if (card.effectiveTo && new Date(card.effectiveTo) < cut) cut = new Date(card.effectiveTo);

    const model = kind === 'corporate' ? this.db.corporateRateCard : this.db.corporateDriverRateCard;
    await this.assertNotUsedFrom(this.db, kind, card, cut);
    const moved = await (model as any).updateMany({
      where: { id: card.id, retiredAt: null },
      data: { effectiveTo: cut, isActive: false, retiredAt: new Date(), retiredByUserId: actorUserId ?? null },
    });
    if (moved.count === 0) throw new ConflictException('Rate card was retired concurrently');

    await this.audit.log({
      action: kind === 'corporate' ? 'CORPORATE_RATE_CARD_RETIRED' : 'CORPORATE_DRIVER_RATE_CARD_RETIRED',
      userId: actorUserId,
      actorRole: 'ADMIN',
      entityId: card.id,
      entityType: kind === 'corporate' ? 'CORPORATE_RATE_CARD' : 'CORPORATE_DRIVER_RATE_CARD',
      metadata: { version: card.version, effectiveTo: cut.toISOString() },
    });
    return (model as any).findUnique({ where: { id: card.id } });
  }

  /** Refuse to shorten a version's window over anything it already priced. */
  private async assertNotUsedFrom(client: any, kind: 'corporate' | 'driver', card: any, cut: Date): Promise<void> {
    if (kind === 'driver') {
      const liveSince = Math.max(new Date(card.effectiveFrom).getTime(), 0);
      if (cut.getTime() < Date.now() - DRIVER_CARD_CLOCK_SKEW_MS && liveSince <= Date.now()) {
        throw new ConflictException(
          `Driver rate card version ${card.version} has been live since ${new Date(card.effectiveFrom).toISOString()}; it cannot be ended in the past`,
        );
      }
      return;
    }
    const used = await client.corporateInvoiceLine.findFirst({
      where: { rateCardId: card.id, route: { targetPickup1Time: { gte: cut } } },
      select: { id: true },
    });
    if (used) {
      throw new ConflictException(
        `Rate card version ${card.version} already priced invoiced trips on/after ${cut.toISOString()}; a used version is never edited`,
      );
    }
  }

  private async normalizeActiveCategory(value: unknown): Promise<string> {
    const category = normalizeCategory(value);
    const tier = await this.db.vehiclePricingTier.findUnique({
      where: { vehicleType: category },
      select: { isActive: true },
    });
    if (!tier?.isActive) {
      throw new BadRequestException(`Vehicle category '${category}' is not active in the vehicle catalogue`);
    }
    return category;
  }

  private parseMeters(v: unknown): number {
    if (v === undefined || v === null) return 10000;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000) {
      throw new BadRequestException('baseDistanceMeters must be an integer between 0 and 1000000');
    }
    return n;
  }

  /** Corporate-facing view: commercial terms only (no internal actor ids). */
  private toCorporateView(card: any) {
    const { createdByUserId: _c, retiredByUserId: _r, ...rest } = card ?? {};
    return serializeMoney(rest);
  }
}
