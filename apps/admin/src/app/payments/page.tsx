'use client';

import React, { useState, useMemo } from 'react';
import {
  PageHeader,
  MetricCard,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
} from '../../components/common';

interface PaymentItem {
  id: string;
  vendorName: string;
  requirementId: string;
  amount: number;
  status: 'CAPTURED' | 'AUTHORIZED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  transactionRef: string;
  gatewayFee: number;
  netSettlement: number;
  createdAt: string;
}

const INITIAL_PAYMENTS: PaymentItem[] = [
  {
    id: 'pay-801',
    vendorName: 'Acme Corporate Logistics Ltd',
    requirementId: 'req-201',
    amount: 64000,
    status: 'CAPTURED',
    paymentMethod: 'CORPORATE_NETBANKING',
    transactionRef: 'TXN_ACME_982341',
    gatewayFee: 1280,
    netSettlement: 62720,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'pay-802',
    vendorName: 'Metro Fleet Cabs Pvt Ltd',
    requirementId: 'req-202',
    amount: 38400,
    status: 'CAPTURED',
    paymentMethod: 'UPI_COLLECT',
    transactionRef: 'UPI2026090388912',
    gatewayFee: 0,
    netSettlement: 38400,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'pay-803',
    vendorName: 'TechCorp Transport Services',
    requirementId: 'req-204',
    amount: 14000,
    status: 'AUTHORIZED',
    paymentMethod: 'CORPORATE_CARD',
    transactionRef: 'AUTH_991823',
    gatewayFee: 280,
    netSettlement: 13720,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'pay-804',
    vendorName: 'Zenith Global Solutions',
    requirementId: 'req-205',
    amount: 22500,
    status: 'REFUNDED',
    paymentMethod: 'UPI_COLLECT',
    transactionRef: 'UPI2026090199124',
    gatewayFee: 0,
    netSettlement: 22500,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const STATUS_TABS = [
  { id: 'ALL', label: 'All Payments' },
  { id: 'CAPTURED', label: 'Captured' },
  { id: 'AUTHORIZED', label: 'Escrow Held' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'REFUNDED', label: 'Refunded' },
  { id: 'FAILED', label: 'Failed' },
];

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);

  const filtered = useMemo(() => {
    return INITIAL_PAYMENTS.filter((p) => {
      if (activeTab !== 'ALL' && p.status !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          p.id.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q) ||
          p.requirementId.toLowerCase().includes(q) ||
          p.transactionRef.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeTab, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const totalCaptured = INITIAL_PAYMENTS.filter((p) => p.status === 'CAPTURED').reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const totalEscrow = INITIAL_PAYMENTS.filter((p) => p.status === 'AUTHORIZED').reduce(
      (sum, p) => sum + p.amount,
      0
    );
    const totalRefunded = INITIAL_PAYMENTS.filter((p) => p.status === 'REFUNDED').reduce(
      (sum, p) => sum + p.amount,
      0
    );

    return {
      totalVolume: totalCaptured + totalEscrow,
      captured: totalCaptured,
      escrow: totalEscrow,
      refunded: totalRefunded,
    };
  }, []);

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
          label="Total Payment Volume"
          value={`₹ ${metrics.totalVolume.toLocaleString('en-IN')}`}
          subtext="Gross payment throughput"
          icon="💳"
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Captured & Settled"
          value={`₹ ${metrics.captured.toLocaleString('en-IN')}`}
          subtext="Available for driver disbursal"
          icon="🟢"
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Escrow Pre-Authorized"
          value={`₹ ${metrics.escrow.toLocaleString('en-IN')}`}
          subtext="Locked pending trip completion"
          icon="🔒"
          accentColor="#8B5CF6"
        />
        <MetricCard
          label="Processed Refunds"
          value={`₹ ${metrics.refunded.toLocaleString('en-IN')}`}
          subtext="Trip cancellations & rollbacks"
          icon="↩️"
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
              ? INITIAL_PAYMENTS.length
              : INITIAL_PAYMENTS.filter((p) => p.status === t.id).length,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by vendor, transaction reference, ID..."
      />

      {/* Payments DataTable */}
      <DataTable<PaymentItem>
        columns={[
          {
            header: 'PAYMENT ID',
            accessor: (p) => (
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.8125rem' }}>
                  #{p.id}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
            ),
          },
          {
            header: 'ENTERPRISE VENDOR',
            accessor: (p) => (
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                {p.vendorName}
              </div>
            ),
          },
          {
            header: 'REQUIREMENT REF',
            accessor: (p) => (
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
                #{p.requirementId}
              </span>
            ),
          },
          {
            header: 'TRANSACTION AMOUNT',
            accessor: (p) => (
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                ₹ {p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            ),
          },
          {
            header: 'METHOD & REFERENCE',
            accessor: (p) => (
              <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  {p.paymentMethod.replace('_', ' ')}
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  {p.transactionRef}
                </div>
              </div>
            ),
          },
          {
            header: 'STATUS',
            accessor: (p) => <StatusBadge status={p.status} />,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            accessor: (p) => (
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
        onRowClick={(p) => setSelectedPayment(p)}
        emptyIcon="💳"
        emptyMessage="No payment transactions found matching your filters"
      />

      {/* Slide-out Payment Dossier Drawer */}
      <Drawer
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title={selectedPayment ? `Payment Dossier #${selectedPayment.id}` : 'Payment Dossier'}
        subtitle={selectedPayment ? `Transaction Ref: ${selectedPayment.transactionRef}` : ''}
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
                  ₹ {selectedPayment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                Gateway Settlement Breakdown
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Enterprise Client:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedPayment.vendorName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Requirement Booking Ref:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--brand-primary)' }}>#{selectedPayment.requirementId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Channel:</span>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedPayment.paymentMethod.replace('_', ' ')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Payment Gateway Fee:</span>
                <span style={{ color: 'var(--color-danger)' }}>- ₹ {selectedPayment.gatewayFee.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Net Disbursable Value:</span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-success)' }}>
                  ₹ {selectedPayment.netSettlement.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
