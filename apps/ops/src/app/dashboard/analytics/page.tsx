'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Clock3, Gauge, RefreshCw, Timer } from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { Button } from '../../../components/common/Button';
import { buildMockAnalytics, readMockDatabase, refreshMockDatabase, type MockOpsDatabase } from '../../../lib/mock-ops-db';

const today = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const daysAgo = (days: number) => new Date(Date.now() + 330 * 60_000 - days * 86_400_000).toISOString().slice(0, 10);

function formatDisplayDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}

function parseDisplayDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  ) return null;
  return `${year}-${month}-${day}`;
}

export default function OperationsAnalyticsPage() {
  const [database, setDatabase] = useState<MockOpsDatabase | null>(null);
  const [tenantId, setTenantId] = useState('ALL');
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(today());
  const [fromInput, setFromInput] = useState(() => formatDisplayDate(daysAgo(6)));
  const [toInput, setToInput] = useState(() => formatDisplayDate(today()));
  const [shiftTime, setShiftTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setDatabase(readMockDatabase());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load operations analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const tenants = database?.tenants ?? [];

  function commitFromDate() {
    const parsed = parseDisplayDate(fromInput);
    if (!parsed || parsed > to) {
      setError(parsed ? 'From date must be on or before the To date.' : 'Enter From date as dd/mm/yyyy.');
      setFromInput(formatDisplayDate(from));
      return;
    }
    setFrom(parsed);
    setError('');
  }

  function commitToDate() {
    const parsed = parseDisplayDate(toInput);
    if (!parsed || parsed < from) {
      setError(parsed ? 'To date must be on or after the From date.' : 'Enter To date as dd/mm/yyyy.');
      setToInput(formatDisplayDate(to));
      return;
    }
    setTo(parsed);
    setError('');
  }

  const data = useMemo(() => {
    if (!database || from > to) return null;
    return buildMockAnalytics(database, {
      tenantId: tenantId === 'ALL' ? undefined : tenantId,
      from,
      to,
      shiftTime: shiftTime || undefined,
    });
  }, [database, from, shiftTime, tenantId, to]);

  function loadAnalytics() {
    setLoading(true);
    setError('');
    try {
      if (from > to) throw new Error('Start date must be on or before end date.');
      setDatabase(refreshMockDatabase());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh operations analytics.');
    } finally {
      setLoading(false);
    }
  }

  const scheduled = data?.trips.total ?? 0;
  const fulfilled = (data?.trips.byStatus.ASSIGNED ?? 0) + (data?.trips.byStatus.IN_TRANSIT ?? 0) + (data?.trips.byStatus.COMPLETED ?? 0);
  const fulfillmentRate = scheduled > 0 ? Math.round((fulfilled * 1000) / scheduled) / 10 : null;
  const chartMax = Math.max(1, ...(data?.dailyTrips.map((day) => day.scheduled) ?? []));
  const rangeLabel = useMemo(() => `${from} to ${to}`, [from, to]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="h1-text" style={{ color: 'var(--text-primary)' }}>Operations Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Delivery, service quality, demand coverage, and fleet efficiency · {rangeLabel}
          </p>
        </div>
        <Button size="md" variant="outline" leftIcon={<RefreshCw size={14} />} onClick={loadAnalytics} isLoading={loading}>
          Refresh
        </Button>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, padding: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg, 10px)' }}>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>CLIENT
          <select value={tenantId} onChange={(event) => setTenantId(event.target.value)} style={filterStyle}>
            <option value="ALL">All clients</option>
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>FROM
          <input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            aria-label="From date (dd/mm/yyyy)"
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
            onBlur={commitFromDate}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            style={filterStyle}
          />
        </label>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>TO
          <input
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            aria-label="To date (dd/mm/yyyy)"
            value={toInput}
            onChange={(event) => setToInput(event.target.value)}
            onBlur={commitToDate}
            onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
            style={filterStyle}
          />
        </label>
        <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>SHIFT
          <select value={shiftTime} onChange={(event) => setShiftTime(event.target.value)} style={filterStyle}>
            <option value="">All shifts</option>
            {['05:00', '08:00', '09:00', '17:00', '18:00', '20:00'].map((time) => <option key={time} value={time}>{time}</option>)}
          </select>
        </label>
      </section>

      {error && <div role="alert" style={{ color: 'var(--color-danger, #DC2626)', fontSize: 13 }}>{error}</div>}

      <div className="metric-grid">
        <MetricCard label="On-Time Pickup" value={loading ? '—' : data?.punctuality.onTimePct === null || !data ? '—' : `${data.punctuality.onTimePct}%`} subtext="Measured boarded pickups" icon={<Clock3 size={18} />} highlightColor="#16A34A" />
        <MetricCard label="Average Delay" value={loading ? '—' : data?.punctuality.avgDelayMinutes === null || !data ? '—' : `${data.punctuality.avgDelayMinutes} min`} subtext="Late pickup minutes" icon={<Timer size={18} />} highlightColor="#F59E0B" />
        <MetricCard label="Fulfillment Rate" value={loading ? '—' : fulfillmentRate === null ? '—' : `${fulfillmentRate}%`} subtext={`${fulfilled} covered of ${scheduled} scheduled routes`} icon={<Activity size={18} />} highlightColor="#5728B2" />
        <MetricCard label="Fleet / Seat Utilization" value={loading ? '—' : data?.seatUtilisation.pct === null || !data ? '—' : `${data.seatUtilisation.pct}%`} subtext={`${data?.seatUtilisation.assignedSeats ?? 0} / ${data?.seatUtilisation.capacitySeats ?? 0} seats on completed routes`} icon={<Gauge size={18} />} highlightColor="#0284C7" />
      </div>

      <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg, 10px)', padding: '20px 24px', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
          <BarChart3 size={18} color="var(--brand-blue-500, #5728B2)" />
          <h2 style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)' }}>Scheduled vs. Completed Trips</h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 20px' }}>Daily route delivery trend for the selected client, date range, and shift.</p>
        {loading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading daily trip data…</p> : !data?.dailyTrips.length ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No trip data for the selected filters.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'end', gap: 12, minHeight: 220, overflowX: 'auto', padding: '8px 0' }}>
            {data.dailyTrips.map((day) => (
              <div key={day.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, minWidth: 42, flex: 1, height: 210, justifyContent: 'end' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{day.scheduled} / {day.completed}</span>
                <div style={{ display: 'flex', alignItems: 'end', gap: 4, height: 160, width: '100%', justifyContent: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div title={`Scheduled: ${day.scheduled}`} style={{ width: '35%', height: `${Math.max(3, (day.scheduled / chartMax) * 100)}%`, background: '#8B5CF6', borderRadius: '4px 4px 0 0' }} />
                  <div title={`Completed: ${day.completed}`} style={{ width: '35%', height: `${Math.max(3, (day.completed / chartMax) * 100)}%`, background: '#16A34A', borderRadius: '4px 4px 0 0' }} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{day.date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 18, fontSize: 11, color: 'var(--text-secondary)', marginTop: 14 }}>
          <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#8B5CF6', marginRight: 6 }} />Scheduled</span>
          <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#16A34A', marginRight: 6 }} />Completed</span>
        </div>
      </section>
    </div>
  );
}

const filterStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: 38,
  marginTop: 5,
  padding: '0 10px',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md, 8px)',
  background: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 13,
};
