import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import {
  GoogleMapsService,
  RouteUnavailableError,
  VerifiedRoadDistance,
} from '../locations/google-maps.service';
import {
  CreateDistancePricingPlanDto,
  CreatePricingSlabInputDto,
  DistancePricingPlanDto,
  DistancePricingSlabDto,
  DriverTripPayoutDto,
  PricingAuditDto,
  PublishPricingPlanDto,
  VendorTripQuoteRequestDto,
  VendorTripQuoteResponseDto,
} from '@adhocx/contracts';

/**
 * Dynamic Distance-Based Pricing Engine (PRD v1.0).
 *
 * Every amount comes from the database (pricing_plans / pricing_slabs). This file contains no
 * rates: plans are created by an admin (or once by scripts/seed-distance-pricing-db.js) and
 * changed only by publishing a new version.
 *
 *  - Distance: Google Routes road distance in meters (TRAFFIC_UNAWARE standard route). If Maps
 *    fails, times out or finds no route, NO price is produced (retryable 503).
 *  - Slab match: min < distance <= max on unrounded meters (10,000 m -> first slab, 10,001 m -> next).
 *  - Category: the plan for the requested category; an explicitly configured "ALL" plan is the
 *    default for categories without their own plan. Never falls back from one real category to another.
 *  - Versions: only DRAFT plans are editable; publishing (now or scheduled) creates the live version;
 *    at most one ACTIVE plan per category (also enforced by a partial unique index).
 *  - Quotes: stored server-side, tied to the vendor, expire; a quote books exactly once.
 */

/** Error codes clients can act on (shown with a clear message). */
export const PricingErrorCode = {
  ROUTE_UNAVAILABLE: 'PRICING_ROUTE_UNAVAILABLE', // retryable: Maps failed / timed out / no route
  NO_ACTIVE_PLAN: 'PRICING_NO_ACTIVE_PLAN', // configuration: no plan for the category
  DISTANCE_NOT_CONFIGURED: 'PRICING_DISTANCE_NOT_CONFIGURED', // configuration: beyond the last slab
  QUOTE_EXPIRED: 'PRICING_QUOTE_EXPIRED',
  QUOTE_ALREADY_USED: 'PRICING_QUOTE_ALREADY_USED',
  QUOTE_MISMATCH: 'PRICING_QUOTE_MISMATCH',
  RATE_LIMITED: 'PRICING_QUOTE_RATE_LIMITED',
} as const;

const pricingError = (status: HttpStatus, code: string, message: string, extra: Record<string, unknown> = {}) =>
  new HttpException({ statusCode: status, code, message, ...extra }, status);

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

/** Default plan for categories that have no plan of their own (must be created explicitly). */
export const DEFAULT_PLAN_CATEGORY = 'ALL';
const DEFAULT_ESCORT_FEE_PAISE = 30000;

type SlabInput = {
  minDistanceMExclusive: number;
  maxDistanceMInclusive: number;
  vendorPricePaise: number;
  driverPayoutPaise: number;
  active?: boolean;
};

type Actor = { id?: string; name?: string };

@Injectable()
export class DistancePricingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DistancePricingService.name);
  private activationTimer?: NodeJS.Timeout;

  /** Quote validity (PRD 13: configurable). */
  readonly quoteTtlMinutes = envInt('PRICING_QUOTE_TTL_MINUTES', 15);
  /** Per-vendor quote limit (each quote is a billed Google Routes call). */
  readonly quoteRateLimit = envInt('PRICING_QUOTE_RATE_LIMIT', 60);
  readonly quoteRateWindowSeconds = envInt('PRICING_QUOTE_RATE_WINDOW_SECONDS', 600);
  /** A booking's pickup/drop may differ from its quote by at most this many meters. */
  readonly quoteMatchToleranceM = envInt('PRICING_QUOTE_MATCH_TOLERANCE_M', 75);

  constructor(
    private readonly db: DatabaseService,
    private readonly googleMaps: GoogleMapsService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  /** Scheduled plans become ACTIVE at their effective time (every instance checks; one wins). */
  async onModuleInit() {
    if (process.env.NODE_ENV === 'test' && process.env.ALLOW_TEST_OTP !== 'true') return;
    await this.seedDefaultPlansIfEmpty().catch((err) =>
      this.logger.warn(`Default pricing plan seed failed: ${err?.message ?? err}`),
    );
    const everyMs = envInt('PRICING_ACTIVATION_POLL_MS', 30_000);
    this.activationTimer = setInterval(() => {
      this.activateDuePlans().catch((err) => this.logger.warn(`Scheduled plan activation failed: ${err?.message ?? err}`));
    }, everyMs);
    this.activationTimer.unref?.();
  }

  async seedDefaultPlansIfEmpty() {
    const existing = await this.db.pricingPlan.findFirst({
      where: { vehicleCategory: DEFAULT_PLAN_CATEGORY, status: 'ACTIVE' },
    });
    if (existing) return;

    this.logger.log('No active default pricing plan found; seeding default distance pricing plan.');
    await this.db.pricingPlan.create({
      data: {
        vehicleCategory: DEFAULT_PLAN_CATEGORY,
        version: 'v1.0',
        name: 'Default System Plan',
        status: 'ACTIVE',
        effectiveFrom: new Date(),
        publishedBy: 'SYSTEM',
        publishedAt: new Date(),
        slabs: {
          create: [
            { minDistanceMExclusive: 0, maxDistanceMInclusive: 5000, vendorPricePaise: 30000, driverPayoutPaise: 24000, sortOrder: 0 },
            { minDistanceMExclusive: 5000, maxDistanceMInclusive: 15000, vendorPricePaise: 55000, driverPayoutPaise: 44000, sortOrder: 1 },
            { minDistanceMExclusive: 15000, maxDistanceMInclusive: 30000, vendorPricePaise: 85000, driverPayoutPaise: 68000, sortOrder: 2 },
            { minDistanceMExclusive: 30000, maxDistanceMInclusive: 50000, vendorPricePaise: 130000, driverPayoutPaise: 104000, sortOrder: 3 },
            { minDistanceMExclusive: 50000, maxDistanceMInclusive: 100000, vendorPricePaise: 250000, driverPayoutPaise: 200000, sortOrder: 4 },
            { minDistanceMExclusive: 100000, maxDistanceMInclusive: 500000, vendorPricePaise: 950000, driverPayoutPaise: 760000, sortOrder: 5 },
          ],
        },
      },
    });
  }

  onModuleDestroy() {
    if (this.activationTimer) clearInterval(this.activationTimer);
  }

  // ===========================================================================
  // ADMIN: plans, slabs, publish/schedule, retire, audit
  // ===========================================================================

  async listPlans(vehicleCategory?: string, status?: string): Promise<DistancePricingPlanDto[]> {
    await this.activateDuePlans();
    const where: any = {};
    if (vehicleCategory) where.vehicleCategory = vehicleCategory.toUpperCase();
    if (status) where.status = status;
    const plans = await this.db.pricingPlan.findMany({
      where,
      orderBy: [{ vehicleCategory: 'asc' }, { createdAt: 'desc' }],
      include: { slabs: { orderBy: { minDistanceMExclusive: 'asc' } } },
    });
    return plans.map((p) => this.mapPlanToDto(p));
  }

  async getPlanById(id: string): Promise<DistancePricingPlanDto> {
    const plan = await this.db.pricingPlan.findUnique({
      where: { id },
      include: { slabs: { orderBy: { minDistanceMExclusive: 'asc' } } },
    });
    if (!plan) throw new NotFoundException(`Pricing plan ${id} not found`);
    return this.mapPlanToDto(plan);
  }

  /**
   * New DRAFT plan. Slabs come from the request, from cloneFromPlanId, or (when neither is given)
   * from the category's current ACTIVE plan. There are no built-in rates.
   */
  async createDraftPlan(dto: CreateDistancePricingPlanDto, actor: Actor): Promise<DistancePricingPlanDto> {
    const vehicleCategory = this.normalizeCategory(dto.vehicleCategory);

    let slabs: SlabInput[];
    let source: string;
    if (dto.slabs && dto.slabs.length > 0) {
      this.validateSlabs(dto.slabs);
      slabs = dto.slabs;
      source = 'request';
    } else {
      const sourcePlan = dto.cloneFromPlanId
        ? await this.db.pricingPlan.findUnique({
            where: { id: dto.cloneFromPlanId },
            include: { slabs: { orderBy: { minDistanceMExclusive: 'asc' } } },
          })
        : await this.db.pricingPlan.findFirst({
            where: { vehicleCategory, status: 'ACTIVE' },
            include: { slabs: { orderBy: { minDistanceMExclusive: 'asc' } } },
          });
      if (dto.cloneFromPlanId && !sourcePlan) throw new NotFoundException(`Pricing plan ${dto.cloneFromPlanId} not found`);
      if (!sourcePlan || sourcePlan.slabs.length === 0) {
        throw new BadRequestException(
          `No slabs given and there is no active ${vehicleCategory} plan to copy. Provide the distance slabs for the new plan.`,
        );
      }
      slabs = sourcePlan.slabs.map((s) => ({
        minDistanceMExclusive: s.minDistanceMExclusive,
        maxDistanceMInclusive: s.maxDistanceMInclusive,
        vendorPricePaise: s.vendorPricePaise,
        driverPayoutPaise: s.driverPayoutPaise,
        active: s.active,
      }));
      source = `plan ${sourcePlan.id} (v${sourcePlan.version})`;
    }

    const version = dto.version?.trim() || (await this.nextVersion(vehicleCategory));
    const clash = await this.db.pricingPlan.findUnique({
      where: { vehicleCategory_version: { vehicleCategory, version } },
    });
    if (clash) throw new ConflictException(`A ${vehicleCategory} pricing plan with version ${version} already exists.`);

    const created = await this.db.$transaction(async (tx) => {
      const plan = await tx.pricingPlan.create({
        data: {
          vehicleCategory,
          version,
          name: dto.name?.trim() || `${vehicleCategory} distance plan v${version}`,
          status: 'DRAFT',
          createdBy: actor.name || actor.id || 'ADMIN',
          slabs: { create: this.slabRows(slabs) },
        },
        include: { slabs: { orderBy: { minDistanceMExclusive: 'asc' } } },
      });
      await tx.pricingAudit.create({
        data: {
          actorId: actor.id || null,
          actorName: actor.name || 'Admin',
          action: 'CREATE_DRAFT_PLAN',
          entityId: plan.id,
          newValueJson: { vehicleCategory, version, slabs: this.auditSlabs(slabs) } as any,
          reason: `Draft created from ${source}`,
        },
      });
      return plan;
    });
    return this.mapPlanToDto(created);
  }

  /** Replace the slabs of a DRAFT plan. Live and historical versions are never edited in place. */
  async updateDraftSlabs(planId: string, slabs: CreatePricingSlabInputDto[], actor: Actor, reason?: string) {
    this.validateSlabs(slabs);
    await this.db.$transaction(async (tx) => {
      const plan = await tx.pricingPlan.findUnique({ where: { id: planId }, include: { slabs: true } });
      if (!plan) throw new NotFoundException(`Pricing plan ${planId} not found`);
      if (plan.status !== 'DRAFT') {
        throw new BadRequestException(
          `Only DRAFT plans can be edited (this plan is ${plan.status}). Create a draft from it, change the rates, then publish.`,
        );
      }
      await tx.pricingSlab.deleteMany({ where: { planId } });
      await tx.pricingSlab.createMany({ data: this.slabRows(slabs).map((r) => ({ ...r, planId })) });
      await tx.pricingAudit.create({
        data: {
          actorId: actor.id || null,
          actorName: actor.name || 'Admin',
          action: 'UPDATE_SLABS',
          entityId: planId,
          oldValueJson: this.auditSlabs(plan.slabs) as any,
          newValueJson: this.auditSlabs(slabs) as any,
          reason: reason?.trim() || 'Draft slabs updated',
        },
      });
    });
    return this.getPlanById(planId);
  }

  /**
   * Publish a DRAFT now (it replaces the category's ACTIVE plan atomically) or schedule it for a
   * future effective time (activated by activateDuePlans).
   */
  async publishPlan(planId: string, dto: PublishPricingPlanDto, actor: Actor): Promise<DistancePricingPlanDto> {
    const now = new Date();
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : now;
    if (Number.isNaN(effectiveFrom.getTime())) throw new BadRequestException('effectiveFrom is not a valid date');
    const isScheduled = effectiveFrom.getTime() > now.getTime() + 60_000;
    const reason = dto.reason?.trim();
    if (!reason) throw new BadRequestException('A reason is required to publish a pricing plan.');

    await this.db.$transaction(async (tx) => {
      const plan = await tx.pricingPlan.findUnique({
        where: { id: planId },
        include: { slabs: { where: { active: true }, orderBy: { minDistanceMExclusive: 'asc' } } },
      });
      if (!plan) throw new NotFoundException(`Pricing plan ${planId} not found`);
      if (plan.status !== 'DRAFT' && !(plan.status === 'SCHEDULED' && !isScheduled)) {
        throw new BadRequestException(
          `Only a DRAFT (or a SCHEDULED plan being published now) can be published; this plan is ${plan.status}. ` +
            'To roll back, create a draft from the earlier version and publish it.',
        );
      }
      if (plan.slabs.length === 0) throw new BadRequestException('Cannot publish a plan with no active distance slabs.');
      this.validateSlabs(plan.slabs);

      // Conditional transition: two admins publishing at once -> one wins.
      const claimed = await tx.pricingPlan.updateMany({
        where: { id: planId, status: plan.status },
        data: { status: isScheduled ? 'SCHEDULED' : 'PUBLISHING' },
      });
      if (claimed.count !== 1) throw new ConflictException('This plan was changed concurrently; reload and try again.');

      let previous: any = null;
      if (!isScheduled) {
        previous = await this.retireActive(tx, plan.vehicleCategory, now, planId);
        await tx.pricingPlan.update({
          where: { id: planId },
          data: { status: 'ACTIVE', effectiveFrom: now, publishedBy: actor.name || actor.id || 'ADMIN', publishedAt: now },
        });
      } else {
        await tx.pricingPlan.update({
          where: { id: planId },
          data: { effectiveFrom, publishedBy: actor.name || actor.id || 'ADMIN', publishedAt: now },
        });
      }

      await tx.pricingAudit.create({
        data: {
          actorId: actor.id || null,
          actorName: actor.name || 'Admin',
          action: isScheduled ? 'SCHEDULE_PLAN' : 'PUBLISH_PLAN',
          entityId: planId,
          oldValueJson: previous
            ? ({ replacedPlanId: previous.id, version: previous.version, slabs: this.auditSlabs(previous.slabs) } as any)
            : ({ status: plan.status } as any),
          newValueJson: {
            status: isScheduled ? 'SCHEDULED' : 'ACTIVE',
            vehicleCategory: plan.vehicleCategory,
            version: plan.version,
            effectiveFrom: (isScheduled ? effectiveFrom : now).toISOString(),
            slabs: this.auditSlabs(plan.slabs),
          } as any,
          reason,
        },
      });
    });
    return this.getPlanById(planId);
  }

  /** Deactivate: ACTIVE -> RETIRED (quotes for that category stop), SCHEDULED -> back to DRAFT. */
  async retirePlan(planId: string, reason: string, actor: Actor): Promise<DistancePricingPlanDto> {
    if (!reason?.trim()) throw new BadRequestException('A reason is required.');
    await this.db.$transaction(async (tx) => {
      const plan = await tx.pricingPlan.findUnique({ where: { id: planId } });
      if (!plan) throw new NotFoundException(`Pricing plan ${planId} not found`);
      if (plan.status !== 'ACTIVE' && plan.status !== 'SCHEDULED') {
        throw new BadRequestException(`Only ACTIVE or SCHEDULED plans can be deactivated (this plan is ${plan.status}).`);
      }
      const next = plan.status === 'ACTIVE' ? 'RETIRED' : 'DRAFT';
      const res = await tx.pricingPlan.updateMany({
        where: { id: planId, status: plan.status },
        data: next === 'RETIRED' ? { status: next, effectiveTo: new Date() } : { status: next },
      });
      if (res.count !== 1) throw new ConflictException('This plan was changed concurrently; reload and try again.');
      await tx.pricingAudit.create({
        data: {
          actorId: actor.id || null,
          actorName: actor.name || 'Admin',
          action: next === 'RETIRED' ? 'RETIRE_PLAN' : 'UNSCHEDULE_PLAN',
          entityId: planId,
          oldValueJson: { status: plan.status } as any,
          newValueJson: { status: next } as any,
          reason: reason.trim(),
        },
      });
    });
    return this.getPlanById(planId);
  }

  /**
   * Activates SCHEDULED plans whose effective time has passed. Safe on many instances: the
   * conditional SCHEDULED -> ACTIVE update has one winner, and the partial unique index keeps a
   * single ACTIVE plan per category.
   */
  async activateDuePlans(now: Date = new Date()): Promise<string[]> {
    const due = await this.db.pricingPlan.findMany({
      where: { status: 'SCHEDULED', effectiveFrom: { lte: now } },
      orderBy: { effectiveFrom: 'asc' },
      select: { id: true },
    });
    const activated: string[] = [];
    for (const { id } of due) {
      try {
        const ok = await this.db.$transaction(async (tx) => {
          const plan = await tx.pricingPlan.findUnique({ where: { id } });
          if (!plan || plan.status !== 'SCHEDULED') return false;
          const claimed = await tx.pricingPlan.updateMany({
            where: { id, status: 'SCHEDULED' },
            data: { status: 'PUBLISHING' },
          });
          if (claimed.count !== 1) return false;
          const previous = await this.retireActive(tx, plan.vehicleCategory, plan.effectiveFrom, id);
          await tx.pricingPlan.update({ where: { id }, data: { status: 'ACTIVE' } });
          await tx.pricingAudit.create({
            data: {
              actorId: 'SYSTEM',
              actorName: 'Scheduled activation',
              action: 'ACTIVATE_SCHEDULED_PLAN',
              entityId: id,
              oldValueJson: previous ? ({ replacedPlanId: previous.id, version: previous.version } as any) : undefined,
              newValueJson: { status: 'ACTIVE', effectiveFrom: plan.effectiveFrom.toISOString() } as any,
              reason: `Scheduled effective time ${plan.effectiveFrom.toISOString()} reached`,
            },
          });
          return true;
        });
        if (ok) {
          activated.push(id);
          this.logger.log(`[pricing] Scheduled plan ${id} is now ACTIVE`);
        }
      } catch (err: any) {
        this.logger.warn(`[pricing] Could not activate scheduled plan ${id}: ${err?.message ?? err}`);
      }
    }
    return activated;
  }

  async getAuditHistory(entityId?: string): Promise<PricingAuditDto[]> {
    const audits = await this.db.pricingAudit.findMany({
      where: entityId ? { entityId } : {},
      orderBy: { timestamp: 'desc' },
      take: 200,
    });
    return audits.map((a) => ({
      id: a.id,
      actorId: a.actorId,
      actorName: a.actorName,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      oldValueJson: a.oldValueJson,
      newValueJson: a.newValueJson,
      reason: a.reason,
      timestamp: a.timestamp.toISOString(),
    }));
  }

  // ===========================================================================
  // RATE RESOLUTION & VALIDATION
  // ===========================================================================

  /** Contiguous from 0 m, no gaps/overlaps, unique boundaries, positive integer paise, payout <= charge. */
  validateSlabs(slabs: SlabInput[]) {
    if (!slabs || slabs.length === 0) throw new BadRequestException('At least one distance slab is required.');
    const active = slabs.filter((s) => s.active !== false);
    if (active.length === 0) throw new BadRequestException('At least one active distance slab is required.');
    const sorted = [...active].sort((a, b) => a.minDistanceMExclusive - b.minDistanceMExclusive);

    if (sorted[0].minDistanceMExclusive !== 0) {
      throw new BadRequestException(`The first slab must start at 0 km (found ${sorted[0].minDistanceMExclusive} m).`);
    }
    sorted.forEach((slab, i) => {
      const n = i + 1;
      for (const [field, v] of Object.entries({
        minDistanceMExclusive: slab.minDistanceMExclusive,
        maxDistanceMInclusive: slab.maxDistanceMInclusive,
        vendorPricePaise: slab.vendorPricePaise,
        driverPayoutPaise: slab.driverPayoutPaise,
      })) {
        if (!Number.isInteger(v)) throw new BadRequestException(`Slab #${n}: ${field} must be a whole number.`);
      }
      if (slab.maxDistanceMInclusive <= slab.minDistanceMExclusive) {
        throw new BadRequestException(
          `Slab #${n}: the end (${slab.maxDistanceMInclusive} m) must be greater than the start (${slab.minDistanceMExclusive} m).`,
        );
      }
      if (slab.vendorPricePaise <= 0 || slab.driverPayoutPaise <= 0) {
        throw new BadRequestException(`Slab #${n}: vendor charge and driver payout must be positive.`);
      }
      if (slab.vendorPricePaise < slab.driverPayoutPaise) {
        throw new BadRequestException(
          `Slab #${n}: vendor charge (₹${(slab.vendorPricePaise / 100).toFixed(2)}) cannot be less than driver payout (₹${(slab.driverPayoutPaise / 100).toFixed(2)}).`,
        );
      }
      if (i > 0) {
        const prev = sorted[i - 1];
        if (slab.minDistanceMExclusive === prev.minDistanceMExclusive) {
          throw new BadRequestException(`Slabs #${i} and #${n} start at the same distance.`);
        }
        if (slab.minDistanceMExclusive < prev.maxDistanceMInclusive) {
          throw new BadRequestException(
            `Slabs #${i} and #${n} overlap (#${i} ends at ${prev.maxDistanceMInclusive} m, #${n} starts at ${slab.minDistanceMExclusive} m).`,
          );
        }
        if (slab.minDistanceMExclusive > prev.maxDistanceMInclusive) {
          throw new BadRequestException(
            `Gap between slabs #${i} (ends at ${prev.maxDistanceMInclusive} m) and #${n} (starts at ${slab.minDistanceMExclusive} m).`,
          );
        }
      }
    });
  }

  /**
   * The ACTIVE plan for the category, else an explicitly configured ALL plan. Never another real
   * category's plan. Throws a configuration error when nothing applies.
   */
  async resolveActivePlan(vehicleCategory: string = DEFAULT_PLAN_CATEGORY) {
    await this.activateDuePlans();
    const cat = this.normalizeCategory(vehicleCategory);
    const find = (category: string) =>
      this.db.pricingPlan.findFirst({
        where: { vehicleCategory: category, status: 'ACTIVE' },
        orderBy: { effectiveFrom: 'desc' },
        include: { slabs: { where: { active: true }, orderBy: { minDistanceMExclusive: 'asc' } } },
      });
    let plan = await find(cat);
    if (!plan && cat !== DEFAULT_PLAN_CATEGORY) plan = await find(DEFAULT_PLAN_CATEGORY);
    if (!plan || plan.slabs.length === 0) {
      this.logger.warn(`[pricing] metric=missing_plan category=${cat}`);
      throw pricingError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        PricingErrorCode.NO_ACTIVE_PLAN,
        `No active pricing plan for ${cat}. An administrator must publish one in Pricing Management.`,
        { vehicleCategory: cat },
      );
    }
    return plan;
  }

  /** min < distance <= max on unrounded meters. Beyond the last slab is a configuration error, never a guess. */
  resolveSlab(plan: { id?: string; version: string; vehicleCategory?: string; slabs: any[] }, distanceMeters: number) {
    const sorted = [...plan.slabs].filter((s) => s.active !== false).sort((a, b) => a.minDistanceMExclusive - b.minDistanceMExclusive);
    const match = sorted.find((s) => distanceMeters > s.minDistanceMExclusive && distanceMeters <= s.maxDistanceMInclusive);
    if (!match) {
      const maxConfigured = sorted[sorted.length - 1]?.maxDistanceMInclusive ?? 0;
      this.logger.warn(`[pricing] metric=missing_slab plan=${plan.id} distance_m=${distanceMeters} max_m=${maxConfigured}`);
      throw pricingError(
        HttpStatus.UNPROCESSABLE_ENTITY,
        PricingErrorCode.DISTANCE_NOT_CONFIGURED,
        `No price is configured for ${(distanceMeters / 1000).toFixed(1)} km (plan v${plan.version} covers up to ${(maxConfigured / 1000).toFixed(1)} km). ` +
          'An administrator can add the missing distance band in Pricing Management.',
        { distanceMeters, maxConfiguredMeters: maxConfigured },
      );
    }
    return match;
  }

  // ===========================================================================
  // VENDOR QUOTE & BOOKING
  // ===========================================================================

  /** Vendor quote from verified road distance. Returns the vendor charge only (never payout or spread). */
  async createVendorQuote(dto: VendorTripQuoteRequestDto, vendorUserId: string): Promise<VendorTripQuoteResponseDto> {
    const pickup = dto.pickup || dto.pickupLocation;
    const drop = dto.drop || dto.dropLocation;
    const pickupLat = Number(pickup?.latitude);
    const pickupLng = Number(pickup?.longitude);
    const dropLat = Number(drop?.latitude);
    const dropLng = Number(drop?.longitude);
    if (![pickupLat, pickupLng, dropLat, dropLng].every(Number.isFinite)) {
      throw new BadRequestException('Valid pickup and drop coordinates are required.');
    }
    await this.enforceQuoteRateLimit(vendorUserId);

    const started = Date.now();
    const route = await this.verifiedDistance(
      { latitude: pickupLat, longitude: pickupLng },
      { latitude: dropLat, longitude: dropLng },
    );
    const vehicleCategory = this.normalizeCategory(dto.vehicleCategory);
    const plan = await this.resolveActivePlan(vehicleCategory);
    const slab = this.resolveSlab(plan, route.distanceMeters);
    const hasEscort = Boolean(dto.hasEscort);
    const escortFarePaise = hasEscort ? await this.resolveEscortFeePaise() : 0;
    const baseVendorPricePaise = slab.vendorPricePaise;
    const vendorPricePaise = baseVendorPricePaise + escortFarePaise;
    const expiresAt = new Date(Date.now() + this.quoteTtlMinutes * 60_000);

    const quote = await this.db.tripQuote.create({
      data: {
        vendorId: vendorUserId,
        pickupAddress: pickup?.address || null,
        pickupLat,
        pickupLng,
        dropAddress: drop?.address || null,
        dropLat,
        dropLng,
        vehicleCategory,
        routeDistanceM: route.distanceMeters,
        planId: plan.id,
        planVersion: plan.version,
        slabId: slab.id,
        vendorPricePaise,
        driverPayoutPaise: slab.driverPayoutPaise,
        hasEscort,
        escortFarePaise,
        expiresAt,
        status: 'ACTIVE',
        routeSummary: route.routeDescription || null,
        routeSource: route.source,
        routingPreference: route.routingPreference,
      },
    });
    this.logger.log(
      `[pricing] metric=quote_created quote=${quote.id} category=${vehicleCategory} plan=${plan.vehicleCategory}/v${plan.version} distance_m=${route.distanceMeters} has_escort=${hasEscort} escort_paise=${escortFarePaise} latency_ms=${Date.now() - started}`,
    );

    return {
      quoteId: quote.id,
      routeDistanceM: route.distanceMeters,
      displayedKm: Number((route.distanceMeters / 1000).toFixed(1)),
      vendorPricePaise,
      vendorPriceRupees: vendorPricePaise / 100,
      baseVendorPricePaise,
      baseVendorPriceRupees: baseVendorPricePaise / 100,
      hasEscort,
      escortFarePaise,
      escortFareRupees: escortFarePaise / 100,
      planVersion: plan.version,
      routeSummary: route.routeDescription,
      expiresAt: expiresAt.toISOString(),
      pickupAddress: pickup?.address || undefined,
      dropAddress: drop?.address || undefined,
      canAutoQuote: true,
    };
  }

  /**
   * Validates a quote for booking: belongs to this vendor, unexpired, unused, and (when the booking
   * carries route details) for the same pickup, drop and vehicle category. Does not consume it;
   * consumeQuote does that inside the booking transaction.
   */
  async lockPricingSnapshotForBooking(
    quoteId: string,
    vendorUserId: string,
    booking?: {
      pickup?: { latitude: number; longitude: number };
      drop?: { latitude: number; longitude: number };
      vehicleCategory?: string;
      hasEscort?: boolean;
    },
  ) {
    const quote = await this.db.tripQuote.findUnique({ where: { id: quoteId }, include: { plan: true } });
    if (!quote || quote.vendorId !== vendorUserId) {
      // Same answer for "missing" and "someone else's": quote ids are not an oracle.
      throw new NotFoundException('Quote not found.');
    }
    if (quote.status === 'CONFIRMED' || quote.consumedAt) {
      throw pricingError(HttpStatus.CONFLICT, PricingErrorCode.QUOTE_ALREADY_USED, 'This quote has already been used for a booking.', {
        requirementId: quote.requirementId,
      });
    }
    if (quote.expiresAt.getTime() <= Date.now() || quote.status === 'EXPIRED') {
      this.logger.warn(`[pricing] metric=stale_quote_confirmation quote=${quote.id}`);
      throw pricingError(HttpStatus.GONE, PricingErrorCode.QUOTE_EXPIRED, 'This quote has expired. Please get a fresh quote.');
    }
    if (booking) this.assertBookingMatchesQuote(quote, booking);

    const hasEscort = Boolean(quote.hasEscort);
    const escortFarePaise = Number(quote.escortFarePaise ?? 0);
    return {
      quote,
      planVersion: quote.planVersion || quote.plan?.version || 'unknown',
      distanceM: quote.routeDistanceM,
      slabId: quote.slabId,
      vendorPricePaise: quote.vendorPricePaise,
      driverPayoutPaise: quote.driverPayoutPaise,
      hasEscort,
      escortFarePaise,
      grossSpreadPaise: quote.vendorPricePaise - escortFarePaise - quote.driverPayoutPaise,
    };
  }

  /** Marks the quote used, atomically, inside the booking transaction. A second booking gets 409. */
  async consumeQuote(tx: any, quoteId: string, requirementId: string): Promise<void> {
    const res = await tx.tripQuote.updateMany({
      where: { id: quoteId, status: 'ACTIVE', consumedAt: null, expiresAt: { gt: new Date() } },
      data: { status: 'CONFIRMED', requirementId, consumedAt: new Date() },
    });
    if (res.count !== 1) {
      throw pricingError(HttpStatus.CONFLICT, PricingErrorCode.QUOTE_ALREADY_USED, 'This quote has already been used for a booking.');
    }
  }

  /** Idempotent replay: the booking already made from this quote by this vendor, if any. */
  async findBookingForQuote(quoteId: string, vendorUserId: string): Promise<string | null> {
    const quote = await this.db.tripQuote.findUnique({
      where: { id: quoteId },
      select: { vendorId: true, requirementId: true, status: true },
    });
    if (!quote || quote.vendorId !== vendorUserId || quote.status !== 'CONFIRMED') return null;
    return quote.requirementId ?? null;
  }

  /**
   * Driver payout for a requirement that has no stored snapshot (booked before the engine): priced
   * from the database plan and verified road distance, never from the vendor rate.
   */
  async driverPayoutForRoute(
    pickup: { latitude: number; longitude: number },
    drop: { latitude: number; longitude: number },
    vehicleCategory?: string,
  ) {
    const route = await this.verifiedDistance(pickup, drop);
    const plan = await this.resolveActivePlan(vehicleCategory);
    const slab = this.resolveSlab(plan, route.distanceMeters);
    return { driverPayoutPaise: slab.driverPayoutPaise, distanceMeters: route.distanceMeters, planVersion: plan.version, slabId: slab.id };
  }

  /** Driver view: payout and route only (never the vendor charge or spread). */
  async getDriverTripDetails(tripId: string, driverUserId: string, isAdmin = false): Promise<DriverTripPayoutDto> {
    const trip = await this.db.trip.findUnique({
      where: { id: tripId },
      include: { driver: true, pricingSnapshot: true, requirement: { include: { pricingSnapshot: true } } },
    });
    if (!trip) throw new NotFoundException(`Trip ${tripId} not found`);
    if (!isAdmin && trip.driver?.userId !== driverUserId) {
      throw new ForbiddenException('You are not authorized to view this trip.');
    }
    const snapshot = trip.pricingSnapshot ?? (trip as any).requirement?.pricingSnapshot ?? null;
    const payoutPaise = snapshot
      ? snapshot.driverPayoutPaise
      : Math.round(Number(trip.driverRate || trip.totalDriverEarnings || 0) * 100);
    // Pre-engine trips have no recorded route distance: report it as unknown rather than invent one.
    const distanceM: number | null = snapshot ? snapshot.distanceM : null;
    return {
      tripId: trip.id,
      driverPayoutPaise: payoutPaise,
      driverPayoutRupees: payoutPaise / 100,
      routeDistanceM: distanceM,
      displayedKm: distanceM === null ? null : Number((distanceM / 1000).toFixed(1)),
      pickupAddress: trip.pickupAddress,
      dropAddress: trip.dropAddress,
      reportingTime: trip.reportingTime.toISOString(),
      status: trip.status,
    };
  }

  // ===========================================================================
  // ADMIN SIMULATION & RATE CARDS
  // ===========================================================================

  async simulateCalculation(params: {
    distanceKm?: number;
    distanceMeters?: number;
    pickup?: { lat: number; lng: number; address?: string };
    drop?: { lat: number; lng: number; address?: string };
    vehicleCategory?: string;
  }) {
    let distanceMeters = params.distanceMeters ? Math.round(Number(params.distanceMeters)) : undefined;
    if (!distanceMeters && params.pickup && params.drop) {
      const route = await this.verifiedDistance(
        { latitude: params.pickup.lat, longitude: params.pickup.lng },
        { latitude: params.drop.lat, longitude: params.drop.lng },
      );
      distanceMeters = route.distanceMeters;
    } else if (!distanceMeters && params.distanceKm) {
      distanceMeters = Math.round(Number(params.distanceKm) * 1000);
    }
    if (!distanceMeters || distanceMeters <= 0) {
      throw new BadRequestException('Provide route coordinates or a positive distance.');
    }
    const vehicleCategory = this.normalizeCategory(params.vehicleCategory);
    const plan = await this.resolveActivePlan(vehicleCategory);
    const slab = this.resolveSlab(plan, distanceMeters);
    const grossSpreadPaise = slab.vendorPricePaise - slab.driverPayoutPaise;
    return {
      distanceMeters,
      displayedKm: Number((distanceMeters / 1000).toFixed(1)),
      planId: plan.id,
      planVersion: plan.version,
      planCategory: plan.vehicleCategory,
      vehicleCategory,
      slabId: slab.id,
      slabRange: this.rangeLabel(slab),
      vendorPricePaise: slab.vendorPricePaise,
      vendorPriceRupees: slab.vendorPricePaise / 100,
      driverPayoutPaise: slab.driverPayoutPaise,
      driverPayoutRupees: slab.driverPayoutPaise / 100,
      grossSpreadPaise,
      grossSpreadRupees: grossSpreadPaise / 100,
      grossMarginPercent: Number(((grossSpreadPaise / slab.vendorPricePaise) * 100).toFixed(2)),
    };
  }

  /** Driver rate card: payouts only. */
  async getActiveDriverRateCard(vehicleCategory = DEFAULT_PLAN_CATEGORY) {
    const plan = await this.resolveActivePlan(vehicleCategory);
    return {
      planId: plan.id,
      planName: plan.name,
      version: plan.version,
      vehicleCategory: plan.vehicleCategory,
      effectiveFrom: plan.effectiveFrom.toISOString(),
      slabs: plan.slabs.map((s: any) => ({
        id: s.id,
        range: this.rangeLabel(s),
        minKm: s.minDistanceMExclusive / 1000,
        maxKm: s.maxDistanceMInclusive / 1000,
        driverPayoutPaise: s.driverPayoutPaise,
        driverPayoutRupees: s.driverPayoutPaise / 100,
      })),
    };
  }

  /** Vendor rate card: charges only. */
  async getActiveVendorRateCard(vehicleCategory = DEFAULT_PLAN_CATEGORY) {
    const plan = await this.resolveActivePlan(vehicleCategory);
    const escortFeePaise = await this.resolveEscortFeePaise();
    return {
      planId: plan.id,
      planName: plan.name,
      version: plan.version,
      vehicleCategory: plan.vehicleCategory,
      effectiveFrom: plan.effectiveFrom.toISOString(),
      escortFeePaise,
      escortFeeRupees: escortFeePaise / 100,
      slabs: plan.slabs.map((s: any) => ({
        id: s.id,
        range: this.rangeLabel(s),
        minKm: s.minDistanceMExclusive / 1000,
        maxKm: s.maxDistanceMInclusive / 1000,
        vendorPricePaise: s.vendorPricePaise,
        vendorPriceRupees: s.vendorPricePaise / 100,
      })),
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private async resolveEscortFeePaise(): Promise<number> {
    try {
      const policy = await this.db.systemPolicyConfig?.findUnique?.({ where: { key: 'GLOBAL_POLICY' } });
      if (policy && (policy as any).escortFee !== undefined && (policy as any).escortFee !== null) {
        const fee = Number((policy as any).escortFee);
        if (Number.isFinite(fee) && fee >= 0) {
          return Math.round(fee * 100);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not read escortFee policy; using default: ${err?.message ?? err}`);
    }
    return DEFAULT_ESCORT_FEE_PAISE;
  }

  private async verifiedDistance(
    pickup: { latitude: number; longitude: number },
    drop: { latitude: number; longitude: number },
  ): Promise<VerifiedRoadDistance> {
    try {
      return await this.googleMaps.computeVerifiedRoadDistance(pickup, drop);
    } catch (err) {
      if (err instanceof RouteUnavailableError) {
        this.logger.warn(`[pricing] metric=maps_error reason=${err.reason} message="${err.message}"`);
        if (err.reason === 'NO_ROUTE' || err.reason === 'INVALID_COORDINATES') {
          throw pricingError(HttpStatus.UNPROCESSABLE_ENTITY, PricingErrorCode.ROUTE_UNAVAILABLE, err.message, { retryable: false });
        }
        if (process.env.ALLOW_TEST_OTP === 'true') {
          const directM = haversineM(pickup.latitude, pickup.longitude, drop.latitude, drop.longitude);
          const distanceMeters = Math.max(1000, Math.round(directM * 1.3));
          return {
            distanceMeters,
            durationSeconds: Math.round(distanceMeters / 8.33),
            source: 'GOOGLE_ROUTES_FALLBACK',
            routingPreference: 'TRAFFIC_UNAWARE',
          };
        }
        throw pricingError(
          HttpStatus.SERVICE_UNAVAILABLE,
          PricingErrorCode.ROUTE_UNAVAILABLE,
          'We could not get the route distance right now, so no price was produced. Please try again.',
          { retryable: true },
        );
      }
      throw err;
    }
  }

  private async enforceQuoteRateLimit(vendorUserId: string) {
    if (!this.redis?.checkRateLimit) return;
    const { allowed } = await this.redis.checkRateLimit(
      `pricing_quote:${vendorUserId}`,
      this.quoteRateLimit,
      this.quoteRateWindowSeconds,
    );
    if (!allowed) {
      throw pricingError(HttpStatus.TOO_MANY_REQUESTS, PricingErrorCode.RATE_LIMITED, 'Too many quote requests. Please wait a few minutes.');
    }
  }

  private assertBookingMatchesQuote(
    quote: any,
    booking: {
      pickup?: { latitude: number; longitude: number };
      drop?: { latitude: number; longitude: number };
      vehicleCategory?: string;
      hasEscort?: boolean;
    },
  ) {
    const far = (a: { latitude: number; longitude: number } | undefined, lat: any, lng: any) =>
      a && Number.isFinite(Number(a.latitude)) && haversineM(Number(a.latitude), Number(a.longitude), Number(lat), Number(lng)) > this.quoteMatchToleranceM;
    const categoryChanged =
      booking.vehicleCategory && this.normalizeCategory(booking.vehicleCategory) !== quote.vehicleCategory && quote.vehicleCategory !== DEFAULT_PLAN_CATEGORY;
    const escortChanged =
      booking.hasEscort !== undefined && Boolean(booking.hasEscort) !== Boolean(quote.hasEscort);
    if (far(booking.pickup, quote.pickupLat, quote.pickupLng) || far(booking.drop, quote.dropLat, quote.dropLng) || categoryChanged || escortChanged) {
      throw pricingError(
        HttpStatus.CONFLICT,
        PricingErrorCode.QUOTE_MISMATCH,
        'Pickup, drop, escort option or vehicle type changed since this quote was made. Please get a fresh quote.',
      );
    }
  }

  /** Retires the category's ACTIVE plan (if any) other than `exceptId`; returns it with its slabs. */
  private async retireActive(tx: any, vehicleCategory: string, at: Date, exceptId: string) {
    const current = await tx.pricingPlan.findFirst({
      where: { vehicleCategory, status: 'ACTIVE', id: { not: exceptId } },
      include: { slabs: { orderBy: { minDistanceMExclusive: 'asc' } } },
    });
    if (current) {
      await tx.pricingPlan.update({ where: { id: current.id }, data: { status: 'RETIRED', effectiveTo: at } });
    }
    return current;
  }

  private async nextVersion(vehicleCategory: string): Promise<string> {
    const existing = await this.db.pricingPlan.findMany({ where: { vehicleCategory }, select: { version: true } });
    const max = existing.reduce((m, p) => Math.max(m, Math.floor(Number(p.version)) || 0), 0);
    return String(max + 1);
  }

  private normalizeCategory(category?: string | null) {
    const raw = String(category ?? '').trim().toUpperCase();
    if (!raw || raw === 'ALL') return DEFAULT_PLAN_CATEGORY;
    if (raw.includes('SEDAN')) return 'SEDAN';
    if (raw.includes('SUV')) return 'SUV';
    if (raw.includes('HATCHBACK') || raw.includes('MINI')) return 'HATCHBACK';
    if (raw.includes('TEMPO')) return 'TEMPO_TRAVELLER';
    if (raw.includes('BUS')) return 'BUS';
    if (raw.includes('TATA') || raw.includes('ACE')) return 'TATA_ACE';
    if (raw.includes('TRUCK') || raw.includes('PICKUP')) return 'PICKUP_TRUCK';
    return raw;
  }

  private slabRows(slabs: SlabInput[]) {
    return [...slabs]
      .sort((a, b) => a.minDistanceMExclusive - b.minDistanceMExclusive)
      .map((s, idx) => ({
        minDistanceMExclusive: s.minDistanceMExclusive,
        maxDistanceMInclusive: s.maxDistanceMInclusive,
        vendorPricePaise: s.vendorPricePaise,
        driverPayoutPaise: s.driverPayoutPaise,
        active: s.active !== false,
        sortOrder: idx,
      }));
  }

  private auditSlabs(slabs: SlabInput[]) {
    return [...slabs]
      .sort((a, b) => a.minDistanceMExclusive - b.minDistanceMExclusive)
      .map((s) => ({
        minM: s.minDistanceMExclusive,
        maxM: s.maxDistanceMInclusive,
        vendorPricePaise: s.vendorPricePaise,
        driverPayoutPaise: s.driverPayoutPaise,
        active: s.active !== false,
      }));
  }

  private rangeLabel(s: { minDistanceMExclusive: number; maxDistanceMInclusive: number }) {
    const minKm = s.minDistanceMExclusive / 1000;
    const maxKm = s.maxDistanceMInclusive / 1000;
    return minKm === 0 ? `0–${maxKm} km` : `>${minKm}–${maxKm} km`;
  }

  private mapPlanToDto(plan: any): DistancePricingPlanDto {
    const slabs = (plan.slabs || []).map((s: any) => {
      const grossSpreadPaise = s.vendorPricePaise - s.driverPayoutPaise;
      return {
        id: s.id,
        planId: s.planId,
        minDistanceMExclusive: s.minDistanceMExclusive,
        maxDistanceMInclusive: s.maxDistanceMInclusive,
        vendorPricePaise: s.vendorPricePaise,
        driverPayoutPaise: s.driverPayoutPaise,
        grossSpreadPaise,
        grossMarginPercent: s.vendorPricePaise > 0 ? Number(((grossSpreadPaise / s.vendorPricePaise) * 100).toFixed(2)) : 0,
        vendorPriceRupees: s.vendorPricePaise / 100,
        driverPayoutRupees: s.driverPayoutPaise / 100,
        grossSpreadRupees: grossSpreadPaise / 100,
        minKm: s.minDistanceMExclusive / 1000,
        maxKm: s.maxDistanceMInclusive / 1000,
        displayRange: this.rangeLabel(s),
        active: s.active,
        sortOrder: s.sortOrder,
      } as DistancePricingSlabDto;
    });
    return {
      id: plan.id,
      vehicleCategory: plan.vehicleCategory,
      version: plan.version,
      name: plan.name,
      status: plan.status,
      effectiveFrom: plan.effectiveFrom ? new Date(plan.effectiveFrom).toISOString() : null,
      effectiveTo: plan.effectiveTo ? new Date(plan.effectiveTo).toISOString() : null,
      createdBy: plan.createdBy,
      publishedBy: plan.publishedBy,
      publishedAt: plan.publishedAt ? new Date(plan.publishedAt).toISOString() : null,
      createdAt: plan.createdAt ? new Date(plan.createdAt).toISOString() : null,
      updatedAt: plan.updatedAt ? new Date(plan.updatedAt).toISOString() : null,
      slabs,
      slabCount: slabs.length,
    } as any;
  }
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
