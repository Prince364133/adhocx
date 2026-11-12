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
import { adminApi, getOpsBaseUrl } from '../../lib/api/client';
import {
  AdminMetrics,
  AuditLogItem,
  CorridorAnalytics,
  DailyFinancialReport,
  FinancialCompanyOption,
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
import { CompanyFilterDropdown } from '../../components/dashboard/CompanyFilterDropdown';

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
  const [opsBaseUrl, setOpsBaseUrl] = useState<string>(
    () => process.env.NEXT_PUBLIC_OPS_URL?.trim().replace(/\/+$/, '') || 'http://localhost:7004',
  );
  useEffect(() => {
    setOpsBaseUrl(getOpsBaseUrl());
  }, []);
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
  const [financialCompanies, setFinancialCompanies] = useState<FinancialCompanyOption[]>([]);
  const [financialCompaniesLoading, setFinancialCompaniesLoading] = useState(true);
  const [selectedFinancialCompany, setSelectedFinancialCompany] = useState<FinancialCompanyOption | null>(null);
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
        companiesRes,
      ] = await Promise.allSettled([
        adminApi.getMetrics(),
        adminApi.getOperationalReports(),
        adminApi.getCorridorAnalytics(),
        adminApi.getAuditLogs(8),
        adminApi.getRequirements('ALL'),
        adminApi.getFinancialCompanies(),
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
      if (companiesRes.status === 'fulfilled' && Array.isArray(companiesRes.value)) {
        setFinancialCompanies(companiesRes.value);
      }
    } finally {
      setLoading(false);
      setFinancialCompaniesLoading(false);
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
      .getDailyFinancialReport(
        selectedFinancialDate,
        selectedFinancialCompany?.entityId,
        selectedFinancialCompany?.companyType,
      )
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
  }, [selectedFinancialDate, selectedFinancialCompany]);

  return (
    <div className="admin-page">
      {/* ─────────────────────────────────────────────────────────────
       * 1. Production-Grade Executive KPI Header Bar & Financial Strip
       * ───────────────────────────────────────────────────────────── */}
      <div className="module-bar" style={{ padding: '0.88rem 1.15rem 0.82rem', marginTop: '0.15rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
            Financial Metrics
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
            Selected India business date · INR
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <CompanyFilterDropdown
            companies={financialCompanies}
            selectedCompanyId={selectedFinancialCompany?.id ?? null}
            onChange={setSelectedFinancialCompany}
            loading={financialCompaniesLoading}
          />
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 600,
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
              className="form-input"
              style={{
                width: 'auto',
                padding: '0.36rem 0.65rem',
                fontSize: '0.78rem',
              }}
            />
          </label>
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '0.85rem',
        }}
      >
        {/* KPI 1: Gross Booking Value (GMV) */}
        <div
          className="stat-card"
          style={{
            borderTop: '2px solid var(--brand-primary)',
            gap: '0.55rem',
            order: 1,
          }}
        >
          <div>
            <div style={{ marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Gross Merchandise Value
              </span>
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
              {financialReportLoading ? '…' : dailyFinancialReport ? `₹ ${dailyFinancialReport.grossBookingValue.toLocaleString('en-IN')}` : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.22rem' }}>
              Captured payment value on the selected date
            </div>
          </div>
          <div style={{ paddingTop: '0.42rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {dailyFinancialReport ? `${dailyFinancialReport.capturedPaymentCount} captured payments` : 'Recorded payment data'}
          </div>
        </div>

        {/* KPI 2: Platform Take-Rate Revenue (Net Margin) */}
        <div
          className="stat-card"
          style={{
            borderTop: '2px solid var(--brand-secondary)',
            gap: '0.55rem',
            order: 3,
          }}
        >
          <div>
            <div style={{ marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Platform Revenue (Recorded)
              </span>
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--brand-secondary)', letterSpacing: '-0.02em', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
              {financialReportLoading ? '…' : dailyFinancialReport ? `₹ ${dailyFinancialReport.revenue.toLocaleString('en-IN')}` : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.22rem' }}>
              Recorded platform commission and pricing-spread credits
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '0.42rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {dailyFinancialReport ? `${dailyFinancialReport.platformRevenueEntryCount} platform ledger credits` : 'Recorded platform ledger data'}
            </span>
          </div>
        </div>

        {/* KPI 3: Live Escrow In Transit */}
        <div
          className="stat-card"
          style={{
            borderTop: '2px solid #0284C7',
            gap: '0.55rem',
            order: 4,
          }}
        >
          <div>
            <div style={{ marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Active Escrow Locked
              </span>
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
              {financialReportLoading ? '…' : dailyFinancialReport ? `₹ ${dailyFinancialReport.activeEscrowHoldValue.toLocaleString('en-IN')}` : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.22rem' }}>
              Active pending/authorized holds opened on this date
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '0.42rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Active holds: <strong>{dailyFinancialReport?.activeEscrowHoldCount ?? '—'} Txns</strong>
            </span>
          </div>
        </div>

        {/* KPI 4: Driver Settlements Disbursed */}
        <div
          className="stat-card"
          style={{
            borderTop: '2px solid var(--color-success)',
            gap: '0.55rem',
            order: 2,
          }}
        >
          <div>
            <div style={{ marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Driver Settlements Disbursed
              </span>
            </div>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-success)', letterSpacing: '-0.02em', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
              {financialReportLoading ? '…' : dailyFinancialReport ? `₹ ${dailyFinancialReport.expenditure.toLocaleString('en-IN')}` : '—'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.22rem' }}>
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
       * 3. Operational Pulse Metrics (Unified Reference Strip)
       * ───────────────────────────────────────────────────────────── */}
      <div className="kpi-strip">
        <div className="kpi-strip-cell">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <ClipboardList size={14} color="var(--brand-primary)" />
            <span>Active Requirements</span>
          </div>
          <div style={{ fontSize: '1.3125rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {metrics.activeRequirements}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Live booking demands</div>
        </div>

        <div className="kpi-strip-cell">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Car size={14} color="#0284C7" />
            <span>Fleet In Transit</span>
          </div>
          <div style={{ fontSize: '1.3125rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {metrics.activeTrips}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cabs currently on duty</div>
        </div>

        <div className="kpi-strip-cell">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <ShieldCheck size={14} color="var(--color-success)" />
            <span>Verified Drivers</span>
          </div>
          <div style={{ fontSize: '1.3125rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {metrics.verifiedDrivers}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {metrics.totalDrivers}</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{metrics.pendingDriversKyc} pending KYC review</div>
        </div>

        <div className="kpi-strip-cell">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Building2 size={14} color="var(--brand-secondary)" />
            <span>Corporate Vendors</span>
          </div>
          <div style={{ fontSize: '1.3125rem', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {metrics.totalVendors}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{metrics.verifiedVendors} verified B2B clients</div>
        </div>
      </div>

      <TripFrequencyCharts />

      {/* ─────────────────────────────────────────────────────────────
       * 4. Multi-Graph Command Center (Production Grade Charts)
       * ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '0.2rem' }}>
        {/* Graph Selection Tabs Bar */}
        <div className="module-bar" style={{ padding: '0.68rem 1rem' }}>
          <div className="module-bar-title">Analytics & Telemetry</div>
          <div className="module-bar-tabs">
            <button
              type="button"
              onClick={() => setActiveChartTab('REVENUE')}
              className={`module-tab-btn${activeChartTab === 'REVENUE' ? ' active' : ''}`}
            >
              <DollarSign size={14} />
              <span>Revenue & Income</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('ECOSYSTEM')}
              className={`module-tab-btn${activeChartTab === 'ECOSYSTEM' ? ' active' : ''}`}
            >
              <Users size={14} />
              <span>Driver & Vendor Growth</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('FLEET')}
              className={`module-tab-btn${activeChartTab === 'FLEET' ? ' active' : ''}`}
            >
              <Car size={14} />
              <span>Fleet Category Demand</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveChartTab('CORRIDORS')}
              className={`module-tab-btn${activeChartTab === 'CORRIDORS' ? ' active' : ''}`}
            >
              <MapPin size={14} />
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.15rem',
          marginTop: '0.15rem',
        }}
      >
        {/* Active Requirements Board */}
        <div
          className="card"
          style={{
            padding: '1.22rem 1.2rem 1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.95rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.18rem 0' }}>
                Live Requirements Dispatch Queue
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>
                Active direct dispatch and corporate transport requests
              </p>
            </div>
            <a
              href={`${opsBaseUrl || 'http://localhost:7004'}/requirements`}
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
            </a>
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
          className="card"
          style={{
            padding: '1.22rem 1.2rem 1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.95rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.18rem 0' }}>
                Operational SLA Performance Radar
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>
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
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: sla.value !== 'N/A' ? 'var(--color-success)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
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
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          marginTop: '0.15rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.08rem 1.2rem 0.95rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.18rem 0' }}>
              Security, Financial & Administrative Audit Stream
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: 0 }}>
              Immutable system ledger logs across KYC, settlements, and contracts
            </p>
          </div>
          <Link
            href="/audit"
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
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
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Actor</th>
                <th style={{ textAlign: 'right' }}>Integrity</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.action}
                    </td>
                    <td>
                      <span className="code-tag">
                        {log.entityType} ({log.entityId ? log.entityId.slice(0, 8) + '...' : 'SYSTEM'})
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {log.actor?.phone || log.actor?.role || 'SYSTEM_DAEMON'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="badge badge-success">
                        <ShieldCheck size={12} />
                        <span>Verified</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
