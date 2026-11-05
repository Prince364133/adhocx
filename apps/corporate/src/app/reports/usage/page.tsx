'use client';

import React, { useState } from 'react';
import {
  Users,
  Download,
  Calendar,
  Building,
  TrendingUp,
  PieChart,
  UserCheck,
} from 'lucide-react';
import { mockEmployeeUsageReport } from '../../../lib/mock/corporateMockData';
import MetricCard from '../../../components/common/MetricCard';
import DonutChart from '../../../components/charts/DonutChart';

const shiftUsageChartData = [
  { label: 'General Day (09:00 - 18:00)', count: 1246, pct: 54, color: '#5728B2' },
  { label: 'Morning A (08:00 - 17:00)', count: 684, pct: 24, color: '#38BDF8' },
  { label: 'Night Shift (22:00 - 07:00)', count: 398, pct: 16, color: '#8B5CF6' },
  { label: 'Rotating Special', count: 240, pct: 6, color: '#F59E0B' },
];

export default function EmployeeUsageReportPage() {
  const [selectedDept, setSelectedDept] = useState('All');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Employee Commute Adoption & Usage Report
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Workforce commute patterns, department participation rates, shift rosters and active passenger volume
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
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={14} /> Export Usage CSV
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
          label="Registered Workforce"
          value={mockEmployeeUsageReport.totalRegisteredEmployees.toLocaleString()}
          delta="100% HRMS Synced"
          deltaType="positive"
          icon={<Users size={20} />}
          category="primary"
        />
        <MetricCard
          label="Transport Eligible"
          value={mockEmployeeUsageReport.transportEligible.toLocaleString()}
          delta="90.2% of Total Workforce"
          deltaType="positive"
          icon={<UserCheck size={20} />}
          category="success"
        />
        <MetricCard
          label="Regular Daily Commuters"
          value={mockEmployeeUsageReport.regularDailyCommuters.toLocaleString()}
          delta="85.3% Daily Active Rate"
          deltaType="positive"
          icon={<TrendingUp size={20} />}
          category="info"
        />
        <MetricCard
          label="Occasional / Ad-hoc"
          value={mockEmployeeUsageReport.occasionalCommuters.toLocaleString()}
          delta="On-demand requests"
          deltaType="neutral"
          icon={<PieChart size={20} />}
          category="warning"
        />
      </div>

      {/* Two Column Section: Donut Shift Distribution + Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 16 }}>
        {/* Shift Distribution Donut */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
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
              Commuter Distribution by Shift
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 16px 0' }}>
              Proportion of workforce commuting across operational shifts
            </p>
          </div>
          <DonutChart
            data={shiftUsageChartData}
            centerValue={mockEmployeeUsageReport.regularDailyCommuters}
            centerLabel="Daily Commuters"
            size={180}
          />
        </div>

        {/* Department Usage Table */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
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
            Department-Wise Commuter Participation
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Department</th>
                  <th style={{ padding: '12px 16px' }}>Active Users</th>
                  <th style={{ padding: '12px 16px' }}>Monthly Trips</th>
                  <th style={{ padding: '12px 16px' }}>Utilization Rate</th>
                </tr>
              </thead>
              <tbody>
                {mockEmployeeUsageReport.departmentUsage.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {row.department}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--corporate-blue)' }}>
                      {row.activeUsers} Users
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {row.tripsMonth.toLocaleString()} Trips
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#16A34A' }}>
                      {row.utilization}
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

