import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AuditService } from '../audit/audit.service';
import { H3Service } from '../locations/h3.service';
import {
  DRIVER_ZONAL_RATE_MATRIX,
  EXCLUDED_LOCALITY_NAMES,
  HUB_IDS,
  LOCALITY_ALIASES,
  LOCALITY_MASTER,
  OFFICE_HUBS,
  HubGeofenceAnchor,
  OfficeHubDefinition,
  OfficeHubId,
  REQUIRED_RATE_ROWS,
  SEED_EFFECTIVE_FROM,
  SEED_RATE_VERSION,
  TripDirection,
  VENDOR_ZONAL_RATE_MATRIX,
  ZONAL_VEHICLE_CLASSES,
  ZONE_IDS,
  ZONE_LABELS,
  ZonalVehicleClass,
  ZoneId,
  localityIdFor,
  normaliseLocalityKey,
} from './zonal-pricing.constants';
import {
  CreateRateCardVersionDto,
  UpdateLocalityDto,
  ZonalQuoteRequestDto,
} from './dto/zonal.dto';

export type RateAudience = 'VENDOR' | 'DRIVER';
export type LocalityStatus = 'VERIFIED' | 'PENDING_REVIEW' | 'INACTIVE';
export type ZonalViewer = 'VENDOR' | 'DRIVER' | 'ADMIN';

export type ZonalReviewReason =
  | 'BOTH_ENDPOINTS_IN_HUB'
  | 'NO_OFFICE_ENDPOINT'
  | 'OFFICE_PIN_OUTSIDE_SELECTED_HUB'
  | 'UNLISTED_LOCALITY'
  | 'LOCALITY_INACTIVE'
  | 'LOCALITY_PENDING_REVIEW'
  | 'PIN_OUTSIDE_LOCALITY'
  | 'LOCALITY_PIN_NOT_CONFIGURED';

export interface LocalityRecord {
  id: string;
  name: string;
  zoneId: ZoneId;
  aliases: string[];
  reviewStatus: LocalityStatus;
  centerLat: number | null;
  centerLng: number | null;
  h3IndexRes8: string | null;
  notes?: string | null;
  version: number;
}

interface RateCell {
  basePaise: number;
  escortMaxPaise: number;
}

interface LoadedRateCard {
  id: string | null;
  audience: RateAudience;
  version: string;
  effectiveFrom: string;
  rows: Map<string, RateCell>;
}

interface ActorContext {
  userId: string;
  role: string;
}

const CACHE_TTL_MS = 60_000;
const BOOKING_PIN_TOLERANCE_KM = 0.15;

const REVIEW_MESSAGES: Record<ZonalReviewReason, string> = {
  BOTH_ENDPOINTS_IN_HUB: 'Both pickup and drop are inside an office hub. Intra-hub trips need operations review.',
  NO_OFFICE_ENDPOINT: 'Neither pickup nor drop is inside an approved office hub. This route needs operations review.',
  OFFICE_PIN_OUTSIDE_SELECTED_HUB:
    'The office-side pin is not inside the selected office hub. Check the hub and trip direction, or request operations review.',
  UNLISTED_LOCALITY: 'This locality is not in the approved locality master. Forwarded to operations for manual pricing.',
  LOCALITY_INACTIVE: 'This locality is inactive until its pin or boundary is approved. Forwarded to operations for manual pricing.',
  LOCALITY_PENDING_REVIEW:
    'This locality is pending boundary verification and cannot produce an automatic quote. Forwarded to operations for manual pricing.',
  PIN_OUTSIDE_LOCALITY: 'The employee pin is outside the selected locality. Operations review is required before quoting.',
  LOCALITY_PIN_NOT_CONFIGURED: 'This locality has no verified pin yet. Operations review is required before quoting.',
};

const rowKey = (hubId: string, zoneId: string, vehicle: string) => `${hubId}|${zoneId}|${vehicle}`;
const toInr = (paise: number) => Math.round(paise) / 100;

@Injectable()
export class ZonalPricingService implements OnModuleInit {
  private readonly logger = new Logger(ZonalPricingService.name);

  private cards: Record<RateAudience, LoadedRateCard> = {
    VENDOR: this.buildSeedCard('VENDOR'),
    DRIVER: this.buildSeedCard('DRIVER'),
  };
  private localities = new Map<string, LocalityRecord>();
  private aliasIndex = new Map<string, string>();
  private hubGeofences = new Map<OfficeHubId, Set<string>>();
  private loadedAt = 0;

  constructor(
    private readonly db: DatabaseService,
    private readonly audit: AuditService,
    private readonly h3: H3Service,
  ) {
    this.buildHubGeofences();
    this.setLocalities(this.buildSeedLocalities());
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureSeedData();
      await this.reload();
    } catch (err: any) {
      this.logger.warn(`Zonal rate data could not be loaded from the database (${err.message}). Using built-in ${SEED_RATE_VERSION} card.`);
    }
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  private get quoteTtlMinutes(): number {
    const v = Number(process.env.ZONAL_QUOTE_TTL_MINUTES);
    return Number.isFinite(v) && v > 0 ? v : 15;
  }

  private get escortEnabled(): boolean {
    return process.env.ZONAL_ESCORT_ENABLED !== 'false';
  }

  private get requireLocalityPin(): boolean {
    return process.env.ZONAL_REQUIRE_LOCALITY_PIN === 'true';
  }

  private get localityPinKRing(): number {
    const v = Number(process.env.ZONAL_LOCALITY_PIN_KRING);
    return Number.isInteger(v) && v >= 0 ? v : 4;
  }

  private buildHubGeofences() {
    let overrides: Partial<Record<OfficeHubId, HubGeofenceAnchor[]>> = {};
    if (process.env.ZONAL_HUB_GEOFENCES) {
      try {
        overrides = JSON.parse(process.env.ZONAL_HUB_GEOFENCES);
      } catch (err: any) {
        this.logger.error(`Invalid ZONAL_HUB_GEOFENCES JSON (${err.message}); using built-in hub geofences`);
      }
    }
    for (const hub of OFFICE_HUBS) {
      const anchors = Array.isArray(overrides[hub.id]) && overrides[hub.id]!.length > 0 ? overrides[hub.id]! : hub.geofence;
      const cells = new Set<string>();
      for (const a of anchors) {
        const origin = this.h3.latLngToCell(Number(a.lat), Number(a.lng), 8);
        for (const c of this.h3.gridDisk(origin, Math.max(0, Math.min(6, Math.floor(Number(a.k) || 0))))) cells.add(c);
      }
      this.hubGeofences.set(hub.id, cells);
    }
  }

  // ---------------------------------------------------------------------------
  // Seed + load
  // ---------------------------------------------------------------------------

  private buildSeedCard(audience: RateAudience): LoadedRateCard {
    const rows = new Map<string, RateCell>();
    for (const hubId of HUB_IDS) {
      for (const zoneId of ZONE_IDS) {
        if (audience === 'VENDOR') {
          const cell = VENDOR_ZONAL_RATE_MATRIX[hubId][zoneId];
          rows.set(rowKey(hubId, zoneId, 'SEDAN'), { basePaise: cell.sedan * 100, escortMaxPaise: cell.escortSedan * 100 });
          rows.set(rowKey(hubId, zoneId, 'SUV'), { basePaise: cell.suv * 100, escortMaxPaise: cell.escortSuv * 100 });
        } else {
          const cell = DRIVER_ZONAL_RATE_MATRIX[hubId][zoneId];
          rows.set(rowKey(hubId, zoneId, 'SEDAN'), { basePaise: cell.sedan * 100, escortMaxPaise: 0 });
          rows.set(rowKey(hubId, zoneId, 'SUV'), { basePaise: cell.suv * 100, escortMaxPaise: 0 });
        }
      }
    }
    return { id: null, audience, version: SEED_RATE_VERSION, effectiveFrom: SEED_EFFECTIVE_FROM, rows };
  }

  private buildSeedLocalities(): LocalityRecord[] {
    const aliasesByName = new Map<string, string[]>();
    for (const [alias, target] of Object.entries(LOCALITY_ALIASES)) {
      aliasesByName.set(target, [...(aliasesByName.get(target) || []), alias]);
    }
    return LOCALITY_MASTER.map((l) => ({
      id: localityIdFor(l.name),
      name: l.name,
      zoneId: l.zoneId,
      aliases: aliasesByName.get(l.name) || [],
      reviewStatus: l.inactive ? 'INACTIVE' : l.requiresReview ? 'PENDING_REVIEW' : 'VERIFIED',
      centerLat: null,
      centerLng: null,
      h3IndexRes8: null,
      notes: l.notes ?? null,
      version: 1,
    }));
  }

  /** Idempotently seeds the 2026.1 VENDOR + DRIVER versions and the 240-record locality master. */
  async ensureSeedData(): Promise<void> {
    for (const audience of ['VENDOR', 'DRIVER'] as RateAudience[]) {
      const existing = await this.db.rateCardVersion.findUnique({
        where: { audience_version: { audience, version: SEED_RATE_VERSION } },
      });
      if (existing) continue;
      const seed = this.buildSeedCard(audience);
      await this.db.rateCardVersion.create({
        data: {
          version: seed.version,
          audience,
          status: 'ACTIVE',
          effectiveFrom: new Date(seed.effectiveFrom),
          publishedAt: new Date(),
          publishedBy: 'SYSTEM_SEED',
          notes: `Seeded from New Adok Rate Card 2026 (${audience === 'VENDOR' ? 'users.pdf' : 'driver.pdf'})`,
          rows: {
            create: [...seed.rows.entries()].map(([key, cell]) => {
              const [hubId, zoneId, vehicleType] = key.split('|');
              return { hubId, zoneId, vehicleType, baseAmountPaise: cell.basePaise, escortMaxPaise: cell.escortMaxPaise };
            }),
          },
        },
      });
      this.logger.log(`Seeded ${audience} zonal rate card ${seed.version} (${seed.rows.size} rows)`);
    }

    const seeded = this.buildSeedLocalities();
    const result = await this.db.localityMaster.createMany({
      data: seeded.map((l) => ({
        displayName: l.name,
        aliases: l.aliases,
        zoneId: l.zoneId,
        reviewStatus: l.reviewStatus,
        notes: l.notes ?? undefined,
      })),
      skipDuplicates: true,
    });
    if (result.count > 0) this.logger.log(`Seeded ${result.count} zonal localities`);
  }

  async reload(): Promise<void> {
    for (const audience of ['VENDOR', 'DRIVER'] as RateAudience[]) {
      const active = await this.db.rateCardVersion.findFirst({
        where: { audience, status: 'ACTIVE' },
        include: { rows: true },
        orderBy: { effectiveFrom: 'desc' },
      });
      if (!active) {
        this.logger.warn(`No ACTIVE ${audience} zonal rate card found; using built-in ${SEED_RATE_VERSION}`);
        continue;
      }
      const rows = new Map<string, RateCell>();
      for (const r of active.rows) {
        rows.set(rowKey(r.hubId, r.zoneId, r.vehicleType), {
          basePaise: r.baseAmountPaise,
          escortMaxPaise: audience === 'DRIVER' ? 0 : r.escortMaxPaise,
        });
      }
      if (rows.size !== REQUIRED_RATE_ROWS) {
        this.logger.error(`ACTIVE ${audience} card ${active.version} has ${rows.size} rows (expected ${REQUIRED_RATE_ROWS}); keeping previous card`);
        continue;
      }
      this.cards[audience] = {
        id: active.id,
        audience,
        version: active.version,
        effectiveFrom: active.effectiveFrom.toISOString(),
        rows,
      };
    }

    const dbLocalities = await this.db.localityMaster.findMany({ orderBy: { displayName: 'asc' } });
    if (dbLocalities.length > 0) {
      this.setLocalities(
        dbLocalities
          .filter((l) => !EXCLUDED_LOCALITY_NAMES.includes(l.displayName))
          .map((l) => ({
            id: localityIdFor(l.displayName),
            name: l.displayName,
            zoneId: l.zoneId as ZoneId,
            aliases: l.aliases || [],
            reviewStatus: l.reviewStatus as LocalityStatus,
            centerLat: l.centerLat !== null && l.centerLat !== undefined ? Number(l.centerLat) : null,
            centerLng: l.centerLng !== null && l.centerLng !== undefined ? Number(l.centerLng) : null,
            h3IndexRes8: l.h3IndexRes8 ?? null,
            notes: l.notes,
            version: (l as any).version ?? 1,
          })),
      );
    }
    this.loadedAt = Date.now();
  }

  private setLocalities(list: LocalityRecord[]) {
    this.localities = new Map(list.map((l) => [l.id, l]));
    this.aliasIndex = new Map();
    for (const l of list) {
      this.aliasIndex.set(normaliseLocalityKey(l.name), l.id);
      for (const a of l.aliases) this.aliasIndex.set(normaliseLocalityKey(a), l.id);
    }
  }

  private async ensureFresh(): Promise<void> {
    if (Date.now() - this.loadedAt < CACHE_TTL_MS) return;
    try {
      await this.reload();
    } catch (err: any) {
      this.loadedAt = Date.now();
      this.logger.warn(`Zonal cache refresh failed (${err.message}); serving cached card`);
    }
  }

  // ---------------------------------------------------------------------------
  // Lookups
  // ---------------------------------------------------------------------------

  normaliseVehicleClass(vehicleType: string | undefined | null): ZonalVehicleClass | null {
    const v = String(vehicleType || '').trim().toUpperCase();
    return (ZONAL_VEHICLE_CLASSES as string[]).includes(v) ? (v as ZonalVehicleClass) : null;
  }

  /** Exact name/alias lookup only. Never substring or nearest-match (PRD). */
  findLocality(idOrName: string): LocalityRecord | null {
    if (!idOrName) return null;
    const byId = this.localities.get(idOrName.trim().toUpperCase());
    if (byId) return byId;
    const viaAlias = this.aliasIndex.get(normaliseLocalityKey(idOrName));
    return viaAlias ? this.localities.get(viaAlias) || null : null;
  }

  isInHub(lat: number, lng: number, hubId: OfficeHubId): boolean {
    const cell = this.h3.latLngToCell(lat, lng, 8);
    return this.hubGeofences.get(hubId)?.has(cell) ?? false;
  }

  private hubContaining(lat: number, lng: number): OfficeHubId | null {
    return HUB_IDS.find((h) => this.isInHub(lat, lng, h)) ?? null;
  }

  private getCell(audience: RateAudience, hubId: string, zoneId: string, vehicle: ZonalVehicleClass): RateCell {
    const cell = this.cards[audience].rows.get(rowKey(hubId, zoneId, vehicle));
    if (!cell) {
      throw new BadRequestException(`No ${audience.toLowerCase()} rate for ${hubId} / ${zoneId} / ${vehicle}`);
    }
    return cell;
  }

  // ---------------------------------------------------------------------------
  // Public read models
  // ---------------------------------------------------------------------------

  private matrixFor(audience: RateAudience) {
    const out: Record<string, Record<string, Record<string, number>>> = {};
    for (const hubId of HUB_IDS) {
      out[hubId] = {};
      for (const zoneId of ZONE_IDS) {
        const sedan = this.getCell(audience, hubId, zoneId, 'SEDAN');
        const suv = this.getCell(audience, hubId, zoneId, 'SUV');
        out[hubId][zoneId] =
          audience === 'VENDOR'
            ? { sedan: toInr(sedan.basePaise), suv: toInr(suv.basePaise), escortSedan: toInr(sedan.escortMaxPaise), escortSuv: toInr(suv.escortMaxPaise) }
            : { sedan: toInr(sedan.basePaise), suv: toInr(suv.basePaise) };
      }
    }
    return out;
  }

  private publicLocality(l: LocalityRecord) {
    return {
      id: l.id,
      name: l.name,
      zoneId: l.zoneId,
      zoneLabel: ZONE_LABELS[l.zoneId],
      reviewStatus: l.reviewStatus,
      bookable: l.reviewStatus === 'VERIFIED',
      aliases: l.aliases,
      hasVerifiedPin: Boolean(l.h3IndexRes8),
      notes: l.notes ?? undefined,
    };
  }

  private hubsPublic() {
    return OFFICE_HUBS.map((h) => ({ id: h.id, displayName: h.displayName, lat: h.lat, lng: h.lng }));
  }

  async getVendorRateCard() {
    await this.ensureFresh();
    const card = this.cards.VENDOR;
    return {
      audience: 'VENDOR',
      version: card.version,
      effectiveFrom: card.effectiveFrom,
      currency: 'INR',
      hubs: this.hubsPublic(),
      zones: ZONE_IDS.map((id) => ({ id, label: ZONE_LABELS[id] })),
      matrix: this.matrixFor('VENDOR'),
      localities: [...this.localities.values()].map((l) => this.publicLocality(l)),
      notes: [
        'INR per vehicle for a standard one-way trip with one pickup and one drop.',
        'Zonal and kilometre pricing are mutually exclusive; fares are never added together.',
        'Escort amounts are ceilings applied only when an escort service is explicitly selected.',
        'No platform, gateway, surge or pickup-distance fee is added above the table.',
      ],
    };
  }

  async getDriverRateCard() {
    await this.ensureFresh();
    const card = this.cards.DRIVER;
    return {
      audience: 'DRIVER',
      version: card.version,
      effectiveFrom: card.effectiveFrom,
      currency: 'INR',
      hubs: this.hubsPublic(),
      zones: ZONE_IDS.map((id) => ({ id, label: ZONE_LABELS[id] })),
      matrix: this.matrixFor('DRIVER'),
      localities: [...this.localities.values()].map((l) => this.publicLocality(l)),
      notes: [
        'Fixed earnings per standard one-way trip, credited to your wallet once the trip is verified complete.',
        'No platform commission is deducted from these amounts.',
        'Escort, toll and other additions are paid only when shown as an approved line item before you accept.',
      ],
    };
  }

  async searchLocalities(query?: string) {
    await this.ensureFresh();
    const all = [...this.localities.values()];
    const q = normaliseLocalityKey(query || '');
    const matches = q
      ? all.filter((l) => normaliseLocalityKey(l.name).includes(q) || l.aliases.some((a) => normaliseLocalityKey(a).includes(q)))
      : all;
    return matches.map((l) => this.publicLocality(l));
  }

  // ---------------------------------------------------------------------------
  // Quote
  // ---------------------------------------------------------------------------

  async createQuote(dto: ZonalQuoteRequestDto, actor: ActorContext) {
    await this.ensureFresh();

    const vehicle = this.normaliseVehicleClass(dto.vehicleType);
    if (!vehicle) {
      throw new BadRequestException('Corporate zonal pricing is available for SEDAN and SUV only.');
    }
    const hub = OFFICE_HUBS.find((h) => h.id === dto.officeHubId) as OfficeHubDefinition | undefined;
    if (!hub) throw new BadRequestException('Unknown office hub');
    const direction = dto.direction as TripDirection;
    const hasEscort = Boolean(dto.hasEscort);
    if (hasEscort && !this.escortEnabled) {
      throw new BadRequestException('Escort service is not yet configured for automatic booking. Contact operations.');
    }

    const officePin = direction === 'INBOUND_TO_OFFICE' ? { lat: dto.dropLat, lng: dto.dropLng } : { lat: dto.pickupLat, lng: dto.pickupLng };
    const employeePin = direction === 'INBOUND_TO_OFFICE' ? { lat: dto.pickupLat, lng: dto.pickupLng } : { lat: dto.dropLat, lng: dto.dropLng };

    const locality = this.findLocality(dto.localityId);
    const resolved = {
      officeHub: { id: hub.id, displayName: hub.displayName },
      direction,
      vehicleType: vehicle,
      locality: locality
        ? { id: locality.id, name: locality.name, zoneId: locality.zoneId, zoneLabel: ZONE_LABELS[locality.zoneId] }
        : null,
    };

    const reviewReason = this.findReviewReason(hub.id, officePin, employeePin, dto, locality);
    if (reviewReason) {
      this.logger.warn(`Zonal quote requires ops review (${reviewReason}) for user ${actor.userId}, locality=${dto.localityId}`);
      await this.audit.log({
        userId: actor.userId,
        actorRole: actor.role,
        action: 'ZONAL_QUOTE_REVIEW_REQUIRED',
        entityType: 'ZONAL_QUOTE',
        entityId: locality?.id || String(dto.localityId).slice(0, 80),
        metadata: { reason: reviewReason, hubId: hub.id, direction, vehicle, pickup: [dto.pickupLat, dto.pickupLng], drop: [dto.dropLat, dto.dropLng] },
      });
      return {
        canAutoQuote: false,
        requiresOpsReview: true,
        reasonCode: reviewReason,
        reason: REVIEW_MESSAGES[reviewReason],
        ...resolved,
      };
    }

    const loc = locality as LocalityRecord;
    const vendorCell = this.getCell('VENDOR', hub.id, loc.zoneId, vehicle);
    const driverCell = this.getCell('DRIVER', hub.id, loc.zoneId, vehicle);

    const baseFarePaise = vendorCell.basePaise;
    const escortFarePaise = hasEscort ? vendorCell.escortMaxPaise : 0;
    const totalFarePaise = baseFarePaise + escortFarePaise;
    // Standard-trip cap: nothing may be added above base + selected escort ceiling (V AT06).
    if (totalFarePaise > vendorCell.basePaise + vendorCell.escortMaxPaise) {
      throw new BadRequestException('Quote exceeds the standard-trip cap');
    }
    const driverFarePaise = driverCell.basePaise;
    const platformFeePaise = baseFarePaise - driverFarePaise;
    const expiresAt = new Date(Date.now() + this.quoteTtlMinutes * 60_000);

    const snapshot = await this.db.zonalQuoteSnapshot.create({
      data: {
        requestedBy: actor.userId,
        rateVersion: this.cards.VENDOR.version,
        driverRateVersion: this.cards.DRIVER.version,
        direction,
        hubId: hub.id,
        localityId: loc.id,
        localityName: loc.name,
        zoneId: loc.zoneId,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropLat: dto.dropLat,
        dropLng: dto.dropLng,
        vehicleType: vehicle,
        hasEscort,
        baseFarePaise,
        escortFarePaise,
        totalFarePaise,
        driverFarePaise,
        platformFeePaise,
        expiresAt,
      },
    });

    return this.quoteView(snapshot, actor.role === 'ADMIN' ? 'ADMIN' : 'VENDOR');
  }

  private findReviewReason(
    hubId: OfficeHubId,
    officePin: { lat: number; lng: number },
    employeePin: { lat: number; lng: number },
    dto: ZonalQuoteRequestDto,
    locality: LocalityRecord | null,
  ): ZonalReviewReason | null {
    const pickupHub = this.hubContaining(dto.pickupLat, dto.pickupLng);
    const dropHub = this.hubContaining(dto.dropLat, dto.dropLng);
    if (pickupHub && dropHub) return 'BOTH_ENDPOINTS_IN_HUB';
    if (!pickupHub && !dropHub) return 'NO_OFFICE_ENDPOINT';
    if (!this.isInHub(officePin.lat, officePin.lng, hubId)) return 'OFFICE_PIN_OUTSIDE_SELECTED_HUB';

    if (!locality) return 'UNLISTED_LOCALITY';
    if (locality.reviewStatus === 'INACTIVE') return 'LOCALITY_INACTIVE';
    if (locality.reviewStatus === 'PENDING_REVIEW') return 'LOCALITY_PENDING_REVIEW';

    if (locality.h3IndexRes8) {
      const employeeCell = this.h3.latLngToCell(employeePin.lat, employeePin.lng, 8);
      const allowed = this.h3.gridDisk(locality.h3IndexRes8, this.localityPinKRing);
      if (!allowed.includes(employeeCell)) return 'PIN_OUTSIDE_LOCALITY';
    } else if (this.requireLocalityPin) {
      return 'LOCALITY_PIN_NOT_CONFIGURED';
    }
    return null;
  }

  /** Audience-filtered view of a stored quote. Vendors never see driver payout or margin; drivers never see vendor amounts. */
  quoteView(s: any, viewer: ZonalViewer) {
    const hub = OFFICE_HUBS.find((h) => h.id === s.hubId);
    const zoneLabel = ZONE_LABELS[s.zoneId as ZoneId] || s.zoneId;
    const common = {
      quoteId: s.id,
      canAutoQuote: true,
      requiresOpsReview: false,
      officeHub: { id: s.hubId, displayName: hub?.displayName || s.hubId },
      locality: { id: s.localityId, name: s.localityName || s.localityId, zoneId: s.zoneId, zoneLabel },
      direction: s.direction,
      vehicleType: s.vehicleType,
      currency: 'INR',
      expiresAt: s.expiresAt instanceof Date ? s.expiresAt.toISOString() : s.expiresAt,
    };

    if (viewer === 'DRIVER') {
      return {
        ...common,
        rateVersion: s.driverRateVersion,
        lineItems: [{ code: 'BASE', label: `${zoneLabel} ${common.officeHub.displayName} ${s.vehicleType} base earnings`, amount: toInr(s.driverFarePaise) }],
        offeredEarnings: toInr(s.driverFarePaise),
      };
    }

    const lineItems = [{ code: 'BASE', label: `${zoneLabel} · ${common.officeHub.displayName} · ${s.vehicleType} base fare`, amount: toInr(s.baseFarePaise) }];
    if (s.hasEscort) lineItems.push({ code: 'ESCORT', label: 'Security escort service (approved ceiling)', amount: toInr(s.escortFarePaise) });

    const vendorView = {
      ...common,
      rateVersion: s.rateVersion,
      hasEscort: s.hasEscort,
      lineItems,
      baseFare: toInr(s.baseFarePaise),
      escortFee: toInr(s.escortFarePaise),
      totalAmount: toInr(s.totalFarePaise),
    };
    if (viewer === 'VENDOR') return vendorView;

    return {
      ...vendorView,
      internal: {
        driverRateVersion: s.driverRateVersion,
        driverEarning: toInr(s.driverFarePaise),
        platformSpread: toInr(s.platformFeePaise),
        escortPayable: toInr(s.escortFarePaise),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Booking integration
  // ---------------------------------------------------------------------------

  /**
   * Validates a stored quote before it is consumed by a booking. Returns the snapshot, or
   * `alreadyBookedRequirementId` when the same vendor resubmits a quote they already booked.
   */
  async validateQuoteForBooking(
    quoteId: string,
    userId: string,
    booking: { vehicleType: string; pickupLat: number; pickupLng: number; dropLat: number; dropLng: number },
  ): Promise<{ snapshot: any; alreadyBookedRequirementId?: string }> {
    const snapshot = await this.db.zonalQuoteSnapshot.findUnique({ where: { id: quoteId } });
    if (!snapshot) throw new NotFoundException('Zonal quote not found. Request a new quote.');
    if (snapshot.requestedBy !== userId) throw new ForbiddenException('This quote belongs to another account.');
    if (snapshot.requirementId) return { snapshot, alreadyBookedRequirementId: snapshot.requirementId };
    if (snapshot.expiresAt.getTime() < Date.now()) {
      throw new GoneException('This quote has expired. Refresh the quote and confirm the new fare.');
    }
    if (this.normaliseVehicleClass(booking.vehicleType) !== snapshot.vehicleType) {
      throw new BadRequestException('Vehicle category differs from the quote. Request a revised quote.');
    }
    const moved =
      this.distanceKm(Number(snapshot.pickupLat), Number(snapshot.pickupLng), booking.pickupLat, booking.pickupLng) > BOOKING_PIN_TOLERANCE_KM ||
      this.distanceKm(Number(snapshot.dropLat), Number(snapshot.dropLng), booking.dropLat, booking.dropLng) > BOOKING_PIN_TOLERANCE_KM;
    if (moved) {
      throw new BadRequestException('Pickup or drop differs from the quoted route. Request a revised quote.');
    }
    return { snapshot };
  }

  /** Atomically binds a quote to a requirement inside the booking transaction. */
  async consumeQuote(tx: any, quoteId: string, requirementId: string): Promise<void> {
    const res = await tx.zonalQuoteSnapshot.updateMany({
      where: { id: quoteId, requirementId: null },
      data: { requirementId, consumedAt: new Date() },
    });
    if (res.count !== 1) throw new ConflictException('This quote has already been used for a booking.');
  }

  private distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ---------------------------------------------------------------------------
  // Administration
  // ---------------------------------------------------------------------------

  async listVersions(audience?: RateAudience) {
    const versions = await this.db.rateCardVersion.findMany({
      where: audience ? { audience } : undefined,
      include: { rows: true },
      orderBy: [{ audience: 'asc' }, { createdAt: 'desc' }],
    });
    return versions.map((v) => ({
      id: v.id,
      audience: v.audience,
      version: v.version,
      status: v.status,
      effectiveFrom: v.effectiveFrom.toISOString(),
      publishedAt: v.publishedAt?.toISOString() ?? null,
      publishedBy: v.publishedBy ?? null,
      notes: v.notes,
      rowCount: v.rows.length,
      rows: v.rows.map((r) => ({
        hubId: r.hubId,
        zoneId: r.zoneId,
        vehicleType: r.vehicleType,
        baseAmountPaise: r.baseAmountPaise,
        escortMaxPaise: r.escortMaxPaise,
      })),
    }));
  }

  async createDraftVersion(dto: CreateRateCardVersionDto, actor: ActorContext) {
    const keys = new Set(dto.rows.map((r) => rowKey(r.hubId, r.zoneId, r.vehicleType)));
    if (keys.size !== REQUIRED_RATE_ROWS || dto.rows.length !== REQUIRED_RATE_ROWS) {
      throw new BadRequestException(`A rate card needs exactly ${REQUIRED_RATE_ROWS} unique hub/zone/vehicle rows.`);
    }
    const exists = await this.db.rateCardVersion.findFirst({ where: { audience: dto.audience, version: dto.version } });
    if (exists) throw new ConflictException(`${dto.audience} version ${dto.version} already exists. Versions are immutable.`);

    const created = await this.db.rateCardVersion.create({
      data: {
        audience: dto.audience,
        version: dto.version,
        status: 'DRAFT',
        effectiveFrom: new Date(dto.effectiveFrom),
        notes: dto.reason,
        rows: {
          create: dto.rows.map((r) => ({
            hubId: r.hubId,
            zoneId: r.zoneId,
            vehicleType: r.vehicleType,
            baseAmountPaise: r.baseAmountPaise,
            // Drivers never inherit the vendor escort surcharge.
            escortMaxPaise: dto.audience === 'DRIVER' ? 0 : r.escortMaxPaise ?? 0,
          })),
        },
      },
    });
    await this.audit.log({
      userId: actor.userId,
      actorRole: actor.role,
      action: 'RATE_CARD_DRAFT_CREATED',
      entityType: 'RATE_CARD_VERSION',
      entityId: created.id,
      metadata: { audience: dto.audience, version: dto.version, reason: dto.reason },
    });
    return { id: created.id, audience: created.audience, version: created.version, status: created.status };
  }

  /** Publishes a DRAFT, or rolls back to a RETIRED version. The previous ACTIVE version is retired. */
  async publishVersion(id: string, reason: string, actor: ActorContext) {
    const target = await this.db.rateCardVersion.findUnique({ where: { id }, include: { rows: true } });
    if (!target) throw new NotFoundException('Rate card version not found');
    if (target.status === 'ACTIVE') throw new ConflictException('This version is already active');

    const keys = new Set(target.rows.map((r) => rowKey(r.hubId, r.zoneId, r.vehicleType)));
    const valid =
      target.rows.length === REQUIRED_RATE_ROWS &&
      keys.size === REQUIRED_RATE_ROWS &&
      target.rows.every(
        (r) =>
          (HUB_IDS as string[]).includes(r.hubId) &&
          (ZONE_IDS as string[]).includes(r.zoneId) &&
          (ZONAL_VEHICLE_CLASSES as string[]).includes(r.vehicleType) &&
          Number.isInteger(r.baseAmountPaise) &&
          r.baseAmountPaise >= 0 &&
          Number.isInteger(r.escortMaxPaise) &&
          r.escortMaxPaise >= 0,
      );
    if (!valid) throw new BadRequestException('Incomplete or invalid rate card versions cannot be published.');

    const previous = await this.db.rateCardVersion.findFirst({ where: { audience: target.audience, status: 'ACTIVE' } });
    await this.db.$transaction(async (tx) => {
      await tx.rateCardVersion.updateMany({ where: { audience: target.audience, status: 'ACTIVE' }, data: { status: 'RETIRED' } });
      await tx.rateCardVersion.update({
        where: { id },
        data: { status: 'ACTIVE', publishedAt: new Date(), publishedBy: actor.userId },
      });
    });

    await this.audit.log({
      userId: actor.userId,
      actorRole: actor.role,
      action: target.status === 'RETIRED' ? 'RATE_CARD_ROLLED_BACK' : 'RATE_CARD_PUBLISHED',
      entityType: 'RATE_CARD_VERSION',
      entityId: id,
      metadata: {
        audience: target.audience,
        reason,
        previousVersion: previous?.version ?? null,
        newVersion: target.version,
      },
    });
    await this.reload();
    return { id, audience: target.audience, version: target.version, status: 'ACTIVE', previousVersion: previous?.version ?? null };
  }

  async updateLocality(localityId: string, dto: UpdateLocalityDto, actor: ActorContext) {
    await this.ensureFresh();
    const current = this.localities.get(localityId.toUpperCase());
    if (!current) throw new NotFoundException('Locality not found');
    if ((dto.centerLat === undefined) !== (dto.centerLng === undefined)) {
      throw new BadRequestException('centerLat and centerLng must be provided together');
    }

    const data: Record<string, unknown> = { version: { increment: 1 } };
    if (dto.reviewStatus) data.reviewStatus = dto.reviewStatus;
    if (dto.zoneId) data.zoneId = dto.zoneId;
    if (dto.aliases) data.aliases = dto.aliases.map((a) => a.trim()).filter(Boolean);
    if (dto.centerLat !== undefined && dto.centerLng !== undefined) {
      data.centerLat = dto.centerLat;
      data.centerLng = dto.centerLng;
      data.h3IndexRes8 = this.h3.latLngToCell(dto.centerLat, dto.centerLng, 8);
    }

    await this.db.localityMaster.update({ where: { displayName: current.name }, data });
    await this.audit.log({
      userId: actor.userId,
      actorRole: actor.role,
      action: 'ZONAL_LOCALITY_UPDATED',
      entityType: 'LOCALITY',
      entityId: current.id,
      metadata: {
        reason: dto.reason,
        previous: { reviewStatus: current.reviewStatus, zoneId: current.zoneId, centerLat: current.centerLat, centerLng: current.centerLng, aliases: current.aliases },
        next: { reviewStatus: dto.reviewStatus, zoneId: dto.zoneId, centerLat: dto.centerLat, centerLng: dto.centerLng, aliases: dto.aliases },
      },
    });
    await this.reload();
    return this.publicLocality(this.localities.get(current.id) as LocalityRecord);
  }
}
