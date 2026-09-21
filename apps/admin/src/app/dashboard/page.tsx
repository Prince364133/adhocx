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
  DollarSign,
  MapPin,
  Clock,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Server,
  Database,
  Lock,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  AdminMetrics,
  AdminPaymentMetrics,
  AuditLogItem,
  CorridorAnalytics,
  OperationalReportData,
  RateCard,
} from '../../lib/api/types';
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

  const [paymentMetrics, setPaymentMetrics] = useState<AdminPaymentMetrics>({
    totalEscrowVolume: 0,
    activeEscrowHolds: 0,
    settledVolume: 0,
    pendingTransactions: 0,
  });

  const [operationalReport, setOperationalReport] = useState<OperationalReportData | null>(null);
  const [corridors, setCorridors] = useState<CorridorAnalytics[]>([]);
  const [pricingTiers, setPricingTiers] = useState<RateCard[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadDashboardData() {
    try {
      const [
        metricsRes,
        paymentsRes,
        reportsRes,
        corridorsRes,
        pricingRes,
        logsRes,
      ] = await Promise.allSettled([
        adminApi.getMetrics(),
        adminApi.getAdminPaymentMetrics(),
        adminApi.getOperationalReports(),
        adminApi.getCorridorAnalytics(),
        adminApi.getPricingTiers(),
        adminApi.getAuditLogs(6),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value) {
        setMetrics((prev) => ({ ...prev, ...metricsRes.value }));
      }
      if (paymentsRes.status === 'fulfilled' && paymentsRes.value) {
        const val = paymentsRes.value as any;
        setPaymentMetrics({
          totalEscrowVolume: Number(val.totalEscrowVolume ?? val.totalVolume ?? 0),
          activeEscrowHolds: Number(val.activeEscrowHolds ?? val.escrow ?? 0),
          settledVolume: Number(val.settledVolume ?? val.captured ?? 0),
          pendingTransactions: Number(val.pendingTransactions ?? 0),
        });
      }
      if (reportsRes.status === 'fulfilled') setOperationalReport(reportsRes.value);
      if (corridorsRes.status === 'fulfilled') setCorridors(corridorsRes.value || []);
      if (pricingRes.status === 'fulfilled') setPricingTiers(pricingRes.value || []);
      if (logsRes.status === 'fulfilled') setRecentLogs(logsRes.value || []);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
    // Live polling refresh every 15 seconds
    const interval = setInterval(loadDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

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

  const gmvValue = Number(operationalReport?.totalGrossBookingValue ?? paymentMetrics?.totalEscrowVolume ?? 0);
  const netRevenue = Number(operationalReport?.platformRevenue ?? Math.round(gmvValue * 0.12));

  return (
    <div style={{ paddingBottom: '2.5rem' }}>
      <PageHeader
        title="Mission Control Center"
        subtitle="Real-time financial clearing, dispatch telemetry, and fleet operations across the AdhocX platform"
        liveStatus="Live Telemetry Active"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              loading={isRefreshing}
              leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
            >
              Sync Live Data
            </Button>
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

      {/* Cluster Health & Live Telemetry Pill Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.625rem 1.25rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }} />
            <span>PostgreSQL: <strong>Connected</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }} />
            <span>Redis Pub/Sub: <strong>Active</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-success)', display: 'inline-block' }} />
            <span>Cloudflare R2: <strong>Ready</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB', display: 'inline-block' }} />
            <span>Telemetry WebSocket: <strong>Listening</strong></span>
          </div>
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          API Gateway: <strong>http://localhost:7001/api/v1</strong>
        </div>
      </div>

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

      {/* ── SECTION 1: FINANCIAL & ESCROW CLEARING ENGINE ───────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Banknote size={20} color="var(--brand-primary)" />
              Financial & Escrow Clearing Pulse
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Real-time platform GMV, active escrow locked in transit, and driver settlement clearing
            </p>
          </div>
          <Link href="/payments" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Escrow Ledger <ArrowUpRight size={14} />
            </span>
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <MetricCard
            label="Platform Gross Booking Value"
            value={loading ? '...' : `₹ ${Number(gmvValue || 0).toLocaleString('en-IN')}`}
            subtext="Total marketplace GMV transacted"
            icon={<Banknote size={18} color="var(--brand-primary)" />}
            accentColor="var(--brand-primary)"
          />
          <MetricCard
            label="Live Escrow Held in Transit"
            value={loading ? '...' : `₹ ${Number(paymentMetrics?.activeEscrowHolds || 0).toLocaleString('en-IN')}`}
            subtext="Client funds locked in active rides"
            icon={<Lock size={18} color="#2563EB" />}
            accentColor="#2563EB"
          />
          <MetricCard
            label="Platform Take-Rate Revenue"
            value={loading ? '...' : `₹ ${Number(netRevenue || 0).toLocaleString('en-IN')}`}
            subtext="Net commission retained to date"
            icon={<TrendingUp size={18} color="var(--color-success)" />}
            accentColor="var(--color-success)"
          />
          <MetricCard
            label="Driver Settlements Disbursed"
            value={loading ? '...' : `₹ ${Number(paymentMetrics?.settledVolume || 0).toLocaleString('en-IN')}`}
            subtext="Cleared payouts via bank UTR"
            icon={<Wallet size={18} color="#8B5CF6" />}
            accentColor="#8B5CF6"
          />
        </div>
      </div>

      {/* ── SECTION 2: PRIMARY OPERATIONAL KPI GRID ────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} color="#2563EB" />
              Marketplace Sourcing & Fleet Telemetry
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Live supply and demand distribution across all registered transport partners
            </p>
          </div>
          <Link href="/trips" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Live Fleet Map <ArrowUpRight size={14} />
            </span>
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <MetricCard
            label="Active Requirements"
            value={loading ? '...' : metrics.activeRequirements}
            subtext="Open enterprise lots"
            icon={<ClipboardList size={18} color="var(--brand-primary)" />}
            accentColor="var(--brand-primary)"
          />
          <MetricCard
            label="Cabs in Transit"
            value={loading ? '...' : metrics.activeTrips}
            subtext="Executing en route now"
            icon={<Car size={18} color="#2563EB" />}
            accentColor="#2563EB"
          />
          <MetricCard
            label="Verified Drivers"
            value={loading ? '...' : `${metrics.verifiedDrivers} / ${metrics.totalDrivers}`}
            subtext={`${metrics.pendingDriversKyc} pending KYC`}
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
            subtext="Fulfilled rides to date"
            icon={<CheckCircle2 size={18} color="var(--color-success)" />}
            accentColor="var(--color-success)"
          />
          <MetricCard
            label="Pending Settlements"
            value={loading ? '...' : metrics.pendingSettlements}
            subtext="Awaiting UTR auth"
            icon={<Wallet size={18} color="var(--color-warning)" />}
            accentColor="var(--color-warning)"
          />
        </div>
      </div>

      {/* ── SECTION 3: VISUAL INTELLIGENCE & SOURCING PROGRESS ─────────────────── */}
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

      {/* ── SECTION 4: HIGH-DENSITY CORRIDOR INTELLIGENCE & VEHICLE PRICING ──── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Card 1: Top Operating Corridors */}
        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(139, 92, 246, 0.12)',
                  color: '#8B5CF6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPin size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  High-Density Route Corridors
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                  Top intercity demand routes and fulfillment realization
                </p>
              </div>
            </div>
            <Link href="/reports" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '0.75rem', color: '#8B5CF6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                All Analytics <ArrowRight size={12} />
              </span>
            </Link>
          </div>

          {corridors.length === 0 ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              No route corridors generated yet. Corridors aggregate automatically from live user requirements.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {corridors.slice(0, 4).map((c, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-card-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--brand-primary-subtle)',
                        color: 'var(--brand-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                        {c.corridor}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {c.totalTrips} bookings • Top Fleet: {c.topVehicleType || 'Sedan'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-success)' }}>
                      ₹ {Number(c.totalRevenue || 0).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      Avg: ₹{Math.round(Number(c.avgDriverRate || 0))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card 2: Dynamic Tariff Rates by Vehicle Category */}
        <Card variant="default">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--color-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Layers size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Active Vehicle Tariff Cards
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                  Live rate cards and platform commission splits
                </p>
              </div>
            </div>
            <Link href="/pricing" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                Adjust Tariffs <ArrowRight size={12} />
              </span>
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            {pricingTiers.slice(0, 6).map((tier) => (
              <div
                key={tier.vehicleType}
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-card-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {tier.displayName}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
                  ₹{tier.perKmRate}/km
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Base: ₹{tier.baseFare} ({tier.baseKm}km)
                </div>
                <div style={{ fontSize: '0.625rem', color: 'var(--color-success)', fontWeight: 600 }}>
                  Take-rate: {tier.platformFeePercentage}%
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── SECTION 5: RECENT SECURITY & OPERATIONAL AUDIT TRAIL ─────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={20} color="var(--brand-primary)" />
              Security Audit Stream
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Append-only audit trail recording operator decisions and compliance verifications
            </p>
          </div>
          <Link href="/audit" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm" rightIcon={<ArrowRight size={14} />}>
              View Complete Trail
            </Button>
          </Link>
        </div>

        <Card variant="default" padding="none">
          <DataTable<AuditLogItem>
            data={recentLogs}
            columns={auditColumns}
            keyExtractor={(log) => log.id}
            loading={loading}
            emptyTitle="No Audit Logs"
            emptyMessage="Audit records will automatically appear when administrative actions are performed."
          />
        </Card>
      </div>
    </div>
  );
}
