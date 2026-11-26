'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Eye,
  FileImage,
  Headphones,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  UserRound,
  X,
} from 'lucide-react';
import { ContentLoadingSkeleton, LazyMount, SkeletonBone } from '@adhocx/ui/page-loading';
import type { DonutSegment } from '../../components/charts/DonutChart';
import { LazyDonutChart } from '../../components/charts/LazyCharts';
import LazyScrollSentinel from '../../components/common/LazyScrollSentinel';
import TableSkeletonRows from '../../components/common/TableSkeletonRows';
import { supportApi } from '../../lib/api/corporate';
import type { CorporateTicketMessage, SupportTicket } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';
import { useInfiniteScroll } from '../../lib/hooks/useInfiniteScroll';
import styles from './EmployeeSupport.module.css';

type ComplaintStatusGroup = 'Open' | 'In Progress' | 'Resolved';
type DatePreset = '7' | '30' | '3m' | 'all' | 'custom';

interface NormalizedComplaint {
  id: string;
  ticketNumber: string;
  employeeName: string;
  employeeCode: string;
  employeePhone: string;
  employeeEmail: string;
  categoryRaw: string;
  categoryLabel: string;
  subject: string;
  description: string;
  priority: string;
  routeId: string | null;
  raisedAt: Date;
  statusRaw: string;
  statusGroup: ComplaintStatusGroup;
  resolutionNotes: string | null;
  resolvedAt: Date | null;
  attachments: NonNullable<SupportTicket['attachments']>;
  raw: SupportTicket;
}

const STATUSES: ComplaintStatusGroup[] = ['Open', 'In Progress', 'Resolved'];
const LAZY_BATCH_SIZE = 20;
const SERVER_BATCH_SIZE = 200;
const DONUT_COLORS = ['#5728B2', '#8B5CF6', '#0EA5E9', '#F59E0B', '#16A34A', '#EC4899', '#64748B'];

function formatCategoryLabel(raw?: string | null): string {
  if (!raw) return 'General';
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function mapStatusGroup(status?: string | null): ComplaintStatusGroup {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'RESOLVED' || normalized === 'CLOSED') return 'Resolved';
  if (
    normalized === 'IN_PROGRESS' ||
    normalized === 'ASSIGNED' ||
    normalized === 'WAITING_FOR_CORPORATE'
  ) {
    return 'In Progress';
  }
  return 'Open';
}

function normalizeTicket(ticket: SupportTicket): NormalizedComplaint {
  const raisedAt = new Date(ticket.createdAt);
  const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt) : null;
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber || ticket.id.slice(0, 8).toUpperCase(),
    employeeName: ticket.employee?.fullName || 'Employee',
    employeeCode: ticket.employee?.employeeCode || ticket.employeeId?.slice(0, 8) || '—',
    employeePhone: ticket.employee?.phoneNumber ?? ticket.employee?.phone ?? '',
    employeeEmail: ticket.employee?.email || '',
    categoryRaw: ticket.category || 'OTHER',
    categoryLabel: formatCategoryLabel(ticket.category),
    subject: ticket.subject || 'Untitled complaint',
    description: ticket.description || '',
    priority: ticket.priority || 'MEDIUM',
    routeId: ticket.routeId || null,
    raisedAt: Number.isNaN(raisedAt.getTime()) ? new Date() : raisedAt,
    statusRaw: (ticket.status || 'OPEN').toUpperCase(),
    statusGroup: mapStatusGroup(ticket.status),
    resolutionNotes: ticket.resolutionNotes || null,
    resolvedAt: resolvedAt && !Number.isNaN(resolvedAt.getTime()) ? resolvedAt : null,
    attachments: ticket.attachments || [],
    raw: ticket,
  };
}

function formatDate(value: Date, options?: Intl.DateTimeFormatOptions): string {
  if (Number.isNaN(value.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', options ?? {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

function getMonthStart(monthOffset: number): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date);
}

function buildTrend(complaints: NormalizedComplaint[], months: number) {
  return Array.from({ length: months }, (_, index) => {
    const offset = months - index - 1;
    const start = getMonthStart(offset);
    const end = getMonthStart(offset - 1);
    return {
      label: monthLabel(start),
      value: complaints.filter((complaint) => complaint.raisedAt >= start && complaint.raisedAt < end).length,
    };
  });
}

function ComplaintTrendChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const width = 720;
  const height = 260;
  const left = 44;
  const right = 18;
  const top = 18;
  const bottom = 34;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxValue = Math.max(1, ...data.map((point) => point.value));
  const yMax = Math.max(2, Math.ceil(maxValue / 2) * 2);
  const points = data.map((point, index) => ({
    ...point,
    x: left + (data.length <= 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth),
    y: top + chartHeight - (point.value / yMax) * chartHeight,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');

  return (
    <div className={styles.chartScroll}>
      <svg
        className={styles.trendSvg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Employee complaints by month: ${data.map((point) => `${point.label} ${point.value}`).join(', ')}`}
      >
        {[0, 1, 2].map((tick) => {
          const value = Math.round((yMax * tick) / 2);
          const y = top + chartHeight - (value / yMax) * chartHeight;
          return (
            <g key={tick}>
              <line x1={left} y1={y} x2={width - right} y2={y} className={styles.gridLine} />
              <text x={left - 10} y={y + 4} textAnchor="end" className={styles.axisLabel}>{value}</text>
            </g>
          );
        })}
        <polyline points={line} className={styles.trendLine} />
        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4.5" className={styles.trendPoint}>
              <title>{`${point.label}: ${point.value} complaints`}</title>
            </circle>
            <text x={point.x} y={height - 10} textAnchor="middle" className={styles.axisLabel}>{point.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function getRangeStart(preset: DatePreset, customFrom: string): Date | null {
  if (preset === 'all') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preset === 'custom') return customFrom ? new Date(`${customFrom}T00:00:00`) : null;
  if (preset === '7') today.setDate(today.getDate() - 6);
  if (preset === '30') today.setDate(today.getDate() - 29);
  if (preset === '3m') today.setMonth(today.getMonth() - 3);
  return today;
}

function StatusBadge({ status }: { status: ComplaintStatusGroup }) {
  const className = status === 'Resolved'
    ? styles.statusResolved
    : status === 'In Progress'
      ? styles.statusProgress
      : styles.statusOpen;
  return <span className={`${styles.statusBadge} ${className}`}>{status}</span>;
}

function employeeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'EM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function EmployeeSupportPage() {
  const { tenantId, status: sessionStatus } = useSession();

  const [complaints, setComplaints] = useState<NormalizedComplaint[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [datePreset, setDatePreset] = useState<DatePreset>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(LAZY_BATCH_SIZE);
  const [hasMoreServer, setHasMoreServer] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState(6);

  const [selectedComplaint, setSelectedComplaint] = useState<NormalizedComplaint | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [messages, setMessages] = useState<CorporateTicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [drawerFeedback, setDrawerFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const loadComplaints = useCallback(async () => {
    if (sessionStatus === 'loading') return;
    if (!tenantId) {
      setComplaints([]);
      setLoadError('Sign in with a corporate account to view employee complaints.');
      return;
    }

    setRefreshing(true);
    setLoadError(null);
    try {
      const ticketsRes = await supportApi.list(tenantId, { limit: SERVER_BATCH_SIZE, offset: 0 });
      const rawList = Array.isArray(ticketsRes) ? ticketsRes : [];
      const normalized = rawList.map(normalizeTicket);
      setComplaints(normalized);
      setHasMoreServer(rawList.length >= SERVER_BATCH_SIZE);
      setSelectedComplaint((current) => {
        if (!current) return null;
        return normalized.find((item) => item.id === current.id) ?? current;
      });
    } catch (error) {
      setComplaints([]);
      setHasMoreServer(false);
      setLoadError(error instanceof Error ? error.message : 'Unable to load employee complaints.');
    } finally {
      setRefreshing(false);
    }
  }, [sessionStatus, tenantId]);

  const loadMoreServerComplaints = useCallback(async () => {
    if (!tenantId || loadingMore || !hasMoreServer || complaints === null) return;
    setLoadingMore(true);
    try {
      const ticketsRes = await supportApi.list(tenantId, {
        limit: SERVER_BATCH_SIZE,
        offset: complaints.length,
      });
      const rawList = Array.isArray(ticketsRes) ? ticketsRes : [];
      const normalized = rawList.map(normalizeTicket);
      setComplaints((current) => {
        if (!current) return normalized;
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...normalized.filter((item) => !seen.has(item.id))];
      });
      setHasMoreServer(rawList.length >= SERVER_BATCH_SIZE);
    } catch {
      setHasMoreServer(false);
    } finally {
      setLoadingMore(false);
    }
  }, [complaints, hasMoreServer, loadingMore, tenantId]);

  useEffect(() => {
    void loadComplaints();
  }, [loadComplaints]);

  const openComplaintDrawer = useCallback(async (complaint: NormalizedComplaint) => {
    setSelectedComplaint(complaint);
    setDrawerFeedback(null);
    setReplyText('');
    setDrawerLoading(true);
    try {
      const [detail, threadMessages] = await Promise.all([
        supportApi.get(complaint.id).catch(() => complaint.raw),
        supportApi.listMessages(complaint.id).catch(() => []),
      ]);
      const fresh = normalizeTicket(detail);
      setSelectedComplaint(fresh);
      setMessages(Array.isArray(threadMessages) ? threadMessages : []);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedComplaint) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedComplaint(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedComplaint]);

  const handleSendReply = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedComplaint || !replyText.trim()) return;

    setSendingReply(true);
    setDrawerFeedback(null);
    try {
      const sent = await supportApi.sendMessage(selectedComplaint.id, { message: replyText.trim() });
      setMessages((prev) => [...prev, sent]);
      setReplyText('');
      setDrawerFeedback({ kind: 'success', message: 'Reply posted to ticket conversation.' });
    } catch (error) {
      setDrawerFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to send reply.',
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (nextStatus: 'IN_PROGRESS' | 'RESOLVED') => {
    if (!selectedComplaint) return;

    setUpdatingStatus(true);
    setDrawerFeedback(null);
    try {
      const currentRawStatus = selectedComplaint.statusRaw;
      const needsInProgressStep =
        nextStatus === 'RESOLVED' &&
        (currentRawStatus === 'OPEN' || currentRawStatus === 'ASSIGNED' || currentRawStatus === 'REOPENED');

      if (needsInProgressStep) {
        await supportApi.updateStatus(selectedComplaint.id, 'IN_PROGRESS');
      }

      const updatedTicket = await supportApi.updateStatus(
        selectedComplaint.id,
        nextStatus,
        nextStatus === 'RESOLVED' ? 'Marked as resolved by Corporate Support.' : undefined,
      );
      const normalized = normalizeTicket(updatedTicket);
      setSelectedComplaint(normalized);
      setComplaints((prev) =>
        prev ? prev.map((item) => (item.id === normalized.id ? normalized : item)) : prev,
      );
      setDrawerFeedback({
        kind: 'success',
        message: `Complaint marked as ${nextStatus === 'RESOLVED' ? 'Resolved' : 'In Progress'}.`,
      });
      void loadComplaints();
    } catch (error) {
      setDrawerFeedback({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Unable to update complaint status.',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const allComplaints = useMemo(() => complaints ?? [], [complaints]);
  const rangeError = datePreset === 'custom' && customFrom && customTo && customFrom > customTo
    ? 'The start date must be on or before the end date.'
    : '';

  const dateFilteredComplaints = useMemo(() => {
    const start = getRangeStart(datePreset, customFrom);
    const end = datePreset === 'custom' && customTo ? new Date(`${customTo}T23:59:59.999`) : null;
    return allComplaints.filter((complaint) => {
      if (datePreset === 'custom' && (!start || !end || rangeError)) return false;
      if (start && complaint.raisedAt < start) return false;
      if (end && complaint.raisedAt > end) return false;
      return true;
    });
  }, [allComplaints, datePreset, customFrom, customTo, rangeError]);

  const availableCategories = useMemo(() => {
    const labels = new Set<string>();
    allComplaints.forEach((complaint) => labels.add(complaint.categoryLabel));
    return Array.from(labels).sort((a, b) => a.localeCompare(b));
  }, [allComplaints]);

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return dateFilteredComplaints
      .filter((complaint) => {
        const matchesSearch = !query || [
          complaint.employeeName,
          complaint.employeeCode,
          complaint.ticketNumber,
          complaint.subject,
          complaint.description,
          complaint.routeId || '',
        ].some((value) => value.toLocaleLowerCase().includes(query));
        return matchesSearch
          && (!categoryFilter || complaint.categoryLabel === categoryFilter)
          && (!statusFilter || complaint.statusGroup === statusFilter);
      })
      .sort((a, b) => b.raisedAt.getTime() - a.raisedAt.getTime());
  }, [dateFilteredComplaints, search, categoryFilter, statusFilter]);

  useEffect(() => setVisibleCount(LAZY_BATCH_SIZE), [datePreset, customFrom, customTo, search, categoryFilter, statusFilter]);

  const counts = useMemo(
    () => ({
      total: dateFilteredComplaints.length,
      open: dateFilteredComplaints.filter((complaint) => complaint.statusGroup === 'Open').length,
      inProgress: dateFilteredComplaints.filter((complaint) => complaint.statusGroup === 'In Progress').length,
      resolved: dateFilteredComplaints.filter((complaint) => complaint.statusGroup === 'Resolved').length,
    }),
    [dateFilteredComplaints],
  );

  const categorySegments: DonutSegment[] = useMemo(() => {
    const map = new Map<string, number>();
    dateFilteredComplaints.forEach((complaint) => {
      map.set(complaint.categoryLabel, (map.get(complaint.categoryLabel) ?? 0) + 1);
    });
    const total = dateFilteredComplaints.length;
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count], index) => ({
        label,
        count,
        pct: total ? Math.round((count / total) * 100) : 0,
        color: DONUT_COLORS[index % DONUT_COLORS.length],
      }));
  }, [dateFilteredComplaints]);

  const trendData = useMemo(
    () => buildTrend(allComplaints, trendPeriod),
    [allComplaints, trendPeriod],
  );
  const visibleComplaints = filteredComplaints.slice(0, visibleCount);
  const hasMoreVisible = visibleCount < filteredComplaints.length;
  const hasMore = hasMoreVisible || hasMoreServer;
  const sentinelRef = useInfiniteScroll({
    enabled: complaints !== null && !loadError && !loadingMore && hasMore,
    onLoadMore: () => {
      if (hasMoreVisible) {
        setVisibleCount((current) => current + LAZY_BATCH_SIZE);
      } else if (hasMoreServer) {
        void loadMoreServerComplaints();
      }
    },
  });
  const dateRangeLabel = datePreset === '7'
    ? 'Last 7 Days'
    : datePreset === '30'
      ? 'Last 30 Days'
      : datePreset === '3m'
        ? 'Last 3 Months'
        : datePreset === 'all'
          ? 'All Time'
          : 'Custom Range';

  function setCardStatus(status: ComplaintStatusGroup | '') {
    setStatusFilter((current) => (current === status ? '' : status));
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>TRANSPORTATION <span>/</span> EMPLOYEE SUPPORT</div>
          <h1>Employee Support</h1>
          <p>Monitor, respond to, and resolve live employee transportation support tickets.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <label className={styles.dateControl}>
            <span><CalendarDays size={15} /> Reporting period</span>
            <span className={styles.selectWrap}>
              <select
                aria-label="Complaint reporting period"
                value={datePreset}
                onChange={(event) => setDatePreset(event.target.value as DatePreset)}
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="3m">Last 3 Months</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </span>
          </label>
          <button
            type="button"
            className={styles.statusActionBtn}
            onClick={() => void loadComplaints()}
            disabled={refreshing}
            style={{ minHeight: 36 }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      {datePreset === 'custom' && (
        <div className={styles.customRange} aria-label="Custom complaint date range">
          <label>
            From
            <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
          </label>
          {rangeError && <p className={styles.rangeError} role="alert">{rangeError}</p>}
        </div>
      )}

      <section className={styles.summaryGrid} aria-label="Complaint summary">
        <button type="button" className={styles.summaryCard} aria-pressed={!statusFilter} onClick={() => setCardStatus('')}>
          <span className={`${styles.summaryIcon} ${styles.iconPurple}`}><MessageCircle size={18} /></span>
          <span className={styles.summaryText}>
            <span>Total Tickets</span>
            <strong>{complaints === null ? <SkeletonBone style={{ width: 32, height: 22, borderRadius: 6 }} /> : counts.total}</strong>
          </span>
        </button>
        <button type="button" className={styles.summaryCard} aria-pressed={statusFilter === 'Open'} onClick={() => setCardStatus('Open')}>
          <span className={`${styles.summaryIcon} ${styles.iconAmber}`}><CircleAlert size={18} /></span>
          <span className={styles.summaryText}>
            <span>Open</span>
            <strong>{complaints === null ? <SkeletonBone style={{ width: 32, height: 22, borderRadius: 6 }} /> : counts.open}</strong>
          </span>
        </button>
        <button type="button" className={styles.summaryCard} aria-pressed={statusFilter === 'In Progress'} onClick={() => setCardStatus('In Progress')}>
          <span className={`${styles.summaryIcon} ${styles.iconBlue}`}><Clock3 size={18} /></span>
          <span className={styles.summaryText}>
            <span>In Progress</span>
            <strong>{complaints === null ? <SkeletonBone style={{ width: 32, height: 22, borderRadius: 6 }} /> : counts.inProgress}</strong>
          </span>
        </button>
        <button type="button" className={styles.summaryCard} aria-pressed={statusFilter === 'Resolved'} onClick={() => setCardStatus('Resolved')}>
          <span className={`${styles.summaryIcon} ${styles.iconGreen}`}><CheckCircle2 size={18} /></span>
          <span className={styles.summaryText}>
            <span>Resolved</span>
            <strong>{complaints === null ? <SkeletonBone style={{ width: 32, height: 22, borderRadius: 6 }} /> : counts.resolved}</strong>
          </span>
        </button>
      </section>

      <section className={styles.panel} aria-labelledby="recent-complaints-heading">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="recent-complaints-heading">Employee Support Tickets</h2>
            <p>{dateRangeLabel} · {filteredComplaints.length} {filteredComplaints.length === 1 ? 'ticket' : 'tickets'}</p>
          </div>
        </div>

        <div className={styles.filters}>
          <label className={styles.searchBox}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search employee complaints"
              placeholder="Search employee, ticket #, subject, or route..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className={styles.selectWrap}>
            <span className={styles.srOnly}>Filter by category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">All categories</option>
              {availableCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
          <label className={styles.selectWrap}>
            <span className={styles.srOnly}>Filter by status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Employee</th>
                <th>Category</th>
                <th>Subject &amp; Route</th>
                <th>Raised On</th>
                <th>Status</th>
                <th><span className={styles.srOnly}>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {complaints === null ? (
                <TableSkeletonRows columns={7} rows={6} />
              ) : loadError ? (
                <tr>
                  <td className={styles.stateCell} colSpan={7}>
                    <div className={styles.errorState} role="alert">
                      <strong>Could not load employee tickets</strong>
                      <span>{loadError}</span>
                      <button type="button" onClick={() => void loadComplaints()}>Try again</button>
                    </div>
                  </td>
                </tr>
              ) : allComplaints.length === 0 ? (
                <tr>
                  <td className={styles.stateCell} colSpan={7}>
                    <div className={styles.emptyState}>
                      <Headphones size={22} />
                      <strong>No employee complaints yet</strong>
                      <span>When employees submit transport issues or complaints, they will appear here in real time.</span>
                    </div>
                  </td>
                </tr>
              ) : visibleComplaints.length === 0 ? (
                <tr>
                  <td className={styles.stateCell} colSpan={7}>
                    <div className={styles.emptyState}>
                      <Search size={22} />
                      <strong>No tickets match these filters</strong>
                      <span>Change the date range or clear your search and filters.</span>
                      <button type="button" onClick={() => {
                        setSearch('');
                        setCategoryFilter('');
                        setStatusFilter('');
                        setDatePreset('all');
                        setCustomFrom('');
                        setCustomTo('');
                      }}>Clear filters</button>
                    </div>
                  </td>
                </tr>
              ) : visibleComplaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td className={styles.complaintId}>#{complaint.ticketNumber}</td>
                  <td>
                    <div className={styles.employeeCell}>
                      <span className={styles.avatar} aria-hidden="true">{employeeInitials(complaint.employeeName)}</span>
                      <span><strong>{complaint.employeeName}</strong><small>{complaint.employeeCode}</small></span>
                    </div>
                  </td>
                  <td><span className={styles.categoryPill}>{complaint.categoryLabel}</span></td>
                  <td>
                    <span className={styles.tripCell}>
                      <strong>{complaint.subject}</strong>
                      <small>{complaint.routeId ? `Route ${complaint.routeId.slice(0, 8)}` : 'General commute ticket'}</small>
                    </span>
                  </td>
                  <td className={styles.dateCell}>
                    {formatDate(complaint.raisedAt, { day: '2-digit', month: 'short', year: 'numeric' })}
                    <small>{formatDate(complaint.raisedAt, { hour: '2-digit', minute: '2-digit' })}</small>
                  </td>
                  <td><StatusBadge status={complaint.statusGroup} /></td>
                  <td>
                    <button
                      type="button"
                      className={styles.viewButton}
                      onClick={() => void openComplaintDrawer(complaint)}
                      aria-label={`View details for ticket ${complaint.ticketNumber}`}
                    >
                      <Eye size={15} /> View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <LazyScrollSentinel
          sentinelRef={sentinelRef}
          hasMore={complaints !== null && !loadError && hasMore}
          loadingMore={loadingMore}
          label="Loading more tickets…"
        />
      </section>

      <section className={styles.analyticsGrid} aria-label="Complaint analytics">
        <div className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>Complaint Trends</h2>
              <p>Monthly employee support volume over the selected window</p>
            </div>
            <label className={styles.selectWrap}>
              <span className={styles.srOnly}>Complaint trend period</span>
              <select value={trendPeriod} onChange={(event) => setTrendPeriod(Number(event.target.value))}>
                <option value={3}>Last 3 Months</option>
                <option value={6}>Last 6 Months</option>
                <option value={12}>Last 12 Months</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
          </div>
          {complaints === null ? (
            <ContentLoadingSkeleton kind="chart" height={200} label="Loading trend data…" />
          ) : loadError ? (
            <div className={styles.chartState} role="alert">{loadError}</div>
          ) : (
            <LazyMount
              minHeight={200}
              fallback={<ContentLoadingSkeleton kind="chart" height={200} label="Preparing trend chart…" />}
            >
              <ComplaintTrendChart data={trendData} />
            </LazyMount>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>Common Complaint Categories</h2>
              <p>Distribution for {dateRangeLabel.toLocaleLowerCase()}</p>
            </div>
          </div>
          {complaints === null ? (
            <ContentLoadingSkeleton kind="chart" height={200} label="Loading category data…" />
          ) : loadError ? (
            <div className={styles.chartState} role="alert">{loadError}</div>
          ) : categorySegments.length === 0 ? (
            <div className={styles.chartState}>No tickets recorded in this date range.</div>
          ) : (
            <LazyMount
              minHeight={200}
              fallback={<ContentLoadingSkeleton kind="chart" height={200} label="Preparing category breakdown…" />}
            >
              <LazyDonutChart
                totalLabel="Tickets"
                totalValue={dateFilteredComplaints.length}
                segments={categorySegments}
                size={174}
                thickness={22}
              />
            </LazyMount>
          )}
        </div>
      </section>

      {selectedComplaint && (
        <div className={styles.drawerOverlay}>
          <button type="button" className={styles.backdrop} aria-label="Close ticket details" onClick={() => setSelectedComplaint(null)} />
          <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="complaint-detail-title">
            <header className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerEyebrow}>EMPLOYEE SUPPORT TICKET</span>
                <h2 id="complaint-detail-title">#{selectedComplaint.ticketNumber}</h2>
                <StatusBadge status={selectedComplaint.statusGroup} />
              </div>
              <button type="button" className={styles.closeButton} aria-label="Close details" onClick={() => setSelectedComplaint(null)}><X size={19} /></button>
            </header>
            <div className={styles.drawerBody}>
              {drawerFeedback && (
                <div
                  role={drawerFeedback.kind === 'error' ? 'alert' : 'status'}
                  className={`${styles.feedbackBanner} ${drawerFeedback.kind === 'error' ? styles.feedbackError : styles.feedbackSuccess}`}
                >
                  <span>{drawerFeedback.message}</span>
                  <button type="button" onClick={() => setDrawerFeedback(null)} aria-label="Dismiss message">×</button>
                </div>
              )}

              <section className={styles.detailSection}>
                <h3>Ticket details</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailField}><span>Employee</span><strong><UserRound size={14} /> {selectedComplaint.employeeName}</strong></div>
                  <div className={styles.detailField}><span>Employee ID</span><strong>{selectedComplaint.employeeCode}</strong></div>
                  {selectedComplaint.employeePhone && (
                    <div className={styles.detailField}><span>Phone</span><strong>{selectedComplaint.employeePhone}</strong></div>
                  )}
                  <div className={styles.detailField}><span>Category</span><strong>{selectedComplaint.categoryLabel}</strong></div>
                  <div className={styles.detailField}><span>Raised on</span><strong>{formatDate(selectedComplaint.raisedAt, { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>
                </div>
                <div className={styles.detailField} style={{ marginBottom: 10 }}>
                  <span>Subject</span>
                  <strong>{selectedComplaint.subject}</strong>
                </div>
                <div className={styles.detailField}>
                  <span>Description</span>
                  <p>{selectedComplaint.description || 'No description provided.'}</p>
                </div>

                {selectedComplaint.statusRaw !== 'CLOSED' && (
                  <div className={styles.statusActions}>
                    {['OPEN', 'ASSIGNED', 'REOPENED', 'WAITING_FOR_CORPORATE'].includes(selectedComplaint.statusRaw) && (
                      <button
                        type="button"
                        className={styles.statusActionBtn}
                        disabled={updatingStatus}
                        onClick={() => void handleUpdateStatus('IN_PROGRESS')}
                      >
                        <Clock3 size={14} /> {updatingStatus ? 'Updating…' : 'Mark In Progress'}
                      </button>
                    )}
                    {selectedComplaint.statusRaw !== 'RESOLVED' && (
                      <button
                        type="button"
                        className={`${styles.statusActionBtn} ${styles.statusActionResolve}`}
                        disabled={updatingStatus}
                        onClick={() => void handleUpdateStatus('RESOLVED')}
                      >
                        <CheckCircle2 size={14} /> {updatingStatus ? 'Updating…' : 'Mark Resolved'}
                      </button>
                    )}
                  </div>
                )}
              </section>

              {selectedComplaint.routeId && (
                <section className={styles.detailSection}>
                  <h3>Associated route</h3>
                  <div className={styles.tripDetail}>
                    <span className={styles.tripIcon}><CarFront size={17} /></span>
                    <span>
                      <strong>Route {selectedComplaint.routeId}</strong>
                      <small>Linked to this employee support ticket</small>
                    </span>
                  </div>
                </section>
              )}

              {selectedComplaint.resolutionNotes && (
                <section className={styles.detailSection}>
                  <h3>Resolution notes</h3>
                  <div className={styles.detailField}>
                    <p>{selectedComplaint.resolutionNotes}</p>
                    {selectedComplaint.resolvedAt && (
                      <span>Resolved on {formatDate(selectedComplaint.resolvedAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    )}
                  </div>
                </section>
              )}

              <section className={styles.detailSection}>
                <h3>Conversation &amp; updates</h3>
                {drawerLoading ? (
                  <ContentLoadingSkeleton kind="list" count={3} label="Loading conversation history…" />
                ) : messages.length === 0 ? (
                  <p className={styles.noAttachments}>No replies yet. Send a message below to update this ticket.</p>
                ) : (
                  <ol className={styles.timeline}>
                    {messages.map((msg) => (
                      <li key={msg.id}>
                        <span className={styles.timelineDot} />
                        <div>
                          <div className={styles.timelineHeading}>
                            <strong>{msg.senderName || msg.senderRole}</strong>
                            <time>{formatDate(new Date(msg.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}</time>
                          </div>
                          <p>{msg.message}</p>
                          <small>{msg.senderRole}</small>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                <form className={styles.replyForm} onSubmit={handleSendReply}>
                  <textarea
                    aria-label="Reply to ticket"
                    placeholder="Write a reply or operational update..."
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    disabled={sendingReply}
                  />
                  <div className={styles.replyFormFooter}>
                    <button
                      type="submit"
                      className={styles.primaryActionBtn}
                      disabled={sendingReply || !replyText.trim()}
                    >
                      <Send size={14} /> {sendingReply ? 'Sending…' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </section>

              <section className={styles.detailSection}>
                <h3>Attachments</h3>
                {selectedComplaint.attachments.length ? (
                  <ul className={styles.attachmentList}>
                    {selectedComplaint.attachments.map((file) => (
                      <li key={file.id}>
                        <FileImage size={16} />
                        {file.url ? (
                          <a href={file.url} target="_blank" rel="noreferrer">{file.fileName}</a>
                        ) : (
                          <span>{file.fileName}</span>
                        )}
                        <small>{file.fileSize ? `${Math.max(1, Math.round(file.fileSize / 1024))} KB` : file.fileType}</small>
                      </li>
                    ))}
                  </ul>
                ) : <p className={styles.noAttachments}>No attachments provided.</p>}
              </section>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
