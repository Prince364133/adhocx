'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AlertCircle, Search, CheckCircle2, OctagonAlert, Check, X } from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import { DisputeListItem } from '../../lib/api/types';
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
  { id: 'OPEN', label: 'Open' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'RESOLVED', label: 'Resolved' },
  { id: 'REJECTED', label: 'Rejected' },
];

export default function DisputesPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<DisputeListItem | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<'RESOLVED' | 'REJECTED'>('RESOLVED');
  const [resolutionText, setResolutionText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadDisputes(activeTab);
  }, [activeTab]);

  async function loadDisputes(status: string) {
    setLoading(true);
    try {
      const data = await adminApi.getDisputes(status).catch(() => [] as DisputeListItem[]);
      setDisputes(data);
    } finally {
      setLoading(false);
    }
  }

  // Filter disputes by search query
  const filteredDisputes = useMemo(() => {
    if (!searchQuery.trim()) return disputes;
    const q = searchQuery.toLowerCase();
    return disputes.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.tripId.toLowerCase().includes(q) ||
        d.reporterName?.toLowerCase().includes(q) ||
        d.accusedName?.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q)
    );
  }, [disputes, searchQuery]);

  // Calculate ticket metrics
  const metrics = useMemo(() => {
    const open = disputes.filter((d) => d.status === 'OPEN').length;
    const review = disputes.filter((d) => d.status === 'UNDER_REVIEW').length;
    const resolved = disputes.filter((d) => d.status === 'RESOLVED').length;
    const rejected = disputes.filter((d) => d.status === 'REJECTED').length;

    return { open, review, resolved, rejected };
  }, [disputes]);

  async function handleResolve() {
    if (!selectedDispute) return;
    if (!resolutionText.trim()) {
      setAlert({ type: 'error', message: 'Resolution justification is required.' });
      return;
    }

    setActionLoading(true);
    try {
      await adminApi.resolveDispute(selectedDispute.id, {
        status: resolutionStatus,
        resolutionText,
      });

      setAlert({
        type: 'success',
        message: `Dispute ticket #${selectedDispute.id} marked as ${resolutionStatus}. Both parties notified.`,
      });

      setSelectedDispute(null);
      setResolutionText('');
      loadDisputes(activeTab);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update dispute' });
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
            background: alert.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${alert.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: alert.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
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
        title="Disputes & Escalation Arbitration"
        subtitle="Investigate conflict tickets, toll disagreements, route deviations, and driver-customer escalations"
        liveStatus="Arbitration Desk Active"
      />

      {/* Dispute KPI Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <MetricCard
          label="Open Tickets"
          value={metrics.open}
          subtext="Requires immediate investigation"
          icon={<AlertCircle size={18} color="var(--color-danger)" />}
          accentColor="var(--color-danger)"
        />
        <MetricCard
          label="Under Review"
          value={metrics.review}
          subtext="Telemetry & receipt audit"
          icon={<Search size={18} color="var(--color-warning)" />}
          accentColor="var(--color-warning)"
        />
        <MetricCard
          label="Resolved Cases"
          value={metrics.resolved}
          subtext="Settled or refunded"
          icon={<CheckCircle2 size={18} color="var(--color-success)" />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Dismissed / Rejected"
          value={metrics.rejected}
          subtext="Unsubstantiated claims"
          icon={<OctagonAlert size={18} color="var(--text-muted)" />}
          accentColor="var(--text-muted)"
        />
      </div>

      {/* Filter Bar */}
      <FilterBar
        tabs={STATUS_TABS.map((t) => ({
          id: t.id,
          label: t.label,
          count:
            t.id === 'ALL'
              ? disputes.length
              : disputes.filter((d) => d.status === t.id).length,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by ticket ID, trip, parties, or reason..."
      />

      {/* Disputes DataTable */}
      <DataTable
        columns={[
          {
            header: 'TICKET & TRIP ID',
            accessor: (d) => (
              <div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-primary)', fontSize: '0.8125rem' }}>
                  #{d.id}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--brand-secondary)', marginTop: '0.2rem' }}>
                  Trip: {d.tripId}
                </div>
              </div>
            ),
          },
          {
            header: 'PARTIES INVOLVED',
            accessor: (d) => (
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {d.reporterName || d.reporterId}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                  vs. <span style={{ color: 'var(--text-secondary)' }}>{d.accusedName || d.accusedId}</span>
                </div>
              </div>
            ),
          },
          {
            header: 'REASON & STATEMENT',
            accessor: (d) => (
              <div style={{ maxWidth: '320px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                  {d.reason}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.2rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {d.description || 'No description provided'}
                </div>
              </div>
            ),
          },
          {
            header: 'STATUS',
            accessor: (d) => <StatusBadge status={d.status} />,
          },
          {
            header: 'DATE FILED',
            accessor: (d) => (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {new Date(d.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            ),
          },
          {
            header: 'ACTIONS',
            align: 'right',
            accessor: (d) => (
              <Button
                variant={d.status === 'OPEN' || d.status === 'UNDER_REVIEW' ? 'primary' : 'outline'}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDispute(d);
                  setResolutionText(d.resolutionText || '');
                  setResolutionStatus(d.status === 'REJECTED' ? 'REJECTED' : 'RESOLVED');
                }}
              >
                {d.status === 'OPEN' || d.status === 'UNDER_REVIEW' ? 'Arbitrate →' : 'View Findings'}
              </Button>
            ),
          },
        ]}
        data={filteredDisputes}
        keyExtractor={(d) => d.id}
        loading={loading}
        onRowClick={(d) => {
          setSelectedDispute(d);
          setResolutionText(d.resolutionText || '');
          setResolutionStatus(d.status === 'REJECTED' ? 'REJECTED' : 'RESOLVED');
        }}
        emptyTitle="No dispute tickets found"
        emptySubtitle="No dispute tickets found matching this filter criteria."
      />

      {/* Slide-out Arbitration Drawer */}
      <Drawer
        isOpen={!!selectedDispute}
        onClose={() => setSelectedDispute(null)}
        title={selectedDispute ? `Dispute Ticket #${selectedDispute.id}` : 'Dispute Arbitration'}
        subtitle={selectedDispute ? `Trip Reference: ${selectedDispute.tripId}` : ''}
        footer={
          selectedDispute && (selectedDispute.status === 'OPEN' || selectedDispute.status === 'UNDER_REVIEW') ? (
            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDispute(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleResolve}
                loading={actionLoading}
              >
                Submit Arbitration Finding
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedDispute(null)}
            >
              Close Ticket
            </Button>
          )
        }
      >
        {selectedDispute && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Status Overview */}
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
                  <StatusBadge status={selectedDispute.status} />
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Filed Date</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  {new Date(selectedDispute.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Parties Card */}
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
                Conflict Counterparties
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Filing Reporter:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedDispute.reporterName || selectedDispute.reporterId}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Accused Counterparty:</span>
                <span style={{ fontWeight: 600, color: 'var(--brand-secondary)' }}>
                  {selectedDispute.accusedName || selectedDispute.accusedId}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trip Reference:</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--brand-primary)' }}>
                  {selectedDispute.tripId}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Claim Category:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                  {selectedDispute.reason}
                </span>
              </div>
            </div>

            {/* Reporter Statement */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Complainant's Written Statement
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
                {selectedDispute.description || 'No formal written explanation provided.'}
              </p>
            </div>

            {/* Resolution Form or Findings */}
            {selectedDispute.status === 'OPEN' || selectedDispute.status === 'UNDER_REVIEW' ? (
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                }}
              >
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  Execute Official Arbitration Decision
                </h4>

                {/* Outcome Toggle */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('RESOLVED')}
                    style={{
                      padding: '0.625rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border:
                        resolutionStatus === 'RESOLVED'
                          ? '1px solid var(--color-success)'
                          : '1px solid var(--border-subtle)',
                      backgroundColor:
                        resolutionStatus === 'RESOLVED'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'transparent',
                      color:
                        resolutionStatus === 'RESOLVED'
                          ? 'var(--color-success)'
                          : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Check size={14} /> Accept & Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('REJECTED')}
                    style={{
                      padding: '0.625rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border:
                        resolutionStatus === 'REJECTED'
                          ? '1px solid var(--color-danger)'
                          : '1px solid var(--border-subtle)',
                      backgroundColor:
                        resolutionStatus === 'REJECTED'
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'transparent',
                      color:
                        resolutionStatus === 'REJECTED'
                          ? 'var(--color-danger)'
                          : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <X size={14} /> Dismiss / Reject Claim
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--text-primary)' }}>
                    Findings & Action Plan *
                  </label>
                  <textarea
                    rows={4}
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Document telemetry cross-checks, route review, or any refund/credit issued..."
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
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                    This finding will be permanently audited and sent to both parties in their incident logs.
                  </p>
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Arbitrator's Recorded Findings
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
                  {selectedDispute.resolutionText || 'Case marked closed.'}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
