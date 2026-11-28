'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { FleetDashboardResponseDto } from '@adhocx/contracts';
import { Check, Copy, RefreshCw, ShieldAlert, Users, Activity, Wallet, LifeBuoy } from 'lucide-react';
import { fleetApi } from '../../lib/api/client';
import { getStoredFleetUser } from '../../lib/auth/session';
import { DashboardSkeleton } from '../../components/common/Skeletons';
import { ConfirmDialog, ErrorState, StatusBadge } from '../../components/common/StatePrimitives';

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function FleetDashboardPage() {
  const storedUser = getStoredFleetUser();
  const isOwner = storedUser?.role === 'FLEET_OWNER';

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [data, setData] = useState<FleetDashboardResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [confirmToggleStatus, setConfirmToggleStatus] = useState(false);
  const [mutatingCode, setMutatingCode] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fleetApi.getDashboard({
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load fleet dashboard.');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleCopyCode = async () => {
    if (!data?.fleetCode) return;
    try {
      await navigator.clipboard.writeText(data.fleetCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleRegenerateCode = async () => {
    setMutatingCode(true);
    try {
      const updated = await fleetApi.regenerateFleetCode();
      setData((prev) => (prev ? { ...prev, fleetCode: updated.code, codeStatus: updated.codeStatus } : prev));
      setConfirmRegen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to regenerate Fleet Code.');
    } finally {
      setMutatingCode(false);
    }
  };

  const handleToggleCodeStatus = async () => {
    if (!data) return;
    const nextStatus = data.codeStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setMutatingCode(true);
    try {
      const updated = await fleetApi.updateFleetCodeStatus({ status: nextStatus });
      setData((prev) => (prev ? { ...prev, codeStatus: updated.codeStatus } : prev));
      setConfirmToggleStatus(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update Fleet Code status.');
    } finally {
      setMutatingCode(false);
    }
  };

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={loadDashboard} />;
  }

  const series = data?.activitySeries || [];
  const maxTrips = Math.max(1, ...series.map((p) => p.trips));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {error && <ErrorState message={error} onRetry={loadDashboard} />}

      {/* Top Section: Fleet Name, Prominent Fleet Code & Period Selector */}
      <section
        className="fleet-card"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Fleet Account
          </div>
          <h2 style={{ margin: '0.15rem 0 0.5rem', fontSize: '1.25rem', fontWeight: 800 }}>
            {data?.fleetName || 'Your Fleet'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '1rem',
                fontWeight: 700,
                padding: '0.3rem 0.65rem',
                borderRadius: '8px',
                background: 'var(--brand-primary-subtle)',
                color: 'var(--brand-primary)',
                border: '1px solid var(--brand-primary)',
              }}
            >
              {data?.fleetCode || '—'}
            </span>
            <StatusBadge status={data?.codeStatus || 'ACTIVE'} />
            <button
              type="button"
              onClick={handleCopyCode}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.7rem',
                borderRadius: '8px',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-surface)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmRegen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.7rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={13} />
                  <span>Regenerate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmToggleStatus(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.7rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong)',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <ShieldAlert size={13} />
                  <span>{data?.codeStatus === 'ACTIVE' ? 'Disable Code' : 'Enable Code'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="date"
            aria-label="From date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.825rem' }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
          <input
            type="date"
            aria-label="To date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.825rem' }}
          />
        </div>
      </section>

      {/* Small KPI Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
        {[
          { label: 'Total Drivers', value: data?.kpis.totalDrivers ?? 0 },
          { label: 'Active Drivers', value: data?.kpis.activeDrivers ?? 0 },
          { label: 'Drivers on Trip', value: data?.kpis.driversOnTrip ?? 0 },
          { label: 'Trips Today', value: data?.kpis.tripsToday ?? 0 },
          { label: 'Completed / Cancelled', value: `${data?.kpis.completedTrips ?? 0} / ${data?.kpis.cancelledTrips ?? 0}` },
          { label: 'Period Earnings', value: formatINR(data?.kpis.periodEarnings ?? 0) },
        ].map((kpi) => (
          <div key={kpi.label} className="fleet-card">
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{kpi.label}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.3rem', color: 'var(--text-primary)' }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </section>

      {/* 1 Clear Activity Chart + Driver Status Breakdown */}
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: '1rem' }}>
        <div className="fleet-card">
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>
            Trip Activity (Selected Period)
          </h3>
          {series.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No trip volume recorded in this date range.
            </div>
          ) : (
            <svg viewBox="0 0 600 180" style={{ width: '100%', height: '180px' }} role="img" aria-label="Trip volume chart">
              {series.map((pt, idx) => {
                const barWidth = Math.max(12, Math.floor(540 / Math.max(1, series.length)) - 6);
                const x = 30 + idx * (540 / Math.max(1, series.length));
                const barH = Math.round((pt.trips / maxTrips) * 130);
                const y = 150 - barH;
                return (
                  <g key={pt.date}>
                    <rect x={x} y={y} width={barWidth} height={barH} rx="4" fill="var(--brand-primary)" />
                    <text x={x + barWidth / 2} y={168} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
                      {pt.date.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div className="fleet-card">
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>
            Driver Status Breakdown
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(data?.statusBreakdown || []).length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No drivers associated yet.</div>
            ) : (
              data?.statusBreakdown.map((item) => (
                <div key={item.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusBadge status={item.status} />
                  <strong style={{ fontSize: '0.95rem' }}>{item.count}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions + Recent Activity */}
      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: '1rem' }}>
        <div className="fleet-card">
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700 }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
            {[
              { href: '/drivers', label: 'View Drivers', Icon: Users },
              { href: '/live-operations', label: 'Live Operations', Icon: Activity },
              { href: '/earnings', label: 'Earnings & Payouts', Icon: Wallet },
              { href: '/support', label: 'Support Center', Icon: LifeBuoy },
            ].map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="fleet-nav-link" style={{ border: '1px solid var(--border-subtle)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon size={16} />
                  <span>{label}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="fleet-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Recent Activity</h3>
            <Link href="/notifications" style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
              View more
            </Link>
          </div>
          {(data?.recentActivity || []).length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent fleet activity events.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {data?.recentActivity.slice(0, 5).map((ev) => (
                <div key={ev.id} style={{ fontSize: '0.85rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.45rem' }}>
                  <div style={{ color: 'var(--text-primary)' }}>{ev.message}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(ev.occurredAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={confirmRegen}
        title="Regenerate Fleet Code?"
        description="A new Fleet Code will be issued immediately for new driver associations. Existing drivers already linked to your fleet will NOT be disconnected."
        confirmLabel="Regenerate Code"
        isLoading={mutatingCode}
        onConfirm={handleRegenerateCode}
        onClose={() => setConfirmRegen(false)}
      />

      <ConfirmDialog
        isOpen={confirmToggleStatus}
        title={data?.codeStatus === 'ACTIVE' ? 'Disable Fleet Code?' : 'Enable Fleet Code?'}
        description={
          data?.codeStatus === 'ACTIVE'
            ? 'New drivers will not be able to join using this Fleet Code until re-enabled. Existing linked drivers remain unaffected.'
            : 'Drivers will be able to use this Fleet Code again during registration or fleet association.'
        }
        confirmLabel={data?.codeStatus === 'ACTIVE' ? 'Disable Code' : 'Enable Code'}
        isLoading={mutatingCode}
        onConfirm={handleToggleCodeStatus}
        onClose={() => setConfirmToggleStatus(false)}
      />
    </div>
  );
}
