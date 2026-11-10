'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api/client';
import { TripFrequencyReport } from '../../lib/api/types';

interface DailyTripFrequency {
  date: string;
  count: number;
}

interface TripFrequencyPanelProps {
  title: string;
  data: DailyTripFrequency[];
  showWeekday: boolean;
  onSelectDay?: (date: string) => void;
  selectedDate?: string | null;
}

const chartWidth = 680;
const chartHeight = 220;
const padding = { top: 16, right: 12, bottom: 38, left: 44 };

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

function formatTime(dateTime: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(dateTime));
}

function getIndiaDateInputValue() {
  const dateParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const parts = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getMondayDateKey(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const monday = new Date(0);
  monday.setUTCFullYear(year, month - 1, day);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function formatWeekRange(start: string, end: string) {
  return `${formatDate(start, { month: 'short', day: 'numeric' })} – ${formatDate(end, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

function TripFrequencyPanel({ title, data, showWeekday, onSelectDay, selectedDate }: TripFrequencyPanelProps) {
  const total = data.reduce((sum, day) => sum + day.count, 0);
  const chartAreaWidth = chartWidth - padding.left - padding.right;
  const chartAreaHeight = chartHeight - padding.top - padding.bottom;
  const maxCount = Math.max(3, ...data.map((day) => day.count));
  const ticks = [0, Math.ceil(maxCount / 2), maxCount];
  const slotWidth = chartAreaWidth / data.length;
  const labelStep = data.length <= 7 ? 1 : 5;
  const points = data.map((day, index) => ({
    x: padding.left + index * slotWidth + slotWidth / 2,
    y: padding.top + chartAreaHeight - (day.count / maxCount) * chartAreaHeight,
  }));
  const linePath = points
    .map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x},${y}`)
    .join(' ');

  return (
    <section
      style={{
        minWidth: 0,
        padding: '1.25rem',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Number of trips created per day; this is not a unique-cab count.
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '1.5rem', lineHeight: 1.1, fontWeight: 900, color: 'var(--brand-primary)' }}>
            {total.toLocaleString()}
          </div>
          <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>total trips</div>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: data.length > 10 ? 'auto' : 'hidden', marginTop: '1rem' }}>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`${title}: ${total} total trips`}
          style={{ display: 'block', width: '100%', minWidth: data.length > 10 ? 480 : undefined, height: 'auto' }}
        >
          {ticks.map((tick, index) => {
            const y = padding.top + chartAreaHeight - (tick / maxCount) * chartAreaHeight;
            return (
              <g key={`${tick}-${index}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray={tick === 0 ? undefined : '4 4'}
                />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
                  {tick}
                </text>
              </g>
            );
          })}

          {data.map((day, index) => {
            const point = points[index];
            const shouldShowLabel = index % labelStep === 0 || index === data.length - 1;
            const label = showWeekday
              ? formatDate(day.date, { weekday: 'short' })
              : formatDate(day.date, { day: 'numeric' });
            const isSelected = selectedDate === day.date;

            return (
              <g
                key={day.date}
                role={onSelectDay ? 'button' : undefined}
                tabIndex={onSelectDay ? 0 : undefined}
                aria-label={onSelectDay ? `${formatDate(day.date, { dateStyle: 'medium' })}: ${day.count} trips` : undefined}
                aria-pressed={onSelectDay ? isSelected : undefined}
                onClick={onSelectDay ? () => onSelectDay(day.date) : undefined}
                onKeyDown={
                  onSelectDay
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectDay(day.date);
                        }
                      }
                    : undefined
                }
                style={onSelectDay ? { cursor: 'pointer', outline: 'none' } : undefined}
              >
                <rect
                  x={point.x - slotWidth / 2}
                  y={padding.top}
                  width={slotWidth}
                  height={chartAreaHeight}
                  fill="transparent"
                  pointerEvents={onSelectDay ? 'all' : 'none'}
                >
                  <title>{`${formatDate(day.date, { dateStyle: 'medium' })}: ${day.count} trips`}</title>
                </rect>
                {shouldShowLabel && (
                  <text
                    x={point.x}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill={isSelected ? 'var(--brand-secondary)' : 'var(--text-muted)'}
                    fontWeight={isSelected ? 800 : 400}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
          <path
            d={linePath}
            fill="none"
            stroke="var(--brand-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
          {points.map((point, index) => (
            <circle
              key={`point-${data[index].date}`}
              cx={point.x}
              cy={point.y}
              r={selectedDate === data[index].date ? 5 : 3.5}
              fill={selectedDate === data[index].date ? 'var(--brand-secondary)' : 'var(--brand-primary)'}
              pointerEvents="none"
            />
          ))}
        </svg>
      </div>
    </section>
  );
}

function TripStatusBars({ statuses }: { statuses: TripFrequencyReport['statusBreakdown'] }) {
  const maxCount = Math.max(1, ...statuses.map(({ count }) => count));

  if (statuses.length === 0) return null;

  return (
    <div
      aria-label="Trips by status"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem 1.25rem',
        marginTop: '1rem',
        padding: '0.85rem 1rem',
        background: 'var(--bg-canvas)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {statuses.map(({ status, count }) => (
        <div key={status} style={{ flex: '1 1 130px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {status.replaceAll('_', ' ')}
            </span>
            <strong style={{ fontSize: '0.7rem', color: 'var(--text-primary)' }}>{count.toLocaleString()}</strong>
          </div>
          <div
            role="img"
            aria-label={`${status.replaceAll('_', ' ')}: ${count} trips`}
            style={{ height: '0.45rem', overflow: 'hidden', background: 'var(--border-subtle)', borderRadius: 'var(--radius-pill)' }}
          >
            <div
              style={{
                width: `${(count / maxCount) * 100}%`,
                height: '100%',
                background: 'var(--brand-primary)',
                borderRadius: 'inherit',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TripDayReport({ report, loading, error }: { report: TripFrequencyReport | null; loading: boolean; error: string | null }) {
  if (loading) {
    return <p aria-live="polite" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Loading selected-day report…</p>;
  }
  if (error) {
    return <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.8125rem' }}>{error}</p>;
  }
  if (!report?.selectedDay || !report.selectedDayTrips) return null;

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Report for {formatDate(report.selectedDay, { dateStyle: 'long' })}
        </h4>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {report.selectedDayTotal} {report.selectedDayTotal === 1 ? 'trip' : 'trips'}
          {report.selectedDayTotal !== null && report.selectedDayTotal > report.selectedDayTrips.length
            ? ` · showing latest ${report.selectedDayTrips.length}`
            : ''}
        </span>
      </div>
      {report.selectedDayTrips.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No trips were created on this day.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {report.selectedDayTrips.map((trip) => (
            <div
              key={trip.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: '0.25rem 1rem',
                padding: '0.75rem',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                {trip.pickupAddress} → {trip.dropAddress}
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{trip.status.replaceAll('_', ' ')}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {trip.driver.fullName} · {trip.vehicleType}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {formatTime(trip.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripFrequencyCharts() {
  const today = new Date();
  const [weeklyAnchorDate, setWeeklyAnchorDate] = useState(getIndiaDateInputValue);
  const [weeklySelectedDate, setWeeklySelectedDate] = useState<string | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<TripFrequencyReport | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklyDayLoading, setWeeklyDayLoading] = useState(false);
  const [weeklyDayError, setWeeklyDayError] = useState<string | null>(null);
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<TripFrequencyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayReportLoading, setDayReportLoading] = useState(false);
  const [dayReportError, setDayReportError] = useState<string | null>(null);

  const selectedWeekStart = getMondayDateKey(weeklyAnchorDate);
  const selectedWeekEndDate = new Date(`${selectedWeekStart}T00:00:00Z`);
  selectedWeekEndDate.setUTCDate(selectedWeekEndDate.getUTCDate() + 6);
  const selectedWeek = {
    start: selectedWeekStart,
    end: selectedWeekEndDate.toISOString().slice(0, 10),
  };

  useEffect(() => {
    if (!selectedWeekStart) return;
    let active = true;
    setWeeklyLoading(true);
    setWeeklyError(null);
    setWeeklyReport(null);
    setWeeklySelectedDate(null);

    adminApi
      .getWeeklyTripFrequencyReport(selectedWeekStart)
      .then((report) => {
        if (active) setWeeklyReport(report);
      })
      .catch(() => {
        if (active) setWeeklyError('Could not load the trip report for this week. Please try again.');
      })
      .finally(() => {
        if (active) setWeeklyLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedWeekStart]);

  useEffect(() => {
    if (!weeklySelectedDate || !selectedWeekStart) return;
    let active = true;
    setWeeklyDayLoading(true);
    setWeeklyDayError(null);

    adminApi
      .getWeeklyTripFrequencyReport(selectedWeekStart, weeklySelectedDate)
      .then((report) => {
        if (active) setWeeklyReport(report);
      })
      .catch(() => {
        if (active) setWeeklyDayError('Could not load the selected day report. Please try again.');
      })
      .finally(() => {
        if (active) setWeeklyDayLoading(false);
      });

    return () => {
      active = false;
    };
  }, [weeklySelectedDate, selectedWeekStart]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setMonthlyReport(null);
    setSelectedDate(null);

    adminApi
      .getTripFrequencyReport(year, month)
      .then((report) => {
        if (active) setMonthlyReport(report);
      })
      .catch(() => {
        if (active) setError('Could not load the trip report for this month. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [year, month]);

  useEffect(() => {
    if (!selectedDate) return;
    let active = true;
    setDayReportLoading(true);
    setDayReportError(null);
    const day = Number(selectedDate.slice(-2));

    adminApi
      .getTripFrequencyReport(year, month, day)
      .then((report) => {
        if (active) setMonthlyReport(report);
      })
      .catch(() => {
        if (active) setDayReportError('Could not load the selected day report. Please try again.');
      })
      .finally(() => {
        if (active) setDayReportLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedDate, year, month]);

  const weeklyTrips = weeklyReport?.dailyTrips ?? [];
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(undefined, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, index, 1))),
  );
  const monthlyTrips = monthlyReport?.dailyTrips ?? [];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '1rem',
      }}
    >
      <section
        style={{
          minWidth: 0,
          padding: '1.25rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Weekly Cab Usage</h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Daily trip counts for Monday through Sunday. Select a bar for that day&apos;s trips.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              <span>Choose date</span>
              <input
                aria-label="Choose date for weekly cab usage"
                type="date"
                value={weeklyAnchorDate}
                max={getIndiaDateInputValue()}
                onChange={(event) => {
                  if (event.target.value) setWeeklyAnchorDate(event.target.value);
                }}
                style={{
                  padding: '0.4rem 0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Cab trips this week</div>
            <div aria-live="polite" style={{ marginTop: '0.2rem', color: 'var(--brand-primary)', fontSize: '1.15rem', fontWeight: 900 }}>
              {weeklyLoading ? '…' : (weeklyReport?.totalTrips ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
        {!weeklyLoading && weeklyReport && <TripStatusBars statuses={weeklyReport.statusBreakdown} />}

        {weeklyError ? (
          <p role="alert" style={{ marginTop: '1rem', color: 'var(--color-error)', fontSize: '0.8125rem' }}>{weeklyError}</p>
        ) : weeklyLoading ? (
          <p aria-live="polite" style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Loading weekly trip report…</p>
        ) : selectedWeek ? (
          <>
            <div style={{ width: '100%', overflowX: 'auto', marginTop: '1rem' }}>
              <div style={{ minWidth: 420 }}>
                <TripFrequencyPanel
                  title={`Trips ${formatWeekRange(selectedWeek.start, selectedWeek.end)}`}
                  data={weeklyTrips}
                  showWeekday
                  onSelectDay={setWeeklySelectedDate}
                  selectedDate={weeklySelectedDate}
                />
              </div>
            </div>
            <TripDayReport report={weeklyReport} loading={weeklyDayLoading} error={weeklyDayError} />
          </>
        ) : null}
      </section>
      <section
        style={{
          minWidth: 0,
          padding: '1.25rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Monthly Trip Report</h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Select a month and year; select a bar for its trip report.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              <span>Month</span>
              <select
                aria-label="Report month"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                style={{
                  padding: '0.4rem 0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                }}
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>{name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
              <span>Year</span>
              <input
                aria-label="Report year"
                type="number"
                min={1}
                max={9999}
                step={1}
                value={year}
                onChange={(event) => {
                  if (event.target.value === '') return;
                  const nextYear = Number(event.target.value);
                  if (Number.isInteger(nextYear) && nextYear >= 1 && nextYear <= 9999) setYear(nextYear);
                }}
                style={{
                  width: '5.5rem',
                  padding: '0.4rem 0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ padding: '0.65rem 0.85rem', background: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Trips this month</div>
            <div aria-live="polite" style={{ marginTop: '0.2rem', color: 'var(--brand-primary)', fontSize: '1.15rem', fontWeight: 900 }}>
              {loading ? '…' : (monthlyReport?.totalTrips ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
        {error ? (
          <p role="alert" style={{ marginTop: '1rem', color: 'var(--color-error)', fontSize: '0.8125rem' }}>{error}</p>
        ) : loading ? (
          <p aria-live="polite" style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Loading monthly trip report…</p>
        ) : (
          <>
            <div style={{ width: '100%', overflowX: 'auto', marginTop: '1rem' }}>
              <div style={{ minWidth: 480 }}>
                <TripFrequencyPanel
                  title={`${monthNames[month - 1]} ${year}`}
                  data={monthlyTrips}
                  showWeekday={false}
                  onSelectDay={setSelectedDate}
                  selectedDate={selectedDate}
                />
              </div>
            </div>
            <TripDayReport report={monthlyReport} loading={dayReportLoading} error={dayReportError} />
          </>
        )}
      </section>
    </div>
  );
}
