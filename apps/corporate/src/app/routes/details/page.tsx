'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Navigation,
  ArrowLeft,
  MapPin,
  Clock,
  Car,
  Users,
  CheckCircle2,
  Phone,
} from 'lucide-react';
import { routesApi } from '../../../lib/api/corporate';
import type { CorporateRoute } from '../../../lib/api/types';
import MiniLiveMap from '../../../components/maps/MiniLiveMap';

function RouteDetailsStopsContent() {
  const searchParams = useSearchParams();
  const routeId = searchParams.get('id');

  const [route, setRoute] = useState<CorporateRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    routesApi
      .list()
      .then((routes) => {
        if (routes.length > 0) {
          const match = routeId ? routes.find((r) => r.id === routeId) : null;
          setRoute(match || routes[0]);
        }
      })
      .catch((err) => {
        console.warn('Failed to load route details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [routeId]);

  if (loading) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading corridor stops...
      </div>
    );
  }

  if (!route) {
    return (
      <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Route not found.
      </div>
    );
  }

  const cabNumber = route.vehicle?.licensePlate || route.routeCode || 'CAB-LIVE';
  const driverName = route.driver?.name || 'Assigned Driver';
  const stops = route.stops || [];
  const distKm = route.totalDistanceMeters ? (route.totalDistanceMeters / 1000).toFixed(1) : '16.5';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/routes"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <ArrowLeft size={14} /> Back to Routes
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Route Details — {route.routeCode}
              </h1>
              <span
                style={{
                  padding: '2px 8px',
                  backgroundColor: route.status === 'IN_PROGRESS' ? '#DCFCE7' : '#EFF6FF',
                  color: route.status === 'IN_PROGRESS' ? '#16A34A' : '#5728B2',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {route.status}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Waypoint progression, assigned commuters, and corridor telemetry
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1.3fr) minmax(300px, 1fr)', gap: 16 }}>
        {/* Left Column: Map and Stop Sequence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="surface-card" style={{ padding: 16, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <MiniLiveMap height={320} routeName={`${route.routeCode} Waypoint Radar`} />
          </div>

          {/* Sequential Stops */}
          <div className="surface-card" style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              Waypoint Sequence ({stops.length} Stops)
            </h3>
            {stops.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                No discrete stop waypoints logged for this route. Total corridor distance: {distKm} km.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stops.map((stop, idx) => (
                  <div key={stop.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: stop.status === 'COMPLETED' ? '#DCFCE7' : '#EFF6FF',
                          color: stop.status === 'COMPLETED' ? '#16A34A' : '#5728B2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {stop.locationName || `Waypoint ${idx + 1}`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {stop.address || 'Pickup Stop'}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: stop.status === 'COMPLETED' ? '#16A34A' : '#64748B',
                      }}
                    >
                      {stop.status || 'SCHEDULED'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Vehicle & Driver Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="surface-card" style={{ padding: 20, backgroundColor: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              Vehicle & Driver Manifest
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Cab Plate</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#5728B2', marginTop: 2 }}>{cabNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Driver</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{driverName}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Distance</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{distKm} km</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RouteDetailsStopsPage() {
  return (
    <Suspense fallback={<div className="surface-card" style={{ padding: 40, textAlign: 'center' }}>Loading route...</div>}>
      <RouteDetailsStopsContent />
    </Suspense>
  );
}
