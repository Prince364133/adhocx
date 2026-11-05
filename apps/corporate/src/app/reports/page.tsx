'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Leaf,
} from 'lucide-react';
import { mockTransportPerformanceReport } from '../../lib/mock/corporateMockData';
import MetricCard from '../../components/common/MetricCard';
import BarComparisonChart from '../../components/charts/BarComparisonChart';

export default function TransportPerformanceReportPage() {
  const [selectedOffice, setSelectedOffice] = useState('All');
  const [dateRange, setDateRange] = useState('Last 30 Days');

  const chartData = mockTransportPerformanceReport.dailyPerformance.map((d) => ({
    day: d.date,
    scheduled: d.scheduled,
    completed: d.completed,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Transport Performance & Commute Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Comprehensive analysis of trip completions, punctuality index, delayed routes and carbon savings
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
            <Download size={14} /> Export Performance PDF
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
          label="Total Trips Completed"
          value={mockTransportPerformanceReport.totalTripsCompleted.toLocaleString()}
          delta={`${mockTransportPerformanceReport.completionRatePct}% Completion Rate`}
          deltaType="positive"
          icon={<CheckCircle2 size={20} />}
          category="primary"
        />
        <MetricCard
          label="On-Time Arrival Rate"
          value={`${mockTransportPerformanceReport.onTimeArrivalPct}%`}
          delta="+1.9 pp vs benchmark"
          deltaType="positive"
          icon={<Clock size={20} />}
          category="success"
        />
        <MetricCard
          label="Avg Commuter Delay"
          value={`${mockTransportPerformanceReport.avgDelayMinutes} min`}
          delta="-1.4 min vs last month"
          deltaType="positive"
          icon={<TrendingUp size={20} />}
          category="info"
        />
        <MetricCard
          label="Carbon Offset Saved"
          value={`${(mockTransportPerformanceReport.carbonSavedKg / 1000).toFixed(1)} Tons COâ‚‚`}
          delta="Electric & pooled trips"
          deltaType="positive"
          icon={<Leaf size={20} />}
          category="success"
        />
      </div>

      {/* Bar Comparison Chart */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Scheduled vs Completed Commute Trips
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Daily delivery performance across all registered Hyderabad campuses
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Date Window: {mockTransportPerformanceReport.period}</span>
          </div>
        </div>

        <BarComparisonChart data={chartData} height={220} />
      </div>

      {/* Daily Performance Breakdown Table */}
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
          Daily Commute Breakdown
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Date</th>
                <th style={{ padding: '12px 16px' }}>Scheduled Trips</th>
                <th style={{ padding: '12px 16px' }}>Completed Trips</th>
                <th style={{ padding: '12px 16px' }}>On-Time Arrivals</th>
                <th style={{ padding: '12px 16px' }}>Delayed Trips</th>
                <th style={{ padding: '12px 16px' }}>Daily Punctuality</th>
              </tr>
            </thead>
            <tbody>
              {mockTransportPerformanceReport.dailyPerformance.map((row, idx) => {
                const punctuality = ((row.onTime / row.completed) * 100).toFixed(1);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {row.date} 2026
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {row.scheduled}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--corporate-blue)' }}>
                      {row.completed}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#16A34A', fontWeight: 600 }}>
                      {row.onTime}
                    </td>
                    <td style={{ padding: '14px 16px', color: row.delayed > 10 ? '#DC2626' : 'var(--text-muted)' }}>
                      {row.delayed}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#16A34A' }}>
                      {punctuality}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

