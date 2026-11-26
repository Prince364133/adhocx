'use client';

import React, { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { ContentLoadingSkeleton, LazyMount, SkeletonBone } from '@adhocx/ui/page-loading';
import {
  Car,
  Users,
  Navigation,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { FilterBar } from '../../components/common/FilterBar';
import { LazyScrollSentinel } from '../../components/common/LazyScrollSentinel';
import { LazyGoogleRouteMap } from '../../components/maps/LazyGoogleRouteMap';
import { routesApi, analyticsApi } from '../../lib/api/corporate';
import type { RouteListItem, Dashboard, RouteTracking } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';
import { todayIst } from '../../lib/format';
import { useLazySlice } from '../../lib/hooks/useInfiniteScroll';

export default function LiveOperationsMapPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId;

  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteListItem | null>(null);
  const [tracking, setTracking] = useState<RouteTracking | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [filterType, setFilterType] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    if (!activeTenantId) {
      setRoutes([]);
      setDashboard(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const today = todayIst();

    Promise.all([
      routesApi.list(activeTenantId, { status: 'IN_TRANSIT' }),
      analyticsApi.dashboard({ tenantId: activeTenantId, from: today, to: today }),
    ])
      .then(([rts, dash]) => {
        setRoutes(rts);
        setDashboard(dash);
        setSelectedRoute((current) => rts.find((route) => route.id === current?.id) || rts[0] || null);
      })
      .catch((err) => {
        console.error('Failed to load live operations data:', err);
        setLoadError('Unable to load live operations data. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeTenantId]);

  useEffect(() => {
    loadData();
    if (!activeTenantId) return;
    const timer = setInterval(loadData, 15000);
    return () => clearInterval(timer);
  }, [activeTenantId, loadData]);

  const selectedRouteId = selectedRoute?.id;
  useEffect(() => {
    if (!selectedRouteId) {
      setTracking(null);
      return;
    }

    let active = true;
    const loadTracking = () => {
      routesApi.tracking(selectedRouteId)
        .then((data) => {
          if (active) setTracking(data);
        })
        .catch((err) => {
          console.error('Failed to load route GPS data:', err);
          if (active) setTracking(null);
        });
    };
    loadTracking();
    const timer = setInterval(loadTracking, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [selectedRouteId]);

  const filteredRoutes = routes.filter((rt) => {
    if (filterType === 'LOGIN') return rt.direction === 'LOGIN';
    if (filterType === 'LOGOUT') return rt.direction === 'LOGOUT';
    return true;
  });
  const { visibleItems: visibleRoutes, hasMore, sentinelRef } = useLazySlice(
    filteredRoutes,
    filterType,
    20,
  );
  const showInitialSkeleton = loading && routes.length === 0 && !dashboard;

  const activeTripsCount = routes.length;
  const employeesServed = dashboard?.employeesServed ?? 0;
  const vehiclesCount = new Set(routes.map((route) => route.vehicleId).filter(Boolean)).size;
  const completedToday = dashboard?.trips?.byStatus?.['COMPLETED'] ?? 0;
  const delayedCount = dashboard?.punctuality?.latePickups ?? 0;

  const currentPlate = selectedRoute?.vehicle?.registrationNumber || selectedRoute?.vehiclePlate || '—';
  const mapStops = selectedRoute?.stops?.map((stop) => ({
    id: stop.id,
    stopSequence: stop.stopSequence,
    stopType: stop.stopType,
    employeeName: stop.employee?.fullName ?? null,
    employeePhone: stop.employee?.phoneNumber ?? null,
    addressText: stop.addressText ?? stop.address ?? null,
    lat: Number(stop.latitude),
    lng: Number(stop.longitude),
    plannedEta: stop.plannedEta,
    dwellBufferSeconds: stop.dwellBufferSeconds,
    status: stop.status,
  })) ?? [];

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
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {showInitialSkeleton ? <SkeletonBone style={{ width: 32, height: 18, borderRadius: 4 }} /> : activeTripsCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Trips</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: 'var(--color-blue-bg)', color: 'var(--brand-action)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {showInitialSkeleton ? <SkeletonBone style={{ width: 32, height: 18, borderRadius: 4 }} /> : employeesServed}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Employees</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: 'var(--brand-blue-100)', color: 'var(--color-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Car size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {showInitialSkeleton ? <SkeletonBone style={{ width: 32, height: 18, borderRadius: 4 }} /> : vehiclesCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Vehicles on active trips</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: 'var(--color-warning-bg)', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Navigation size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {showInitialSkeleton ? <SkeletonBone style={{ width: 32, height: 18, borderRadius: 4 }} /> : routes.length}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Routes</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: 'var(--color-danger-bg)', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>
              {showInitialSkeleton ? <SkeletonBone style={{ width: 32, height: 18, borderRadius: 4 }} /> : delayedCount}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Delayed</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 6, backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={16} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {showInitialSkeleton ? <SkeletonBone style={{ width: 32, height: 18, borderRadius: 4 }} /> : completedToday}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Completed Today</div>
          </div>
        </div>
      </div>

      {/* Main Map + Trips Feed Split */}
      {loadError && (
        <div role="alert" className="surface-card" style={{ padding: 16, color: '#B91C1C' }}>
          {loadError}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Left: Large Interactive Map Canvas */}
        <div className="surface-card" style={{ padding: '20px', flex: '1 1 65%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Corridor: {selectedRoute?.routeNumber ?? '—'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Driver: <strong>{selectedRoute?.driver?.fullName ?? selectedRoute?.driverName ?? '—'}</strong> ({selectedRoute?.driver?.phone ?? selectedRoute?.driverPhone ?? '—'}) · Vehicle: <strong>{currentPlate}</strong>
              </p>
            </div>

            {selectedRoute && (
              <Link
                href={`/live/trips?id=${selectedRoute.id}`}
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--brand-primary)',
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

          {showInitialSkeleton ? (
            <ContentLoadingSkeleton kind="map" height={440} label="Loading live corridor map…" />
          ) : selectedRoute ? (
            <LazyMount
              minHeight={440}
              fallback={<ContentLoadingSkeleton kind="map" height={440} label="Preparing live corridor map…" />}
            >
              <LazyGoogleRouteMap
                height={440}
                office={selectedRoute.office?.latitude !== undefined && selectedRoute.office.longitude !== undefined
                  ? {
                      name: selectedRoute.office.name,
                      addressText: selectedRoute.office.addressText,
                      lat: Number(selectedRoute.office.latitude),
                      lng: Number(selectedRoute.office.longitude),
                    }
                  : null}
                stops={mapStops}
                livePosition={tracking?.position ? {
                  lat: tracking.position.lat,
                  lng: tracking.position.lng,
                  recordedAt: tracking.position.recordedAt,
                  gpsState: tracking.gpsState,
                } : null}
              />
            </LazyMount>
          ) : (
            <div style={{ height: 440, display: 'grid', placeItems: 'center', color: 'var(--text-secondary)' }}>
              No active routes are available for this tenant.
            </div>
          )}
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
                  backgroundColor: filterType === 'ALL' ? 'var(--brand-action)' : 'var(--bg-surface-muted)',
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
                  backgroundColor: filterType === 'LOGIN' ? 'var(--brand-action)' : 'var(--bg-surface-muted)',
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
                  backgroundColor: filterType === 'LOGOUT' ? 'var(--brand-action)' : 'var(--bg-surface-muted)',
                  color: filterType === 'LOGOUT' ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                Logout
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {showInitialSkeleton ? (
              <ContentLoadingSkeleton kind="list" count={5} label="Loading active trips…" />
            ) : filteredRoutes.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Car size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: '14px', fontWeight: 600 }}>No Active Trips in Corridor</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Vehicles will appear here as live GPS signals arrive.
                </div>
              </div>
            ) : (
              <>
                {visibleRoutes.map((rt) => {
                  const isSelected = selectedRoute?.id === rt.id;
                  return (
                    <div
                      key={rt.id}
                      onClick={() => setSelectedRoute(rt)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                        backgroundColor: isSelected ? 'var(--brand-primary-subtle)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {rt.vehicle?.registrationNumber ?? rt.vehiclePlate ?? '—'}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-success)', backgroundColor: 'var(--color-success-bg)', padding: '2px 6px', borderRadius: '4px' }}>
                          {rt.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {rt.direction} · {rt.driver?.fullName ?? rt.driverName ?? '—'} · {rt._count?.stops ?? rt.stopsCount ?? 0} stops
                      </div>
                    </div>
                  );
                })}
                <LazyScrollSentinel
                  sentinelRef={sentinelRef}
                  hasMore={hasMore}
                  label="Loading more active trips…"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
