'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Clock, CreditCard, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { SettlementListItem } from '../../lib/api/types';
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
  { id: 'ALL', label: 'All Settlements' },
  { id: 'PENDING', label: 'Pending Payouts' },
  { id: 'SETTLED', label: 'Settled' },
  { id: 'FAILED', label: 'Failed / Refunded' },
];

export default function SettlementsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [settlements, setSettlements] = useState<SettlementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementListItem | null>(null);
  const [actionType, setActionType] = useState<'SETTLED' | 'FAILED' | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadSettlements(activeTab);
  }, [activeTab]);

  async function loadSettlements(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getSettlements(status).catch(() => [] as SettlementListItem[]);
      setSettlements(data);
    } finally {
      setLoading(false);
    }
  }

  // Filter settlements by search query
  const filteredSettlements = useMemo(() => {
    if (!searchQuery.trim()) return settlements;
    const q = searchQuery.toLowerCase();
    return settlements.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.driverName?.toLowerCase().includes(q) ||
        s.bankAccountName?.toLowerCase().includes(q) ||
        s.bankIfsc?.toLowerCase().includes(q) ||
        s.transactionRef?.toLowerCase().includes(q)
    );
  }, [settlements, searchQuery]);

  // Settlement KPI calculations
  const metrics = useMemo(() => {
    const pending = settlements.filter((s) => s.status === 'PENDING');
    const settled = settlements.filter((s) => s.status === 'SETTLED');
    const failed = settlements.filter((s) => s.status === 'FAILED');

    const pendingTotal = pending.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const settledTotal = settled.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    return {
      pendingCount: pending.length,
      pendingTotal,
      settledCount: settled.length,
      settledTotal,
      failedCount: failed.length,
    };
  }, [settlements]);

  async function handleExecuteAction() {
    if (!selectedSettlement || !actionType) return;
    setActionLoading(true);

    try {
      if (actionType === 'SETTLED') {
        if (!transactionRef.trim()) {
          setAlert({ type: 'error', message: 'Bank UTR / Transaction Reference is required to settle.' });
          setActionLoading(false);
          return;
        }
        await adminApi.processSettlement(selectedSettlement.id, {
          status: 'SETTLED',
          transactionRef,
        });
        setAlert({
          type: 'success',
          message: `Payout of ₹${selectedSettlement.amount.toLocaleString('en-IN')} successfully marked SETTLED with UTR: ${transactionRef}`,
        });
      } else if (actionType === 'FAILED') {
        if (!failureReason.trim()) {
          setAlert({ type: 'error', message: 'Failure reason is required.' });
          setActionLoading(false);
          return;
        }
        await adminApi.processSettlement(selectedSettlement.id, {
          status: 'FAILED',
          failureReason,
        });
        setAlert({
          type: 'success',
          message: `Settlement marked FAILED. Funds of ₹${selectedSettlement.amount.toLocaleString('en-IN')} have been automatically refunded back to driver's wallet.`,
        });
      }

      setSelectedSettlement(null);
      setActionType(null);
      loadSettlements(activeTab);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alert Banner */}
      {alert && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${alert.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Driver Settlements & Payouts"
        subtitle="Inspect withdrawal requests, verify bank IFSC details, authorize bank payouts, and audit automated refund rollbacks"
        liveStatus="Bank Gateway Synchronized"
      />

      {/* Settlement Metrics KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <MetricCard
          label="Pending Payouts"
          value={metrics.pendingCount}
          subtext={`₹ ${metrics.pendingTotal.toLocaleString('en-IN')} awaiting authorization`}
          icon={<Clock size={18} color="var(--color-warning)" />}
          accentColor="var(--color-warning)"
        />
        <MetricCard
          label="Settled Disbursals"
          value={metrics.settledCount}
          subtext={`₹ ${metrics.settledTotal.toLocaleString('en-IN')} successfully wired`}
          icon={<CreditCard size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Failed / Rollbacks"
          value={metrics.failedCount}
          subtext="Refunded to driver wallets"
          icon={<RotateCcw size={18} color="var(--color-danger)" />}
          accentColor="var(--color-danger)"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        tabs={STATUS_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          count:
            t.id === 'ALL'
              ? settlements.length
              : settlements.filter((s) => s.status === t.id).length,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by ID, driver name, IFSC, or UTR..."
      />

      {/* Settlements DataTable */}
      <DataTable
        columns={[
          {
            header: 'SETTLEMENT ID',
            accessor: (s) => (
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.8125rem' }}>
                  #{s.id.slice(0, 10)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Requested {new Date(s.createdAt).toLocaleDateString()}
                </div>
              </div>
            ),
          },
          {
            header: 'DRIVER INFO',
            accessor: (s) => (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {s.driverName || 'Driver'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.125rem' }}>
                  ID: {s.driverId?.slice(0, 12)}
                </div>
              </div>
            ),
          },
          {
            header: 'PAYOUT AMOUNT',
            accessor: (s) => (
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-success)' }}>
                ₹ {Number(s.amount).toLocaleString('en-IN')}
              </div>
            ),
          },
          {
            header: 'BANK ACCOUNT & IFSC',
            accessor: (s) => (
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                  {s.bankAccountName || 'Account Holder'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.125rem' }}>
                  {s.bankAccountNumber} • <span style={{ color: 'var(--text-secondary)' }}>{s.bankIfsc}</span>
                </div>
              </div>
            ),
          },
          {
            header: 'STATUS',
            accessor: (s) => <StatusBadge status={s.status} />,
          },
          {
            header: 'UTR / REFERENCE',
            accessor: (s) => (
              <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: s.transactionRef ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {s.transactionRef || '—'}
              </span>
            ),
          },
          {
            header: 'ACTIONS',
            align: 'right',
            accessor: (s) => (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                {s.status === 'PENDING' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSettlement(s);
                      setActionType(null);
                      setTransactionRef('');
                      setFailureReason('');
                    }}
                  >
                    Process Payout →
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSettlement(s);
                      setActionType(null);
                    }}
                  >
                    Inspect Dossier
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        data={filteredSettlements}
        keyExtractor={(s) => s.id}
        loading={loading}
        onRowClick={(s) => {
          setSelectedSettlement(s);
          setActionType(null);
          setTransactionRef('');
          setFailureReason('');
        }}
        emptyTitle="No settlements found"
        emptySubtitle={`No withdrawal settlements matching filter "${activeTab}".`}
      />

      {/* Slide-out Settlement Drawer */}
      <Drawer
        isOpen={!!selectedSettlement}
        onClose={() => {
          setSelectedSettlement(null);
          setActionType(null);
        }}
        title={
          selectedSettlement
            ? `Payout Dossier: ₹${Number(selectedSettlement.amount).toLocaleString('en-IN')}`
            : 'Payout Dossier'
        }
        subtitle={selectedSettlement ? `Settlement ID #${selectedSettlement.id}` : ''}
        footer={
          selectedSettlement && selectedSettlement.status === 'PENDING' ? (
            actionType ? (
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType(null)}
                  disabled={actionLoading}
                >
                  Back
                </Button>
                <Button
                  variant={actionType === 'SETTLED' ? 'success' : 'danger'}
                  size="sm"
                  onClick={handleExecuteAction}
                  loading={actionLoading}
                >
                  Confirm {actionType === 'SETTLED' ? 'Settlement' : 'Rollback'}
                </Button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setActionType('FAILED')}
                >
                  Mark as Failed (Refund)
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setActionType('SETTLED')}
                >
                  Mark as Settled
                </Button>
              </div>
            )
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedSettlement(null)}
            >
              Close Dossier
            </Button>
          )
        }
      >
        {selectedSettlement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Status Summary Banner */}
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ marginTop: '0.25rem' }}>
                  <StatusBadge status={selectedSettlement.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount Payable</div>
                <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-success)', marginTop: '0.125rem' }}>
                  ₹ {Number(selectedSettlement.amount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Bank Details Card */}
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
                Beneficiary Banking Profile
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Holder:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedSettlement.bankAccountName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Number:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>{selectedSettlement.bankAccountNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bank IFSC Code:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-primary)' }}>{selectedSettlement.bankIfsc}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Driver ID:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{selectedSettlement.driverId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Requested On:</span>
                <span style={{ color: 'var(--text-primary)' }}>{new Date(selectedSettlement.createdAt).toLocaleString()}</span>
              </div>
              {selectedSettlement.transactionRef && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bank UTR / Ref:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-success)' }}>
                    {selectedSettlement.transactionRef}
                  </span>
                </div>
              )}
            </div>

            {/* Action forms for PENDING settlements */}
            {selectedSettlement.status === 'PENDING' && actionType === 'SETTLED' && (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.06)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-success)' }}>
                  Authorize Bank Disbursal
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                    Bank UTR / Transaction Reference *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR1234567890 or NEFT-REF-889"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      fontFamily: 'monospace',
                    }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                    Entering the bank UTR reference marks this payout as settled and triggers a push confirmation to the driver app.
                  </p>
                </div>
              </div>
            )}

            {selectedSettlement.status === 'PENDING' && actionType === 'FAILED' && (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                  Fail & Rollback Settlement
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                    Rejection / Failure Reason *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Beneficiary account closed or invalid IFSC code"
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.875rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      resize: 'vertical',
                    }}
                  />
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '0.75rem',
                      color: 'var(--color-warning)',
                      lineHeight: 1.4,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                    }}
                  >
                    <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Automated Ledger Safeguard:</strong> Marking this payout as FAILED will automatically credit ₹
                      {selectedSettlement.amount.toLocaleString('en-IN')} back into the driver's wallet with an audited <code>WITHDRAWAL_REFUND</code> ledger transaction.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
