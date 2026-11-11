'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CarFront,
  Clock3,
  MapPin,
  Navigation,
  RefreshCw,
  Route as RouteIcon,
  Users,
} from 'lucide-react';
import RouteAnalyticsPanel from './RouteAnalyticsPanel';
import './route-dashboard.css';
import {
  DEMO_ROUTE_COMPANY_ROUTES,
  MOCK_ROUTE_COMPANIES,
  getSavedWorkspaceRoutes,
  RouteWorkspaceCompany,
  RouteWorkspaceRoute,
} from '../../lib/mockRouteWorkspace';
import { calculateRouteWorkspaceAnalytics, calculateRouteWorkspaceRouteAnalytics } from '../../lib/routeWorkspaceAnalytics';
import { getApiBaseUrl, opsApi, streamCorporateTenantEvents } from '../../lib/api/opsClient';
import { toOpsWorkspaceCompany, toOpsWorkspaceRoute } from '../../lib/routeWorkspaceAdapters';
import { gpsStateOf, parseFixFrame } from '../../lib/fleet-telemetry';
import type { LiveVehicleTelemetryPayload } from '@adhocx/contracts';

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
};

function Metric({
  label,
  value,
  detail,
  icon,
  color = 'var(--brand-blue-500)',
  compact = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  color?: string;
  compact?: boolean;
}) {
  return (
    <div className="routeMetric" style={{ ...(!compact ? cardStyle : {}), padding: compact ? '12px 16px' : 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color, display: 'inline-flex' }}>{icon}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 26, lineHeight: 1.15, fontWeight: 800, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ marginTop: 5, fontSize: 12, color: 'var(--text-muted)' }}>{detail}</div>
    </div>
  );
}

function formatRouteEta(value?: string) {
  if (!value) return 'Awaiting data';
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Awaiting data';
}

function routeStatusColor(status: string) {
  switch (status.toUpperCase()) {
    case 'COMPLETED': return 'var(--rd-green)';
    case 'IN_TRANSIT': return 'var(--rd-blue)';
    case 'CANCELLED': return 'var(--rd-faint)';
    case 'PLANNED':
    case 'ASSIGNED':
    case 'DISPATCHING': return 'var(--rd-amber)';
    default: return 'var(--text-secondary)';
  }
}

function RouteMap({ route }: { route: RouteWorkspaceRoute }) {
  if (
    typeof route.officeLatitude !== 'number' ||
    typeof route.officeLongitude !== 'number' ||
    !Number.isFinite(route.officeLatitude) ||
    !Number.isFinite(route.officeLongitude)
  ) {
    return (
      <div style={{ ...cardStyle, display: 'grid', placeItems: 'center', minHeight: 420, padding: 24, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
        Office coordinates are not available for this route.
      </div>
    );
  }
  const width = 900;
  const height = 560;
  const padding = 76;
  const points = [
    ...route.employees.map((employee) => ({ latitude: employee.latitude, longitude: employee.longitude })),
    { latitude: route.officeLatitude, longitude: route.officeLongitude },
  ];
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const latSpan = Math.max(Math.max(...latitudes) - Math.min(...latitudes), 0.02) * 1.28;
  const lngSpan = Math.max(Math.max(...longitudes) - Math.min(...longitudes), 0.02) * 1.28;
  const midLat = (Math.max(...latitudes) + Math.min(...latitudes)) / 2;
  const midLng = (Math.max(...longitudes) + Math.min(...longitudes)) / 2;
  const project = (latitude: number, longitude: number) => ({
    x: padding + ((longitude - (midLng - lngSpan / 2)) / lngSpan) * (width - padding * 2),
    y: height - padding - ((latitude - (midLat - latSpan / 2)) / latSpan) * (height - padding * 2),
  });
  const projected = points.map((point) => project(point.latitude, point.longitude));
  const path = projected.map((point) => `${point.x},${point.y}`).join(' ');
  const office = projected[projected.length - 1];

  return (
    <div style={{ ...cardStyle, overflow: 'hidden', minHeight: 420, height: '100%', position: 'relative', background: '#0B1224' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: 'linear-gradient(rgba(148,163,184,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.16) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Route map for ${route.routeCode}`} style={{ position: 'relative', display: 'block', width: '100%', height: '100%', minHeight: 420 }}>
        <path d={`M ${padding + 20} ${height - 80} C ${width * 0.25} ${height * 0.3}, ${width * 0.48} ${height * 0.78}, ${width * 0.64} ${height * 0.45} S ${width * 0.8} ${height * 0.18}, ${width - 65} 115`} fill="none" stroke="#64748B" strokeWidth="17" strokeLinecap="round" opacity="0.22" />
        <path d={`M 95 120 C ${width * 0.3} ${height * 0.42}, ${width * 0.62} ${height * 0.55}, ${width - 90} ${height - 90}`} fill="none" stroke="#64748B" strokeWidth="10" strokeLinecap="round" opacity="0.18" />
        <polyline points={path} fill="none" stroke="#A78BFA" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="9 7" />
        {projected.slice(0, -1).map((point, index) => (
          <g key={route.employees[index].id}>
            <circle cx={point.x} cy={point.y} r="17" fill="#A78BFA" opacity="0.2" />
            <circle cx={point.x} cy={point.y} r="10" fill="#7C3AED" stroke="#FFFFFF" strokeWidth="3" />
            <text x={point.x} y={point.y + 4} textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700">{index + 1}</text>
            <text x={point.x + 17} y={point.y - 13} fill="#E2E8F0" fontSize="12" fontWeight="600">{route.employees[index].fullName}</text>
          </g>
        ))}
        <g>
          <circle cx={office.x} cy={office.y} r="21" fill="#22C55E" opacity="0.2" />
          <path d={`M ${office.x} ${office.y - 13} C ${office.x - 12} ${office.y - 13}, ${office.x - 13} ${office.y + 3}, ${office.x} ${office.y + 15} C ${office.x + 13} ${office.y + 3}, ${office.x + 12} ${office.y - 13}, ${office.x} ${office.y - 13} Z`} fill="#16A34A" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx={office.x} cy={office.y - 3} r="3.5" fill="#FFFFFF" />
          <text x={office.x + 18} y={office.y + 4} fill="#BBF7D0" fontSize="12" fontWeight="700">OFFICE</text>
        </g>
        <text x="24" y="34" fill="#CBD5E1" fontSize="12" fontWeight="600">{route.tenantName} · {route.routeCode}</text>
        <text x="24" y={height - 24} fill="#94A3B8" fontSize="11">
          {route.source === 'API' ? 'Recorded route stop coordinates' : 'Demo route visualization · employee coordinates are approximate unless supplied in the CSV'}
        </text>
      </svg>
    </div>
  );
}

export default function MockRouteWorkspacePage() {
  const [savedRoutes, setSavedRoutes] = useState<RouteWorkspaceRoute[]>([]);
  const [apiCompanies, setApiCompanies] = useState<RouteWorkspaceCompany[]>([]);
  const [apiCompanyDetailsLoaded, setApiCompanyDetailsLoaded] = useState<Record<string, boolean>>({});
  const [apiRoutesByTenant, setApiRoutesByTenant] = useState<Record<string, RouteWorkspaceRoute[]>>({});
  const [apiUpdatedAtByTenant, setApiUpdatedAtByTenant] = useState<Record<string, string>>({});
  const [apiLoadingTenantId, setApiLoadingTenantId] = useState<string | null>(null);
  const [apiRefreshVersion, setApiRefreshVersion] = useState(0);
  const [liveConnectionStatus, setLiveConnectionStatus] = useState<'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'OFFLINE'>('OFFLINE');
  const [liveConnectionError, setLiveConnectionError] = useState('');
  const [gpsByRoute, setGpsByRoute] = useState<Record<string, LiveVehicleTelemetryPayload>>({});
  const [gpsNow, setGpsNow] = useState(() => Date.now());
  const [gpsConnectionError, setGpsConnectionError] = useState('');
  const apiRouteIdsRef = useRef<ReadonlySet<string>>(new Set());
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const [routeStatusFilter, setRouteStatusFilter] = useState('ALL');
  const routeSearchRef = useRef<HTMLInputElement>(null);
  const [loadError, setLoadError] = useState('');
  const [apiLoadError, setApiLoadError] = useState('');

  useEffect(() => {
    const companyId = new URLSearchParams(window.location.search).get('tenantId');
    if (companyId) setSelectedCompanyId(companyId);

    let active = true;
    void opsApi.getTenants({ limit: 100 })
      .then(({ items }) => {
        if (active) setApiCompanies(items.map(toOpsWorkspaceCompany));
      })
      .catch((error: unknown) => {
        if (active) setApiLoadError(error instanceof Error ? error.message : 'Could not load production companies.');
      });

    const refresh = () => {
      try {
        setSavedRoutes(getSavedWorkspaceRoutes());
        setLoadError('');
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Could not load saved demo routes.');
      }
    };
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('adhocx:ops-route-workspace-updated', refresh);
    return () => {
      active = false;
      window.removeEventListener('storage', refresh);
      window.removeEventListener('adhocx:ops-route-workspace-updated', refresh);
    };
  }, []);

  const allRoutes = useMemo(() => [...DEMO_ROUTE_COMPANY_ROUTES, ...savedRoutes], [savedRoutes]);
  const companies = useMemo(() => {
    const byId = new Map<string, RouteWorkspaceCompany>();
    for (const company of MOCK_ROUTE_COMPANIES) byId.set(company.id, company);
    for (const route of savedRoutes) {
      if (!byId.has(route.tenantId)) {
        byId.set(route.tenantId, {
          id: route.tenantId,
          code: route.tenantCode,
          name: route.tenantName,
          officeAddress: route.officeAddress,
          latitude: route.officeLatitude,
          longitude: route.officeLongitude,
        });
      }
    }
    for (const company of apiCompanies) byId.set(company.id, company);
    return [...byId.values()].filter((company) => {
      const query = search.trim().toLowerCase();
      return !query || company.name.toLowerCase().includes(query) || company.code.toLowerCase().includes(query);
    });
  }, [apiCompanies, savedRoutes, search]);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? null;
  const selectedApiTenantId = selectedCompany?.source === 'API' ? selectedCompany.id : null;

  useEffect(() => {
    if (!selectedApiTenantId || apiCompanyDetailsLoaded[selectedApiTenantId]) return;
    let active = true;
    void opsApi.getTenant(selectedApiTenantId)
      .then((tenant) => {
        if (!active) return;
        const company = toOpsWorkspaceCompany(tenant);
        setApiCompanies((current) => current.map((item) => item.id === company.id ? company : item));
      })
      .catch((error: unknown) => {
        if (active) setApiLoadError(error instanceof Error ? error.message : 'Could not load the company profile.');
      })
      .finally(() => {
        if (active) setApiCompanyDetailsLoaded((current) => ({ ...current, [selectedApiTenantId]: true }));
      });

    return () => {
      active = false;
    };
  }, [apiCompanyDetailsLoaded, selectedApiTenantId]);

  useEffect(() => {
    if (!selectedApiTenantId || !apiCompanyDetailsLoaded[selectedApiTenantId] || !selectedCompany) return;
    let active = true;
    setApiLoadingTenantId(selectedApiTenantId);
    setApiLoadError('');

    void opsApi.getRoutes({
      tenantId: selectedApiTenantId,
      limit: 1000,
      includeStops: true,
      includeAnalytics: true,
    })
      .then((routes) => {
        if (!active) return;
        setApiRoutesByTenant((current) => ({
          ...current,
          [selectedApiTenantId]: routes.map((route) => toOpsWorkspaceRoute(route, selectedCompany)),
        }));
        setApiUpdatedAtByTenant((current) => ({ ...current, [selectedApiTenantId]: new Date().toISOString() }));
      })
      .catch((error: unknown) => {
        if (active) setApiLoadError(error instanceof Error ? error.message : 'Could not load this company’s routes.');
      })
      .finally(() => {
        if (active) setApiLoadingTenantId(null);
      });

    return () => {
      active = false;
    };
  }, [apiCompanyDetailsLoaded, apiRefreshVersion, selectedApiTenantId, selectedCompany]);

  useEffect(() => {
    if (!selectedApiTenantId) {
      setLiveConnectionStatus('OFFLINE');
      setLiveConnectionError('');
      return;
    }

    const controller = new AbortController();
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let routeRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let connectedAt = 0;
    const scheduleRouteRefresh = () => {
      if (routeRefreshTimer) clearTimeout(routeRefreshTimer);
      routeRefreshTimer = setTimeout(() => {
        routeRefreshTimer = null;
        setApiRefreshVersion((version) => version + 1);
      }, 250);
    };
    const connect = async () => {
      if (controller.signal.aborted) return;
      setLiveConnectionStatus(attempt === 0 ? 'CONNECTING' : 'RECONNECTING');
      try {
        await streamCorporateTenantEvents(
          selectedApiTenantId,
          controller.signal,
          (event) => {
            if (event.event === 'heartbeat') return;
            if (event.event.startsWith('ROUTE_') || event.event.startsWith('ATTENDANCE_') || event.event === 'PASSENGER_BOARDED') {
              scheduleRouteRefresh();
            }
          },
          () => {
            connectedAt = Date.now();
            setLiveConnectionStatus('LIVE');
            setLiveConnectionError('');
          },
        );
        if (!controller.signal.aborted) throw new Error('Realtime connection closed.');
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        if (connectedAt > 0 && Date.now() - connectedAt >= 30_000) attempt = 0;
        connectedAt = 0;
        setLiveConnectionError(error instanceof Error ? error.message : 'Realtime connection failed.');
        setLiveConnectionStatus('RECONNECTING');
        const delay = Math.min(1000 * 2 ** attempt, 30_000);
        attempt += 1;
        reconnectTimer = setTimeout(() => void connect(), delay);
      }
    };
    void connect();

    return () => {
      controller.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (routeRefreshTimer) clearTimeout(routeRefreshTimer);
      setLiveConnectionStatus('OFFLINE');
    };
  }, [selectedApiTenantId]);

  const companyRoutes = useMemo(
    () => selectedCompany
      ? [
          ...allRoutes.filter((route) => route.tenantId === selectedCompany.id),
          ...(selectedCompany.source === 'API' ? apiRoutesByTenant[selectedCompany.id] ?? [] : []),
        ]
      : [],
    [allRoutes, apiRoutesByTenant, selectedCompany],
  );
  apiRouteIdsRef.current = new Set(companyRoutes.filter((route) => route.source === 'API').map((route) => route.id));

  useEffect(() => {
    if (!selectedApiTenantId || apiRouteIdsRef.current.size === 0) return;
    let active = true;
    void opsApi.getFleetSnapshot(selectedApiTenantId)
      .then((fixes) => {
        if (!active) return;
        setGpsByRoute((current) => {
          const next = { ...current };
          for (const fix of fixes) {
            if (
              !apiRouteIdsRef.current.has(fix.routeId) ||
              (fix.tenantId && fix.tenantId !== selectedApiTenantId) ||
              fix.kind === 'TRIP'
            ) continue;
            const previous = next[fix.routeId];
            if (!previous || fix.recordedAt > previous.recordedAt) next[fix.routeId] = fix;
          }
          return next;
        });
      })
      .catch((error: unknown) => {
        if (active) setGpsConnectionError(error instanceof Error ? error.message : 'Could not load GPS snapshot.');
      });
    return () => {
      active = false;
    };
  }, [apiUpdatedAtByTenant, selectedApiTenantId]);

  useEffect(() => {
    if (!selectedApiTenantId) {
      setGpsByRoute({});
      setGpsConnectionError('');
      return;
    }

    setGpsByRoute({});
    setGpsConnectionError('');
    let active = true;
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const scheduleReconnect = () => {
      if (!active || reconnectTimer) return;
      const delay = Math.min(1000 * 2 ** attempts, 30_000);
      attempts += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, delay);
    };
    const applyGpsFrame = (data: string) => {
      const fixes = parseFixFrame(data).filter((fix) =>
        fix.kind !== 'TRIP' &&
        apiRouteIdsRef.current.has(fix.routeId) &&
        (!fix.tenantId || fix.tenantId === selectedApiTenantId),
      );
      if (fixes.length === 0) return;
      setGpsByRoute((current) => {
        const next = { ...current };
        for (const fix of fixes) {
          const previous = next[fix.routeId];
          if (!previous || fix.recordedAt > previous.recordedAt) next[fix.routeId] = fix;
        }
        return next;
      });
    };
    const connect = async () => {
      if (!active) return;
      try {
        const { ticket } = await opsApi.createStreamTicket();
        if (!active) return;
        const source = new EventSource(
          `${getApiBaseUrl()}/corporate/trips/routes/fleet/live-stream?ticket=${encodeURIComponent(ticket)}&tenantId=${encodeURIComponent(selectedApiTenantId)}`,
        );
        eventSource = source;
        source.onopen = () => {
          attempts = 0;
          setGpsConnectionError('');
        };
        source.addEventListener('fixes', (event) => applyGpsFrame((event as MessageEvent).data));
        source.onmessage = (event) => applyGpsFrame(event.data);
        source.addEventListener('reauth', () => {
          source.onerror = null;
          source.close();
          if (eventSource === source) eventSource = null;
          void connect();
        });
        source.onerror = () => {
          source.close();
          if (eventSource !== source) return;
          eventSource = null;
          setGpsConnectionError('Live GPS stream disconnected; reconnecting.');
          scheduleReconnect();
        };
      } catch (error: unknown) {
        if (!active) return;
        setGpsConnectionError(error instanceof Error ? error.message : 'Could not connect to live GPS updates.');
        scheduleReconnect();
      }
    };
    void connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      eventSource?.close();
    };
  }, [selectedApiTenantId]);

  useEffect(() => {
    if (!selectedApiTenantId) return;
    const timer = setInterval(() => setGpsNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [selectedApiTenantId]);

  const selectedRoute = companyRoutes.find((route) => route.id === selectedRouteId) ?? null;
  const companyAnalytics = useMemo(() => calculateRouteWorkspaceAnalytics(companyRoutes), [companyRoutes]);
  const routeStatuses = useMemo(
    () => [...new Set(companyRoutes.map((route) => route.status.trim().toUpperCase()))].sort(),
    [companyRoutes],
  );
  const visibleRoutes = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();
    return companyRoutes.filter((route) => {
      const matchesStatus = routeStatusFilter === 'ALL' || route.status.trim().toUpperCase() === routeStatusFilter;
      const matchesSearch = !query || [route.routeCode, route.driverName, route.vehiclePlate, route.vehicleCategory]
        .some((value) => value?.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [companyRoutes, routeSearch, routeStatusFilter]);
  const gpsAnalytics = useMemo(() => {
    const apiCompanyRoutes = companyRoutes.filter((route) => route.source === 'API');
    const companyRouteIds = new Set(apiCompanyRoutes.map((route) => route.id));
    const recentFixes = Object.values(gpsByRoute).filter((fix) =>
      companyRouteIds.has(fix.routeId) && gpsStateOf(fix.recordedAt, gpsNow) === 'LIVE',
    );
    const lastFixAt = Object.values(gpsByRoute)
      .filter((fix) => companyRouteIds.has(fix.routeId))
      .reduce<number | null>((latest, fix) => latest === null ? fix.recordedAt : Math.max(latest, fix.recordedAt), null);
    return { reportingRoutes: recentFixes.length, lastFixAt, totalRoutes: apiCompanyRoutes.length };
  }, [companyRoutes, gpsByRoute, gpsNow]);
  const displayedRoutes = selectedRoute ? [selectedRoute] : companyRoutes;
  const hasProductionRoutes = displayedRoutes.some((route) => route.source === 'API') || selectedCompany?.source === 'API';
  const hasCsvRoutes = displayedRoutes.some((route) => route.source === 'CSV');
  const dataLabel = hasProductionRoutes
    ? hasCsvRoutes ? 'PRODUCTION + CSV PLAN' : 'PRODUCTION SNAPSHOT'
    : hasCsvRoutes ? 'CSV PLAN · NOT LIVE' : 'DEMO · NOT LIVE';

  useEffect(() => {
    const focusRouteSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || !selectedCompanyId || selectedRouteId) return;
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable || target?.matches('input, textarea, select')) return;
      event.preventDefault();
      routeSearchRef.current?.focus();
    };
    window.addEventListener('keydown', focusRouteSearch);
    return () => window.removeEventListener('keydown', focusRouteSearch);
  }, [selectedCompanyId, selectedRouteId]);

  const pageTitle = selectedRoute ? selectedRoute.routeCode : selectedCompany ? selectedCompany.name : 'Routes & Trips';
  const pageSubtitle = selectedRoute
    ? 'Employee pickup sequence and route map'
    : selectedCompany
      ? 'Company routes, cabs and assigned employees'
      : 'Select a company to review its optimized cab routes';

  function goBack() {
    if (selectedRouteId) {
      setSelectedRouteId(null);
    } else {
      setSelectedCompanyId(null);
    }
  }

  return (
    <div className="routeDashboard" style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {(selectedCompany || selectedRoute) && (
              <button type="button" onClick={goBack} aria-label="Go back" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', border: '1px solid var(--border-subtle)', borderRadius: 7, background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: 'pointer', font: 'inherit', fontSize: 12, fontWeight: 600 }}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{pageTitle}</h1>
            <span style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--color-info-bg)', color: 'var(--color-info)', fontSize: 11, fontWeight: 700 }}>{selectedCompany ? dataLabel : 'DEMO DATA'}</span>
          </div>
          <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>{pageSubtitle}</p>
        </div>
        <Link className="routeOptimizerLink" href="/planner" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', borderRadius: 8, background: 'var(--brand-blue-500)', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
          <Navigation size={15} /> Open Route Optimizer
        </Link>
        {selectedCompany?.source === 'API' && (
          <button
            type="button"
            onClick={() => setApiRefreshVersion((version) => version + 1)}
            disabled={apiLoadingTenantId === selectedCompany.id}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', border: '1px solid var(--border-subtle)', borderRadius: 8, background: 'var(--bg-surface)', color: 'var(--text-secondary)', cursor: apiLoadingTenantId === selectedCompany.id ? 'wait' : 'pointer', font: 'inherit', fontSize: 13, fontWeight: 650 }}
          >
            <RefreshCw size={14} /> {apiLoadingTenantId === selectedCompany.id ? 'Refreshing…' : 'Refresh data'}
          </button>
        )}
        {selectedCompany?.source === 'API' && (
          <span
            role="status"
            aria-live="polite"
            title={liveConnectionError || gpsConnectionError || undefined}
            style={{
              color: liveConnectionStatus === 'LIVE' ? '#15803D' : liveConnectionStatus === 'RECONNECTING' ? '#B45309' : 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 650,
            }}
          >
            {liveConnectionStatus === 'LIVE' ? 'Live updates connected' : liveConnectionStatus === 'RECONNECTING' ? 'Reconnecting live updates' : 'Connecting live updates'}
          </span>
        )}
      </header>

      {loadError && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, border: '1px solid var(--color-danger-border)', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: 13 }}>
          {loadError}
        </div>
      )}
      {apiLoadError && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, border: '1px solid var(--color-danger-border)', background: 'var(--color-danger-bg)', color: 'var(--color-danger)', fontSize: 13 }}>
          Production route data is unavailable: {apiLoadError}
        </div>
      )}
      {gpsConnectionError && (
        <div role="alert" style={{ padding: 12, borderRadius: 8, border: '1px solid var(--color-warning-border, var(--border-subtle))', background: 'var(--color-warning-bg, var(--bg-surface-muted))', color: 'var(--color-warning, var(--text-secondary))', fontSize: 13 }}>
          Live GPS data is unavailable: {gpsConnectionError}
        </div>
      )}

      {!selectedCompany && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            <Metric label="Companies" value={String(companies.length)} detail="Demo and CSV-uploaded tenants" icon={<Building2 size={18} />} />
            <Metric label="Routes" value={String(allRoutes.length)} detail="Optimized cab routes" icon={<RouteIcon size={18} />} color="#059669" />
            <Metric label="Employees" value={String(allRoutes.reduce((sum, route) => sum + route.employees.length, 0))} detail="Riders across listed routes" icon={<Users size={18} />} color="#D97706" />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search companies..." aria-label="Search companies" style={{ ...cardStyle, minWidth: 240, flex: 1, padding: '10px 12px', color: 'var(--text-primary)', font: 'inherit', fontSize: 13, outlineColor: 'var(--border-focus)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Company → route list → employee itinerary and map</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {companies.map((company) => {
              const routes = [
                ...allRoutes.filter((route) => route.tenantId === company.id),
                ...(apiRoutesByTenant[company.id] ?? []),
              ];
              const riderCount = routes.reduce((sum, route) => sum + route.employees.length, 0);
              return (
                <button key={company.id} type="button" onClick={() => { setSelectedCompanyId(company.id); setApiLoadError(''); setRouteSearch(''); setRouteStatusFilter('ALL'); }} style={{ ...cardStyle, padding: 18, textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 11, background: 'var(--brand-primary-subtle)', color: 'var(--brand-blue-500)' }}><Building2 size={20} /></span>
                      <span><strong style={{ display: 'block', fontSize: 15 }}>{company.name}</strong><small style={{ color: 'var(--text-muted)' }}>{company.code} · {company.source === 'API' ? 'Operations tenant' : 'Demo tenant'}</small></span>
                    </div>
                    <ArrowRight size={17} color="var(--text-muted)" />
                  </div>
                  <div style={{ display: 'flex', gap: 18, marginTop: 18, color: 'var(--text-secondary)', fontSize: 12 }}>
                    <span><strong style={{ color: 'var(--text-primary)' }}>{routes.length}</strong> routes</span>
                    <span><strong style={{ color: 'var(--text-primary)' }}>{riderCount}</strong> employees</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 13, color: 'var(--text-muted)', fontSize: 11 }}><MapPin size={13} />{company.officeAddress}</div>
                </button>
              );
            })}
            {companies.length === 0 && <div style={{ ...cardStyle, padding: 24, color: 'var(--text-secondary)' }}>No companies match that search.</div>}
          </div>
        </>
      )}

      {selectedCompany && !selectedRoute && (
        <>
          <div className="routeKpiStrip">
            <Metric compact label="Routes assigned" value={String(companyAnalytics.totalRoutes)} detail={selectedCompany.code} icon={<RouteIcon size={16} />} />
            <Metric compact label="Not started" value={String(companyAnalytics.notStarted)} detail="Planned, dispatching, assigned" icon={<Clock3 size={16} />} color="#64748B" />
            <Metric compact label="In progress" value={String(companyAnalytics.inProgress)} detail="Current route status" icon={<Navigation size={16} />} color="#2563EB" />
            <Metric compact label="Completed" value={String(companyAnalytics.completed)} detail="Completed route status" icon={<CarFront size={16} />} color="#16A34A" />
            <Metric
              compact
              label="Delayed"
              value={companyAnalytics.routes.some((route) => route.delayMinutes !== null) ? String(companyAnalytics.delayed) : '–'}
              detail="Requires actual or live ETA timestamps"
              icon={<Clock3 size={18} />}
              color="#D97706"
            />
            <Metric
              compact
              label="Pickup completion"
              value={companyAnalytics.pickupCompletionPct === null ? '–' : `${companyAnalytics.pickupCompletionPct.toFixed(2)}%`}
              detail={`${companyAnalytics.pickupAssignedEmployees} login pickup stops`}
              icon={<Users size={18} />}
              color="#0F766E"
            />
          </div>
          <div className="routeCompanyDashboard" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: 14, alignItems: 'stretch' }}>
            <section style={{ ...cardStyle, padding: 16, minWidth: 0 }}>
              <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>Route details</h2>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                    {companyRoutes.length} routes
                    {selectedCompany.source === 'API' && apiUpdatedAtByTenant[selectedCompany.id]
                      ? ` · Synced ${new Date(apiUpdatedAtByTenant[selectedCompany.id]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : ''}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Select a route to inspect employees and map</p>
              </div>
              <div className="routeTableTools">
                <input
                  ref={routeSearchRef}
                  value={routeSearch}
                  onChange={(event) => setRouteSearch(event.target.value)}
                  placeholder="Search routes…"
                  aria-label="Search routes"
                />
                <div className="routeFilterChips" role="group" aria-label="Filter routes by status">
                  {['ALL', ...routeStatuses].map((status) => (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={routeStatusFilter === status}
                      onClick={() => setRouteStatusFilter(status)}
                    >
                      {status === 'ALL' ? 'All statuses' : status.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              {companyRoutes.length > 0 ? (
                <div className="routeTableWrap" style={{ maxHeight: 430, marginTop: 10 }}>
                  <table className="routeTable" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: 11 }}>
                        {['Route', 'Shift', 'Employees', 'Driver / vehicle', 'Status', 'Pickup progress', 'ETA', 'Delay'].map((heading) => (
                          <th key={heading} scope="col" style={{ padding: '9px 8px', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600, whiteSpace: 'nowrap' }}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRoutes.map((route) => {
                        const routeAnalytics = calculateRouteWorkspaceRouteAnalytics(route);
                        return (
                        <tr key={route.id} aria-selected={selectedRouteId === route.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRouteId(route.id)}>
                          <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)' }}>
                            <button type="button" data-route-select onKeyDown={(event) => {
                              if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
                              event.preventDefault();
                              const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-route-select]'));
                              const nextIndex = buttons.indexOf(event.currentTarget) + (event.key === 'ArrowDown' ? 1 : -1);
                              buttons[nextIndex]?.focus();
                            }} onClick={() => setSelectedRouteId(route.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0, border: 0, background: 'transparent', color: 'var(--brand-blue-500)', font: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              {route.routeCode}<ArrowRight size={13} />
                            </button>
                          </td>
                          <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: 12, whiteSpace: 'nowrap' }}>{route.shiftDate}<br />{route.shiftTime} · {route.direction}</td>
                          <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 12, whiteSpace: 'nowrap' }}>{route.employees.length}</td>
                          <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-primary)', fontSize: 12, whiteSpace: 'nowrap' }}>
                            <strong style={{ display: 'block', fontWeight: 600 }}>{route.driverName || 'Not assigned'}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{route.vehiclePlate || route.vehicleCategory}</span>
                          </td>
                          <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)', fontSize: 11, whiteSpace: 'nowrap' }}>
                            <span className="routeStatusPill" style={{ display: 'inline-flex', padding: '4px 7px', borderRadius: 999, background: 'var(--bg-surface-muted)', color: routeStatusColor(route.status), fontWeight: 700 }}>{route.status.replace(/_/g, ' ')}</span>
                          </td>
                          <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>
                            {routeAnalytics.pickupAssignedEmployees === 0
                              ? route.direction === 'LOGOUT' ? 'Drop-off route' : 'No pickup stops'
                              : routeAnalytics.pickupCompletionPct === null
                              ? 'Awaiting data'
                              : `${routeAnalytics.pickedUpEmployees}/${routeAnalytics.pickupAssignedEmployees} (${routeAnalytics.pickupCompletionPct.toFixed(2)}%)`}
                          </td>
                          <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>{formatRouteEta(route.plannedArrivalAt)}</td>
                          <td style={{ padding: '10px 8px', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>
                            {routeAnalytics.delayMinutes === null
                              ? 'Awaiting data'
                              : `${Math.round(routeAnalytics.delayMinutes)} min`}
                          </td>
                        </tr>
                        );
                      })}
                      {visibleRoutes.length === 0 && (
                        <tr><td colSpan={8} style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>No routes match the current search or status filter.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', minHeight: 250, padding: 24, color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
                  {apiLoadingTenantId === selectedCompany.id
                    ? 'Loading production routes…'
                    : 'No routes for this company yet. Import a CSV in the Route Optimizer to add its first route.'}
                </div>
              )}
            </section>

            {apiLoadingTenantId === selectedCompany.id && companyRoutes.length === 0 ? (
              <section role="status" style={{ ...cardStyle, display: 'grid', placeItems: 'center', minHeight: 280, padding: 24, color: 'var(--text-secondary)', fontSize: 13 }}>
                Loading this company&apos;s production routes…
              </section>
            ) : (
              <RouteAnalyticsPanel
                routes={companyRoutes}
                source={selectedCompany.source ?? 'DEMO'}
                gpsReportingRoutes={gpsAnalytics.reportingRoutes}
                gpsTotalRoutes={gpsAnalytics.totalRoutes}
                lastGpsFixAt={gpsAnalytics.lastFixAt}
              />
            )}
          </div>
        </>
      )}

      {selectedRoute && (
        <>
          <section aria-label={`Details for ${selectedRoute.routeCode}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <Metric label="Assigned employees" value={String(selectedRoute.employees.length)} detail={`Capacity ${selectedRoute.capacity}`} icon={<Users size={18} />} />
            <Metric label="Route distance" value={`${selectedRoute.distanceKm} km`} detail="Estimated pickup sequence" icon={<Navigation size={18} />} color="#059669" />
            <Metric label="Drive time" value={`${selectedRoute.durationMinutes} min`} detail={`${selectedRoute.shiftDate} · ${selectedRoute.shiftTime}`} icon={<Clock3 size={18} />} color="#D97706" />
            <Metric label="Vehicle" value={selectedRoute.vehicleCategory} detail={selectedRoute.vehiclePlate} icon={<CarFront size={18} />} color="#7C3AED" />
          </div>
          <div className="routeDetailGrid" style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.85fr) minmax(0, 1.4fr)', gap: 14, alignItems: 'stretch' }}>
            <section style={{ ...cardStyle, padding: 16, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                <div><h2 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>Employee {selectedRoute.direction === 'LOGIN' ? 'pickup' : 'drop-off'} list</h2><p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Ordered route stops · {selectedRoute.direction}</p></div>
                <span style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--brand-primary-subtle)', color: 'var(--brand-blue-500)', fontSize: 11, fontWeight: 700 }}>{selectedRoute.employees.length} stops</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {selectedRoute.employees.map((employee, index) => (
                  <div key={employee.id} style={{ display: 'grid', gridTemplateColumns: '30px minmax(0,1fr)', gap: 10, padding: '11px 9px', borderRadius: 9, background: 'var(--bg-surface-muted)' }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 27, height: 27, borderRadius: '50%', background: 'var(--brand-blue-500)', color: '#fff', fontSize: 12, fontWeight: 700 }}>{index + 1}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{employee.fullName}</strong>
                        <span style={{ color: 'var(--brand-blue-500)', fontSize: 11, fontWeight: 700 }}>{employee.pickupEta}</span>
                      </div>
                      <div style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 11 }}>{employee.employeeCode}{employee.department ? ` · ${employee.department}` : ''}{employee.phone ? ` · ${employee.phone}` : ''}</div>
                      <div style={{ marginTop: 5, color: 'var(--text-secondary)', fontSize: 12, overflowWrap: 'anywhere' }}>{employee.pickupAddress}</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '30px minmax(0,1fr)', gap: 10, padding: '11px 9px' }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 27, height: 27, borderRadius: '50%', background: '#16A34A', color: '#fff' }}><MapPin size={14} /></span>
                  <div><strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{selectedRoute.direction === 'LOGIN' ? 'Office / destination' : 'Office / route start'}</strong><div style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 12 }}>{selectedRoute.officeAddress}</div></div>
                </div>
              </div>
            </section>
            <section style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div><h2 style={{ margin: 0, fontSize: 17, color: 'var(--text-primary)' }}>Route map</h2><p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>Pickup stops connected to the office hub</p></div>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Purple: employee · Green: office</span>
              </div>
              <RouteMap route={selectedRoute} />
            </section>
          </div>
          </section>
        </>
      )}
    </div>
  );
}
