'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { opsApi, getApiBaseUrl, getStoredOpsToken } from '../../lib/api/opsClient';
import { CorporateRouteItem } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LiveVehicleTelemetryPayload } from '@adhocx/contracts';
import { ACTIVE_ROUTE_STATUSES, GPS_COLORS, gpsStateOf, MARKER_DROP_AFTER_SEC, shortestTurnDeg } from '../../lib/fleet-telemetry';
import {
  Car,
  Radio,
  Compass,
  Phone,
  RefreshCw,
  Gauge,
  Navigation,
  Battery,
  ShieldCheck,
} from 'lucide-react';

function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

interface VehicleInterpolationState {
  // Animation segment: the marker moves from `from` to `to` over `durationMs`, starting at `startMs`.
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  startMs: number;
  durationMs: number;
  currentLat: number;
  currentLng: number;
  currentHeading: number;
  targetHeading: number;
  lastFixMs: number;
  marker: any;
  telemetry: LiveVehicleTelemetryPayload;
}

export default function FleetLiveMapPage() {
  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<CorporateRouteItem | null>(null);
  const [selectedTelemetry, setSelectedTelemetry] = useState<LiveVehicleTelemetryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayIst());
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'LIVE' | 'RECONNECTING'>('CONNECTING');
  const [liveFixCount, setLiveFixCount] = useState<number>(0);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const vehicleStatesRef = useRef<Map<string, VehicleInterpolationState>>(new Map());
  const routesMapRef = useRef<Map<string, CorporateRouteItem>>(new Map());
  const activePolylineRef = useRef<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const centerLat = 17.4435;
  const centerLng = 78.3772;

  // ─── 1. Google Maps Script Loader ───────────────────────────────────────────
  const loadGoogleMapsScript = useCallback((callback: () => void) => {
    if ((window as any).google && (window as any).google.maps) {
      callback();
      return;
    }

    if (document.getElementById('google-maps-script')) {
      const existing = (window as any).initOpsFleetMap;
      (window as any).initOpsFleetMap = () => {
        existing?.();
        callback();
      };
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initOpsFleetMap&loading=async&v=weekly`;
    (window as any).initOpsFleetMap = callback;
    document.head.appendChild(script);
  }, []);

  // ─── 2. Initialize Google Map ───────────────────────────────────────────────
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || !(window as any).google) return;
    const google = (window as any).google;

    const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

    if (!googleMapRef.current) {
      googleMapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 12.5,
        mapId: 'adhocx_ops_live_cockpit',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        styles: isDark
          ? [
              { elementType: 'geometry', stylers: [{ color: '#171717' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0A' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#A3A3A3' }] },
              { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262626' }] },
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1F1F1F' }] },
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            ]
          : [
              { featureType: 'poi', stylers: [{ visibility: 'off' }] },
              { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
            ],
      });
    }
  }, [centerLat, centerLng]);

  const selectedRouteRef = useRef<CorporateRouteItem | null>(null);
  useEffect(() => {
    selectedRouteRef.current = selectedRoute;
  }, [selectedRoute]);

  // ─── 3. Apply a fix (from the snapshot or the stream) ──────────────────────
  const applyFix = useCallback((telemetry: LiveVehicleTelemetryPayload, countAsLive: boolean) => {
    const g = (window as any).google;
    if (!googleMapRef.current || !g) return;
    if (!telemetry?.routeId || !Number.isFinite(telemetry.lat) || !Number.isFinite(telemetry.lng) || !Number.isFinite(telemetry.recordedAt)) return;
    if (countAsLive) setLiveFixCount((prev) => prev + 1);

    const nowMs = performance.now();
    const state = gpsStateOf(telemetry.recordedAt);
    const fix = { ...telemetry, gpsState: state };
    const existing = vehicleStatesRef.current.get(telemetry.routeId);

    if (existing) {
      if (telemetry.recordedAt < existing.telemetry.recordedAt) return; // older than what we show
      // Animate from where the marker is now to the new fix over the gap between fixes,
      // so the cab keeps moving until the next fix instead of jumping and stopping.
      existing.fromLat = existing.currentLat;
      existing.fromLng = existing.currentLng;
      existing.toLat = telemetry.lat;
      existing.toLng = telemetry.lng;
      existing.startMs = nowMs;
      existing.durationMs = Math.min(Math.max(telemetry.recordedAt - existing.telemetry.recordedAt, 500), 5000);
      existing.targetHeading = telemetry.heading;
      existing.lastFixMs = telemetry.recordedAt;
      existing.telemetry = fix;
      const icon = existing.marker.getIcon() as any;
      if (icon) {
        icon.fillColor = GPS_COLORS[state];
        existing.marker.setIcon(icon);
      }
    } else {
      const marker = new g.maps.Marker({
        position: { lat: telemetry.lat, lng: telemetry.lng },
        map: googleMapRef.current,
        title: `${telemetry.driverName || 'Cab'} (RT-${telemetry.routeId.slice(0, 6)})`,
        icon: {
          path: g.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: GPS_COLORS[state],
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#FFFFFF',
          rotation: telemetry.heading,
        },
      });
      marker.addListener('click', () => {
        const route = routesMapRef.current.get(telemetry.routeId);
        if (route) setSelectedRoute(route);
        setSelectedTelemetry(vehicleStatesRef.current.get(telemetry.routeId)?.telemetry ?? fix);
      });
      vehicleStatesRef.current.set(telemetry.routeId, {
        fromLat: telemetry.lat,
        fromLng: telemetry.lng,
        toLat: telemetry.lat,
        toLng: telemetry.lng,
        startMs: nowMs,
        durationMs: 1,
        currentLat: telemetry.lat,
        currentLng: telemetry.lng,
        currentHeading: telemetry.heading,
        targetHeading: telemetry.heading,
        lastFixMs: telemetry.recordedAt,
        marker,
        telemetry: fix,
      });
    }

    if (selectedRouteRef.current?.id === telemetry.routeId) setSelectedTelemetry(fix);
  }, []);

  const removeVehicle = useCallback((routeId: string) => {
    const v = vehicleStatesRef.current.get(routeId);
    if (!v) return;
    v.marker.setMap(null);
    vehicleStatesRef.current.delete(routeId);
  }, []);

  // ─── 4. Snapshot: real last-known positions (never guessed) ────────────────
  const loadSnapshot = useCallback(async () => {
    try {
      const fixes = await opsApi.getFleetSnapshot();
      fixes.forEach((f) => applyFix(f, false));
    } catch {
      // the stream still delivers new fixes
    }
  }, [applyFix]);

  // ─── 5. Live stream with reconnect (exponential backoff, re-hydrates on reconnect) ──
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connectStream = useCallback(async () => {
    if (unmountedRef.current) return;
    eventSourceRef.current?.close();
    // Loading the snapshot first also refreshes an expired access token before it goes in the URL.
    await loadSnapshot();
    if (unmountedRef.current) return;
    const token = getStoredOpsToken();
    const url = `${getApiBaseUrl()}/corporate/trips/routes/fleet/live-stream${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    es.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnectionStatus('LIVE');
    };
    es.onmessage = (event) => {
      try {
        applyFix(JSON.parse(event.data) as LiveVehicleTelemetryPayload, true);
      } catch {
        // ignore malformed frames
      }
    };
    es.onerror = () => {
      es.close();
      setConnectionStatus('RECONNECTING');
      const attempt = reconnectAttemptRef.current++;
      const delay = Math.min(1000 * 2 ** attempt, 30_000);
      reconnectTimerRef.current = setTimeout(() => void connectStream(), delay);
    };
  }, [applyFix, loadSnapshot]);

  // ─── 6. Animation loop + freshness sweep ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let lastSweep = 0;
    const loop = (now: number) => {
      if (cancelled) return;
      vehicleStatesRef.current.forEach((veh) => {
        const t = Math.min(1, (now - veh.startMs) / veh.durationMs);
        const lat = veh.fromLat + (veh.toLat - veh.fromLat) * t;
        const lng = veh.fromLng + (veh.toLng - veh.fromLng) * t;
        if (lat !== veh.currentLat || lng !== veh.currentLng) {
          veh.currentLat = lat;
          veh.currentLng = lng;
          veh.marker.setPosition({ lat, lng });
        }
        const turn = shortestTurnDeg(veh.currentHeading, veh.targetHeading);
        if (Math.abs(turn) > 0.5) {
          veh.currentHeading = (veh.currentHeading + turn * 0.15 + 360) % 360;
          const icon = veh.marker.getIcon() as any;
          if (icon) {
            icon.rotation = Math.round(veh.currentHeading);
            veh.marker.setIcon(icon);
          }
        }
      });
      // Every 5 s: re-derive GPS freshness (a cab that stops reporting turns STALE, then OFFLINE)
      // and drop cabs that have been silent for a long time.
      if (now - lastSweep > 5000) {
        lastSweep = now;
        const nowMs = Date.now();
        vehicleStatesRef.current.forEach((veh, routeId) => {
          if ((nowMs - veh.lastFixMs) / 1000 > MARKER_DROP_AFTER_SEC) {
            removeVehicle(routeId);
            return;
          }
          const state = gpsStateOf(veh.lastFixMs, nowMs);
          if (state !== veh.telemetry.gpsState) {
            veh.telemetry = { ...veh.telemetry, gpsState: state };
            const icon = veh.marker.getIcon() as any;
            if (icon) {
              icon.fillColor = GPS_COLORS[state];
              veh.marker.setIcon(icon);
            }
            if (selectedRouteRef.current?.id === routeId) setSelectedTelemetry(veh.telemetry);
          }
        });
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [removeVehicle]);

  // ─── 7. Route list for the selected date (no markers are invented here) ────
  const loadMapData = useCallback(async () => {
    try {
      const board = await opsApi.getOpsBoard({ date: selectedDate });
      const active = (board.routes || []).filter((r) => ACTIVE_ROUTE_STATUSES.has(r.status));
      setRoutes(active);
      const byId = new Map<string, CorporateRouteItem>();
      active.forEach((r) => byId.set(r.id, r));
      routesMapRef.current = byId;
    } catch {
      // quiet
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // ─── 8. Bootstrap once ─────────────────────────────────────────────────────
  useEffect(() => {
    unmountedRef.current = false;
    loadGoogleMapsScript(() => {
      initMap();
      void connectStream();
    });
    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      eventSourceRef.current?.close();
    };
    // connectStream / initMap / loadGoogleMapsScript are stable (no changing deps)
  }, [loadGoogleMapsScript, initMap, connectStream]);

  useEffect(() => {
    void loadMapData();
  }, [loadMapData]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadMapData(), loadSnapshot()]);
    setRefreshing(false);
  }

  // Draw active path when route is selected
  useEffect(() => {
    if (!googleMapRef.current || !(window as any).google) return;

    if (activePolylineRef.current) {
      activePolylineRef.current.setMap(null);
      activePolylineRef.current = null;
    }

    if (selectedRoute) {
      const vState = vehicleStatesRef.current.get(selectedRoute.id);
      if (vState) {
        googleMapRef.current.panTo({ lat: vState.currentLat, lng: vState.currentLng });
        googleMapRef.current.setZoom(14.5);
      }
    }
  }, [selectedRoute]);

  const activeVehiclesCount = vehicleStatesRef.current.size;

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
          {/* Connection Status Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: connectionStatus === 'LIVE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
              border: `1px solid ${connectionStatus === 'LIVE' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
              color: connectionStatus === 'LIVE' ? '#16A34A' : '#CA8A04',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Radio size={13} className={connectionStatus === 'LIVE' ? 'pulse-warning' : 'spin'} />
            <span>
              {connectionStatus === 'LIVE'
                ? `${activeVehiclesCount} of ${routes.length} active routes reporting GPS`
                : 'Reconnecting Stream...'}
            </span>
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
            Resync Fleet
          </Button>
        </div>
      </div>

      {/* Main Map Canvas & Side Telemetry Pane */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
        {/* Native Google Map Canvas */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-surface-muted)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border-subtle)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Map Mount Point */}
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {/* Map Watermark & Telemetry Statistics */}
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
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            ENGINE: 60 FPS LERP · PROTOCOL: REDIS PUB/SUB SSE · PINGS: {liveFixCount}
          </div>

          {activeVehiclesCount === 0 && !loading && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
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
              width: '340px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg, 10px)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-card)',
              overflowY: 'auto',
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

              {/* Real-time Telemetry Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginTop: '14px',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface-muted)',
                    padding: '10px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <Gauge size={13} />
                    <span>Velocity</span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {selectedTelemetry?.speedKph ?? 0} <span style={{ fontSize: '11px', fontWeight: 400 }}>km/h</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-surface-muted)',
                    padding: '10px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <Navigation size={13} />
                    <span>Bearing</span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {Math.round(selectedTelemetry?.heading ?? 0)}° <span style={{ fontSize: '11px', fontWeight: 400 }}>heading</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-surface-muted)',
                    padding: '10px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <ShieldCheck size={13} />
                    <span>GPS Signal</span>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: GPS_COLORS[selectedTelemetry?.gpsState ?? 'OFFLINE'],
                      marginTop: '6px',
                    }}
                  >
                    {selectedTelemetry?.gpsState ?? 'OFFLINE'}{selectedTelemetry?.accuracyM !== undefined ? ` (±${Math.round(selectedTelemetry.accuracyM)}m)` : ''}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-surface-muted)',
                    padding: '10px',
                    borderRadius: 'var(--radius-md, 8px)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px' }}>
                    <Battery size={13} />
                    <span>Battery</span>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '6px' }}>
                    {selectedTelemetry?.batteryPct !== undefined ? `${selectedTelemetry.batteryPct}%` : '—'}
                  </div>
                </div>
              </div>

              {/* Route Summary */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md, 8px)',
                  border: '1px solid var(--border-subtle)',
                  marginTop: '12px',
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
              onClick={() => {
                setSelectedRoute(null);
                setSelectedTelemetry(null);
              }}
              style={{ width: '100%', marginTop: '16px' }}
            >
              Close Telemetry
            </Button>
          </div>
        ) : (
          <div
            style={{
              width: '300px',
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
