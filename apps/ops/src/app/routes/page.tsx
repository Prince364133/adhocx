'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Car,
  Clock,
  MapPin,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateRouteItem, CorporateTenantOption } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';

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

export default function OpsRoutesPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<CorporateTenantOption[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('ALL');

  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dispatchNotice, setDispatchNotice] = useState<string | null>(null);
  const [retryingRouteId, setRetryingRouteId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [direction, setDirection] = useState<'ALL' | 'LOGIN' | 'LOGOUT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dispatchFilter, setDispatchFilter] = useState<string>('ALL');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search);
      const qTenantId = qs.get('tenantId');
      if (qTenantId) setSelectedTenantId(qTenantId);
      const qDate = qs.get('shiftDate');
      if (qDate) setShiftDate(qDate);
      const qDispatch = qs.get('dispatchStatus');
      if (qDispatch) setDispatchFilter(qDispatch);
    }
  }, []);

  const loadCompanies = useCallback(async (search?: string) => {
    try {
      const res = await opsApi.getTenants({ search: search?.trim() || undefined, page: 1, limit: 100 });
      setCompanies(Array.isArray(res.items) ? res.items : []);
    } catch {
      // Keep page functional even if directory fetch fails briefly
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCompanies(companySearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [companySearch, loadCompanies]);

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await opsApi.getRoutes({
        tenantId: selectedTenantId !== 'ALL' ? selectedTenantId : undefined,
        shiftDate: shiftDate || undefined,
        direction: direction !== 'ALL' ? direction : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        dispatchStatus: dispatchFilter !== 'ALL' ? dispatchFilter : undefined,
        search: searchQuery.trim() || undefined,
        includeStops: true,
        limit: 200,
      });
      setRoutes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load corporate routes.');
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId, shiftDate, direction, statusFilter, dispatchFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRoutes();
    }, 180);
    return () => clearTimeout(timer);
  }, [loadRoutes]);

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

  const metrics = useMemo(() => {
    const total = routes.length;
    const assigned = routes.filter((r) => Boolean(r.driverId || r.status === 'ASSIGNED' || r.status === 'IN_TRANSIT' || r.status === 'COMPLETED')).length;
    const noDrivers = routes.filter((r) => getEffectiveDispatchStatus(r) === 'NO_DRIVERS_FOUND').length;
    const pendingOrOffering = total - assigned - noDrivers;
    const totalPassengers = routes.reduce((acc, r) => acc + (r.assignedPassengerCount || 0), 0);
    return { total, assigned, noDrivers, pendingOrOffering: Math.max(0, pendingOrOffering), totalPassengers };
  }, [routes]);

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
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Corporate Routes & Live Dispatch
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              Monitor generated employee cab routes, pickup manifests, Google Maps live traffic ETAs, and autonomous 10km driver dispatch.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={15} />}
            onClick={() => void loadRoutes()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Link
            href={`/planner${selectedTenantId !== 'ALL' ? `?tenantId=${encodeURIComponent(selectedTenantId)}` : ''}`}
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
            Search Company Directory
          </label>
          <div style={{ position: 'relative' }}>
            <Building2
              size={14}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Filter companies..."
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
            Company
          </label>
          <select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
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
            <option value="ALL">All Onboarded Companies ({companies.length})</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

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
            Upload an employee roster CSV/Excel in the Route Optimizer to generate sorted cab routes and save them here.
          </p>
          <Link href="/planner" style={{ textDecoration: 'none' }}>
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
            const firstStop = route.stops?.[0];
            const distKm = route.estDistanceMeters ? (route.estDistanceMeters / 1000).toFixed(1) : '—';
            const durMin = route.estDurationSeconds ? Math.round(route.estDurationSeconds / 60) : null;
            const canRetryDispatch =
              !route.driverId && route.status !== 'COMPLETED' && route.status !== 'CANCELLED';

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
                    Route #{route.id.slice(0, 8)} • {route.direction} • {route.shiftDate} ({route.shiftTime} IST)
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
                      1st pickup: {firstStop.employeeName || 'Employee'}
                      {firstStop.employeePhone ? ` (${firstStop.employeePhone})` : ''}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
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
                        ? 'Retry Search (10km)'
                        : 'Start Dispatch'}
                    </Button>
                  )}
                  <Link
                    href={`/routes/${route.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ textDecoration: 'none' }}
                  >
                    <Button variant="primary" size="sm">
                      View Map &amp; Directions
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
