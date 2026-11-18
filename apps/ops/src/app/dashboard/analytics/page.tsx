'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Clock3, Gauge, RefreshCw, Timer } from 'lucide-react';
import { opsApi } from '../../../lib/api/opsClient';
import type { CorporateTenantOption, OperationsAnalyticsDashboard } from '../../../lib/api/opsTypes';
import { MetricCard } from '../../../components/common/MetricCard';
import { Button } from '../../../components/common/Button';

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

function emptyAnalytics(from: string, to: string, shiftTime: string): OperationsAnalyticsDashboard {
  return {
    asOf: new Date().toISOString(),
    filter: { tenantId: 'ALL', from, to, shiftTime: shiftTime || null, timezone: 'Asia/Kolkata' },
    trips: { total: 0, byStatus: {} },
    employeesServed: 0,
    requests: { total: 0, byStatus: {}, cancelled: 0, noShows: 0, unserved: 0 },
    punctuality: { measuredStops: 0, onTimePickups: 0, latePickups: 0, onTimePct: null, avgDelayMinutes: null },
    seatUtilisation: { completedRoutes: 0, assignedSeats: 0, capacitySeats: 0, pct: null },
    dailyTrips: [],
  };
}

function mergeAnalytics(
  results: OperationsAnalyticsDashboard[],
  from: string,
  to: string,
  shiftTime: string,
): OperationsAnalyticsDashboard {
  if (results.length === 0) return emptyAnalytics(from, to, shiftTime);
  if (results.length === 1) return results[0];

  const tripByStatus: Record<string, number> = {};
  const reqByStatus: Record<string, number> = {};
  const dailyMap = new Map<string, { scheduled: number; completed: number }>();

  let tripsTotal = 0;
  let employeesServed = 0;
  let reqTotal = 0;
  let reqCancelled = 0;
  let reqNoShows = 0;
  let reqUnserved = 0;
  let measuredStops = 0;
  let onTimePickups = 0;
  let latePickups = 0;
  let weightedDelaySum = 0;
  let completedRoutes = 0;
  let assignedSeats = 0;
  let capacitySeats = 0;

  for (const r of results) {
    tripsTotal += r.trips.total;
    for (const [k, v] of Object.entries(r.trips.byStatus)) {
      tripByStatus[k] = (tripByStatus[k] ?? 0) + v;
    }
    employeesServed += r.employeesServed;
    reqTotal += r.requests.total;
    reqCancelled += r.requests.cancelled;
    reqNoShows += r.requests.noShows;
    reqUnserved += r.requests.unserved;
    for (const [k, v] of Object.entries(r.requests.byStatus)) {
      reqByStatus[k] = (reqByStatus[k] ?? 0) + v;
    }
    measuredStops += r.punctuality.measuredStops;
    onTimePickups += r.punctuality.onTimePickups;
    latePickups += r.punctuality.latePickups;
    if (r.punctuality.avgDelayMinutes !== null && r.punctuality.measuredStops > 0) {
      weightedDelaySum += r.punctuality.avgDelayMinutes * r.punctuality.measuredStops;
    }
    completedRoutes += r.seatUtilisation.completedRoutes;
    assignedSeats += r.seatUtilisation.assignedSeats;
    capacitySeats += r.seatUtilisation.capacitySeats;

    for (const d of r.dailyTrips) {
      const prev = dailyMap.get(d.date) ?? { scheduled: 0, completed: 0 };
      prev.scheduled += d.scheduled;
      prev.completed += d.completed;
      dailyMap.set(d.date, prev);
    }
  }

  const dailyTrips = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  return {
    asOf: new Date().toISOString(),
    filter: { tenantId: 'ALL', from, to, shiftTime: shiftTime || null, timezone: 'Asia/Kolkata' },
    trips: { total: tripsTotal, byStatus: tripByStatus },
    employeesServed,
    requests: {
      total: reqTotal,
      byStatus: reqByStatus,
      cancelled: reqCancelled,
      noShows: reqNoShows,
      unserved: reqUnserved,
    },
    punctuality: {
      measuredStops,
      onTimePickups,
      latePickups,
      onTimePct: measuredStops > 0 ? Math.round((onTimePickups * 10000) / measuredStops) / 100 : null,
      avgDelayMinutes: measuredStops > 0 ? Math.round((weightedDelaySum / measuredStops) * 100) / 100 : null,
    },
    seatUtilisation: {
      completedRoutes,
      assignedSeats,
      capacitySeats,
      pct: capacitySeats > 0 ? Math.round((assignedSeats * 10000) / capacitySeats) / 100 : null,
    },
    dailyTrips,
  };
}

export default function OperationsAnalyticsPage() {
  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);
  const [tenantId, setTenantId] = useState('ALL');
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(today());
  const [fromInput, setFromInput] = useState(() => formatDisplayDate(daysAgo(6)));
  const [toInput, setToInput] = useState(() => formatDisplayDate(today()));
  const [shiftTime, setShiftTime] = useState('');
  const [availableShiftTimes, setAvailableShiftTimes] = useState<string[]>([]);
  const [data, setData] = useState<OperationsAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void opsApi
      .getTenants({ page: 1, limit: 100 })
      .then((res) => setTenants(res?.items ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load corporate clients.'))
      .finally(() => setTenantsLoaded(true));
  }, []);

  useEffect(() => {
    if (!tenantsLoaded) return;
    let cancelled = false;
    void opsApi
      .getRoutes({
        tenantId: tenantId === 'ALL' ? undefined : tenantId,
        limit: 200,
      })
      .then((routes) => {
        if (cancelled) return;
        const times = Array.from(
          new Set(
            (Array.isArray(routes) ? routes : [])
              .map((r) => (typeof r.shiftTime === 'string' ? r.shiftTime.trim() : ''))
              .filter(Boolean),
          ),
        ).sort((a, b) => a.localeCompare(b));
        setAvailableShiftTimes(times);
        setShiftTime((prev) => (prev && !times.includes(prev) ? '' : prev));
      })
      .catch(() => {
        if (!cancelled) setAvailableShiftTimes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, tenantsLoaded]);

  const loadAnalytics = useCallback(async () => {
    if (!tenantsLoaded) return;
    if (from > to) {
      setError('Start date must be on or before end date.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (tenantId !== 'ALL') {
        const res = await opsApi.getAnalyticsDashboard({
          tenantId,
          from,
          to,
          shiftTime: shiftTime || undefined,
        });
        setData(res);
      } else if (tenants.length === 0) {
        setData(emptyAnalytics(from, to, shiftTime));
      } else {
        const settled = await Promise.allSettled(
          tenants.map((t) =>
            opsApi.getAnalyticsDashboard({
              tenantId: t.id,
              from,
              to,
              shiftTime: shiftTime || undefined,
            }),
          ),
        );
        const ok = settled
          .filter((r): r is PromiseFulfilledResult<OperationsAnalyticsDashboard> => r.status === 'fulfilled')
          .map((r) => r.value);
        if (ok.length === 0 && settled.length > 0) {
          const firstErr = settled.find((r): r is PromiseRejectedResult => r.status === 'rejected');
          throw new Error(firstErr?.reason instanceof Error ? firstErr.reason.message : 'Unable to load analytics.');
        }
        setData(mergeAnalytics(ok, from, to, shiftTime));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load operations analytics.');
    } finally {
      setLoading(false);
    }
  }, [from, shiftTime, tenantId, tenants, tenantsLoaded, to]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

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

  const cancelled = data?.trips.byStatus.CANCELLED ?? 0;
  const scheduled = Math.max(0, (data?.trips.total ?? 0) - cancelled);
  const fulfilled =
    (data?.trips.byStatus.ASSIGNED ?? 0) +
    (data?.trips.byStatus.IN_TRANSIT ?? 0) +
    (data?.trips.byStatus.COMPLETED ?? 0);
  const fulfillmentRate = scheduled > 0 ? Math.round((fulfilled * 1000) / scheduled) / 10 : null;
  const chartMax = Math.max(1, ...(data?.dailyTrips.map((day) => day.scheduled) ?? []));
  const rangeLabel = useMemo(() => `${from} to ${to}`, [from, to]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="h1-text" style={{ color: 'var(--text-primary)' }}>Operations Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Live delivery, service quality, demand coverage, and fleet efficiency · {rangeLabel}
          </p>
        </div>
        <Button size="md" variant="outline" leftIcon={<RefreshCw size={14} />} onClick={() => void loadAnalytics()} isLoading={loading}>
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
            {availableShiftTimes.map((time) => <option key={time} value={time}>{time}</option>)}
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
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading daily trip data…</p>
        ) : !data?.dailyTrips.length ? (
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
