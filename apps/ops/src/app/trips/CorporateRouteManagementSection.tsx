'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../components/common/Button';
import { Drawer } from '../../components/common/Drawer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateRouteItem, CorporateTenantOption } from '../../lib/api/opsTypes';

const COMPANY_STORAGE_KEY = 'adhocx_ops_corporate_tenant';

/** Today's date in IST as YYYY-MM-DD (shift dates are Indian calendar days). */
function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

const istTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

const DISPATCH_OUTCOME_TEXT: Record<string, (r: any) => string> = {
  OFFERED: (r) =>
    `Offer sent to ${r.offeredDriverName ?? 'a driver'} (searched ${r.searchRadiusKm ?? '?'} km). They have 60 seconds to accept.`,
  NO_DRIVERS_FOUND: () => 'No verified driver is available within 10 km. Operations has been alerted; it retries automatically.',
  ALL_DRIVERS_BUSY: () => 'Every nearby driver is holding another offer. It retries automatically in about a minute.',
  ALREADY_ASSIGNED: () => 'This route already has a driver.',
};

export function CorporateRouteManagementSection() {
  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<CorporateTenantOption[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayIst());
  const [selectedShift, setSelectedShift] = useState<string>('08:00');
  const [selectedDirection, setSelectedDirection] = useState<'LOGIN' | 'LOGOUT'>('LOGIN');
  const [dispatchingRouteId, setDispatchingRouteId] = useState<string | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<CorporateRouteItem | null>(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Companies: load once and restore the last company selected in Ops.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await opsApi.getTenants({ limit: 100 });
        if (cancelled) return;
        const items = res?.items ?? [];
        setTenants(items);
        let remembered = '';
        try {
          remembered = localStorage.getItem(COMPANY_STORAGE_KEY) ?? '';
        } catch {
          // storage unavailable: fall back to the first company
        }
        const initial = items.find((t) => t.id === remembered)?.id ?? items[0]?.id ?? '';
        setSelectedTenantId(initial);
        if (!initial) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setLoadError(`Could not load companies: ${err instanceof Error ? err.message : String(err)}`);
          setLoading(false);
        }
      } finally {
        if (!cancelled) setTenantsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedTenantId) loadRoutes();
  }, [selectedTenantId, selectedDate, selectedShift, selectedDirection]);

  function selectTenant(id: string) {
    setSelectedTenantId(id);
    try {
      localStorage.setItem(COMPANY_STORAGE_KEY, id);
    } catch {
      // not remembered; harmless
    }
  }

  async function loadRoutes() {
    if (!selectedTenantId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const data = await opsApi.getRoutes({
        tenantId: selectedTenantId,
        shiftDate: selectedDate,
        shiftTime: selectedShift,
        direction: selectedDirection,
      });
      setRoutes(Array.isArray(data) ? data : []);
    } catch (err) {
      // Never show stand-in data in an operations panel: say what failed.
      setRoutes([]);
      setLoadError(`Could not load routes: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  // Manual operations dispatch override.
  async function handleForceStartDispatch(routeId: string) {
    setDispatchingRouteId(routeId);
    setNotificationMsg(null);
    try {
      const result = await opsApi.forceDispatchRoute(routeId);
      const describe = DISPATCH_OUTCOME_TEXT[result?.status] ?? (() => `Dispatch result: ${result?.status ?? 'unknown'}`);
      setNotificationMsg({
        type: result?.status === 'OFFERED' || result?.status === 'ALREADY_ASSIGNED' ? 'success' : 'error',
        text: `Route ${routeId.slice(0, 8)}: ${describe(result)}`,
      });
      await loadRoutes();
    } catch (err) {
      setNotificationMsg({
        type: 'error',
        text: `Could not start dispatch for route ${routeId.slice(0, 8)}: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setDispatchingRouteId(null);
    }
  }

  async function openRouteItinerary(route: CorporateRouteItem) {
    setSelectedRoute(route);
    setItineraryLoading(true);
    try {
      const full = await opsApi.getRouteDetail(route.id);
      if (full) setSelectedRoute(full);
    } catch (err) {
      setNotificationMsg({
        type: 'error',
        text: `Could not load stops for route ${route.id.slice(0, 8)}: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setItineraryLoading(false);
    }
  }

  // Metrics summary
  const totalPassengers = routes.reduce((sum, r) => sum + r.assignedPassengerCount, 0);
  const totalCapacity = routes.reduce((sum, r) => sum + r.maxCapacity, 0);
  const utilizationPct = totalCapacity > 0 ? Math.round((totalPassengers / totalCapacity) * 100) : 0;
  const activeAssignedCount = routes.filter((r) => r.status === 'ASSIGNED' || r.status === 'IN_TRANSIT').length;

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface-elevated, #1E293B)',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-subtle, #334155)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>
            Optimized Fleet Routes
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary, #F8FAFC)', marginTop: '0.25rem' }}>
            {routes.length} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#10B981' }}>Active Cabs</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            {selectedDate} · Shift {selectedShift} ({selectedDirection})
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface-elevated, #1E293B)',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-subtle, #334155)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>
            Fleet Capacity & Occupancy
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.25rem' }}>
            {utilizationPct}% <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#F8FAFC' }}>({totalPassengers}/{totalCapacity} seats)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            Strict Max 4 (Sedan) / 6 (SUV)
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface-elevated, #1E293B)',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-subtle, #334155)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>
            Driver Assignment Rate
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10B981', marginTop: '0.25rem' }}>
            {activeAssignedCount} / {routes.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            H3 5km-10km Autonomous Dispatch
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface-elevated, #1E293B)',
            padding: '1.25rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-subtle, #334155)',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary, #94A3B8)', fontWeight: 600 }}>
            Dynamic Traffic Advancer (DDA)
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38BDF8', marginTop: '0.25rem' }}>
            ACTIVE
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
            Corridor Transit Monitored
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notificationMsg && (
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderRadius: '0.5rem',
            background: notificationMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${notificationMsg.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: notificationMsg.type === 'success' ? '#10B981' : '#EF4444',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {notificationMsg.text}
        </div>
      )}

      {/* Shift & Direction Filter Controls */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          background: 'var(--bg-surface, #0F172A)',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-subtle, #334155)',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8125rem', color: '#94A3B8', fontWeight: 600 }} htmlFor="corp-company">
            Company:
          </label>
          <select
            id="corp-company"
            value={selectedTenantId}
            onChange={(e) => selectTenant(e.target.value)}
            disabled={tenantsLoading || tenants.length === 0}
            style={{
              background: '#0F172A',
              color: '#F8FAFC',
              border: '1px solid #475569',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8125rem',
              minWidth: '12rem',
            }}
          >
            {tenantsLoading && <option value="">Loading companies...</option>}
            {!tenantsLoading && tenants.length === 0 && <option value="">No companies yet</option>}
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
          <label style={{ fontSize: '0.8125rem', color: '#94A3B8', fontWeight: 600 }} htmlFor="corp-date">
            Date:
          </label>
          <input
            id="corp-date"
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            style={{
              background: '#0F172A',
              color: '#F8FAFC',
              border: '1px solid #475569',
              borderRadius: '0.375rem',
              padding: '0.3rem 0.5rem',
              fontSize: '0.8125rem',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94A3B8', fontWeight: 600 }}>Shift Time:</span>
          {['08:00', '09:00', '17:00', '18:00'].map((time) => (
            <button
              key={time}
              onClick={() => setSelectedShift(time)}
              style={{
                background: selectedShift === time ? '#F59E0B' : 'transparent',
                color: selectedShift === time ? '#0F172A' : '#F8FAFC',
                border: selectedShift === time ? 'none' : '1px solid #475569',
                padding: '0.35rem 0.75rem',
                borderRadius: '0.375rem',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
              }}
            >
              {time} {Number(time.slice(0, 2)) < 12 ? 'AM' : 'PM'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: '#94A3B8', fontWeight: 600 }}>Direction:</span>
          <button
            onClick={() => setSelectedDirection('LOGIN')}
            style={{
              background: selectedDirection === 'LOGIN' ? '#3B82F6' : 'transparent',
              color: selectedDirection === 'LOGIN' ? '#FFFFFF' : '#F8FAFC',
              border: selectedDirection === 'LOGIN' ? 'none' : '1px solid #475569',
              padding: '0.35rem 0.75rem',
              borderRadius: '0.375rem',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            LOGIN (Pickups → Office)
          </button>
          <button
            onClick={() => setSelectedDirection('LOGOUT')}
            style={{
              background: selectedDirection === 'LOGOUT' ? '#8B5CF6' : 'transparent',
              color: selectedDirection === 'LOGOUT' ? '#FFFFFF' : '#F8FAFC',
              border: selectedDirection === 'LOGOUT' ? 'none' : '1px solid #475569',
              padding: '0.35rem 0.75rem',
              borderRadius: '0.375rem',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            LOGOUT (Office → Drops)
          </button>
        </div>
      </div>

      {/* Corporate Routes List / Table */}
      <div
        style={{
          background: 'var(--bg-surface-elevated, #1E293B)',
          borderRadius: '0.75rem',
          border: '1px solid var(--border-subtle, #334155)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#0F172A', borderBottom: '1px solid #334155', color: '#94A3B8' }}>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Route ID</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Vehicle & Capacity</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Stop 1 Target Pickup</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Assigned Driver & Cab</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '0.875rem 1rem', fontWeight: 600, textAlign: 'right' }}>Ops Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                  Loading corporate routes...
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#F87171' }}>
                  {loadError}{' '}
                  {selectedTenantId && (
                    <button
                      onClick={() => loadRoutes()}
                      style={{ marginLeft: '0.5rem', background: 'transparent', color: '#60A5FA', border: '1px solid #475569', borderRadius: '0.375rem', padding: '0.2rem 0.6rem', cursor: 'pointer' }}
                    >
                      Retry
                    </button>
                  )}
                </td>
              </tr>
            ) : !selectedTenantId ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                  No corporate companies have been onboarded yet.
                </td>
              </tr>
            ) : routes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                  No routes for {selectedDate} {selectedShift} {selectedDirection}.
                </td>
              </tr>
            ) : (
              routes.map((route) => (
                <tr
                  key={route.id}
                  style={{
                    borderBottom: '1px solid rgba(51, 65, 85, 0.5)',
                    transition: 'background 0.2s',
                  }}
                >
                  <td style={{ padding: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#60A5FA',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {route.id}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                      {route.office?.name || '—'}
                    </div>
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#F8FAFC' }}>
                      {route.vehicleCategory} ({route.assignedPassengerCount}/{route.maxCapacity} Pax)
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.2rem' }}>
                      {((route.estDistanceMeters ?? 0) / 1000).toFixed(1)} km · ~{Math.round((route.estDurationSeconds ?? 0) / 60)} min
                    </div>
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 700, color: '#F59E0B' }}>
                      {istTime(route.targetPickup1Time)} IST
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                      Arrival: {istTime(route.targetOfficeArrivalTime)}
                    </div>
                  </td>

                  <td style={{ padding: '1rem' }}>
                    {route.driver ? (
                      <div>
                        <div style={{ fontWeight: 700, color: '#F8FAFC' }}>{route.driver.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{route.driver.phone}</div>
                        <div style={{ fontSize: '0.75rem', color: '#38BDF8', marginTop: '0.15rem', fontFamily: 'monospace' }}>
                          {route.vehicle?.registrationNumber || 'No vehicle on file'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.8125rem' }}>
                        {route.status === 'DISPATCHING' ? 'Searching drivers in H3 5-10km...' : 'Pending Dispatch'}
                      </div>
                    )}
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <StatusBadge status={route.status} size="sm" pulse={route.status === 'DISPATCHING' || route.status === 'IN_TRANSIT'} />
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {/* Manual "Start" Dispatch Button */}
                      {(route.status === 'PLANNED' || route.status === 'DISPATCHING') && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={dispatchingRouteId === route.id || route.status === 'DISPATCHING'}
                          onClick={() => handleForceStartDispatch(route.id)}
                          style={{
                            background: '#10B981',
                            borderColor: '#059669',
                            fontWeight: 700,
                          }}
                        >
                          {dispatchingRouteId === route.id ? 'Starting...' : 'Start Dispatch 🚀'}
                        </Button>
                      )}

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openRouteItinerary(route)}
                      >
                        Itinerary ↗
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Itinerary & Stop Wait Timer Drawer */}
      <Drawer
        isOpen={!!selectedRoute}
        onClose={() => setSelectedRoute(null)}
        title={selectedRoute ? `Route Itinerary: ${selectedRoute.id} (${selectedRoute.direction})` : ''}
        subtitle={selectedRoute ? `Shift: ${selectedRoute.shiftTime} · Vehicle: ${selectedRoute.vehicleCategory} (Max ${selectedRoute.maxCapacity} Pax)` : ''}
        width="650px"
      >
        {selectedRoute && (
          <div>
            {/* Route Header Summary */}
            <div
              style={{
                background: '#0F172A',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #334155',
                marginBottom: '1.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>First Pickup</div>
                <div style={{ fontWeight: 700, color: '#F59E0B', marginTop: '0.2rem' }}>
                  {istTime(selectedRoute.targetPickup1Time)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Office Arrival</div>
                <div style={{ fontWeight: 700, color: '#10B981', marginTop: '0.2rem' }}>
                  {istTime(selectedRoute.targetOfficeArrivalTime)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Distance & Dwell</div>
                <div style={{ fontWeight: 700, color: '#38BDF8', marginTop: '0.2rem' }}>
                  {((selectedRoute.estDistanceMeters ?? 0) / 1000).toFixed(1)} km · 5m/stop
                </div>
              </div>
            </div>

            {/* Ordered Stop Itinerary */}
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.75rem' }}>
              Sequential Stops & Boarding OTPs
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {itineraryLoading && (
                <div style={{ color: '#94A3B8', fontSize: '0.8125rem' }}>Loading stops...</div>
              )}
              {(selectedRoute.stops || []).map((stop, sIdx) => (
                <div
                  key={stop.id || sIdx}
                  style={{
                    background: '#1E293B',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #334155',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          background: stop.stopType === 'DROPOFF' && sIdx > 0 ? '#10B981' : '#3B82F6',
                          color: '#FFFFFF',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                        }}
                      >
                        {stop.stopSequence}
                      </span>
                      <span style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.9375rem' }}>
                        {stop.employee ? stop.employee.fullName : stop.addressText}
                      </span>
                      {stop.employee?.gender && (
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '0.25rem',
                            background: stop.employee.gender === 'FEMALE' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                            color: stop.employee.gender === 'FEMALE' ? '#F472B6' : '#60A5FA',
                            fontWeight: 700,
                          }}
                        >
                          {stop.employee.gender}
                        </span>
                      )}
                    </div>

                    <StatusBadge status={stop.status} size="sm" />
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.35rem', marginLeft: '2rem' }}>
                    {stop.addressText}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '1.5rem',
                      alignItems: 'center',
                      marginTop: '0.75rem',
                      marginLeft: '2rem',
                      fontSize: '0.75rem',
                      color: '#94A3B8',
                    }}
                  >
                    <div>
                      Planned ETA:{' '}
                      <strong style={{ color: '#F8FAFC' }}>
                        {istTime(stop.plannedEta)}
                      </strong>
                    </div>

                    {stop.stopType === 'PICKUP' && stop.boardingOtp && (
                      <div>
                        Boarding OTP:{' '}
                        <span
                          style={{
                            background: '#0F172A',
                            border: '1px solid #F59E0B',
                            color: '#F59E0B',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontWeight: 800,
                            letterSpacing: '1px',
                          }}
                        >
                          {stop.boardingOtp}
                        </span>
                      </div>
                    )}

                    {stop.dwellBufferSeconds > 0 && (
                      <div>
                        Wait Window:{' '}
                        <strong style={{ color: '#10B981' }}>{stop.dwellBufferSeconds / 60}m Buffer</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
