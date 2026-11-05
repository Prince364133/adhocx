'use client';

import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Download,
  Building,
  Calendar,
} from 'lucide-react';
import { mockSlaMetrics } from '../../../lib/mock/corporateMockData';
import MetricCard from '../../../components/common/MetricCard';
import BarComparisonChart from '../../../components/charts/BarComparisonChart';

const weeklySlaData = [
  { day: 'W46', scheduled: 12, completed: 12 },
  { day: 'W47', scheduled: 10, completed: 10 },
  { day: 'W48', scheduled: 15, completed: 14 },
  { day: 'W49', scheduled: 11, completed: 11 },
];

export default function SlaPerformanceReportPage() {
  const [selectedOffice, setSelectedOffice] = useState('All');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            SLA Performance & Resolution Benchmarks
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Corporate service level agreement compliance, resolution turnaround times and vendor penalties
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
            <Download size={14} /> Export SLA Report
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
          label="Overall SLA Compliance"
          value={`${mockSlaMetrics.slaCompliancePct}%`}
          delta="+1.2 pp vs Target (95.0%)"
          deltaType="positive"
          icon={<CheckCircle2 size={20} />}
          category="success"
        />
        <MetricCard
          label="Avg First Response Velocity"
          value={`${mockSlaMetrics.firstResponseTimeMin} min`}
          delta="Contract SLA: < 10 min"
          deltaType="positive"
          icon={<Clock size={20} />}
          category="primary"
        />
        <MetricCard
          label="Avg Resolution Duration"
          value={`${mockSlaMetrics.avgResolutionTimeHours} hrs`}
          delta="-0.4 hr vs last month"
          deltaType="positive"
          icon={<TrendingUp size={20} />}
          category="info"
        />
        <MetricCard
          label="SLA Penalty Risk"
          value="₹0.00"
          delta="0 Eligible Contract Penalties"
          deltaType="positive"
          icon={<CheckCircle2 size={20} />}
          category="success"
        />
      </div>

      {/* SLA by Category Table */}
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
          SLA Compliance Breakdown by Incident Category
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Total Tickets</th>
                <th style={{ padding: '12px 16px' }}>Resolved Within SLA</th>
                <th style={{ padding: '12px 16px' }}>SLA Target Window</th>
                <th style={{ padding: '12px 16px' }}>Compliance Rate</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockSlaMetrics.resolutionByCategory.map((cat, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {cat.category}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {cat.total}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--corporate-blue)', fontWeight: 600 }}>
                    {cat.resolvedInSla}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {cat.category.includes('Pickup') ? '2 Hours' : cat.category.includes('Behavior') ? '24 Hours' : '4 Hours'}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: cat.pct >= 95 ? '#16A34A' : '#D97706' }}>
                    {cat.pct}%
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        backgroundColor: cat.pct >= 95 ? '#DCFCE7' : '#FEF3C7',
                        color: cat.pct >= 95 ? '#15803D' : '#B45309',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {cat.pct >= 95 ? 'Compliant' : 'Warning'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

