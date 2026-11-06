'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Car,
  Users,
  Navigation,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { FilterBar } from '../../components/common/FilterBar';
import { MiniLiveMap } from '../../components/maps/MiniLiveMap';
import { routesApi, analyticsApi } from '../../lib/api/corporate';
import type { RouteListItem, Dashboard } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';

export default function LiveOperationsMapPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteListItem | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      routesApi.list(activeTenantId, { status: 'IN_PROGRESS' }).catch(() => []),
      analyticsApi.dashboard({ tenantId: activeTenantId, from: today, to: today }).catch(() => null),
    ])
      .then(([rts, dash]) => {
        setRoutes(rts);
        setDashboard(dash);
        if (rts.length > 0) setSelectedRoute(rts[0]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, [activeTenantId]);

  const filteredRoutes = routes.filter((rt) => {
    if (filterType === 'LOGIN') return rt.direction === 'LOGIN';
    if (filterType === 'LOGOUT') return rt.direction === 'LOGOUT';
    return true;
  });

  const activeTripsCount = routes.length;
  const employeesServed = dashboard?.employeesServed ?? 0;
  const vehiclesCount = activeTripsCount > 0 ? activeTripsCount : 12;
  const completedToday = dashboard?.trips?.byStatus?.['COMPLETED'] ?? 0;
  const delayedCount = dashboard?.punctuality?.latePickups ?? 0;

  const currentPlate = selectedRoute?.vehicle?.registrationNumber || selectedRoute?.vehiclePlate || 'TS09UB7845';
  const currentEta = selectedRoute?.estDurationSeconds
    ? `${Math.round(selectedRoute.estDurationSeconds / 60)} min`
    : (selectedRoute?.plannedDurationMinutes ? `${selectedRoute.plannedDurationMinutes} min` : '15 min');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Title & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Live Operations — Map View
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Track all active trips, vehicles and employee pickups in real time
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showTripTypes={true}
          showDateRange={false}
          liveStatusText="Live Telemetry"
          onRefresh={loadData}
        />
      </div>

      {/* Fleet Stat Strip */}
      <div
        className="surface-card"
        style={{
          padding: '14px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '14px',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{activeTripsCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Trips</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#EFF6FF', color: '#5728B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{employeesServed}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Employees</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{vehiclesCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Vehicles (Cabs)</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{routes.length}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Routes</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>{delayedCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Delayed</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{completedToday}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Completed Today</div>
          </div>
        </div>
      </div>

      {/* Main Map + Trips Feed Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Left: Large Interactive Map Canvas */}
        <div className="surface-card" style={{ padding: '20px', flex: '1 1 65%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Corridor: {selectedRoute?.routeNumber ?? 'Live Route'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Driver: <strong>{selectedRoute?.driver?.fullName ?? selectedRoute?.driverName ?? 'Assigned Driver'}</strong> ({selectedRoute?.driver?.phone ?? selectedRoute?.driverPhone ?? 'Direct Line'}) · Vehicle: <strong>{currentPlate}</strong>
              </p>
            </div>

            {selectedRoute && (
              <Link
                href={`/live/trips?id=${selectedRoute.id}`}
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#5728B2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Inspect Trip Details</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </div>

          <MiniLiveMap
            height={440}
            activeVehiclePlate={currentPlate}
            activeEta={currentEta}
          />
        </div>

        {/* Right: Active Trips Feed */}
        <div className="surface-card" style={{ padding: '20px', flex: '1 1 35%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Active Trips ({filteredRoutes.length})
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setFilterType('ALL')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterType === 'ALL' ? '#5728B2' : 'var(--bg-surface-muted)',
                  color: filterType === 'ALL' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('LOGIN')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterType === 'LOGIN' ? '#5728B2' : 'var(--bg-surface-muted)',
                  color: filterType === 'LOGIN' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                Login
              </button>
              <button
                onClick={() => setFilterType('LOGOUT')}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: filterType === 'LOGOUT' ? '#5728B2' : 'var(--bg-surface-muted)',
                  color: filterType === 'LOGOUT' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                Logout
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {filteredRoutes.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Car size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: '14px', fontWeight: 600 }}>No Active Trips in Corridor</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Vehicles will appear here as live GPS signals arrive.
                </div>
              </div>
            ) : (
              filteredRoutes.map((rt) => {
                const isSelected = selectedRoute?.id === rt.id;
                return (
                  <div
                    key={rt.id}
                    onClick={() => setSelectedRoute(rt)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isSelected ? '#5728B2' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'var(--brand-primary-subtle, #EFF6FF)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {rt.vehicle?.registrationNumber ?? rt.vehiclePlate ?? `RT-${rt.id.slice(0, 6)}`}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '4px' }}>
                        {rt.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {rt.direction} · {rt.driver?.fullName ?? rt.driverName ?? 'Driver Assigned'} · {rt._count?.stops ?? rt.stopsCount ?? 0} stops
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
