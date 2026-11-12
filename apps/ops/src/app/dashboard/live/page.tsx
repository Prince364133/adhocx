'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Car, ExternalLink, MapPin, Phone, Radio, RefreshCw, Users } from 'lucide-react';
import type { CorporateRouteItem, OpsBoardResponse } from '../../../lib/api/opsTypes';
import { Button } from '../../../components/common/Button';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { buildMockBoard, readMockDatabase, refreshMockDatabase, updateMockRoute, type MockOpsDatabase } from '../../../lib/mock-ops-db';

const todayIst = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
const panelStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg, 10px)',
  boxShadow: 'var(--shadow-card)',
};

function isDelayed(route: CorporateRouteItem) {
  return Boolean(route.isAtRisk || (route.delayMinutes ?? 0) > 10);
}

function RouteMap({ routes, onSelect }: { routes: CorporateRouteItem[]; onSelect: (route: CorporateRouteItem) => void }) {
  const points = routes.flatMap((route) => {
    const lat = route.gps?.latitude ?? route.liveGps?.latitude;
    const lng = route.gps?.longitude ?? route.liveGps?.longitude;
    return lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng) ? [{ route, lat, lng }] : [];
  });
  if (!points.length) {
    return (
      <div style={{ minHeight: 270, display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
        No active vehicle coordinates are available for this filter.
      </div>
    );
  }
  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = Math.max(maxLat - minLat, 0.01);
  const lngSpan = Math.max(maxLng - minLng, 0.01);

  return (
    <svg viewBox="0 0 600 300" role="img" aria-label="Live vehicle location plot" style={{ width: '100%', minHeight: 270, background: 'var(--bg-surface-muted)', borderRadius: 8 }}>
      {[1, 2, 3, 4].map((line) => <g key={line} stroke="var(--border-subtle)" strokeDasharray="4 5"><line x1={line * 120} y1="0" x2={line * 120} y2="300" /><line x1="0" y1={line * 60} x2="600" y2={line * 60} /></g>)}
      {points.map(({ route, lat, lng }) => {
        const x = 24 + ((lng - minLng) / lngSpan) * 552;
        const y = 276 - ((lat - minLat) / latSpan) * 252;
        const color = isDelayed(route) ? '#D97706' : route.gps?.freshness !== 'LIVE' ? '#94A3B8' : '#16A34A';
        return (
          <g key={route.id} onClick={() => onSelect(route)} style={{ cursor: 'pointer' }}>
            <circle cx={x} cy={y} r="12" fill={color} fillOpacity=".16" />
            <circle cx={x} cy={y} r="6" fill={color} stroke="white" strokeWidth="2" />
            <title>{route.vehicle?.registrationNumber ?? 'Vehicle'} · {route.driver?.fullName ?? 'Unassigned'}</title>
          </g>
        );
      })}
    </svg>
  );
}

export default function LiveDispatchPage() {
  const [database, setDatabase] = useState<MockOpsDatabase | null>(null);
  const [tenantId, setTenantId] = useState('ALL');
  const [date, setDate] = useState(todayIst());
  const [selectedRoute, setSelectedRoute] = useState<CorporateRouteItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      setDatabase(readMockDatabase());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load live dispatch.');
    } finally {
      setLoading(false);
    }
  }, []);

  const tenants = database?.tenants ?? [];
  const board: OpsBoardResponse | null = useMemo(
    () => database ? buildMockBoard(database, date, tenantId === 'ALL' ? undefined : tenantId) : null,
    [database, date, tenantId],
  );

  const loadBoard = useCallback((refresh = false) => {
    setLoading(true);
    setError('');
    try {
      setDatabase(refresh ? refreshMockDatabase() : readMockDatabase());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh live dispatch.');
    } finally {
      setLoading(false);
    }
  }, []);

  const routes = useMemo(() => {
    if (!board) return [];
    return [
      ...board.routes.IN_TRANSIT.items,
      ...board.routes.ASSIGNED.items,
      ...board.routes.DISPATCHING.items,
      ...board.routes.PLANNED.items,
    ];
  }, [board]);

  function openDetails(route: CorporateRouteItem) {
    setSelectedRoute(route);
  }

  function dispatch(route: CorporateRouteItem, action: 'assign' | 'reassign') {
    setActionId(route.id);
    setError('');
    setNotice('');
    try {
      const updatedDatabase = updateMockRoute(route.id, action);
      setDatabase(updatedDatabase);
      setSelectedRoute(updatedDatabase.routes.find((item) => item.id === route.id) ?? null);
      setNotice(action === 'assign' ? 'Driver assigned.' : 'Driver reassigned.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the route.');
    } finally {
      setActionId('');
    }
  }

  const selected = selectedRoute && database?.routes.find((route) => route.id === selectedRoute.id) || selectedRoute;
  const gpsAge = selected?.gps?.ageSeconds;
  const gpsLabel = selected?.gps?.freshness === 'LIVE'
    ? 'Live'
    : selected?.gps?.freshness === 'STALE'
      ? 'Stale'
      : selected?.gps?.freshness === 'OFFLINE'
        ? 'Offline'
        : 'No GPS';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="h1-text" style={{ color: 'var(--text-primary)' }}>Live Dispatch</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Active vehicles, route progress, driver details, and dispatch actions.</p>
        </div>
        <Button size="md" variant="outline" leftIcon={<RefreshCw size={14} />} onClick={() => loadBoard(true)} isLoading={loading}>
          Refresh live board
        </Button>
      </div>

      <section style={{ ...panelStyle, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <label style={filterLabel}>CLIENT
          <select value={tenantId} onChange={(event) => setTenantId(event.target.value)} style={filterStyle}>
            <option value="ALL">All clients</option>
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </label>
        <label style={filterLabel}>SHIFT DATE
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} style={filterStyle} />
        </label>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <Link href="/map" style={{ color: 'var(--brand-blue-500, #5728B2)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ExternalLink size={14} /> Open full fleet map</span>
          </Link>
        </div>
      </section>

      {error && <div role="alert" style={{ color: 'var(--color-danger, #DC2626)', fontSize: 13 }}>{error}</div>}
      {notice && <div role="status" style={{ color: 'var(--color-success, #16A34A)', fontSize: 13 }}>{notice}</div>}

      <div className="ops-dashboard-live-grid">
        <section style={{ ...panelStyle, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)' }}>Active Vehicle Locations</h2>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>GPS coordinate view · select a marker to open its route</p>
            </div>
            <MapPin size={18} color="var(--brand-blue-500, #5728B2)" />
          </div>
          {loading && !board ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading fleet positions…</p> : <RouteMap routes={routes} onSelect={openDetails} />}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-secondary)', marginTop: 10 }}>
            <span><i style={dot('#16A34A')} />On time / live</span>
            <span><i style={dot('#D97706')} />Delayed / at risk</span>
            <span><i style={dot('#94A3B8')} />Stale or offline GPS</span>
          </div>
        </section>

        <section style={{ ...panelStyle, padding: 16 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--text-primary)' }}>Active Routes ({routes.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 530, overflowY: 'auto' }}>
            {routes.map((route) => (
              <button key={route.id} type="button" onClick={() => void openDetails(route)} style={{ textAlign: 'left', cursor: 'pointer', padding: 12, border: `1px solid ${selectedRoute?.id === route.id ? 'var(--brand-blue-500, #5728B2)' : 'var(--border-subtle)'}`, borderRadius: 8, background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <strong className="code-tag">RT-{route.id.slice(0, 8).toUpperCase()}</strong>
                  <StatusBadge status={route.status} size="sm" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span>{route.driver?.fullName ?? 'Driver unassigned'}</span>
                  <span>{route.vehicle?.registrationNumber ?? 'No vehicle'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>{route.assignedPassengerCount}/{route.maxCapacity} passengers</span>
                  <span>{route.targetOfficeArrivalTime ? new Date(route.targetOfficeArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'ETA unavailable'}</span>
                </div>
              </button>
            ))}
            {!routes.length && !loading && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active routes for this date and client.</p>}
          </div>
        </section>
      </div>

      {selected && (
        <section style={{ ...panelStyle, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>Route Details · RT-{selected.id.slice(0, 8).toUpperCase()}</h2>
              <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                {selected.tenant?.name ?? 'Corporate client'} · {selected.shiftTime} · {selected.direction}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!selected.driverId ? (
                <Button size="sm" variant="primary" isLoading={actionId === selected.id} onClick={() => dispatch(selected, 'assign')}>Assign driver</Button>
              ) : (
                <Button size="sm" variant="outline" isLoading={actionId === selected.id} onClick={() => dispatch(selected, 'reassign')}>Reassign</Button>
              )}
              {selected.driver?.phone && <a href={`tel:${selected.driver.phone}`} style={contactStyle}><Phone size={13} /> Contact driver</a>}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
            <Detail label="Driver" value={selected.driver?.fullName ?? 'Not assigned'} icon={<Users size={15} />} />
            <Detail label="Vehicle" value={selected.vehicle?.registrationNumber ?? 'Not assigned'} icon={<Car size={15} />} />
            <Detail label="Passengers" value={`${selected.assignedPassengerCount} / ${selected.maxCapacity}`} icon={<Users size={15} />} />
            <Detail label="GPS freshness" value={`${gpsLabel}${gpsAge !== undefined && gpsAge !== null ? ` · ${gpsAge}s ago` : ''}`} icon={<Radio size={15} />} />
          </div>
          <h3 style={{ margin: '18px 0 8px', fontSize: 13, color: 'var(--text-primary)' }}>Passenger Manifest & Stops</h3>
          {selected.stops?.length ? selected.stops.map((stop) => (
            <div key={stop.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderTop: '1px solid var(--border-subtle)', fontSize: 12 }}>
              <span style={{ color: 'var(--text-primary)' }}>{stop.stopSequence}. {stop.employee?.fullName ?? stop.addressText}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{stop.stopType} · {new Date(stop.plannedEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {stop.status}</span>
            </div>
          )) : <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Select a route to load its passenger manifest and planned stops.</p>}
          {isDelayed(selected) && <p style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B45309', fontSize: 12, marginBottom: 0 }}><AlertTriangle size={14} /> Route is flagged at risk{selected.delayMinutes ? ` · ${selected.delayMinutes} min delay` : ''}.</p>}
        </section>
      )}

    </div>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 9, alignItems: 'center', background: 'var(--bg-surface-muted)', padding: 11, borderRadius: 8 }}>
    <span style={{ color: 'var(--brand-blue-500, #5728B2)' }}>{icon}</span>
    <span><small style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10 }}>{label}</small><strong style={{ color: 'var(--text-primary)', fontSize: 12 }}>{value}</strong></span>
  </div>;
}

const filterLabel: React.CSSProperties = { fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 };
const filterStyle: React.CSSProperties = { display: 'block', width: '100%', height: 36, marginTop: 5, padding: '0 9px', border: '1px solid var(--border-subtle)', borderRadius: 7, background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: 12 };
const contactStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border-subtle)', color: 'var(--brand-blue-500, #5728B2)', textDecoration: 'none', fontSize: 12, fontWeight: 600 };
const dot = (color: string): React.CSSProperties => ({ display: 'inline-block', width: 8, height: 8, borderRadius: 99, background: color, marginRight: 6 });
