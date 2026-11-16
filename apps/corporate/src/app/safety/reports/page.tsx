'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { safetyApi } from '../../../lib/api/corporate';
import type { SosAlert } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';
import MetricCard from '../../../components/common/MetricCard';
import { DonutChart } from '../../../components/charts/DonutChart';
import { AreaTrendChart } from '../../../components/charts/AreaTrendChart';

const colors = ['#5728B2', '#38BDF8', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899'];

export default function SafetyReportsPage() {
  const { tenantId } = useSession();
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setAlerts([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    safetyApi.alerts(tenantId, {})
      .then((data) => {
        if (active) setAlerts(data);
      })
      .catch((err) => {
        console.error('Failed to load safety report data:', err);
        if (active) setError('Unable to load tenant safety alerts. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantId]);

  const resolvedCount = alerts.filter((alert) => alert.status === 'RESOLVED').length;
  const activeCount = alerts.filter((alert) => ['TRIGGERED', 'ACKNOWLEDGED'].includes(alert.status)).length;
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of alerts) counts.set(alert.status, (counts.get(alert.status) ?? 0) + 1);
    return Array.from(counts.entries()).map(([label, count], index) => ({
      label,
      count,
      pct: alerts.length ? Math.round((count / alerts.length) * 100) : 0,
      color: colors[index % colors.length],
    }));
  }, [alerts]);

  const trend = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return { key, trips: 0 };
    });
    const byDate = new Map(days.map((day) => [day.key, day]));
    for (const alert of alerts) {
      const key = alert.createdAt.slice(0, 10);
      const day = byDate.get(key);
      if (day) day.trips += 1;
    }
    return days.map((day) => ({ day: day.key, trips: day.trips }));
  }, [alerts]);

  const officeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const alert of alerts) {
      const name = alert.route?.office?.name ?? 'Office not recorded';
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts.entries());
  }, [alerts]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Safety Alert Report
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Status, trend, and office data from saved tenant SOS alerts
        </p>
      </div>

      {error && <div role="alert" className="surface-card" style={{ padding: 14, color: '#B91C1C' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard label="SOS alert records" value={loading ? '...' : alerts.length.toLocaleString()} icon={<ShieldAlert size={20} />} category="primary" />
        <MetricCard label="Resolved alerts" value={loading ? '...' : resolvedCount.toLocaleString()} icon={<CheckCircle2 size={20} />} category="success" />
        <MetricCard label="Active alerts" value={loading ? '...' : activeCount.toLocaleString()} icon={<AlertTriangle size={20} />} category="warning" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
        <section className="surface-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Alerts by status</h2>
          {statusCounts.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No alert records are available.</p> : (
            <DonutChart segments={statusCounts} totalValue={alerts.length} totalLabel="Alerts" size={180} />
          )}
        </section>
        <section className="surface-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Alerts recorded — last 7 days</h2>
          <AreaTrendChart data={trend} height={180} lineColor="#DC2626" />
        </section>
      </div>

      <section className="surface-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Alert count by office</h2>
        {officeCounts.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No alert records are available.</p> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>Office</th><th>Alerts</th></tr></thead>
              <tbody>
                {officeCounts.map(([office, count]) => <tr key={office}><td>{office}</td><td>{count}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          The current API does not expose response-time, escort-compliance, or incident-resolution SLA metrics.
        </p>
      </section>
    </div>
  );
}
