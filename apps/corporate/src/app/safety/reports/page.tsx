'use client';

import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Download,
  Calendar,
  Building,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { mockSafetyReportsStats } from '../../../lib/mock/corporateMockData';
import MetricCard from '../../../components/common/MetricCard';
import DonutChart from '../../../components/charts/DonutChart';
import AreaTrendChart from '../../../components/charts/AreaTrendChart';

const incidentCategoriesData = [
  { label: 'Speed & Telemetry', count: 6, pct: 43, color: '#F59E0B' },
  { label: 'Breakdowns', count: 3, pct: 21, color: '#3B82F6' },
  { label: 'Route Deviations', count: 3, pct: 21, color: '#8B5CF6' },
  { label: 'SOS Panic Triggers', count: 2, pct: 15, color: '#DC2626' },
];

const safetyTrendData = [
  { day: '08 Dec', trips: 1 },
  { day: '09 Dec', trips: 2 },
  { day: '10 Dec', trips: 4 },
  { day: '11 Dec', trips: 2 },
  { day: '12 Dec', trips: 3 },
  { day: '13 Dec', trips: 1 },
  { day: '14 Dec', trips: 1 },
];

export default function SafetyReportsPage() {
  const [selectedOffice, setSelectedOffice] = useState('All');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Safety & Compliance Reports
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Comprehensive safety audits, incident categories, response times and office-wise resolution trends
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
            <Download size={14} /> Export Audit PDF
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
          label="Total Monthly Incidents"
          value="14 Cases"
          delta="11 Closed, 2 In-Prog, 1 Escalated"
          deltaType="positive"
          icon={<ShieldCheck size={20} />}
          category="primary"
        />
        <MetricCard
          label="First Response Time"
          value="1.8 min"
          delta="Industry benchmark: 5.0 min"
          deltaType="positive"
          icon={<Clock size={20} />}
          category="success"
        />
        <MetricCard
          label="Escort Night Protocol"
          value="100% Verified"
          delta="All female commuters escorted"
          deltaType="positive"
          icon={<ShieldCheck size={20} />}
          category="success"
        />
        <MetricCard
          label="SLA Compliance Rate"
          value="98.4%"
          delta="+0.8 pp vs last month"
          deltaType="positive"
          icon={<TrendingUp size={20} />}
          category="info"
        />
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        {/* Category Breakdown Donut */}
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
              Incident Distribution by Category
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 16px 0' }}>
              Breakdown across safety alarms, mechanical breakdowns and telemetry
            </p>
          </div>
          <DonutChart
            data={incidentCategoriesData}
            centerValue={mockSafetyReportsStats.totalIncidentsMonth}
            centerLabel="Total Incidents"
            size={180}
          />
        </div>

        {/* 7-Day Safety Trend Curve */}
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
              Weekly Incident Trajectory
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 16px 0' }}>
              Daily recorded alerts over the last 7 operating days
            </p>
          </div>
          <AreaTrendChart data={safetyTrendData} height={180} strokeColor="#DC2626" />
        </div>
      </div>

      {/* Office-Wise Safety Statistics Table */}
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
          Office-Wise Safety Statistics & Resolution Rates
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Campus Site</th>
                <th style={{ padding: '12px 16px' }}>Total Incidents Logged</th>
                <th style={{ padding: '12px 16px' }}>Avg Resolution SLA</th>
                <th style={{ padding: '12px 16px' }}>Resolution Rate</th>
                <th style={{ padding: '12px 16px' }}>Escort Compliance</th>
              </tr>
            </thead>
            <tbody>
              {mockSafetyReportsStats.officeBreakdown.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.office}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--corporate-blue)' }}>
                    {item.incidents} Incidents
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    1.8 min
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: '#16A34A' }}>
                    {item.resolutionRate}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#16A34A', fontWeight: 600 }}>
                    100% Compliant
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

