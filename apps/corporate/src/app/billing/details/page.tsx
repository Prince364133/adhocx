'use client';

import React, { useState } from 'react';
import {
  Download,
  MoreVertical,
  Calendar,
  Building2,
  FileText,
  IndianRupee,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function InvoiceDetailsPage() {
  const [activeTab, setActiveTab] = useState<'summary' | 'trips' | 'payments' | 'adjustments' | 'documents'>('summary');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Download Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Invoice Details â€” INV-2026-010
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                border: '1px solid #FCD34D',
              }}
            >
              Partially Paid
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Detailed breakdown of invoice, trip charges and payment information
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => alert('Downloading official GST invoice PDF')}
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
            <span>Download PDF</span>
          </button>
          <button
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <MoreVertical size={16} color="#64748B" />
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
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>17 Nov - 23 Nov 2026</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Office Hub</div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Gachibowli</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Trip Count</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#5728B2' }}>1,102 Trips</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Total Amount</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>â‚¹ 4,21,000</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Paid Amount</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#16A34A' }}>â‚¹ 2,50,000</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Balance</div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#DC2626' }}>â‚¹ 1,71,000</div>
        </div>
      </div>

      {/* Tabs & Content Split */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
        {/* Tabs Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'summary' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'summary' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Invoice Summary
          </button>
          <button
            onClick={() => setActiveTab('trips')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'trips' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'trips' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Trip Details (1,102)
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'payments' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'payments' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Payments (1)
          </button>
          <button
            onClick={() => setActiveTab('adjustments')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'adjustments' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'adjustments' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Adjustments (0)
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'documents' ? '#5728B2' : '#64748B',
              borderBottom: `2px solid ${activeTab === 'documents' ? '#5728B2' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            Documents
          </button>
        </div>

        {/* 2-Column Split: Charge Breakdown + Invoice Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          {/* Left: Charge Breakdown Table */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Charge Breakdown
            </h3>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Trips</th>
                  <th style={{ textAlign: 'right' }}>Rate (â‚¹)</th>
                  <th style={{ textAlign: 'right' }}>Amount (â‚¹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Employee Trips (Roster)</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>982</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>350.00</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>3,43,700</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Ad-hoc Trips</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>74</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>400.00</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>29,600</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Re-routes / Extra Distance</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>26</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>250.00</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>6,500</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Other Applicable Charges</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>â€”</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>â€”</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>41,200</td>
                </tr>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)' }}>
                  <td colSpan={3} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Subtotal</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>4,21,000</td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ color: 'var(--text-secondary)' }}>Tax (GST 18%)</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>Included</td>
                </tr>
                <tr style={{ backgroundColor: '#EFF6FF', borderTop: '2px solid #5728B2' }}>
                  <td colSpan={3} style={{ fontWeight: 800, color: '#5728B2', fontSize: '14px' }}>Total Invoice Amount</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#5728B2', fontSize: '15px' }}>â‚¹ 4,21,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Right: Invoice Information & Contract PO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ backgroundColor: 'var(--bg-surface-muted)', padding: '18px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                Invoice Information
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Invoice Date</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>24 Nov 2026</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Due Date</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>30 Nov 2026</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Payment Terms</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Net 7 Days</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>PO / Contract No.</span>
                  <span style={{ fontWeight: 700, color: '#5728B2' }}>PO-HTEC-2026-019</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Rate Card</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>HTEC - Standard v2.0</span>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--bg-surface-muted)', padding: '16px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Remarks</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Weekly corporate transport billing for Gachibowli SEZ Hub operations (17 Nov - 23 Nov 2026). Compliant with GST TDS rate rules.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

