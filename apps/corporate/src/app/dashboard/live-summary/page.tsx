'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Radio, CheckSquare, Clock, AlertOctagon, CheckCircle2, Car, ArrowRight } from 'lucide-react';
import { MetricCard } from '../../../components/common/MetricCard';
import { FilterBar } from '../../../components/common/FilterBar';
import { MiniLiveMap } from '../../../components/maps/MiniLiveMap';
import { analyticsApi, routesApi } from '../../../lib/api/corporate';
import type { Dashboard, RouteListItem } from '../../../lib/api/types';
import { useSession } from '../../../lib/auth/SessionContext';

export default function LiveOperationsSummaryPage() {
  const { tenantId } = useSession();
  const activeTenantId = tenantId || '9d66820f-280c-400c-98dc-e021d0045b58';

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteListItem | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);

    Promise.all([
      analyticsApi.dashboard({ tenantId: activeTenantId, from: today, to: today }).catch(() => null),
      routesApi.list(activeTenantId, { status: 'IN_PROGRESS' }).catch(() => []),
    ])
      .then(([dash, rts]) => {
        setDashboard(dash);
        setRoutes(rts);
        if (rts.length > 0) setSelectedRoute(rts[0]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [activeTenantId]);

  const activeTripsVal = dashboard?.trips?.byStatus?.['IN_PROGRESS'] ?? routes.length;
  const assignedTripsVal = dashboard?.trips?.byStatus?.['ASSIGNED'] ?? 0;
  const delayedTripsVal = dashboard?.punctuality?.latePickups ?? 0;
  const unservedTripsVal = dashboard?.requests?.unserved ?? 0;
  const completedTripsVal = dashboard?.trips?.byStatus?.['COMPLETED'] ?? 0;

  const currentCabPlate = selectedRoute?.vehicle?.registrationNumber || 'TS09UB7845';
  const currentEta = selectedRoute?.estDurationSeconds ? `${Math.round(selectedRoute.estDurationSeconds / 60)} min` : '12 min';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Live Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Live Operations
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Real-time status of all trips, vehicles and employees
          </p>
        </div>

        <FilterBar
          showOffices={true}
          showTripTypes={true}
          showDateRange={false}
          liveStatusText="Live (Telemetry Active)"
          onRefresh={loadData}
        />
      </div>

      {/* 5 KPI Operational Metrics */}
      <div className="metric-grid">
        <MetricCard
          label="Active Trips"
          value={activeTripsVal.toString()}
          icon={<Radio size={18} />}
          trend={{ value: 'Live', isLive: true }}
          highlightColor="#16A34A"
        />
        <MetricCard
          label="Assigned Trips"
          value={assignedTripsVal.toString()}
          icon={<CheckSquare size={18} />}
          trend={{ value: '+5.6%', isPositive: true }}
          highlightColor="#6366F1"
        />
        <MetricCard
          label="Delayed Trips"
          value={delayedTripsVal.toString()}
          icon={<Clock size={18} />}
          trend={{ value: '-15%', isPositive: true }}
          highlightColor="#EE9811"
        />
        <MetricCard
          label="Unserved Trips"
          value={unservedTripsVal.toString()}
          icon={<AlertOctagon size={18} />}
          trend={{ value: '0', isPositive: true }}
          highlightColor="#DC2626"
        />
        <MetricCard
          label="Completed Today"
          value={completedTripsVal.toString()}
          icon={<CheckCircle2 size={18} />}
          trend={{ value: '+6.8%', isPositive: true }}
          highlightColor="#059669"
        />
      </div>

      {/* Split Content: 65% Interactive Live Map + 35% Active Trips Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Left: Interactive Map */}
        <div className="surface-card" style={{ padding: '20px 24px', flex: '1 1 60%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Active Fleet Live Telemetry
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Real-time tracking of route corridors across Hyderabad
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulse-green" />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#16A34A' }}>
                Streaming GPS
              </span>
            </div>
          </div>

          <MiniLiveMap
            height={360}
            activeVehiclePlate={currentCabPlate}
            activeEta={currentEta}
          />
        </div>

        {/* Right: Active Trips (Live) List */}
        <div className="surface-card" style={{ padding: '20px 24px', flex: '1 1 35%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Active Trips (Live)
            </h2>
            <Link
              href="/live"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#5728B2',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '360px', overflowY: 'auto' }}>
            {routes.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Car size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: '14px', fontWeight: 600 }}>No Active Trips Right Now</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Vehicles will appear here when drivers start their shift corridors.
                </div>
              </div>
            ) : (
              routes.map((rt) => {
                const isSelected = selectedRoute?.id === rt.id;
                return (
                  <div
                    key={rt.id}
                    onClick={() => setSelectedRoute(rt)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${isSelected ? '#5728B2' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'var(--brand-primary-subtle, #EFF6FF)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Car size={16} color={isSelected ? '#5728B2' : '#64748B'} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {rt.vehicle?.registrationNumber ?? rt.id.slice(0, 8)}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: '#DCFCE7',
                          color: '#16A34A',
                          border: '1px solid #86EFAC',
                        }}
                      >
                        {rt.status}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      {rt.direction} · <strong>{rt.driver?.fullName ?? 'Driver Assigned'}</strong> · {rt._count?.stops ?? 0} stops
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Occupancy: {rt.assignedPassengerCount}/{rt.maxCapacity} seats</span>
                      <span>Shift: {rt.shiftTime}</span>
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
