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
  Users,
} from 'lucide-react';
import { routesApi } from '../../lib/api/corporate';
import type { RouteListItem } from '../../lib/api/types';
import { useSession } from '../../lib/auth/SessionContext';
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

function getEffectiveDispatchStatus(route: RouteListItem): string {
  if (route.dispatchStatus) return route.dispatchStatus;
  if (route.driverId || route.status === 'ASSIGNED' || route.status === 'IN_TRANSIT' || route.status === 'COMPLETED') {
    return 'DRIVER_ASSIGNED';
  }
  return route.status === 'DISPATCHING' ? 'OFFERED' : 'PENDING';
}

export default function CorporateRoutesPage() {
  const router = useRouter();
  const session = useSession();

  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [direction, setDirection] = useState<'' | 'LOGIN' | 'LOGOUT'>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dispatchFilter, setDispatchFilter] = useState<string>('ALL');

  const loadRoutes = useCallback(async () => {
    if (session.status !== 'ready' || !session.tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await routesApi.list(session.tenantId, {
        shiftDate: shiftDate || undefined,
        direction: direction || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        dispatchStatus: dispatchFilter !== 'ALL' ? dispatchFilter : undefined,
        search: searchQuery.trim() || undefined,
        includeStops: true,
        limit: 200,
      });
      setRoutes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not fetch routes for your company.');
    } finally {
      setLoading(false);
    }
  }, [session.status, session.tenantId, shiftDate, direction, statusFilter, dispatchFilter, searchQuery]);

  useEffect(() => {
    if (session.status !== 'ready') return;
    const timer = setTimeout(() => {
      void loadRoutes();
    }, 180);
    return () => clearTimeout(timer);
  }, [session.status, loadRoutes]);

  const metrics = useMemo(() => {
    const total = routes.length;
    const assigned = routes.filter((r) => Boolean(r.driverId || r.status === 'ASSIGNED' || r.status === 'IN_TRANSIT' || r.status === 'COMPLETED')).length;
    const noDrivers = routes.filter((r) => getEffectiveDispatchStatus(r) === 'NO_DRIVERS_FOUND').length;
    const searching = Math.max(0, total - assigned - noDrivers);
    const totalPassengers = routes.reduce((acc, r) => acc + (r.assignedPassengerCount || 0), 0);
    return { total, assigned, noDrivers, searching, totalPassengers };
  }, [routes]);

  if (session.status === 'loading') {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading company session...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          padding: '20px 24px',
          borderRadius: 12,
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
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              {session.tenant?.name ? `${session.tenant.name} — Shift Routes` : 'Company Shift Routes'}
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              View employee pickup routes, Google Maps directions, live traffic ETAs, and autonomous dispatch updates.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          leftIcon={<RefreshCw size={15} />}
          onClick={() => void loadRoutes()}
          disabled={loading}
        >
          Refresh Routes
        </Button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        {[
          { label: 'Company Routes', value: metrics.total, sub: `${metrics.totalPassengers} employees commuting`, icon: <RouteIcon size={18} />, accent: '#5728B2' },
          { label: 'Drivers Confirmed', value: metrics.assigned, sub: 'Cab & chauffeur allocated', icon: <Car size={18} />, accent: '#16A34A' },
          { label: 'Automated Search', value: metrics.searching, sub: '10km radius dispatch cron', icon: <Radio size={18} />, accent: '#D97706' },
          { label: 'Drivers Not Found', value: metrics.noDrivers, sub: 'Escalated to Operations team', icon: <AlertTriangle size={18} />, accent: '#DC2626' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              padding: '16px 18px',
              borderRadius: 10,
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

      {/* Drivers Not Found Alert Banner */}
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
                No nearby driver accepted during the 30-minute dispatch search window (10km radius). Operations dispatchers have been alerted.
              </div>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setDispatchFilter('NO_DRIVERS_FOUND')}>
            Filter Unfulfilled Routes
          </Button>
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 12,
          padding: '16px 18px',
          borderRadius: 10,
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
              placeholder="Employee name, phone, cab..."
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
                type="button"
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
            onChange={(e) => setDirection(e.target.value as '' | 'LOGIN' | 'LOGOUT')}
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
            <option value="">All Directions</option>
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
            <option value="OFFERED">OFFERED (Searching)</option>
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
          </select>
        </div>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            color: '#DC2626',
            fontSize: 13,
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* List */}
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
          Loading company routes...
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
            No routes found for this filter
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0' }}>
            Once Operations creates cab routes for your employee roster, every shift route and live map appears here automatically.
          </p>
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
                  gridTemplateColumns: 'minmax(220px, 1.3fr) minmax(180px, 1.1fr) minmax(190px, 1.1fr) minmax(200px, 1.1fr) auto',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Route #{route.id.slice(0, 8)}
                    </span>
                    <StatusBadge status={route.status} size="sm" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>
                    <Building2 size={13} />
                    <span>{route.office?.name || 'Corporate Office'}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    {route.direction} • {route.shiftDate} ({route.shiftTime} IST)
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    <Clock size={14} />
                    <span>{formatIstTime(route.targetPickup1Time)}</span>
                    <ArrowRight size={13} />
                    <span>{formatIstTime(route.targetOfficeArrivalTime)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {durMin !== null ? `${durMin} min est.` : 'Traffic ETA'} • {distKm} km • {route.vehicleCategory}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    <Users size={14} />
                    <span>
                      {route.assignedPassengerCount}/{route.maxCapacity} pax • {stopCount} stops
                    </span>
                  </div>
                  {firstStop ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      <MapPin size={12} />
                      <span>1st: {firstStop.employeeName || firstStop.employee?.fullName || 'Employee'}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      Open for stop manifest
                    </div>
                  )}
                </div>

                <div>
                  {route.driver ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#15803D' }}>
                        <Car size={14} />
                        <span>{route.driver.fullName || route.driver.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {route.vehicle ? `${route.vehicle.registrationNumber} (${route.vehicle.model || ''})` : 'Vehicle allocated'}
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
                      <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>
                        {route.dispatchFailureReason || 'No drivers accepted within 10km'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <StatusBadge status={effDispatch} size="sm" />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Attempts: {route.dispatchAttempts ?? 0}/6
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
