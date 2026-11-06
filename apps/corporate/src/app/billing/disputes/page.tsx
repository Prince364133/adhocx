'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Scale,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Eye,
  MessageSquare,
  Search,
  X,
  Layers,
} from 'lucide-react';
import { billingApi } from '../../../lib/api/corporate';
import { Invoice, InvoiceDispute } from '../../../lib/api/types';

function formatPaiseToRupees(paise: string | number): string {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

interface PageProps {
  searchParams?: { tenantId?: string };
}

export default function BillingDisputesPage({ searchParams }: PageProps) {
  const activeTenantId = searchParams?.tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<InvoiceDispute[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Raise dispute modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [reason, setReason] = useState('');
  const [claimedAmountRupees, setClaimedAmountRupees] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    if (!activeTenantId) return;
    try {
      setLoading(true);
      const [dispRes, invRes] = await Promise.all([
        billingApi.disputes(activeTenantId),
        billingApi.invoices(activeTenantId, { limit: 50 }),
      ]);
      setDisputes(dispRes || []);
      setInvoices(invRes.items || []);
    } catch (err) {
      console.error('Failed to load disputes data:', err);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [activeTenantId]);

  const openDisputes = disputes.filter((d) => d.status === 'OPEN');
  const resolvedDisputes = disputes.filter((d) => d.status === 'ACCEPTED' || d.status === 'REJECTED');

  const filteredDisputes = disputes.filter((item) => {
    if (activeTab === 'open' && item.status !== 'OPEN') return false;
    if (activeTab === 'resolved' && item.status !== 'ACCEPTED' && item.status !== 'REJECTED') return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.invoiceId.toLowerCase().includes(q) ||
      item.reason.toLowerCase().includes(q)
    );
  });

  const totalDisputedPaise = disputes.reduce(
    (acc, d) => acc + (Number(d.claimedAmountPaise) || 0),
    0,
  );
  const totalApprovedPaise = disputes.reduce(
    (acc, d) => acc + (Number(d.approvedAmountPaise) || 0),
    0,
  );

  async function handleRaiseDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInvoiceId || !reason || !claimedAmountRupees) {
      alert('Please fill in all dispute fields');
      return;
    }

    try {
      setSubmitting(true);
      const claimedPaise = String(Math.round(parseFloat(claimedAmountRupees) * 100));
      await billingApi.raiseDispute(selectedInvoiceId, {
        reason,
        claimedAmountPaise: claimedPaise,
      });
      setShowModal(false);
      setSelectedInvoiceId('');
      setReason('');
      setClaimedAmountRupees('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Raise Dispute Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Billing Disputes & Adjustments
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Track, review and dispute invoice line items with auditable credit note issuance
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
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
          <Plus size={16} />
          <span>Raise Dispute</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div
        className="surface-card"
        style={{
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '14px',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706' }}>
              {loading ? '...' : openDisputes.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Open Disputes</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#16A34A' }}>
              {loading ? '...' : resolvedDisputes.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Resolved</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IndianRupee size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {loading ? '...' : formatPaiseToRupees(totalDisputedPaise)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Disputed Claimed</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#16A34A' }}>
              {loading ? '...' : formatPaiseToRupees(totalApprovedPaise)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Approved Credit</div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="surface-card" style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
        {/* Tabs Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: activeTab === 'all' ? '#5728B2' : 'var(--bg-surface-muted)',
                color: activeTab === 'all' ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              All Disputes ({disputes.length})
            </button>
            <button
              onClick={() => setActiveTab('open')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: activeTab === 'open' ? '#D97706' : '#FEF3C7',
                color: activeTab === 'open' ? '#FFFFFF' : '#D97706',
                cursor: 'pointer',
              }}
            >
              Open ({openDisputes.length})
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: '12px',
                fontWeight: 700,
                border: 'none',
                backgroundColor: activeTab === 'resolved' ? '#16A34A' : '#DCFCE7',
                color: activeTab === 'resolved' ? '#FFFFFF' : '#16A34A',
                cursor: 'pointer',
              }}
            >
              Resolved ({resolvedDisputes.length})
            </button>
          </div>

          <div style={{ position: 'relative', width: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search disputes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 12,
              }}
            />
          </div>
        </div>

        {/* Disputes Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Dispute ID</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Invoice #</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Reason</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Claimed</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Approved</th>
                <th style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading billing disputes...
                  </td>
                </tr>
              ) : filteredDisputes.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Layers size={32} style={{ opacity: 0.3 }} />
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>No disputes found</p>
                      <p style={{ margin: 0, fontSize: 12 }}>There are no disputes filed matching the current filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDisputes.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {d.id.slice(0, 8)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link
                        href={`/billing/details?id=${d.invoiceId}`}
                        style={{ color: '#5728B2', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {d.invoiceId.slice(0, 12)}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                      <div>{d.reason}</div>
                      {d.resolutionNote && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Note: {d.resolutionNote}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatPaiseToRupees(d.claimedAmountPaise)}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#16A34A' }}>
                      {d.approvedAmountPaise ? formatPaiseToRupees(d.approvedAmountPaise) : '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor:
                            d.status === 'ACCEPTED'
                              ? '#DCFCE7'
                              : d.status === 'REJECTED'
                              ? '#FEE2E2'
                              : '#FEF3C7',
                          color:
                            d.status === 'ACCEPTED'
                              ? '#16A34A'
                              : d.status === 'REJECTED'
                              ? '#DC2626'
                              : '#D97706',
                        }}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Raise Dispute */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: 500,
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Raise Invoice Dispute</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRaiseDispute} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Select Invoice
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                  required
                >
                  <option value="">-- Choose Invoice --</option>
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} ({formatPaiseToRupees(inv.totalAmountPaise)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Claimed Disputed Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={claimedAmountRupees}
                  onChange={(e) => setClaimedAmountRupees(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Reason for Dispute
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe discrepancy (e.g. driver GPS variance, cancelled trip charged, etc.)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    resize: 'vertical',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#5728B2',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
