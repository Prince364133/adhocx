'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ContentLoadingSkeleton } from '@adhocx/ui/page-loading';
import {
  AlertCircle,
  Eye,
  LifeBuoy,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Send,
  X,
} from 'lucide-react';
import { LazyScrollSentinel } from '../../components/common/LazyScrollSentinel';
import { employeeApi, supportApi } from '../../lib/api/corporate';
import type { Employee, SupportTicket } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';
import { useInfiniteScroll } from '../../lib/hooks/useInfiniteScroll';
import styles from './SupportTicketModal.module.css';

const BATCH_SIZE = 20;

const CATEGORIES = [
  ['TECHNICAL_ISSUE', 'Technical Issue'],
  ['EMPLOYEE_MANAGEMENT', 'Employee Management'],
  ['ROUTE_MANAGEMENT', 'Route Management'],
  ['TRANSPORT_OPERATIONS', 'Transport Operations'],
  ['BILLING_PAYMENTS', 'Billing & Payments'],
  ['ACCOUNT_ACCESS', 'Account & Access'],
  ['GENERAL_SUPPORT', 'General Support'],
  ['CAB_DELAY', 'Cab Delay'],
  ['DRIVER_BEHAVIOR', 'Driver Behavior'],
  ['ROUTE_ISSUE', 'Route Issue'],
  ['BILLING', 'Billing'],
  ['LOST_ITEM', 'Lost Item'],
  ['VEHICLE_CONDITION', 'Vehicle Condition'],
  ['SAFETY_CONCERN', 'Safety Concern'],
  ['OTHER', 'Other'],
] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CORPORATE', 'RESOLVED', 'CLOSED', 'REOPENED'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const controlStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 40,
  padding: '9px 11px',
  borderRadius: 8,
  border: '1px solid var(--border-color)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: 13,
  outlineColor: 'var(--support-accent-variant-1)',
  boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-primary)',
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
};

function statusColor(status: string) {
  if (status === 'RESOLVED' || status === 'CLOSED') return { bg: '#edf8f1', color: '#237548' };
  if (status === 'IN_PROGRESS' || status === 'ASSIGNED') return { bg: '#f1efff', color: 'var(--support-accent-variant-2)' };
  if (status === 'WAITING_FOR_CORPORATE') return { bg: '#fff7e9', color: '#9b6500' };
  return { bg: '#eef2f7', color: '#4d5b70' };
}

function pretty(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function StatusBadge({ status }: { status: string }) {
  const colors = statusColor(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
      background: colors.bg, color: colors.color, borderRadius: 5, padding: '4px 8px',
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor' }} />
      {pretty(status)}
    </span>
  );
}

export default function SupportOverviewPage() {
  const { tenantId, claims } = useSession();
  const isEmployee = claims?.role?.toUpperCase() === 'EMPLOYEE';
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeLoadError, setEmployeeLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadMoreError, setLoadMoreError] = useState('');
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const requestSequence = useRef(0);
  const loadedCountRef = useRef(0);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createClosing, setCreateClosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('GENERAL_SUPPORT');
  const [priority, setPriority] = useState<string>('MEDIUM');
  const [employeeId, setEmployeeId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [previews, setPreviews] = useState<string[]>([]);
  const [reply, setReply] = useState('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [replyError, setReplyError] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    const openTicketFromHelp = () => {
      setCreateClosing(false);
      setShowCreate(true);
    };
    const params = new URLSearchParams(window.location.search);
    if (params.get('openTicket') === '1') {
      openTicketFromHelp();
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }

    window.addEventListener('adhocx:open-support-ticket', openTicketFromHelp);
    return () => window.removeEventListener('adhocx:open-support-ticket', openTicketFromHelp);
  }, []);

  const buildListFilters = useCallback(() => ({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    category: categoryFilter || undefined,
    search: search.trim() || undefined,
    from: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : undefined,
    to: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
  }), [categoryFilter, dateFrom, dateTo, priorityFilter, search, statusFilter]);

  const loadTickets = useCallback(async (preserveLoaded = false) => {
    const requestId = ++requestSequence.current;
    const limit = preserveLoaded ? Math.max(BATCH_SIZE, loadedCountRef.current) : BATCH_SIZE;
    if (!preserveLoaded) setLoading(true);
    setLoadError('');
    setLoadMoreError('');
    try {
      const data = await supportApi.list(undefined, {
        ...buildListFilters(),
        limit,
        offset: 0,
      });
      if (requestId !== requestSequence.current) return;
      const items = Array.isArray(data) ? data : [];
      setTickets(items);
      loadedCountRef.current = items.length;
      setHasMore(items.length >= limit);
    } catch (error) {
      if (requestId === requestSequence.current && !preserveLoaded) {
        setHasMore(false);
        setLoadError(error instanceof Error ? error.message : 'Unable to load your support tickets.');
      }
    } finally {
      if (requestId === requestSequence.current && !preserveLoaded) setLoading(false);
    }
  }, [buildListFilters]);

  const loadMoreTickets = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const requestId = requestSequence.current;
    const offset = loadedCountRef.current;
    setLoadingMore(true);
    setLoadMoreError('');
    try {
      const data = await supportApi.list(undefined, {
        ...buildListFilters(),
        limit: BATCH_SIZE,
        offset,
      });
      if (requestId !== requestSequence.current) return;
      const items = Array.isArray(data) ? data : [];
      setTickets((current) => {
        const seen = new Set(current.map((ticket) => ticket.id));
        const next = [...current, ...items.filter((ticket) => !seen.has(ticket.id))];
        loadedCountRef.current = next.length;
        return next;
      });
      setHasMore(items.length >= BATCH_SIZE);
    } catch (error) {
      if (requestId === requestSequence.current) {
        setLoadMoreError(error instanceof Error ? error.message : 'Unable to load more support tickets.');
      }
    } finally {
      if (requestId === requestSequence.current) setLoadingMore(false);
    }
  }, [buildListFilters, hasMore, loading, loadingMore]);

  const sentinelRef = useInfiniteScroll({
    enabled: !loading && !loadingMore && hasMore && !loadError && !loadMoreError,
    onLoadMore: () => {
      void loadMoreTickets();
    },
  });

  useEffect(() => {
    void loadTickets();
    const timer = window.setInterval(() => void loadTickets(true), 30000);
    if (tenantId && !isEmployee) {
      setEmployeeLoadError('');
      employeeApi.list(tenantId, { isActive: 'true', limit: 100 }).then((result) => {
        setEmployees(result.items ?? []);
      }).catch((error: unknown) => {
        setEmployees([]);
        setEmployeeLoadError(error instanceof Error ? error.message : 'Unable to load employee list.');
      });
    }
    return () => window.clearInterval(timer);
  }, [loadTickets, tenantId, isEmployee]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  useEffect(() => {
    if (!showCreate) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setCreateClosing(true);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCreate, saving]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesSearch = !query || ticket.ticketNumber.toLowerCase().includes(query) || ticket.subject.toLowerCase().includes(query);
      const created = new Date(ticket.createdAt).getTime();
      const matchesFrom = !dateFrom || created >= new Date(`${dateFrom}T00:00:00`).getTime();
      const matchesTo = !dateTo || created <= new Date(`${dateTo}T23:59:59`).getTime();
      return matchesSearch
        && (!statusFilter || ticket.status === statusFilter)
        && (!priorityFilter || ticket.priority === priorityFilter)
        && (!categoryFilter || ticket.category === categoryFilter)
        && matchesFrom
        && matchesTo;
    });
  }, [tickets, search, statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const validateFiles = (selectedFiles: File[], existing: File[] = []) => {
    const combined = [...existing, ...selectedFiles];
    if (combined.length > 5) return 'Attach no more than 5 images.';
    if (combined.some((file) => !ALLOWED_IMAGE_TYPES.includes(file.type))) return 'Only JPG, JPEG, PNG and WEBP images are allowed.';
    if (combined.some((file) => file.size > MAX_FILE_BYTES)) return 'Each image must be 5 MB or smaller.';
    return '';
  };

  const acceptFiles = (incoming: FileList | null, target: 'create' | 'reply') => {
    const selectedFiles = Array.from(incoming ?? []);
    const existing = target === 'create' ? files : replyFiles;
    const error = validateFiles(selectedFiles, existing);
    if (target === 'create') {
      setFileError(error);
      if (!error) setFiles([...existing, ...selectedFiles]);
    } else {
      setReplyError(error);
      if (!error) setReplyFiles([...existing, ...selectedFiles]);
    }
  };

  const closeCreateTicket = () => {
    if (!saving) setCreateClosing(true);
  };

  const submitTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim().length === 0 || description.trim().length === 0) return;
    if (!isEmployee && !employeeId) {
      setNotice({ kind: 'error', message: 'Select the employee this ticket is for.' });
      return;
    }
    if (!tenantId) {
      setNotice({ kind: 'error', message: 'Your company account is not available. Please sign in again.' });
      return;
    }
    setSaving(true);
    try {
      await supportApi.create(tenantId, {
        employeeId: isEmployee ? undefined : employeeId,
        subject: title.trim(),
        category,
        priority,
        description: description.trim(),
      }, files);
      setNotice({ kind: 'success', message: 'Your support ticket was created.' });
      setCreateClosing(true);
      setTitle('');
      setDescription('');
      setFiles([]);
      setEmployeeId('');
      await loadTickets();
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : 'Could not create ticket. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const openTicket = async (ticket: SupportTicket) => {
    try {
      setSelected(await supportApi.get(ticket.id));
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : 'Unable to load ticket details.' });
    }
  };

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !reply.trim()) return;
    setReplying(true);
    try {
      const updated = await supportApi.reply(selected.id, reply.trim(), replyFiles);
      setSelected(updated);
      setReply('');
      setReplyFiles([]);
      setReplyError('');
      await loadTickets();
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'Unable to send reply.');
    } finally {
      setReplying(false);
    }
  };

  const reopenTicket = async () => {
    if (!selected) return;
    try {
      setSelected(await supportApi.reopen(selected.id));
      setNotice({ kind: 'success', message: 'Ticket reopened.' });
      await loadTickets();
    } catch (error) {
      setNotice({ kind: 'error', message: error instanceof Error ? error.message : 'Unable to reopen ticket.' });
    }
  };

  const activeFilters = [statusFilter, priorityFilter, categoryFilter, dateFrom, dateTo].filter(Boolean).length;

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 25, letterSpacing: '-0.03em', color: 'var(--text-primary)', fontWeight: 700 }}>Support</h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Raise a request and track updates from your support team.</p>
        </div>
        <button type="button" onClick={() => { setCreateClosing(false); setShowCreate(true); }} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 40, padding: '0 15px',
          border: 0, borderRadius: 8, background: 'var(--support-accent-variant-3)', color: '#fff', fontSize: 13, fontWeight: 650, cursor: 'pointer',
        }}>
          <Plus size={16} /> Raise a Ticket
        </button>
      </header>

      {notice && (
        <div role="status" style={{
          padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderRadius: 8, background: notice.kind === 'success' ? '#edf8f1' : '#fff1f0',
          color: notice.kind === 'success' ? '#237548' : '#a0342b', fontSize: 13,
        }}>
          <span>{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer' }}><X size={15} /></button>
        </div>
      )}

      <section style={{ border: '1px solid var(--border-color)', borderRadius: 10, background: 'var(--bg-surface)', overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 13 }}>
            <div><h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>Your tickets</h2><p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Responses and operational updates are synchronized automatically.</p></div>
            {activeFilters > 0 && <button type="button" onClick={clearFilters} style={{ border: 0, background: 'none', color: 'var(--support-accent-variant-3)', fontSize: 12, fontWeight: 650, cursor: 'pointer' }}>Clear filters ({activeFilters})</button>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 9 }}>
            <div style={{ position: 'relative' }}><Search size={15} style={{ position: 'absolute', top: 12, left: 10, color: 'var(--text-muted)' }} /><input aria-label="Search tickets" placeholder="Search ticket number or title" value={search} onChange={(event) => setSearch(event.target.value)} style={{ ...controlStyle, paddingLeft: 32 }} /></div>
            <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={controlStyle}><option value="">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}</select>
            <select aria-label="Filter by priority" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} style={controlStyle}><option value="">All priorities</option>{PRIORITIES.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select>
            <select aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} style={controlStyle}><option value="">All categories</option>{CATEGORIES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select>
            <label style={{ ...controlStyle, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From</span>
              <input
                aria-label="Created from"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                style={{ border: 0, background: 'transparent', color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', minWidth: 0 }}
              />
            </label>
            <label style={{ ...controlStyle, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To</span>
              <input
                aria-label="Created to"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                style={{ border: 0, background: 'transparent', color: 'var(--text-primary)', fontSize: 13, outline: 'none', width: '100%', minWidth: 0 }}
              />
            </label>
          </div>
        </div>

        {loadError ? (
          <div role="alert" style={{ textAlign: 'center', padding: 44, color: 'var(--text-secondary)' }}>
            <AlertCircle size={22} style={{ color: '#b5473c' }} /><p>{loadError}</p><button type="button" onClick={() => void loadTickets()} style={{ border: 0, background: 'none', color: 'var(--support-accent-variant-3)', fontWeight: 650, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{ padding: 20 }}>
            <ContentLoadingSkeleton kind="table" count={6} label="Loading support tickets…" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <LifeBuoy size={24} style={{ color: 'var(--support-accent-variant-6)' }} />
            <p style={{ color: 'var(--text-primary)', fontWeight: 650, margin: '10px 0 4px' }}>{tickets.length ? 'No tickets match your filters' : 'No tickets yet'}</p>
            <p style={{ margin: 0, fontSize: 13 }}>{tickets.length ? 'Try adjusting the filters or clear them to see all tickets.' : 'Raise a ticket and your support team will follow up here.'}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850, textAlign: 'left' }}>
              <thead><tr style={{ background: 'var(--bg-surface-muted)', color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                {['Ticket ID', 'Title', 'Category', 'Priority', 'Created', 'Last Updated', 'Assigned Team', 'Status', ''].map((head) => <th key={head} style={{ padding: '11px 14px', fontWeight: 650, whiteSpace: 'nowrap' }}>{head}</th>)}
              </tr></thead>
              <tbody>{filtered.map((ticket) => <tr key={ticket.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                <td style={{ padding: '13px 14px', color: 'var(--support-accent-variant-3)', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{ticket.ticketNumber}</td>
                <td style={{ padding: '13px 14px', minWidth: 190 }}><div style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)' }}>{ticket.subject}</div><div style={{ marginTop: 3, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: 'var(--text-muted)' }}>{ticket.description}</div></td>
                <td style={{ padding: '13px 14px', color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>{pretty(ticket.category)}</td>
                <td style={{ padding: '13px 14px', color: ticket.priority === 'CRITICAL' || ticket.priority === 'HIGH' ? '#a13f38' : 'var(--text-secondary)', fontSize: 12, fontWeight: 650 }}>{pretty(ticket.priority)}</td>
                <td style={{ padding: '13px 14px', color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(ticket.createdAt)}</td>
                <td style={{ padding: '13px 14px', color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(ticket.updatedAt)}</td>
                <td style={{ padding: '13px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>{ticket.assignedTeam || '—'}</td>
                <td style={{ padding: '13px 14px' }}><StatusBadge status={ticket.status} /></td>
                <td style={{ padding: '13px 14px' }}><button type="button" title="View ticket" aria-label={`View ${ticket.ticketNumber}`} onClick={() => void openTicket(ticket)} style={{ display: 'inline-flex', border: '1px solid var(--border-color)', borderRadius: 6, padding: 6, background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer' }}><Eye size={15} /></button></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        {!loading && !loadError && (
          <LazyScrollSentinel
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            loadingMore={loadingMore}
            error={loadMoreError}
            onRetry={() => void loadMoreTickets()}
            label="Loading more tickets…"
          />
        )}
      </section>

      {showCreate && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCreateTicket(); }} className={`${styles.overlay} ${createClosing ? styles.overlayClosing : ''}`}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-ticket-title"
            className={`${styles.drawer} ${createClosing ? styles.drawerClosing : ''}`}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && createClosing) {
                setShowCreate(false);
                setCreateClosing(false);
              }
            }}
          >
            <header className={styles.header}>
              <div>
                <div className={styles.eyebrow}>SUPPORT REQUEST</div>
                <h2 id="create-ticket-title" className={styles.title}>Raise a Ticket</h2>
                <p className={styles.subtitle}>Tell us what you need help with.</p>
              </div>
              <button type="button" aria-label="Close" disabled={saving} onClick={closeCreateTicket} className={styles.closeButton}><X size={20} /></button>
            </header>
            <form onSubmit={submitTicket} className={styles.form}>
              <div className={styles.formBody}>
                {!isEmployee && <label className={styles.field}><span style={labelStyle}>Employee <b className={styles.required}>*</b></span><select required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={styles.control}><option value="">Select an employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.fullName} · {employee.employeeCode}</option>)}</select>{employeeLoadError && <p role="alert" className={styles.validation}>{employeeLoadError}</p>}</label>}
                <label className={styles.field}><span style={labelStyle}>Ticket title <b className={styles.required}>*</b></span><input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Briefly describe the issue" className={styles.control} /><span className={styles.counter}>{title.length}/200</span></label>
                <div className={styles.fieldGrid}>
                  <label className={styles.field}><span style={labelStyle}>Category</span><select value={category} onChange={(event) => setCategory(event.target.value)} className={styles.control}>{CATEGORIES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
                  <label className={styles.field}><span style={labelStyle}>Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value)} className={styles.control}>{PRIORITIES.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select></label>
                </div>
                <label className={styles.field}><span style={labelStyle}>Description <b className={styles.required}>*</b></span><textarea required maxLength={10000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add relevant details so our team can help you faster." className={`${styles.control} ${styles.description}`} /><span className={styles.counter}>{description.length}/10,000</span></label>
                <div className={styles.attachments}>
                  <span style={labelStyle}>Images or screenshots <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(up to 5, 5 MB each)</span></span>
                  <input id="create-ticket-images" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple className={styles.fileInput} onChange={(event) => { acceptFiles(event.target.files, 'create'); event.target.value = ''; }} />
                  <label htmlFor="create-ticket-images" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptFiles(event.dataTransfer.files, 'create'); }} className={styles.dropzone}>
                    <Paperclip size={16} /> Choose or drop images
                  </label>
                  {fileError && <p role="alert" className={styles.validation}>{fileError}</p>}
                  <div className={styles.previewRow}>
                    {files.map((file, index) => <div key={`${file.name}-${index}`} className={styles.previewItem}>
                      <div className={styles.previewImageWrap}><img src={previews[index]} alt={file.name} className={styles.previewImage} /><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))} className={styles.removeFile}><X size={12} /></button></div>
                      <span className={styles.fileName} title={file.name}>{file.name}</span>
                    </div>)}
                    {files.length < 5 && <label htmlFor="create-ticket-images" className={styles.addImage} aria-label="Add another image"><Plus size={18} /></label>}
                  </div>
                </div>
              </div>
              <footer className={styles.footer}><button type="button" disabled={saving} onClick={closeCreateTicket} className={styles.cancelButton}>Cancel</button><button type="submit" disabled={saving || !!fileError} className={styles.submitButton}>{saving ? 'Submitting…' : 'Submit Ticket'}</button></footer>
            </form>
          </section>
        </div>
      )}

      {selected && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }} style={overlayStyle}>
          <section role="dialog" aria-modal="true" aria-labelledby="ticket-detail-title" style={drawerStyle}>
            <div style={drawerHeaderStyle}><div><div style={eyebrowStyle}>{selected.ticketNumber}</div><h2 id="ticket-detail-title" style={drawerTitleStyle}>{selected.subject}</h2><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><StatusBadge status={selected.status} /><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pretty(selected.priority)} priority</span></div></div><button type="button" aria-label="Close" onClick={() => setSelected(null)} style={iconButton}><X size={18} /></button></div>
            <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, paddingBottom: 18, borderBottom: '1px solid var(--border-color)' }}>
                <DetailField label="Category" value={pretty(selected.category)} /><DetailField label="Created" value={formatDate(selected.createdAt)} />
                <DetailField label="Assigned team" value={selected.assignedTeam || 'Not assigned'} /><DetailField label="Last updated" value={formatDate(selected.updatedAt)} />
                <DetailField label="Assigned person" value={selected.assignedToUser?.fullName ?? selected.assignedToUserId ?? 'Not assigned'} /><DetailField label="Employee" value={selected.employee?.fullName || '—'} />
              </div>
              <div style={{ padding: '18px 0', borderBottom: '1px solid var(--border-color)' }}><h3 style={sectionTitleStyle}>Description</h3><p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{selected.description}</p></div>
              {selected.resolutionNotes && <div style={{ padding: '18px 0', borderBottom: '1px solid var(--border-color)' }}><h3 style={sectionTitleStyle}>Resolution</h3><p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>{selected.resolutionNotes}</p></div>}
              {!!selected.attachments?.length && <div style={{ padding: '18px 0', borderBottom: '1px solid var(--border-color)' }}><h3 style={sectionTitleStyle}>Attachments</h3><div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>{selected.attachments.map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" style={{ color: 'var(--support-accent-variant-3)' }}><img src={attachment.url} alt={attachment.fileName} style={{ width: 100, height: 80, objectFit: 'cover', border: '1px solid var(--border-color)', borderRadius: 7 }} /></a>)}</div></div>}
              <div style={{ padding: '18px 0' }}>
                <h3 style={sectionTitleStyle}>Activity & replies</h3>
                {[...(selected.activities ?? []).map((activity) => ({ id: activity.id, message: activity.description, createdAt: activity.createdAt, kind: 'activity' })), ...(selected.comments ?? []).map((comment) => ({ id: comment.id, message: comment.message, createdAt: comment.createdAt, kind: 'reply' }))].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((entry) => <div key={`${entry.kind}-${entry.id}`} style={{ display: 'flex', gap: 10, padding: '8px 0' }}><span style={{ width: 7, height: 7, marginTop: 5, borderRadius: 10, background: entry.kind === 'reply' ? 'var(--support-accent-variant-3)' : '#9a91a8', flexShrink: 0 }} /><div><div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{entry.message}</div><div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>{formatDate(entry.createdAt)}</div></div></div>)}
                {!selected.activities?.length && !selected.comments?.length && <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No updates yet.</p>}
              </div>
              {selected.status === 'RESOLVED' && <button type="button" onClick={() => void reopenTicket()} style={{ ...secondaryButton, display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14 }}><RotateCcw size={14} /> Reopen ticket</button>}
              {!['CLOSED'].includes(selected.status) && <form onSubmit={submitReply} style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <label><span style={labelStyle}>Reply to support <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({reply.length}/1,000)</span></span><textarea maxLength={1000} rows={3} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply…" style={{ ...controlStyle, resize: 'vertical' }} /></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 9 }}>
                  <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--support-accent-variant-3)', fontSize: 12, cursor: 'pointer' }}><Paperclip size={14} /> Attach images<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple hidden onChange={(event) => { acceptFiles(event.target.files, 'reply'); event.target.value = ''; }} /></label>
                  {replyFiles.map((file, index) => <span key={`${file.name}-${index}`} style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.name}<button type="button" onClick={() => setReplyFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`} style={{ border: 0, background: 'none', cursor: 'pointer' }}><X size={11} /></button></span>)}
                  <button type="submit" disabled={replying || !reply.trim() || !!replyError} style={{ ...primaryButton, marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Send size={14} />{replying ? 'Sending…' : 'Send reply'}</button>
                </div>
                {replyError && <p role="alert" style={validationStyle}>{replyError}</p>}
              </form>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return <div><div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 650 }}>{label}</div><div style={{ marginTop: 4, color: 'var(--text-primary)', fontSize: 12 }}>{value}</div></div>;
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', background: 'rgba(15, 23, 42, .38)' };
const drawerStyle: React.CSSProperties = { width: 'min(560px, 100vw)', height: '100%', background: 'var(--bg-surface)', boxShadow: '-12px 0 32px rgba(20, 24, 40, .12)', display: 'flex', flexDirection: 'column' };
const drawerHeaderStyle: React.CSSProperties = { padding: '22px 22px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: 16, flexShrink: 0 };
const drawerTitleStyle: React.CSSProperties = { margin: '4px 0 0', color: 'var(--text-primary)', fontSize: 20, fontWeight: 700 };
const eyebrowStyle: React.CSSProperties = { color: 'var(--support-accent-variant-4)', fontWeight: 700, fontSize: 10, letterSpacing: '.08em' };
const iconButton: React.CSSProperties = { display: 'inline-flex', justifyContent: 'center', alignItems: 'center', width: 32, height: 32, padding: 0, border: '1px solid var(--border-color)', borderRadius: 7, background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { minHeight: 36, padding: '0 12px', border: '1px solid var(--border-color)', borderRadius: 7, background: 'var(--bg-surface)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' };
const primaryButton: React.CSSProperties = { minHeight: 36, padding: '0 13px', border: 0, borderRadius: 7, background: 'var(--support-accent-variant-3)', color: '#fff', fontSize: 12, fontWeight: 650, cursor: 'pointer' };
const validationStyle: React.CSSProperties = { color: '#a0342b', fontSize: 11, margin: '6px 0 0' };
const sectionTitleStyle: React.CSSProperties = { margin: '0 0 10px', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700 };
