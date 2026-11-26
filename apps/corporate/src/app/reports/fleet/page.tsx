'use client';

import React, { useEffect, useState } from 'react';
import { Car, Download, Route, Users } from 'lucide-react';
import { ContentLoadingSkeleton } from '@adhocx/ui/page-loading';
import { analyticsApi, routesApi } from '../../../lib/api/corporate';
import type { Dashboard, RouteListItem } from '../../../lib/api/types';
import MetricCard from '../../../components/common/MetricCard';
import LazyScrollSentinel from '../../../components/common/LazyScrollSentinel';
import { useLazySlice } from '../../../lib/hooks/useInfiniteScroll';
import { useSession } from '../../../lib/auth/SessionContext';

function formatShiftDate(value?: string | null): string {
  if (!value) return '—';
  const isoDay = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) {
    const parsed = new Date(`${isoDay}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(parsed);
    }
    return isoDay;
  }
  return value;
}

export default function VehicleRouteAnalyticsPage() {
  const { tenantId } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [routes, setRoutes] = useState<RouteListItem[]>([]);

  useEffect(() => {
    if (!tenantId) {
      setDashboard(null);
      setRoutes([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      analyticsApi.dashboard({ tenantId }),
      routesApi.list(tenantId, { limit: 100 }),
    ])
      .then(([data, routeList]) => {
        if (!active) return;
        setDashboard(data);
        setRoutes(routeList);
      })
      .catch((err) => {
        console.error('Failed to load fleet analytics:', err);
        if (active) setError('Unable to load fleet and route analytics. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantId]);

  const activeTrips = dashboard?.trips.byStatus.IN_TRANSIT ?? 0;
  const vehicleCount = new Set(routes.map((route) => route.vehicleId).filter(Boolean)).size;
  const seatUtilisation = dashboard?.seatUtilisation.pct;
  const delayedPickups = dashboard?.punctuality.latePickups;
  const { visibleItems: visibleRoutes, hasMore, sentinelRef } = useLazySlice(routes, routes.length, 20);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Fleet & Route Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Route and utilization records reported by the tenant API
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
        <MetricCard label="Active Trips" value={activeTrips.toLocaleString()} loading={loading} icon={<Route size={20} />} category="primary" />
        <MetricCard label="Vehicles on listed routes" value={vehicleCount.toLocaleString()} loading={loading} icon={<Car size={20} />} category="info" />
        <MetricCard label="Seat Utilization" value={seatUtilisation == null ? '—' : `${seatUtilisation}%`} loading={loading} icon={<Users size={20} />} category="success" />
        <MetricCard label="Late Pickups" value={delayedPickups == null ? '—' : delayedPickups.toLocaleString()} loading={loading} icon={<Route size={20} />} category="warning" />
      </div>

      <section className="surface-card" style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 13 }}>
        Corridor speed, dead-mileage, EV share, and traffic-buffer metrics are not available from the current tenant API.
      </section>

      <section className="surface-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginTop: 0 }}>Tenant routes</h2>
        {loading ? (
          <ContentLoadingSkeleton kind="table" count={6} label="Loading route records…" />
        ) : routes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No route records are available.</p>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Date</th>
                    <th>Direction</th>
                    <th>Status</th>
                    <th>Vehicle</th>
                    <th>Assigned passengers</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRoutes.map((route) => (
                    <tr key={route.id}>
                      <td>{route.routeNumber ?? route.routeCode ?? route.id}</td>
                      <td>{formatShiftDate(route.shiftDate)}</td>
                      <td>{route.direction}</td>
                      <td>{route.status}</td>
                      <td>{route.vehicle?.registrationNumber ?? route.vehiclePlate ?? '—'}</td>
                      <td>{route.assignedPassengerCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <LazyScrollSentinel sentinelRef={sentinelRef} hasMore={hasMore} label="Loading more routes…" />
          </>
        )}
      </section>
    </div>
  );
}
