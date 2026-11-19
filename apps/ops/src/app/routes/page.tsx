'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Car,
  Clock,
  ListChecks,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateRouteItem, CorporateTenantOption } from '../../lib/api/opsTypes';
import {
  canCancelRoute,
  canDeleteRoute,
  canEditRoute,
  canReassignRoute,
  isOfficeHubStop,
} from '../../lib/opsHelpers';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CancelRouteModal } from '../../components/operations/CancelRouteModal';
import { ReassignDriverModal } from '../../components/operations/ReassignDriverModal';
import { StopItineraryDrawer } from '../../components/operations/StopItineraryDrawer';
import { EditRouteModal } from '../../components/operations/EditRouteModal';

const COMPANY_STORAGE_KEY = 'adhocx_ops_selected_tenant';

function formatIstTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function getEffectiveDispatchStatus(route: CorporateRouteItem): string {
  if (route.dispatchStatus) return route.dispatchStatus;
  if (route.driverId || route.status === 'ASSIGNED' || route.status === 'IN_TRANSIT' || route.status === 'COMPLETED') {
    return 'DRIVER_ASSIGNED';
  }
  return route.status === 'DISPATCHING' ? 'OFFERED' : 'PENDING';
}

function OpsRoutesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTenantId = searchParams.get('tenantId')?.trim() || '';

  const [selectedTenantId, setSelectedTenantId] = useState<string>(urlTenantId);
  const [tenantResolved, setTenantResolved] = useState<boolean>(Boolean(urlTenantId));
  const [company, setCompany] = useState<CorporateTenantOption | null>(null);

  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);
  const [retryingRouteId, setRetryingRouteId] = useState<string | null>(null);

  // Route Management Modals & Drawer
  const [drawerRoute, setDrawerRoute] = useState<CorporateRouteItem | null>(null);
  const [editRoute, setEditRoute] = useState<CorporateRouteItem | null>(null);
  const [reassignRoute, setReassignRoute] = useState<CorporateRouteItem | null>(null);
  const [cancelRoute, setCancelRoute] = useState<CorporateRouteItem | null>(null);
  const [deleteRoute, setDeleteRoute] = useState<CorporateRouteItem | null>(null);
  const [deletingRoute, setDeletingRoute] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [shiftDate, setShiftDate] = useState(() => searchParams.get('shiftDate') || '');
  const [direction, setDirection] = useState<'ALL' | 'LOGIN' | 'LOGOUT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dispatchFilter, setDispatchFilter] = useState<string>(() => searchParams.get('dispatchStatus') || 'ALL');

  useEffect(() => {
    if (urlTenantId) {
      setSelectedTenantId(urlTenantId);
      setTenantResolved(true);
      try {
        localStorage.setItem(COMPANY_STORAGE_KEY, urlTenantId);
        window.dispatchEvent(new Event('adhocx:ops-tenant-changed'));
      } catch {}
      return;
    }

    let remembered = '';
    try {
      remembered = localStorage.getItem(COMPANY_STORAGE_KEY)?.trim() || '';
    } catch {}

    if (remembered) {
      setSelectedTenantId(remembered);
      setTenantResolved(true);
      router.replace(`/routes?tenantId=${encodeURIComponent(remembered)}`);
      return;
    }

    setSelectedTenantId('');
    setTenantResolved(true);
    setLoading(false);
  }, [urlTenantId, router]);

  useEffect(() => {
    if (!selectedTenantId) {
      setCompany(null);
      return;
    }

    let cancelled = false;
    void opsApi
      .getTenant(selectedTenantId)
      .then((res) => {
        if (!cancelled) setCompany(res);
      })
      .catch(() => {
        if (!cancelled) setCompany(null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTenantId]);

  const loadRoutes = useCallback(async () => {
    if (!tenantResolved) return;
    if (!selectedTenantId) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await opsApi.getRoutes({
        tenantId: selectedTenantId,
        shiftDate: shiftDate || undefined,
        direction: direction !== 'ALL' ? direction : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        dispatchStatus: dispatchFilter !== 'ALL' ? dispatchFilter : undefined,
        search: searchQuery.trim() || undefined,
        includeStops: true,
        limit: 200,
      });
      const scopedRoutes = (Array.isArray(data) ? data : []).filter(
        (route) => !route.tenantId || route.tenantId === selectedTenantId,
      );
      setRoutes(scopedRoutes);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load corporate routes.');
    } finally {
      setLoading(false);
    }
  }, [tenantResolved, selectedTenantId, shiftDate, direction, statusFilter, dispatchFilter, searchQuery]);

  useEffect(() => {
    if (!tenantResolved) return;
    const timer = setTimeout(() => {
      void loadRoutes();
    }, 180);
    return () => clearTimeout(timer);
  }, [tenantResolved, loadRoutes]);

  async function handleRetryDispatch(e: React.MouseEvent, routeId: string) {
    e.stopPropagation();
    setRetryingRouteId(routeId);
    setDispatchNotice(null);
    try {
      const res = await opsApi.forceDispatchRoute(routeId);
      if (res.status === 'OFFERED') {
        setDispatchNotice(
          `Dispatched route within ${res.searchRadiusKm ?? 10}km (${res.offeredDriverName || 'nearest eligible driver notified'}).`,
        );
      } else if (res.status === 'NO_DRIVERS_FOUND') {
        setDispatchNotice('No available drivers found within 10km of Pickup 1 right now.');
      } else {
        setDispatchNotice(`Dispatch scan returned: ${res.status}.`);
      }
      await loadRoutes();
    } catch (err: any) {
      setDispatchNotice(err?.message || 'Could not trigger dispatch retry.');
    } finally {
      setRetryingRouteId(null);
    }
  }

  async function handleConfirmDeleteRoute() {
    if (!deleteRoute) return;
    setDeletingRoute(true);
    setDispatchNotice(null);
    setErrorMsg(null);
    try {
      await opsApi.deleteRoute(deleteRoute.id);
      setDispatchNotice(`Route RT-${deleteRoute.id.slice(0, 8).toUpperCase()} deleted.`);
      setDeleteRoute(null);
      await loadRoutes();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not delete route.');
    } finally {
      setDeletingRoute(false);
    }
  }

  async function handleOpenDrawer(e: React.MouseEvent, route: CorporateRouteItem) {
    e.stopPropagation();
    setDrawerRoute(route);
    try {
      const full = await opsApi.getRouteById(route.id, false);
      setDrawerRoute(full);
    } catch {
      // keep list summary if fetch fails
    }
  }

  const metrics = useMemo(() => {
    const total = routes.length;
    const assigned = routes.filter((r) => Boolean(r.driverId || r.status === 'ASSIGNED' || r.status === 'IN_TRANSIT' || r.status === 'COMPLETED')).length;
    const noDrivers = routes.filter((r) => getEffectiveDispatchStatus(r) === 'NO_DRIVERS_FOUND').length;
    const pendingOrOffering = total - assigned - noDrivers;
    const totalPassengers = routes.reduce((acc, r) => acc + (r.assignedPassengerCount || 0), 0);
    return { total, assigned, noDrivers, pendingOrOffering: Math.max(0, pendingOrOffering), totalPassengers };
  }, [routes]);

  const companyDisplayName = company?.name || routes[0]?.tenant?.name || 'Selected Company';
  const companyDisplayCode = company?.code || routes[0]?.tenant?.code || '';

  if (tenantResolved && !selectedTenantId) {
    return (
      <div style={{ maxWidth: 720, margin: '40px auto' }}>
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Building2 size={38} style={{ color: 'var(--brand-primary, #5728B2)', marginBottom: 12 }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Select a Company from Company Hub
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '8px 0 20px' }}>
            Routes &amp; Trips are scoped per corporate client. Choose a company card from the hub to view its routes and trips.
          </p>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="primary" leftIcon={<ArrowLeft size={15} />}>
              Go to Company Hub
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '20px 24px',
          borderRadius: 'var(--radius-lg, 12px)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'var(--brand-primary-subtle, rgba(87, 40, 178, 0.12))',
              color: 'var(--brand-primary, #5728B2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RouteIcon size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {companyDisplayName} · Routes &amp; Trips
              </h1>
              {companyDisplayCode && (
                <span className="code-tag">{companyDisplayCode}</span>
              )}
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              Scoped routes, trips, pickup manifests, live traffic ETAs, and autonomous 10km driver dispatch for this company.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Button variant="outline" leftIcon={<ArrowLeft size={15} />}>
              Company Hub
            </Button>
          </Link>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={15} />}
            onClick={() => void loadRoutes()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Link
            href={`/map?tenantId=${encodeURIComponent(selectedTenantId)}`}
            style={{ textDecoration: 'none' }}
          >
            <Button variant="outline" leftIcon={<MapPin size={15} />}>
              Fleet Live Map
            </Button>
          </Link>
          <Link
            href={`/planner?tenantId=${encodeURIComponent(selectedTenantId)}&tab=MANUAL`}
            style={{ textDecoration: 'none' }}
          >
            <Button variant="outline" leftIcon={<Plus size={15} />}>
              Create Manual Route
            </Button>
          </Link>
          <Link
            href={`/employees?tenantId=${encodeURIComponent(selectedTenantId)}`}
            style={{ textDecoration: 'none' }}
          >
            <Button variant="outline" leftIcon={<Users size={15} />}>
              Employees
            </Button>
          </Link>
          <Link
            href={`/planner?tenantId=${encodeURIComponent(selectedTenantId)}`}
            style={{ textDecoration: 'none' }}
          >
            <Button variant="primary" leftIcon={<Sparkles size={15} />}>
              Open Route Optimizer
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        {[
          { label: 'Listed Routes', value: metrics.total, sub: `${metrics.totalPassengers} employees scheduled`, icon: <RouteIcon size={18} />, accent: '#5728B2' },
          { label: 'Drivers Assigned', value: metrics.assigned, sub: 'Confirmed / Active trips', icon: <Car size={18} />, accent: '#16A34A' },
          { label: 'Scheduled / Searching', value: metrics.pendingOrOffering, sub: 'Awaiting T-60m or 5m scan', icon: <Radio size={18} />, accent: '#D97706' },
          { label: 'Drivers Not Found', value: metrics.noDrivers, sub: '30m window exhausted (6 runs)', icon: <AlertTriangle size={18} />, accent: '#DC2626' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              padding: '16px 18px',
              borderRadius: 'var(--radius-md, 10px)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{kpi.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 3 }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{kpi.sub}</div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: `${kpi.accent}18`,
                color: kpi.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Drivers Not Found Banner */}
      {metrics.noDrivers > 0 && dispatchFilter !== 'NO_DRIVERS_FOUND' && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 10,
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#DC2626' }}>
            <AlertTriangle size={18} />
            <div>
              <strong style={{ fontSize: 13 }}>
                Drivers not found for {metrics.noDrivers} route{metrics.noDrivers === 1 ? '' : 's'}
              </strong>
              <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                Autonomous dispatch completed the 30-minute search window (6 runs @ 10km radius) without driver acceptance.
              </div>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDispatchFilter('NO_DRIVERS_FOUND')}
          >
            Show Unfulfilled Routes
          </Button>
        </div>
      )}

      {dispatchNotice && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 10,
            backgroundColor: 'rgba(87, 40, 178, 0.1)',
            border: '1px solid rgba(87, 40, 178, 0.3)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {dispatchNotice}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))',
          gap: 12,
          padding: '16px 18px',
          borderRadius: 'var(--radius-md, 10px)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
            Search Route / Employee / Driver
          </label>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Employee, phone, plate, ID..."
              style={{
                width: '100%',
                height: 36,
                padding: '0 10px 0 32px',
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-surface-muted)',
                color: 'var(--text-primary)',
                fontSize: 12,
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
            Shift Date
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Calendar
                size={14}
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
              />
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 8px 0 30px',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
              />
            </div>
            {shiftDate && (
              <button
                onClick={() => setShiftDate('')}
                style={{
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
            Direction
          </label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'ALL' | 'LOGIN' | 'LOGOUT')}
            style={{
              width: '100%',
              height: 36,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-primary)',
              fontSize: 12,
            }}
          >
            <option value="ALL">All Directions</option>
            <option value="LOGIN">LOGIN (Home -&gt; Office)</option>
            <option value="LOGOUT">LOGOUT (Office -&gt; Home)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
            Dispatch State
          </label>
          <select
            value={dispatchFilter}
            onChange={(e) => setDispatchFilter(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-primary)',
              fontSize: 12,
            }}
          >
            <option value="ALL">All Dispatch States</option>
            <option value="PENDING">PENDING</option>
            <option value="SEARCHING">SEARCHING (run in progress)</option>
            <option value="OFFERED">OFFERED (awaiting driver)</option>
            <option value="RETRY_SCHEDULED">RETRY_SCHEDULED (next run in 5 min)</option>
            <option value="DRIVER_ASSIGNED">DRIVER_ASSIGNED</option>
            <option value="NO_DRIVERS_FOUND">NO_DRIVERS_FOUND</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5 }}>
            Trip Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              height: 36,
              padding: '0 10px',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-primary)',
              fontSize: 12,
            }}
          >
            <option value="ALL">All Trip Statuses</option>
            <option value="PLANNED">PLANNED</option>
            <option value="DISPATCHING">DISPATCHING</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_TRANSIT">IN_TRANSIT</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            color: '#DC2626',
            fontSize: 13,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Routes List */}
      {loading ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          Loading corporate routes...
        </div>
      ) : routes.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px dashed var(--border-strong)',
          }}
        >
          <Navigation size={34} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            No matching corporate routes found
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 18px' }}>
            Upload an employee roster CSV/Excel in the Route Optimizer to generate sorted cab routes for {companyDisplayName} and save them here.
          </p>
          <Link href={`/planner?tenantId=${encodeURIComponent(selectedTenantId)}`} style={{ textDecoration: 'none' }}>
            <Button variant="primary" leftIcon={<Sparkles size={15} />}>
              Go to Route Optimizer
            </Button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {routes.map((route) => {
            const effDispatch = getEffectiveDispatchStatus(route);
            const isExhausted = effDispatch === 'NO_DRIVERS_FOUND';
            const stopCount = route.stops?.length ?? route._count?.stops ?? 0;
            const firstStop = route.stops?.find((s) => !isOfficeHubStop(s)) ?? route.stops?.[0];
            const distKm = route.estDistanceMeters ? (route.estDistanceMeters / 1000).toFixed(1) : '—';
            const durMin = route.estDurationSeconds ? Math.round(route.estDurationSeconds / 60) : null;
            const canRetryDispatch =
              !route.driverId && (route.status === 'PLANNED' || route.status === 'DISPATCHING');

            return (
              <div
                key={route.id}
                onClick={() => router.push(`/routes/${route.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/routes/${route.id}`);
                  }
                }}
                style={{
                  padding: '16px 20px',
                  borderRadius: 12,
                  backgroundColor: 'var(--bg-surface)',
                  border: isExhausted
                    ? '1px solid rgba(220, 38, 38, 0.45)'
                    : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(220px, 1.4fr) minmax(180px, 1.1fr) minmax(200px, 1.2fr) minmax(220px, 1.2fr) auto',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                {/* Company & Office */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {route.tenant?.name || 'Corporate Client'}
                    </span>
                    {route.tenant?.code && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 6,
                          backgroundColor: 'var(--bg-surface-muted)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {route.tenant.code}
                      </span>
                    )}
                    <StatusBadge status={route.status} size="sm" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                    <MapPin size={13} />
                    <span>{route.office?.name || 'Corporate Office'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    Route #{route.id.slice(0, 8)} • {route.direction} • {String(route.shiftDate).slice(0, 10)} ({route.shiftTime} IST)
                  </div>
                </div>

                {/* Timings */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    <Clock size={14} />
                    <span>{formatIstTime(route.targetPickup1Time)}</span>
                    <ArrowRight size={13} />
                    <span>{formatIstTime(route.targetOfficeArrivalTime)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {durMin !== null ? `${durMin} min est.` : 'Est. time pending'} • {distKm} km • {route.vehicleCategory}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    Dispatch Cron: T-60m search (30m + 30m approach)
                  </div>
                </div>

                {/* Stops & Employees */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    <Users size={14} />
                    <span>
                      {route.assignedPassengerCount}/{route.maxCapacity} pax • {stopCount} stop{stopCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  {firstStop ? (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {route.direction === 'LOGOUT' ? '1st dropoff' : '1st pickup'}:{' '}
                      {firstStop.employeeName ?? firstStop.employee?.fullName ?? 'Employee'}
                      {(firstStop.employeePhone ?? firstStop.employee?.phoneNumber)
                        ? ` (${firstStop.employeePhone ?? firstStop.employee?.phoneNumber})`
                        : ''}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Click to view stop manifest
                    </div>
                  )}
                </div>

                {/* Driver & Dispatch Status */}
                <div>
                  {route.driver ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#15803D' }}>
                        <Car size={14} />
                        <span>{route.driver.fullName}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {route.vehicle ? `${route.vehicle.registrationNumber} (${route.vehicle.model})` : 'Vehicle assigned'}
                      </div>
                      {route.driver.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          <Phone size={11} />
                          <span>{route.driver.phone}</span>
                        </div>
                      )}
                    </>
                  ) : isExhausted ? (
                    <div>
                      <StatusBadge status="NO_DRIVERS_FOUND" label="Drivers Not Found" size="sm" />
                      <div style={{ fontSize: 11, color: '#DC2626', marginTop: 5 }}>
                        {route.dispatchFailureReason || `Exhausted ${route.dispatchAttempts ?? 6} runs within 10km`}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <StatusBadge status={effDispatch} size="sm" />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                        Search attempts: {route.dispatchAttempts ?? 0}/6 (10km radius)
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {canRetryDispatch && (
                    <Button
                      variant={isExhausted ? 'danger' : 'secondary'}
                      size="sm"
                      disabled={retryingRouteId === route.id}
                      onClick={(e) => void handleRetryDispatch(e, route.id)}
                    >
                      {retryingRouteId === route.id
                        ? 'Searching...'
                        : isExhausted
                        ? 'Retry Search'
                        : 'Dispatch'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<ListChecks size={13} />}
                    onClick={(e) => void handleOpenDrawer(e, route)}
                  >
                    Stops
                  </Button>
                  {canReassignRoute(route) && (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<UserCheck size={13} />}
                      onClick={() => setReassignRoute(route)}
                    >
                      Reassign
                    </Button>
                  )}
                  {canEditRoute(route) && (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Pencil size={13} />}
                      onClick={() => setEditRoute(route)}
                    >
                      Edit
                    </Button>
                  )}
                  {canDeleteRoute(route) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete route"
                      onClick={() => {
                        setErrorMsg(null);
                        setDeleteRoute(route);
                      }}
                      style={{ color: 'var(--color-danger, #DC2626)' }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                  {canCancelRoute(route) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Cancel route"
                      onClick={() => setCancelRoute(route)}
                      style={{ color: 'var(--color-danger, #DC2626)' }}
                    >
                      <XCircle size={14} />
                    </Button>
                  )}
                  <Link
                    href={`/routes/${route.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="primary" size="sm">
                      Map &amp; Details
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals & Stop Drawer */}
      <StopItineraryDrawer
        route={drawerRoute}
        isOpen={Boolean(drawerRoute)}
        onClose={() => setDrawerRoute(null)}
        onRouteUpdated={() => {
          void loadRoutes();
          if (drawerRoute) {
            void opsApi.getRouteById(drawerRoute.id, false).then(setDrawerRoute).catch(() => {});
          }
        }}
      />

      <EditRouteModal
        route={editRoute}
        isOpen={Boolean(editRoute)}
        onClose={() => setEditRoute(null)}
        onSuccess={() => {
          setDispatchNotice('Route updated successfully.');
          void loadRoutes();
        }}
      />

      <ReassignDriverModal
        route={reassignRoute}
        isOpen={Boolean(reassignRoute)}
        onClose={() => setReassignRoute(null)}
        onSuccess={() => {
          setDispatchNotice('Driver reassignment initiated.');
          void loadRoutes();
        }}
      />

      <CancelRouteModal
        route={cancelRoute}
        isOpen={Boolean(cancelRoute)}
        onClose={() => setCancelRoute(null)}
        onSuccess={() => {
          setDispatchNotice('Route cancelled.');
          void loadRoutes();
        }}
      />

      <Modal
        isOpen={Boolean(deleteRoute)}
        onClose={() => {
          setDeleteRoute(null);
          setErrorMsg(null);
        }}
        title="Delete Corporate Route"
        subtitle={deleteRoute ? `Route RT-${deleteRoute.id.slice(0, 8).toUpperCase()} · ${deleteRoute.assignedPassengerCount} Passengers` : undefined}
        width="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {errorMsg && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger-border)',
                color: 'var(--color-danger, #DC2626)',
                fontSize: 12,
              }}
            >
              {errorMsg}
            </div>
          )}
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Permanently delete this unstarted route and its pending stops/transport requests? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteRoute(null);
                setErrorMsg(null);
              }}
              disabled={deletingRoute}
            >
              Keep Route
            </Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 size={14} />}
              isLoading={deletingRoute}
              onClick={() => void handleConfirmDeleteRoute()}
            >
              Delete Route
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function OpsRoutesPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            maxWidth: 1440,
            margin: '0 auto',
          }}
        >
          Loading company routes...
        </div>
      }
    >
      <OpsRoutesContent />
    </Suspense>
  );
}
