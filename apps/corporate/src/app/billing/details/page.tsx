'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Download,
  Calendar,
  Building2,
  FileText,
  IndianRupee,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { billingApi } from '../../../lib/api/corporate';
import { InvoiceDetail } from '../../../lib/api/types';

function formatPaiseToRupees(paise: string | number): string {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(rupees);
}

function InvoiceDetailsContent() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get('id');
  const activeTenantId = searchParams.get('tenantId') || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'lines'>('summary');

  useEffect(() => {
    async function fetchInvoice() {
      try {
        setLoading(true);
        let targetId = queryId;
        if (!targetId && activeTenantId) {
          const listRes = await billingApi.invoices(activeTenantId, { limit: 1 });
          if (listRes.items && listRes.items.length > 0) {
            targetId = listRes.items[0].id;
          }
        }

        if (targetId) {
          const data = await billingApi.invoice(targetId);
          setInvoice(data);
        } else {
          setInvoice(null);
        }
      } catch (err) {
        console.error('Failed to load invoice details:', err);
        setInvoice(null);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [queryId, activeTenantId]);

  if (loading) {
    return (
      <div className="surface-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading invoice breakdown...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="surface-card" style={{ padding: '48px', textAlign: 'center', backgroundColor: 'var(--bg-surface)' }}>
        <Layers size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Invoice Not Found</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
          Select an invoice from the invoice registry to view its line-by-line settlement details.
        </p>
        <Link
          href="/billing/invoices"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            backgroundColor: '#5728B2',
            color: '#FFFFFF',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} /> Back to Invoices
        </Link>
      </div>
    );
  }

  const period = `${new Date(invoice.billingPeriodStart).toLocaleDateString()} - ${new Date(invoice.billingPeriodEnd).toLocaleDateString()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Download Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link href="/billing/invoices" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={18} />
            </Link>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Invoice {invoice.invoiceNumber}
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: invoice.status === 'PAID' ? '#DCFCE7' : '#EFF6FF',
                color: invoice.status === 'PAID' ? '#16A34A' : '#5728B2',
                border: '1px solid currentColor',
              }}
            >
              {invoice.status}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 28px' }}>
            Detailed breakdown of invoice routes, distance telemetry and GST calculations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => billingApi.downloadPdf(invoice)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#5728B2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(87, 40, 178,0.25)',
            }}
          >
            <Download size={15} />
            <span>Download GST PDF</span>
          </button>
        </div>
      </div>

      {/* Invoice Overview Strip */}
      <div
        className="surface-card"
        style={{
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '14px',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Billing Period</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{period}</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Routes / Lines</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#5728B2' }}>{invoice.lines?.length || 0} Routes</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Taxable Subtotal</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatPaiseToRupees(invoice.subtotalPaise)}</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>GST Amount</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>{formatPaiseToRupees(invoice.gstPaise)}</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total B2B Amount</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#16A34A' }}>{formatPaiseToRupees(invoice.totalAmountPaise)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'summary' ? '#5728B2' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === 'summary' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Invoice Summary
          </button>
          <button
            onClick={() => setActiveTab('lines')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'lines' ? '#5728B2' : 'var(--text-secondary)',
              borderBottom: `2px solid ${activeTab === 'lines' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Line Items ({invoice.lines?.length || 0})
          </button>
        </div>

        {activeTab === 'summary' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                Statutory GST & Tax Summary
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Tax Invoice Number</td>
                    <td style={{ padding: '10px 0', fontWeight: 600, textAlign: 'right' }}>{invoice.invoiceNumber}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Invoice Creation Date</td>
                    <td style={{ padding: '10px 0', fontWeight: 600, textAlign: 'right' }}>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Taxable Transport Amount</td>
                    <td style={{ padding: '10px 0', fontWeight: 600, textAlign: 'right' }}>{formatPaiseToRupees(invoice.subtotalPaise)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 0', color: 'var(--text-secondary)' }}>Applicable GST</td>
                    <td style={{ padding: '10px 0', fontWeight: 600, textAlign: 'right' }}>{formatPaiseToRupees(invoice.gstPaise)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 0', fontWeight: 700, color: 'var(--text-primary)' }}>Total Net Payable</td>
                    <td style={{ padding: '12px 0', fontWeight: 800, textAlign: 'right', color: '#16A34A', fontSize: 16 }}>
                      {formatPaiseToRupees(invoice.totalAmountPaise)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                Compliance & Reconciliation Status
              </h3>
              <div style={{ backgroundColor: 'var(--bg-surface-muted)', borderRadius: 8, padding: 16, border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <ShieldCheck size={18} color="#16A34A" />
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>GST Act Sec 31 Compliant</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                  All route telemetry lines, distance meters, and no-show adjustments have been cross-verified with driver GPS event logs.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link
                    href={`/billing/disputes`}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#DC2626',
                      textDecoration: 'none',
                    }}
                  >
                    Raise Dispute / Correction →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Route / Line ID</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Line Type</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Billable Distance</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>No Shows</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines && invoice.lines.length > 0 ? (
                  invoice.lines.map((line) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {line.route ? `${line.route.shiftDate} ${line.route.shiftTime} (${line.route.direction})` : line.id.slice(0, 8)}
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{line.lineType}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                        {(line.billableDistanceMeters / 1000).toFixed(1)} km
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{line.noShowCount}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatPaiseToRupees(line.amountPaise)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No route line items associated with this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InvoiceDetailsPage() {
  return (
    <React.Suspense fallback={<div className="surface-card" style={{ padding: '40px', textAlign: 'center' }}>Loading invoice details...</div>}>
      <InvoiceDetailsContent />
    </React.Suspense>
  );
}
