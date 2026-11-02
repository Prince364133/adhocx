import { CorporateInvoiceStatus } from '../../enums';

export interface GenerateInvoiceBatchDto {
  tenantId: string;
  billingPeriodStart: string; // YYYY-MM-DD
  billingPeriodEnd: string; // YYYY-MM-DD
  gstRatePct?: number; // 5 or 18
}

export interface CorporateInvoiceSummaryDto {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  subtotalPaise: string;
  gstPaise: string;
  totalAmountPaise: string;
  status: CorporateInvoiceStatus;
  linesCount: number;
}

export interface DriverPayoutBatchDto {
  driverIds?: string[];
  cutoffDate?: string;
}
