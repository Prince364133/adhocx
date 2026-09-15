'use client';

import React, { useState, useMemo } from 'react';
import {
  PageHeader,
  MetricCard,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
} from '../../components/common';

interface SupportTicket {
  id: string;
  reporterName: string;
  reporterRole: 'DRIVER' | 'VENDOR' | 'USER';
  reporterPhone: string;
  relatedTripId?: string;
  issueType: string;
  description: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED';
  operatorNotes?: string;
  createdAt: string;
}

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'sup-901',
    reporterName: 'Vikram Malhotra',
    reporterRole: 'VENDOR',
    reporterPhone: '+91 99887 76655',
    relatedTripId: 'trp-301',
    issueType: 'ROUTE_DEVIATION',
    description: 'Driver took alternative toll route due to traffic on NH-48. Clarification requested on toll adjustment receipt.',
    status: 'UNDER_REVIEW',
    operatorNotes: 'Verified GPS telemetry: driver avoided a 45-min bottleneck. Toll receipt ₹180 matches FASTag transaction.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'sup-902',
    reporterName: 'Suresh Verma',
    reporterRole: 'DRIVER',
    reporterPhone: '+91 98990 01122',
    issueType: 'KYC_RESUBMISSION',
    description: 'Driver renewed commercial driving license and uploaded new certificate for re-verification approval.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'sup-903',
    reporterName: 'Pooja Agarwal',
    reporterRole: 'USER',
    reporterPhone: '+91 98112 33445',
    relatedTripId: 'trp-209',
    issueType: 'INVOICE_QUERY',
    description: 'Requested GST breakdown invoice copy for corporate reimbursement submission.',
    status: 'RESOLVED',
    operatorNotes: 'Auto-generated GST tax invoice sent to registered email.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const STATUS_TABS = [
  { id: 'ALL', label: 'All Tickets' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'RESOLVED', label: 'Resolved' },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (activeTab !== 'ALL' && t.status !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          t.id.toLowerCase().includes(q) ||
          t.reporterName.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.issueType.toLowerCase().includes(q) ||
          t.reporterPhone.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tickets, activeTab, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const pending = tickets.filter((t) => t.status === 'PENDING').length;
    const review = tickets.filter((t) => t.status === 'UNDER_REVIEW').length;
    const resolved = tickets.filter((t) => t.status === 'RESOLVED').length;

    return { total: tickets.length, pending, review, resolved };
  }, [tickets]);

  function handleResolve(status: 'UNDER_REVIEW' | 'RESOLVED') {
    if (!selectedTicket) return;

    setTickets((prev) =>
      prev.map((t) =>
        t.id === selectedTicket.id
          ? {
              ...t,
              status,
              operatorNotes: resolutionNotes || t.operatorNotes,
            }
          : t
      )
    );

    setAlert({
      type: 'success',
      message: `Support ticket #${selectedTicket.id} updated to ${status}.`,
    });
    setSelectedTicket(null);
    setResolutionNotes('');
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
            style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
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
          icon="🎧"
          accentColor="var(--brand-primary)"
        />
        <MetricCard
          label="Pending Triage"
          value={metrics.pending}
          subtext="Unassigned tickets"
          icon="⏳"
          accentColor="var(--color-danger)"
        />
        <MetricCard
          label="Under Investigation"
          value={metrics.review}
          subtext="Operator active handling"
          icon="🔍"
          accentColor="var(--color-warning)"
        />
        <MetricCard
          label="Resolved Cases"
          value={metrics.resolved}
          subtext="Completed interventions"
          icon="✅"
          accentColor="var(--color-success)"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        tabs={STATUS_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          count:
            t.id === 'ALL'
              ? tickets.length
              : tickets.filter((tk) => tk.status === t.id).length,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by user, phone, issue, description, ID..."
      />

      {/* Tickets DataTable */}
      <DataTable<SupportTicket>
        columns={[
          {
            header: 'TICKET ID',
            accessor: (t) => (
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.8125rem' }}>
                  #{t.id}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ),
          },
          {
            header: 'REPORTER & ROLE',
            accessor: (t) => (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {t.reporterName}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  <span style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>{t.reporterRole}</span> • {t.reporterPhone}
                </div>
              </div>
            ),
          },
          {
            header: 'ISSUE CATEGORY',
            accessor: (t) => (
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
            header: 'DESCRIPTION & CONTEXT',
            accessor: (t) => (
              <div style={{ maxWidth: '320px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {t.description}
              </div>
            ),
          },
          {
            header: 'RELATED ENTITY',
            accessor: (t) => (
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: t.relatedTripId ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                {t.relatedTripId ? `Trip #${t.relatedTripId}` : '—'}
              </span>
            ),
          },
          {
            header: 'STATUS',
            accessor: (t) => <StatusBadge status={t.status} />,
          },
          {
            header: 'ACTIONS',
            align: 'right',
            accessor: (t) => (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
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
        onRowClick={(t) => {
          setSelectedTicket(t);
          setResolutionNotes(t.operatorNotes || '');
        }}
        emptyIcon="🎧"
        emptyMessage="No support cases found for this status"
      />

      {/* Slide-out Support Ticket Drawer */}
      <Drawer
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title={selectedTicket ? `Support Ticket #${selectedTicket.id}` : 'Support Ticket'}
        subtitle={selectedTicket ? `Category: ${selectedTicket.issueType}` : ''}
        footer={
          selectedTicket ? (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
              {selectedTicket.status !== 'UNDER_REVIEW' && selectedTicket.status !== 'RESOLVED' && (
                <Button variant="outline" size="sm" onClick={() => handleResolve('UNDER_REVIEW')}>
                  Mark Under Review
                </Button>
              )}
              {selectedTicket.status !== 'RESOLVED' && (
                <Button variant="success" size="sm" onClick={() => handleResolve('RESOLVED')}>
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
                backgroundColor: 'var(--bg-card-elevated)',
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
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                User & Incident Details
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reporter Name:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedTicket.reporterName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Account Role:</span>
                <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{selectedTicket.reporterRole}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedTicket.reporterPhone}</span>
              </div>
              {selectedTicket.relatedTripId && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Related Trip:</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--brand-secondary)' }}>#{selectedTicket.relatedTripId}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Reported Incident Description
              </div>
              <p
                style={{
                  fontSize: '0.8125rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                  padding: '0.875rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {selectedTicket.description}
              </p>
            </div>

            {/* Operator Notes Form */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
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
                  backgroundColor: 'var(--bg-canvas)',
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
