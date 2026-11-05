'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Search,
  ArrowRight,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { mockSupportTickets, mockSlaMetrics } from '../../lib/mock/corporateMockData';
import MetricCard from '../../components/common/MetricCard';

export default function SupportOverviewPage() {
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filteredTickets = mockSupportTickets.filter((tkt) => {
    return categoryFilter === 'All' || tkt.category === categoryFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Support & SLA Management Overview
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Monitor commuter feedback, operational tickets, response velocity and corporate SLA metrics
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
              backgroundColor: 'var(--corporate-blue)',
              color: '#FFFFFF',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Raise Support Ticket
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
          label="Total Monthly Tickets"
          value={mockSlaMetrics.totalTicketsMonth.toString()}
          delta="41 Resolved (85.4%)"
          deltaType="positive"
          icon={<LifeBuoy size={20} />}
          category="primary"
        />
        <MetricCard
          label="SLA Compliance Rate"
          value={`${mockSlaMetrics.slaCompliancePct}%`}
          delta="Contract Target: > 95%"
          deltaType="positive"
          icon={<TrendingUp size={20} />}
          category="success"
        />
        <MetricCard
          label="First Response Time"
          value={`${mockSlaMetrics.firstResponseTimeMin} min`}
          delta="Fastest in industry"
          deltaType="positive"
          icon={<Clock size={20} />}
          category="info"
        />
        <MetricCard
          label="Overdue SLA Breaches"
          value={`${mockSlaMetrics.overdueTickets} Overdue`}
          delta="Requires immediate escalation"
          deltaType="negative"
          icon={<AlertCircle size={20} />}
          category="danger"
        />
      </div>

      {/* Ticket List Section */}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Recent Support Queue ({filteredTickets.length})
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Real-time employee requests, trip delays and service inquiries
            </p>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <option value="All">All Categories</option>
            <option value="Missed Pickup">Missed Pickup</option>
            <option value="Cab AC / Comfort">Cab AC / Comfort</option>
            <option value="Driver Behavior">Driver Behavior</option>
            <option value="App / OTP Issue">App / OTP Issue</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Ticket ID</th>
                <th style={{ padding: '12px 16px' }}>Priority</th>
                <th style={{ padding: '12px 16px' }}>Subject & Category</th>
                <th style={{ padding: '12px 16px' }}>Employee</th>
                <th style={{ padding: '12px 16px' }}>Office</th>
                <th style={{ padding: '12px 16px' }}>SLA Target</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((tkt) => (
                <tr key={tkt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: 'var(--bg-surface-hover)',
                        borderRadius: 4,
                        fontSize: 12,
                        fontFamily: 'monospace',
                      }}
                    >
                      {tkt.ticketId}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor:
                          tkt.priority === 'Critical'
                            ? '#FEE2E2'
                            : tkt.priority === 'High'
                            ? '#FFEDD5'
                            : '#EFF6FF',
                        color:
                          tkt.priority === 'Critical'
                            ? '#DC2626'
                            : tkt.priority === 'High'
                            ? '#C2410C'
                            : 'var(--corporate-blue)',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {tkt.priority}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tkt.subject}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Category: {tkt.category} â€¢ Ref: {tkt.tripReference || 'General'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{tkt.employeeName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tkt.employeeId}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {tkt.office}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: tkt.slaBreached ? '#DC2626' : 'var(--text-primary)' }}>
                      {tkt.elapsedTimeHours} / {tkt.slaTargetHours}h target
                    </div>
                    {tkt.slaBreached && (
                      <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Breached</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        backgroundColor:
                          tkt.status === 'Resolved'
                            ? '#DCFCE7'
                            : tkt.status === 'In Progress'
                            ? '#EFF6FF'
                            : tkt.status === 'Overdue'
                            ? '#FEE2E2'
                            : '#FEF3C7',
                        color:
                          tkt.status === 'Resolved'
                            ? '#15803D'
                            : tkt.status === 'In Progress'
                            ? 'var(--corporate-blue)'
                            : tkt.status === 'Overdue'
                            ? '#DC2626'
                            : '#B45309',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {tkt.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <Link
                      href="/support/tickets/details"
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--corporate-blue)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      Thread <ArrowRight size={13} />
                    </Link>
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

