'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Headphones,
  Clock,
  Search,
  CheckCircle2,
  Building2,
  User,
  Car,
  MessageSquare,
  Send,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  SupportTicketItem,
  CorporateSupportTicket,
  CorporateTicketMessage,
  CorporateTicketStatus,
} from '../../lib/api/types';
import {
  PageHeader,
  KpiStrip,
  SegmentedTabs,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
  FeedbackBanner,
  ConfirmDialog,
} from '../../components/common';

const DESK_TABS = [
  { id: 'CORPORATE_ETS', label: 'Corporate ETS Support' },
  { id: 'ON_DEMAND', label: 'On-Demand Helpdesk & Disputes' },
];

const CORP_STATUS_TABS = [
  { id: 'ALL', label: 'All Tickets' },
  { id: 'OPEN', label: 'Open' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'RESOLVED', label: 'Resolved' },
  { id: 'CLOSED', label: 'Closed' },
];

const ON_DEMAND_STATUS_TABS = [
  { id: 'ALL', label: 'All Tickets' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'UNDER_REVIEW', label: 'Under Review' },
  { id: 'RESOLVED', label: 'Resolved' },
];

export default function SupportPage() {
  const [activeDesk, setActiveDesk] = useState<'CORPORATE_ETS' | 'ON_DEMAND'>('CORPORATE_ETS');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Corporate ETS State
  // ---------------------------------------------------------------------------
  const [corpTickets, setCorpTickets] = useState<CorporateSupportTicket[]>([]);
  const [corpLoading, setCorpLoading] = useState(true);
  const [corpActiveTab, setCorpActiveTab] = useState('ALL');
  const [corpSearchQuery, setCorpSearchQuery] = useState('');
  const [selectedCorpTicket, setSelectedCorpTicket] = useState<CorporateSupportTicket | null>(null);

  // Corporate message thread state
  const [corpMessages, setCorpMessages] = useState<CorporateTicketMessage[]>([]);
  const [corpMessagesLoading, setCorpMessagesLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Corporate status update state
  const [corpStatusNote, setCorpStatusNote] = useState('');
  const [corpTargetStatus, setCorpTargetStatus] = useState<CorporateTicketStatus>('IN_PROGRESS');
  const [corpStatusLoading, setCorpStatusLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // On-Demand Helpdesk State (Preserving existing functionality)
  // ---------------------------------------------------------------------------
  const [onDemandTickets, setOnDemandTickets] = useState<SupportTicketItem[]>([]);
  const [onDemandLoading, setOnDemandLoading] = useState(false);
  const [onDemandActiveTab, setOnDemandActiveTab] = useState('ALL');
  const [onDemandSearchQuery, setOnDemandSearchQuery] = useState('');
  const [selectedOnDemandTicket, setSelectedOnDemandTicket] = useState<SupportTicketItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [onDemandActionLoading, setOnDemandActionLoading] = useState(false);
  const [confirmResolveOpen, setConfirmResolveOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Corporate ETS Handlers
  // ---------------------------------------------------------------------------
  const loadCorpTickets = useCallback(async (status?: string) => {
    setCorpLoading(true);
    try {
      const data = await adminApi.listCorporateSupportTickets({
        status: status && status !== 'ALL' ? (status as CorporateTicketStatus) : undefined,
        limit: 100,
      }).catch(() => [] as CorporateSupportTicket[]);
      setCorpTickets(Array.isArray(data) ? data : []);
    } finally {
      setCorpLoading(false);
    }
  }, []);

  const loadCorpMessages = useCallback(async (ticketId: string) => {
    setCorpMessagesLoading(true);
    try {
      const msgs = await adminApi.listCorporateTicketMessages(ticketId).catch(() => [] as CorporateTicketMessage[]);
      setCorpMessages(Array.isArray(msgs) ? msgs : []);
    } finally {
      setCorpMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeDesk === 'CORPORATE_ETS') {
      loadCorpTickets(corpActiveTab);
    } else {
      loadOnDemandTickets(onDemandActiveTab);
    }
  }, [activeDesk, corpActiveTab, onDemandActiveTab, loadCorpTickets]);

  const handleSelectCorpTicket = (ticket: CorporateSupportTicket) => {
    setSelectedCorpTicket(ticket);
    setCorpStatusNote(ticket.resolutionNotes || ticket.adminNotes || '');
    setCorpTargetStatus(
      ticket.status === 'OPEN'
        ? 'IN_PROGRESS'
        : ticket.status === 'IN_PROGRESS'
        ? 'RESOLVED'
        : ticket.status === 'RESOLVED'
        ? 'CLOSED'
        : 'IN_PROGRESS',
    );
    setReplyMessage('');
    setIsInternalReply(false);
    loadCorpMessages(ticket.id);
  };

  const handleSendCorpReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCorpTicket || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const newMsg = await adminApi.sendCorporateTicketMessage(selectedCorpTicket.id, {
        message: replyMessage.trim(),
        isInternal: isInternalReply,
      });
      setCorpMessages((prev) => [...prev, newMsg]);
      setReplyMessage('');
      setAlert({
        type: 'success',
        message: isInternalReply
          ? 'Internal ops note recorded.'
          : 'Reply sent. Visible in Corporate Portal.',
      });
      loadCorpTickets(corpActiveTab);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to send reply' });
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateCorpStatus = async (status: CorporateTicketStatus, customNote?: string) => {
    if (!selectedCorpTicket) return;

    setCorpStatusLoading(true);
    try {
      const noteToSend = customNote !== undefined ? customNote : corpStatusNote;
      const updated = await adminApi.updateCorporateSupportTicketStatus(
        selectedCorpTicket.id,
        status,
        noteToSend.trim() || undefined,
      );
      setSelectedCorpTicket(updated);
      setAlert({
        type: 'success',
        message: `Corporate support ticket #${updated.ticketNumber || updated.id.slice(0, 8).toUpperCase()} updated to ${status}.`,
      });
      loadCorpTickets(corpActiveTab);
      loadCorpMessages(updated.id);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update ticket status' });
    } finally {
      setCorpStatusLoading(false);
    }
  };

  // Filtered Corporate Tickets
  const filteredCorp = useMemo(() => {
    if (!corpSearchQuery.trim()) return corpTickets;
    const q = corpSearchQuery.toLowerCase().trim();
    return corpTickets.filter((t) => {
      return (
        t.id.toLowerCase().includes(q) ||
        (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.tenant?.name && t.tenant.name.toLowerCase().includes(q)) ||
        (t.tenant?.code && t.tenant.code.toLowerCase().includes(q)) ||
        (t.employee?.fullName && t.employee.fullName.toLowerCase().includes(q)) ||
        (t.employee?.employeeCode && t.employee.employeeCode.toLowerCase().includes(q)) ||
        (t.employee?.phone && t.employee.phone.toLowerCase().includes(q)) ||
        (t.employee?.phoneNumber && t.employee.phoneNumber.toLowerCase().includes(q)) ||
        (t.driver?.name && t.driver.name.toLowerCase().includes(q)) ||
        (t.driver?.phone && t.driver.phone.toLowerCase().includes(q)) ||
        (t.routeId && t.routeId.toLowerCase().includes(q))
      );
    });
  }, [corpTickets, corpSearchQuery]);

  // Corporate Metrics
  const corpMetrics = useMemo(() => {
    const open = corpTickets.filter((t) => t.status === 'OPEN').length;
    const inProgress = corpTickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const resolved = corpTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
    return { total: corpTickets.length, open, inProgress, resolved };
  }, [corpTickets]);

  // ---------------------------------------------------------------------------
  // On-Demand Handlers
  // ---------------------------------------------------------------------------
  async function loadOnDemandTickets(status: string) {
    setOnDemandLoading(true);
    try {
      const data = await adminApi.getSupportTickets({
        status: status !== 'ALL' ? status : undefined,
      }).catch(() => [] as SupportTicketItem[]);
      setOnDemandTickets(Array.isArray(data) ? data : []);
    } finally {
      setOnDemandLoading(false);
    }
  }

  const filteredOnDemand = useMemo(() => {
    if (!onDemandSearchQuery.trim()) return onDemandTickets;
    const q = onDemandSearchQuery.toLowerCase().trim();
    return onDemandTickets.filter((t) => {
      return (
        t.id.toLowerCase().includes(q) ||
        (t.reporterName && t.reporterName.toLowerCase().includes(q)) ||
        (t.issueType && t.issueType.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.reporterPhone && t.reporterPhone.toLowerCase().includes(q))
      );
    });
  }, [onDemandTickets, onDemandSearchQuery]);

  const onDemandMetrics = useMemo(() => {
    const pending = onDemandTickets.filter((t) => t.status === 'PENDING').length;
    const review = onDemandTickets.filter((t) => t.status === 'UNDER_REVIEW').length;
    const resolved = onDemandTickets.filter((t) => t.status === 'RESOLVED').length;
    return { total: onDemandTickets.length, pending, review, resolved };
  }, [onDemandTickets]);

  async function handleResolveOnDemand(status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED') {
    if (!selectedOnDemandTicket) return;

    setOnDemandActionLoading(true);
    try {
      await adminApi.resolveSupportTicket(selectedOnDemandTicket.id, {
        status,
        notes: resolutionNotes || selectedOnDemandTicket.operatorNotes || 'Processed by Administrator',
      });

      setAlert({
        type: 'success',
        message: `Support ticket #${selectedOnDemandTicket.id.slice(0, 8).toUpperCase()} updated to ${status}.`,
      });
      setConfirmResolveOpen(false);
      setSelectedOnDemandTicket(null);
      setResolutionNotes('');
      loadOnDemandTickets(onDemandActiveTab);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.message || 'Failed to update support ticket' });
    } finally {
      setOnDemandActionLoading(false);
    }
  }

  return (
    <div className="admin-page">
      {/* Alert Banner */}
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Support & Operational Helpdesk"
        subtitle="Unified resolution platform for Corporate ETS SLAs, commuter complaints, driver dispatch escalations, and ride disputes"
        liveStatus="Helpdesk Dispatch Online"
      />

      {/* Primary Module Tabs */}
      <SegmentedTabs
        tabs={DESK_TABS}
        activeTab={activeDesk}
        onChange={(tab) => setActiveDesk(tab as 'CORPORATE_ETS' | 'ON_DEMAND')}
      />

      {activeDesk === 'CORPORATE_ETS' ? (
        <>
          {/* Corporate ETS KPI Metrics */}
          <KpiStrip
            columns={4}
            items={[
              {
                id: 'total',
                label: 'Corporate Tickets',
                value: corpMetrics.total,
                subtext: 'Active ETS support queue',
                icon: <Headphones size={16} color="var(--brand-primary)" />,
                tone: 'indigo',
              },
              {
                id: 'open',
                label: 'Open / Triage Pending',
                value: corpMetrics.open,
                subtext: 'Awaiting operator response',
                icon: <Clock size={16} color="var(--color-danger)" />,
                tone: 'danger',
              },
              {
                id: 'in_progress',
                label: 'Under Investigation',
                value: corpMetrics.inProgress,
                subtext: 'Active resolution & driver inquiry',
                icon: <Search size={16} color="var(--color-warning)" />,
                tone: 'warning',
              },
              {
                id: 'resolved',
                label: 'Resolved / Closed Cases',
                value: corpMetrics.resolved,
                subtext: 'Completed interventions',
                icon: <CheckCircle2 size={16} color="var(--color-success)" />,
                tone: 'success',
              },
            ]}
          />

          {/* Corporate ETS Filter Bar */}
          <FilterBar
            tabs={CORP_STATUS_TABS.map((t) => ({
              id: t.id,
              label: t.label,
            }))}
            activeTab={corpActiveTab}
            onTabChange={setCorpActiveTab}
            search={corpSearchQuery}
            onSearchChange={setCorpSearchQuery}
            searchPlaceholder="Search by ticket #, company, employee, driver, category..."
          />

          {/* Corporate ETS DataTable */}
          <DataTable
            columns={[
              {
                key: 'id',
                label: 'TICKET # & SLA',
                render: (t: CorporateSupportTicket) => (
                  <div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#5728B2', fontSize: '0.8125rem' }}>
                      #{t.ticketNumber || t.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {new Date(t.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div style={{ display: 'inline-block', marginTop: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: '#4338CA', backgroundColor: '#EEF2FF', padding: '1px 6px', borderRadius: 4 }}>
                      SLA: {t.slaMinutes}m
                    </div>
                  </div>
                ),
              },
              {
                key: 'tenant',
                label: 'CORPORATE CLIENT',
                render: (t: CorporateSupportTicket) => (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                      {t.tenant?.name || 'Corporate Client'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      Code: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{t.tenant?.code || '—'}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: 'employee',
                label: 'COMMUTER / EMPLOYEE',
                render: (t: CorporateSupportTicket) => (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                      {t.employee?.fullName || 'Employee'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                      {t.employee?.phoneNumber || t.employee?.phone || '—'}
                      {t.employee?.employeeCode && (
                        <span style={{ marginLeft: 6, color: 'var(--brand-primary)', fontWeight: 500 }}>
                          ({t.employee.employeeCode})
                        </span>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'driver',
                label: 'DRIVER & ROUTE',
                render: (t: CorporateSupportTicket) => (
                  <div style={{ fontSize: '0.75rem' }}>
                    {t.driver ? (
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.driver.name}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{t.driver.phone || t.driver.licenseNumber || 'Assigned Driver'}</div>
                        {t.driver.vehiclePlate && (
                          <div style={{ fontFamily: 'monospace', color: '#5728B2', fontWeight: 700 }}>
                            {t.driver.vehiclePlate}
                          </div>
                        )}
                      </div>
                    ) : t.routeId ? (
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Route Linked:</span>
                        <div style={{ fontFamily: 'monospace', color: 'var(--brand-primary)', fontWeight: 600 }}>
                          {t.routeId.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Direct Portal Issue</span>
                    )}
                  </div>
                ),
              },
              {
                key: 'issue',
                label: 'CATEGORY & SUMMARY',
                render: (t: CorporateSupportTicket) => (
                  <div style={{ maxWidth: '280px' }}>
                    <div style={{ marginBottom: '0.25rem' }}>
                      <span
                        style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-card-elevated)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          color: '#475569',
                          textTransform: 'uppercase',
                        }}
                      >
                        {t.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.subject}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '0.1rem' }}>
                      {t.description}
                    </div>
                  </div>
                ),
              },
              {
                key: 'priority',
                label: 'PRIORITY',
                render: (t: CorporateSupportTicket) => {
                  const p = (t.priority || 'MEDIUM').toUpperCase();
                  const isHigh = p === 'CRITICAL' || p === 'HIGH';
                  return (
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 4,
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        backgroundColor: isHigh ? '#FEE2E2' : '#EFF6FF',
                        color: isHigh ? '#DC2626' : '#4338CA',
                        border: `1px solid ${isHigh ? '#FECACA' : '#DBEAFE'}`,
                      }}
                    >
                      {p}
                    </span>
                  );
                },
              },
              {
                key: 'status',
                label: 'STATUS',
                render: (t: CorporateSupportTicket) => <StatusBadge status={t.status} />,
              },
              {
                key: 'actions',
                label: 'ACTIONS',
                align: 'right',
                render: (t: CorporateSupportTicket) => (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSelectCorpTicket(t)}
                  >
                    Manage & Chat
                  </Button>
                ),
              },
            ]}
            data={filteredCorp}
            keyExtractor={(t) => t.id}
            loading={corpLoading}
            emptyTitle="No corporate support tickets found"
            emptySubtitle="No tickets matching this status filter or search term."
          />

          {/* Corporate Support Ticket Slide-out Drawer */}
          <Drawer
            isOpen={!!selectedCorpTicket}
            onClose={() => setSelectedCorpTicket(null)}
            title={selectedCorpTicket ? `Support Ticket #${selectedCorpTicket.ticketNumber || selectedCorpTicket.id.slice(0, 8).toUpperCase()}` : 'Support Ticket'}
            subtitle={selectedCorpTicket ? `Category: ${selectedCorpTicket.category.replace(/_/g, ' ')} · Priority: ${selectedCorpTicket.priority}` : ''}
            footer={
              selectedCorpTicket ? (
                <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedCorpTicket(null)}>
                    Close
                  </Button>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedCorpTicket.status === 'OPEN' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={corpStatusLoading}
                        onClick={() => handleUpdateCorpStatus('IN_PROGRESS')}
                      >
                        Start Investigation
                      </Button>
                    )}
                    {selectedCorpTicket.status !== 'RESOLVED' && selectedCorpTicket.status !== 'CLOSED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={corpStatusLoading}
                        onClick={() => handleUpdateCorpStatus('RESOLVED')}
                      >
                        Resolve Ticket
                      </Button>
                    )}
                    {selectedCorpTicket.status === 'RESOLVED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={corpStatusLoading}
                        onClick={() => handleUpdateCorpStatus('CLOSED')}
                      >
                        Close Ticket
                      </Button>
                    )}
                    {(selectedCorpTicket.status === 'RESOLVED' || selectedCorpTicket.status === 'CLOSED') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={corpStatusLoading}
                        onClick={() => handleUpdateCorpStatus('IN_PROGRESS', 'Reopened by Admin Operator')}
                      >
                        <RotateCcw size={13} style={{ marginRight: 4 }} /> Reopen
                      </Button>
                    )}
                  </div>
                </div>
              ) : null
            }
          >
            {selectedCorpTicket && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Status Summary & Quick Status Switcher */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Lifecycle Status</div>
                      <div style={{ marginTop: '0.25rem' }}>
                        <StatusBadge status={selectedCorpTicket.status} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created At & SLA</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '0.25rem', fontWeight: 600 }}>
                        {new Date(selectedCorpTicket.createdAt).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#4338CA', fontWeight: 600 }}>
                        SLA Window: {selectedCorpTicket.slaMinutes} mins
                      </div>
                    </div>
                  </div>

                  {/* Operator Status Changer */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                      Update Ticket Status & Notes:
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as CorporateTicketStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setCorpTargetStatus(st)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 4,
                            border: corpTargetStatus === st ? '2px solid #5728B2' : '1px solid var(--border-color)',
                            backgroundColor: corpTargetStatus === st ? '#F5F3FF' : 'var(--bg-surface)',
                            color: corpTargetStatus === st ? '#5728B2' : 'var(--text-secondary)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {st.replace(/_/g, ' ')}
                        </button>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={corpStatusLoading || corpTargetStatus === selectedCorpTicket.status}
                        onClick={() => handleUpdateCorpStatus(corpTargetStatus)}
                      >
                        {corpStatusLoading ? 'Saving...' : 'Apply Status'}
                      </Button>
                    </div>
                    <input
                      type="text"
                      value={corpStatusNote}
                      onChange={(e) => setCorpStatusNote(e.target.value)}
                      placeholder="Add status change remark or operator notes..."
                      style={{
                        width: '100%',
                        marginTop: '0.5rem',
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '0.75rem',
                      }}
                    />
                  </div>
                </div>

                {/* Information Cards: Company, Employee, Driver */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Company Info */}
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#5728B2', marginBottom: '0.5rem' }}>
                      <Building2 size={14} /> Corporate Account
                    </div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedCorpTicket.tenant?.name || 'Corporate Client'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Code: <span style={{ fontFamily: 'monospace' }}>{selectedCorpTicket.tenant?.code || '—'}</span>
                    </div>
                  </div>

                  {/* Employee Info */}
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#4338CA', marginBottom: '0.5rem' }}>
                      <User size={14} /> Affected Employee
                    </div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedCorpTicket.employee?.fullName || 'Employee'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Phone: <span style={{ fontFamily: 'monospace' }}>{selectedCorpTicket.employee?.phoneNumber || selectedCorpTicket.employee?.phone || '—'}</span>
                    </div>
                    {selectedCorpTicket.employee?.email && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {selectedCorpTicket.employee.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Driver / Route Information */}
                {(selectedCorpTicket.driver || selectedCorpTicket.routeId) && (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#047857', marginBottom: '0.5rem' }}>
                      <Car size={14} /> Driver & Vehicle Telemetry
                    </div>
                    {selectedCorpTicket.driver ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                        <div>
                          <span style={{ color: 'var(--text-muted)' }}>Driver:</span>{' '}
                          <strong>{selectedCorpTicket.driver.name}</strong>
                          {selectedCorpTicket.driver.phone && <span> ({selectedCorpTicket.driver.phone})</span>}
                        </div>
                        {selectedCorpTicket.driver.vehiclePlate && (
                          <div>
                            <span style={{ color: 'var(--text-muted)' }}>Vehicle:</span>{' '}
                            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{selectedCorpTicket.driver.vehiclePlate}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                        Linked Route ID: <span style={{ fontFamily: 'monospace', color: 'var(--brand-primary)' }}>{selectedCorpTicket.routeId}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Original Issue Description */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Issue Reported
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {selectedCorpTicket.subject}
                  </div>
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      lineHeight: 1.5,
                      color: 'var(--text-secondary)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {selectedCorpTicket.description || 'No description provided.'}
                  </p>
                </div>

                {/* Resolution Summary (If present) */}
                {selectedCorpTicket.resolutionNotes && (
                  <div
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#166534' }}>
                      <CheckCircle2 size={15} color="#16A34A" /> Official Resolution Notes
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#14532D', lineHeight: 1.5 }}>
                      {selectedCorpTicket.resolutionNotes}
                    </div>
                    {selectedCorpTicket.resolvedAt && (
                      <div style={{ fontSize: '0.75rem', color: '#16A34A', marginTop: 4 }}>
                        Resolved at: {new Date(selectedCorpTicket.resolvedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Two-Way Message Conversation Thread */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <MessageSquare size={15} color="#5728B2" /> Conversation History ({corpMessages.length})
                    </div>
                    <button
                      type="button"
                      onClick={() => loadCorpMessages(selectedCorpTicket.id)}
                      disabled={corpMessagesLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: '0.75rem',
                      }}
                    >
                      <RefreshCw size={12} style={{ animation: corpMessagesLoading ? 'spin 1s linear infinite' : undefined }} /> Refresh
                    </button>
                  </div>

                  {/* Messages Stream */}
                  <div
                    style={{
                      maxHeight: '260px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.625rem',
                      padding: '0.5rem',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {corpMessagesLoading && corpMessages.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Loading message history...
                      </div>
                    ) : corpMessages.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        No messages recorded yet. Reply below to communicate with the company, driver, or employee.
                      </div>
                    ) : (
                      corpMessages.map((m) => {
                        const isPlatformStaff = m.senderRole === 'ADMIN' || m.senderRole === 'OPS';
                        const isInternal = Boolean(m.isInternal);

                        return (
                          <div
                            key={m.id}
                            style={{
                              padding: '0.625rem 0.875rem',
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isInternal
                                ? '#FEF3C7'
                                : isPlatformStaff
                                ? '#EEF2FF'
                                : 'var(--bg-surface-elevated)',
                              border: `1px solid ${
                                isInternal
                                  ? '#FCD34D'
                                  : isPlatformStaff
                                  ? '#C7D2FE'
                                  : 'var(--border-subtle)'
                              }`,
                              marginLeft: isPlatformStaff ? '1rem' : 0,
                              marginRight: isPlatformStaff ? 0 : '1rem',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isPlatformStaff ? '#4338CA' : 'var(--text-primary)' }}>
                                {m.senderName || (isPlatformStaff ? 'AdhocX Support Desk' : 'Client User')}
                                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginLeft: 6 }}>
                                  ({m.senderRole})
                                </span>
                                {isInternal && (
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      padding: '1px 5px',
                                      backgroundColor: '#F59E0B',
                                      color: '#FFFFFF',
                                      borderRadius: 3,
                                      fontSize: '0.625rem',
                                      fontWeight: 800,
                                    }}
                                  >
                                    INTERNAL NOTE
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                              {m.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendCorpReply} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <textarea
                      rows={3}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type a response to the company, employee, or driver..."
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isInternalReply}
                          onChange={(e) => setIsInternalReply(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        Internal ops note only (hidden from Corporate Portal)
                      </label>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={sendingReply || !replyMessage.trim()}
                      >
                        <Send size={13} style={{ marginRight: 4 }} />
                        {sendingReply ? 'Sending...' : 'Send Reply'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </Drawer>
        </>
      ) : (
        <>
          {/* On-Demand KPI Metrics */}
          <KpiStrip
            columns={4}
            items={[
              {
                id: 'total',
                label: 'Total Support Cases',
                value: onDemandMetrics.total,
                subtext: 'Active ticket queue',
                icon: <Headphones size={16} color="var(--brand-primary)" />,
                tone: 'indigo',
              },
              {
                id: 'pending',
                label: 'Pending Triage',
                value: onDemandMetrics.pending,
                subtext: 'Unassigned tickets',
                icon: <Clock size={16} color="var(--color-danger)" />,
                tone: 'danger',
              },
              {
                id: 'review',
                label: 'Under Investigation',
                value: onDemandMetrics.review,
                subtext: 'Operator active handling',
                icon: <Search size={16} color="var(--color-warning)" />,
                tone: 'warning',
              },
              {
                id: 'resolved',
                label: 'Resolved Cases',
                value: onDemandMetrics.resolved,
                subtext: 'Completed interventions',
                icon: <CheckCircle2 size={16} color="var(--color-success)" />,
                tone: 'success',
              },
            ]}
          />

          {/* On-Demand Filter Bar */}
          <FilterBar
            tabs={ON_DEMAND_STATUS_TABS.map((t) => ({
              id: t.id,
              label: t.label,
            }))}
            activeTab={onDemandActiveTab}
            onTabChange={setOnDemandActiveTab}
            search={onDemandSearchQuery}
            onSearchChange={setOnDemandSearchQuery}
            searchPlaceholder="Search by user, phone, issue, description, ID..."
          />

          {/* On-Demand Tickets DataTable */}
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
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
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
                    {t.issueType.replace(/_/g, ' ')}
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
                      setSelectedOnDemandTicket(t);
                      setResolutionNotes(t.operatorNotes || '');
                    }}
                  >
                    Inspect Ticket
                  </Button>
                ),
              },
            ]}
            data={filteredOnDemand}
            keyExtractor={(t) => t.id}
            loading={onDemandLoading}
            emptyTitle="No support tickets found"
            emptySubtitle="No tickets matching this status filter."
          />

          {/* On-Demand Support Ticket Drawer */}
          <Drawer
            isOpen={!!selectedOnDemandTicket}
            onClose={() => setSelectedOnDemandTicket(null)}
            title={selectedOnDemandTicket ? `Support Ticket #${selectedOnDemandTicket.id.slice(0, 8).toUpperCase()}` : 'Support Ticket'}
            subtitle={selectedOnDemandTicket ? `Issue: ${selectedOnDemandTicket.issueType}` : ''}
            footer={
              selectedOnDemandTicket ? (
                <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'flex-end' }}>
                  <Button variant="secondary" size="sm" onClick={() => setSelectedOnDemandTicket(null)}>
                    Close
                  </Button>
                  {selectedOnDemandTicket.status !== 'UNDER_REVIEW' && selectedOnDemandTicket.status !== 'RESOLVED' && (
                    <Button variant="secondary" size="sm" onClick={() => handleResolveOnDemand('UNDER_REVIEW')} disabled={onDemandActionLoading}>
                      Mark In Review
                    </Button>
                  )}
                  {selectedOnDemandTicket.status !== 'RESOLVED' && (
                    <Button variant="primary" size="sm" onClick={() => setConfirmResolveOpen(true)} disabled={onDemandActionLoading}>
                      Resolve Ticket
                    </Button>
                  )}
                </div>
              ) : null
            }
          >
            {selectedOnDemandTicket && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                      <StatusBadge status={selectedOnDemandTicket.status} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Timestamp</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      {new Date(selectedOnDemandTicket.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

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
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedOnDemandTicket.reporterName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                    <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{selectedOnDemandTicket.reporterRole}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Phone Number:</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedOnDemandTicket.reporterPhone || '—'}</span>
                  </div>
                  {selectedOnDemandTicket.relatedTripId && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Related Trip:</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--brand-primary)' }}>{selectedOnDemandTicket.relatedTripId}</span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Issue Description ({selectedOnDemandTicket.issueType})
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
                    {selectedOnDemandTicket.description || 'No description provided.'}
                  </p>
                </div>

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

          <ConfirmDialog
            isOpen={confirmResolveOpen && !!selectedOnDemandTicket}
            onClose={() => !onDemandActionLoading && setConfirmResolveOpen(false)}
            onConfirm={() => handleResolveOnDemand('RESOLVED')}
            variant="success"
            isLoading={onDemandActionLoading}
            title="Mark Support Ticket Resolved?"
            subtitle={selectedOnDemandTicket ? `Ticket #${selectedOnDemandTicket.id.slice(0, 8).toUpperCase()}` : undefined}
            description={
              <span>
                Confirm resolving this {selectedOnDemandTicket?.issueType} case reported by{' '}
                <strong>{selectedOnDemandTicket?.reporterName}</strong> and persisting operator triage notes.
              </span>
            }
            confirmLabel="Resolve Ticket"
          />
        </>
      )}
    </div>
  );
}
