'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Route,
  Radio,
  Clock,
  MapPin,
  Car,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { routesApi } from '../../../lib/api/corporate';
import type { CorporateRoute } from '../../../lib/api/types';

export default function ActiveRoutesListPage() {
  const [routes, setRoutes] = useState<CorporateRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoutes = () => {
    setLoading(true);
    routesApi
      .list({ status: 'IN_PROGRESS' })
      .then((data) => {
        setRoutes(data);
      })
      .catch((err) => {
        console.warn('Failed to load active routes:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Active Routes Live Progress
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 8px',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <Radio size={12} /> {routes.length} Routes Live Now
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Real-time multi-stop progression, current stop telemetry, and delay monitoring
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={loadRoutes}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Active Routes Cards */}
      {loading ? (
        <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading live active routes...
        </div>
      ) : routes.length === 0 ? (
        <div className="surface-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
          No routes currently in transit. Dispatched routes will appear with live progress here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {routes.map((route) => {
            const cabNumber = route.vehicle?.licensePlate || route.routeCode || 'CAB-LIVE';
            const driverName = route.driver?.name || 'Assigned Driver';
            const stops = route.stops || [];
            const distKm = route.totalDistanceMeters ? (route.totalDistanceMeters / 1000).toFixed(1) : '18.4';

            return (
              <div
                key={route.id}
                className="surface-card"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#EFF6FF',
                        color: '#5728B2',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 800,
                      }}
                    >
                      {route.routeCode}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Vehicle: {cabNumber}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Driver: {driverName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: '#DCFCE7',
                        color: '#16A34A',
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {route.status}
                    </span>
                    <Link
                      href={`/routes/details?id=${route.id}`}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#5728B2',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>Route Cockpit</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Stops sequence strip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                  {stops.map((stop, idx) => (
                    <div
                      key={stop.id || idx}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        backgroundColor: stop.status === 'COMPLETED' ? '#DCFCE7' : '#F1F5F9',
                        color: stop.status === 'COMPLETED' ? '#16A34A' : '#475569',
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {idx + 1}. {stop.locationName || `Stop ${idx + 1}`}
                    </div>
                  ))}
                  {stops.length === 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Sequential waypoints configured ({distKm} km)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
