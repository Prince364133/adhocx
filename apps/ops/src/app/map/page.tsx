'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { opsApi, getApiBaseUrl } from '../../lib/api/opsClient';
import { CorporateRouteItem, CorporateTenantOption } from '../../lib/api/opsTypes';
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
  routeToListItem,
  segmentDurationMs,
  segmentProgress,
  stepHeading,
  toListItem,
} from '../../lib/fleet-telemetry';
import { ArrowLeft, Building2, Car, Radio, RefreshCw } from 'lucide-react';

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
  gpsCount: number;
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
  const [companies, setCompanies] = useState<CorporateTenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');
  const [tenantReady, setTenantReady] = useState(false);

  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [mapReady, setMapReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'LIVE' | 'RECONNECTING'>('CONNECTING');
  // Everything derived from the fix stream reaches React only on the 1 s UI tick (never per fix).
  const [ui, setUi] = useState<UiSnapshot>({ nowMs: Date.now(), items: [], gpsCount: 0, liveFixCount: 0, lastFixAt: null });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const overlayRef = useRef<FleetCanvasOverlay | null>(null);
  const officeMarkersRef = useRef<any[]>([]);
  const boundsRef = useRef<LatLngBoundsLiteral | null>(null);
  const vehicleStatesRef = useRef<Map<string, VehicleState>>(new Map());
  const routesMapRef = useRef<Map<string, CorporateRouteItem>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const liveFixCountRef = useRef(0);
  const lastFixAtRef = useRef<number | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const activeTenantRef = useRef<string>('ALL');
  const fittedScopeRef = useRef<string | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    activeTenantRef.current = selectedTenantId;
  }, [selectedTenantId]);

  // Read initial ?tenantId=... once on client mount to avoid SSR hydration mismatch.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search);
      const qTenant = qs.get('tenantId');
      if (qTenant) setSelectedTenantId(qTenant);
    }
    setTenantReady(true);
  }, []);

  // Load onboarded companies for the company filter selector.
  useEffect(() => {
    let active = true;
    void opsApi
      .getTenants({ page: 1, limit: 100 })
      .then((res) => {
        if (active) setCompanies(Array.isArray(res?.items) ? res.items : []);
      })
      .catch(() => {
        // Keep map operational even if tenant directory fetch fails briefly
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedCompany = useMemo(
    () => (selectedTenantId === 'ALL' ? null : companies.find((c) => c.id === selectedTenantId) ?? null),
    [companies, selectedTenantId],
  );

  // ─── 1. Google Maps Script Loader ───────────────────────────────────────────
  const loadGoogleMapsScript = useCallback((callback: () => void) => {
    const existingMaps = (window as any).google?.maps;
    if (existingMaps && (typeof existingMaps.Map === 'function' || typeof existingMaps.importLibrary === 'function')) {
      callback();
      return;
    }

    const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement | null;
    if (existingScript) {
      const prevCallback = (window as any).initOpsFleetMap;
      (window as any).initOpsFleetMap = () => {
        prevCallback?.();
        callback();
      };
      existingScript.addEventListener('load', callback, { once: true });
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry,marker&callback=initOpsFleetMap&loading=async&v=weekly`;
    script.async = true;
    script.defer = true;
    (window as any).initOpsFleetMap = callback;
    document.head.appendChild(script);
  }, []);

  // ─── 2. Initialize Google Map ───────────────────────────────────────────────
  // No mapId: with a mapId, Google ignores `styles` (cloud styling), which broke the dark theme.
  // Cabs are drawn on one canvas overlay (fleetCanvasOverlay.ts), which needs no mapId either.
  const initMap = useCallback(async () => {
    if (!mapContainerRef.current || !(window as any).google?.maps || googleMapRef.current) return;
    const google = (window as any).google;

    let MapCtor = google.maps.Map;
    if (typeof MapCtor !== 'function' && typeof google.maps.importLibrary === 'function') {
      try {
        const lib = await google.maps.importLibrary('maps');
        MapCtor = lib.Map;
      } catch {
        return;
      }
    }
    if (typeof MapCtor !== 'function' || !mapContainerRef.current || googleMapRef.current) return;

    const map = new MapCtor(mapContainerRef.current, {
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
    setMapReady(true);
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
  const applyFix = useCallback((incoming: FleetFix, countAsLive: boolean, scopedTenantId: string) => {
    if (scopedTenantId !== activeTenantRef.current) return;
    if (!isValidFix(incoming)) return;
    if (scopedTenantId !== 'ALL') {
      if (incoming.kind === 'TRIP') return;
      if (incoming.tenantId && incoming.tenantId !== scopedTenantId) return;
    }

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

  const removeVehicle = useCallback((routeId: string) => {
    if (!vehicleStatesRef.current.has(routeId)) return;
    vehicleStatesRef.current.delete(routeId);
  }, []);

  // ─── 4. Snapshot: real last-known positions (never guessed) ────────────────
  const loadSnapshot = useCallback(
    async (tenantIdScope: string, isStale?: () => boolean) => {
      try {
        const fixes = (await opsApi.getFleetSnapshot(tenantIdScope !== 'ALL' ? tenantIdScope : undefined)) as FleetFix[];
        if (isStale?.() || tenantIdScope !== activeTenantRef.current) return;
        (fixes || []).forEach((f) => applyFix(f, false, tenantIdScope));
      } catch {
        // the stream still delivers new fixes
      }
    },
    [applyFix],
  );

  // ─── 5. Live stream with reconnect (scoped by selectedTenantId) ────────────
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);
  const connectGenRef = useRef(0);
  const routesReqGenRef = useRef(0);

  const connectStream = useCallback(
    async (tenantIdScope: string, isCancelled?: () => boolean) => {
      if (unmountedRef.current || isCancelled?.()) return;
      const gen = ++connectGenRef.current;
      const stale = () => unmountedRef.current || Boolean(isCancelled?.()) || gen !== connectGenRef.current;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      setConnectionStatus('CONNECTING');

      // Snapshot first (it also refreshes an expired access token), then a single-use ticket for the stream URL.
      await loadSnapshot(tenantIdScope, stale);
      if (stale()) return;
      let ticket: string;
      try {
        ticket = (await opsApi.createStreamTicket()).ticket;
      } catch {
        if (stale()) return;
        setConnectionStatus('RECONNECTING');
        const attempt = reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(
          () => void connectStream(tenantIdScope, isCancelled),
          Math.min(1000 * 2 ** attempt, 30_000),
        );
        return;
      }
      if (stale()) return;

      const tenantParam = tenantIdScope !== 'ALL' ? `&tenantId=${encodeURIComponent(tenantIdScope)}` : '';
      const url = `${getApiBaseUrl()}/corporate/trips/routes/fleet/live-stream?ticket=${encodeURIComponent(ticket)}${tenantParam}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;
      es.onopen = () => {
        if (stale()) {
          es.close();
          return;
        }
        reconnectAttemptRef.current = 0;
        setConnectionStatus('LIVE');
      };
      const handleFrame = (raw: string) => {
        if (stale()) return;
        parseFixFrame(raw).forEach((f) => applyFix(f, true, tenantIdScope));
      };
      es.addEventListener('fixes', (event) => handleFrame((event as MessageEvent).data));
      es.onmessage = (event) => handleFrame(event.data);
      es.addEventListener('reauth', (event) => {
        es.onerror = null;
        es.close();
        if (eventSourceRef.current === es) eventSourceRef.current = null;
        if (stale()) return;
        let reason = '';
        try {
          reason = JSON.parse((event as MessageEvent).data)?.reason ?? '';
        } catch {
          // treat as expiry
        }
        if (reason === 'REVOKED') {
          setConnectionStatus('RECONNECTING');
          const attempt = reconnectAttemptRef.current++;
          reconnectTimerRef.current = setTimeout(
            () => void connectStream(tenantIdScope, isCancelled),
            Math.min(1000 * 2 ** attempt, 30_000),
          );
          return;
        }
        reconnectAttemptRef.current = 0;
        void connectStream(tenantIdScope, isCancelled);
      });
      es.onerror = () => {
        es.close();
        if (eventSourceRef.current !== es || stale()) return;
        eventSourceRef.current = null;
        setConnectionStatus('RECONNECTING');
        const attempt = reconnectAttemptRef.current++;
        const delay = Math.min(1000 * 2 ** attempt, 30_000);
        reconnectTimerRef.current = setTimeout(() => void connectStream(tenantIdScope, isCancelled), delay);
      };
    },
    [applyFix, loadSnapshot],
  );

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
          lat = veh.toLat;
          lng = veh.toLng;
          veh.currentHeading = veh.targetHeading;
        }
        veh.currentLat = lat;
        veh.currentLng = lng;
      });
      overlayRef.current?.render(canvasVehicles(vehicleStatesRef.current), selectedIdRef.current);
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

  // ─── 7. UI tick: merges live GPS cabs + assigned/active routes for the company ─
  const publishSnapshot = useCallback(() => {
    const nowMs = Date.now();
    const items: VehicleListItem[] = [];
    const seen = new Set<string>();
    vehicleStatesRef.current.forEach((veh) => {
      const route = routesMapRef.current.get(veh.telemetry.routeId) ?? null;
      items.push(toListItem(veh.telemetry, nowMs, route));
      seen.add(veh.telemetry.routeId);
    });
    routesMapRef.current.forEach((route) => {
      if (seen.has(route.id)) return;
      if (ACTIVE_ROUTE_STATUSES.has(route.status) || Boolean(route.driverId || route.vehicleId)) {
        items.push(routeToListItem(route));
      }
    });
    setUi({
      nowMs,
      items,
      gpsCount: vehicleStatesRef.current.size,
      liveFixCount: liveFixCountRef.current,
      lastFixAt: lastFixAtRef.current,
    });
  }, []);

  useEffect(() => {
    publishSnapshot();
    const id = setInterval(publishSnapshot, UI_TICK_MS);
    return () => clearInterval(id);
  }, [publishSnapshot]);

  // ─── 8. Active/assigned routes for the selected company & optional shift date ─
  const loadMapData = useCallback(async (isCancelled?: () => boolean) => {
    if (!tenantReady || isCancelled?.()) return;
    const reqGen = ++routesReqGenRef.current;
    const scopeTenant = selectedTenantId;
    try {
      const list = await opsApi.getRoutes({
        tenantId: scopeTenant !== 'ALL' ? scopeTenant : undefined,
        shiftDate: selectedDate || undefined,
        includeStops: false,
        limit: 200,
      });
      if (
        unmountedRef.current ||
        isCancelled?.() ||
        reqGen !== routesReqGenRef.current ||
        scopeTenant !== activeTenantRef.current
      ) {
        return;
      }
      const active = (Array.isArray(list) ? list : []).filter(
        (r) =>
          r.status !== 'CANCELLED' &&
          r.status !== 'COMPLETED' &&
          (ACTIVE_ROUTE_STATUSES.has(r.status) || Boolean(r.driverId || r.vehicleId)),
      );
      setRoutes(active);
      const byId = new Map<string, CorporateRouteItem>();
      active.forEach((r) => byId.set(r.id, r));
      routesMapRef.current = byId;
      publishSnapshot();
    } catch {
      // keep existing state if transient error
    } finally {
      if (
        !unmountedRef.current &&
        !isCancelled?.() &&
        reqGen === routesReqGenRef.current &&
        scopeTenant === activeTenantRef.current
      ) {
        setLoading(false);
      }
    }
  }, [tenantReady, selectedTenantId, selectedDate, publishSnapshot]);

  // ─── 9. Bootstrap map once ─────────────────────────────────────────────────
  useEffect(() => {
    unmountedRef.current = false;
    const vehicles = vehicleStatesRef.current;
    loadGoogleMapsScript(() => {
      void initMap();
    });
    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      officeMarkersRef.current.forEach((m) => m.setMap(null));
      officeMarkersRef.current = [];
      vehicles.clear();
      overlayRef.current?.destroy();
      overlayRef.current = null;
    };
  }, [loadGoogleMapsScript, initMap]);

  // Connect / reconnect stream & reset scoped state whenever selectedTenantId changes.
  useEffect(() => {
    if (!tenantReady) return;
    let cancelled = false;
    setSelectedId(null);
    fittedScopeRef.current = null;
    vehicleStatesRef.current.clear();
    liveFixCountRef.current = 0;
    lastFixAtRef.current = null;
    routesMapRef.current = new Map();
    setRoutes([]);
    publishSnapshot();
    void connectStream(selectedTenantId, () => cancelled);
    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [tenantReady, selectedTenantId, connectStream, publishSnapshot]);

  // Load company/date active routes without resetting the live telemetry stream when Shift Date changes.
  useEffect(() => {
    if (!tenantReady) return;
    let cancelled = false;
    setLoading(true);
    void loadMapData(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [tenantReady, loadMapData]);

  // ─── 10. Plot office hub markers & auto-center on company scope ────────────
  useEffect(() => {
    if (!mapReady || !googleMapRef.current || !(window as any).google?.maps) return;
    const google = (window as any).google;
    const map = googleMapRef.current;

    officeMarkersRef.current.forEach((m) => m.setMap(null));
    officeMarkersRef.current = [];

    const officeList: Array<{ id: string; name: string; lat: number; lng: number }> = [];
    const seenOffices = new Set<string>();

    const addOffice = (id: string, name: string, latVal: unknown, lngVal: unknown) => {
      const lat = Number(latVal);
      const lng = Number(lngVal);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return;
      if (seenOffices.has(id)) return;
      seenOffices.add(id);
      officeList.push({ id, name, lat, lng });
    };

    if (selectedCompany?.offices) {
      selectedCompany.offices.forEach((o) => addOffice(o.id, `${selectedCompany.name} — ${o.name}`, o.latitude, o.longitude));
    } else if (selectedTenantId === 'ALL') {
      companies.slice(0, 40).forEach((c) => {
        c.offices?.forEach((o) => addOffice(o.id, `${c.name} — ${o.name}`, o.latitude, o.longitude));
      });
    }
    routes.forEach((r) => {
      if (r.office) {
        addOffice(
          r.office.id,
          r.tenant?.name ? `${r.tenant.name} — ${r.office.name}` : r.office.name,
          r.office.latitude,
          r.office.longitude,
        );
      }
    });

    if (typeof google.maps.Marker === 'function') {
      officeMarkersRef.current = officeList.map(
        (office) =>
          new google.maps.Marker({
            position: { lat: office.lat, lng: office.lng },
            map,
            title: office.name,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: '#5728B2',
              fillOpacity: 1,
              strokeColor: '#FFFFFF',
              strokeWeight: 2,
            },
            zIndex: 2,
          }),
      );
    }

    if (fittedScopeRef.current !== selectedTenantId) {
      const points: Array<{ lat: number; lng: number }> = [];
      vehicleStatesRef.current.forEach((v) => {
        points.push({ lat: v.toLat, lng: v.toLng });
      });
      if (points.length === 0 || selectedTenantId !== 'ALL') {
        officeList.forEach((o) => points.push({ lat: o.lat, lng: o.lng }));
      }
      if (points.length === 1) {
        map.panTo(points[0]);
        map.setZoom(13);
        fittedScopeRef.current = selectedTenantId;
      } else if (points.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        points.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, 60);
        fittedScopeRef.current = selectedTenantId;
      }
    }
  }, [mapReady, selectedTenantId, selectedCompany, companies, routes, ui.gpsCount]);

  function handleCompanyChange(newTenantId: string) {
    setSelectedTenantId(newTenantId);
    if (typeof window !== 'undefined') {
      const nextUrl = newTenantId !== 'ALL' ? `/map?tenantId=${encodeURIComponent(newTenantId)}` : '/map';
      window.history.replaceState(null, '', nextUrl);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadMapData(), loadSnapshot(selectedTenantId)]);
    publishSnapshot();
    setRefreshing(false);
  }

  // Pan/zoom to a cab (or its office) when selected from the map or the fleet list.
  useEffect(() => {
    if (!selectedId || !googleMapRef.current) return;
    const v = vehicleStatesRef.current.get(selectedId);
    if (v) {
      googleMapRef.current.panTo({ lat: v.toLat, lng: v.toLng });
      googleMapRef.current.setZoom(14.5);
      return;
    }
    const route = routesMapRef.current.get(selectedId);
    const lat = Number(route?.office?.latitude);
    const lng = Number(route?.office?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      googleMapRef.current.panTo({ lat, lng });
      googleMapRef.current.setZoom(13);
    }
  }, [selectedId]);

  const activeRouteIds = useMemo(() => new Set(routes.map((r) => r.id)), [routes]);
  const selectedCompanyName =
    selectedCompany?.name ?? (selectedTenantId !== 'ALL' ? routes.find((r) => r.tenant?.id === selectedTenantId)?.tenant?.name ?? null : null);
  const totalWorkingCount = ui.items.length;
  const reportingRoutes = ui.items.filter((i) => i.hasGps && i.kind === 'CORPORATE_ROUTE' && activeRouteIds.has(i.routeId)).length;
  const tripCount = ui.items.filter((i) => i.kind === 'TRIP').length;
  const assignedRoutesCount = routes.filter((r) => Boolean(r.driverId || r.vehicleId)).length;
  const lastFixAgeSec = ui.lastFixAt ? Math.max(0, Math.round((ui.nowMs - ui.lastFixAt) / 1000)) : null;
  const selectedVehicle = selectedId ? vehicleStatesRef.current.get(selectedId) : undefined;
  const selectedRoute = selectedId ? routes.find((r) => r.id === selectedId) ?? null : null;

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
          <Link
            href={selectedTenantId !== 'ALL' ? `/routes?tenantId=${encodeURIComponent(selectedTenantId)}` : '/routes'}
            style={{ textDecoration: 'none' }}
          >
            <Button size="sm" variant="secondary" leftIcon={<ArrowLeft size={14} />}>
              Back to Routes
            </Button>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={14} color="var(--text-muted)" />
            <select
              aria-label="Filter fleet by company"
              value={selectedTenantId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              style={{
                height: '32px',
                backgroundColor: 'var(--bg-surface-muted)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '0 10px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 600,
                outline: 'none',
                maxWidth: '240px',
              }}
            >
              <option value="ALL">All Onboarded Companies ({companies.length})</option>
              {selectedTenantId !== 'ALL' && !selectedCompany && (
                <option value={selectedTenantId}>
                  {selectedCompanyName || 'Selected Company'}
                </option>
              )}
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

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
                ? `${reportingRoutes} of ${routes.length} active route${routes.length === 1 ? '' : 's'} reporting GPS · ${assignedRoutesCount} assigned cab${assignedRoutesCount === 1 ? '' : 's'}${tripCount ? ` · ${tripCount} on-demand` : ''}`
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            title="Optional shift date filter (leave empty for all active dates)"
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
          {selectedDate && (
            <Button size="sm" variant="ghost" onClick={() => setSelectedDate('')}>
              Clear
            </Button>
          )}

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
            FLEET: {totalWorkingCount} ({ui.gpsCount} GPS) · LIVE FIXES: {ui.liveFixCount} · ▲ corporate · ● office HQ
          </div>

          {ui.gpsCount === 0 && totalWorkingCount > 0 && !loading && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 5,
                backgroundColor: 'var(--bg-surface)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-card)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
              }}
            >
              <Car size={14} color="var(--brand-blue-500, #5728B2)" />
              <span>
                Awaiting live GPS pings — showing {totalWorkingCount} active/assigned route{totalWorkingCount === 1 ? '' : 's'} in the Fleet panel.
              </span>
            </div>
          )}

          {totalWorkingCount === 0 && !loading && (
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedCompanyName ? `No active cabs for ${selectedCompanyName}` : 'No cabs active or reporting GPS'}
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Assigned cabs and live GPS vehicles for the selected company appear here automatically.
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
          <VehicleListPanel
            items={ui.items}
            nowMs={ui.nowMs}
            selectedCompanyName={selectedCompanyName}
            isCompanyScoped={selectedTenantId !== 'ALL'}
            onSelect={setSelectedId}
          />
        )}
      </div>
    </div>
  );
}
