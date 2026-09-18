'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CreditCard, CheckCircle2, Lock, RotateCcw } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { AdminPaymentItem, AdminPaymentMetrics } from '../../lib/api/types';
import {
  PageHeader,
  MetricCard,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
} from '../../components/common';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Payments' },
  { id: 'HELD_IN_ESCROW', label: 'Escrow Held' },
  { id: 'RELEASED', label: 'Released / Settled' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'REFUNDED', label: 'Refunded' },
  { id: 'FAILED', label: 'Failed' },
];

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [metrics, setMetrics] = useState<AdminPaymentMetrics>({
    totalEscrowVolume: 0,
    activeEscrowHolds: 0,
    settledVolume: 0,
    pendingTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentItem | null>(null);

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  async function loadData(status: string) {
    setLoading(true);
    try {
      const [paymentsRes, metricsRes] = await Promise.all([
        adminApi.getAdminPayments({
          status: status !== 'ALL' ? status : undefined,
          limit: 100,
        }).catch(() => ({ items: [], total: 0 })),
        adminApi.getAdminPaymentMetrics().catch(() => ({
          totalEscrowVolume: 0,
          activeEscrowHolds: 0,
          settledVolume: 0,
          pendingTransactions: 0,
        })),
      ]);
      setPayments(paymentsRes.items || []);
      setMetrics(metricsRes);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase().trim();
    return payments.filter((p) => {
      return (
        p.id.toLowerCase().includes(q) ||
        (p.vendorName && p.vendorName.toLowerCase().includes(q)) ||
        (p.requirementId && p.requirementId.toLowerCase().includes(q)) ||
        (p.gatewayPaymentId && p.gatewayPaymentId.toLowerCase().includes(q)) ||
        (p.gatewayOrderId && p.gatewayOrderId.toLowerCase().includes(q))
      );
    });
  }, [payments, searchQuery]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <PageHeader
        title="Customer Payments & Escrow Ledger"
        subtitle="Monitor enterprise client invoices, pre-authorized escrow payments, and captured ride receipts"
        liveStatus="Payment Gateway Synced (RazorpayX)"
      />

      {/* Top Level Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <MetricCard
          label="Total Escrow Volume"
          value={`₹ ${Number(metrics.totalEscrowVolume || 0).toLocaleString('en-IN')}`}
          subtext="Total escrow deposits to date"
          icon={<CreditCard size={18} color="var(--brand-primary)" />}
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Settled & Disbursed"
          value={`₹ ${Number(metrics.settledVolume || 0).toLocaleString('en-IN')}`}
          subtext="Released to drivers upon completion"
          icon={<CheckCircle2 size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Active Escrow Holds"
          value={`₹ ${Number(metrics.activeEscrowHolds || 0).toLocaleString('en-IN')}`}
          subtext="Locked in escrow for active trips"
          icon={<Lock size={18} color="#8B5CF6" />}
          accentColor="#8B5CF6"
        />
        <MetricCard
          label="Pending Transactions"
          value={metrics.pendingTransactions || 0}
          subtext="Awaiting gateway clearance"
          icon={<RotateCcw size={18} color="var(--color-warning)" />}
          accentColor="var(--color-warning)"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        tabs={STATUS_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          count:
            t.id === 'ALL'
              ? payments.length
              : payments.filter((p) => p.status === t.id).length,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by vendor, gateway reference, transaction ID..."
      />

      {/* Payments DataTable */}
      <DataTable
        columns={[
          {
            header: 'PAYMENT ID',
            accessor: (p: AdminPaymentItem) => (
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.8125rem' }}>
                  #{p.id.slice(0, 10).toUpperCase()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
            ),
          },
          {
            header: 'ENTERPRISE VENDOR',
            accessor: (p: AdminPaymentItem) => (
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                {p.vendorName || 'Corporate Client'}
              </div>
            ),
          },
          {
            header: 'REQUIREMENT REF',
            accessor: (p: AdminPaymentItem) => (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.4rem',
                  backgroundColor: 'var(--bg-card-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {p.requirementId ? `#REQ-${p.requirementId.slice(0, 6).toUpperCase()}` : 'WALLET TOP-UP'}
              </span>
            ),
          },
          {
            header: 'TRANSACTION AMOUNT',
            accessor: (p: AdminPaymentItem) => (
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                ₹ {Number(p.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            ),
          },
          {
            header: 'GATEWAY & REFERENCE',
            accessor: (p: AdminPaymentItem) => (
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {p.paymentGateway || 'RAZORPAY'} ({p.type.replace(/_/g, ' ')})
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  {p.gatewayPaymentId || p.gatewayOrderId || 'Direct Clearance'}
                </div>
              </div>
            ),
          },
          {
            header: 'STATUS',
            accessor: (p: AdminPaymentItem) => <StatusBadge status={p.status} />,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            accessor: (p: AdminPaymentItem) => (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPayment(p);
                }}
              >
                Receipt Dossier
              </Button>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(p) => p.id}
        loading={loading}
        onRowClick={(p) => setSelectedPayment(p)}
        emptyMessage="No payment transactions found matching your filters"
      />

      {/* Slide-out Payment Dossier Drawer */}
      <Drawer
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title={selectedPayment ? `Payment Dossier #${selectedPayment.id.slice(0, 10).toUpperCase()}` : 'Payment Dossier'}
        subtitle={selectedPayment ? `Gateway ID: ${selectedPayment.gatewayPaymentId || selectedPayment.gatewayOrderId || 'N/A'}` : ''}
        footer={
          <Button variant="secondary" size="sm" onClick={() => setSelectedPayment(null)}>
            Close Dossier
          </Button>
        }
      >
        {selectedPayment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Amount Summary */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payment Status</div>
                <div style={{ marginTop: '0.25rem' }}>
                  <StatusBadge status={selectedPayment.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gross Invoiced Amount</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.125rem' }}>
                  ₹ {Number(selectedPayment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Transaction Breakdown Card */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                Escrow & Gateway Details
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Enterprise Client:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedPayment.vendorName || 'Corporate Client'}</span>
              </div>
              {selectedPayment.requirementId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Requirement Ref:</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--brand-primary)' }}>#{selectedPayment.requirementId.slice(0, 10).toUpperCase()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Gateway:</span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedPayment.paymentGateway}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Transaction Type:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedPayment.type.replace(/_/g, ' ')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Order ID:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{selectedPayment.gatewayOrderId || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Settled Timestamp:</span>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {new Date(selectedPayment.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
