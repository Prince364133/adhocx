import {
  BadRequestException,
  Optional,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AdminRunDriverDigioSuiteDto,
  AnalyzeStoredIdCardDto,
  AuthUserDto,
  CreateDigilockerRequestDto,
  FaceMatchStoredDto,
  FuzzyMatchDto,
  LivenessStoredDto,
  ManageDigilockerApprovalDto,
  MaskStoredAadhaarDto,
  SearchUpiVpaDto,
  UserRole,
  VerifyBankAccountDto,
  VerifyCinDto,
  VerifyDinDto,
  VerifyDrivingLicenseDto,
  VerifyFssaiDto,
  VerifyGstDto,
  VerifyIfscDto,
  VerifyKraPanDto,
  VerifyPanDto,
  VerifyPanToGstDto,
  VerifyPassportDto,
  VerifyUanDto,
  VerifyUdyamDto,
  VerifyUpiVpaDto,
  VerifyVehicleRcDto,
  VerifyVoterIdDto,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../../common/storage/storage.service';
import { DigioClient, DigioFilePart } from './digio.client';
import { RedisService } from '../../redis/redis.service';

interface TargetActorContext {
  userId: string;
  driverId?: string;
  vendorId?: string;
  tenantId?: string;
}

/** Liveness score (0-100) treated as live when Digio returns no explicit verdict. */
export const LIVENESS_PASS_SCORE = 50;
export const AADHAAR_CONSENT_TYPE = 'AADHAAR_CONSENT';
export const AADHAAR_CONSENT_REQUIRED = 'AADHAAR_CONSENT_REQUIRED';
/** Consent is re-confirmed yearly. */
export const AADHAAR_CONSENT_VALID_DAYS = 365;

/** True when an ID OCR request may contain Aadhaar (no explicit list means Digio's default, which includes it). */
export function mayInvolveAadhaar(expectedIds?: string[] | null): boolean {
  if (!expectedIds || expectedIds.length === 0) return true;
  return expectedIds.some((t) => /AADHAAR/i.test(String(t)));
}

@Injectable()
export class DigioService {
  private readonly logger = new Logger(DigioService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly digioClient: DigioClient,
    private readonly storageService: StorageService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  // ---------------------------------------------------------------------------
  // Sanitization, Masking & Compliance Helpers
  // ---------------------------------------------------------------------------

  private maskAadhaarInText(text: string): string {
    return text.replace(
      /(?<![A-Za-z0-9])(\d{4})[\s-]?(\d{4})[\s-]?(\d{4})(?![\d])/g,
      'XXXX-XXXX-$3',
    );
  }

  private maskAccountNumber(accountNo: string): string {
    const clean = accountNo.trim();
    if (clean.length <= 4) return 'XXXX';
    return `${'X'.repeat(clean.length - 4)}${clean.slice(-4)}`;
  }

  private sanitizePayload(value: unknown, depth = 0): any {
    if (depth > 8 || value === null || value === undefined) return value;
    if (typeof value === 'string') {
      // Do not truncate large base64 data into rawResponse DB JSON — replace huge image strings with indicator
      if (value.length > 4000) {
        return `[BASE64_OMITTED:${value.length}_chars]`;
      }
      return this.maskAadhaarInText(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizePayload(item, depth + 1));
    }
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const lk = k.toLowerCase();
        if (lk === 'client_secret' || lk === 'authorization') continue;
        if (
          (lk.includes('account_no') || lk === 'beneficiary_account_no') &&
          typeof v === 'string'
        ) {
          out[k] = this.maskAccountNumber(v);
        } else {
          out[k] = this.sanitizePayload(v, depth + 1);
        }
      }
      return out;
    }
    return value;
  }

  private normalizeDob(rawDob: string): string {
    const trimmed = rawDob.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-');
      return `${d}/${m}/${y}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
      return trimmed.replace(/-/g, '/');
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      const dd = String(parsed.getUTCDate()).padStart(2, '0');
      const mm = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = parsed.getUTCFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
    return trimmed;
  }

  private parseFlexibleDate(value?: string | null): Date | null {
    if (!value || typeof value !== 'string') return null;
    const v = value.trim();
    if (!v || v.toUpperCase() === 'NA' || v.toUpperCase() === 'N/A') {
      return null;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      const d = new Date(
        Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 23, 59, 59),
      );
      return Number.isNaN(d.getTime()) ? null : d;
    }

    // YYYY-MM-DD
    const ymd = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (ymd) {
      const d = new Date(
        Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 23, 59, 59),
      );
      return Number.isNaN(d.getTime()) ? null : d;
    }

    // Fallback for formats like 31-Dec-2030 or ISO
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private isFutureOrToday(date: Date | null): boolean {
    if (!date) return true;
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    return date.getTime() >= todayStart.getTime();
  }

  private evaluateDlCompliance(res: any) {
    const statusText = String(
      res?.['Current Status'] || res?.status || res?.current_status || '',
    ).trim();
    const holderName = String(
      res?.["Holder's Name"] || res?.name || res?.holder_name || '',
    ).trim();

    const transportRaw = res?.Transport || res?.transport_validity;
    const nonTransportRaw = res?.['Non-Transport'] || res?.non_transport_validity;

    const extractToDate = (block: any): Date | null => {
      if (!block) return null;
      if (typeof block === 'string') return this.parseFlexibleDate(block);
      return this.parseFlexibleDate(block.To || block.to || block.valid_to);
    };

    const transportExpiry = extractToDate(transportRaw);
    const nonTransportExpiry = extractToDate(nonTransportRaw);
    const effectiveExpiry = transportExpiry || nonTransportExpiry;

    const notes: string[] = [];
    let complianceOk = true;

    if (
      statusText &&
      !statusText.toUpperCase().includes('ACTIVE') &&
      !statusText.toUpperCase().includes('VALID')
    ) {
      complianceOk = false;
      notes.push(`DL status is "${statusText}"`);
    }
    if (effectiveExpiry && !this.isFutureOrToday(effectiveExpiry)) {
      complianceOk = false;
      notes.push(`DL expired on ${effectiveExpiry.toISOString().slice(0, 10)}`);
    }
    if (!transportExpiry && nonTransportExpiry) {
      notes.push('Non-Transport (LMV) validity verified; Commercial/Transport class not listed');
    } else if (transportExpiry) {
      notes.push(`Commercial/Transport DL valid till ${transportExpiry.toISOString().slice(0, 10)}`);
    }

    const covDetails =
      res?.['COV Details'] || res?.cov_details || res?.vehicle_classes || [];

    return {
      verified: Boolean(holderName || statusText || effectiveExpiry),
      verifiedName: holderName || null,
      complianceOk,
      complianceNotes: notes.join('; ') || 'DL verified cleanly',
      expiresAt: effectiveExpiry,
      summary: {
        dlNumber: res?.['Old / New DL No.'] || res?.dl_number || res?.id_no,
        holderName,
        status: statusText || 'VERIFIED',
        issueDate: res?.['Date of Issue'] || res?.issue_date,
        nonTransportValidTo: nonTransportExpiry?.toISOString().slice(0, 10) || null,
        transportValidTo: transportExpiry?.toISOString().slice(0, 10) || null,
        covDetails,
      },
    };
  }

  private evaluateRcCompliance(res: any) {
    const user = res?.user_details || {};
    const veh = res?.vehicle_details || {};
    const fin = res?.finance_details || {};
    const permit = res?.permit_details || {};

    const ownerName = String(user?.owner_name || user?.name || '').trim();
    const rcStatus = String(veh?.rc_status || '').trim();
    const blacklist = String(permit?.blacklist_status || '').trim();

    const fitUpto = this.parseFlexibleDate(veh?.fit_up_to);
    const insuranceUpto = this.parseFlexibleDate(fin?.insurance_upto);
    const taxUpto = this.parseFlexibleDate(fin?.tax_upto);
    const permitUpto = this.parseFlexibleDate(
      permit?.national_permit_upto || permit?.permit_valid_upto,
    );
    const puccUpto = this.parseFlexibleDate(permit?.pucc_upto);

    const issues: string[] = [];
    if (rcStatus && rcStatus.toUpperCase() !== 'ACTIVE') {
      issues.push(`RC status is "${rcStatus}"`);
    }
    if (
      blacklist &&
      blacklist.toUpperCase() !== 'NA' &&
      blacklist.toUpperCase() !== 'NO' &&
      blacklist.toUpperCase() !== 'NONE'
    ) {
      issues.push(`Vehicle flagged in blacklist: ${blacklist}`);
    }
    if (fitUpto && !this.isFutureOrToday(fitUpto)) {
      issues.push(`Fitness expired on ${fitUpto.toISOString().slice(0, 10)}`);
    }
    if (insuranceUpto && !this.isFutureOrToday(insuranceUpto)) {
      issues.push(`Insurance expired on ${insuranceUpto.toISOString().slice(0, 10)}`);
    }
    if (puccUpto && !this.isFutureOrToday(puccUpto)) {
      issues.push(`PUCC expired on ${puccUpto.toISOString().slice(0, 10)}`);
    }
    if (permitUpto && !this.isFutureOrToday(permitUpto)) {
      issues.push(`Permit expired on ${permitUpto.toISOString().slice(0, 10)}`);
    }

    const dates = [fitUpto, insuranceUpto, permitUpto, puccUpto, taxUpto].filter(
      (d): d is Date => Boolean(d),
    );
    const earliestExpiry = dates.length
      ? new Date(Math.min(...dates.map((d) => d.getTime())))
      : null;

    const complianceOk = issues.length === 0;
    const challans = Array.isArray(veh?.challan_details) ? veh.challan_details : [];

    return {
      verified: Boolean(veh?.rc_number || ownerName),
      verifiedName: ownerName || null,
      complianceOk,
      complianceNotes: complianceOk
        ? 'RC active; fitness, insurance & permit checks passed'
        : issues.join('; '),
      expiresAt: earliestExpiry,
      insuranceUpto,
      summary: {
        rcNumber: veh?.rc_number,
        ownerName,
        rcStatus: rcStatus || 'ACTIVE',
        vehicleCategory: veh?.vehicle_category,
        makerModel: [veh?.maker_description, veh?.maker_model]
          .filter(Boolean)
          .join(' '),
        fuelType: veh?.fuel_type,
        color: veh?.color,
        normsType: veh?.norms_type,
        seatCapacity: veh?.seat_capacity,
        registeredAt: veh?.registered_at,
        registrationDate: veh?.registration_date,
        fitUpto: veh?.fit_up_to,
        financier: fin?.financier,
        financed: fin?.financed,
        insuranceCompany: fin?.insurance_company,
        insurancePolicyNumber: fin?.insurance_policy_number,
        insuranceUpto: fin?.insurance_upto,
        taxUpto: fin?.tax_upto,
        permitType: permit?.permit_type,
        permitNumber: permit?.permit_number,
        permitValidUpto: permit?.permit_valid_upto,
        nationalPermitNumber: permit?.national_permit_number,
        nationalPermitUpto: permit?.national_permit_upto,
        puccUpto: permit?.pucc_upto,
        blacklistStatus: blacklist || 'NONE',
        challanCount: challans.length,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Target Ownership & Database Persistence
  // ---------------------------------------------------------------------------

  private async resolveContext(
    actor: AuthUserDto,
    targetDriverId?: string,
    targetVendorId?: string,
    vehicleId?: string,
  ): Promise<TargetActorContext> {
    const ctx: TargetActorContext = {
      userId: actor.id,
      tenantId: (actor as any).tenantId || undefined,
    };

    if (actor.role === UserRole.ADMIN) {
      if (targetDriverId) {
        const drv = await this.db.driver.findUnique({
          where: { id: targetDriverId },
          select: { id: true, userId: true },
        });
        if (!drv) throw new NotFoundException('Target driver not found');
        ctx.driverId = drv.id;
        ctx.userId = drv.userId;
      }
      if (targetVendorId) {
        const vnd = await this.db.vendor.findUnique({
          where: { id: targetVendorId },
          select: { id: true, userId: true },
        });
        if (!vnd) throw new NotFoundException('Target vendor not found');
        ctx.vendorId = vnd.id;
        ctx.userId = vnd.userId;
      }
      if (!ctx.driverId && !ctx.vendorId && vehicleId) {
        const veh = await this.db.vehicle.findUnique({
          where: { id: vehicleId },
          select: { driverId: true },
        });
        if (veh?.driverId) {
          ctx.driverId = veh.driverId;
        }
      }
      return ctx;
    }

    if (targetDriverId || targetVendorId) {
      const ownDriver = await this.db.driver.findUnique({
        where: { userId: actor.id },
        select: { id: true },
      });
      const ownVendor = await this.db.vendor.findUnique({
        where: { userId: actor.id },
        select: { id: true },
      });
      if (targetDriverId && ownDriver?.id !== targetDriverId) {
        throw new ForbiddenException('Cannot verify documents for another driver');
      }
      if (targetVendorId && ownVendor?.id !== targetVendorId) {
        throw new ForbiddenException('Cannot verify documents for another vendor');
      }
    }

    const driver = await this.db.driver.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });
    if (driver) {
      ctx.driverId = driver.id;
    }

    const vendor = await this.db.vendor.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });
    if (vendor) {
      ctx.vendorId = vendor.id;
    }

    return ctx;
  }

  private async saveVerificationRecord(params: {
    ctx: TargetActorContext;
    verificationType: string;
    category: string;
    status: string;
    verified: boolean;
    identifier?: string | null;
    uniqueRequestId: string;
    digioRequestId?: string | null;
    referenceId?: string | null;
    verifiedName?: string | null;
    matchScore?: number | null;
    complianceOk?: boolean | null;
    complianceNotes?: string | null;
    errorMessage?: string | null;
    summary?: Record<string, unknown> | null;
    rawResponse?: unknown;
    expiresAt?: Date | null;
    vehicleId?: string | null;
  }) {
    const safeIdentifier = params.identifier
      ? this.maskAadhaarInText(params.identifier)
      : null;
    const safeSummary = params.summary
      ? (this.sanitizePayload(params.summary) as Record<string, unknown>)
      : null;
    const safeRaw =
      params.rawResponse !== undefined
        ? this.sanitizePayload(params.rawResponse)
        : undefined;

    const record = await this.db.digioVerification.create({
      data: {
        tenantId: params.ctx.tenantId || null,
        userId: params.ctx.userId || null,
        driverId: params.ctx.driverId || null,
        vendorId: params.ctx.vendorId || null,
        vehicleId: params.vehicleId || null,
        verificationType: params.verificationType,
        category: params.category,
        status: params.status,
        verified: params.verified,
        identifier: safeIdentifier,
        uniqueRequestId: params.uniqueRequestId,
        digioRequestId: params.digioRequestId || null,
        referenceId: params.referenceId || null,
        verifiedName: params.verifiedName || null,
        matchScore: params.matchScore ?? null,
        complianceOk: params.complianceOk ?? null,
        complianceNotes: params.complianceNotes || null,
        errorMessage: params.errorMessage || null,
        summary: (safeSummary as any) ?? undefined,
        rawResponse: safeRaw ?? undefined,
        verifiedAt: params.verified ? new Date() : null,
        expiresAt: params.expiresAt || null,
      },
    });

    if (params.ctx.driverId) {
      await this.syncDriverDigioMetadata(params.ctx.driverId, params.verificationType, {
        verificationId: record.id,
        verified: record.verified,
        status: record.status,
        identifier: record.identifier,
        verifiedName: record.verifiedName,
        matchScore: record.matchScore,
        complianceOk: record.complianceOk,
        complianceNotes: record.complianceNotes,
        summary: record.summary,
        verifiedAt: record.verifiedAt?.toISOString() || null,
        expiresAt: record.expiresAt?.toISOString() || null,
      });
    }

    if (params.ctx.vendorId) {
      await this.syncVendorDigioMetadata(params.ctx.vendorId, params.verificationType, {
        verificationId: record.id,
        verified: record.verified,
        status: record.status,
        identifier: record.identifier,
        verifiedName: record.verifiedName,
        complianceOk: record.complianceOk,
        complianceNotes: record.complianceNotes,
        summary: record.summary,
        verifiedAt: record.verifiedAt?.toISOString() || null,
      });
    }

    return this.formatRecord(record);
  }

  private async syncDriverDigioMetadata(
    driverId: string,
    key: string,
    entry: Record<string, unknown>,
  ) {
    try {
      const driver = await this.db.driver.findUnique({
        where: { id: driverId },
        select: { kycDocuments: true },
      });
      if (!driver) return;

      const base: Record<string, any> =
        driver.kycDocuments && typeof driver.kycDocuments === 'object' && !Array.isArray(driver.kycDocuments)
          ? { ...(driver.kycDocuments as Record<string, any>) }
          : Array.isArray(driver.kycDocuments)
            ? { legacyDocuments: driver.kycDocuments }
            : {};

      const existingDigio =
        base.digioVerifications && typeof base.digioVerifications === 'object'
          ? { ...base.digioVerifications }
          : {};

      existingDigio[key] = entry;
      base.digioVerifications = existingDigio;

      await this.db.driver.update({
        where: { id: driverId },
        data: { kycDocuments: base },
      });
    } catch (err: any) {
      this.logger.warn(`Unable to sync driver Digio metadata: ${err?.message}`);
    }
  }

  private async syncVendorDigioMetadata(
    vendorId: string,
    key: string,
    entry: Record<string, unknown>,
  ) {
    try {
      const vendor = await this.db.vendor.findUnique({
        where: { id: vendorId },
        select: { kycDocuments: true },
      });
      if (!vendor) return;

      const base =
        vendor.kycDocuments && typeof vendor.kycDocuments === 'object' && !Array.isArray(vendor.kycDocuments)
          ? { ...(vendor.kycDocuments as Record<string, any>) }
          : {};

      const existingDigio =
        base.digioVerifications && typeof base.digioVerifications === 'object'
          ? { ...base.digioVerifications }
          : {};

      existingDigio[key] = entry;
      base.digioVerifications = existingDigio;

      await this.db.vendor.update({
        where: { id: vendorId },
        data: { kycDocuments: base },
      });
    } catch (err: any) {
      this.logger.warn(`Unable to sync vendor Digio metadata: ${err?.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Aadhaar consent (UIDAI / DPDP): recorded once per driver, required before any Aadhaar processing
  // ---------------------------------------------------------------------------

  /** Records the driver's explicit consent to Aadhaar processing (who, when, which text, from where). */
  async recordAadhaarConsent(
    actor: AuthUserDto,
    dto: { accepted: boolean; textVersion: string },
    meta: { ip?: string | null; userAgent?: string | null } = {},
  ) {
    if (dto?.accepted !== true) {
      throw new BadRequestException('Consent must be explicitly accepted');
    }
    const textVersion = String(dto.textVersion || '').trim();
    if (!/^[A-Z0-9_.-]{3,64}$/i.test(textVersion)) {
      throw new BadRequestException('textVersion identifies the consent text shown to the driver');
    }
    const ctx = await this.resolveContext(actor);
    const grantedAt = new Date();
    return this.saveVerificationRecord({
      ctx,
      verificationType: AADHAAR_CONSENT_TYPE,
      category: 'CONSENT',
      status: 'GRANTED',
      verified: true,
      uniqueRequestId: this.digioClient.generateUniqueRequestId('CONSENT'),
      complianceOk: true,
      complianceNotes: `Aadhaar processing consent ${textVersion}`,
      summary: {
        textVersion,
        grantedAt: grantedAt.toISOString(),
        ip: meta.ip || null,
        userAgent: meta.userAgent ? String(meta.userAgent).slice(0, 256) : null,
      },
      expiresAt: new Date(grantedAt.getTime() + AADHAAR_CONSENT_VALID_DAYS * 86_400_000),
    });
  }

  async getAadhaarConsent(actor: AuthUserDto) {
    const ctx = await this.resolveContext(actor);
    const row = await this.findAadhaarConsent(ctx);
    const summary = (row?.summary as Record<string, any>) || {};
    return {
      granted: Boolean(row),
      grantedAt: row ? (summary.grantedAt ?? row.createdAt.toISOString()) : null,
      textVersion: row ? (summary.textVersion ?? null) : null,
    };
  }

  private async findAadhaarConsent(ctx: TargetActorContext) {
    const owners = [
      ...(ctx.driverId ? [{ driverId: ctx.driverId }] : []),
      ...(ctx.userId ? [{ userId: ctx.userId }] : []),
    ];
    if (!owners.length) return null;
    return this.db.digioVerification.findFirst({
      where: {
        verificationType: AADHAAR_CONSENT_TYPE,
        verified: true,
        OR: owners,
        createdAt: { gte: new Date(Date.now() - AADHAAR_CONSENT_VALID_DAYS * 86_400_000) },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Aadhaar may only be sent to Digio with the driver's recorded consent. Applies to admin-initiated
   * actions too: an admin cannot consent on the driver's behalf.
   */
  private async assertAadhaarConsent(ctx: TargetActorContext): Promise<void> {
    if (await this.findAadhaarConsent(ctx)) return;
    throw new BadRequestException({
      message: 'The driver has not consented to Aadhaar verification yet. Ask them to accept the consent in the app.',
      error: AADHAAR_CONSENT_REQUIRED,
      details: { consentEndpoint: 'POST /kyc/digio/consent' },
    });
  }

  /**
   * Billing control: a driver re-running an identifier check (same type + identifier, same owner)
   * gets the earlier VERIFIED result instead of a new billed Digio call, while that result is
   * younger than DIGIO_REUSE_DAYS (default 30) and not past its own expiry. Admin re-runs always
   * call Digio (an admin re-verifying wants fresh data).
   */
  private async findReusableResult(
    actor: AuthUserDto,
    ctx: TargetActorContext,
    verificationType: string,
    identifier: string,
    matches?: (summary: Record<string, any>) => boolean,
  ) {
    if (actor.role === UserRole.ADMIN || !identifier) return null;
    const owners = [
      ...(ctx.driverId ? [{ driverId: ctx.driverId }] : []),
      ...(ctx.vendorId ? [{ vendorId: ctx.vendorId }] : []),
      ...(!ctx.driverId && !ctx.vendorId && ctx.userId ? [{ userId: ctx.userId }] : []),
    ];
    if (!owners.length) return null;
    const days = Number(process.env.DIGIO_REUSE_DAYS);
    const reuseDays = Number.isFinite(days) && days >= 0 ? days : 30;
    if (reuseDays === 0) return null;
    const now = new Date();
    const row: any = await this.db.digioVerification.findFirst({
      where: {
        verificationType,
        identifier,
        status: 'VERIFIED',
        verified: true,
        OR: owners,
        createdAt: { gte: new Date(now.getTime() - reuseDays * 86_400_000) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;
    if (row.expiresAt && row.expiresAt.getTime() <= now.getTime()) return null;
    if (matches && !matches((row.summary as Record<string, any>) || {})) return null;
    return { ...this.formatRecord(row), reused: true };
  }

  private formatRecord(row: any) {
    return {
      id: row.id,
      verificationType: row.verificationType,
      category: row.category,
      status: row.status,
      verified: Boolean(row.verified),
      identifier: row.identifier ?? null,
      uniqueRequestId: row.uniqueRequestId,
      digioRequestId: row.digioRequestId ?? null,
      verifiedName: row.verifiedName ?? null,
      matchScore: row.matchScore ?? null,
      complianceOk: row.complianceOk ?? null,
      complianceNotes: row.complianceNotes ?? null,
      errorMessage: row.errorMessage ?? null,
      summary: row.summary ?? null,
      verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Overview & History Queries
  // ---------------------------------------------------------------------------

  getCapabilities() {
    return {
      configured: this.digioClient.isConfigured(),
      env: this.digioClient.env,
      gatewayUrl: this.digioClient.gatewayUrl,
      digilockerTemplate: this.digioClient.digilockerTemplateName,
      capabilities: [
        'PAN',
        'KRA_PAN',
        'DRIVING_LICENSE',
        'VEHICLE_RC',
        'PASSPORT',
        'VOTER_ID',
        'ID_OCR',
        'AADHAAR_MASK',
        'FACE_MATCH',
        'LIVENESS',
        'BANK_ACCOUNT_PENNY_LESS',
        'BANK_ACCOUNT_PENNY_DROP',
        'IFSC',
        'UPI_VPA',
        'GST',
        'PAN_TO_GST',
        'CIN',
        'DIN',
        'UDYAM',
        'FSSAI',
        'FUZZY_MATCH',
        'UAN',
        'DIGILOCKER',
      ],
    };
  }

  async getMyVerifications(actor: AuthUserDto) {
    const ctx = await this.resolveContext(actor);
    const orClauses: any[] = [{ userId: ctx.userId }];
    if (ctx.driverId) orClauses.push({ driverId: ctx.driverId });
    if (ctx.vendorId) orClauses.push({ vendorId: ctx.vendorId });

    const rows = await this.db.digioVerification.findMany({
      where: { OR: orClauses },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const latestByType: Record<string, any> = {};
    for (const row of rows) {
      if (!latestByType[row.verificationType]) {
        latestByType[row.verificationType] = this.formatRecord(row);
      }
    }

    return {
      configured: this.digioClient.isConfigured(),
      latestByType,
      history: rows.map((r) => this.formatRecord(r)),
    };
  }

  /**
   * Driver compliance alerts from the latest Digio record per check. BLOCKERs stop admin approval
   * unless an override reason is given (AdminService.verifyDriver); WARNINGs are informational.
   * When Digio is not configured, "not verified" findings are warnings (manual review only).
   */
  private buildDriverComplianceAlerts(
    driver: any,
    latestByType: Record<string, any>,
  ): Array<{ severity: 'BLOCKER' | 'WARNING'; code: string; message: string }> {
    const alerts: Array<{ severity: 'BLOCKER' | 'WARNING'; code: string; message: string }> = [];
    const missing: 'BLOCKER' | 'WARNING' = this.digioClient.isConfigured() ? 'BLOCKER' : 'WARNING';

    const dl = latestByType['DRIVING_LICENSE'];
    if (!dl) {
      alerts.push({
        severity: missing,
        code: 'DL_NOT_VERIFIED',
        message: driver?.dlFrontUrl
          ? 'Driving License uploaded but not yet verified via Govt KYC'
          : 'Driving License has not been verified',
      });
    } else if (!dl.verified) {
      alerts.push({
        severity: 'BLOCKER',
        code: 'DL_INVALID',
        message: dl.complianceNotes || dl.errorMessage || 'Driving License could not be verified with the issuing authority',
      });
    } else if (dl.complianceOk === false) {
      alerts.push({
        severity: 'BLOCKER',
        code: 'DL_COMPLIANCE_ISSUE',
        message: dl.complianceNotes || 'Driving License expired, inactive or without a transport class',
      });
    }

    const rc = latestByType['VEHICLE_RC'];
    if (!rc) {
      if (driver?.rcDocUrl || driver?.vehiclePlate) {
        alerts.push({
          severity: missing,
          code: 'RC_NOT_VERIFIED',
          message: 'Vehicle RC has not been verified against Parivahan (Vahan) yet',
        });
      }
    } else if (!rc.verified) {
      alerts.push({
        severity: 'BLOCKER',
        code: 'RC_INVALID',
        message: rc.complianceNotes || rc.errorMessage || 'Vehicle RC could not be verified on Vahan',
      });
    } else if (rc.complianceOk === false) {
      alerts.push({
        severity: 'BLOCKER',
        code: 'RC_COMPLIANCE_ISSUE',
        message: rc.complianceNotes || 'Vehicle RC fitness, insurance, permit, PUCC or blacklist check failed',
      });
    }

    const face = latestByType['FACE_MATCH'];
    if (face && !face.verified) {
      alerts.push({
        severity: 'BLOCKER',
        code: 'FACE_MATCH_FAILED',
        message: face.complianceNotes || 'Driver selfie did not match the ID portrait',
      });
    }

    const live = latestByType['LIVENESS'];
    if (live && !live.verified) {
      alerts.push({
        severity: 'BLOCKER',
        code: 'LIVENESS_FAILED',
        message: live.complianceNotes || 'Selfie liveness check failed (possible spoof)',
      });
    }

    const fuzzy = latestByType['FUZZY_MATCH'];
    if (fuzzy && !fuzzy.verified) {
      alerts.push({
        severity: 'WARNING',
        code: 'NAME_MISMATCH',
        message: fuzzy.complianceNotes || 'Registered name differs from Govt ID name',
      });
    }

    if (driver?.aadharFrontUrl && !latestByType['AADHAAR_MASK']?.verified) {
      alerts.push({
        severity: 'WARNING',
        code: 'AADHAAR_UNMASKED',
        message: 'Aadhaar masking has not been confirmed for UIDAI compliance',
      });
    }

    return alerts;
  }

  /** Compliance alerts for one driver (used by the admin approval guard). */
  async getDriverComplianceAlerts(driverId: string) {
    return (await this.getDriverVerificationsForAdmin(driverId)).complianceAlerts;
  }

  async getDriverVerificationsForAdmin(driverId: string) {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        userId: true,
        fullName: true,
        vehiclePlate: true,
        dlFrontUrl: true,
        aadharFrontUrl: true,
        aadharBackUrl: true,
        panDocUrl: true,
        rcDocUrl: true,
        kycDocuments: true,
      },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const rows = await this.db.digioVerification.findMany({
      where: { OR: [{ driverId }, { userId: driver.userId }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const latestByType: Record<string, any> = {};
    for (const row of rows) {
      if (!latestByType[row.verificationType]) {
        latestByType[row.verificationType] = this.formatRecord(row);
      }
    }

    return {
      configured: this.digioClient.isConfigured(),
      driverId,
      latestByType,
      complianceAlerts: this.buildDriverComplianceAlerts(driver, latestByType),
      history: rows.map((r) => this.formatRecord(r)),
    };
  }

  async getVendorVerificationsForAdmin(vendorId: string) {
    const vendor = await this.db.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, userId: true, organizationName: true, gstNumber: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const rows = await this.db.digioVerification.findMany({
      where: { OR: [{ vendorId }, { userId: vendor.userId }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const latestByType: Record<string, any> = {};
    for (const row of rows) {
      if (!latestByType[row.verificationType]) {
        latestByType[row.verificationType] = this.formatRecord(row);
      }
    }

    return {
      configured: this.digioClient.isConfigured(),
      vendorId,
      latestByType,
      history: rows.map((r) => this.formatRecord(r)),
    };
  }

  // ---------------------------------------------------------------------------
  // Govt ID Verifications (PAN, DL, Vehicle RC, Passport, Voter ID, KRA)
  // ---------------------------------------------------------------------------

  async verifyPan(actor: AuthUserDto, dto: VerifyPanDto) {
    const ctx = await this.resolveContext(actor, dto.targetDriverId, dto.targetVendorId);
    const pan = dto.panNumber.trim().toUpperCase();
    const reusedPan = await this.findReusableResult(actor, ctx, 'PAN', pan);
    if (reusedPan) return reusedPan;
    const reqId = this.digioClient.generateUniqueRequestId('PAN');

    const res = await this.digioClient.fetchIdData('PAN', {
      id_no: pan,
      name: dto.name?.trim(),
      dob: dto.dob ? this.normalizeDob(dto.dob) : undefined,
      unique_request_id: reqId,
    });

    const status = String(res?.status || res?.pan_status || '').toUpperCase();
    const holderName = String(
      res?.name || res?.full_name || res?.first_name || '',
    ).trim();
    // A returned name is not proof of validity: an explicit non-valid status always fails.
    const VALID_PAN = new Set(['VALID', 'ACTIVE', 'E', 'EXISTING AND VALID']);
    const verified = status
      ? VALID_PAN.has(status)
      : Boolean(res?.verified) || Boolean(holderName && !res?.error);

    const nameMatch = res?.name_as_per_pan_match ?? res?.name_match;
    const aadhaarSeedingStatus =
      res?.aadhaar_seeding_status || res?.aadhaar_linked || null;

    if (ctx.driverId) {
      const driver = await this.db.driver.findUnique({
        where: { id: ctx.driverId },
        select: { kycDocuments: true },
      });
      if (
        driver?.kycDocuments &&
        typeof driver.kycDocuments === 'object' &&
        !Array.isArray(driver.kycDocuments)
      ) {
        await this.db.driver.update({
          where: { id: ctx.driverId },
          data: {
            kycDocuments: {
              ...(driver.kycDocuments as Record<string, unknown>),
              panNumber: pan,
            },
          },
        });
      }
    }

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'PAN',
      category: 'KYC',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: pan,
      uniqueRequestId: reqId,
      verifiedName: holderName || null,
      complianceOk: verified,
      complianceNotes: verified
        ? `PAN ${status || 'VALID'}${aadhaarSeedingStatus ? `; Aadhaar seeding: ${aadhaarSeedingStatus}` : ''}`
        : `PAN verification returned status: ${status || 'INVALID'}`,
      summary: {
        panNumber: pan,
        status: status || (verified ? 'VALID' : 'INVALID'),
        category: res?.category || res?.pan_type || null,
        holderName: holderName || null,
        nameMatch: nameMatch ?? null,
        aadhaarSeedingStatus,
      },
      rawResponse: res,
    });
  }

  async verifyKraPan(actor: AuthUserDto, dto: VerifyKraPanDto) {
    const ctx = await this.resolveContext(actor);
    const pan = dto.panNumber.trim().toUpperCase();
    const reqId = this.digioClient.generateUniqueRequestId('KRA');

    const res = await this.digioClient.getKraPanStatus({
      pan_no: pan,
      dob: dto.dob ? this.normalizeDob(dto.dob) : undefined,
      fetch_type: dto.fetchType || 'I',
      mobile: dto.mobile?.trim(),
      unique_request_id: reqId,
    });

    const kraStatus = String(
      res?.kra_status || res?.status || res?.kyc_status || '',
    ).trim();
    const verified = Boolean(res && !res.error && kraStatus);

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'KRA_PAN',
      category: 'KYC',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: pan,
      uniqueRequestId: reqId,
      verifiedName: res?.name || null,
      complianceOk: verified,
      complianceNotes: kraStatus || 'KRA status fetched',
      summary: {
        panNumber: pan,
        kraStatus,
        kraName: res?.kra_name || null,
      },
      rawResponse: res,
    });
  }

  async verifyDrivingLicense(actor: AuthUserDto, dto: VerifyDrivingLicenseDto) {
    const ctx = await this.resolveContext(actor, dto.targetDriverId);
    const dlNo = dto.dlNumber.trim().toUpperCase().replace(/\s+/g, '');
    const normalizedDob = this.normalizeDob(dto.dob);
    const reusedDl = await this.findReusableResult(actor, ctx, 'DRIVING_LICENSE', dlNo, (sm) => sm.requestedDob === normalizedDob);
    if (reusedDl) return reusedDl;
    const reqId = this.digioClient.generateUniqueRequestId('DL');

    const res = await this.digioClient.fetchIdData('DRIVING_LICENSE', {
      id_no: dlNo,
      dob: normalizedDob,
      name: dto.name?.trim(),
      unique_request_id: reqId,
    });

    const evalRes = this.evaluateDlCompliance(res);

    if (ctx.driverId) {
      const driver = await this.db.driver.findUnique({
        where: { id: ctx.driverId },
        select: { kycDocuments: true },
      });
      if (
        driver?.kycDocuments &&
        typeof driver.kycDocuments === 'object' &&
        !Array.isArray(driver.kycDocuments)
      ) {
        await this.db.driver.update({
          where: { id: ctx.driverId },
          data: {
            kycDocuments: {
              ...(driver.kycDocuments as Record<string, unknown>),
              dlNumber: dlNo,
              dateOfBirth: normalizedDob,
            },
          },
        });
      }
    }

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'DRIVING_LICENSE',
      category: 'KYC',
      status: evalRes.verified
        ? evalRes.complianceOk
          ? 'VERIFIED'
          : 'PARTIAL'
        : 'FAILED',
      verified: evalRes.verified,
      identifier: dlNo,
      uniqueRequestId: reqId,
      verifiedName: evalRes.verifiedName,
      complianceOk: evalRes.complianceOk,
      complianceNotes: evalRes.complianceNotes,
      summary: { ...(evalRes.summary as Record<string, unknown>), requestedDob: normalizedDob },
      rawResponse: res,
      expiresAt: evalRes.expiresAt,
    });
  }

  async verifyVehicleRc(actor: AuthUserDto, dto: VerifyVehicleRcDto) {
    const ctx = await this.resolveContext(
      actor,
      dto.targetDriverId,
      undefined,
      dto.vehicleId,
    );
    const rcNo = dto.registrationNumber.trim().toUpperCase().replace(/[\s-]+/g, '');
    const reusedRc = await this.findReusableResult(actor, ctx, 'VEHICLE_RC', rcNo);
    if (reusedRc) return reusedRc;
    const reqId = this.digioClient.generateUniqueRequestId('RC');

    const res = await this.digioClient.verifyVehicleRc({
      id: rcNo,
      unique_request_id: reqId,
    });

    const evalRes = this.evaluateRcCompliance(res);

    let linkedVehicleId = dto.vehicleId || null;
    if (!linkedVehicleId && ctx.driverId) {
      const match = await this.db.vehicle.findFirst({
        where: {
          driverId: ctx.driverId,
          OR: [{ registrationNumber: rcNo }, { rcNumber: rcNo }],
        },
        select: { id: true },
      });
      linkedVehicleId = match?.id || null;
    }

    if (linkedVehicleId && evalRes.verified) {
      await this.db.vehicle.update({
        where: { id: linkedVehicleId },
        data: {
          rcNumber: rcNo,
          ...(evalRes.insuranceUpto
            ? { insuranceExpiry: evalRes.insuranceUpto }
            : {}),
          ...(evalRes.summary.makerModel
            ? {
                make: String(res?.vehicle_details?.maker_description || '').slice(0, 80) || undefined,
                model: String(res?.vehicle_details?.maker_model || '').slice(0, 80) || undefined,
              }
            : {}),
        },
      });
    } else if (ctx.driverId && evalRes.verified) {
      const driver = await this.db.driver.findUnique({
        where: { id: ctx.driverId },
        select: { vehiclePlate: true },
      });
      if (driver && !driver.vehiclePlate) {
        await this.db.driver.update({
          where: { id: ctx.driverId },
          data: { vehiclePlate: rcNo },
        });
      }
    }

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'VEHICLE_RC',
      category: 'VEHICLE',
      status: evalRes.verified
        ? evalRes.complianceOk
          ? 'VERIFIED'
          : 'PARTIAL'
        : 'FAILED',
      verified: evalRes.verified,
      identifier: rcNo,
      uniqueRequestId: reqId,
      verifiedName: evalRes.verifiedName,
      complianceOk: evalRes.complianceOk,
      complianceNotes: evalRes.complianceNotes,
      summary: evalRes.summary,
      rawResponse: res,
      expiresAt: evalRes.expiresAt,
      vehicleId: linkedVehicleId,
    });
  }

  async verifyPassport(actor: AuthUserDto, dto: VerifyPassportDto) {
    const ctx = await this.resolveContext(actor);
    const reqId = this.digioClient.generateUniqueRequestId('PASS');
    const res = await this.digioClient.fetchIdData('PASSPORT', {
      id_no: dto.fileNumber.trim().toUpperCase(),
      file_no: dto.fileNumber.trim().toUpperCase(),
      dob: this.normalizeDob(dto.dob),
      name: dto.name?.trim(),
      unique_request_id: reqId,
    });
    const verified = Boolean(res?.name || res?.file_number || res?.passport_number);
    return this.saveVerificationRecord({
      ctx,
      verificationType: 'PASSPORT',
      category: 'KYC',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: dto.fileNumber.trim().toUpperCase(),
      uniqueRequestId: reqId,
      verifiedName: res?.name || null,
      complianceOk: verified,
      complianceNotes: verified ? 'Passport details verified' : 'Passport verification failed',
      summary: {
        fileNumber: res?.file_number || dto.fileNumber.trim().toUpperCase(),
        name: res?.name || null,
        status: res?.application_status || res?.status || null,
      },
      rawResponse: res,
    });
  }

  async verifyVoterId(actor: AuthUserDto, dto: VerifyVoterIdDto) {
    const ctx = await this.resolveContext(actor);
    const epic = dto.voterId.trim().toUpperCase();
    const reqId = this.digioClient.generateUniqueRequestId('VOTER');
    const res = await this.digioClient.fetchIdData('VOTER_ID', {
      id_no: epic,
      name: dto.name?.trim(),
      unique_request_id: reqId,
    });
    const verified = Boolean(res?.name || res?.epic_no || res?.rln_name);
    return this.saveVerificationRecord({
      ctx,
      verificationType: 'VOTER_ID',
      category: 'KYC',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: epic,
      uniqueRequestId: reqId,
      verifiedName: res?.name || null,
      complianceOk: verified,
      complianceNotes: verified ? 'Voter ID verified' : 'Voter ID verification failed',
      summary: {
        epicNo: epic,
        name: res?.name || null,
        state: res?.state || null,
        constituency: res?.ac_name || res?.assembly_constituency || null,
      },
      rawResponse: res,
    });
  }

  // ---------------------------------------------------------------------------
  // Document OCR, Tamper/Blur Checks & Aadhaar Masking
  // ---------------------------------------------------------------------------

  private async resolveDocumentFile(
    storedUrl: string,
    label: string,
  ): Promise<DigioFilePart> {
    const file = await this.storageService.getFileBuffer(storedUrl);
    if (!file || !file.buffer?.length) {
      throw new BadRequestException(
        `Could not read ${label} document bytes from storage`,
      );
    }
    return file;
  }

  async analyzeIdCardFiles(
    actor: AuthUserDto,
    params: {
      front: DigioFilePart;
      back?: DigioFilePart;
      expectedIds?: string[];
      features?: string[];
      saveMaskedToDriver?: boolean;
      aadhaarSide?: 'FRONT' | 'BACK';
      targetDriverId?: string;
    },
  ) {
    const ctx = await this.resolveContext(actor, params.targetDriverId);
    if (mayInvolveAadhaar(params.expectedIds) || params.saveMaskedToDriver || params.aadhaarSide) {
      await this.assertAadhaarConsent(ctx);
    }
    const reqId = this.digioClient.generateUniqueRequestId('OCR');

    const res = await this.digioClient.analyzeIdCard({
      front: params.front,
      back: params.back,
      expectedIds: params.expectedIds,
      features: params.features,
      uniqueRequestId: reqId,
    });

    const detections: any[] = Array.isArray(res?.detections) ? res.detections : [];
    const primary = detections[0] || {};
    const attrs = primary?.id_attributes || {};
    const idType = String(primary?.id_type || 'UNKNOWN').toUpperCase();
    const rawIdNo = String(attrs?.id_no || '');
    const safeIdNo = idType.includes('AADHAAR')
      ? this.maskAadhaarInText(rawIdNo) || (rawIdNo.length >= 4 ? `XXXX-XXXX-${rawIdNo.slice(-4)}` : '')
      : rawIdNo;

    let maskedStoredUrl: string | null = null;
    const maskedBase64 =
      primary?.output_images?.front_part || primary?.output_images?.masked_front;
    if (
      params.saveMaskedToDriver &&
      idType.includes('AADHAAR') &&
      typeof maskedBase64 === 'string' &&
      maskedBase64.length > 16 &&
      ctx.driverId
    ) {
      maskedStoredUrl = await this.storeBase64MaskedImage(
        maskedBase64,
        `aadhaar-masked-${Date.now()}.jpg`,
        ctx.driverId,
        params.aadhaarSide || 'FRONT',
      );
    }

    const frontChecks = primary?.front_image_checks_result || {};
    const verified =
      detections.length > 0 &&
      res?.details?.status !== 'FAILED' &&
      (primary?.verification_result?.verified !== false);

    // Determine specific OCR sub-key so scanning PAN/DL/RC does not overwrite Aadhaar OCR status
    const subKey = idType.includes('AADHAAR')
      ? 'ID_OCR_AADHAAR'
      : idType.includes('PAN')
        ? 'ID_OCR_PAN'
        : idType.includes('DRIVING')
          ? 'ID_OCR_DL'
          : idType === 'RC' || idType.includes('VEHICLE')
            ? 'ID_OCR_RC'
            : 'ID_OCR';

    if (ctx.driverId && verified) {
      const drv = await this.db.driver.findUnique({
        where: { id: ctx.driverId },
        select: { kycDocuments: true },
      });
      const existingKyc: Record<string, any> =
        drv?.kycDocuments && typeof drv.kycDocuments === 'object' && !Array.isArray(drv.kycDocuments)
          ? { ...(drv.kycDocuments as Record<string, any>) }
          : {};
      if (idType.includes('PAN') && safeIdNo && !existingKyc.panNumber) {
        existingKyc.panNumber = safeIdNo.trim().toUpperCase();
      }
      if (idType.includes('DRIVING') && safeIdNo && !existingKyc.dlNumber) {
        existingKyc.dlNumber = safeIdNo.trim().toUpperCase().replace(/\s+/g, '');
      }
      if ((idType === 'RC' || idType.includes('VEHICLE')) && safeIdNo && !existingKyc.rcNumber) {
        existingKyc.rcNumber = safeIdNo.trim().toUpperCase().replace(/[\s-]+/g, '');
      }
      if (attrs?.dob && !existingKyc.dateOfBirth) {
        existingKyc.dateOfBirth = String(attrs.dob).trim();
      }
      await this.db.driver.update({
        where: { id: ctx.driverId },
        data: { kycDocuments: existingKyc as any },
      });
    }

    const summaryPayload = {
      detectedType: idType,
      detectedPart: primary?.detected_part || null,
      idNumber: safeIdNo || null,
      name: attrs?.name || null,
      dob: attrs?.dob || null,
      gender: attrs?.gender || null,
      address: attrs?.address || null,
      qualityChecks: frontChecks,
      maskedStoredUrl,
      ocrVerified: primary?.verification_result?.verified ?? null,
    };

    const ocrRecord = await this.saveVerificationRecord({
      ctx,
      verificationType: 'ID_OCR',
      category: 'KYC',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: safeIdNo || idType,
      uniqueRequestId: reqId,
      verifiedName: attrs?.name || null,
      complianceOk:
        verified && frontChecks?.blur !== true && frontChecks?.black_and_white !== true,
      complianceNotes:
        frontChecks?.blur === true
          ? 'Image appears blurry — clearer capture recommended'
          : `Detected ${idType}${attrs?.name ? ` (${attrs.name})` : ''}`,
      summary: summaryPayload,
      rawResponse: res,
    });

    if (ctx.driverId && subKey !== 'ID_OCR') {
      await this.syncDriverDigioMetadata(ctx.driverId, subKey, {
        verificationId: ocrRecord.id,
        verified: ocrRecord.verified,
        status: ocrRecord.status,
        identifier: ocrRecord.identifier,
        verifiedName: ocrRecord.verifiedName,
        complianceOk: ocrRecord.complianceOk,
        complianceNotes: ocrRecord.complianceNotes,
        summary: ocrRecord.summary,
        verifiedAt: ocrRecord.verifiedAt || null,
      });
    }

    if (idType.includes('AADHAAR') && maskedStoredUrl && ctx.driverId) {
      await this.saveVerificationRecord({
        ctx,
        verificationType: 'AADHAAR_MASK',
        category: 'KYC',
        status: 'VERIFIED',
        verified: true,
        identifier: params.aadhaarSide || 'FRONT',
        uniqueRequestId: `${reqId}_MASK`,
        verifiedName: attrs?.name || null,
        complianceOk: true,
        complianceNotes: 'Aadhaar digits masked automatically during OCR',
        summary: {
          side: params.aadhaarSide || 'FRONT',
          maskedStoredUrl,
          source: 'ID_OCR',
        },
      });
    }

    return ocrRecord;
  }

  async analyzeStoredIdCard(actor: AuthUserDto, dto: AnalyzeStoredIdCardDto) {
    const front = await this.resolveDocumentFile(dto.frontDocUrl, 'front ID');
    const back = dto.backDocUrl
      ? await this.resolveDocumentFile(dto.backDocUrl, 'back ID')
      : undefined;

    return this.analyzeIdCardFiles(actor, {
      front,
      back,
      expectedIds: dto.expectedIds,
      features: dto.features,
      saveMaskedToDriver: dto.saveMaskedToDriver,
      aadhaarSide: dto.aadhaarSide,
      targetDriverId: dto.targetDriverId,
    });
  }

  private async storeBase64MaskedImage(
    rawBase64: string,
    filename: string,
    driverId: string,
    side: 'FRONT' | 'BACK',
  ): Promise<string | null> {
    try {
      const cleaned = rawBase64.replace(/^data:image\/\w+;base64,/, '');
      const buf = Buffer.from(cleaned, 'base64');
      if (!buf.length) return null;

      const stored = await this.storageService.saveFile({
        buffer: buf,
        originalname: filename,
        mimetype: 'image/jpeg',
        size: buf.length,
      });

      await this.db.driver.update({
        where: { id: driverId },
        data:
          side === 'BACK'
            ? { aadharBackUrl: stored.url }
            : { aadharFrontUrl: stored.url },
      });
      return stored.url;
    } catch (err: any) {
      this.logger.warn(`Failed storing masked Aadhaar image: ${err?.message}`);
      return null;
    }
  }

  async maskAadhaarFileBuffer(
    actor: AuthUserDto,
    file: DigioFilePart,
    options: { side?: 'FRONT' | 'BACK'; targetDriverId?: string; saveToDriver?: boolean } = {},
  ) {
    const ctx = await this.resolveContext(actor, options.targetDriverId);
    await this.assertAadhaarConsent(ctx);
    const reqId = this.digioClient.generateUniqueRequestId('MASK');

    const res = await this.digioClient.maskAadhaarFile({
      file,
      uniqueRequestId: reqId,
    });

    const maskedOutput = res?.masked_output;
    let maskedStoredUrl: string | null = null;
    if (
      options.saveToDriver &&
      ctx.driverId &&
      typeof maskedOutput === 'string' &&
      maskedOutput.length > 50
    ) {
      maskedStoredUrl = await this.storeBase64MaskedImage(
        maskedOutput,
        `aadhaar-masked-${(options.side || 'FRONT').toLowerCase()}-${Date.now()}.jpg`,
        ctx.driverId,
        options.side || 'FRONT',
      );
    }

    const maskingDoneCount = res?.details?.masking_done_count ?? 0;
    const alreadyMaskedCount = res?.details?.already_masked_count ?? 0;
    const verified = Boolean(maskedOutput || alreadyMaskedCount > 0 || maskingDoneCount > 0);

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'AADHAAR_MASK',
      category: 'KYC',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: options.side || 'AADHAAR',
      uniqueRequestId: reqId,
      complianceOk: verified,
      complianceNotes: `Masked ${maskingDoneCount} occurrence(s), already masked ${alreadyMaskedCount}`,
      summary: {
        side: options.side || 'FRONT',
        maskingDoneCount,
        alreadyMaskedCount,
        maskedStoredUrl,
      },
      rawResponse: res,
    });
  }

  async maskStoredAadhaar(actor: AuthUserDto, dto: MaskStoredAadhaarDto) {
    const file = await this.resolveDocumentFile(dto.documentUrl, 'Aadhaar');
    return this.maskAadhaarFileBuffer(actor, file, {
      side: dto.side || 'FRONT',
      targetDriverId: dto.targetDriverId,
      saveToDriver: true,
    });
  }

  // ---------------------------------------------------------------------------
  // Biometrics (Face Match & Selfie Liveness)
  // ---------------------------------------------------------------------------

  async faceMatchBuffers(
    actor: AuthUserDto,
    params: {
      file1: DigioFilePart;
      file2: DigioFilePart;
      minimumMatch?: number;
      targetDriverId?: string;
    },
  ) {
    const ctx = await this.resolveContext(actor, params.targetDriverId);
    const reqId = this.digioClient.generateUniqueRequestId('FACE');
    const minMatch = params.minimumMatch ?? 65;

    const res = await this.digioClient.faceMatch({
      file1: params.file1,
      file2: params.file2,
      minimumMatch: minMatch,
      uniqueRequestId: reqId,
    });

    const rawScore = Number(
      res?.confidence ?? res?.match_percentage ?? res?.score ?? 0,
    );
    const score = Number.isFinite(rawScore)
      ? Math.round(rawScore * 100) / 100
      : 0;
    // Digio's verdict wins: matched → `match_result: "matched"`, otherwise `result: "not_matched" | "failed"`
    // (see /swagger/post_matchFaces.json). The score only decides when no verdict is present.
    const resultStr = String(res?.match_result ?? res?.result ?? '').trim().toUpperCase();
    const matched = resultStr
      ? resultStr === 'MATCHED' || resultStr === 'MATCH' || resultStr === 'PASS' || resultStr === 'TRUE'
      : score >= minMatch;

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'FACE_MATCH',
      category: 'BIOMETRIC',
      status: matched ? 'VERIFIED' : 'FAILED',
      verified: matched,
      identifier: `SCORE_${score}%`,
      uniqueRequestId: reqId,
      matchScore: score,
      complianceOk: matched,
      complianceNotes: matched
        ? `Biometric face match passed (${score}% >= ${minMatch}%)`
        : `Face match below threshold (${score}% < ${minMatch}%)`,
      summary: {
        confidence: score,
        minimumMatch: minMatch,
        result: res?.match_result || res?.result || (matched ? 'MATCHED' : 'NOT_MATCHED'),
      },
      rawResponse: res,
    });
  }

  async faceMatchStored(actor: AuthUserDto, dto: FaceMatchStoredDto) {
    const ctx = await this.resolveContext(actor, dto.targetDriverId);

    let url1 = dto.image1Url;
    let url2 = dto.image2Url;

    if ((!url1 || !url2) && ctx.driverId) {
      const driver = await this.db.driver.findUnique({
        where: { id: ctx.driverId },
        select: {
          dlFrontUrl: true,
          aadharFrontUrl: true,
          panDocUrl: true,
          kycDocuments: true,
        },
      });
      const kyc =
        driver?.kycDocuments && typeof driver.kycDocuments === 'object' && !Array.isArray(driver.kycDocuments)
          ? (driver.kycDocuments as Record<string, any>)
          : {};
      url1 = url1 || (kyc.profilePhotoUrl as string | undefined);
      url2 = url2 || driver?.dlFrontUrl || driver?.aadharFrontUrl || driver?.panDocUrl || undefined;
    }

    if (!url1 || !url2) {
      throw new BadRequestException(
        'Both a selfie/profile photo and a reference ID document photo (DL/Aadhaar/PAN) are required for face match',
      );
    }

    const [file1, file2] = await Promise.all([
      this.resolveDocumentFile(url1, 'selfie/profile photo'),
      this.resolveDocumentFile(url2, 'ID document photo'),
    ]);

    return this.faceMatchBuffers(actor, {
      file1,
      file2,
      minimumMatch: dto.minimumMatch,
      targetDriverId: dto.targetDriverId,
    });
  }

  async checkLivenessBuffer(
    actor: AuthUserDto,
    image: DigioFilePart,
    targetDriverId?: string,
  ) {
    const ctx = await this.resolveContext(actor, targetDriverId);
    const reqId = this.digioClient.generateUniqueRequestId('LIVE');

    const res = await this.digioClient.checkLiveness({
      image,
      uniqueRequestId: reqId,
    });

    const rawScore = Number(res?.score ?? res?.liveness_score ?? 0);
    const score = Number.isFinite(rawScore)
      ? Math.round(rawScore * 100) / 100
      : 0;
    // Digio returns `{score: 0-100, result: "PASS" | "FAIL"}` (/swagger/post_livenessCheck.json); the
    // documented spoof example is `{score: 12, result: "FAIL"}`. The verdict wins; the score (0-100,
    // or 0-1 from older responses) only decides when no verdict is present.
    const resultStr = String(res?.result || '').trim().toUpperCase();
    const scorePct = score > 0 && score <= 1 ? score * 100 : score;
    const live = resultStr
      ? resultStr === 'PASS' || resultStr === 'LIVE'
      : res?.is_live === true || scorePct >= LIVENESS_PASS_SCORE;

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'LIVENESS',
      category: 'BIOMETRIC',
      status: live ? 'VERIFIED' : 'FAILED',
      verified: live,
      identifier: resultStr || `LIVENESS_${score}`,
      uniqueRequestId: reqId,
      matchScore: score,
      complianceOk: live,
      complianceNotes: live
        ? `Selfie liveness check passed (${resultStr || score})`
        : `Selfie liveness failed (${resultStr || score})`,
      summary: {
        result: res?.result || (live ? 'PASS' : 'FAIL'),
        score,
      },
      rawResponse: res,
    });
  }

  async checkStoredLiveness(actor: AuthUserDto, dto: LivenessStoredDto) {
    const ctx = await this.resolveContext(actor, dto.targetDriverId);
    let url = dto.imageUrl;

    if (!url && ctx.driverId) {
      const driver = await this.db.driver.findUnique({
        where: { id: ctx.driverId },
        select: { kycDocuments: true },
      });
      const kyc =
        driver?.kycDocuments && typeof driver.kycDocuments === 'object' && !Array.isArray(driver.kycDocuments)
          ? (driver.kycDocuments as Record<string, any>)
          : {};
      url = kyc.profilePhotoUrl;
    }

    if (!url) {
      throw new BadRequestException(
        'Selfie/profile photo URL is required for liveness check',
      );
    }

    const image = await this.resolveDocumentFile(url, 'selfie');
    return this.checkLivenessBuffer(actor, image, dto.targetDriverId);
  }

  // ---------------------------------------------------------------------------
  // Banking, IFSC & UPI Verification
  // ---------------------------------------------------------------------------

  async verifyIfsc(actor: AuthUserDto, dto: VerifyIfscDto) {
    const ifsc = dto.ifsc.trim().toUpperCase();
    const res = await this.digioClient.verifyIfsc(ifsc);
    const verified = Boolean(res?.verified && res?.data);

    // No noisy DB insert required for pure IFSC autocomplete, return structured metadata cleanly
    return {
      verified,
      ifsc: res?.data?.ifsc || ifsc,
      bank: res?.data?.bank || null,
      branch: res?.data?.branch || null,
      address: res?.data?.address || null,
      city: res?.data?.city || null,
      state: res?.data?.state || null,
      micr: res?.data?.micr || null,
      neft: Boolean(res?.data?.neft),
      imps: Boolean(res?.data?.imps),
      rtgs: Boolean(res?.data?.rtgs),
      upi: Boolean(res?.data?.upi),
      pennyDropBank: res?.data?.penny_drop_bank || null,
      requestedBy: actor.id,
    };
  }

  async verifyBankAccount(actor: AuthUserDto, dto: VerifyBankAccountDto) {
    const ctx = await this.resolveContext(actor, dto.targetDriverId);
    const ifsc = dto.ifsc.trim().toUpperCase();
    const accountNo = dto.accountNumber.trim();
    const reqId = this.digioClient.generateUniqueRequestId('BANK');

    const res = await this.digioClient.verifyBankAccount({
      beneficiary_account_no: accountNo,
      beneficiary_ifsc: ifsc,
      beneficiary_name: dto.accountHolderName?.trim(),
      validation_mode: dto.validationMode || 'PENNY_LESS',
      unique_request_id: reqId,
    });

    const verified = Boolean(res?.verified);
    const bankHolderName = String(res?.beneficiary_name_with_bank || '').trim();
    const fuzzyScore =
      res?.fuzzy_match_score !== undefined ? Number(res.fuzzy_match_score) : null;

    if (dto.saveToDriverProfile && ctx.driverId && verified) {
      const driver = await this.db.driver.findUnique({
        where: { id: ctx.driverId },
        select: { kycDocuments: true },
      });
      const existingKyc: Record<string, any> =
        driver?.kycDocuments && typeof driver.kycDocuments === 'object' && !Array.isArray(driver.kycDocuments)
          ? { ...(driver.kycDocuments as Record<string, any>) }
          : {};

      let resolvedBankName = existingKyc.bankName;
      try {
        const ifscRes = await this.digioClient.verifyIfsc(ifsc);
        if (ifscRes?.data?.bank) resolvedBankName = ifscRes.data.bank;
      } catch (_) {}

      await this.db.driver.update({
        where: { id: ctx.driverId },
        data: {
          kycDocuments: {
            ...existingKyc,
            bankAccountName: bankHolderName || dto.accountHolderName || existingKyc.bankAccountName,
            bankAccountNumber: accountNo,
            bankIfsc: ifsc,
            bankName: resolvedBankName,
            bankVerified: true,
          } as any,
        },
      });
    }

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'BANK_ACCOUNT',
      category: 'BANK',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: `${this.maskAccountNumber(accountNo)}@${ifsc}`,
      uniqueRequestId: reqId,
      verifiedName: bankHolderName || null,
      matchScore: fuzzyScore,
      complianceOk: verified,
      complianceNotes: verified
        ? `Bank account verified (${res?.validation_mode || dto.validationMode || 'PENNY_LESS'})${bankHolderName ? ` — Holder: ${bankHolderName}` : ''}`
        : 'Bank account could not be verified',
      summary: {
        maskedAccount: this.maskAccountNumber(accountNo),
        ifsc,
        beneficiaryNameWithBank: bankHolderName || null,
        fuzzyMatchScore: fuzzyScore,
        validationMode: res?.validation_mode || dto.validationMode || 'PENNY_LESS',
        verifiedAt: res?.verified_at || null,
      },
      rawResponse: res,
    });
  }

  async verifyUpiVpa(actor: AuthUserDto, dto: VerifyUpiVpaDto) {
    const ctx = await this.resolveContext(actor);
    const vpa = dto.vpa.trim().toLowerCase();
    const reusedVpa = await this.findReusableResult(actor, ctx, 'UPI_VPA', vpa);
    if (reusedVpa) return reusedVpa;
    const reqId = this.digioClient.generateUniqueRequestId('UPI');

    const res = await this.digioClient.checkUpiVpa({
      virtual_address: vpa,
      name: dto.name?.trim(),
      reference_id: ctx.driverId || actor.id,
      unique_request_id: reqId,
    });

    const verified = Boolean(
      res?.status === 'AVAILABLE' ||
        res?.status === 'VALID' ||
        res?.verified === true ||
        res?.customer_name,
    );
    const customerName = String(res?.customer_name || res?.name || '').trim();

    if (dto.saveToDriverProfile && ctx.driverId && verified) {
      const driver = await this.db.driver.findUnique({
        where: { id: ctx.driverId },
        select: { kycDocuments: true },
      });
      const existingKyc =
        driver?.kycDocuments && typeof driver.kycDocuments === 'object' && !Array.isArray(driver.kycDocuments)
          ? { ...(driver.kycDocuments as Record<string, unknown>) }
          : {};
      await this.db.driver.update({
        where: { id: ctx.driverId },
        data: {
          kycDocuments: {
            ...existingKyc,
            upiId: vpa,
            upiVerified: true,
          },
        },
      });
    }

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'UPI_VPA',
      category: 'BANK',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: vpa,
      uniqueRequestId: reqId,
      verifiedName: customerName || null,
      complianceOk: verified,
      complianceNotes: verified
        ? `UPI handle verified${customerName ? ` (${customerName})` : ''}`
        : 'Invalid or inactive UPI VPA',
      summary: {
        vpa,
        customerName: customerName || null,
        status: res?.status || null,
      },
      rawResponse: res,
    });
  }

  async searchUpiVpa(_actor: AuthUserDto, dto: SearchUpiVpaDto) {
    return this.digioClient.searchUpiVpa({
      handlePrefix: dto.handlePrefix.trim(),
    });
  }

  // ---------------------------------------------------------------------------
  // Business KYB (GST, PAN-to-GST, CIN, DIN, Udyam, FSSAI)
  // ---------------------------------------------------------------------------

  async verifyGst(actor: AuthUserDto, dto: VerifyGstDto) {
    const ctx = await this.resolveContext(actor, undefined, dto.targetVendorId);
    const gstin = dto.gstin.trim().toUpperCase();
    const reqId = this.digioClient.generateUniqueRequestId('GST');
    const endpointType = dto.advanced ? 'GST_ADVANCED' : 'GST';

    const res = await this.digioClient.fetchIdData(endpointType, {
      id_no: gstin,
      is_advanced: Boolean(dto.advanced),
      unique_request_id: reqId,
    });

    const legalName = String(
      res?.lgnm || res?.legal_name || res?.trade_name || res?.tradeNam || '',
    ).trim();
    const tradeName = String(res?.tradeNam || res?.trade_name || legalName).trim();
    const gstStatus = String(res?.sts || res?.status || '').trim();
    const verified = Boolean(
      legalName ||
        (gstStatus && gstStatus.toUpperCase() === 'ACTIVE'),
    );
    const complianceOk =
      verified &&
      (!gstStatus ||
        gstStatus.toUpperCase() === 'ACTIVE' ||
        gstStatus.toUpperCase() === 'VALID');

    if (dto.saveToVendorProfile && ctx.vendorId && verified) {
      await this.db.vendor.update({
        where: { id: ctx.vendorId },
        data: {
          gstNumber: gstin,
          ...(tradeName ? { organizationName: tradeName } : {}),
        },
      });
    }

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'GST',
      category: 'KYB',
      status: verified ? (complianceOk ? 'VERIFIED' : 'PARTIAL') : 'FAILED',
      verified,
      identifier: gstin,
      uniqueRequestId: reqId,
      verifiedName: legalName || tradeName || null,
      complianceOk,
      complianceNotes: complianceOk
        ? `GSTIN ${gstStatus || 'Active'} — ${tradeName || legalName}`
        : `GSTIN status is "${gstStatus || 'UNKNOWN'}"`,
      summary: {
        gstin,
        legalName: legalName || null,
        tradeName: tradeName || null,
        status: gstStatus || null,
        registrationDate: res?.rgdt || res?.registration_date || null,
        constitutionOfBusiness: res?.ctb || res?.constitution_of_business || null,
        taxpayerType: res?.dty || res?.taxpayer_type || null,
        address: res?.pradr?.adr || res?.principal_place_of_business || null,
        stateJurisdiction: res?.stj || null,
      },
      rawResponse: res,
    });
  }

  async verifyPanToGst(actor: AuthUserDto, dto: VerifyPanToGstDto) {
    const ctx = await this.resolveContext(actor);
    const pan = dto.panNumber.trim().toUpperCase();
    const reqId = this.digioClient.generateUniqueRequestId('P2G');

    const res = await this.digioClient.fetchIdData('PAN_TO_GST', {
      id_no: pan,
      listing_type: dto.listingType || 'BASIC',
      unique_request_id: reqId,
    });

    const gstList = Array.isArray(res?.gstin_list)
      ? res.gstin_list
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
    const verified = gstList.length > 0 || Boolean(res?.gstin);

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'PAN_TO_GST',
      category: 'KYB',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: pan,
      uniqueRequestId: reqId,
      complianceOk: verified,
      complianceNotes: `Found ${gstList.length || (res?.gstin ? 1 : 0)} GST registration(s) mapped to PAN`,
      summary: {
        panNumber: pan,
        gstRegistrations: gstList,
      },
      rawResponse: res,
    });
  }

  async verifyCin(actor: AuthUserDto, dto: VerifyCinDto) {
    const ctx = await this.resolveContext(actor, undefined, dto.targetVendorId);
    const cin = dto.cin.trim().toUpperCase();
    const reqId = this.digioClient.generateUniqueRequestId('CIN');

    const res = await this.digioClient.fetchIdData('CIN', {
      id_no: cin,
      unique_request_id: reqId,
    });

    const companyName = String(
      res?.company_name || res?.companyName || res?.company_master_data?.company_name || '',
    ).trim();
    const status = String(
      res?.company_status || res?.company_master_data?.['company_status(for_efiling)'] || '',
    ).trim();
    const verified = Boolean(companyName || res?.cin);

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'CIN',
      category: 'KYB',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: cin,
      uniqueRequestId: reqId,
      verifiedName: companyName || null,
      complianceOk: verified && (!status || status.toUpperCase().includes('ACTIVE')),
      complianceNotes: status ? `MCA Status: ${status}` : 'MCA CIN record verified',
      summary: {
        cin,
        companyName: companyName || null,
        status: status || null,
        rocCode: res?.roc_code || res?.company_master_data?.roc_code || null,
        dateOfIncorporation:
          res?.date_of_incorporation ||
          res?.company_master_data?.date_of_incorporation ||
          null,
      },
      rawResponse: res,
    });
  }

  async verifyDin(actor: AuthUserDto, dto: VerifyDinDto) {
    const ctx = await this.resolveContext(actor);
    const din = dto.din.trim();
    const reqId = this.digioClient.generateUniqueRequestId('DIN');

    const res = await this.digioClient.fetchIdData('DIN', {
      id_no: din,
      unique_request_id: reqId,
    });

    const directorName = String(res?.director_name || res?.name || '').trim();
    const verified = Boolean(directorName || res?.din);

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'DIN',
      category: 'KYB',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: din,
      uniqueRequestId: reqId,
      verifiedName: directorName || null,
      complianceOk: verified,
      complianceNotes: verified ? `Director verified: ${directorName}` : 'DIN not found',
      summary: { din, directorName: directorName || null },
      rawResponse: res,
    });
  }

  async verifyUdyam(actor: AuthUserDto, dto: VerifyUdyamDto) {
    const ctx = await this.resolveContext(actor, undefined, dto.targetVendorId);
    const udyam = dto.udyamNumber.trim().toUpperCase();
    const reqId = this.digioClient.generateUniqueRequestId('UDYM');

    const res = await this.digioClient.fetchIdData('UDYAMAADHAAR', {
      id_no: udyam,
      unique_request_id: reqId,
    });

    const enterpriseName = String(
      res?.enterprise_name || res?.name_of_enterprise || res?.main_details?.name_of_enterprise || '',
    ).trim();
    const verified = Boolean(enterpriseName || res?.udyam_registration_number);

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'UDYAM',
      category: 'KYB',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: udyam,
      uniqueRequestId: reqId,
      verifiedName: enterpriseName || null,
      complianceOk: verified,
      complianceNotes: verified ? `MSME Udyam verified: ${enterpriseName}` : 'Udyam verification failed',
      summary: {
        udyamNumber: udyam,
        enterpriseName: enterpriseName || null,
        enterpriseType: res?.enterprise_type || res?.main_details?.enterprise_type || null,
      },
      rawResponse: res,
    });
  }

  async verifyFssai(actor: AuthUserDto, dto: VerifyFssaiDto) {
    const ctx = await this.resolveContext(actor);
    const fssai = dto.fssaiNumber.trim();
    const reqId = this.digioClient.generateUniqueRequestId('FSSA');

    const res = await this.digioClient.fetchIdData('FSSAI', {
      id_no: fssai,
      unique_request_id: reqId,
    });

    const company = String(res?.company_name || res?.fbo_name || '').trim();
    const verified = Boolean(company || res?.license_no);

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'FSSAI',
      category: 'KYB',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: fssai,
      uniqueRequestId: reqId,
      verifiedName: company || null,
      complianceOk: verified,
      complianceNotes: verified ? `FSSAI license verified: ${company}` : 'FSSAI verification failed',
      summary: { fssaiNumber: fssai, businessName: company || null, status: res?.status || null },
      rawResponse: res,
    });
  }

  // ---------------------------------------------------------------------------
  // Fuzzy Match & UAN Employment Check
  // ---------------------------------------------------------------------------

  async fuzzyMatch(actor: AuthUserDto, dto: FuzzyMatchDto) {
    const ctx = await this.resolveContext(actor, dto.targetDriverId);
    const reqId = this.digioClient.generateUniqueRequestId('FUZ');

    const res = await this.digioClient.fuzzyMatch({
      source: { text: dto.sourceText },
      target: { text: dto.targetText },
      context: dto.context,
      confidence: dto.minConfidence ?? 75,
      unique_request_id: reqId,
    });

    const matched = Boolean(res?.matched);
    const score = res?.match_score !== undefined ? Number(res.match_score) : null;

    return this.saveVerificationRecord({
      ctx,
      verificationType: 'FUZZY_MATCH',
      category: 'KYC',
      status: matched ? 'VERIFIED' : 'FAILED',
      verified: matched,
      identifier: dto.context.toUpperCase(),
      uniqueRequestId: reqId,
      matchScore: score,
      complianceOk: matched,
      complianceNotes: `Fuzzy ${dto.context} match score: ${score ?? 0}%`,
      summary: {
        context: dto.context,
        matched,
        matchScore: score,
      },
      rawResponse: res,
    });
  }

  async verifyUan(actor: AuthUserDto, dto: VerifyUanDto) {
    const ctx = await this.resolveContext(actor);
    const reqId = this.digioClient.generateUniqueRequestId('UAN');

    const res = await this.digioClient.verifyUan({
      type: dto.type,
      identifier: dto.identifier.trim(),
      uan_history: dto.includeHistory ? 'YES' : 'NO',
      unique_request_id: reqId,
    });

    const verified = Boolean(res && !res.error && (res?.uan || res?.data || res?.employment_history));
    return this.saveVerificationRecord({
      ctx,
      verificationType: 'UAN',
      category: 'KYC',
      status: verified ? 'VERIFIED' : 'FAILED',
      verified,
      identifier: dto.type === 'MOBILE' ? `***${dto.identifier.slice(-4)}` : dto.identifier.trim(),
      uniqueRequestId: reqId,
      complianceOk: verified,
      complianceNotes: verified ? 'EPFO UAN verified' : 'UAN lookup returned no records',
      summary: {
        type: dto.type,
        hasHistory: Boolean(res?.employment_history || res?.data?.employment_history),
      },
      rawResponse: res,
    });
  }

  // ---------------------------------------------------------------------------
  // DigiLocker / Guided Gateway Session & Webhook Handling
  // ---------------------------------------------------------------------------

  async createDigilockerSession(actor: AuthUserDto, dto: CreateDigilockerRequestDto) {
    const ctx = await this.resolveContext(actor);
    await this.assertAadhaarConsent(ctx);
    const user = await this.db.user.findUnique({
      where: { id: actor.id },
      select: { phone: true, email: true, fullName: true },
    });

    const customerIdentifier = (
      dto.customerIdentifier ||
      user?.phone ||
      user?.email ||
      actor.phone ||
      actor.email ||
      ''
    ).trim();
    if (!customerIdentifier) {
      throw new BadRequestException(
        'A verified phone number or email is required to launch DigiLocker KYC',
      );
    }

    const customerName =
      dto.customerName?.trim() || user?.fullName || actor.fullName || 'AdhocX User';
    const txnId = this.digioClient.generateUniqueRequestId('DLKR');
    const templateName =
      dto.templateName?.trim() || this.digioClient.digilockerTemplateName;

    const res = await this.digioClient.createKycRequestWithTemplate({
      customer_identifier: customerIdentifier,
      customer_name: customerName,
      template_name: templateName,
      generate_access_token: true,
      notify_customer: dto.notifyCustomer ?? false,
      reference_id: ctx.driverId || ctx.vendorId || actor.id,
      transaction_id: txnId,
      preset_values: dto.presetValues,
    });

    const kid = String(res?.id || '');
    const tokenId = String(res?.access_token?.id || '');
    if (!kid || !tokenId) {
      throw new BadRequestException('DigiLocker service did not return a valid session ID / access token');
    }

    const gatewayUrl = this.digioClient.buildGatewayUrl({
      requestId: kid,
      transactionId: txnId,
      customerIdentifier,
      tokenId,
      redirectUrl: dto.redirectUrl,
    });

    const record = await this.saveVerificationRecord({
      ctx,
      verificationType: 'DIGILOCKER',
      category: 'DIGILOCKER',
      status: 'INITIATED',
      verified: false,
      identifier: customerIdentifier,
      uniqueRequestId: txnId,
      digioRequestId: kid,
      referenceId: res?.reference_id || ctx.driverId || ctx.vendorId || actor.id,
      verifiedName: customerName,
      complianceOk: null,
      complianceNotes: 'DigiLocker KYC session created; awaiting customer authorization',
      summary: {
        templateName,
        digioRequestId: kid,
        transactionId: txnId,
        tokenValidTill: res?.access_token?.valid_till || null,
        gatewayUrl,
      },
      rawResponse: res,
    });

    return {
      ...record,
      digioRequestId: kid,
      accessToken: tokenId,
      transactionId: txnId,
      customerIdentifier,
      gatewayUrl,
      environment: this.digioClient.env,
    };
  }

  async syncDigilockerResponse(actor: AuthUserDto | null, digioRequestId: string) {
    const existing = await this.db.digioVerification.findUnique({
      where: { digioRequestId },
    });
    if (!existing) {
      throw new NotFoundException(`DigiLocker KYC request ${digioRequestId} not found`);
    }

    if (
      actor &&
      actor.role !== UserRole.ADMIN &&
      existing.userId !== actor.id
    ) {
      throw new ForbiddenException('You do not have access to this KYC session');
    }

    const res = await this.digioClient.getKycRequestResponse(digioRequestId);
    const digioStatus = String(res?.status || '').toLowerCase();
    const actions: any[] = Array.isArray(res?.actions) ? res.actions : [];

    let extractedName: string | null = null;
    let extractedPan: string | null = null;
    let extractedDl: string | null = null;
    let extractedRc: string | null = null;
    let maskedAadhaar: string | null = null;
    const verifiedDocs = {
      aadhaar: false,
      pan: false,
      dl: false,
      rc: false,
    };

    const isPositiveActionStatus = (s: unknown) => {
      const val = String(s || '').toLowerCase();
      return (
        val === 'approved' ||
        val === 'completed' ||
        val === 'success' ||
        val === 'approval_pending' ||
        digioStatus === 'approved'
      );
    };

    for (const action of actions) {
      const details = action?.details || {};
      const actionStatus = String(action?.status || '').toLowerCase();
      const actionFailed = actionStatus === 'rejected' || actionStatus === 'failed' || actionStatus === 'expired';
      const actionType = String(action?.doc_type || action?.type || '').toUpperCase();

      const aadhaar = details?.aadhaar || details?.AADHAAR;
      if (aadhaar && !actionFailed) {
        verifiedDocs.aadhaar = true;
        extractedName = extractedName || aadhaar.name || null;
        if (aadhaar.id_number) {
          maskedAadhaar = this.maskAadhaarInText(String(aadhaar.id_number));
        }
      }
      const pan = details?.pan || details?.PAN;
      if (pan && !actionFailed) {
        verifiedDocs.pan = true;
        extractedPan = pan.id_number || pan.pan_no || extractedPan;
        extractedName = extractedName || pan.name || null;
      }
      const dl = details?.driving_licence || details?.driving_license || details?.DRIVING_LICENSE;
      if (dl && !actionFailed) {
        verifiedDocs.dl = true;
        extractedDl = dl.id_number || dl.dl_number || extractedDl;
        extractedName = extractedName || dl.name || null;
      }
      const rc = details?.vehicle_rc || details?.VEHICLE_RC || details?.rc;
      if (rc && !actionFailed) {
        verifiedDocs.rc = true;
        extractedRc =
          rc.id_number || rc.rc_number || rc.registration_number || extractedRc;
      }

      if (!actionFailed && isPositiveActionStatus(action?.status)) {
        if (actionType.includes('AADHAAR')) verifiedDocs.aadhaar = true;
        if (actionType.includes('PAN')) verifiedDocs.pan = true;
        if (actionType.includes('DRIVING') || actionType === 'DL') verifiedDocs.dl = true;
        if (actionType.includes('VEHICLE_RC') || actionType === 'RC') verifiedDocs.rc = true;
      }
    }

    const verified =
      digioStatus === 'approved' ||
      digioStatus === 'approval_pending' ||
      actions.some(
        (a) =>
          String(a?.status || '').toLowerCase() === 'approved' ||
          String(a?.status || '').toLowerCase() === 'completed' ||
          String(a?.status || '').toLowerCase() === 'success',
      );

    if (!verified) {
      verifiedDocs.aadhaar = false;
      verifiedDocs.pan = false;
      verifiedDocs.dl = false;
      verifiedDocs.rc = false;
    }

    const status =
      digioStatus === 'approved'
        ? 'VERIFIED'
        : digioStatus === 'rejected' || digioStatus === 'failed'
          ? 'FAILED'
          : digioStatus === 'expired'
            ? 'EXPIRED'
            : verified
              ? 'VERIFIED'
              : 'PENDING';

    const updated = await this.db.digioVerification.update({
      where: { id: existing.id },
      data: {
        status,
        verified,
        verifiedName: extractedName || existing.verifiedName,
        complianceOk: verified,
        complianceNotes: `DigiLocker status: ${digioStatus || status}`,
        verifiedAt: verified ? existing.verifiedAt || new Date() : null,
        summary: this.sanitizePayload({
          ...(typeof existing.summary === 'object' && existing.summary
            ? existing.summary
            : {}),
          digioStatus,
          extractedName,
          extractedPan,
          extractedDl,
          extractedRc,
          maskedAadhaar,
          verifiedDocs,
          actionsCount: actions.length,
          actionStatuses: actions.map((a) => ({
            type: a?.type,
            status: a?.status,
          })),
        }),
        rawResponse: this.sanitizePayload(res),
      },
    });

    if (updated.driverId) {
      await this.syncDriverDigioMetadata(updated.driverId, 'DIGILOCKER', {
        verificationId: updated.id,
        digioRequestId: updated.digioRequestId,
        verified: updated.verified,
        status: updated.status,
        verifiedName: updated.verifiedName,
        summary: updated.summary,
        verifiedAt: updated.verifiedAt?.toISOString() || null,
      });

      if (
        extractedPan ||
        extractedDl ||
        extractedRc ||
        Object.values(verifiedDocs).some(Boolean)
      ) {
        const driver = await this.db.driver.findUnique({
          where: { id: updated.driverId },
          select: { kycDocuments: true, vehiclePlate: true },
        });
        const kyc: Record<string, any> =
          driver?.kycDocuments && typeof driver.kycDocuments === 'object' && !Array.isArray(driver.kycDocuments)
            ? { ...(driver.kycDocuments as Record<string, any>) }
            : {};
        const prevDlkrDocs =
          kyc.digilockerVerifiedDocs && typeof kyc.digilockerVerifiedDocs === 'object'
            ? { ...kyc.digilockerVerifiedDocs }
            : {};
        kyc.digilockerVerifiedDocs = {
          ...prevDlkrDocs,
          ...(verifiedDocs.aadhaar ? { aadhaar: true } : {}),
          ...(verifiedDocs.pan ? { pan: true } : {}),
          ...(verifiedDocs.dl ? { dl: true } : {}),
          ...(verifiedDocs.rc ? { rc: true } : {}),
        };
        if (extractedPan) kyc.panNumber = extractedPan;
        if (extractedDl) kyc.dlNumber = extractedDl;
        if (extractedRc) kyc.rcNumber = String(extractedRc).trim().toUpperCase();
        await this.db.driver.update({
          where: { id: updated.driverId },
          data: {
            kycDocuments: kyc as any,
            ...(!driver?.vehiclePlate && extractedRc
              ? { vehiclePlate: String(extractedRc).trim().toUpperCase() }
              : {}),
          },
        });
      }
    }

    return this.formatRecord(updated);
  }

  async manageDigilockerApproval(
    actor: AuthUserDto,
    digioRequestId: string,
    dto: ManageDigilockerApprovalDto,
  ) {
    if (actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can manage DigiLocker KYC approval state');
    }
    await this.digioClient.manageKycApproval(
      digioRequestId,
      dto.status,
      dto.reason,
    );
    return this.syncDigilockerResponse(actor, digioRequestId);
  }

  async reattemptDigilockerRequest(actor: AuthUserDto, digioRequestId: string) {
    const existing = await this.db.digioVerification.findUnique({
      where: { digioRequestId },
    });
    if (!existing) {
      throw new NotFoundException('DigiLocker KYC session not found');
    }
    if (actor.role !== UserRole.ADMIN && existing.userId !== actor.id) {
      throw new ForbiddenException('Cannot reattempt another user session');
    }
    const res = await this.digioClient.reattemptKycRequest(digioRequestId);
    return {
      digioRequestId,
      status: res?.status || 'REATTEMPTED',
      raw: this.sanitizePayload(res),
    };
  }

  /**
   * Pull verified DigiLocker documents (Aadhaar, PAN, Driving License, Vehicle RC)
   * using Digio /client/kyc/v2/media/:fileId, sanitize & store into R2/local storage,
   * and attach URLs to the Driver profile automatically.
   */
  async syncDigilockerMedia(actor: AuthUserDto, digioRequestId: string) {
    const existing = await this.db.digioVerification.findUnique({
      where: { digioRequestId },
    });
    if (!existing) {
      throw new NotFoundException(`DigiLocker KYC request ${digioRequestId} not found`);
    }
    if (actor.role !== UserRole.ADMIN && existing.userId !== actor.id) {
      throw new ForbiddenException('You do not have access to this KYC session');
    }

    const res = await this.digioClient.getKycRequestResponse(digioRequestId);
    const actions: any[] = Array.isArray(res?.actions) ? res.actions : [];
    const attachedFiles: Array<{ docType: string; fileId: string; url: string }> = [];
    const driverPatch: Record<string, string> = {};
    const kycPatch: Record<string, any> = {};
    const mediaVerifiedDocs: Record<string, boolean> = {};

    const candidates: Array<{ docType: string; fileId: string }> = [];
    for (const action of actions) {
      const details = action?.details || {};
      const tryPush = (docType: string, fId?: unknown) => {
        if (typeof fId === 'string' && fId.trim()) {
          candidates.push({ docType, fileId: fId.trim() });
        }
      };
      tryPush('AADHAAR', details?.aadhaar?.file_id || details?.AADHAAR?.file_id);
      tryPush('PAN', details?.pan?.file_id || details?.PAN?.file_id);
      tryPush(
        'DRIVING_LICENSE',
        details?.driving_licence?.file_id ||
          details?.driving_license?.file_id ||
          details?.DRIVING_LICENSE?.file_id,
      );
      tryPush(
        'VEHICLE_RC',
        details?.vehicle_rc?.file_id || details?.VEHICLE_RC?.file_id || details?.rc?.file_id,
      );
      if (action?.file_id) {
        tryPush(String(action?.doc_type || action?.type || 'DOCUMENT').toUpperCase(), action.file_id);
      }
    }

    for (const item of candidates) {
      try {
        const media = await this.digioClient.downloadKycMedia(item.fileId, item.docType);
        const buf =
          media?.buffer ||
          (media?.data?.base64 ? Buffer.from(String(media.data.base64), 'base64') : null);
        if (!buf || !buf.length) continue;

        const ext = media.contentType?.includes('pdf')
          ? 'pdf'
          : media.contentType?.includes('png')
            ? 'png'
            : 'jpg';
        const saved = await this.storageService.saveFile({
          buffer: buf,
          originalname: `digilocker-${item.docType.toLowerCase()}-${Date.now()}.${ext}`,
          mimetype: media.contentType || 'image/jpeg',
          size: buf.length,
        });

        attachedFiles.push({ docType: item.docType, fileId: item.fileId, url: saved.url });
        if (existing.driverId) {
          if (item.docType.includes('AADHAAR')) {
            if (!driverPatch.aadharFrontUrl) driverPatch.aadharFrontUrl = saved.url;
            driverPatch.aadharBackUrl = saved.url;
            mediaVerifiedDocs.aadhaar = true;
          } else if (item.docType.includes('DRIVING') && !driverPatch.dlFrontUrl) {
            driverPatch.dlFrontUrl = saved.url;
            mediaVerifiedDocs.dl = true;
          } else if (item.docType.includes('PAN') && !driverPatch.panDocUrl) {
            driverPatch.panDocUrl = saved.url;
            mediaVerifiedDocs.pan = true;
          } else if (item.docType.includes('RC') && !driverPatch.rcDocUrl) {
            driverPatch.rcDocUrl = saved.url;
            kycPatch.rcDocUrl = saved.url;
            kycPatch.rcFrontUrl = saved.url;
            kycPatch.rcBackUrl = saved.url;
            mediaVerifiedDocs.rc = true;
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `Failed syncing DigiLocker media ${item.docType} (${item.fileId}): ${err?.message}`,
        );
      }
    }

    if (
      existing.driverId &&
      (Object.keys(driverPatch).length || Object.keys(kycPatch).length || Object.keys(mediaVerifiedDocs).length)
    ) {
      const driver = await this.db.driver.findUnique({
        where: { id: existing.driverId },
        select: { kycDocuments: true },
      });
      const existingKyc =
        driver?.kycDocuments && typeof driver.kycDocuments === 'object' && !Array.isArray(driver.kycDocuments)
          ? { ...(driver.kycDocuments as Record<string, any>) }
          : {};
      const existingDlkrDocs =
        existingKyc.digilockerVerifiedDocs && typeof existingKyc.digilockerVerifiedDocs === 'object'
          ? { ...existingKyc.digilockerVerifiedDocs }
          : {};
      await this.db.driver.update({
        where: { id: existing.driverId },
        data: {
          ...driverPatch,
          kycDocuments: {
            ...existingKyc,
            ...kycPatch,
            digilockerVerifiedDocs: {
              ...existingDlkrDocs,
              ...mediaVerifiedDocs,
            },
          } as any,
        },
      });
    }

    return {
      digioRequestId,
      attachedCount: attachedFiles.length,
      attachedFiles,
      documentUrls: {
        ...driverPatch,
        ...kycPatch,
      },
    };
  }

  /**
   * Digio webhook receiver. Digio's contract: answer 200 within 10 s, do no business logic inline,
   * and expect at-least-once delivery. After 24 h of failures Digio disables webhooks for the WHOLE
   * account. So this method only authenticates, de-duplicates and acknowledges; the authoritative
   * state is then pulled from Digio's API in the background (webhook fields are never trusted).
   *
   * Without DIGIO_WEBHOOK_SECRET in production the webhook is acknowledged and ignored (no outbound
   * calls), so an unauthenticated caller cannot drive traffic to Digio. Polling/explicit sync still
   * work. Outside production the IP allow-list is advisory.
   */
  async handleWebhook(params: {
    rawBody?: Buffer | string;
    checksumHeader?: string;
    remoteIp?: string;
    payload: any;
  }) {
    const payload = params.payload || {};
    const eventName = String(payload?.event || 'kyc.webhook');

    if (this.digioClient.hasWebhookSecret) {
      const valid = this.digioClient.verifyWebhookChecksum(params.rawBody, params.checksumHeader);
      if (!valid) {
        this.logger.warn('Rejected Digio webhook with invalid X-Digio-Checksum');
        throw new UnauthorizedException('Invalid X-Digio-Checksum signature');
      }
    } else if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        'Digio webhook ignored: DIGIO_WEBHOOK_SECRET is not configured. Set it (same value as the Digio dashboard) to enable webhooks.',
      );
      return { acknowledged: true, event: eventName, processed: false, reason: 'WEBHOOK_SECRET_NOT_CONFIGURED' };
    } else if (params.remoteIp) {
      const cleanIp = params.remoteIp.replace('::ffff:', '').trim();
      const allowed = this.digioClient.allowedWebhookIps;
      if (allowed.length && !allowed.includes(cleanIp) && cleanIp !== '127.0.0.1' && cleanIp !== '::1') {
        this.logger.warn(`Digio webhook received from non-allowlisted IP: ${cleanIp}`);
      }
    }

    // At-least-once delivery: the same notification id is processed once.
    const webhookId = typeof payload?.id === 'string' ? payload.id : null;
    if (webhookId && !(await this.claimWebhook(webhookId))) {
      return { acknowledged: true, event: eventName, duplicate: true };
    }

    const digioRequestId: string | undefined =
      payload?.payload?.kyc_request?.id || payload?.entities?.[0] || undefined;
    this.logger.log(`Digio webhook received: event=${eventName}, requestId=${digioRequestId || 'unknown'}`);

    if (digioRequestId) {
      // Respond now; reconcile with Digio's API off the request path.
      setImmediate(() => {
        void this.reconcileWebhookRequest(digioRequestId).catch((err: any) =>
          this.logger.warn(`Webhook sync for ${digioRequestId} failed: ${err?.message}`),
        );
      });
    }
    return { acknowledged: true, event: eventName, queued: Boolean(digioRequestId) };
  }

  /** SET NX on the webhook id (24 h). Without Redis every delivery is processed (sync is idempotent). */
  private async claimWebhook(webhookId: string): Promise<boolean> {
    const client: any = this.redis?.getClient?.();
    if (!client) return true;
    try {
      const res = await client.set(`digio:webhook:${webhookId}`, '1', 'EX', 86_400, 'NX');
      return res !== null;
    } catch {
      return true;
    }
  }

  /** Pulls the authoritative state for a request we know about. Exposed for tests. */
  async reconcileWebhookRequest(digioRequestId: string) {
    const existing = await this.db.digioVerification.findUnique({
      where: { digioRequestId },
      select: { id: true },
    });
    if (!existing) return null;
    return this.syncDigilockerResponse(null, digioRequestId);
  }

  // ---------------------------------------------------------------------------
  // Admin One-Click Full Verification Suite for a Driver
  // ---------------------------------------------------------------------------

  async runAdminDriverSuite(
    adminUser: AuthUserDto,
    driverId: string,
    dto: AdminRunDriverDigioSuiteDto,
  ) {
    const driver = await this.db.driver.findUnique({
      where: { id: driverId },
      include: { vehicles: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const kyc =
      driver.kycDocuments && typeof driver.kycDocuments === 'object' && !Array.isArray(driver.kycDocuments)
        ? (driver.kycDocuments as Record<string, any>)
        : {};

    const results: Record<string, any> = {};
    const errors: Record<string, string> = {};

    // 1. Aadhaar Front/Back OCR + Masking
    if (dto.includeAadhaarMask !== false && driver.aadharFrontUrl) {
      try {
        results.AADHAAR_OCR_AND_MASK = await this.analyzeStoredIdCard(adminUser, {
          frontDocUrl: driver.aadharFrontUrl,
          backDocUrl: driver.aadharBackUrl || undefined,
          expectedIds: ['AADHAAR'],
          features: ['MASK', 'CROP_ALIGN', 'VERIFY', 'FACE_EXTRACT'],
          saveMaskedToDriver: true,
          aadhaarSide: 'FRONT',
          targetDriverId: driverId,
        });
      } catch (err: any) {
        errors.AADHAAR_OCR_AND_MASK = err?.message || 'Aadhaar OCR/masking failed';
      }
    }

    // 2. PAN Verification
    const panNo = (dto.panOverride || kyc.panNumber || '').trim();
    if (dto.includePan !== false && panNo) {
      try {
        results.PAN = await this.verifyPan(adminUser, {
          panNumber: panNo,
          name: driver.fullName,
          dob: dto.dobOverride || kyc.dateOfBirth || undefined,
          targetDriverId: driverId,
        });
      } catch (err: any) {
        errors.PAN = err?.message || 'PAN check failed';
      }
    }

    // 3. Driving License Verification
    const dlNo = (dto.dlOverride || kyc.dlNumber || '').trim();
    const dob = (dto.dobOverride || kyc.dateOfBirth || '').trim();
    if (dto.includeDl !== false && dlNo && dob) {
      try {
        results.DRIVING_LICENSE = await this.verifyDrivingLicense(adminUser, {
          dlNumber: dlNo,
          dob,
          name: driver.fullName,
          targetDriverId: driverId,
        });
      } catch (err: any) {
        errors.DRIVING_LICENSE = err?.message || 'DL check failed';
      }
    }

    // 4. Vehicle RC Verification
    const rcNo = (
      dto.rcOverride ||
      driver.vehicles?.[0]?.registrationNumber ||
      driver.vehiclePlate ||
      ''
    ).trim();
    if (dto.includeRc !== false && rcNo) {
      try {
        results.VEHICLE_RC = await this.verifyVehicleRc(adminUser, {
          registrationNumber: rcNo,
          vehicleId: driver.vehicles?.[0]?.id,
          targetDriverId: driverId,
        });
      } catch (err: any) {
        errors.VEHICLE_RC = err?.message || 'Vehicle RC check failed';
      }
    }

    // 5. Biometric Face Match & Liveness
    if (dto.includeFaceMatch !== false && kyc.profilePhotoUrl) {
      try {
        results.LIVENESS = await this.checkStoredLiveness(adminUser, {
          imageUrl: kyc.profilePhotoUrl,
          targetDriverId: driverId,
        });
      } catch (err: any) {
        errors.LIVENESS = err?.message || 'Liveness check failed';
      }

      if (driver.dlFrontUrl || driver.aadharFrontUrl || driver.panDocUrl) {
        try {
          results.FACE_MATCH = await this.faceMatchStored(adminUser, {
            image1Url: kyc.profilePhotoUrl,
            image2Url: driver.dlFrontUrl || driver.aadharFrontUrl || driver.panDocUrl || undefined,
            minimumMatch: 65,
            targetDriverId: driverId,
          });
        } catch (err: any) {
          errors.FACE_MATCH = err?.message || 'Face match failed';
        }
      }
    }

    // 6. Bank Account Penny-less Check
    if (dto.includeBank !== false && kyc.bankAccountNumber && kyc.bankIfsc) {
      try {
        results.BANK_ACCOUNT = await this.verifyBankAccount(adminUser, {
          accountNumber: kyc.bankAccountNumber,
          ifsc: kyc.bankIfsc,
          accountHolderName: kyc.bankAccountName || driver.fullName,
          validationMode: 'PENNY_LESS',
          saveToDriverProfile: false,
          targetDriverId: driverId,
        });
      } catch (err: any) {
        errors.BANK_ACCOUNT = err?.message || 'Bank verification failed';
      }
    }

    // 7. Identity Name Cross-Check via Digio Fuzzy Match
    const referenceName =
      results.DRIVING_LICENSE?.verifiedName ||
      results.PAN?.verifiedName ||
      results.BANK_ACCOUNT?.verifiedName ||
      results.AADHAAR_OCR_AND_MASK?.verifiedName;
    if (dto.includeFuzzyMatch !== false && driver.fullName && referenceName) {
      try {
        results.FUZZY_MATCH = await this.fuzzyMatch(adminUser, {
          sourceText: driver.fullName,
          targetText: String(referenceName),
          context: 'name',
          minConfidence: 75,
          targetDriverId: driverId,
        });
      } catch (err: any) {
        errors.FUZZY_MATCH = err?.message || 'Name fuzzy match failed';
      }
    }

    const latestState = await this.getDriverVerificationsForAdmin(driverId);

    return {
      driverId,
      executedChecks: Object.keys(results),
      results,
      errors,
      complianceAlerts: latestState.complianceAlerts,
    };
  }
}
