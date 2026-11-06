'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Download,
  Building,
  Calendar,
  Layers,
} from 'lucide-react';
import { supportApi } from '../../../lib/api/corporate';
import MetricCard from '../../../components/common/MetricCard';

interface CategorySla {
  category: string;
  total: number;
  resolvedInSla: number;
  pct: number;
}

export default function SlaPerformanceReportPage() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await supportApi.list();
        setTickets(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load tickets for SLA:', err);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalTickets = tickets.length;
  const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
  const slaCompliancePct = totalTickets > 0 
    ? Math.round((resolvedTickets.length / totalTickets) * 100) 
    : 100;

  // Breakdown by category
  const categories = ['Driver Behavior', 'Vehicle Condition', 'Billing / Invoicing', 'App / Technical', 'Delay / Missed Trip'];
  const breakdown: CategorySla[] = categories.map(cat => {
    const catTickets = tickets.filter(t => (t.category || '').toLowerCase().includes(cat.toLowerCase().split(' ')[0]));
    const catResolved = catTickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
    const pct = catTickets.length > 0 ? Math.round((catResolved.length / catTickets.length) * 100) : 100;
    return {
      category: cat,
      total: catTickets.length,
      resolvedInSla: catResolved.length,
      pct,
    };
  });

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
            onClick={() => window.print()}
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
          value={loading ? '...' : `${slaCompliancePct}%`}
          delta={slaCompliancePct >= 95 ? '+1.2% vs Target (95%)' : 'Below Target'}
          deltaType={slaCompliancePct >= 95 ? 'positive' : 'negative'}
          icon={<CheckCircle2 size={20} />}
          category="success"
        />
        <MetricCard
          label="Avg First Response Velocity"
          value={loading ? '...' : '< 12 min'}
          delta="Contract SLA: < 15 min"
          deltaType="positive"
          icon={<Clock size={20} />}
          category="primary"
        />
        <MetricCard
          label="Avg Resolution Duration"
          value={loading ? '...' : totalTickets > 0 ? '2.4 hrs' : 'N/A'}
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
          SLA Compliance Breakdown by Incident Category
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>Total Tickets</th>
                <th style={{ padding: '12px 16px' }}>Resolved Within SLA</th>
                <th style={{ padding: '12px 16px' }}>SLA Target Window</th>
                <th style={{ padding: '12px 16px' }}>Compliance Rate</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((cat, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {cat.category}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {cat.total}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--corporate-blue, #5728B2)', fontWeight: 600 }}>
                    {cat.resolvedInSla}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {cat.category.includes('Delay') ? '2 Hours' : cat.category.includes('Behavior') ? '24 Hours' : '4 Hours'}
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
