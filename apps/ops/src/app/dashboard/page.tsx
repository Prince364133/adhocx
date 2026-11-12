'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Car,
  CheckCircle2,
  ClipboardList,
  Radio,
  Users,
  XCircle,
} from 'lucide-react';
import { readMockDashboard, refreshMockDatabase, type MockDashboardSnapshot } from '../../lib/mock-ops-db';
import { MetricCard } from '../../components/common/MetricCard';
import { Button } from '../../components/common/Button';

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg, 10px)',
  padding: '18px 20px',
  boxShadow: 'var(--shadow-card)',
};

export default function OperationsOverviewPage() {
  const [snapshot, setSnapshot] = useState<MockDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadData(refresh = false) {
    setLoading(true);
    setError('');
    try {
      if (refresh) refreshMockDatabase();
      setSnapshot(readMockDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the operations dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const board = snapshot?.board;
  const tenants = snapshot?.tenants ?? [];
  const counts = board?.counts;
  const activeAlerts = (snapshot?.alerts ?? []).filter((alert) => ['NEW', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED'].includes(alert.status));
  const affectedRoutes = new Set([
    ...(board?.atRisk.items.map((route) => route.id) ?? []),
    ...(board?.staleGps.items.map((route) => route.id) ?? []),
  ]);
  const activeExceptions = affectedRoutes.size + activeAlerts.length;
  const carried = ['IN_TRANSIT', 'COMPLETED'].reduce(
    (sum, status) => {
      const routeStatus = status as 'IN_TRANSIT' | 'COMPLETED';
      return sum +
      (board?.routes[routeStatus].items ?? []).reduce(
        (routeSum, route) => routeSum + route.assignedPassengerCount,
        0,
      );
    },
    0,
  );
  const totalScheduled = Math.max(0, (counts?.total ?? 0) - (counts?.CANCELLED ?? 0));
  const refreshedAt = snapshot?.database.refreshedAt ? new Date(snapshot.database.refreshedAt) : null;
  const lastUpdated = refreshedAt && !Number.isNaN(refreshedAt.getTime())
    ? refreshedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="h1-text" style={{ color: 'var(--text-primary)' }}>Operations Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Today’s dispatch and service status across all corporate clients.
          </p>
          {lastUpdated && (
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }} aria-live="polite">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>
        <Button size="md" variant="outline" onClick={() => loadData(true)} isLoading={loading}>
          Refresh
        </Button>
      </div>

      {error && <div role="alert" style={{ ...cardStyle, color: 'var(--color-danger, #DC2626)' }}>{error}</div>}

      <div className="metric-grid ops-overview-kpis">
        <MetricCard label="Scheduled Trips" value={loading ? '—' : totalScheduled} subtext="Today · all clients" icon={<ClipboardList size={18} />} highlightColor="#5728B2" />
        <MetricCard label="Active Trips" value={loading ? '—' : counts?.IN_TRANSIT ?? 0} subtext="Currently in transit" icon={<Car size={18} />} trend={{ value: 'LIVE', isLive: true }} highlightColor="#16A34A" />
        <MetricCard label="Completed Trips" value={loading ? '—' : counts?.COMPLETED ?? 0} subtext="Completed today" icon={<CheckCircle2 size={18} />} highlightColor="#059669" />
        <MetricCard label="Employees Carried" value={loading ? '—' : carried} subtext="Passengers on active and completed routes" icon={<Users size={18} />} highlightColor="#6366F1" />
        <MetricCard label="Active Exceptions" value={loading ? '—' : activeExceptions} subtext="At-risk, stale GPS, or active SOS" icon={<Radio size={18} />} highlightColor={activeExceptions ? '#DC2626' : '#16A34A'} />
        <MetricCard label="Cancelled Rides" value={loading ? '—' : counts?.CANCELLED ?? 0} subtext="Cancelled today" icon={<XCircle size={18} />} highlightColor="#DC2626" />
      </div>

      <div className="ops-dashboard-overview-grid">
        <section style={cardStyle}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 14px' }}>Route Status · Today</h2>
          {[
            ['Planned', counts?.PLANNED ?? 0],
            ['Dispatching', counts?.DISPATCHING ?? 0],
            ['Assigned', counts?.ASSIGNED ?? 0],
            ['In Transit', counts?.IN_TRANSIT ?? 0],
            ['Completed', counts?.COMPLETED ?? 0],
            ['Cancelled', counts?.CANCELLED ?? 0],
          ].map(([label, count]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <strong style={{ color: 'var(--text-primary)' }}>{loading ? '—' : count}</strong>
            </div>
          ))}
          <Link href="/dashboard/live" style={{ display: 'inline-block', marginTop: 14, color: 'var(--brand-blue-500, #5728B2)', fontSize: 13, fontWeight: 600 }}>
            Open live dispatch →
          </Link>
        </section>

        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Client Operations</h2>
            <Building2 size={17} color="var(--brand-blue-500, #5728B2)" />
          </div>
          {tenants.length === 0 && !loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No client operations to display.</p>
          ) : tenants.slice(0, 6).map((tenant) => (
            <Link
              key={tenant.id}
              href={`/board?tenantId=${encodeURIComponent(tenant.id)}`}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none' }}
            >
              <span>
                <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: 13 }}>{tenant.name}</strong>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tenant.code}</span>
              </span>
              <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-secondary)' }}>
                {tenant.activeCabsCount ?? 0} cabs · {tenant.inTransitCount ?? 0} in transit
                <span style={{ display: 'block', color: (tenant.delayedCount ?? 0) + (tenant.unassignedCount ?? 0) ? '#DC2626' : '#16A34A' }}>
                  {(tenant.delayedCount ?? 0) + (tenant.unassignedCount ?? 0)} exceptions
                </span>
              </span>
            </Link>
          ))}
          <Link href="/" style={{ display: 'inline-block', marginTop: 14, color: 'var(--brand-blue-500, #5728B2)', fontSize: 13, fontWeight: 600 }}>
            View company hub →
          </Link>
        </section>
      </div>
    </div>
  );
}
