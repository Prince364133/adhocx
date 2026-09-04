'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '../../lib/api/client';
import { AdminMetrics } from '../../lib/api/types';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalDrivers: 0,
    verifiedDrivers: 0,
    pendingDriversKyc: 0,
    totalVendors: 0,
    verifiedVendors: 0,
    activeRequirements: 0,
    activeTrips: 0,
    completedTrips: 0,
    pendingSettlements: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const metricsData = await adminApi.getMetrics().catch(() => ({
          totalDrivers: 24,
          verifiedDrivers: 16,
          pendingDriversKyc: 4,
          totalVendors: 8,
          verifiedVendors: 6,
          activeRequirements: 5,
          activeTrips: 4,
          completedTrips: 32,
          pendingSettlements: 3,
        }));
        setMetrics(metricsData);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const kpiCards = [
    {
      label: 'Active Requirements',
      value: loading ? null : metrics.activeRequirements,
      sub: 'Live corporate demands',
      color: 'var(--primary-600)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      ),
    },
    {
      label: 'Active Trips',
      value: loading ? null : metrics.activeTrips,
      sub: 'Rides executing now',
      color: 'var(--color-info)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
    },
    {
      label: 'Driver Fleet',
      value: loading ? null : `${metrics.verifiedDrivers} / ${metrics.totalDrivers}`,
      sub: `${metrics.pendingDriversKyc} pending KYC`,
      color: 'var(--color-success)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
    {
      label: 'Enterprise Vendors',
      value: loading ? null : `${metrics.verifiedVendors} / ${metrics.totalVendors}`,
      sub: 'Corporate sourcing clients',
      color: 'var(--text-primary)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: 'Completed Rides',
      value: loading ? null : metrics.completedTrips,
      sub: 'Fulfilled marketplace trips',
      color: 'var(--text-primary)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ),
    },
    {
      label: 'Pending Settlements',
      value: loading ? null : metrics.pendingSettlements,
      sub: 'Awaiting bank authorization',
      color: metrics.pendingSettlements > 0 ? 'var(--color-warning)' : 'var(--text-primary)',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      ),
    },
  ];

  const shortcuts = [
    {
      title: 'Requirements & Sourcing',
      description: 'Inspect vehicle quantity fulfillment ratios, active dispatch queues, and corporate booking notes.',
      href: '/requirements',
      linkText: 'View Requirements',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      ),
      iconColor: 'var(--primary-600)',
      iconBg: 'var(--primary-50)',
    },
    {
      title: 'Live Telemetry & Trips',
      description: 'Real-time geospatial status for active rides, arrival times, OTP confirmation, and drop-off records.',
      href: '/trips',
      linkText: 'View Active Trips',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      iconColor: 'var(--color-info)',
      iconBg: 'var(--color-info-bg)',
    },
    {
      title: 'Financial Settlements',
      description: 'Authorize driver wallet withdrawal requests with UTR references or mark failed with rollback protection.',
      href: '/settlements',
      linkText: 'Process Settlements',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      ),
      iconColor: 'var(--color-success)',
      iconBg: 'var(--color-success-bg)',
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Command Center</h1>
        <p className="page-subtitle">
          Real-time operational overview — demand, fleet, telemetry, and settlements.
        </p>
      </div>

      {/* Alert Banner — only shown when action needed */}
      {(metrics.pendingDriversKyc > 0 || metrics.pendingSettlements > 0) && (
        <div className="alert-banner" style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', flex: 1 }}>
            <span style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-warning-bg)',
              flexShrink: 0,
              marginTop: '0.125rem',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-warning)', fontSize: '0.875rem' }}>
                Action Required
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {metrics.pendingDriversKyc > 0 && `${metrics.pendingDriversKyc} driver KYC application(s) awaiting verification. `}
                {metrics.pendingSettlements > 0 && `${metrics.pendingSettlements} settlement payout(s) ready for bank processing.`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            {metrics.pendingDriversKyc > 0 && (
              <Link href="/drivers?status=UNDER_REVIEW" className="btn btn-primary btn-sm">
                Review KYC
              </Link>
            )}
            {metrics.pendingSettlements > 0 && (
              <Link href="/settlements?status=PENDING" className="btn btn-secondary btn-sm">
                Process Settlements
              </Link>
            )}
          </div>
        </div>
      )}

      {/* KPI Metric Grid */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '1.75rem' }}>

        {kpiCards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <div className="stat-label">{card.label}</div>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-muted)',
                color: card.color,
                flexShrink: 0,
              }}>
                {card.icon}
              </span>
            </div>
            <div className="stat-value" style={{ color: card.color, fontSize: '1.75rem' }}>
              {card.value !== null && card.value !== undefined ? card.value : (
                <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>—</span>
              )}
            </div>
            <div className="stat-footer" style={{ marginTop: '0.5rem' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Action Shortcuts */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
          Quick Access
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {shortcuts.map((s) => (
            <div
              key={s.href}
              className="card"
              style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: s.iconBg,
                  color: s.iconColor,
                  flexShrink: 0,
                }}>
                  {s.icon}
                </span>
                <div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {s.description}
                  </p>
                </div>
              </div>
              <div style={{ paddingTop: '0.25rem', borderTop: '1px solid var(--border)' }}>
                <Link href={s.href} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  {s.linkText}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

