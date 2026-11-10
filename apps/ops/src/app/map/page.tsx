'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { opsApi, getApiBaseUrl } from '../../lib/api/opsClient';
import { CorporateRouteItem } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import { VehicleListPanel } from '../../components/map/VehicleListPanel';
import { VehicleDetailPanel } from '../../components/map/VehicleDetailPanel';
import { CanvasVehicle, FleetCanvasOverlay, createFleetCanvasOverlay } from '../../components/map/fleetCanvasOverlay';
import {
  ACTIVE_ROUTE_STATUSES,
  FleetFix,
  GPS_COLORS,
  GpsState,
  KIND_STROKE,
  LatLngBoundsLiteral,
  MARKER_DROP_AFTER_SEC,
  VehicleKind,
  VehicleListItem,
  gpsStateOf,
  isInViewport,
  isValidFix,
  kindOf,
  lerp,
  mergeFix,
  parseFixFrame,
  segmentDurationMs,
  segmentProgress,
  stepHeading,
  toListItem,
} from '../../lib/fleet-telemetry';
import { Car, Radio, RefreshCw } from 'lucide-react';

function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

const DEFAULT_CENTER = { lat: 17.4435, lng: 78.3772 };
const UI_TICK_MS = 1000;
const FRESHNESS_SWEEP_MS = 5000;

const DARK_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#171717' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0A' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A3A3A3' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#262626' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1F1F1F' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];
const LIGHT_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
];

function isDarkTheme(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
}

interface VehicleState {
  // Animation segment: the cab moves from `from` to `to` over `durationMs`, starting at `startMs`.
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
  kind: VehicleKind;
  telemetry: FleetFix;
}

interface UiSnapshot {
  nowMs: number;
  items: VehicleListItem[];
  liveFixCount: number;
  lastFixAt: number | null;
}

function* canvasVehicles(states: Map<string, VehicleState>): Generator<CanvasVehicle> {
  for (const [id, v] of states) {
    yield {
      id,
      lat: v.currentLat,
      lng: v.currentLng,
      heading: v.currentHeading,
      fill: GPS_COLORS[v.telemetry.gpsState as GpsState] ?? GPS_COLORS.OFFLINE,
      stroke: KIND_STROKE[v.kind],
      shape: v.kind === 'TRIP' ? 'NAV' : 'ARROW',
    };
  }
}

export default function FleetLiveMapPage() {
  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayIst());
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'LIVE' | 'RECONNECTING'>('CONNECTING');
  // Everything derived from the fix stream reaches React only on the 1 s UI tick (never per fix).
  const [ui, setUi] = useState<UiSnapshot>({ nowMs: Date.now(), items: [], liveFixCount: 0, lastFixAt: null });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const overlayRef = useRef<FleetCanvasOverlay | null>(null);
  const boundsRef = useRef<LatLngBoundsLiteral | null>(null);
  const vehicleStatesRef = useRef<Map<string, VehicleState>>(new Map());
  const routesMapRef = useRef<Map<string, CorporateRouteItem>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const liveFixCountRef = useRef(0);
  const lastFixAtRef = useRef<number | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

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
  // No mapId: with a mapId, Google ignores `styles` (cloud styling), which broke the dark theme.
  // Cabs are drawn on one canvas overlay (fleetCanvasOverlay.ts), which needs no mapId either.
  const initMap = useCallback(() => {
    if (!mapContainerRef.current || !(window as any).google || googleMapRef.current) return;
    const google = (window as any).google;
    const map = new google.maps.Map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12.5,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      styles: isDarkTheme() ? DARK_STYLES : LIGHT_STYLES,
    });
    map.addListener('idle', () => {
      const b = map.getBounds?.();
      boundsRef.current = b ? (b.toJSON() as LatLngBoundsLiteral) : null;
    });
    const overlay = createFleetCanvasOverlay(google, map);
    overlayRef.current = overlay;
    // Cabs are pixels on a canvas, so clicks and hover are hit-tested against the last frame.
    const pixelOf = (e: any): [number, number] | null => {
      const ev = e?.domEvent as MouseEvent | undefined;
      if (!ev || !mapContainerRef.current) return null;
      const r = mapContainerRef.current.getBoundingClientRect();
      return [ev.clientX - r.left, ev.clientY - r.top];
    };
    map.addListener('click', (e: any) => {
      const px = pixelOf(e);
      const hit = px ? overlay.hitTest(px[0], px[1]) : null;
      if (hit) setSelectedId(hit);
    });
    let pointer = false;
    map.addListener('mousemove', (e: any) => {
      const px = pixelOf(e);
      const over = !!(px && overlay.hitTest(px[0], px[1]));
      if (over !== pointer) {
        pointer = over;
        map.setOptions({ draggableCursor: over ? 'pointer' : null });
      }
    });
    googleMapRef.current = map;
  }, []);

  // Re-style when the theme toggle flips data-theme.
  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return;
    const obs = new MutationObserver(() => {
      googleMapRef.current?.setOptions({ styles: isDarkTheme() ? DARK_STYLES : LIGHT_STYLES });
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // ─── 3. Apply a fix (from the snapshot or the stream). Touches refs only. ───
  const applyFix = useCallback((incoming: FleetFix, countAsLive: boolean) => {
    const g = (window as any).google;
    if (!googleMapRef.current || !g || !isValidFix(incoming)) return;
    if (countAsLive) {
      liveFixCountRef.current += 1;
      lastFixAtRef.current = Date.now();
    }

    const nowMs = performance.now();
    const existing = vehicleStatesRef.current.get(incoming.routeId);

    if (existing) {
      if (incoming.recordedAt < existing.telemetry.recordedAt) return; // older than what we show
      const merged = mergeFix(existing.telemetry, incoming);
      const state = gpsStateOf(merged.recordedAt);
      // Animate from where the cab is drawn now to the new fix over the gap between fixes,
      // so the cab keeps moving until the next fix instead of jumping and stopping.
      existing.fromLat = existing.currentLat;
      existing.fromLng = existing.currentLng;
      existing.toLat = merged.lat;
      existing.toLng = merged.lng;
      existing.startMs = nowMs;
      existing.durationMs = segmentDurationMs(existing.telemetry.recordedAt, merged.recordedAt);
      existing.targetHeading = Number.isFinite(merged.heading) ? merged.heading : existing.targetHeading;
      existing.telemetry = { ...merged, gpsState: state };
      existing.kind = kindOf(merged);
      return;
    }

    const state = gpsStateOf(incoming.recordedAt);
    const kind = kindOf(incoming);
    const heading = Number.isFinite(incoming.heading) ? incoming.heading : 0;
    vehicleStatesRef.current.set(incoming.routeId, {
      fromLat: incoming.lat,
      fromLng: incoming.lng,
      toLat: incoming.lat,
      toLng: incoming.lng,
      startMs: nowMs,
      durationMs: 1,
      currentLat: incoming.lat,
      currentLng: incoming.lng,
      currentHeading: heading,
      targetHeading: heading,
      kind,
      telemetry: { ...incoming, gpsState: state },
    });
  }, []);

  const applyFrame = useCallback((data: string) => {
    parseFixFrame(data).forEach((f) => applyFix(f, true));
  }, [applyFix]);

  const removeVehicle = useCallback((routeId: string) => {
    const v = vehicleStatesRef.current.get(routeId);
    if (!v) return;
    vehicleStatesRef.current.delete(routeId);
  }, []);

  // ─── 4. Snapshot: real last-known positions (never guessed) ────────────────
  const loadSnapshot = useCallback(async () => {
    try {
      const fixes = (await opsApi.getFleetSnapshot()) as FleetFix[];
      (fixes || []).forEach((f) => applyFix(f, false));
    } catch {
      // the stream still delivers new fixes
    }
  }, [applyFix]);

  // ─── 5. Live stream with reconnect (exponential backoff, re-hydrates on reconnect) ──
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  // Every connect attempt (and unmount) bumps this; an attempt that resumes after an await with a
  // stale generation gives up, so two overlapping attempts can never leave an orphaned EventSource.
  const connectGenRef = useRef(0);

  const connectStream = useCallback(async () => {
    if (unmountedRef.current) return;
    const gen = ++connectGenRef.current;
    const stale = () => unmountedRef.current || gen !== connectGenRef.current;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    // Snapshot first (it also refreshes an expired access token), then a single-use ticket for the
    // stream URL: the access token itself never goes in a URL.
    await loadSnapshot();
    if (stale()) return;
    let ticket: string;
    try {
      ticket = (await opsApi.createStreamTicket()).ticket;
    } catch {
      // Treat like a dropped stream: back off and try again (auth failures redirect to login).
      if (stale()) return;
      setConnectionStatus('RECONNECTING');
      const attempt = reconnectAttemptRef.current++;
      reconnectTimerRef.current = setTimeout(() => void connectStream(), Math.min(1000 * 2 ** attempt, 30_000));
      return;
    }
    if (stale()) return;
    const url = `${getApiBaseUrl()}/corporate/trips/routes/fleet/live-stream?ticket=${encodeURIComponent(ticket)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    es.onopen = () => {
      reconnectAttemptRef.current = 0;
      setConnectionStatus('LIVE');
    };
    // Batched frames (current API) and single-object/array default frames (older API builds).
    es.addEventListener('fixes', (event) => applyFrame((event as MessageEvent).data));
    es.onmessage = (event) => applyFrame(event.data);
    // `heartbeat` events need no handler: named events never reach onmessage.
    // The server is about to close because the token expires: reconnect now with a fresh token,
    // without counting it as a failure.
    es.addEventListener('reauth', (event) => {
      es.onerror = null;
      es.close();
      if (eventSourceRef.current === es) eventSourceRef.current = null;
      let reason = '';
      try {
        reason = JSON.parse((event as MessageEvent).data)?.reason ?? '';
      } catch {
        // no reason: treat as expiry
      }
      if (reason === 'REVOKED') {
        // Session was revoked: the ticket request will fail and send the user to login; back off
        // so a revoked session never spins.
        setConnectionStatus('RECONNECTING');
        const attempt = reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(() => void connectStream(), Math.min(1000 * 2 ** attempt, 30_000));
        return;
      }
      reconnectAttemptRef.current = 0;
      void connectStream();
    });
    es.onerror = () => {
      es.close();
      if (eventSourceRef.current !== es) return; // superseded by a newer connection
      eventSourceRef.current = null;
      setConnectionStatus('RECONNECTING');
      const attempt = reconnectAttemptRef.current++;
      const delay = Math.min(1000 * 2 ** attempt, 30_000);
      reconnectTimerRef.current = setTimeout(() => void connectStream(), delay);
    };
  }, [applyFrame, loadSnapshot]);

  // ─── 6. Animation loop (viewport-culled) + freshness sweep ─────────────────
  useEffect(() => {
    let cancelled = false;
    let lastSweep = 0;
    const loop = (now: number) => {
      if (cancelled) return;
      const bounds = boundsRef.current;
      vehicleStatesRef.current.forEach((veh) => {
        const onScreen = isInViewport(veh.toLat, veh.toLng, bounds) || isInViewport(veh.currentLat, veh.currentLng, bounds);
        let lat: number;
        let lng: number;
        if (onScreen) {
          const t = segmentProgress(now, veh.startMs, veh.durationMs);
          lat = lerp(veh.fromLat, veh.toLat, t);
          lng = lerp(veh.fromLng, veh.toLng, t);
          veh.currentHeading = stepHeading(veh.currentHeading, veh.targetHeading);
        } else {
          // Off-screen cabs snap to their target: nobody sees them, so they cost no per-frame work.
          lat = veh.toLat;
          lng = veh.toLng;
          veh.currentHeading = veh.targetHeading;
        }
        veh.currentLat = lat;
        veh.currentLng = lng;
      });
      // One canvas pass for every on-screen cab (STALE/OFFLINE colours come from gpsState).
      overlayRef.current?.render(canvasVehicles(vehicleStatesRef.current), selectedIdRef.current);
      // Every 5 s: re-derive GPS freshness (a cab that stops reporting turns STALE, then OFFLINE)
      // and drop cabs that have been silent for a long time.
      if (now - lastSweep > FRESHNESS_SWEEP_MS) {
        lastSweep = now;
        const nowMs = Date.now();
        vehicleStatesRef.current.forEach((veh, routeId) => {
          if ((nowMs - veh.telemetry.recordedAt) / 1000 > MARKER_DROP_AFTER_SEC) {
            removeVehicle(routeId);
            return;
          }
          const state: GpsState = gpsStateOf(veh.telemetry.recordedAt, nowMs);
          if (state !== veh.telemetry.gpsState) veh.telemetry = { ...veh.telemetry, gpsState: state };
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

  // ─── 7. UI tick: the only place stream-derived data enters React state ─────
  useEffect(() => {
    const publish = () => {
      const nowMs = Date.now();
      const items: VehicleListItem[] = [];
      vehicleStatesRef.current.forEach((veh) => items.push(toListItem(veh.telemetry, nowMs)));
      setUi({ nowMs, items, liveFixCount: liveFixCountRef.current, lastFixAt: lastFixAtRef.current });
    };
    publish();
    const id = setInterval(publish, UI_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // ─── 8. Route list for the selected date (no cabs are invented here) ────
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

  // ─── 9. Bootstrap once ─────────────────────────────────────────────────────
  useEffect(() => {
    unmountedRef.current = false;
    const vehicles = vehicleStatesRef.current;
    loadGoogleMapsScript(() => {
      initMap();
      void connectStream();
    });
    return () => {
      unmountedRef.current = true;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- a generation counter (invalidates in-flight connects), not a DOM ref
      connectGenRef.current++;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      vehicles.clear();
      overlayRef.current?.destroy();
      overlayRef.current = null;
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

  // Pan/zoom to a cab when it is selected (from the map or the list).
  useEffect(() => {
    if (!selectedId || !googleMapRef.current) return;
    const v = vehicleStatesRef.current.get(selectedId);
    if (v) {
      googleMapRef.current.panTo({ lat: v.toLat, lng: v.toLng });
      googleMapRef.current.setZoom(14.5);
    }
  }, [selectedId]);

  const activeVehiclesCount = ui.items.length;
  const reportingRoutes = ui.items.filter((i) => i.kind === 'CORPORATE_ROUTE' && routesMapRef.current.has(i.routeId)).length;
  const tripCount = ui.items.length - ui.items.filter((i) => i.kind === 'CORPORATE_ROUTE').length;
  const lastFixAgeSec = ui.lastFixAt ? Math.max(0, Math.round((ui.nowMs - ui.lastFixAt) / 1000)) : null;
  const selectedVehicle = selectedId ? vehicleStatesRef.current.get(selectedId) : undefined;
  const selectedRoute = selectedId ? routesMapRef.current.get(selectedId) ?? routes.find((r) => r.id === selectedId) ?? null : null;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                ? `${reportingRoutes} of ${routes.length} active routes reporting GPS${tripCount ? ` · ${tripCount} on-demand trips` : ''}`
                : connectionStatus === 'CONNECTING'
                  ? 'Connecting Stream...'
                  : 'Reconnecting Stream...'}
            </span>
          </div>

          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {lastFixAgeSec === null
              ? 'No live fix received yet'
              : `Last live fix ${lastFixAgeSec}s ago (${new Date(ui.lastFixAt as number).toLocaleTimeString()})`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            title="Shift date used for corporate route details"
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

      {/* Main Map Canvas & Side Pane */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
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
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

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
            CABS: {activeVehiclesCount} · LIVE FIXES: {ui.liveFixCount} · ▲ corporate · ◆ on-demand
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>No cabs reporting GPS</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Cabs appear here as soon as an active route or trip sends a location fix.
              </p>
            </div>
          )}
        </div>

        {selectedId ? (
          <VehicleDetailPanel
            routeId={selectedId}
            route={selectedRoute}
            telemetry={selectedVehicle?.telemetry ?? null}
            nowMs={ui.nowMs}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <VehicleListPanel items={ui.items} nowMs={ui.nowMs} onSelect={setSelectedId} />
        )}
      </div>
    </div>
  );
}
