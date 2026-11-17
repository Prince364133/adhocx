'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { DonutChart, type DonutSegment } from '../../components/charts/DonutChart';
import styles from './EmployeeSupport.module.css';

type ComplaintCategory =
  | 'Cab Not Arrived'
  | 'Driver Behaviour'
  | 'Vehicle Condition'
  | 'Pickup Delay'
  | 'Drop-off Issue'
  | 'Other';
type ComplaintStatus = 'Open' | 'In Progress' | 'Resolved';
type DatePreset = '7' | '30' | '3m' | 'custom';

interface ComplaintUpdate {
  id: string;
  author: string;
  role: string;
  message: string;
  createdAt: Date;
}

interface EmployeeComplaint {
  id: string;
  employeeName: string;
  employeeId: string;
  category: ComplaintCategory;
  tripId: string;
  tripDate: Date;
  tripTime: string;
  tripDirection: 'Login' | 'Logout';
  description: string;
  raisedAt: Date;
  status: ComplaintStatus;
  updates: ComplaintUpdate[];
  attachments: string[];
}

const CATEGORIES: ComplaintCategory[] = [
  'Cab Not Arrived',
  'Driver Behaviour',
  'Vehicle Condition',
  'Pickup Delay',
  'Drop-off Issue',
  'Other',
];
const STATUSES: ComplaintStatus[] = ['Open', 'In Progress', 'Resolved'];
const PAGE_SIZE = 8;

function daysAgo(days: number, hour = 9, minute = 15): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function createSampleComplaints(): EmployeeComplaint[] {
  const samples: Array<{
    employeeName: string;
    employeeId: string;
    category: ComplaintCategory;
    days: number;
    status: ComplaintStatus;
    description: string;
    direction: 'Login' | 'Logout';
    updates?: Array<{ author: string; role: string; message: string; daysAfter: number }>;
    attachments?: string[];
  }> = [
    {
      employeeName: 'Ananya Rao',
      employeeId: 'ADX-1042',
      category: 'Cab Not Arrived',
      days: 1,
      status: 'Open',
      description: 'The cab had not reached the pickup point at the scheduled time.',
      direction: 'Login',
    },
    {
      employeeName: 'Rohan Mehta',
      employeeId: 'ADX-0871',
      category: 'Driver Behaviour',
      days: 3,
      status: 'In Progress',
      description: 'The driver spoke rudely when asked to wait at the pickup location.',
      direction: 'Logout',
      updates: [
        { author: 'AdhocX Support', role: 'Support update', message: 'We have received the complaint and are reviewing the trip details.', daysAfter: 0 },
      ],
    },
    {
      employeeName: 'Meera Nair',
      employeeId: 'ADX-1130',
      category: 'Vehicle Condition',
      days: 6,
      status: 'Resolved',
      description: 'The rear seat area was not clean at the start of the trip.',
      direction: 'Login',
      updates: [
        { author: 'AdhocX Support', role: 'Support update', message: 'The concern was shared with the relevant support team for review.', daysAfter: 0 },
        { author: 'AdhocX Support', role: 'Resolution', message: 'The trip was reviewed and the vehicle-condition concern was addressed.', daysAfter: 1 },
      ],
      attachments: ['vehicle-condition.jpg'],
    },
    {
      employeeName: 'Arjun Kapoor',
      employeeId: 'ADX-0924',
      category: 'Pickup Delay',
      days: 9,
      status: 'Open',
      description: 'Pickup was delayed and the employee reached the office later than expected.',
      direction: 'Login',
    },
    {
      employeeName: 'Divya Shah',
      employeeId: 'ADX-1216',
      category: 'Drop-off Issue',
      days: 13,
      status: 'In Progress',
      description: 'The drop-off point differed from the location shown in the trip details.',
      direction: 'Logout',
      updates: [
        { author: 'AdhocX Support', role: 'Support update', message: 'The drop-off details are being checked against the trip record.', daysAfter: 0 },
      ],
    },
    {
      employeeName: 'Kabir Iyer',
      employeeId: 'ADX-0762',
      category: 'Other',
      days: 19,
      status: 'Resolved',
      description: 'The employee could not identify the assigned cab at the pickup point.',
      direction: 'Login',
      updates: [
        { author: 'AdhocX Support', role: 'Support update', message: 'We reviewed the pickup communication for this trip.', daysAfter: 1 },
        { author: 'AdhocX Support', role: 'Resolution', message: 'The pickup details were clarified with the employee.', daysAfter: 2 },
      ],
    },
    {
      employeeName: 'Sana Khan',
      employeeId: 'ADX-1348',
      category: 'Driver Behaviour',
      days: 28,
      status: 'Resolved',
      description: 'The driver did not follow the requested pickup instructions.',
      direction: 'Login',
      updates: [
        { author: 'AdhocX Support', role: 'Resolution', message: 'The support team completed its review and recorded the outcome.', daysAfter: 2 },
      ],
    },
    {
      employeeName: 'Vikram Joshi',
      employeeId: 'ADX-0618',
      category: 'Pickup Delay',
      days: 41,
      status: 'Open',
      description: 'The cab arrived after the scheduled pickup window.',
      direction: 'Logout',
    },
    {
      employeeName: 'Pooja Menon',
      employeeId: 'ADX-0986',
      category: 'Vehicle Condition',
      days: 57,
      status: 'Resolved',
      description: 'The vehicle had an issue with the air conditioning during the commute.',
      direction: 'Login',
      updates: [
        { author: 'AdhocX Support', role: 'Resolution', message: 'The feedback was reviewed and a resolution update was recorded.', daysAfter: 3 },
      ],
      attachments: ['dashboard-warning.jpg'],
    },
    {
      employeeName: 'Neil Thomas',
      employeeId: 'ADX-1432',
      category: 'Drop-off Issue',
      days: 74,
      status: 'In Progress',
      description: 'The trip ended before the employee reached the requested drop-off point.',
      direction: 'Logout',
      updates: [
        { author: 'AdhocX Support', role: 'Support update', message: 'The case is under review by the support team.', daysAfter: 1 },
      ],
    },
    {
      employeeName: 'Ishita Das',
      employeeId: 'ADX-1091',
      category: 'Cab Not Arrived',
      days: 96,
      status: 'Resolved',
      description: 'The employee waited at the pickup point but could not locate the cab.',
      direction: 'Login',
      updates: [
        { author: 'AdhocX Support', role: 'Resolution', message: 'The trip outcome was confirmed and the case was closed.', daysAfter: 1 },
      ],
    },
    {
      employeeName: 'Dev Malhotra',
      employeeId: 'ADX-1549',
      category: 'Other',
      days: 124,
      status: 'Resolved',
      description: 'The employee reported difficulty confirming the trip with the assigned cab.',
      direction: 'Logout',
      updates: [
        { author: 'AdhocX Support', role: 'Resolution', message: 'The support team reviewed the report and shared the outcome.', daysAfter: 2 },
      ],
    },
    {
      employeeName: 'Aditi Bose',
      employeeId: 'ADX-1175',
      category: 'Pickup Delay',
      days: 153,
      status: 'Resolved',
      description: 'Pickup was later than the planned time on the trip.',
      direction: 'Login',
      updates: [
        { author: 'AdhocX Support', role: 'Resolution', message: 'The support review is complete.', daysAfter: 1 },
      ],
    },
    {
      employeeName: 'Rahul Sethi',
      employeeId: 'ADX-0820',
      category: 'Driver Behaviour',
      days: 188,
      status: 'Resolved',
      description: 'The employee raised a concern about communication during the trip.',
      direction: 'Logout',
      updates: [
        { author: 'AdhocX Support', role: 'Resolution', message: 'The concern was reviewed and the outcome recorded.', daysAfter: 2 },
      ],
    },
    {
      employeeName: 'Nisha Verma',
      employeeId: 'ADX-1304',
      category: 'Vehicle Condition',
      days: 221,
      status: 'Resolved',
      description: 'The employee noted an issue with the condition of the assigned vehicle.',
      direction: 'Login',
      updates: [
        { author: 'AdhocX Support', role: 'Resolution', message: 'The reported vehicle concern was reviewed by support.', daysAfter: 2 },
      ],
    },
    {
      employeeName: 'Karan Gill',
      employeeId: 'ADX-0679',
      category: 'Drop-off Issue',
      days: 257,
      status: 'Resolved',
      description: 'The employee reported a discrepancy in the drop-off location.',
      direction: 'Logout',
      updates: [
        { author: 'AdhocX Support', role: 'Resolution', message: 'The support team recorded the outcome after review.', daysAfter: 1 },
      ],
    },
    {
      employeeName: 'Tara Reddy',
      employeeId: 'ADX-1622',
      category: 'Cab Not Arrived',
      days: 296,
      status: 'Resolved',
      description: 'The employee could not find the cab at the scheduled pickup point.',
      direction: 'Login',
      updates: [
        { author: 'AdhocX Support', role: 'Resolution', message: 'The trip was reviewed and the support case was closed.', daysAfter: 1 },
      ],
    },
    {
      employeeName: 'Manav Bhat',
      employeeId: 'ADX-0715',
      category: 'Other',
      days: 330,
      status: 'Resolved',
      description: 'The employee shared feedback about their commute experience.',
      direction: 'Logout',
      updates: [
        { author: 'AdhocX Support', role: 'Resolution', message: 'The feedback was reviewed and recorded.', daysAfter: 2 },
      ],
    },
  ];

  return samples.map((sample, index) => {
    const raisedAt = daysAgo(sample.days, 8 + (index % 9), (index * 7) % 60);
    return {
      id: `ADX-CMP-${String(2401 + index).padStart(4, '0')}`,
      employeeName: sample.employeeName,
      employeeId: sample.employeeId,
      category: sample.category,
      tripId: `TRP-${String(78021 + index * 13).padStart(6, '0')}`,
      tripDate: new Date(raisedAt),
      tripTime: sample.direction === 'Login' ? '08:15 AM' : '06:30 PM',
      tripDirection: sample.direction,
      description: sample.description,
      raisedAt,
      status: sample.status,
      updates: [
        {
          id: `update-${index}-received`,
          author: 'AdhocX Support',
          role: 'Complaint received',
          message: 'The complaint was recorded and shared with the AdhocX Support team.',
          createdAt: new Date(raisedAt),
        },
        ...(sample.updates ?? []).map((update, updateIndex) => ({
          id: `update-${index}-${updateIndex}`,
          author: update.author,
          role: update.role,
          message: update.message,
          createdAt: new Date(raisedAt.getTime() + (update.daysAfter * 24 + 1) * 60 * 60 * 1000),
        })),
      ],
      attachments: sample.attachments ?? [],
    };
  });
}

function formatDate(value: Date, options?: Intl.DateTimeFormatOptions): string {
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

function buildTrend(complaints: EmployeeComplaint[], months: number) {
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (preset === 'custom') return customFrom ? new Date(`${customFrom}T00:00:00`) : null;
  if (preset === '7') today.setDate(today.getDate() - 6);
  if (preset === '30') today.setDate(today.getDate() - 29);
  if (preset === '3m') today.setMonth(today.getMonth() - 3);
  return today;
}

function StatusBadge({ status }: { status: ComplaintStatus }) {
  const className = status === 'Resolved'
    ? styles.statusResolved
    : status === 'In Progress'
      ? styles.statusProgress
      : styles.statusOpen;
  return <span className={`${styles.statusBadge} ${className}`}>{status}</span>;
}

export default function EmployeeSupportPage() {
  const [complaints, setComplaints] = useState<EmployeeComplaint[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [datePreset, setDatePreset] = useState<DatePreset>('30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [trendPeriod, setTrendPeriod] = useState(6);
  const [selectedComplaint, setSelectedComplaint] = useState<EmployeeComplaint | null>(null);

  useEffect(() => {
    try {
      setLoadError(null);
      setComplaints(createSampleComplaints());
    } catch (error) {
      setComplaints(null);
      setLoadError(error instanceof Error ? error.message : 'Preview complaints could not be loaded.');
    }
  }, [retryKey]);

  useEffect(() => {
    if (!selectedComplaint) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedComplaint(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedComplaint]);

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

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return dateFilteredComplaints.filter((complaint) => {
      const matchesSearch = !query || [
        complaint.employeeName,
        complaint.employeeId,
        complaint.tripId,
        complaint.id,
      ].some((value) => value.toLocaleLowerCase().includes(query));
      return matchesSearch
        && (!categoryFilter || complaint.category === categoryFilter)
        && (!statusFilter || complaint.status === statusFilter);
    }).sort((a, b) => b.raisedAt.getTime() - a.raisedAt.getTime());
  }, [dateFilteredComplaints, search, categoryFilter, statusFilter]);

  useEffect(() => setPage(1), [datePreset, customFrom, customTo, search, categoryFilter, statusFilter]);

  const counts = useMemo(() => ({
    total: dateFilteredComplaints.length,
    open: dateFilteredComplaints.filter((complaint) => complaint.status === 'Open').length,
    inProgress: dateFilteredComplaints.filter((complaint) => complaint.status === 'In Progress').length,
    resolved: dateFilteredComplaints.filter((complaint) => complaint.status === 'Resolved').length,
  }), [dateFilteredComplaints]);
  const categorySegments: DonutSegment[] = CATEGORIES
    .map((category, index) => {
      const count = dateFilteredComplaints.filter((complaint) => complaint.category === category).length;
      const colors = ['#5728B2', '#8B5CF6', '#0EA5E9', '#F59E0B', '#16A34A', '#64748B'];
      return {
        label: category,
        count,
        pct: counts.total ? Math.round((count / counts.total) * 100) : 0,
        color: colors[index],
      };
    })
    .filter((segment) => segment.count > 0);
  const trendData = useMemo(
    () => buildTrend(allComplaints, trendPeriod),
    [allComplaints, trendPeriod],
  );
  const totalPages = Math.max(1, Math.ceil(filteredComplaints.length / PAGE_SIZE));
  const visibleComplaints = filteredComplaints.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const dateRangeLabel = datePreset === '7'
    ? 'Last 7 Days'
    : datePreset === '30'
      ? 'Last 30 Days'
      : datePreset === '3m'
        ? 'Last 3 Months'
        : 'Custom Range';

  function setCardStatus(status: ComplaintStatus | '') {
    setStatusFilter((current) => current === status ? '' : status);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>TRANSPORTATION <span>/</span> EMPLOYEE SUPPORT</div>
          <h1>Employee Support</h1>
          <p>Monitor and track employee transportation complaints.</p>
        </div>
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
              <option value="custom">Custom Range</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </span>
        </label>
      </header>

      <div className={styles.previewNotice} role="status">
        <CircleAlert size={17} aria-hidden="true" />
        <span>
          <strong>Sample data — preview only.</strong> The Employee App complaint form is not currently connected to the existing support-ticket service, so these records are illustrative and are not live company complaints.
        </span>
      </div>

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
          <span className={styles.summaryText}><span>Total Complaints</span><strong>{complaints === null ? '—' : counts.total}</strong></span>
        </button>
        <button type="button" className={styles.summaryCard} aria-pressed={statusFilter === 'Open'} onClick={() => setCardStatus('Open')}>
          <span className={`${styles.summaryIcon} ${styles.iconAmber}`}><CircleAlert size={18} /></span>
          <span className={styles.summaryText}><span>Open</span><strong>{complaints === null ? '—' : counts.open}</strong></span>
        </button>
        <button type="button" className={styles.summaryCard} aria-pressed={statusFilter === 'In Progress'} onClick={() => setCardStatus('In Progress')}>
          <span className={`${styles.summaryIcon} ${styles.iconBlue}`}><Clock3 size={18} /></span>
          <span className={styles.summaryText}><span>In Progress</span><strong>{complaints === null ? '—' : counts.inProgress}</strong></span>
        </button>
        <button type="button" className={styles.summaryCard} aria-pressed={statusFilter === 'Resolved'} onClick={() => setCardStatus('Resolved')}>
          <span className={`${styles.summaryIcon} ${styles.iconGreen}`}><CheckCircle2 size={18} /></span>
          <span className={styles.summaryText}><span>Resolved</span><strong>{complaints === null ? '—' : counts.resolved}</strong></span>
        </button>
      </section>

      <section className={styles.panel} aria-labelledby="recent-complaints-heading">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="recent-complaints-heading">Recent Employee Complaints</h2>
            <p>{dateRangeLabel} · {filteredComplaints.length} {filteredComplaints.length === 1 ? 'complaint' : 'complaints'}</p>
          </div>
        </div>

        <div className={styles.filters}>
          <label className={styles.searchBox}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search employee complaints"
              placeholder="Search employee, ID, trip or complaint..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className={styles.selectWrap}>
            <span className={styles.srOnly}>Filter by category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
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
                <th>Complaint ID</th>
                <th>Employee</th>
                <th>Category</th>
                <th>Trip Details</th>
                <th>Raised On</th>
                <th>Status</th>
                <th><span className={styles.srOnly}>Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {complaints === null ? (
                <tr><td className={styles.stateCell} colSpan={7}>Loading sample preview…</td></tr>
              ) : loadError ? (
                <tr>
                  <td className={styles.stateCell} colSpan={7}>
                    <div className={styles.errorState} role="alert">
                      <strong>Could not load preview data</strong>
                      <span>{loadError}</span>
                      <button type="button" onClick={() => setRetryKey((key) => key + 1)}>Try again</button>
                    </div>
                  </td>
                </tr>
              ) : visibleComplaints.length === 0 ? (
                <tr>
                  <td className={styles.stateCell} colSpan={7}>
                    <div className={styles.emptyState}>
                      <Search size={22} />
                      <strong>No complaints match these filters</strong>
                      <span>Change the date range or clear your search and filters.</span>
                      <button type="button" onClick={() => {
                        setSearch('');
                        setCategoryFilter('');
                        setStatusFilter('');
                        setDatePreset('30');
                        setCustomFrom('');
                        setCustomTo('');
                      }}>Clear filters</button>
                    </div>
                  </td>
                </tr>
              ) : visibleComplaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td className={styles.complaintId}>{complaint.id}</td>
                  <td>
                    <div className={styles.employeeCell}>
                      <span className={styles.avatar} aria-hidden="true">{complaint.employeeName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                      <span><strong>{complaint.employeeName}</strong><small>{complaint.employeeId}</small></span>
                    </div>
                  </td>
                  <td><span className={styles.categoryPill}>{complaint.category}</span></td>
                  <td>
                    <span className={styles.tripCell}><strong>{complaint.tripId}</strong><small>{complaint.tripDirection} · {formatDate(complaint.tripDate, { day: '2-digit', month: 'short' })}, {complaint.tripTime}</small></span>
                  </td>
                  <td className={styles.dateCell}>{formatDate(complaint.raisedAt, { day: '2-digit', month: 'short', year: 'numeric' })}<small>{formatDate(complaint.raisedAt, { hour: '2-digit', minute: '2-digit' })}</small></td>
                  <td><StatusBadge status={complaint.status} /></td>
                  <td>
                    <button
                      type="button"
                      className={styles.viewButton}
                      onClick={() => setSelectedComplaint(complaint)}
                      aria-label={`View details for complaint ${complaint.id}`}
                    >
                      <Eye size={15} /> View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {complaints !== null && !loadError && filteredComplaints.length > 0 && (
          <div className={styles.pagination}>
            <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredComplaints.length)} of {filteredComplaints.length}</span>
            <div>
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</button>
            </div>
          </div>
        )}
      </section>

      <section className={styles.analyticsGrid} aria-label="Complaint analytics">
        <div className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>Complaint Trends</h2>
              <p>Monthly complaints over the selected reporting period</p>
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
          {complaints === null ? <div className={styles.chartState}>Loading trend preview…</div>
            : loadError ? <div className={styles.chartState} role="alert">{loadError}</div>
              : <ComplaintTrendChart data={trendData} />}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <h2>Common Complaint Categories</h2>
              <p>Distribution for {dateRangeLabel.toLocaleLowerCase()}</p>
            </div>
          </div>
          {complaints === null ? <div className={styles.chartState}>Loading category preview…</div>
            : loadError ? <div className={styles.chartState} role="alert">{loadError}</div>
              : categorySegments.length === 0 ? <div className={styles.chartState}>No category data for this date range.</div>
                : <DonutChart
                    totalLabel="Complaints"
                    totalValue={counts.total}
                    segments={categorySegments}
                    size={174}
                    thickness={22}
                  />}
        </div>
      </section>

      {selectedComplaint && (
        <div className={styles.drawerOverlay}>
          <button type="button" className={styles.backdrop} aria-label="Close complaint details" onClick={() => setSelectedComplaint(null)} />
          <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="complaint-detail-title">
            <header className={styles.drawerHeader}>
              <div>
                <span className={styles.drawerEyebrow}>EMPLOYEE COMPLAINT</span>
                <h2 id="complaint-detail-title">{selectedComplaint.id}</h2>
                <StatusBadge status={selectedComplaint.status} />
              </div>
              <button type="button" className={styles.closeButton} aria-label="Close details" onClick={() => setSelectedComplaint(null)}><X size={19} /></button>
            </header>
            <div className={styles.drawerBody}>
              <section className={styles.detailSection}>
                <h3>Complaint details</h3>
                <div className={styles.detailGrid}>
                  <div className={styles.detailField}><span>Employee</span><strong><UserRound size={14} /> {selectedComplaint.employeeName}</strong></div>
                  <div className={styles.detailField}><span>Employee ID</span><strong>{selectedComplaint.employeeId}</strong></div>
                  <div className={styles.detailField}><span>Category</span><strong>{selectedComplaint.category}</strong></div>
                  <div className={styles.detailField}><span>Raised on</span><strong>{formatDate(selectedComplaint.raisedAt, { dateStyle: 'medium', timeStyle: 'short' })}</strong></div>
                </div>
                <div className={styles.detailField}>
                  <span>Description</span>
                  <p>{selectedComplaint.description}</p>
                </div>
              </section>

              <section className={styles.detailSection}>
                <h3>Associated trip</h3>
                <div className={styles.tripDetail}>
                  <span className={styles.tripIcon}><CarFront size={17} /></span>
                  <span><strong>{selectedComplaint.tripId}</strong><small>{selectedComplaint.tripDirection} commute · {formatDate(selectedComplaint.tripDate, { dateStyle: 'medium' })} at {selectedComplaint.tripTime}</small></span>
                </div>
              </section>

              <section className={styles.detailSection}>
                <h3>AdhocX Support updates</h3>
                <ol className={styles.timeline}>
                  {selectedComplaint.updates.map((update) => (
                    <li key={update.id}>
                      <span className={styles.timelineDot} />
                      <div>
                        <div className={styles.timelineHeading}><strong>{update.role}</strong><time>{formatDate(update.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
                        <p>{update.message}</p>
                        <small>{update.author}</small>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <section className={styles.detailSection}>
                <h3>Attachments</h3>
                {selectedComplaint.attachments.length ? (
                  <ul className={styles.attachmentList}>
                    {selectedComplaint.attachments.map((file) => <li key={file}><FileImage size={16} /><span>{file}</span><small>Sample</small></li>)}
                  </ul>
                ) : <p className={styles.noAttachments}>No attachments provided.</p>}
              </section>
              <p className={styles.readOnlyNote}><Headphones size={15} /> Complaint investigation and resolution are handled by AdhocX Support.</p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
