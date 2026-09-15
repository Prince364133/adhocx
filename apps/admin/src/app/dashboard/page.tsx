'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '../../lib/api/client';
import { AdminMetrics, AuditLogItem } from '../../lib/api/types';
import {
  PageHeader,
  MetricCard,
  Card,
  StatusBadge,
  Button,
  DataTable,
  Column,
} from '../../components/common';

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

  const auditColumns: Column<AuditLogItem>[] = [
    {
      key: 'createdAt',
      label: 'Timestamp',
      render: (log) => (
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          {new Date(log.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actor',
      label: 'Actor',
      render: (log) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.actorPhone || 'System Administrator'}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{log.actorRole || 'SUPER_ADMIN'}</div>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (log) => <StatusBadge status={log.action} size="sm" />,
    },
    {
      key: 'entityName',
      label: 'Target Entity',
      render: (log) => (
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{log.entityName}</span>
      ),
    },
    {
      key: 'entityId',
      label: 'Entity ID',
      render: (log) => (
        <span className="code-tag">
          {log.entityId ? log.entityId.slice(0, 8) + '...' : '—'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Marketplace Overview"
        subtitle="Real-time telemetry and operational metrics across the AdhocX platform"
        liveStatus="Live Telemetry"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/verifications" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">
                🛡️ Verification Center
              </Button>
            </Link>
            <Link href="/requirements" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm">
                📋 Live Requirements
              </Button>
            </Link>
          </div>
        }
      />

      {/* Operational Attention Banner */}
      {(metrics.pendingDriversKyc > 0 || metrics.pendingSettlements > 0) && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(217, 119, 6, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)',
            border: '1px solid var(--color-warning-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
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
              <Link href="/verifications" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">
                  Review KYC →
                </Button>
              </Link>
            )}
            {metrics.pendingSettlements > 0 && (
              <Link href="/settlements" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="sm">
                  Process Payouts →
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <MetricCard
          label="Active Requirements"
          value={loading ? '...' : metrics.activeRequirements}
          subtext="Live demand requests"
          icon="📋"
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Active Trips"
          value={loading ? '...' : metrics.activeTrips}
          subtext="Executing rides now"
          icon="🚗"
          accentColor="#2563EB"
        />
        <MetricCard
          label="Verified Drivers"
          value={loading ? '...' : `${metrics.verifiedDrivers} / ${metrics.totalDrivers}`}
          subtext={`${metrics.pendingDriversKyc} awaiting review`}
          icon="🪪"
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Enterprise Vendors"
          value={loading ? '...' : `${metrics.verifiedVendors} / ${metrics.totalVendors}`}
          subtext="Corporate client accounts"
          icon="🏢"
          accentColor="#8B5CF6"
        />
        <MetricCard
          label="Completed Trips"
          value={loading ? '...' : metrics.completedTrips}
          subtext="Fulfilled bookings"
          icon="✅"
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Pending Settlements"
          value={loading ? '...' : metrics.pendingSettlements}
          subtext="Awaiting payout auth"
          icon="💰"
          accentColor="var(--color-warning)"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🪪</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Driver Supply & Compliance
            </h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Inspect commercial permits, driving licenses, and vehicle registrations. Transition drivers to VERIFIED or SUSPENDED.
          </p>
          <Link href="/drivers" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm">
              Manage Driver Network →
            </Button>
          </Link>
        </Card>

        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🚗</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Live Telemetry & Tracking
            </h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Real-time geospatial breadcrumbs and event history for active rides, arrival times, and drop-off confirmations.
          </p>
          <Link href="/trips" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm">
              View Live Rides →
            </Button>
          </Link>
        </Card>

        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💰</span>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Financial Ledger & Settlements
            </h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Authorize driver bank withdrawals with UTR references or mark failed with automated ledger rollback protection.
          </p>
          <Link href="/settlements" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm">
              Process Settlements →
            </Button>
          </Link>
        </Card>
      </div>

      {/* Recent Platform Interventions */}
      <Card variant="default">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Recent Platform Interventions
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
              Immutable audit entries of administrative actions and compliance decisions
            </p>
          </div>
          <Link href="/audit" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">
              View Full Audit Log →
            </Button>
          </Link>
        </div>

        <DataTable
          columns={auditColumns}
          data={recentLogs}
          keyExtractor={(log) => log.id}
          loading={loading}
          emptyTitle="No recent audit events"
          emptySubtitle="System and operational events will be logged here as actions occur."
        />
      </Card>
    </div>
  );
}
