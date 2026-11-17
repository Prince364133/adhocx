'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Ticket, XCircle } from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { DonutChart } from '../../../components/charts/DonutChart';
import { analyticsApi } from '../../../lib/api/corporate';
import type { Dashboard } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

const STATUS_COLORS: Record<string, string> = {
  APPROVED: '#16A34A',
  CONFIRMED: '#16A34A',
  PENDING: '#F59E0B',
  UNSERVED: '#F59E0B',
  CANCELLED: '#DC2626',
  COMPLETED: '#059669',
};

export default function BookingOverviewPage() {
  const { tenantId, status } = useSession();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    if (status === 'loading') return;
    if (!tenantId) {
      setLoading(false);
      setError('Sign in with a corporate account to view booking data.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setDashboard(await analyticsApi.dashboard({ tenantId }));
    } catch (requestError) {
      setDashboard(null);
      setError(requestError instanceof Error ? requestError.message : 'Unable to load booking data.');
    } finally {
      setLoading(false);
    }
  }, [status, tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const requests = dashboard?.requests;
  const segments = useMemo(() => {
    if (!requests) return [];
    return Object.entries(requests.byStatus)
      .filter(([, count]) => count > 0)
      .map(([label, count]) => ({
        label,
        count,
        pct: requests.total ? (count / requests.total) * 100 : 0,
        color: STATUS_COLORS[label] ?? '#64748B',
      }));
  }, [requests]);
  const metrics = [
    { label: 'Total requests', value: requests?.total.toLocaleString() ?? '—', icon: <Ticket size={18} />, color: '#5728B2' },
    { label: 'Unserved', value: requests?.unserved.toLocaleString() ?? '—', icon: <Clock size={18} />, color: '#F59E0B' },
    { label: 'Cancelled', value: requests?.cancelled.toLocaleString() ?? '—', icon: <XCircle size={18} />, color: '#DC2626' },
    { label: 'No-shows', value: requests?.noShows.toLocaleString() ?? '—', icon: <AlertTriangle size={18} />, color: '#7C3AED' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Booking Overview</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>Request status counts from the tenant analytics API.</p>
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
        <section className="surface-card" style={{ padding: 20, maxWidth: 620 }}>
          <h2 style={{ marginTop: 0, fontSize: 15 }}>Requests by status</h2>
          {segments.length ? (
            <DonutChart totalLabel="Requests" totalValue={String(requests?.total ?? 0)} segments={segments} size={180} thickness={22} />
          ) : <p>No request records are available for this tenant.</p>}
        </section>
      )}
    </div>
  );
}
