'use client';

import React from 'react';
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
} from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard';
import { FilterBar } from '../../components/common/FilterBar';
import { DonutChart } from '../../components/charts/DonutChart';
import { AreaTrendChart } from '../../components/charts/AreaTrendChart';

const MOCK_COST_BREAKDOWN_DONUT = [
  { label: 'Employee Trips (Roster)', count: 2094000, pct: 72.8, color: '#1167EE' },
  { label: 'Ad-hoc Trips', count: 333600, pct: 11.6, color: '#8B5CF6' },
  { label: 'Re-routes', count: 184000, pct: 6.4, color: '#06B6D4' },
  { label: 'Cancellations (Chargeable)', count: 118000, pct: 4.1, color: '#D97706' },
  { label: 'Other Charges', count: 146900, pct: 5.1, color: '#64748B' },
];

const MOCK_6_MONTHS_BILLING_TREND = [
  { day: 'Jul 26', trips: 1820 },
  { day: 'Aug 26', trips: 2040 },
  { day: 'Sep 26', trips: 2280 },
  { day: 'Oct 26', trips: 2450 },
  { day: 'Nov 26', trips: 2680 },
  { day: 'Dec 26', trips: 2876 },
];

export default function BillingOverviewPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            Billing Overview
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
            Complete view of transport billing, invoices, payments and outstanding amounts
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showDateRange={true}
          dateRangeLabel="01 Dec 2026 - 31 Dec 2026"
        />
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Total Billed"
          value="₹ 28,76,500"
          icon={<IndianRupee size={18} />}
          highlightColor="#1167EE"
        />
        <MetricCard
          label="Paid Amount"
          value="₹ 24,10,000"
          subtext="83.8% Settled"
          icon={<CheckCircle2 size={18} />}
          trend={{ value: '83.8%', isPositive: true }}
          highlightColor="#16A34A"
        />
        <MetricCard
          label="Outstanding"
          value="₹ 4,66,500"
          subtext="16.2% Balance"
          icon={<AlertCircle size={18} />}
          trend={{ value: '16.2%', isAlert: true }}
          highlightColor="#D97706"
        />
        <MetricCard
          label="Total Invoices"
          value="12"
          subtext="Current Fiscal Year"
          icon={<Receipt size={18} />}
          highlightColor="#8B5CF6"
        />
        <MetricCard
          label="Disputes"
          value="2"
          subtext="Under Review"
          icon={<Scale size={18} />}
          trend={{ value: 'Under Review', isAlert: true }}
          highlightColor="#DC2626"
        />
      </div>

      {/* Middle Grid: 6-Month Trend Line + Cost Breakdown Donut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Left: Billing Trend (Last 6 Months) */}
        <div className="surface-card" style={{ padding: '20px 24px', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Billing Trend (Last 6 Months)
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                Monthly gross transportation spend trajectory
              </p>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#1167EE',
                backgroundColor: '#EFF6FF',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #BFDBFE',
              }}
            >
              ₹ 28.76L Peak
            </span>
          </div>

          <AreaTrendChart
            data={MOCK_6_MONTHS_BILLING_TREND}
            height={210}
            lineColor="#6366F1"
            metricLabel="k"
          />
        </div>

        {/* Right: Cost Breakdown Donut */}
        <div className="surface-card" style={{ padding: '20px 24px', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                Cost Breakdown
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                Expenditure classified across roster and ad-hoc operations
              </p>
            </div>
          </div>

          <DonutChart
            totalLabel="Total Spend"
            totalValue="₹ 28.76L"
            segments={MOCK_COST_BREAKDOWN_DONUT}
            size={185}
            thickness={22}
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="surface-card" style={{ padding: '16px 20px', backgroundColor: '#FFFFFF' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
          Quick Actions
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => alert('Generating on-demand billing invoice')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#EFF6FF',
              color: '#1167EE',
              border: '1px solid #BFDBFE',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileText size={14} />
            <span>Generate Invoice</span>
          </button>

          <button
            onClick={() => alert('Exporting all billing records (.csv)')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            <span>Export Billing</span>
          </button>

          <button
            onClick={() => alert('Opening Corporate Rate Card viewer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <FileText size={14} />
            <span>View Rate Card</span>
          </button>

          <button
            onClick={() => alert('Applying credit note / adjustment')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              border: '1px solid #CBD5E1',
              borderRadius: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Scale size={14} />
            <span>Apply Credit / Adjustment</span>
          </button>
        </div>
      </div>
    </div>
  );
}

