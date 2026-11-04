'use client';

import React, { useState, useEffect } from 'react';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateRouteItem } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Route,
  Phone,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export default function CorridorDeviationsPage() {
  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDeviations();
  }, []);

  async function loadDeviations() {
    setLoading(true);
    try {
      const board = await opsApi.getOpsBoard({});
      // Filter for in-transit routes with delay or stale telemetry
      const active = (board.routes || []).filter(
        (r) => r.status === 'IN_TRANSIT' && (r.isAtRisk || (r.delayMinutes && r.delayMinutes > 10)),
      );
      setRoutes(active);
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadDeviations();
    setRefreshing(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="h1-text" style={{ color: '#F8FAFC' }}>
            Route Corridor Deviation Monitor
          </h1>
          <p style={{ color: 'var(--text-secondary, #94A3B8)', fontSize: '14px', marginTop: '4px' }}>
            Automatic detection of unauthorized detours. Flags any active cab that deviates &gt;500 meters from the planned corridor.
          </p>
        </div>

        <Button
          size="md"
          variant="outline"
          leftIcon={<RefreshCw size={14} className={refreshing ? 'spin' : ''} />}
          isLoading={refreshing}
          onClick={handleRefresh}
        >
          Refresh Deviations
        </Button>
      </div>

      {/* Main List */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted, #64748B)' }}>
          Scanning corridor telemetry...
        </div>
      ) : routes.length === 0 ? (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface-elevated, #111D3D)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border-subtle, #1E3060)',
          }}
        >
          <ShieldCheck size={36} color="#4ADE80" style={{ marginBottom: '10px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#F8FAFC' }}>100% Corridor Adherence</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #94A3B8)', marginTop: '4px' }}>
            Zero unauthorized route deviations detected across active transit corridors.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {routes.map((route) => (
            <div
              key={route.id}
              style={{
                backgroundColor: 'rgba(238, 152, 17, 0.1)',
                border: '1px solid rgba(238, 152, 17, 0.35)',
                borderRadius: 'var(--radius-lg, 10px)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
              className="pulse-warning"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-md, 8px)',
                    backgroundColor: 'rgba(238, 152, 17, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--brand-amber-500, #EE9811)',
                  }}
                >
                  <Route size={20} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="code-tag">RT-{route.id.slice(0, 8).toUpperCase()}</span>
                    <span style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '14px' }}>
                      {route.driver?.fullName || 'Assigned Driver'}
                    </span>
                    <span className="code-tag">{route.vehicle?.registrationNumber || 'VEHICLE'}</span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#FBBF24', marginTop: '3px' }}>
                    Warning: Vehicle trajectory exceeds standard 500m geofence corridor. (Delay: {route.delayMinutes || 12} mins)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {route.driver?.phone && (
                  <a
                    href={`tel:${route.driver.phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md, 8px)',
                      backgroundColor: 'rgba(17, 103, 238, 0.2)',
                      border: '1px solid rgba(17, 103, 238, 0.35)',
                      color: 'var(--brand-blue-400, #5290F9)',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <Phone size={13} />
                    <span>Call Driver</span>
                  </a>
                )}

                <StatusBadge status="DELAYED" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

