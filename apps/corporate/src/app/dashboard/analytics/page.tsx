'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Percent, RefreshCw, Route } from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { BarComparisonChart } from '../../../components/charts/BarComparisonChart';
import { DonutChart } from '../../../components/charts/DonutChart';
import { analyticsApi } from '../../../lib/api/corporate';
import type { Dashboard } from '../../../lib/api/types';
import type { TripsAnalyticsReport } from '../../../lib/api/corporate';
import { useSession } from '../../../lib/auth/SessionContext';
import { addDays, todayIst } from '../../../lib/format';

export default function TransportAnalyticsPage() {
  const { tenantId, status } = useSession();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [report, setReport] = useState<TripsAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    if (status === 'loading') return;
    if (!tenantId) {
      setLoading(false);
      setError('Sign in with a corporate account to view tenant analytics.');
      return;
    }

    const to = todayIst();
    const from = addDays(to, -29);
    setLoading(true);
    setError(null);
    try {
      const [dashboardResult, reportResult] = await Promise.all([
        analyticsApi.dashboard({ tenantId, from, to }),
        analyticsApi.tripsReport({ tenantId, from, to }),
      ]);
      if (reportResult.truncated) {
        throw new Error('The trip report exceeded its row limit. Narrow the date range before using its charts.');
      }
      setDashboard(dashboardResult);
      setReport(reportResult);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load tenant analytics.');
      setDashboard(null);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [status, tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const chartData = useMemo(() => {
    const rows = report?.rows ?? [];
    const counts = new Map<string, { scheduled: number; completed: number }>();
    for (const row of rows) {
      const day = row.shiftDate.slice(0, 10);
      const current = counts.get(day) ?? { scheduled: 0, completed: 0 };
      current.scheduled += 1;
      if (row.status === 'COMPLETED') current.completed += 1;
      counts.set(day, current);
    }

    const today = todayIst();
    return Array.from({ length: 7 }, (_, index) => {
      const key = addDays(today, -(6 - index));
      const date = new Date(`${key}T00:00:00.000Z`);
      return {
        day: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(date),
        scheduled: counts.get(key)?.scheduled ?? 0,
        completed: counts.get(key)?.completed ?? 0,
      };
    });
  }, [report]);

  const directionSegments = useMemo(() => {
    const rows = report?.rows ?? [];
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.direction, (counts.get(row.direction) ?? 0) + 1);
    return Array.from(counts.entries()).map(([direction, count], index) => ({
      label: direction,
      count,
      pct: rows.length ? (count / rows.length) * 100 : 0,
      color: ['#5728B2', '#8B5CF6', '#38BDF8'][index % 3],
    }));
  }, [report]);

  const metrics = [
    { label: 'Trips in period', value: dashboard?.trips.total.toLocaleString() ?? '—', icon: <Route size={18} />, color: '#5728B2' },
    { label: 'On-time pickup', value: dashboard?.punctuality.onTimePct === null || !dashboard ? '—' : `${dashboard.punctuality.onTimePct}%`, icon: <Clock size={18} />, color: '#16A34A' },
    { label: 'Average pickup delay', value: dashboard?.punctuality.avgDelayMinutes === null || !dashboard ? '—' : `${dashboard.punctuality.avgDelayMinutes} min`, icon: <CheckCircle2 size={18} />, color: '#3B82F6' },
    { label: 'Seat utilization', value: dashboard?.seatUtilisation.pct === null || !dashboard ? '—' : `${dashboard.seatUtilisation.pct}%`, icon: <Percent size={18} />, color: '#10B981' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Transport Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Tenant trip and utilization data for the last 30 days.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}><RefreshCw size={14} /> Refresh</button>
      </header>

      {error && <p role="alert" style={{ color: 'var(--color-danger)' }}>{error}</p>}
      <div className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={loading ? '…' : metric.value} icon={metric.icon} highlightColor={metric.color} />
        ))}
      </div>

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          <section className="surface-card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 15 }}>Trips by day</h2>
            {report?.rows.length ? <BarComparisonChart data={chartData} height={230} /> : <p>No trip records in this period.</p>}
          </section>
          <section className="surface-card" style={{ padding: 20 }}>
            <h2 style={{ marginTop: 0, fontSize: 15 }}>Trips by direction</h2>
            {directionSegments.length ? (
              <DonutChart totalLabel="Trips" totalValue={String(report?.rowCount ?? 0)} segments={directionSegments} size={185} thickness={22} />
            ) : <p>No trip-direction data in this period.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
