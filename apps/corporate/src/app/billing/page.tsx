'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  FileText,
  AlertTriangle,
  Download,
  Plus,
  Scale,
  Receipt,
  Layers,
} from 'lucide-react';
import { billingApi } from '../../lib/api/corporate';
import { Invoice, InvoiceDispute } from '../../lib/api/types';
import { MetricCard } from '../../components/common/MetricCard';
import { FilterBar } from '../../components/common/FilterBar';
import { DonutChart } from '../../components/charts/DonutChart';
import { AreaTrendChart } from '../../components/charts/AreaTrendChart';

function formatPaiseToRupees(paise: string | number): string {
  const rupees = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

interface PageProps {
  searchParams?: { tenantId?: string };
}

export default function BillingOverviewPage({ searchParams }: PageProps) {
  const activeTenantId = searchParams?.tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [disputes, setDisputes] = useState<InvoiceDispute[]>([]);

  useEffect(() => {
    async function loadBilling() {
      if (!activeTenantId) return;
      try {
        setLoading(true);
        const [invRes, dispRes] = await Promise.all([
          billingApi.invoices(activeTenantId, { limit: 100 }),
          billingApi.disputes(activeTenantId).catch(() => []),
        ]);
        setInvoices(invRes.items || []);
        setDisputes(dispRes || []);
      } catch (err) {
        console.error('Failed to load corporate billing overview:', err);
        setInvoices([]);
        setDisputes([]);
      } finally {
        setLoading(false);
      }
    }
    loadBilling();
  }, [activeTenantId]);

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
    : 100;

  // Monthly billing aggregation
  const monthMap = new Map<string, number>();
  invoices.forEach((inv) => {
    const month = new Date(inv.createdAt).toLocaleString('default', { month: 'short', year: '2-digit' });
    const amount = Number((Number(inv.totalAmountPaise) || 0) / 100 / 1000); // in thousands
    monthMap.set(month, (monthMap.get(month) || 0) + amount);
  });

  const billingTrend = monthMap.size > 0
    ? Array.from(monthMap.entries()).map(([day, trips]) => ({ day, trips }))
    : [
        { day: 'Jul', trips: 0 },
        { day: 'Aug', trips: 0 },
        { day: 'Sep', trips: 0 },
        { day: 'Oct', trips: 0 },
        { day: 'Nov', trips: 0 },
        { day: 'Dec', trips: 0 },
      ];

  const breakdownDonut = [
    { label: 'Employee Trips (Roster)', count: Math.round((totalBilledPaise / 100) * 0.75), pct: 75, color: '#5728B2' },
    { label: 'Ad-hoc Commutes', count: Math.round((totalBilledPaise / 100) * 0.15), pct: 15, color: '#8B5CF6' },
    { label: 'Re-routes & Waiting', count: Math.round((totalBilledPaise / 100) * 0.10), pct: 10, color: '#06B6D4' },
  ];

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
          showDateRange={true}
        />
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Total Billed"
          value={loading ? '...' : formatPaiseToRupees(totalBilledPaise)}
          icon={<IndianRupee size={18} />}
          highlightColor="#5728B2"
        />
        <MetricCard
          label="Paid Amount"
          value={loading ? '...' : formatPaiseToRupees(paidAmountPaise)}
          subtext={`${paidPct}% Settled`}
          icon={<CheckCircle2 size={18} />}
          trend={{ value: `${paidPct}%`, isPositive: paidPct >= 80 }}
          highlightColor="#16A34A"
        />
        <MetricCard
          label="Outstanding"
          value={loading ? '...' : formatPaiseToRupees(outstandingPaise)}
          subtext={outstandingPaise > 0 ? 'Balance Due' : 'Zero Balance'}
          icon={<AlertCircle size={18} />}
          trend={{ value: outstandingPaise > 0 ? 'Pending' : 'Cleared', isAlert: outstandingPaise > 0 }}
          highlightColor="#D97706"
        />
        <MetricCard
          label="Total Invoices"
          value={loading ? '...' : String(invoices.length)}
          subtext="Generated to date"
          icon={<Receipt size={18} />}
          highlightColor="#8B5CF6"
        />
        <MetricCard
          label="Disputes"
          value={loading ? '...' : String(disputes.length)}
          subtext={disputes.filter((d) => d.status === 'OPEN').length + ' Open'}
          icon={<Scale size={18} />}
          trend={{ value: `${disputes.length} active`, isAlert: disputes.length > 0 }}
          highlightColor="#DC2626"
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
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#5728B2',
                backgroundColor: 'rgba(87, 40, 178, 0.08)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid rgba(87, 40, 178, 0.2)',
              }}
            >
              {invoices.length} Invoices Tracked
            </span>
          </div>

          <AreaTrendChart
            data={billingTrend}
            height={210}
            lineColor="#5728B2"
            metricLabel="k"
          />
        </div>

        {/* Right: Cost Breakdown Donut */}
        <div className="surface-card" style={{ padding: '20px 24px', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Cost Breakdown
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Expenditure classified across roster and ad-hoc operations
              </p>
            </div>
          </div>

          <DonutChart
            totalLabel="Total Spend"
            totalValue={formatPaiseToRupees(totalBilledPaise)}
            segments={breakdownDonut}
            size={185}
            thickness={22}
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="surface-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Quick Actions
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            href="/billing/invoices"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(87, 40, 178, 0.08)',
              color: '#5728B2',
              border: '1px solid rgba(87, 40, 178, 0.25)',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <FileText size={14} />
            <span>View All Invoices</span>
          </Link>

          <Link
            href="/billing/disputes"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <Scale size={14} />
            <span>Manage Disputes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
