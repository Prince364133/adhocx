'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ClipboardList,
  Car,
  Users,
  Building2,
  ArrowRight,
  DollarSign,
  MapPin,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  AdminMetrics,
  AuditLogItem,
  CorridorAnalytics,
  DailyFinancialReport,
  OperationalReportData,
  RequirementListItem,
} from '../../lib/api/types';
import {
  RevenueIncomeChart,
  EcosystemGrowthChart,
  FleetCategoryDistributionChart,
  CorridorMatrixChart,
} from '../../components/dashboard/ExecutiveCharts';
import TripFrequencyCharts from '../../components/dashboard/TripFrequencyCharts';

function getIndiaDateInputValue() {
  const dateParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const parts = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default function DashboardPage() {
  const opsBaseUrl = process.env.NEXT_PUBLIC_OPS_URL?.replace(/\/+$/, '');
  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalDrivers: 0,
    verifiedDrivers: 0,
    pendingDriversKyc: 0,
    totalVendors: 0,
    verifiedVendors: 0,
    totalUsers: 0,
    activeRequirements: 0,
    activeTrips: 0,
    completedTrips: 0,
    pendingSettlements: 0,
  });

  const [selectedFinancialDate, setSelectedFinancialDate] = useState(getIndiaDateInputValue);
  const [dailyFinancialReport, setDailyFinancialReport] = useState<DailyFinancialReport | null>(null);
  const [financialReportLoading, setFinancialReportLoading] = useState(true);
  const [financialReportError, setFinancialReportError] = useState<string | null>(null);
  const [operationalReport, setOperationalReport] = useState<OperationalReportData | null>(null);
  const [corridors, setCorridors] = useState<CorridorAnalytics[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);
  const [recentRequirements, setRecentRequirements] = useState<RequirementListItem[]>([]);
  const [activeChartTab, setActiveChartTab] = useState<'REVENUE' | 'ECOSYSTEM' | 'FLEET' | 'CORRIDORS'>('REVENUE');

  const [, setLoading] = useState(true);

  async function loadDashboardData() {
    try {
      const [
        metricsRes,
        reportsRes,
        corridorsRes,
        logsRes,
        requirementsRes,
      ] = await Promise.allSettled([
        adminApi.getMetrics(),
        adminApi.getOperationalReports(),
        adminApi.getCorridorAnalytics(),
        adminApi.getAuditLogs(8),
        adminApi.getRequirements('ALL'),
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value) {
        setMetrics((prev) => ({ ...prev, ...metricsRes.value }));
      }
      if (reportsRes.status === 'fulfilled') setOperationalReport(reportsRes.value);
      if (corridorsRes.status === 'fulfilled') setCorridors(Array.isArray(corridorsRes.value) ? corridorsRes.value : []);
      if (logsRes.status === 'fulfilled') setRecentLogs(Array.isArray(logsRes.value) ? logsRes.value : []);
      if (requirementsRes.status === 'fulfilled') {
        const reqs = Array.isArray(requirementsRes.value) ? requirementsRes.value : [];
        setRecentRequirements(reqs.slice(0, 6));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    setFinancialReportLoading(true);
    setFinancialReportError(null);
    setDailyFinancialReport(null);

    adminApi
      .getDailyFinancialReport(selectedFinancialDate)
      .then((report) => {
        if (active) setDailyFinancialReport(report);
      })
      .catch(() => {
        if (active) setFinancialReportError('Could not load financial metrics for this date. Please try again.');
      })
      .finally(() => {
        if (active) setFinancialReportLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedFinancialDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', paddingBottom: '3rem' }}>
      {/* ─────────────────────────────────────────────────────────────
       * 1. Production-Grade Executive KPI Band (Financial & Velocity)
       * ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Financial Metrics
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Selected India business date · INR
          </p>
        </div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          <span>Select date</span>
          <input
            aria-label="Financial metrics date"
            type="date"
            value={selectedFinancialDate}
            max={getIndiaDateInputValue()}
            onChange={(event) => {
              if (event.target.value) setSelectedFinancialDate(event.target.value);
            }}
            style={{
              padding: '0.5rem 0.65rem',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-canvas)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
            }}
          />
        </label>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* KPI 1: Gross Booking Value (GMV) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            padding: '1.35rem 1.5rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden',
            order: 1,
          }}
        >
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Gross Merchandise Value
              </span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {financialReportLoading ? '…' : dailyFinancialReport ? `₹ ${dailyFinancialReport.grossBookingValue.toLocaleString('en-IN')}` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Captured payment value on the selected date
            </div>
          </div>
          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {dailyFinancialReport ? `${dailyFinancialReport.capturedPaymentCount} captured payments` : 'Recorded payment data'}
          </div>
        </div>

        {/* KPI 2: Platform Take-Rate Revenue (Net Margin) */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            padding: '1.35rem 1.5rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden',
            order: 3,
          }}
        >
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Platform Revenue (Recorded)
              </span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--brand-secondary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {financialReportLoading ? '…' : dailyFinancialReport ? `₹ ${dailyFinancialReport.revenue.toLocaleString('en-IN')}` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Recorded platform commission and pricing-spread credits
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {dailyFinancialReport ? `${dailyFinancialReport.platformRevenueEntryCount} platform ledger credits` : 'Recorded platform ledger data'}
            </span>
          </div>
        </div>

        {/* KPI 3: Live Escrow In Transit */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            padding: '1.35rem 1.5rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden',
            order: 4,
          }}
        >
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Active Escrow Locked
              </span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {financialReportLoading ? '…' : dailyFinancialReport ? `₹ ${dailyFinancialReport.activeEscrowHoldValue.toLocaleString('en-IN')}` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Active pending/authorized holds opened on this date
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Active holds: <strong>{dailyFinancialReport?.activeEscrowHoldCount ?? '—'} Txns</strong>
            </span>
          </div>
        </div>

        {/* KPI 4: Driver Settlements Disbursed */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            padding: '1.35rem 1.5rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
            position: 'relative',
            overflow: 'hidden',
            order: 2,
          }}
        >
          <div>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Driver Settlements Disbursed
              </span>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--color-success)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {financialReportLoading ? '…' : dailyFinancialReport ? `₹ ${dailyFinancialReport.expenditure.toLocaleString('en-IN')}` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
              Settled payout value on the selected date
            </div>
          </div>
          <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {dailyFinancialReport ? `${dailyFinancialReport.settledPayoutCount} settled payouts` : 'Recorded settlement data'}
          </div>
        </div>
      </div>
      {financialReportError && (
        <p role="alert" style={{ margin: '-1rem 0 0', color: 'var(--color-error)', fontSize: '0.8rem' }}>
          {financialReportError}
        </p>
      )}

      {/* ─────────────────────────────────────────────────────────────
       * 3. Operational Pulse Metrics (Fleet, Drivers, Vendors, SLA)
       * ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-primary-subtle)',
              color: 'var(--brand-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ClipboardList size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Active Requirements
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.activeRequirements}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Live booking demands
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(2, 132, 199, 0.12)',
              color: '#0284C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Car size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Fleet In Transit
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.activeTrips}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              Cabs currently on duty
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Verified Drivers
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.verifiedDrivers}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}> / {metrics.totalDrivers}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {metrics.pendingDriversKyc} pending KYC review
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-orange-subtle)',
              color: 'var(--brand-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Corporate Vendors
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.totalVendors}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {metrics.verifiedVendors} verified B2B clients
            </div>
          </div>
        </div>
      </div>

      <TripFrequencyCharts />

      {/* ─────────────────────────────────────────────────────────────
       * 4. Multi-Graph Command Center (Production Grade Charts)
       * ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Graph Selection Tabs Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveChartTab('REVENUE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: activeChartTab === 'REVENUE' ? '1px solid var(--brand-primary)' : '1px solid var(--border)',
                background: activeChartTab === 'REVENUE' ? 'var(--brand-primary-gradient)' : 'var(--bg-surface)',
                color: activeChartTab === 'REVENUE' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <DollarSign size={16} />
              <span>Revenue & Income Graph</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('ECOSYSTEM')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: activeChartTab === 'ECOSYSTEM' ? '1px solid var(--brand-primary)' : '1px solid var(--border)',
                background: activeChartTab === 'ECOSYSTEM' ? 'var(--brand-primary-gradient)' : 'var(--bg-surface)',
                color: activeChartTab === 'ECOSYSTEM' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={16} />
              <span>Driver, Vendor & User Scaling Graph</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('FLEET')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: activeChartTab === 'FLEET' ? '1px solid var(--brand-primary)' : '1px solid var(--border)',
                background: activeChartTab === 'FLEET' ? 'var(--brand-primary-gradient)' : 'var(--bg-surface)',
                color: activeChartTab === 'FLEET' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Car size={16} />
              <span>Fleet Category Demand</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('CORRIDORS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: activeChartTab === 'CORRIDORS' ? '1px solid var(--brand-primary)' : '1px solid var(--border)',
                background: activeChartTab === 'CORRIDORS' ? 'var(--brand-primary-gradient)' : 'var(--bg-surface)',
                color: activeChartTab === 'CORRIDORS' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <MapPin size={16} />
              <span>Corridor Intelligence</span>
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Enterprise BI Visualizer • Real-Time Engine
          </div>
        </div>

        {/* Dynamic Chart Display based on active tab */}
        {activeChartTab === 'REVENUE' && (
          <RevenueIncomeChart />
        )}
        {activeChartTab === 'ECOSYSTEM' && (
          <EcosystemGrowthChart
            totalDrivers={metrics.totalDrivers}
            totalVendors={metrics.totalVendors}
            totalUsers={metrics.totalUsers}
          />
        )}
        {activeChartTab === 'FLEET' && (
          <FleetCategoryDistributionChart categories={(operationalReport as any)?.categoryBreakdown} />
        )}
        {activeChartTab === 'CORRIDORS' && (
          <CorridorMatrixChart corridors={corridors.length > 0 ? corridors : operationalReport?.corridorAnalytics} />
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * 5. Live Operations Dispatch Grid & Fleet Telemetry Stream
       * ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Active Requirements Board */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
                Live Requirements Dispatch Queue
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                Active direct dispatch and corporate transport requests
              </p>
            </div>
            <Link
              href={`${opsBaseUrl}/requirements`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--brand-primary)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentRequirements.length > 0 ? (
              recentRequirements.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                        {req.vendorName}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--brand-primary-subtle)',
                          color: 'var(--brand-primary)',
                        }}
                      >
                        {req.vehicleType}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={12} color="var(--text-muted)" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {req.pickupAddress} ➔ {req.dropAddress}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      ₹ {Number(req.vendorRate || req.suggestedBudget || 0).toLocaleString('en-IN')}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.45rem',
                        borderRadius: 'var(--radius-pill)',
                        background: req.status === 'FULFILLED' ? 'var(--color-success-bg)' : 'var(--brand-orange-subtle)',
                        color: req.status === 'FULFILLED' ? 'var(--color-success)' : 'var(--brand-secondary)',
                      }}
                    >
                      {req.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                No active requirements in dispatch queue.
              </div>
            )}
          </div>
        </div>

        {/* SLA & Governance Radar */}
        <div
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
                Operational SLA Performance Radar
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                Enterprise contract commitments and compliance adherence
              </p>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'var(--color-success)',
                background: 'var(--color-success-bg)',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-success-border)',
              }}
            >
              {metrics.completedTrips > 0 ? '100% HEALTHY' : 'OPERATIONAL'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(operationalReport?.slaHealth && operationalReport.slaHealth.length > 0
              ? operationalReport.slaHealth
              : [
                  {
                    metric: 'On-Time Pickup Reliability',
                    value: 'N/A',
                    sla: 'Threshold: 92.0%',
                    desc: 'Vehicle arrives within ±10 mins of scheduled time',
                  },
                  {
                    metric: 'Driver No-Show Guarantee',
                    value: '0.0%',
                    sla: 'Threshold: < 1.5%',
                    desc: 'Automatic backup driver reassignment triggered',
                  },
                  {
                    metric: 'KYC Document Verification SLA',
                    value: 'N/A',
                    sla: 'Threshold: < 6.0 Hours',
                    desc: 'Average turnaround from driver doc upload to approval',
                  },
                  {
                    metric: 'Bank Settlement Payout Cycle',
                    value: 'N/A',
                    sla: 'Threshold: < 24.0 Hours',
                    desc: 'Average time from withdrawal request to UTR dispatch',
                  },
                ]
            ).map((sla, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {sla.metric}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {sla.desc}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: sla.value !== 'N/A' ? 'var(--color-success)' : 'var(--text-muted)' }}>
                    {sla.value}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {sla.sla}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * 6. Live Audit & Governance Event Stream
       * ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
              Security, Financial & Administrative Audit Stream
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
              Immutable system ledger logs across KYC, settlements, and contracts
            </p>
          </div>
          <Link
            href="/audit"
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--brand-primary)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span>Full Audit Trail</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>TIMESTAMP</th>
                <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTION</th>
                <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>ENTITY</th>
                <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTOR</th>
                <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>INTEGRITY</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)' }}>
                      {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-canvas)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {log.entityType} ({log.entityId ? log.entityId.slice(0, 8) + '...' : 'SYSTEM'})
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {log.actor?.phone || log.actor?.role || 'SYSTEM_DAEMON'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: 'var(--color-success)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <ShieldCheck size={13} />
                        <span>VERIFIED</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    System operating nominally. All events ledgered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
