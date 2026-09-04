'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '../../lib/api/client';
import { SettlementListItem } from '../../lib/api/types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { EmptyState } from '../../components/EmptyState';
import { TableLoadingSkeleton } from '../../components/LoadingSkeleton';

const STATUS_TABS = [
  { key: 'ALL', label: 'All Payouts' },
  { key: 'PENDING', label: 'Pending Processing' },
  { key: 'SETTLED', label: 'Settled & Paid' },
  { key: 'FAILED', label: 'Failed' },
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
      const data = await adminApi.getSettlements(status).catch(() => [
        {
          id: 'set-501',
          driverId: 'drv-101',
          driverName: 'Rajesh Kumar',
          amount: 2500,
          status: 'PENDING',
          bankAccountName: 'Rajesh Kumar',
          bankAccountNumber: '••••4321',
          bankIfsc: 'HDFC0001234',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
        {
          id: 'set-502',
          driverId: 'drv-102',
          driverName: 'Amit Singh',
          amount: 4000,
          status: 'SETTLED',
          bankAccountName: 'Amit Singh',
          bankAccountNumber: '••••9876',
          bankIfsc: 'SBIN0005678',
          transactionRef: 'UTR9876543210',
          processedAt: new Date(Date.now() - 86400000).toISOString(),
          createdAt: new Date(Date.now() - 90000000).toISOString(),
        },
        {
          id: 'set-503',
          driverId: 'drv-104',
          driverName: 'Vikram Patel',
          amount: 6200,
          status: 'PENDING',
          bankAccountName: 'Vikram Patel',
          bankAccountNumber: '••••1122',
          bankIfsc: 'ICIC0000999',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
      ] as SettlementListItem[]);
      setSettlements(data);
    } finally {
      setLoading(false);
    }
  }

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
          message: `Payout of ₹${selectedSettlement.amount} successfully settled with UTR: ${transactionRef}`,
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
          message: `Settlement marked FAILED. Funds of ₹${selectedSettlement.amount} rolled back to driver wallet.`,
        });
      }

      setSelectedSettlement(null);
      setActionType(null);
      setTransactionRef('');
      setFailureReason('');
      loadSettlements(activeTab);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Operation failed' });
    } finally {
      setActionLoading(false);
    }
  }

  const filteredSettlements = useMemo(() => {
    let result = settlements;
    if (activeTab !== 'ALL') {
      result = result.filter((s) => s.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          (s.driverName && s.driverName.toLowerCase().includes(q)) ||
          (s.bankAccountName && s.bankAccountName.toLowerCase().includes(q)) ||
          (s.transactionRef && s.transactionRef.toLowerCase().includes(q))
      );
    }
    return result;
  }, [settlements, activeTab, searchQuery]);

  return (
    <div>
      {/* Header Context (05_UI_UX_GUIDELINES.md § 14) */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Financial Settlements & Driver Payouts</h1>
        <p className="page-subtitle">
          Authorize driver wallet withdrawal requests with bank UTR references or mark failed with rollback protection.
        </p>
      </div>

      {alert && (
        <div className={`alert-banner ${alert.type === 'success' ? 'success' : 'danger'}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>{alert.type === 'success' ? '✓' : '⚠️'}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{alert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="tabs">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search payouts by driver name, account, UTR, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredSettlements.length}</strong> settlement records
        </div>
      </div>

      {/* Settlement Table (06_SCREEN_SPECIFICATIONS.md § 60) */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Settlement ID</th>
              <th>Driver & Account</th>
              <th>Bank IFSC</th>
              <th>Payout Amount</th>
              <th>Transaction UTR</th>
              <th>Requested At</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableLoadingSkeleton rows={4} columns={8} />
            ) : filteredSettlements.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon="💰"
                    title="No settlements found"
                    description={
                      searchQuery
                        ? 'No settlement records match your search criteria.'
                        : 'No settlements in this status.'
                    }
                    action={
                      searchQuery
                        ? { label: 'Clear Search', onClick: () => setSearchQuery('') }
                        : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              filteredSettlements.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-600)' }}>
                      #{item.id.slice(0, 8)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.driverName || 'Driver'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {item.bankAccountName} ({item.bankAccountNumber})
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{item.bankIfsc || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      ₹{Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                    {item.transactionRef ? (
                      <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{item.transactionRef}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Pending Transfer</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </td>
                  <td>
                    <Badge status={item.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.status === 'PENDING' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSettlement(item);
                          setActionType('SETTLED');
                          setTransactionRef('');
                          setFailureReason('');
                        }}
                        className="btn btn-primary btn-sm"
                      >
                        Process Payout →
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Settled</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payout Processing Modal */}
      {selectedSettlement && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSettlement(null)}
          title={`Process Driver Payout — #${selectedSettlement.id.slice(0, 8)}`}
          maxWidth="580px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedSettlement(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              {actionType === 'SETTLED' ? (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={handleExecuteAction}
                  disabled={actionLoading || !transactionRef.trim()}
                >
                  {actionLoading ? 'Recording...' : 'Confirm Bank Transfer'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={handleExecuteAction}
                  disabled={actionLoading || !failureReason.trim()}
                >
                  {actionLoading ? 'Processing...' : 'Mark Failed & Refund Wallet'}
                </button>
              )}
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                padding: '1rem',
                background: 'var(--bg-surface-muted)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recipient Driver</div>
                <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedSettlement.driverName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  A/C: {selectedSettlement.bankAccountNumber} ({selectedSettlement.bankIfsc})
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payout Amount</div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary-600)', marginTop: '0.2rem' }}>
                  ₹{Number(selectedSettlement.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Mode selection tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${actionType === 'SETTLED' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActionType('SETTLED')}
              >
                Mark Paid / Settled
              </button>
              <button
                type="button"
                className={`btn btn-sm ${actionType === 'FAILED' ? 'btn-danger' : 'btn-secondary'}`}
                onClick={() => setActionType('FAILED')}
              >
                Mark Transfer Failed
              </button>
            </div>

            {actionType === 'SETTLED' ? (
              <div className="form-group">
                <label className="form-label">Bank UTR / Transaction Reference Number:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. UTR20260903123456"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Enter the banking confirmation reference after initiating IMPS/NEFT transfer.
                </span>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--color-error)' }}>
                  Bank Failure Reason:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Invalid IFSC code, account closed..."
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>
                  Funds will be automatically returned to the driver's platform wallet balance.
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
