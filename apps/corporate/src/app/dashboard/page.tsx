'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertOctagon, Calendar, Car, CheckCircle2, ChevronDown, RefreshCw, Users } from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard';
import { DonutChart } from '../../components/charts/DonutChart';
import { AreaTrendChart } from '../../components/charts/AreaTrendChart';
import { analyticsApi, employeeApi } from '../../lib/api/corporate';
import type { Dashboard, Office } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';

interface DateRange {
  from: string;
  to: string;
}

interface TrendPoint {
  day: string;
  trips: number;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function getIstDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dateRangeLength(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86400000) + 1;
}

function formatDateRangeLabel({ from, to }: DateRange): string {
  const today = getIstDate(new Date());
  if (to === today && dateRangeLength(from, to) === 7) return 'Last 7 Days';
  return `${DATE_FORMATTER.format(new Date(`${from}T00:00:00.000Z`))} - ${DATE_FORMATTER.format(new Date(`${to}T00:00:00.000Z`))}`;
}

function formatDateLabel(date: string): string {
  return DATE_FORMATTER.format(new Date(`${date}T00:00:00.000Z`));
}

function buildTripsTrend(rows: Array<{ shiftDate: string }>, { from, to }: DateRange): TrendPoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.shiftDate, (counts.get(row.shiftDate) ?? 0) + 1);
  }

  const trend: TrendPoint[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    trend.push({ day: formatDateLabel(date), trips: counts.get(date) ?? 0 });
  }
  return trend;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}

interface OverviewFiltersProps {
  offices: Office[];
  selectedOfficeId: string;
  onOfficeChange: (officeId: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
  loading: boolean;
}

function OverviewFilters({
  offices,
  selectedOfficeId,
  onOfficeChange,
  dateRange,
  onDateRangeChange,
  onRefresh,
  loading,
}: OverviewFiltersProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(dateRange.from);
  const [draftTo, setDraftTo] = useState(dateRange.to);
  const [dateError, setDateError] = useState<string | null>(null);

  const selectStyle: React.CSSProperties = {
    appearance: 'none',
    backgroundColor: 'var(--bg-surface, #FFFFFF)',
    border: '1px solid var(--border-subtle, #E2E8F0)',
    borderRadius: 'var(--radius-md, 6px)',
    padding: '7px 32px 7px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary, #475569)',
    cursor: 'pointer',
    boxShadow: 'var(--shadow-xs)',
    outline: 'none',
  };

  const handleDateOpen = () => {
    setDraftFrom(dateRange.from);
    setDraftTo(dateRange.to);
    setDateError(null);
    setDatePickerOpen((open) => !open);
  };

  const handleDateApply = () => {
    if (!draftFrom || !draftTo || draftFrom > draftTo) {
      setDateError('Choose a valid start and end date.');
      return;
    }
    if (dateRangeLength(draftFrom, draftTo) > 93) {
      setDateError('Date ranges cannot exceed 93 days.');
      return;
    }
    onDateRangeChange({ from: draftFrom, to: draftTo });
    setDatePickerOpen(false);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative' }}>
        <select
          aria-label="Office"
          value={selectedOfficeId}
          onChange={(event) => onOfficeChange(event.target.value)}
          style={selectStyle}
        >
          <option value="">All Offices</option>
          {offices.map((office) => (
            <option key={office.id} value={office.id}>
              {office.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          color="var(--text-muted, #64748B)"
          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
      </div>

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          aria-label="Choose date range"
          aria-expanded={datePickerOpen}
          onClick={handleDateOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-surface, #FFFFFF)',
            border: '1px solid var(--border-subtle, #E2E8F0)',
            borderRadius: 'var(--radius-md, 6px)',
            padding: '7px 12px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-secondary, #475569)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <Calendar size={13} color="var(--text-muted, #64748B)" />
          <span>{formatDateRangeLabel(dateRange)}</span>
          <ChevronDown size={14} color="var(--text-muted, #64748B)" />
        </button>
        {datePickerOpen && (
          <div
            style={{
              position: 'absolute',
              zIndex: 10,
              top: 'calc(100% + 8px)',
              right: 0,
              width: 260,
              padding: 14,
              display: 'grid',
              gap: 10,
              backgroundColor: 'var(--bg-surface, #FFFFFF)',
              border: '1px solid var(--border-subtle, #E2E8F0)',
              borderRadius: 'var(--radius-md, 6px)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
              From
              <input
                type="date"
                value={draftFrom}
                max={draftTo}
                onChange={(event) => setDraftFrom(event.target.value)}
                style={selectStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
              To
              <input
                type="date"
                value={draftTo}
                min={draftFrom}
                onChange={(event) => setDraftTo(event.target.value)}
                style={selectStyle}
              />
            </label>
            {dateError && (
              <div role="alert" style={{ fontSize: 12, color: 'var(--color-danger, #DC2626)' }}>
                {dateError}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={() => setDatePickerOpen(false)}
                style={{ ...selectStyle, padding: '7px 10px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDateApply}
                style={{
                  ...selectStyle,
                  padding: '7px 10px',
                  color: '#FFFFFF',
                  backgroundColor: 'var(--brand-primary, #5728B2)',
                  borderColor: 'var(--brand-primary, #5728B2)',
                }}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--brand-primary, #5728B2)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 'var(--radius-md, 6px)',
          padding: '7px 14px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          boxShadow: '0 1px 2px rgba(87, 40, 178,0.2)',
          opacity: loading ? 0.8 : 1,
        }}
      >
        <RefreshCw size={12} className={loading ? 'spin' : ''} />
        <span>Refresh</span>
      </button>
    </div>
  );
}

export default function CompanyOverviewPage() {
  const { tenantId, offices, status: sessionStatus } = useSession();
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const to = getIstDate(new Date());
    return { from: addDays(to, -6), to };
  });
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const activeOfficeId = offices.some((office) => office.id === selectedOfficeId) ? selectedOfficeId : '';
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [tripsTrend, setTripsTrend] = useState<TrendPoint[] | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const loadData = useCallback(async () => {
    if (!tenantId) return;

    const currentRequestId = ++requestId.current;
    setLoading(true);
    setDashboard(null);
    setTotalEmployees(null);
    setTripsTrend(null);
    setDashboardError(null);
    setEmployeesError(null);
    setTrendError(null);

    const params = {
      tenantId,
      officeId: activeOfficeId || undefined,
      from: dateRange.from,
      to: dateRange.to,
    };

    const [dashboardResult, employeesResult, reportResult] = await Promise.allSettled([
      analyticsApi.dashboard(params),
      employeeApi.list(tenantId, {
        officeId: activeOfficeId || undefined,
        page: 1,
        limit: 1,
      }),
      analyticsApi.tripsReport(params),
    ]);

    if (requestId.current !== currentRequestId) return;

    if (dashboardResult.status === 'fulfilled') {
      setDashboard(dashboardResult.value);
    } else {
      setDashboardError(errorMessage(dashboardResult.reason));
    }

    if (employeesResult.status === 'fulfilled') {
      setTotalEmployees(employeesResult.value.pagination.total);
    } else {
      setEmployeesError(errorMessage(employeesResult.reason));
    }

    if (reportResult.status === 'fulfilled') {
      if (reportResult.value.truncated) {
        setTrendError('The trips report is too large to display completely. Choose a shorter date range.');
      } else {
        setTripsTrend(buildTripsTrend(reportResult.value.rows, dateRange));
      }
    } else {
      setTrendError(errorMessage(reportResult.reason));
    }

    setLoading(false);
  }, [activeOfficeId, dateRange, tenantId]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!tenantId) {
      setLoading(false);
      setDashboardError('A corporate tenant could not be determined for this account.');
      setEmployeesError('A corporate tenant could not be determined for this account.');
      setTrendError('A corporate tenant could not be determined for this account.');
      return;
    }

    void loadData();
    return () => {
      requestId.current += 1;
    };
  }, [loadData, sessionStatus, tenantId]);

  const statusCounts = dashboard?.trips.byStatus ?? {};
  const completedCount = statusCounts.COMPLETED ?? 0;
  const activeCount = (statusCounts.DISPATCHING ?? 0) + (statusCounts.ASSIGNED ?? 0) + (statusCounts.IN_TRANSIT ?? 0);
  const scheduledTripsCount = dashboard?.trips.total ?? 0;
  const unservedTripsCount = dashboard?.requests.unserved ?? 0;
  const cancelledCount = statusCounts.CANCELLED ?? 0;
  const plannedCount = statusCounts.PLANNED ?? 0;

  const tripStatusBreakdown = [
    { label: 'Completed', count: completedCount, color: '#16A34A' },
    { label: 'In Progress', count: activeCount, color: '#5728B2' },
    { label: 'Planned', count: plannedCount, color: '#8B5CF6' },
    { label: 'Cancelled', count: cancelledCount, color: '#94A3B8' },
  ].map((segment) => ({
    ...segment,
    pct: scheduledTripsCount > 0 ? Math.round((segment.count / scheduledTripsCount) * 100) : 0,
  }));

  const metricValue = (value: number | null, error: string | null) => {
    if (value !== null) return value.toLocaleString();
    if (loading) return 'Loading...';
    return error ? 'Unavailable' : '—';
  };

  const chartMessageStyle: React.CSSProperties = {
    minHeight: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    fontSize: 13,
    color: 'var(--text-secondary)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title & Filter Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Company Overview
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Real-time view of your employee transportation operations
          </p>
        </div>

        <OverviewFilters
          offices={offices}
          selectedOfficeId={activeOfficeId}
          onOfficeChange={setSelectedOfficeId}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={() => void loadData()}
          loading={loading}
        />
      </div>

      {(dashboardError || employeesError) && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-danger-bg, #FEF2F2)',
            color: 'var(--color-danger, #DC2626)',
            fontSize: 13,
          }}
        >
          {dashboardError && <div>Dashboard data could not be loaded: {dashboardError}</div>}
          {employeesError && <div>Employee count could not be loaded: {employeesError}</div>}
        </div>
      )}

      {/* 5 KPI Summary Cards */}
      <div className="metric-grid">
        <MetricCard
          label="Total Employees"
          value={metricValue(totalEmployees, employeesError)}
          icon={<Users size={18} />}
          highlightColor="#5728B2"
        />
        <MetricCard
          label="Scheduled Trips"
          value={metricValue(dashboard ? scheduledTripsCount : null, dashboardError)}
          icon={<Calendar size={18} />}
          highlightColor="#8B5CF6"
        />
        <MetricCard
          label="Active Trips"
          value={metricValue(dashboard ? activeCount : null, dashboardError)}
          icon={<Car size={18} />}
          highlightColor="#16A34A"
        />
        <MetricCard
          label="Completed Trips"
          value={metricValue(dashboard ? completedCount : null, dashboardError)}
          icon={<CheckCircle2 size={18} />}
          highlightColor="#059669"
        />
        <MetricCard
          label="Unserved Trips"
          value={metricValue(dashboard ? unservedTripsCount : null, dashboardError)}
          icon={<AlertOctagon size={18} />}
          highlightColor="#DC2626"
        />
      </div>

      {/* Middle Grid: Trip Status Donut + Trips Trend Area Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
        {/* Left: Trip Status */}
        <div className="surface-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Trip Status
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Route breakdown across completed, in-progress, planned and cancelled trips
              </p>
            </div>
          </div>

          {dashboard ? (
            scheduledTripsCount > 0 ? (
              <DonutChart
                totalLabel="Total Trips"
                totalValue={scheduledTripsCount.toLocaleString()}
                segments={tripStatusBreakdown}
                size={180}
                thickness={22}
              />
            ) : (
              <div style={chartMessageStyle}>No trip data for the selected filters.</div>
            )
          ) : (
            <div role={dashboardError ? 'alert' : 'status'} style={chartMessageStyle}>
              {dashboardError ? 'Trip status could not be loaded.' : 'Loading trip status...'}
            </div>
          )}
        </div>

        {/* Right: Trips Trend */}
        <div className="surface-card" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Trips Trend
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Daily trip volume for the selected date range
              </p>
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#5728B2',
                backgroundColor: '#EFF6FF',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid #BFDBFE',
              }}
            >
              Trips ▾
            </span>
          </div>

          {trendError ? (
            <div role="alert" style={chartMessageStyle}>Trips trend could not be loaded: {trendError}</div>
          ) : tripsTrend === null ? (
            <div role="status" style={chartMessageStyle}>Loading trips trend...</div>
          ) : tripsTrend.every((point) => point.trips === 0) ? (
            <div style={chartMessageStyle}>No trip data for the selected filters.</div>
          ) : tripsTrend.length < 2 ? (
            <div style={chartMessageStyle}>Select a range of at least two days to view the trend.</div>
          ) : (
            <AreaTrendChart
              data={tripsTrend}
              height={200}
              lineColor="#6366F1"
              metricLabel="Trips"
            />
          )}
        </div>
      </div>
    </div>
  );
}
