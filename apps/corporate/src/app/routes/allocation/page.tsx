'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Car, RefreshCw, Route, Search, UserCheck } from 'lucide-react';
import { routesApi } from '../../../lib/api/corporate';
import type { CorporateRoute } from '../../../lib/api/types';
import MetricCard from '../../../components/common/MetricCard';
import { useSession } from '../../../lib/auth/SessionContext';

export default function FleetDriverAllocationPage() {
  const { tenantId } = useSession();
  const [routes, setRoutes] = useState<CorporateRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const loadData = useCallback(async () => {
    if (!tenantId) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setRoutes(await routesApi.list(tenantId, { limit: 100 }));
    } catch (err) {
      console.error('Failed to load fleet allocation:', err);
      setError('Unable to load tenant route assignments. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const vehicleCount = new Set(routes.map((route) => route.vehicleId).filter(Boolean)).size;
  const driverAssignedCount = routes.filter((route) => Boolean(route.driverId)).length;
  const inProgressCount = routes.filter((route) => route.status === 'IN_PROGRESS').length;
  const filteredRoutes = useMemo(() => routes.filter((route) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [
      route.vehicle?.registrationNumber,
      route.vehicle?.model,
      route.driver?.fullName,
      route.driverName,
      route.routeCode,
      route.routeNumber,
    ].some((value) => value?.toLowerCase().includes(query));
    const matchesStatus = statusFilter === 'All' || route.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [routes, search, statusFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Fleet & Driver Allocation
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Vehicle and driver assignments from tenant route records
          </p>
        </div>
        <button type="button" onClick={() => void loadData()} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 6 }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div role="alert" className="surface-card" style={{ padding: 14, color: '#B91C1C' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard label="Routes loaded" value={loading ? '...' : routes.length.toLocaleString()} icon={<Route size={20} />} category="primary" />
        <MetricCard label="Vehicles assigned to routes" value={loading ? '...' : vehicleCount.toLocaleString()} icon={<Car size={20} />} category="info" />
        <MetricCard label="Routes with driver assigned" value={loading ? '...' : driverAssignedCount.toLocaleString()} icon={<UserCheck size={20} />} category="success" />
        <MetricCard label="Routes in progress" value={loading ? '...' : inProgressCount.toLocaleString()} icon={<Route size={20} />} category="warning" />
      </div>

      <div className="surface-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', minWidth: 260, flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search vehicle, driver, or route..."
            aria-label="Search route assignments"
            style={{ width: '100%', height: 36, padding: '0 10px 0 32px', border: '1px solid var(--border-color)', borderRadius: 6 }}
          />
        </div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by route status" style={{ height: 36, padding: '0 10px', border: '1px solid var(--border-color)', borderRadius: 6 }}>
          <option value="All">All statuses</option>
          {Array.from(new Set(routes.map((route) => route.status))).map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>

      <section className="surface-card" style={{ padding: 20 }}>
        {loading ? <p>Loading route assignments...</p> : filteredRoutes.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No route assignments match these filters.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Route</th><th>Vehicle</th><th>Model</th><th>Driver</th><th>Passengers / capacity</th><th>Date / shift</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route) => (
                  <tr key={route.id}>
                    <td>{route.routeNumber ?? route.routeCode ?? route.id}</td>
                    <td>{route.vehicle?.registrationNumber ?? route.vehiclePlate ?? '—'}</td>
                    <td>{route.vehicle?.model ?? '—'}</td>
                    <td>{route.driver?.fullName ?? route.driverName ?? '—'}</td>
                    <td>{route.assignedPassengerCount} / {route.vehicle?.capacity ?? route.maxCapacity}</td>
                    <td>{route.shiftDate} · {route.shiftTime}</td>
                    <td>{route.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          The route API does not include unassigned standby vehicles, compliance documents, driver ratings, or fuel telemetry.
        </p>
      </section>
    </div>
  );
}
