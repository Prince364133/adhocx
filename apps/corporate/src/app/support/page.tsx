'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Plus,
} from 'lucide-react';
import { supportApi } from '../../lib/api/corporate';
import type { SupportTicket } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';
import MetricCard from '../../components/common/MetricCard';
import { RaiseTicketModal } from '../../components/support/RaiseTicketModal';

export default function SupportOverviewPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);

  const loadData = () => {
    setLoading(true);
    supportApi
      .list(activeTenantId, {})
      .then((data) => {
        setTickets(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn('Failed to load tickets:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [activeTenantId]);

  const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED');
  const openTickets = tickets.filter((t) => t.status === 'OPEN');
  const inProgressTickets = tickets.filter((t) => t.status === 'IN_PROGRESS');
  const slaPct = tickets.length > 0 ? ((resolvedTickets.length / tickets.length) * 100).toFixed(1) : '98.5';

  const filteredTickets = tickets.filter((tkt) => {
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
            onClick={() => setRaiseModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              backgroundColor: '#5728B2',
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
          label="Total Tickets"
          value={tickets.length.toString()}
          delta={`${resolvedTickets.length} Resolved`}
          deltaType="positive"
          icon={<LifeBuoy size={20} />}
          category="primary"
        />
        <MetricCard
          label="SLA Compliance Rate"
          value={`${slaPct}%`}
          delta="Contract Target: > 95%"
          deltaType="positive"
          icon={<TrendingUp size={20} />}
          category="success"
        />
        <MetricCard
          label="In Progress / Handling"
          value={`${inProgressTickets.length} Active`}
          delta="Assigned to ops desk"
          deltaType={inProgressTickets.length > 0 ? 'warning' : 'positive'}
          icon={<Clock size={20} />}
          category="info"
        />
        <MetricCard
          label="Open Tickets"
          value={`${openTickets.length} Pending`}
          delta={openTickets.length > 0 ? 'Awaiting triage' : 'Zero Backlog'}
          deltaType={openTickets.length > 0 ? 'warning' : 'positive'}
          icon={<AlertCircle size={20} />}
          category={openTickets.length > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Tickets Table */}
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
              Recent Support & Inquiries
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                color: 'var(--text-primary)',
              }}
            >
              <option value="All">All Categories</option>
              <option value="CAB_DELAY">Cab Delay</option>
              <option value="DRIVER_BEHAVIOR">Driver Behavior</option>
              <option value="ROUTE_ISSUE">Route Issue</option>
              <option value="BILLING">Billing</option>
              <option value="LOST_ITEM">Lost Item</option>
              <option value="VEHICLE_CONDITION">Vehicle Condition</option>
              <option value="SAFETY_CONCERN">Safety Concern</option>
              <option value="OTHER">Other Operational</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading support tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No support tickets found. Commuter queries and feedback will appear here.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-surface-muted)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }}>
                  <th style={{ padding: '12px 16px' }}>Ticket Number</th>
                  <th style={{ padding: '12px 16px' }}>Subject</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Priority</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((tkt) => (
                  <tr key={tkt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#5728B2' }}>
                      #{tkt.ticketNumber || tkt.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {tkt.subject}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                      {tkt.category ? tkt.category.replace('_', ' ') : 'General'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor:
                            tkt.priority === 'CRITICAL' || tkt.priority === 'HIGH' ? '#FEE2E2' : '#EFF6FF',
                          color:
                            tkt.priority === 'CRITICAL' || tkt.priority === 'HIGH' ? '#DC2626' : '#5728B2',
                        }}
                      >
                        {tkt.priority || 'NORMAL'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          backgroundColor:
                            tkt.status === 'RESOLVED'
                              ? '#DCFCE7'
                              : tkt.status === 'IN_PROGRESS'
                              ? '#E0E7FF'
                              : tkt.status === 'CLOSED'
                              ? '#F1F5F9'
                              : '#FEF3C7',
                          color:
                            tkt.status === 'RESOLVED'
                              ? '#16A34A'
                              : tkt.status === 'IN_PROGRESS'
                              ? '#4338CA'
                              : tkt.status === 'CLOSED'
                              ? '#475569'
                              : '#D97706',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {tkt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <Link
                        href={`/support/tickets/details?id=${tkt.id}`}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 4,
                          border: '1px solid var(--border-strong)',
                          backgroundColor: 'var(--bg-surface)',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#5728B2',
                          textDecoration: 'none',
                        }}
                      >
                        View Thread
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raise Support Ticket Modal */}
      <RaiseTicketModal
        isOpen={raiseModalOpen}
        onClose={() => setRaiseModalOpen(false)}
        tenantId={activeTenantId}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
