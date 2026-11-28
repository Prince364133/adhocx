'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type {
  FleetEarningsResponseDto,
  FleetPayoutRecordDto,
  FleetShortfallRecordDto,
} from '@adhocx/contracts';
import { Download, X } from 'lucide-react';
import { fleetApi } from '../../lib/api/client';
import { getFleetToken, getStoredFleetUser } from '../../lib/auth/session';
import { CardsGridSkeleton, TablePageSkeleton } from '../../components/common/Skeletons';
import { ConfirmDialog, EmptyState, ErrorState, StatusBadge } from '../../components/common/StatePrimitives';

function getMonthRange(offsetMonths: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offsetMonths + 1, 0));
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export default function FleetEarningsPage() {
  const user = getStoredFleetUser();
  const isOwner = user?.role === 'FLEET_OWNER';

  const [periodMode, setPeriodMode] = useState<'THIS_MONTH' | 'PREV_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [from, setFrom] = useState(() => getMonthRange(0).from);
  const [to, setTo] = useState(() => getMonthRange(0).to);
  const [activeTab, setActiveTab] = useState<'payouts' | 'drivers' | 'shortfall'>('payouts');

  const [earnings, setEarnings] = useState<FleetEarningsResponseDto | null>(null);
  const [payouts, setPayouts] = useState<FleetPayoutRecordDto[]>([]);
  const [shortfalls, setShortfalls] = useState<FleetShortfallRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [confirmPayout, setConfirmPayout] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<FleetPayoutRecordDto | null>(null);

  const selectPeriod = (mode: 'THIS_MONTH' | 'PREV_MONTH' | 'CUSTOM') => {
    setPeriodMode(mode);
    if (mode === 'THIS_MONTH') {
      const r = getMonthRange(0);
      setFrom(r.from);
      setTo(r.to);
    } else if (mode === 'PREV_MONTH') {
      const r = getMonthRange(-1);
      setFrom(r.from);
      setTo(r.to);
    }
  };

  const loadFinance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [earnRes, payoutRes, shortfallRes] = await Promise.all([
        fleetApi.getEarnings({ from: from || undefined, to: to || undefined }),
        isOwner ? fleetApi.listPayouts({ limit: 30 }) : Promise.resolve({ items: [], total: 0, page: 1, limit: 30 }),
        isOwner ? fleetApi.getShortfallClaims() : Promise.resolve([]),
      ]);
      setEarnings(earnRes);
      setPayouts(payoutRes.items || []);
      setShortfalls(shortfallRes || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load fleet earnings and payouts.');
    } finally {
      setLoading(false);
    }
  }, [from, to, isOwner]);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  const handleDownloadCsv = async () => {
    const url = fleetApi.getEarningsExportUrl({ from: from || undefined, to: to || undefined });
    const token = getFleetToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return;
    const csv = await res.text();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fleet-earnings-${from}-to-${to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleRequestPayout = async () => {
    const num = Number(payoutAmount);
    if (!Number.isFinite(num) || num <= 0) return;
    setRequestingPayout(true);
    setError(null);
    try {
      await fleetApi.requestPayout({
        amount: num,
        periodStart: from || undefined,
        periodEnd: to || undefined,
        notes: payoutNotes.trim() || undefined,
      });
      setConfirmPayout(false);
      setPayoutAmount('');
      setPayoutNotes('');
      await loadFinance();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payout request failed.');
      setConfirmPayout(false);
    } finally {
      setRequestingPayout(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Period Controls */}
      <div className="fleet-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['THIS_MONTH', 'PREV_MONTH', 'CUSTOM'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => selectPeriod(m)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-strong)',
                background: periodMode === m ? 'var(--brand-primary)' : 'var(--bg-surface)',
                color: periodMode === m ? '#fff' : 'var(--text-primary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {m === 'THIS_MONTH' ? 'This Month' : m === 'PREV_MONTH' ? 'Previous Month' : 'Custom Range'}
            </button>
          ))}
          {periodMode === 'CUSTOM' && (
            <>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <span>to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={() => void handleDownloadCsv()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', cursor: 'pointer', fontWeight: 600 }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={loadFinance} />}

      {loading ? (
        <CardsGridSkeleton />
      ) : (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
          <div className="fleet-card">
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Earnings</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>
              ₹{Math.round(earnings?.totalEarnings ?? 0).toLocaleString('en-IN')}
            </div>
          </div>
          {earnings?.deductions !== undefined && (
            <div className="fleet-card">
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Deductions</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                ₹{Math.round(earnings.deductions).toLocaleString('en-IN')}
              </div>
            </div>
          )}
          <div className="fleet-card">
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Net Amount</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>
              ₹{Math.round(earnings?.netAmount ?? 0).toLocaleString('en-IN')}
            </div>
          </div>
          {earnings?.pendingAmount !== undefined && (
            <div className="fleet-card">
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Payouts</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                ₹{Math.round(earnings.pendingAmount).toLocaleString('en-IN')}
              </div>
            </div>
          )}
        </section>
      )}

      {isOwner && (
        <div className="fleet-card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label htmlFor="payout-amt" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Request Payout Amount (INR)
            </label>
            <input
              id="payout-amt"
              type="number"
              min={1}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              placeholder="e.g. 5000"
              style={{ padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label htmlFor="payout-notes" style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Notes (Optional)
            </label>
            <input
              id="payout-notes"
              type="text"
              value={payoutNotes}
              onChange={(e) => setPayoutNotes(e.target.value)}
              placeholder="Settlement period note"
              style={{ width: '100%', padding: '0.45rem 0.7rem', borderRadius: '8px', border: '1px solid var(--border-strong)' }}
            />
          </div>
          <button
            type="button"
            disabled={!payoutAmount || Number(payoutAmount) <= 0}
            onClick={() => setConfirmPayout(true)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: 'var(--brand-primary)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Request Payout
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {(['payouts', 'drivers', 'shortfall'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === t ? 'var(--brand-primary)' : 'var(--bg-surface-muted)',
              color: activeTab === t ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t === 'payouts' ? 'Payout History' : t === 'drivers' ? 'Driver-Wise Earnings' : 'Shortfall Compensation'}
          </button>
        ))}
      </div>

      {loading ? (
        <TablePageSkeleton />
      ) : activeTab === 'payouts' ? (
        payouts.length === 0 ? (
          <EmptyState title="No Payout Requests" description="Payout requests submitted for your fleet will appear here with reference codes and status." />
        ) : (
          <div className="fleet-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Reference</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPayout(p)}
                    title="Click to inspect payout details"
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      {p.referenceCode}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>₹{p.amount.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <StatusBadge status={p.status} />
                      {p.rejectionReason && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', marginTop: '0.2rem' }}>{p.rejectionReason}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : activeTab === 'drivers' ? (
        (earnings?.driverBreakdown || []).length === 0 ? (
          <EmptyState title="No Completed Driver Earnings" description="Driver-wise earnings for the selected period will appear once trips are completed." />
        ) : (
          <div className="fleet-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Driver</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Completed Trips</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Earnings</th>
                </tr>
              </thead>
              <tbody>
                {earnings?.driverBreakdown.map((d) => (
                  <tr key={d.driverId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{d.driverName}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{d.trips}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>₹{Math.round(d.earnings).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : shortfalls.length === 0 ? (
        <EmptyState title="No Shortfall Compensation Records" description="Minimum-trip shortfall records issued by AdhocX will appear here." />
      ) : (
        <div className="fleet-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Period</th>
                <th style={{ padding: '0.75rem 1rem' }}>Min Trips</th>
                <th style={{ padding: '0.75rem 1rem' }}>Offered</th>
                <th style={{ padding: '0.75rem 1rem' }}>Shortfall</th>
                <th style={{ padding: '0.75rem 1rem' }}>Compensation</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {shortfalls.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {new Date(s.periodStart).toLocaleDateString()} – {new Date(s.periodEnd).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.minimumTripsRequired}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{s.actualTripsOffered}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{s.shortfallTrips}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                    {s.compensationAmount != null ? `₹${s.compensationAmount.toLocaleString('en-IN')}` : 'Pending calculation'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmPayout}
        title="Submit Fleet Payout Request?"
        description={`Confirm submitting a payout request for ₹${Number(payoutAmount || 0).toLocaleString('en-IN')}.`}
        confirmLabel="Submit Payout"
        isLoading={requestingPayout}
        onConfirm={handleRequestPayout}
        onClose={() => setConfirmPayout(false)}
      />

      {selectedPayout && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Payout Detail Drawer"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 90,
          }}
        >
          <div
            style={{
              width: 'min(440px, 100%)',
              background: 'var(--bg-surface)',
              height: '100%',
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>Payout Request Details</h3>
                <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {selectedPayout.referenceCode}
                </div>
              </div>
              <button
                type="button"
                aria-label="Close payout details"
                onClick={() => setSelectedPayout(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="fleet-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status</div>
                <div style={{ marginTop: '0.25rem' }}>
                  <StatusBadge status={selectedPayout.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Amount</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  ₹{selectedPayout.amount.toLocaleString('en-IN')} ({selectedPayout.currency})
                </div>
              </div>
            </div>

            <div className="fleet-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Requested At</span>
                <strong>{new Date(selectedPayout.createdAt).toLocaleString()}</strong>
              </div>
              {(selectedPayout.periodStart || selectedPayout.periodEnd) && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Period Covered</span>
                  <span>
                    {selectedPayout.periodStart ? new Date(selectedPayout.periodStart).toLocaleDateString() : '—'} –{' '}
                    {selectedPayout.periodEnd ? new Date(selectedPayout.periodEnd).toLocaleDateString() : '—'}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Settled At</span>
                <span>
                  {selectedPayout.settledAt
                    ? new Date(selectedPayout.settledAt).toLocaleString()
                    : 'Pending Settlement'}
                </span>
              </div>
              {selectedPayout.rejectionReason && (
                <div
                  style={{
                    marginTop: '0.4rem',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    color: 'var(--color-danger)',
                  }}
                >
                  <strong>Rejection Reason:</strong> {selectedPayout.rejectionReason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
