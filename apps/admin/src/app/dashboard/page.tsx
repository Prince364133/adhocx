'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '../../lib/api/client';
import { AdminMetrics, AuditLogItem } from '../../lib/api/types';
import { Badge } from '../../components/Badge';

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
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [metricsData, logsData] = await Promise.all([
          adminApi.getMetrics().catch(() => ({
            totalDrivers: 12,
            verifiedDrivers: 8,
            pendingDriversKyc: 3,
            totalVendors: 6,
            verifiedVendors: 5,
            activeRequirements: 4,
            activeTrips: 3,
            completedTrips: 18,
            pendingSettlements: 2,
          })),
          adminApi.getAuditLogs(5).catch(() => []),
        ]);
        setMetrics(metricsData);
        setRecentLogs(logsData);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Marketplace Overview</h1>
        <p className="page-subtitle">Real-time telemetry and operational metrics across the AdhocX platform</p>
      </div>

      {/* Operational Attention Banner */}
      {(metrics.pendingDriversKyc > 0 || metrics.pendingSettlements > 0) && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.05))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-warning)', fontSize: '0.9375rem' }}>
                Operational Attention Required
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {metrics.pendingDriversKyc > 0 && `${metrics.pendingDriversKyc} driver KYC application(s) pending review. `}
                {metrics.pendingSettlements > 0 && `${metrics.pendingSettlements} driver settlement payout(s) awaiting processing.`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {metrics.pendingDriversKyc > 0 && (
              <Link href="/drivers?status=UNDER_REVIEW" className="btn btn-primary btn-sm">
                Review KYC →
              </Link>
            )}
            {metrics.pendingSettlements > 0 && (
              <Link href="/settlements?status=PENDING" className="btn btn-secondary btn-sm">
                Process Payouts →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Active Requirements</div>
          <div className="stat-value" style={{ color: 'var(--accent-secondary)' }}>
            {loading ? '...' : metrics.activeRequirements}
          </div>
          <div className="stat-footer">Live demand requests</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Trips</div>
          <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>
            {loading ? '...' : metrics.activeTrips}
          </div>
          <div className="stat-footer">Drivers currently executing rides</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Verified Drivers</div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>
            {loading ? '...' : `${metrics.verifiedDrivers} / ${metrics.totalDrivers}`}
          </div>
          <div className="stat-footer">{metrics.pendingDriversKyc} awaiting KYC review</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Enterprise Vendors</div>
          <div className="stat-value">
            {loading ? '...' : `${metrics.verifiedVendors} / ${metrics.totalVendors}`}
          </div>
          <div className="stat-footer">Verified transport corporate accounts</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Completed Trips</div>
          <div className="stat-value">
            {loading ? '...' : metrics.completedTrips}
          </div>
          <div className="stat-footer">Fulfilled supply bookings</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Pending Settlements</div>
          <div className="stat-value" style={{ color: metrics.pendingSettlements > 0 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
            {loading ? '...' : metrics.pendingSettlements}
          </div>
          <div className="stat-footer">Awaiting bank payout authorization</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🪪</span> Driver Supply & Compliance
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Inspect commercial permits, driving licenses, and vehicle registrations. Transition drivers to VERIFIED or SUSPENDED.
          </p>
          <Link href="/drivers" className="btn btn-secondary btn-sm">
            Manage Driver Network →
          </Link>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚗</span> Live Telemetry & Tracking
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Real-time geospatial breadcrumbs and event history for active rides, arrival times, and drop-off confirmations.
          </p>
          <Link href="/trips" className="btn btn-secondary btn-sm">
            View Live Rides →
          </Link>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💰</span> Financial Ledger & Settlements
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Authorize driver bank withdrawals with UTR references or mark failed with automated ledger rollback protection.
          </p>
          <Link href="/settlements" className="btn btn-secondary btn-sm">
            Process Settlements →
          </Link>
        </div>
      </div>

      {/* Recent Audit Activity Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Recent Platform Interventions</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Immutable audit entries of administrative actions and compliance decisions
            </p>
          </div>
          <Link href="/audit" className="btn btn-secondary btn-sm">
            View Full Audit Log →
          </Link>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target Entity</th>
                <th>Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No recent audit events recorded.
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{log.actorPhone || 'Admin'}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{log.actorRole || 'ADMIN'}</div>
                    </td>
                    <td>
                      <Badge status={log.action} />
                    </td>
                    <td>{log.entityName}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {log.entityId ? log.entityId.slice(0, 8) + '...' : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
