import { BadRequestException } from '@nestjs/common';

/** Money travels as a decimal string (or safe integer) of paise; it is parsed to BigInt. */
export type PaiseInput = string | number;

export interface CreateCorporateRateCardDto {
  tenantId: string;
  vehicleCategory?: string;
  baseFarePaise: PaiseInput;
  baseDistanceMeters?: number;
  perKmPaise: PaiseInput;
  perExtraStopPaise?: PaiseInput;
  perHourPaise?: PaiseInput | null;
  minimumPaise?: PaiseInput;
  noShowPaise?: PaiseInput;
  cancellationPaise?: PaiseInput;
  /** ISO instant the version starts applying (trip pickup time >= effectiveFrom). */
  effectiveFrom: string;
}

export interface CreateDriverRateCardDto {
  vehicleCategory?: string;
  basePayoutPaise: PaiseInput;
  baseDistanceMeters?: number;
  perKmPaise: PaiseInput;
  tollReimbursementPaise?: PaiseInput;
  perHourPaise?: PaiseInput | null;
  minimumPaise?: PaiseInput;
  noShowPaise?: PaiseInput;
  cancellationPaise?: PaiseInput;
  effectiveFrom: string;
}

export interface RetireRateCardDto {
  /** Optional ISO instant the version stops applying; default now. */
  effectiveTo?: string;
}

export interface CreatePayoutBatchRequestDto {
  driverIds?: string[];
  cutoffDate?: string;
  idempotencyKey?: string;
}

export interface RaiseInvoiceDisputeDto {
  reason: string;
  /** Pre-tax amount the tenant disputes, in paise. */
  claimedAmountPaise: PaiseInput;
  invoiceLineId?: string;
}

export interface ResolveInvoiceDisputeDto {
  /** Accept only: pre-tax amount credited (default = claimed). */
  approvedAmountPaise?: PaiseInput;
  note?: string;
}

export function parsePaise(value: unknown, field: string, opts: { required?: boolean; positive?: boolean } = {}): bigint | undefined {
  if (value === undefined || value === null || value === '') {
    if (opts.required) throw new BadRequestException(`${field} is required (integer paise)`);
    return undefined;
  }
  const raw = typeof value === 'number' ? (Number.isSafeInteger(value) ? String(value) : 'x') : String(value).trim();
  if (!/^\d{1,15}$/.test(raw)) {
    throw new BadRequestException(`${field} must be a non-negative integer amount in paise`);
  }
  const v = BigInt(raw);
  if (opts.positive && v <= 0n) throw new BadRequestException(`${field} must be greater than zero`);
  return v;
}

export function parseInstant(value: unknown, field: string): Date {
  const d = typeof value === 'string' || value instanceof Date ? new Date(value) : new Date(NaN);
  if (isNaN(d.getTime())) throw new BadRequestException(`${field} must be an ISO timestamp`);
  return d;
}

export function normalizeCategory(value: unknown): string {
  const cat = String(value ?? 'SEDAN').trim().toUpperCase();
  if (!/^[A-Z0-9_]{2,16}$/.test(cat)) throw new BadRequestException('vehicleCategory must be 2-16 chars [A-Z0-9_]');
  return cat;
}

/** BigInt-safe JSON view (money as strings). */
export function serializeMoney<T extends Record<string, any>>(row: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row ?? {})) out[k] = typeof v === 'bigint' ? v.toString() : v;
  return out;
}
