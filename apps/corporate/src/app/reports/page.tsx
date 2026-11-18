'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Download, Route, Users } from 'lucide-react';
import { analyticsApi } from '../../lib/api/corporate';
import type { Dashboard } from '../../lib/api/types';
import type { TripsAnalyticsReport } from '../../lib/api/corporate';
import MetricCard from '../../components/common/MetricCard';
import BarComparisonChart from '../../components/charts/BarComparisonChart';
import { useSession } from '../../lib/auth/SessionContext';
import { addDays, todayIst } from '../../lib/format';

export default function TransportPerformanceReportPage() {
  const { tenantId } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [report, setReport] = useState<TripsAnalyticsReport | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setDashboard(null);
      setReport(null);
      setLoading(false);
      return;
    }

    let active = true;
    const to = todayIst();
    const from = addDays(to, -6);
    setLoading(true);
    setError(null);
    Promise.all([
      analyticsApi.dashboard({ tenantId, from, to }),
      analyticsApi.tripsReport({ tenantId, from, to }),
    ])
      .then(([dashboardData, tripReport]) => {
        if (!active) return;
        setDashboard(dashboardData);
        setReport(tripReport);
      })
      .catch((err) => {
        console.error('Failed to load performance report:', err);
        if (active) setError('Unable to load tenant performance data. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantId]);

  const completedTrips = dashboard?.trips.byStatus.COMPLETED ?? 0;
  const totalTrips = dashboard?.trips.total ?? 0;
  const onTimeRate = dashboard?.punctuality.onTimePct;
  const avgDelayMinutes = dashboard?.punctuality.avgDelayMinutes;
  const chartData = useMemo(() => {
    const daily = new Map<string, { scheduled: number; completed: number }>();
    for (const row of report?.rows ?? []) {
      const current = daily.get(row.shiftDate) ?? { scheduled: 0, completed: 0 };
      current.scheduled += 1;
      if (row.status === 'COMPLETED') current.completed += 1;
      daily.set(row.shiftDate, current);
    }
    return Array.from(daily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ day: date, ...counts }));
  }, [report]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Transport Performance
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Actual tenant analytics for the last seven days
          </p>
        </div>
        <button
          type="button"
          disabled={!tenantId}
          onClick={() => tenantId && analyticsApi.downloadReport({ tenantId, type: 'trips', format: 'csv' })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid var(--border-color)', borderRadius: 6 }}
        >
          <Download size={14} /> Export trips CSV
        </button>
      </div>

      {error && <div role="alert" className="surface-card" style={{ padding: 14, color: '#B91C1C' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard label="Trips" value={loading ? '...' : dashboard ? totalTrips.toLocaleString() : '—'} icon={<Route size={20} />} category="primary" />
        <MetricCard label="Completed trips" value={loading ? '...' : dashboard ? completedTrips.toLocaleString() : '—'} icon={<CheckCircle2 size={20} />} category="success" />
        <MetricCard label="On-time pickups" value={loading ? '...' : onTimeRate == null ? '—' : `${onTimeRate}%`} icon={<Clock size={20} />} category="info" />
        <MetricCard label="Employees served" value={loading ? '...' : dashboard ? dashboard.employeesServed.toLocaleString() : '—'} icon={<Users size={20} />} category="warning" />
      </div>

      <section className="surface-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Scheduled vs completed routes</h2>
        {loading ? <p>Loading trip report...</p> : chartData.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No trip records are available for this period.</p>
        ) : (
          <BarComparisonChart data={chartData} height={220} />
        )}
        {report?.truncated && (
          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            The API limited this report to {report.rowCount} rows.
          </p>
        )}
      </section>

      <section className="surface-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Punctuality summary</h2>
        <p style={{ marginBottom: 0, color: 'var(--text-secondary)' }}>
          {avgDelayMinutes == null
            ? 'Average delay is not available for this period.'
            : `Average delay: ${avgDelayMinutes} minutes. Late pickups: ${dashboard?.punctuality.latePickups ?? 0}.`}
        </p>
      </section>
    </div>
  );
}
