'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ContentLoadingSkeleton, LazyMount, SkeletonBone } from '@adhocx/ui/page-loading';
import {
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Scale,
  Receipt,
} from 'lucide-react';
import { ApiError } from '../../lib/api/client';
import { billingApi } from '../../lib/api/corporate';
import { Invoice, InvoiceDispute } from '../../lib/api/types';
import { MetricCard } from '../../components/common/MetricCard';
import { FilterBar } from '../../components/common/FilterBar';
import { LazyAreaTrendChart } from '../../components/charts/LazyCharts';
import { useSession } from '../../lib/auth/SessionContext';

function formatPaiseToRupees(paise: string | number | null | undefined): string {
  const numericPaise = Number(paise ?? 0);
  const rupees = Number.isFinite(numericPaise) ? numericPaise / 100 : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

export default function BillingOverviewPage() {
  const { tenantId: activeTenantId } = useSession();
  const [selectedOffice, setSelectedOffice] = useState('All Offices');
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [disputes, setDisputes] = useState<InvoiceDispute[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    if (!activeTenantId) {
      setInvoices([]);
      setDisputes([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      const [invRes, dispRes] = await Promise.all([
        billingApi.invoices(activeTenantId, { limit: 100 }),
        billingApi.disputes(activeTenantId).catch((err) => {
          if (err instanceof ApiError && err.status === 403) return [] as InvoiceDispute[];
          throw err;
        }),
      ]);
      setInvoices(invRes.items || []);
      setDisputes(dispRes || []);
    } catch (err) {
      console.error('Failed to load corporate billing overview:', err);
      setInvoices([]);
      setDisputes([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load billing data.');
    } finally {
      setLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const totalBilledPaise = invoices.reduce(
    (acc, inv) => acc + (Number(inv.totalAmountPaise) || 0),
    0,
  );
  const paidAmountPaise = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((acc, inv) => acc + (Number(inv.totalAmountPaise) || 0), 0);
  const outstandingPaise = totalBilledPaise > paidAmountPaise ? totalBilledPaise - paidAmountPaise : 0;

  const paidPct = totalBilledPaise > 0
    ? Math.round((paidAmountPaise * 100) / totalBilledPaise)
    : null;

  // Monthly billing aggregation
  const monthMap = new Map<string, { day: string; trips: number }>();
  invoices.forEach((inv) => {
    const date = new Date(inv.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const month = monthMap.get(key) ?? {
      day: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
      trips: 0,
    };
    month.trips += (Number(inv.totalAmountPaise) || 0) / 100 / 1000;
    monthMap.set(key, month);
  });

  const billingTrend = Array.from(monthMap.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([, month]) => month);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Billing Overview
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Complete view of transport billing, invoices, payments and outstanding amounts
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showDateRange={false}
          selectedOffice={selectedOffice}
          onOfficeChange={setSelectedOffice}
          onRefresh={() => void loadBilling()}
        />
      </div>

      {loadError && <div role="alert" className="surface-card" style={{ padding: 16, color: '#B91C1C' }}>{loadError}</div>}

      {/* 5 KPI Metric Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Total Billed"
          value={formatPaiseToRupees(totalBilledPaise)}
          icon={<IndianRupee size={18} />}
          highlightColor="var(--brand-primary)"
          loading={loading}
        />
        <MetricCard
          label="Paid Amount"
          value={formatPaiseToRupees(paidAmountPaise)}
          subtext={paidPct === null ? 'No invoice totals' : `${paidPct}% Settled`}
          icon={<CheckCircle2 size={18} />}
          trend={paidPct === null ? undefined : { value: `${paidPct}%`, isPositive: paidPct >= 80 }}
          highlightColor="var(--color-success)"
          loading={loading}
        />
        <MetricCard
          label="Outstanding"
          value={formatPaiseToRupees(outstandingPaise)}
          subtext={outstandingPaise > 0 ? 'Balance Due' : invoices.length ? 'No outstanding balance' : 'No invoices'}
          icon={<AlertCircle size={18} />}
          trend={invoices.length ? { value: outstandingPaise > 0 ? 'Pending' : 'Cleared', isAlert: outstandingPaise > 0 } : undefined}
          highlightColor="#D97706"
          loading={loading}
        />
        <MetricCard
          label="Total Invoices"
          value={String(invoices.length)}
          subtext="From saved invoices"
          icon={<Receipt size={18} />}
          highlightColor="var(--color-chart-purple)"
          loading={loading}
        />
        <MetricCard
          label="Disputes"
          value={String(disputes.length)}
          subtext={disputes.filter((d) => d.status === 'OPEN').length + ' Open'}
          icon={<Scale size={18} />}
          trend={{ value: `${disputes.filter((dispute) => dispute.status === 'OPEN').length} open`, isAlert: disputes.some((dispute) => dispute.status === 'OPEN') }}
          highlightColor="#DC2626"
          loading={loading}
        />
      </div>

      {/* Middle Grid: Trend Line + Cost Breakdown Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Left: Billing Trend */}
        <div className="surface-card" style={{ padding: '20px 24px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Billing Spend Trajectory
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Monthly gross transportation spend trajectory in ₹ thousands
              </p>
            </div>
            {loading ? (
              <SkeletonBone style={{ width: 112, height: 22, borderRadius: 999 }} />
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--brand-primary)',
                  backgroundColor: 'rgba(var(--brand-primary-rgb), 0.08)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid rgba(var(--brand-primary-rgb), 0.2)',
                }}
              >
                {invoices.length} Invoices Tracked
              </span>
            )}
          </div>

          {loading ? (
            <ContentLoadingSkeleton kind="chart" height={210} label="Loading billing trajectory…" />
          ) : billingTrend.length > 0 ? (
            <LazyMount
              minHeight={210}
              fallback={<ContentLoadingSkeleton kind="chart" height={210} label="Preparing billing trajectory…" />}
            >
              <LazyAreaTrendChart
                data={billingTrend}
                height={210}
                lineColor="var(--brand-primary)"
                metricLabel="k"
              />
            </LazyMount>
          ) : (
            <p style={{ padding: '56px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              No invoice history is available for this tenant.
            </p>
          )}
        </div>

        {/* Right: Cost Breakdown Donut */}
        <div className="surface-card" style={{ padding: '20px 24px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Cost Breakdown
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Invoice summaries do not include category totals.
              </p>
            </div>
          </div>
          <div style={{ minHeight: 185, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
            Category breakdown is unavailable from the current billing summary API.
          </div>
        </div>
      </div>
    </div>
  );
}
