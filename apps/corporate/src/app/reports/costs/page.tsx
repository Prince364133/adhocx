'use client';

import React, { useState } from 'react';
import {
  DollarSign,
  TrendingDown,
  PieChart,
  Download,
  Building,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { mockCostDepartmentReport } from '../../../lib/mock/corporateMockData';
import MetricCard from '../../../components/common/MetricCard';
import DonutChart from '../../../components/charts/DonutChart';

const deptCostDonutData = [
  { label: 'Engineering', count: 1240000, pct: 43.1, color: '#1167EE' },
  { label: 'Customer Ops', count: 810000, pct: 28.2, color: '#8B5CF6' },
  { label: 'Product Team', count: 520000, pct: 18.1, color: '#38BDF8' },
  { label: 'HR & Facilities', count: 180000, pct: 6.3, color: '#16A34A' },
  { label: 'Design Studio', count: 126500, pct: 4.3, color: '#F59E0B' },
];

export default function CostDepartmentReportsPage() {
  const [dateRange, setDateRange] = useState('Month to Date');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Cost & Department Expenditure Reports
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Financial accounting, department transport cost centers, per-seat unit economics and billing audit
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Export Financial Ledger
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <MetricCard
          label="Total Transport Spend (MTD)"
          value={mockCostDepartmentReport.totalExpenditureInr}
          delta={`${mockCostDepartmentReport.budgetUtilizationPct}% of Budget Cap`}
          deltaType="positive"
          icon={<DollarSign size={20} />}
          category="primary"
        />
        <MetricCard
          label="Avg Cost / Commute Trip"
          value={`₹${mockCostDepartmentReport.avgCostPerTripInr.toFixed(2)}`}
          delta="-₹3.40 vs last month"
          deltaType="positive"
          icon={<TrendingDown size={20} />}
          category="success"
        />
        <MetricCard
          label="Monthly Spend / Employee"
          value={`₹${mockCostDepartmentReport.avgCostPerEmployeeMonthlyInr.toLocaleString()}`}
          delta="Optimized per seat"
          deltaType="positive"
          icon={<PieChart size={20} />}
          category="info"
        />
        <MetricCard
          label="Budget Variance"
          value="-11.5% Under"
          delta="Savings: ₹3.7 Lakhs"
          deltaType="positive"
          icon={<CheckCircle2 size={20} />}
          category="success"
        />
      </div>

      {/* Two-Column Grid: Donut Breakdown + Department Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 16 }}>
        {/* Cost Distribution Donut */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Department Spend Share
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 16px 0' }}>
              Proportional transport budget consumption by department
            </p>
          </div>
          <DonutChart
            data={deptCostDonutData}
            centerValue="₹28.76L"
            centerLabel="Total MTD Spend"
            size={180}
          />
        </div>

        {/* Department Cost Details Table */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            Cost-Center Ledger by Department
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Department</th>
                  <th style={{ padding: '12px 16px' }}>Actual Spend</th>
                  <th style={{ padding: '12px 16px' }}>Allocated Budget</th>
                  <th style={{ padding: '12px 16px' }}>Cost / Trip</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {mockCostDepartmentReport.costBreakdown.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {row.dept}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--corporate-blue)' }}>
                      {row.spendInr}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {row.budgetInr}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      ₹{row.perTripInr.toFixed(2)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        Under Budget
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

