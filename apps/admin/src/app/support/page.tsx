'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Headphones, Clock, Search, CheckCircle2, X } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { SupportTicketItem } from '../../lib/api/types';
import {
  PageHeader,
  MetricCard,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
} from '../../components/common';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Tickets' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'RESOLVED', label: 'Resolved' },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadTickets(activeTab);
  }, [activeTab]);

  async function loadTickets(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getSupportTickets({
        status: status !== 'ALL' ? status : undefined,
      }).catch(() => [] as SupportTicketItem[]);
      setTickets(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase().trim();
    return tickets.filter((t) => {
      return (
        t.id.toLowerCase().includes(q) ||
        (t.reporterName && t.reporterName.toLowerCase().includes(q)) ||
        (t.issueType && t.issueType.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.reporterPhone && t.reporterPhone.toLowerCase().includes(q))
      );
    });
  }, [tickets, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const pending = tickets.filter((t) => t.status === 'PENDING').length;
    const review = tickets.filter((t) => t.status === 'UNDER_REVIEW').length;
    const resolved = tickets.filter((t) => t.status === 'RESOLVED').length;

    return { total: tickets.length, pending, review, resolved };
  }, [tickets]);

  async function handleResolve(status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED') {
    if (!selectedTicket) return;

    setActionLoading(true);
    try {
      await adminApi.resolveSupportTicket(selectedTicket.id, {
        status,
        notes: resolutionNotes || selectedTicket.operatorNotes || 'Processed by Administrator',
      });

      setAlert({
        type: 'success',
        message: `Support ticket #${selectedTicket.id.slice(0, 8).toUpperCase()} updated to ${status}.`,
      });
      setSelectedTicket(null);
      setResolutionNotes('');
      loadTickets(activeTab);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update support ticket' });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Alert Banner */}
      {alert && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--color-success)',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <span>{alert.message}</span>
          <button
            onClick={() => setAlert(null)}
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Operational Helpdesk & Support Interventions"
        subtitle="Resolve driver and vendor operational issues, dispute inquiries, KYC assist tickets, and manual ride interventions"
        liveStatus="Helpdesk Dispatch Online"
      />

      {/* KPI Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <MetricCard
          label="Total Support Cases"
          value={metrics.total}
          subtext="Active ticket queue"
          icon={<Headphones size={18} color="var(--brand-primary)" />}
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Pending Triage"
          value={metrics.pending}
          subtext="Unassigned tickets"
          icon={<Clock size={18} color="var(--color-danger)" />}
          accentColor="var(--color-danger)"
        />
        <MetricCard
          label="Under Investigation"
          value={metrics.review}
          subtext="Operator active handling"
          icon={<Search size={18} color="var(--color-warning)" />}
          accentColor="var(--color-warning)"
        />
        <MetricCard
          label="Resolved Cases"
          value={metrics.resolved}
          subtext="Completed interventions"
          icon={<CheckCircle2 size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        tabs={STATUS_TABS.map((t) => ({
          id: t.id,
          label: t.label,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by user, phone, issue, description, ID..."
      />

      {/* Tickets DataTable */}
      <DataTable
        columns={[
          {
            key: 'id',
            label: 'TICKET #',
            render: (t: SupportTicketItem) => (
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.8125rem' }}>
                  #{t.id.slice(0, 8).toUpperCase()}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ),
          },
          {
            key: 'reporterName',
            label: 'REPORTER & CONTACT',
            render: (t: SupportTicketItem) => (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {t.reporterName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  <span style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>{t.reporterRole}</span> • {t.reporterPhone || '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'issueType',
            label: 'ISSUE CATEGORY',
            render: (t: SupportTicketItem) => (
              <span
                style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-card-elevated)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                {t.issueType.replace('_', ' ')}
              </span>
            ),
          },
          {
            key: 'description',
            label: 'DESCRIPTION & CONTEXT',
            render: (t: SupportTicketItem) => (
              <div style={{ maxWidth: '320px' }}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.description || 'No description provided'}
                </div>
                {t.relatedTripId && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    Trip: {t.relatedTripId.slice(0, 8).toUpperCase()}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'status',
            label: 'STATUS',
            render: (t: SupportTicketItem) => <StatusBadge status={t.status} />,
          },
          {
            key: 'actions',
            label: 'ACTIONS',
            align: 'right',
            render: (t: SupportTicketItem) => (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedTicket(t);
                  setResolutionNotes(t.operatorNotes || '');
                }}
              >
                Inspect Ticket
              </Button>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(t) => t.id}
        loading={loading}
        emptyTitle="No support tickets found"
        emptySubtitle="No tickets matching this status filter."
      />

      {/* Slide-out Support Ticket Drawer */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? `Support Ticket #${selectedTicket.id.slice(0, 8).toUpperCase()}` : 'Support Ticket'}
        subtitle={selectedTicket ? `Issue: ${selectedTicket.issueType}` : ''}
        footer={
          selectedTicket ? (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
              {selectedTicket.status !== 'UNDER_REVIEW' && selectedTicket.status !== 'RESOLVED' && (
                <Button variant="secondary" size="sm" onClick={() => handleResolve('UNDER_REVIEW')} disabled={actionLoading}>
                  Mark In Review
                </Button>
              )}
              {selectedTicket.status !== 'RESOLVED' && (
                <Button variant="primary" size="sm" onClick={() => handleResolve('RESOLVED')} disabled={actionLoading}>
                  Resolve Ticket
                </Button>
              )}
            </div>
          ) : null
        }
      >
        {selectedTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Status Summary Banner */}
            <div
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticket Status</div>
                <div style={{ marginTop: '0.25rem' }}>
                  <StatusBadge status={selectedTicket.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Timestamp</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {new Date(selectedTicket.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Reporter Profile */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                Reporter Details
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Name:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedTicket.reporterName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{selectedTicket.reporterRole}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedTicket.reporterPhone || '—'}</span>
              </div>
              {selectedTicket.relatedTripId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Related Trip:</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--brand-primary)' }}>{selectedTicket.relatedTripId}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Issue Description ({selectedTicket.issueType})
              </div>
              <p
                style={{
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {selectedTicket.description || 'No description provided.'}
              </p>
            </div>

            {/* Operator Notes Form */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Operator Triage & Resolution Notes
              </div>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Log internal telemetry review, FASTag reconciliation, or action taken..."
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
