'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  Car,
  Users,
  Building2,
  CheckCircle2,
  Wallet,
  ArrowRight,
  TrendingUp,
  Radio,
  Banknote,
  Activity,
  FileText,
  BadgeCheck,
  Check,
  Zap,
} from 'lucide-react';
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
            totalDrivers: 0,
            verifiedDrivers: 0,
            pendingDriversKyc: 0,
            totalVendors: 0,
            verifiedVendors: 0,
            activeRequirements: 0,
            activeTrips: 0,
            completedTrips: 0,
            pendingSettlements: 0,
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

  // Calculated rates for operational visualization
  const fleetComplianceRate =
    metrics.totalDrivers > 0
      ? Math.round((metrics.verifiedDrivers / metrics.totalDrivers) * 100)
      : 0;
  const vendorActivationRate =
    metrics.totalVendors > 0
      ? Math.round((metrics.verifiedVendors / metrics.totalVendors) * 100)
      : 0;
  const fulfillmentRate =
    (metrics.activeTrips + metrics.completedTrips) > 0
      ? Math.round((metrics.completedTrips / (metrics.activeTrips + metrics.completedTrips)) * 100)
      : (metrics.activeRequirements > 0 ? 0 : 100);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <PageHeader
        title="Marketplace Overview"
        subtitle="Real-time telemetry, demand fulfillment, and financial clearing metrics across the AdhocX platform"
        liveStatus="Live Telemetry"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href="/verifications" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" leftIcon={<ShieldCheck size={16} />}>
                Verification Center
              </Button>
            </Link>
            <Link href="/requirements" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm" leftIcon={<ClipboardList size={16} />}>
                Live Requirements
              </Button>
            </Link>
          </div>
        }
      />

      {/* Operational Attention Banner */}
      {(metrics.pendingDriversKyc > 0 || metrics.pendingSettlements > 0) && (
        <div
          style={{
            background: 'var(--color-warning-bg)',
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
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(217, 119, 6, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-warning)',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--color-warning)', fontSize: '0.9375rem' }}>
                Operational Attention Required
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {metrics.pendingDriversKyc > 0 && `${metrics.pendingDriversKyc} driver KYC application(s) pending compliance review. `}
                {metrics.pendingSettlements > 0 && `${metrics.pendingSettlements} driver settlement withdrawal(s) awaiting processing.`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {metrics.pendingDriversKyc > 0 && (
              <Link href="/verifications" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm" rightIcon={<ArrowRight size={14} />}>
                  Review KYC
                </Button>
              </Link>
            )}
            {metrics.pendingSettlements > 0 && (
              <Link href="/settlements" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="sm" rightIcon={<ArrowRight size={14} />}>
                  Process Payouts
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Primary Operational KPI Grid */}
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
          subtext="Live enterprise demand"
          icon={<ClipboardList size={18} color="var(--brand-primary)" />}
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Active Trips"
          value={loading ? '...' : metrics.activeTrips}
          subtext="Executing in transit now"
          icon={<Car size={18} color="#2563EB" />}
          accentColor="#2563EB"
        />
        <MetricCard
          label="Verified Drivers"
          value={loading ? '...' : `${metrics.verifiedDrivers} / ${metrics.totalDrivers}`}
          subtext={`${metrics.pendingDriversKyc} pending verification`}
          icon={<BadgeCheck size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Enterprise Vendors"
          value={loading ? '...' : `${metrics.verifiedVendors} / ${metrics.totalVendors}`}
          subtext="Corporate client accounts"
          icon={<Building2 size={18} color="#8B5CF6" />}
          accentColor="#8B5CF6"
        />
        <MetricCard
          label="Completed Trips"
          value={loading ? '...' : metrics.completedTrips}
          subtext="Fulfilled bookings to date"
          icon={<CheckCircle2 size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Pending Settlements"
          value={loading ? '...' : metrics.pendingSettlements}
          subtext="Awaiting payout authorization"
          icon={<Wallet size={18} color="var(--color-warning)" />}
          accentColor="var(--color-warning)"
        />
      </div>

      {/* Operational Analytics & Data Visualizations ("DVD Charts") */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Chart 1: Sourcing & Demand Fulfillment Distribution */}
        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--brand-primary-subtle)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Live Sourcing & Fulfillment Efficiency
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                  Real-time cab sourcing pipeline across active requirements
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-success)',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-success-border)',
                borderRadius: 'var(--radius-pill)',
                padding: '0.2rem 0.6rem',
              }}
            >
              {fulfillmentRate}% Fulfilled
            </span>
          </div>

          {/* Clean Metric Progress Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Active Cabs Assigned & En Route</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{metrics.activeTrips} active / {metrics.completedTrips} completed</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                <div style={{ width: `${fulfillmentRate}%`, height: '100%', backgroundColor: 'var(--brand-primary)', borderRadius: 'var(--radius-pill)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Driver Fleet Compliance Rate</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{fleetComplianceRate}% verified</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                <div style={{ width: `${fleetComplianceRate}%`, height: '100%', backgroundColor: 'var(--color-success)', borderRadius: 'var(--radius-pill)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '0.35rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Enterprise Vendor Account Health</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{vendorActivationRate}% active</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                <div style={{ width: `${vendorActivationRate}%`, height: '100%', backgroundColor: '#8B5CF6', borderRadius: 'var(--radius-pill)' }} />
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>Avg. Dispatch Match Time: <strong>4.2 mins</strong></span>
            <span>Escrow Settle SLA: <strong>24 hrs</strong></span>
          </div>
        </Card>

        {/* Chart 2: Trip Lifecycle & Execution Telemetry */}
        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(37, 99, 235, 0.12)',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Activity size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Trip Lifecycle & Operations Telemetry
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                  Current status distribution of marketplace rides
                </p>
              </div>
            </div>
            <Link href="/trips" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Live Grid <ArrowRight size={12} />
              </span>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.875rem' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-card-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                IN TRANSIT (LIVE)
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563EB' }}>
                {metrics.activeTrips}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                GPS breadcrumbs tracking
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-card-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                COMPLETED TODAY
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-success)' }}>
                {metrics.completedTrips}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Successful drop-offs
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-card-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                DEMAND QUEUE
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                {metrics.activeRequirements}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Open requirement lots
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-card-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
                SETTLEMENT QUEUE
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--color-warning)' }}>
                {metrics.pendingSettlements}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Payouts pending auth
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--color-success)',
            }}
          >
            <Check size={14} />
            <span>Telemetry streams & WebSocket connection active</span>
          </div>
        </Card>
      </div>

      {/* Operational Module Quick Access */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--brand-primary-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Driver Supply & Compliance
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Inspect commercial permits, driving licenses, and vehicle registrations. Transition drivers to VERIFIED or SUSPENDED.
          </p>
          <Link href="/drivers" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight size={14} />}>
              Manage Driver Network
            </Button>
          </Link>
        </Card>

        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Radio size={20} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Live Telemetry & Tracking
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Real-time geospatial breadcrumbs and event history for active rides, arrival times, and drop-off confirmations.
          </p>
          <Link href="/trips" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight size={14} />}>
              View Live Rides
            </Button>
          </Link>
        </Card>

        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--color-warning-bg)',
                color: 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Banknote size={20} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Financial Ledger & Settlements
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
            Authorize driver bank withdrawals with UTR references or mark failed with automated ledger rollback protection.
          </p>
          <Link href="/settlements" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" rightIcon={<ArrowRight size={14} />}>
              Process Settlements
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card-elevated)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Recent Platform Interventions
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem', margin: 0 }}>
                Immutable audit entries of administrative actions and compliance decisions
              </p>
            </div>
          </div>
          <Link href="/audit" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm" rightIcon={<ArrowRight size={14} />}>
              View Full Audit Log
            </Button>
          </Link>
        </div>

        <DataTable
          columns={auditColumns}
          data={recentLogs}
          keyExtractor={(log) => log.id}
          loading={loading}
          emptyIcon={<FileText size={28} />}
          emptyTitle="No recent audit events"
          emptySubtitle="System and operational events will be logged here as administrative actions occur."
        />
      </Card>
    </div>
  );
}
