'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Car, CheckCircle2, Map as MapIcon, Users, XCircle } from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard';
import { analyticsApi, tenantApi } from '../../lib/api/corporate';
import type { Dashboard } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';

const MAX_RANGE_DAYS = 93;
const ACTIVE_ROUTE_STATUSES = new Set(['PLANNED', 'DISPATCHING', 'ASSIGNED', 'IN_TRANSIT']);

interface DateRange {
  from: string;
  to: string;
}

interface DailyTripCount {
  date: string;
  label: string;
  trips: number;
}

interface DashboardData {
  dashboard: Dashboard;
  totalEmployees: number;
  dailyTrips: DailyTripCount[];
  activeRoutes: number;
  inactiveRoutes: number;
  assignedCabs: number;
}

function getTodayInIndia(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function createInitialRange(): DateRange {
  const today = getTodayInIndia();
  const end = new Date(`${today}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() - 6);
  return { from: end.toISOString().slice(0, 10), to: today };
}

function getDateRangeLength({ from, to }: DateRange): number | null {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (
    !from ||
    !to ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start.toISOString().slice(0, 10) !== from ||
    end.toISOString().slice(0, 10) !== to
  ) {
    return null;
  }
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

function formatDay(date: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The dashboard data could not be loaded.';
}

function DailyTripsChart({ data }: { data: DailyTripCount[] }) {
  const chartHeight = 250;
  const paddingLeft = 48;
  const paddingRight = 20;
  const paddingTop = 24;
  const paddingBottom = 54;
  const slotWidth = 76;
  const chartWidth = Math.max(640, paddingLeft + paddingRight + data.length * slotWidth);
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const maxTrips = Math.max(1, ...data.map((point) => point.trips));
  const chartMax = Math.ceil(maxTrips * 1.15);
  const baseline = paddingTop + plotHeight;
  const ticks = Array.from({ length: 5 }, (_, index) => Math.round((chartMax * index) / 4));

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <svg
        role="img"
        aria-label="Daily trip counts for the selected date range"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ display: 'block', width: '100%', minWidth: `${chartWidth}px`, height: 'auto' }}
      >
        {ticks.map((tick, index) => {
          const y = baseline - (tick / chartMax) * plotHeight;
          return (
            <g key={`${tick}-${index}`}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="var(--border-subtle, #E2E8F0)"
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-muted, #94A3B8)"
              >
                {tick}
              </text>
            </g>
          );
        })}
        {data.map((point, index) => {
          const slot = plotWidth / data.length;
          const barWidth = Math.min(34, slot * 0.58);
          const x = paddingLeft + index * slot + (slot - barWidth) / 2;
          const barHeight = (point.trips / chartMax) * plotHeight;
          const y = baseline - barHeight;
          return (
            <g key={point.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx="4"
                fill="#6366F1"
              >
                <title>{`${point.label}: ${point.trips} trips`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={Math.max(paddingTop + 12, y - 7)}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="var(--text-primary, #0F172A)"
              >
                {point.trips}
              </text>
              <text
                x={x + barWidth / 2}
                y={baseline + 18}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-muted, #64748B)"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function CompanyOverviewPage() {
  const { tenantId, status } = useSession();
  const [dateRange, setDateRange] = useState<DateRange>(createInitialRange);
  const [appliedRange, setAppliedRange] = useState<DateRange>(dateRange);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (status === 'loading') return;
    if (!tenantId) {
      setLoading(false);
      setError('A corporate tenant could not be identified. Sign in with your corporate account and try again.');
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setData(null);

    Promise.all([
      analyticsApi.dashboard({ tenantId, ...appliedRange }),
      analyticsApi.tripsReport({ tenantId, ...appliedRange }),
      tenantApi.get(tenantId),
    ])
      .then(([dashboard, report, tenant]) => {
        if (report.truncated) {
          throw new Error('The trips report exceeded its 50,000-row limit, so route and cab statistics cannot be shown accurately for this date range.');
        }
        if (report.rows.length !== dashboard.trips.total) {
          throw new Error('The trips report did not match the dashboard total. Refresh the dashboard before relying on these statistics.');
        }
        if (typeof tenant._count?.employees !== 'number') {
          throw new Error('The tenant API response did not include the employee count.');
        }

        const tripCountByDate = new Map<string, number>();
        const start = new Date(`${appliedRange.from}T00:00:00.000Z`);
        const end = new Date(`${appliedRange.to}T00:00:00.000Z`);
        for (const route of report.rows) {
          tripCountByDate.set(route.shiftDate, (tripCountByDate.get(route.shiftDate) ?? 0) + 1);
        }

        const dailyTrips: DailyTripCount[] = [];
        for (const day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
          const date = day.toISOString().slice(0, 10);
          dailyTrips.push({ date, label: formatDay(date), trips: tripCountByDate.get(date) ?? 0 });
        }

        const activeRoutes = report.rows.filter((route) => ACTIVE_ROUTE_STATUSES.has(route.status)).length;
        const assignedCabs = new Set(
          report.rows
            .map((route) => route.vehicleNumber?.trim().toUpperCase())
            .filter((vehicleNumber): vehicleNumber is string => Boolean(vehicleNumber)),
        ).size;

        if (active) {
          setData({
            dashboard,
            totalEmployees: tenant._count.employees,
            dailyTrips,
            activeRoutes,
            inactiveRoutes: dashboard.trips.total - activeRoutes,
            assignedCabs,
          });
        }
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantId, status, appliedRange, refreshKey]);

  function applyDateRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const length = getDateRangeLength(dateRange);
    if (length === null || length < 1) {
      setValidationError('Enter a valid start and end date.');
      return;
    }
    if (length > MAX_RANGE_DAYS) {
      setValidationError(`Choose a date range of ${MAX_RANGE_DAYS} days or fewer.`);
      return;
    }
    setValidationError(null);
    setAppliedRange({ ...dateRange });
  }

  const counts = data?.dashboard.trips.byStatus;
  const totalRoutes = data?.dashboard.trips.total;
  const metrics = [
    { label: 'Total Employees', value: data?.totalEmployees, icon: <Users size={18} />, color: '#5728B2' },
    { label: 'Total Routes', value: totalRoutes, icon: <MapIcon size={18} />, color: '#8B5CF6' },
    { label: 'Active Trips', value: counts?.IN_TRANSIT, icon: <Car size={18} />, color: '#16A34A' },
    { label: 'Completed Trips', value: counts?.COMPLETED, icon: <CheckCircle2 size={18} />, color: '#059669' },
    { label: 'Cancelled Trips', value: counts?.CANCELLED, icon: <XCircle size={18} />, color: '#DC2626' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Corporate Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Employee and transportation statistics for the selected date range
          </p>
        </div>

        <form onSubmit={applyDateRange} style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
          <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            From
            <input
              aria-label="Start date"
              type="date"
              required
              value={dateRange.from}
              onChange={(event) => {
                setDateRange((current) => ({ ...current, from: event.target.value }));
                setValidationError(null);
              }}
              style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '9px 10px', color: 'var(--text-primary)', background: 'var(--bg-surface, #fff)' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            To
            <input
              aria-label="End date"
              type="date"
              required
              value={dateRange.to}
              onChange={(event) => {
                setDateRange((current) => ({ ...current, to: event.target.value }));
                setValidationError(null);
              }}
              style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '9px 10px', color: 'var(--text-primary)', background: 'var(--bg-surface, #fff)' }}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            style={{ border: 0, borderRadius: '8px', padding: '10px 14px', background: '#5728B2', color: '#fff', fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            <CalendarDays size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            Apply
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setRefreshKey((key) => key + 1)}
            style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '9px 12px', background: 'var(--bg-surface, #fff)', color: 'var(--text-primary)', fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}
          >
            Refresh
          </button>
        </form>
      </div>

      {validationError && (
        <p role="alert" style={{ margin: 0, color: '#B91C1C', fontSize: '13px' }}>{validationError}</p>
      )}

      {error && (
        <div role="alert" className="surface-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', color: '#B91C1C', borderColor: '#FECACA' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            style={{ marginLeft: 'auto', border: '1px solid #FECACA', borderRadius: '6px', padding: '6px 10px', background: '#fff', color: '#B91C1C', fontWeight: 600, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <p role="status" style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Loading dashboard statistics…</p>
      )}

      <div className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={loading ? '—' : metric.value?.toLocaleString() ?? '—'}
            icon={metric.icon}
            highlightColor={metric.color}
          />
        ))}
      </div>

      <section className="surface-card" style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {getDateRangeLength(appliedRange) === 7 ? 'Last 7 Days Trip Frequency' : 'Trip Frequency'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Daily trip counts for {appliedRange.from} to {appliedRange.to}
          </p>
        </div>
        {loading ? (
          <p role="status" style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>Loading daily trip counts…</p>
        ) : data?.dailyTrips.some((day) => day.trips > 0) ? (
          <DailyTripsChart data={data.dailyTrips} />
        ) : !error ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>No trips were recorded for the selected date range.</p>
        ) : null}
      </section>

      <section className="surface-card" style={{ padding: '20px 24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Route and Cab Statistics</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Route statuses and distinct assigned cabs for the selected date range
          </p>
        </div>
        {loading ? (
          <p role="status" style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>Loading route and cab statistics…</p>
        ) : data ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            {[
              ['Total Routes', totalRoutes],
              ['Active Routes', data.activeRoutes],
              ['Inactive Routes', data.inactiveRoutes],
              ['Cabs Assigned to Routes', data.assignedCabs],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '14px 16px', border: '1px solid var(--border-subtle)', borderRadius: '10px', background: 'var(--bg-surface, #fff)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</div>
                <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {typeof value === 'number' ? value.toLocaleString() : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : !error ? (
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>No route or cab data is available for the selected date range.</p>
        ) : null}
      </section>
    </div>
  );
}
