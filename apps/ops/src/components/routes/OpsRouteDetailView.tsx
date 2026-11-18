'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
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
  ShieldAlert,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateRouteItem, RouteDirectionsResult, RouteStop } from '../../lib/api/opsTypes';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { GoogleRouteMap, GoogleRouteMapStop } from '../maps/GoogleRouteMap';
import { EditRouteModal } from '../operations/EditRouteModal';
import { ReassignDriverModal } from '../operations/ReassignDriverModal';
import { CancelRouteModal } from '../operations/CancelRouteModal';
import { StopItineraryDrawer } from '../operations/StopItineraryDrawer';

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

function formatIstDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

function shiftMinutesIso(iso: string | undefined, deltaMinutes: number): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatIstTime(new Date(d.getTime() + deltaMinutes * 60_000).toISOString());
}

const modalInputStyle: React.CSSProperties = {
  width: '100%',
  height: '36px',
  backgroundColor: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  padding: '0 10px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const modalLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  marginBottom: '5px',
  textTransform: 'uppercase',
};

export function OpsRouteDetailView({ routeId }: { routeId: string }) {
  const router = useRouter();
  const [route, setRoute] = useState<CorporateRouteItem | null>(null);
  const [directions, setDirections] = useState<RouteDirectionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingTraffic, setRefreshingTraffic] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dispatchBanner, setDispatchBanner] = useState<string | null>(null);
  const [highlightedStop, setHighlightedStop] = useState<number | null>(null);

  // Route-level Modals & Drawer
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteRouteOpen, setDeleteRouteOpen] = useState(false);
  const [deletingRoute, setDeletingRoute] = useState(false);

  // Stop CRUD State
  const [addStopOpen, setAddStopOpen] = useState(false);
  const [newStopForm, setNewStopForm] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    employeeCode: '',
    department: '',
    address: '',
  });
  const [savingStop, setSavingStop] = useState(false);

  const [editingStop, setEditingStop] = useState<RouteStop | null>(null);
  const [editStopForm, setEditStopForm] = useState({
    name: '',
    phoneNumber: '',
    address: '',
  });

  const [removingStop, setRemovingStop] = useState<RouteStop | null>(null);
  const [removingStopLoading, setRemovingStopLoading] = useState(false);

  const loadRoute = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await opsApi.getRouteById(routeId, true);
      setRoute(data);
      if (data.directions) {
        setDirections(data.directions);
      } else {
        const dir = await opsApi.getRouteDirections(routeId, false).catch(() => null);
        if (dir) setDirections(dir);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load route details.');
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    void loadRoute();
  }, [loadRoute]);

  async function handleRefreshTraffic() {
    if (!route) return;
    setRefreshingTraffic(true);
    try {
      const fresh = await opsApi.getRouteDirections(route.id, true);
      setDirections(fresh);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to refresh live Google Maps traffic right now.');
    } finally {
      setRefreshingTraffic(false);
    }
  }

  async function handleForceDispatch() {
    if (!route) return;
    setDispatching(true);
    setErrorMsg(null);
    setDispatchBanner(null);
    try {
      const res = await opsApi.forceDispatchRoute(route.id);
      if (res.status === 'OFFERED') {
        setDispatchBanner(
          `Offer dispatched to ${res.offeredDriverName || 'nearest driver'} within ${res.searchRadiusKm ?? 10} km.`,
        );
      } else if (res.status === 'NO_DRIVERS_FOUND') {
        setDispatchBanner('No available drivers found within 10 km around the first pickup point.');
      } else {
        setDispatchBanner(`Dispatch status: ${res.status}`);
      }
      await loadRoute();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Dispatch invocation failed.');
    } finally {
      setDispatching(false);
    }
  }

  async function handleConfirmDeleteRoute() {
    if (!route) return;
    setDeletingRoute(true);
    setErrorMsg(null);
    try {
      await opsApi.deleteRoute(route.id);
      router.push(route.tenantId ? `/routes?tenantId=${encodeURIComponent(route.tenantId)}` : '/routes');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not delete route.');
      setDeleteRouteOpen(false);
    } finally {
      setDeletingRoute(false);
    }
  }

  async function handleAddStop(e: React.FormEvent) {
    e.preventDefault();
    if (!route) return;
    if (!newStopForm.name.trim() || !newStopForm.phoneNumber.trim() || !newStopForm.address.trim()) {
      setErrorMsg('Employee name, phone number, and address are required.');
      return;
    }
    setSavingStop(true);
    setErrorMsg(null);
    try {
      await opsApi.addRouteStop(route.id, {
        name: newStopForm.name.trim(),
        phoneNumber: newStopForm.phoneNumber.trim(),
        email: newStopForm.email.trim() || undefined,
        employeeCode: newStopForm.employeeCode.trim() || undefined,
        department: newStopForm.department.trim() || undefined,
        address: newStopForm.address.trim(),
      });
      setAddStopOpen(false);
      setNewStopForm({ name: '', phoneNumber: '', email: '', employeeCode: '', department: '', address: '' });
      setDispatchBanner('Employee stop added and commuter login account synced.');
      await loadRoute();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to add employee stop.');
    } finally {
      setSavingStop(false);
    }
  }

  function openEditStop(stop: RouteStop) {
    setEditingStop(stop);
    setEditStopForm({
      name: stop.employeeName || stop.employee?.fullName || '',
      phoneNumber: stop.employeePhone || stop.employee?.phoneNumber || '',
      address: stop.addressText || '',
    });
  }

  async function handleUpdateStop(e: React.FormEvent) {
    e.preventDefault();
    if (!route || !editingStop) return;
    setSavingStop(true);
    setErrorMsg(null);
    try {
      await opsApi.updateRouteStop(route.id, editingStop.id, {
        name: editStopForm.name.trim() || undefined,
        phoneNumber: editStopForm.phoneNumber.trim() || undefined,
        address: editStopForm.address.trim() || undefined,
      });
      setEditingStop(null);
      setDispatchBanner('Stop details updated.');
      await loadRoute();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update stop.');
    } finally {
      setSavingStop(false);
    }
  }

  async function handleConfirmRemoveStop() {
    if (!route || !removingStop) return;
    setRemovingStopLoading(true);
    setErrorMsg(null);
    try {
      await opsApi.deleteRouteStop(route.id, removingStop.id);
      setRemovingStop(null);
      setDispatchBanner('Employee stop removed from route.');
      await loadRoute();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to remove stop.');
    } finally {
      setRemovingStopLoading(false);
    }
  }

  const orderedStops = useMemo<RouteStop[]>(() => {
    return [...(route?.stops ?? [])].sort((a, b) => a.stopSequence - b.stopSequence);
  }, [route?.stops]);

  const mapStops = useMemo<GoogleRouteMapStop[]>(() => {
    return orderedStops.map((s) => ({
      id: s.id,
      stopSequence: s.stopSequence,
      stopType: s.stopType,
      employeeName: s.employeeName ?? s.employee?.fullName ?? null,
      employeePhone: s.employeePhone ?? s.employee?.phoneNumber ?? null,
      addressText: s.addressText,
      lat: Number(s.latitude),
      lng: Number(s.longitude),
      plannedEta: s.plannedEta,
      dwellBufferSeconds: s.dwellBufferSeconds,
      status: s.status,
    }));
  }, [orderedStops]);

  const mapOffice = useMemo(() => {
    if (!route?.office) return null;
    const lat = Number(route.office.latitude);
    const lng = Number(route.office.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      name: route.office.name,
      addressText: route.office.addressText,
      lat,
      lng,
    };
  }, [route?.office]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <RefreshCw className="spin" size={24} style={{ margin: '0 auto 10px' }} />
        <div>Loading route itinerary &amp; Google Maps traffic directions...</div>
      </div>
    );
  }

  if (errorMsg && !route) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Link href="/routes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Routes List
        </Link>
        <div style={{ padding: '20px', borderRadius: '10px', border: '1px solid var(--color-danger-border)', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          {errorMsg}
        </div>
      </div>
    );
  }

  if (!route) return null;

  const isDriversNotFound = route.dispatchStatus === 'NO_DRIVERS_FOUND';
  const legByFromSeq = new Map((directions?.legs ?? []).map((leg) => [leg.fromSequence, leg]));
  const totalWaitMin = Math.round((directions?.totalDwellSeconds ?? 0) / 60);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* TOP BAR */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href={route.tenantId ? `/routes?tenantId=${encodeURIComponent(route.tenantId)}` : '/routes'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} /> Routes List
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {route.tenant?.name || 'Corporate Route'} · {route.shiftTime} {route.direction}
              </h1>
              <StatusBadge status={route.status} />
              {isDriversNotFound ? (
                <StatusBadge status="NO_DRIVERS_FOUND" label="Drivers Not Found" />
              ) : (
                route.dispatchStatus && <StatusBadge status={route.dispatchStatus} />
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Route ID: <span style={{ fontFamily: 'monospace' }}>{route.id}</span> · Shift Date:{' '}
              {String(route.shiftDate).slice(0, 10)} · {route.vehicleCategory} ({route.assignedPassengerCount}/{route.maxCapacity} seats)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefreshTraffic}
            disabled={refreshingTraffic}
            leftIcon={<RefreshCw size={14} className={refreshingTraffic ? 'spin' : undefined} />}
          >
            {refreshingTraffic ? 'Refreshing Traffic...' : 'Refresh Traffic'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            leftIcon={<ListChecks size={14} />}
          >
            OTP / No-Show Drawer
          </Button>
          {route.status !== 'COMPLETED' && route.status !== 'CANCELLED' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReassignModalOpen(true)}
              leftIcon={<UserCheck size={14} />}
            >
              Reassign Driver
            </Button>
          )}
          {route.status !== 'IN_TRANSIT' && route.status !== 'COMPLETED' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(true)}
                leftIcon={<Pencil size={14} />}
              >
                Edit Route
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteRouteOpen(true)}
                leftIcon={<Trash2 size={14} />}
                style={{ color: 'var(--color-danger, #DC2626)' }}
              >
                Delete
              </Button>
            </>
          )}
          {route.status !== 'COMPLETED' && route.status !== 'CANCELLED' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
              leftIcon={<XCircle size={14} />}
              style={{ color: 'var(--color-danger, #DC2626)' }}
            >
              Cancel Route
            </Button>
          )}
          {!route.driverId && route.status !== 'COMPLETED' && route.status !== 'CANCELLED' && (
            <Button
              variant={isDriversNotFound ? 'danger' : 'primary'}
              size="sm"
              onClick={handleForceDispatch}
              disabled={dispatching}
              leftIcon={<Radio size={14} />}
            >
              {dispatching
                ? 'Searching 10km...'
                : isDriversNotFound
                  ? 'Retry Search (10km)'
                  : 'Start Dispatch'}
            </Button>
          )}
        </div>
      </div>

      {/* ALERTS */}
      {isDriversNotFound && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>Drivers Not Found — Dispatch Window Exhausted</div>
              <div style={{ fontSize: '12px', marginTop: 2 }}>
                {route.dispatchFailureReason ||
                  `No driver accepted within 10 km after ${route.dispatchAttempts ?? 6} cron dispatch runs in the 30-minute search window.`}
              </div>
              <div style={{ fontSize: '11px', opacity: 0.85, marginTop: 2 }}>
                Search started: {formatIstDateTime(route.dispatchWindowStartedAt)} · Last attempt:{' '}
                {formatIstDateTime(route.lastDispatchAttemptAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {dispatchBanner && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-info-bg)',
            border: '1px solid var(--color-info-border)',
            color: 'var(--color-info)',
            fontSize: '13px',
          }}
        >
          {dispatchBanner}
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
            fontSize: '13px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* SECTION 1: TOP SUMMARY GRID (COMPANY DETAILS, TIMINGS & CRON WINDOWS, DRIVER INFO) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
        {/* Card 1: Company & Office */}
        <div
          style={{
            padding: '18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <Building2 size={15} /> Company Details
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {route.tenant?.name || 'Corporate Client'}
            {route.tenant?.code && (
              <span style={{ marginLeft: 8, fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                {route.tenant.code}
              </span>
            )}
          </div>
          {route.tenant?.legalEntityName && (
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{route.tenant.legalEntityName}</div>
          )}
          <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontSize: '12px' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Office: {route.office?.name || 'Primary Office Hub'}
            </div>
            <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{route.office?.addressText || '—'}</div>
          </div>
        </div>

        {/* Card 2: Route Timings & Cron Auto-Dispatch Schedule */}
        <div
          style={{
            padding: '18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <Clock size={15} /> Timings &amp; Autonomous Cron Windows
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Pickup #1 Time</div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                {formatIstTime(route.targetPickup1Time)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Office Arrival</div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                {formatIstTime(route.targetOfficeArrivalTime)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Cron Dispatch Window (30m)</div>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                {shiftMinutesIso(route.targetPickup1Time, -60)} → {shiftMinutesIso(route.targetPickup1Time, -30)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Driver Approach Buffer (30m)</div>
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                {shiftMinutesIso(route.targetPickup1Time, -30)} → {formatIstTime(route.targetPickup1Time)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
            <span>
              Distance: <strong>{directions?.totalDistanceKm ?? Number(((route.estDistanceMeters ?? 0) / 1000).toFixed(2))} km</strong>
            </span>
            <span>
              Drive + Wait: <strong>{directions?.totalDurationMinutes ?? Math.round((route.estDurationSeconds ?? 0) / 60)}m + {totalWaitMin}m</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Driver & Vehicle Assignment */}
        <div
          style={{
            padding: '18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <Car size={15} /> Assigned Driver &amp; Vehicle
          </div>
          {route.driver ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 700, color: 'var(--color-success, #10B981)' }}>
                <UserCheck size={18} />
                <span>{route.driver.fullName}</span>
              </div>
              {route.driver.phone && (
                <a
                  href={`tel:${route.driver.phone}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--brand-primary, #4F46E5)', textDecoration: 'none' }}
                >
                  <Phone size={13} /> {route.driver.phone}
                </a>
              )}
              <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Cab: <strong style={{ color: 'var(--text-primary)' }}>{route.vehicle?.registrationNumber || 'Pending Plate'}</strong>
                {route.vehicle?.model ? ` · ${route.vehicle.model}` : ''}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: isDriversNotFound ? 'var(--color-danger)' : 'var(--color-warning, #B45309)' }}>
                {isDriversNotFound
                  ? 'Drivers Not Found (10km)'
                  : route.dispatchStatus === 'SEARCHING'
                    ? 'Searching Nearby Drivers (10km)'
                    : route.dispatchStatus === 'RETRY_SCHEDULED'
                      ? 'Retry Scheduled (Next Run in 5m)'
                      : 'Awaiting Driver Assignment'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Autonomous search radius: <strong>10 km</strong> · Interval: <strong>5 min (max 6 runs)</strong>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Dispatch Runs Recorded: <strong>{route.dispatchAttempts ?? 0} / 6</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: TWO-COLUMN SPLIT — LEFT GOOGLE MAP + RIGHT REAL-TIME DIRECTIONS & EMPLOYEES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '18px', alignItems: 'start' }}>
        {/* LEFT PANE: INTERACTIVE GOOGLE MAPS ROUTE POLYLINE */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <Navigation size={16} /> Google Maps Route View
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: '999px',
                backgroundColor: directions?.isRealRoad ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                color: directions?.isRealRoad ? 'var(--color-success)' : 'var(--color-warning, #B45309)',
              }}
            >
              {directions?.isRealRoad ? 'Google Real-Time Traffic Active' : 'Estimated Road Path'}
            </span>
          </div>

          <GoogleRouteMap
            office={mapOffice}
            stops={mapStops}
            decodedPath={directions?.decodedPath}
            highlightedStopSequence={highlightedStop}
            onSelectStop={(seq) => setHighlightedStop(seq)}
            height={580}
          />
        </div>

        {/* RIGHT PANE: ORDERED PICKUP DIRECTIONS, LIVE TRAFFIC LEGS & EMPLOYEE PHONES */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              <Users size={16} /> Pickup Directions &amp; Employee Manifest
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {orderedStops.filter((s) => !(s.stopType === 'DROPOFF' && !s.employeeName && !s.employee)).length} Pickups · Wait ≤ 10m/stop
              </span>
              {route.status !== 'COMPLETED' && route.status !== 'CANCELLED' && (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Plus size={13} />}
                  onClick={() => setAddStopOpen(true)}
                >
                  Add Stop
                </Button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '580px', overflowY: 'auto', paddingRight: '4px' }}>
            {orderedStops.map((stop) => {
              const isOfficeDropoff = stop.stopType === 'DROPOFF' && !stop.employeeName && !stop.employee;
              const employeeName = isOfficeDropoff
                ? route.office?.name || 'Corporate Office Destination'
                : stop.employeeName || stop.employee?.fullName || `Stop #${stop.stopSequence}`;
              const employeePhone = stop.employeePhone || stop.employee?.phoneNumber;
              const employeeCode = stop.employee?.employeeCode;
              const dwellMinutes = Math.round((stop.dwellBufferSeconds ?? 600) / 60);
              const nextLeg = legByFromSeq.get(stop.stopSequence);
              const isHighlighted = highlightedStop === stop.stopSequence;

              return (
                <div key={stop.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    onClick={() => !isOfficeDropoff && setHighlightedStop(stop.stopSequence)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: isHighlighted
                        ? '2px solid var(--brand-primary, #4F46E5)'
                        : '1px solid var(--border-subtle)',
                      backgroundColor: isOfficeDropoff
                        ? 'rgba(5, 150, 105, 0.06)'
                        : isHighlighted
                          ? 'rgba(79, 70, 229, 0.06)'
                          : 'var(--bg-muted, rgba(148,163,184,0.05))',
                      cursor: isOfficeDropoff ? 'default' : 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            backgroundColor: isOfficeDropoff ? '#059669' : '#4F46E5',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {isOfficeDropoff ? 'HQ' : stop.stopSequence}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {employeeName}
                            {employeeCode && (
                              <span style={{ marginLeft: 8, fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {employeeCode}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>
                            <MapPin size={12} />
                            <span>{stop.addressText || 'Location unavailable'}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatIstTime(stop.plannedEta)}
                        </div>
                        {!isOfficeDropoff && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Wait: {dwellMinutes} min</div>
                        )}
                      </div>
                    </div>

                    {!isOfficeDropoff && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                        {employeePhone ? (
                          <a
                            href={`tel:${employeePhone}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: 'var(--brand-primary, #4F46E5)',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            <Phone size={12} /> {employeePhone}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={12} /> No phone number on file
                          </span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {stop.boardingOtp && (
                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                              OTP: {stop.boardingOtp}
                            </span>
                          )}
                          <StatusBadge status={stop.status} />
                          {route.status !== 'COMPLETED' && route.status !== 'CANCELLED' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditStop(stop);
                                }}
                                title="Edit stop"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 7px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-subtle)',
                                  backgroundColor: 'var(--bg-surface)',
                                  color: 'var(--text-secondary)',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <Pencil size={11} /> Edit
                              </button>
                              {stop.status !== 'BOARDED' && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRemovingStop(stop);
                                  }}
                                  title="Remove stop"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '3px 7px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--color-danger-border, rgba(220,38,38,0.3))',
                                    backgroundColor: 'transparent',
                                    color: 'var(--color-danger, #DC2626)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Trash2 size={11} /> Remove
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {nextLeg && (
                    <div
                      style={{
                        marginLeft: '18px',
                        paddingLeft: '14px',
                        borderLeft: '2px dashed var(--border-subtle)',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        paddingTop: '2px',
                        paddingBottom: '2px',
                      }}
                    >
                      <span>
                        Drive to <strong>{nextLeg.toLabel}</strong>: {nextLeg.distanceKm} km ·{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>{nextLeg.trafficDurationMinutes} min</strong>{' '}
                        {directions?.isRealRoad ? '(live traffic)' : '(est.)'}
                      </span>
                      {nextLeg.estimatedArrivalAtTo && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Est. next stop: {formatIstTime(nextLeg.estimatedArrivalAtTo)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Route & Stop Modals + Stop Overrides Drawer */}
      <StopItineraryDrawer
        route={route}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRouteUpdated={() => {
          void loadRoute();
        }}
      />

      <EditRouteModal
        route={route}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          setDispatchBanner('Route updated successfully.');
          void loadRoute();
        }}
      />

      <ReassignDriverModal
        route={route}
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        onSuccess={() => {
          setDispatchBanner('Driver reassignment requested.');
          void loadRoute();
        }}
      />

      <CancelRouteModal
        route={route}
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onSuccess={() => {
          setDispatchBanner('Route cancelled.');
          void loadRoute();
        }}
      />

      {/* Delete Route Confirmation Modal */}
      <Modal
        isOpen={deleteRouteOpen}
        onClose={() => setDeleteRouteOpen(false)}
        title="Delete Corporate Route"
        subtitle={`Route RT-${route.id.slice(0, 8).toUpperCase()}`}
        width="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Are you sure you want to permanently delete this route and its pending stops/transport requests? This cannot be undone.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="ghost" onClick={() => setDeleteRouteOpen(false)} disabled={deletingRoute}>
              Cancel
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

      {/* Add Employee Stop Modal */}
      <Modal
        isOpen={addStopOpen}
        onClose={() => setAddStopOpen(false)}
        title="Add Employee Stop"
        subtitle="Auto-registers employee and provisions commuter login account"
        width="480px"
      >
        <form onSubmit={handleAddStop} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={modalLabelStyle}>Employee Name *</label>
              <input
                type="text"
                required
                value={newStopForm.name}
                onChange={(e) => setNewStopForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                style={modalInputStyle}
              />
            </div>
            <div>
              <label style={modalLabelStyle}>Phone Number *</label>
              <input
                type="tel"
                required
                value={newStopForm.phoneNumber}
                onChange={(e) => setNewStopForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="+919876543210"
                style={modalInputStyle}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={modalLabelStyle}>Email (Optional)</label>
              <input
                type="email"
                value={newStopForm.email}
                onChange={(e) => setNewStopForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="employee@company.com"
                style={modalInputStyle}
              />
            </div>
            <div>
              <label style={modalLabelStyle}>Employee Code (Optional)</label>
              <input
                type="text"
                value={newStopForm.employeeCode}
                onChange={(e) => setNewStopForm((f) => ({ ...f, employeeCode: e.target.value }))}
                placeholder="EMP-101"
                style={modalInputStyle}
              />
            </div>
          </div>
          <div>
            <label style={modalLabelStyle}>Department (Optional)</label>
            <input
              type="text"
              value={newStopForm.department}
              onChange={(e) => setNewStopForm((f) => ({ ...f, department: e.target.value }))}
              placeholder="e.g. Engineering"
              style={modalInputStyle}
            />
          </div>
          <div>
            <label style={modalLabelStyle}>Pickup / Drop Address *</label>
            <input
              type="text"
              required
              value={newStopForm.address}
              onChange={(e) => setNewStopForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Full pickup/drop street address"
              style={modalInputStyle}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <Button type="button" variant="ghost" onClick={() => setAddStopOpen(false)} disabled={savingStop}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" leftIcon={<Plus size={14} />} isLoading={savingStop}>
              Add Stop
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Stop Modal */}
      <Modal
        isOpen={Boolean(editingStop)}
        onClose={() => setEditingStop(null)}
        title="Edit Employee Stop"
        subtitle={editingStop ? `Stop #${editingStop.stopSequence} · Updates stop & syncs employee contact` : undefined}
        width="460px"
      >
        <form onSubmit={handleUpdateStop} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={modalLabelStyle}>Employee Name</label>
            <input
              type="text"
              required
              value={editStopForm.name}
              onChange={(e) => setEditStopForm((f) => ({ ...f, name: e.target.value }))}
              style={modalInputStyle}
            />
          </div>
          <div>
            <label style={modalLabelStyle}>Phone Number</label>
            <input
              type="tel"
              required
              value={editStopForm.phoneNumber}
              onChange={(e) => setEditStopForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              style={modalInputStyle}
            />
          </div>
          <div>
            <label style={modalLabelStyle}>Address</label>
            <input
              type="text"
              required
              value={editStopForm.address}
              onChange={(e) => setEditStopForm((f) => ({ ...f, address: e.target.value }))}
              style={modalInputStyle}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <Button type="button" variant="ghost" onClick={() => setEditingStop(null)} disabled={savingStop}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={savingStop}>
              Save Stop
            </Button>
          </div>
        </form>
      </Modal>

      {/* Remove Stop Confirmation Modal */}
      <Modal
        isOpen={Boolean(removingStop)}
        onClose={() => setRemovingStop(null)}
        title="Remove Employee Stop"
        subtitle={removingStop ? `${removingStop.employeeName || removingStop.employee?.fullName || 'Stop #' + removingStop.stopSequence}` : undefined}
        width="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Remove this employee stop from the route? Remaining stops will automatically be re-sequenced.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button variant="ghost" onClick={() => setRemovingStop(null)} disabled={removingStopLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 size={14} />}
              isLoading={removingStopLoading}
              onClick={() => void handleConfirmRemoveStop()}
            >
              Remove Stop
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

