'use client';

import React, { useState, useEffect } from 'react';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateRouteItem } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  Car,
  Radio,
  Compass,
  Phone,
  RefreshCw,
} from 'lucide-react';

function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

export default function FleetLiveMapPage() {
  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<CorporateRouteItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayIst());

  useEffect(() => {
    loadMapData();
    const interval = setInterval(loadMapData, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, [selectedDate]);

  async function loadMapData() {
    try {
      const board = await opsApi.getOpsBoard({ date: selectedDate });
      const active = (board.routes || []).filter(
        (r) => r.status === 'IN_TRANSIT' || r.status === 'ASSIGNED' || r.status === 'DISPATCHING',
      );
      setRoutes(active);
    } catch {
      // quiet
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadMapData();
    setRefreshing(false);
  }

  const centerLat = 17.4435;
  const centerLng = 78.3772;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 104px)', gap: '16px' }}>
      {/* Map Control Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: 'var(--bg-surface)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-lg, 10px)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              color: 'var(--color-success)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Radio size={13} className="pulse-warning" />
            <span>{routes.length} Active GPS Transponders</span>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Corridor: Hyderabad Tech Hub (HITEC City · Financial District · Gachibowli)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              height: '32px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '0 8px',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
            }}
          />

          <Button
            size="sm"
            variant="outline"
            leftIcon={<RefreshCw size={13} className={refreshing ? 'spin' : ''} />}
            isLoading={refreshing}
            onClick={handleRefresh}
          >
            Poll GPS
          </Button>
        </div>
      </div>

      {/* Main Map Canvas & Side Telemetry Pane */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
        {/* Map Canvas */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-surface-muted)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border-subtle)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Subtle Grid pattern representing GIS road corridors */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                linear-gradient(to right, var(--border-subtle) 1px, transparent 1px),
                linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
              opacity: 0.7,
            }}
          />

          {/* Compass / Location Watermark */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '8px 12px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              fontFamily: 'ui-monospace, monospace',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            LAT: {centerLat.toFixed(4)}° N · LNG: {centerLng.toFixed(4)}° E · ZOOM: 13.5
          </div>

          {/* Fleet Markers positioned across the grid */}
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {routes.map((route, i) => {
              const offsetX = 15 + ((i * 27) % 70);
              const offsetY = 15 + ((i * 33) % 70);
              const isSelected = selectedRoute?.id === route.id;
              const isDelayed = route.delayMinutes && route.delayMinutes > 10;

              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  style={{
                    position: 'absolute',
                    left: `${offsetX}%`,
                    top: `${offsetY}%`,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    zIndex: isSelected ? 30 : 10,
                    transition: 'transform 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: isSelected
                        ? 'var(--brand-blue-500, #5728B2)'
                        : isDelayed
                        ? 'var(--color-danger, #DC2626)'
                        : 'var(--bg-surface)',
                      border: `2px solid ${
                        isSelected
                          ? '#FFFFFF'
                          : isDelayed
                          ? '#EF4444'
                          : '#16A34A'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected || isDelayed ? '#FFFFFF' : '#16A34A',
                      boxShadow: isSelected ? 'var(--shadow-glow-blue)' : '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                    className={isDelayed ? 'pulse-critical' : ''}
                  >
                    <Car size={18} />
                  </div>

                  {/* Label Pill */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '40px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-xs, 4px)',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    {route.driver?.fullName?.split(' ')[0] || `RT-${route.id.slice(0, 4)}`}
                  </div>
                </div>
              );
            })}
          </div>

          {routes.length === 0 && !loading && (
            <div
              style={{
                position: 'relative',
                zIndex: 5,
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface)',
                padding: '24px 32px',
                borderRadius: 'var(--radius-lg, 10px)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <Car size={32} color="var(--brand-blue-500, #5728B2)" style={{ marginBottom: '8px' }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>No active cabs on road</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                All scheduled routes for this date are in PLANNED or COMPLETED state.
              </p>
            </div>
          )}
        </div>

        {/* Selected Vehicle Telemetry Side Card */}
        {selectedRoute ? (
          <div
            style={{
              width: '320px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg, 10px)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="code-tag">RT-{selectedRoute.id.slice(0, 8).toUpperCase()}</span>
                <StatusBadge status={selectedRoute.status} size="sm" />
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedRoute.driver?.fullName || 'Unassigned Driver'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {selectedRoute.vehicle?.model} · <span className="code-tag">{selectedRoute.vehicle?.registrationNumber || 'VEHICLE'}</span>
              </p>

              <div
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border-subtle)',
                  marginTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Shift:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedRoute.shiftTime} ({selectedRoute.direction})
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Occupancy:</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-success, #16A34A)' }}>
                    {selectedRoute.assignedPassengerCount} / {selectedRoute.maxCapacity} seats filled
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Destination:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedRoute.office?.name || 'Office Campus'}
                  </span>
                </div>
              </div>

              {selectedRoute.driver?.phone && (
                <div style={{ marginTop: '16px' }}>
                  <a
                    href={`tel:${selectedRoute.driver.phone}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md, 8px)',
                      backgroundColor: 'var(--brand-primary-subtle)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--brand-blue-500, #5728B2)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <Phone size={14} />
                    <span>Call Driver ({selectedRoute.driver.phone})</span>
                  </a>
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedRoute(null)}
              style={{ width: '100%', marginTop: '16px' }}
            >
              Close Telemetry
            </Button>
          </div>
        ) : (
          <div
            style={{
              width: '280px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg, 10px)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'var(--text-muted)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <Compass size={32} style={{ marginBottom: '8px', opacity: 0.6, color: 'var(--brand-blue-500, #5728B2)' }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Select Vehicle
            </div>
            <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-secondary)' }}>
              Click any vehicle transponder on the map to inspect live driver telemetry and route progress.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
