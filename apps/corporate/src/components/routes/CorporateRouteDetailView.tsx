'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Car,
  Clock,
  MapPin,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  Users,
} from 'lucide-react';
import { routesApi } from '../../lib/api/corporate';
import type { RouteDetail, RouteDirectionsResult, RouteStop } from '../../lib/api/types';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { GoogleRouteMap, GoogleRouteMapStop } from '../maps/GoogleRouteMap';

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

function shiftMinutesIso(iso: string | undefined | null, deltaMinutes: number): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return formatIstTime(new Date(d.getTime() + deltaMinutes * 60_000).toISOString());
}

export function CorporateRouteDetailView({ routeId }: { routeId: string }) {
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [directions, setDirections] = useState<RouteDirectionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingTraffic, setRefreshingTraffic] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [highlightedStop, setHighlightedStop] = useState<number | null>(null);

  const loadRoute = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await routesApi.get(routeId);
      setRoute(data);
      if (data.directions) {
        setDirections(data.directions);
      } else {
        const dir = await routesApi.directions(routeId, false).catch(() => null);
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
    if (!routeId) return;
    setRefreshingTraffic(true);
    try {
      const fresh = await routesApi.directions(routeId, true);
      setDirections(fresh);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not refresh Google Maps traffic.');
    } finally {
      setRefreshingTraffic(false);
    }
  }

  const orderedStops: RouteStop[] = useMemo(() => {
    if (!route?.stops) return [];
    return [...route.stops].sort((a, b) => a.stopSequence - b.stopSequence);
  }, [route?.stops]);

  const mapStops: GoogleRouteMapStop[] = useMemo(
    () =>
      orderedStops.map((s) => ({
        id: s.id,
        stopSequence: s.stopSequence,
        stopType: s.stopType,
        employeeName: s.employeeName || s.employee?.fullName || null,
        employeePhone: s.employeePhone || s.employee?.phoneNumber || null,
        addressText: s.addressText || s.address || s.locationName || null,
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        plannedEta: s.plannedEta,
        dwellBufferSeconds: s.dwellBufferSeconds ?? null,
        status: s.status,
      })),
    [orderedStops],
  );

  const legByFromStopId = useMemo(() => {
    const map = new Map<string, RouteDirectionsResult['legs'][number]>();
    if (directions?.legs) {
      for (const leg of directions.legs) {
        map.set(leg.fromStopId, leg);
      }
    }
    return map;
  }, [directions?.legs]);

  if (loading) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: 'center',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 12,
          border: '1px solid var(--border-subtle)',
        }}
      >
        Loading route manifest and Google Maps live traffic directions...
      </div>
    );
  }

  if (errorMsg || !route) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Link href="/routes" style={{ textDecoration: 'none' }}>
          <Button variant="secondary" leftIcon={<ArrowLeft size={15} />}>
            Back to Routes
          </Button>
        </Link>
        <div
          style={{
            padding: 24,
            borderRadius: 12,
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.35)',
            color: '#DC2626',
            fontSize: 14,
          }}
        >
          {errorMsg || 'Route not found or unavailable for your company account.'}
        </div>
      </div>
    );
  }

  const dispatchStatus =
    route.dispatchStatus ||
    (route.driverId || route.status === 'ASSIGNED' || route.status === 'IN_TRANSIT' || route.status === 'COMPLETED'
      ? 'DRIVER_ASSIGNED'
      : 'PENDING');
  const driversNotFound = dispatchStatus === 'NO_DRIVERS_FOUND';

  const totalDriveMin =
    directions?.totalDurationMinutes ??
    (route.estDurationSeconds ? Math.round(route.estDurationSeconds / 60) : 0);
  const totalDistanceKm =
    directions?.totalDistanceKm ??
    (route.estDistanceMeters ? Number((route.estDistanceMeters / 1000).toFixed(2)) : 0);
  const totalDwellMin = directions ? Math.round(directions.totalDwellSeconds / 60) : orderedStops.length * 10;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1440, margin: '0 auto' }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/routes" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />}>
              All Company Routes
            </Button>
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                {route.tenant?.name || 'Corporate Route'} — #{route.id.slice(0, 8)}
              </h1>
              <StatusBadge status={route.status} />
              <StatusBadge
                status={dispatchStatus}
                label={driversNotFound ? 'Drivers Not Found' : dispatchStatus}
              />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
              {route.shiftDate} • {route.shiftTime} IST • {route.direction} • {route.vehicleCategory} (
              {route.assignedPassengerCount}/{route.maxCapacity} seats)
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          leftIcon={<RefreshCw size={14} />}
          onClick={() => void handleRefreshTraffic()}
          disabled={refreshingTraffic}
        >
          {refreshingTraffic ? 'Refreshing Traffic...' : 'Refresh Live Traffic'}
        </Button>
      </div>

      {/* SECTION 1 (Top Summary): Company, Route Timings, Autonomous Dispatch Status & Driver Info */}
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {driversNotFound && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              backgroundColor: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid rgba(220, 38, 38, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#DC2626',
            }}
          >
            <AlertTriangle size={18} />
            <div>
              <strong style={{ fontSize: 13 }}>Drivers not found for this route</strong>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 2 }}>
                {route.dispatchFailureReason ||
                  `AdhocX Ops dispatched across ${route.dispatchAttempts ?? 6} runs within 10km during the 30-minute search window with no driver acceptance. Operations team has been notified for manual allocation.`}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {/* Company & Office */}
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              <Building2 size={14} /> Company &amp; Campus
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
              {route.tenant?.name || 'Corporate Account'}{' '}
              {route.tenant?.code ? `(${route.tenant.code})` : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {route.office?.name || 'Corporate Campus'}
            </div>
            {route.office?.addressText && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                {route.office.addressText}
              </div>
            )}
          </div>

          {/* Timings & Live Traffic ETA */}
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              <Clock size={14} /> Schedule &amp; Live Traffic ETA
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
              {formatIstTime(route.targetPickup1Time)} → {formatIstTime(route.targetOfficeArrivalTime)} IST
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Drive {totalDriveMin} min • Wait {totalDwellMin} min • {totalDistanceKm} km
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              Source:{' '}
              {directions?.trafficSource === 'GOOGLE_MAPS_LIVE_TRAFFIC'
                ? 'Google Maps Live Traffic'
                : 'Road Traffic Estimate'}
            </div>
          </div>

          {/* Cron Dispatch Windows */}
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              <Radio size={14} /> Automated Dispatch Window
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
              Search (30m): {shiftMinutesIso(route.targetPickup1Time, -60)} →{' '}
              {shiftMinutesIso(route.targetPickup1Time, -30)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Driver approach buffer: {shiftMinutesIso(route.targetPickup1Time, -30)} →{' '}
              {formatIstTime(route.targetPickup1Time)} (10km radius)
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
              Retry cadence: Every 5 min (max 6 runs) • Attempts: {route.dispatchAttempts ?? 0}
              {route.lastDispatchAttemptAt ? ` • Last: ${formatIstDateTime(route.lastDispatchAttemptAt)}` : ''}
            </div>
          </div>

          {/* Assigned Cab & Driver */}
          <div
            style={{
              padding: 14,
              borderRadius: 10,
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              <Car size={14} /> Assigned Cab &amp; Driver
            </div>
            {route.driver ? (
              <>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#15803D', marginTop: 6 }}>
                  {route.driver.fullName || route.driver.name || 'Assigned Driver'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 4 }}>
                  {route.vehicle
                    ? `${route.vehicle.registrationNumber} • ${route.vehicle.model || route.vehicleCategory}`
                    : `${route.vehicleCategory} assigned`}
                </div>
                {route.driver.phone && (
                  <a
                    href={`tel:${route.driver.phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 12,
                      color: 'var(--brand-primary, #5728B2)',
                      marginTop: 4,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    <Phone size={12} /> {route.driver.phone}
                  </a>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: driversNotFound ? '#DC2626' : '#B45309', marginTop: 6 }}>
                  {driversNotFound
                    ? 'Drivers Not Found'
                    : dispatchStatus === 'SEARCHING'
                      ? 'Searching Drivers Nearby'
                      : dispatchStatus === 'RETRY_SCHEDULED'
                        ? 'Retry Scheduled (Every 5m)'
                        : 'Pending Driver Acceptance'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {driversNotFound
                    ? 'Ops escalation raised automatically.'
                    : dispatchStatus === 'RETRY_SCHEDULED'
                      ? 'Waiting 5 min before next 10km search run.'
                      : 'Cron scans within 10km starting T-60m.'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2 (Split Section): Left = Google Map, Right = Ordered Pickup Directions & Employees */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {/* LEFT PANE: Google Maps Actual Route & Pickup Pins */}
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                Route Map (Google Maps)
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Numbered employee pickup stops, road path, and office campus destination
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 999,
                backgroundColor: directions?.isRealRoad ? 'rgba(22, 163, 74, 0.14)' : 'rgba(217, 119, 6, 0.14)',
                color: directions?.isRealRoad ? '#15803D' : '#B45309',
              }}
            >
              {directions?.isRealRoad ? 'Live Google Roads' : 'Route Fallback'}
            </span>
          </div>

          <GoogleRouteMap
            office={
              route.office && route.office.latitude != null && route.office.longitude != null
                ? {
                    name: route.office.name,
                    addressText: route.office.addressText,
                    lat: Number(route.office.latitude),
                    lng: Number(route.office.longitude),
                  }
                : null
            }
            stops={mapStops}
            decodedPath={directions?.decodedPath}
            highlightedStopSequence={highlightedStop}
            onSelectStop={(seq) => setHighlightedStop(seq)}
            height={520}
          />
        </div>

        {/* RIGHT PANE: Ordered Pickup Directions & Passenger Contacts */}
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                Pickup Directions &amp; Employee Manifest
              </h2>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Real-time leg travel durations and up to 10-minute wait buffer per stop
              </div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              <Users size={14} /> {orderedStops.length} Stops
            </span>
          </div>

          {orderedStops.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              No stops attached to this route yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {orderedStops.map((stop, idx) => {
                const leg = legByFromStopId.get(stop.id) || directions?.legs?.[idx];
                const isHighlighted = highlightedStop === stop.stopSequence;
                const dwellMin = Math.round((stop.dwellBufferSeconds ?? leg?.dwellBufferSeconds ?? 600) / 60);
                const empName = stop.employeeName || stop.employee?.fullName || `Stop #${stop.stopSequence}`;
                const empPhone = stop.employeePhone || stop.employee?.phoneNumber;
                const empCode = stop.employee?.employeeCode;
                const address = stop.addressText || stop.address || stop.locationName || 'Pickup Coordinates';

                return (
                  <div
                    key={stop.id}
                    onClick={() => setHighlightedStop(stop.stopSequence)}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border: isHighlighted
                        ? '1px solid var(--brand-primary, #5728B2)'
                        : '1px solid var(--border-subtle)',
                      backgroundColor: isHighlighted
                        ? 'var(--brand-primary-subtle, rgba(87, 40, 178, 0.08))'
                        : 'var(--bg-surface-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            backgroundColor: 'var(--brand-primary, #5728B2)',
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {stop.stopSequence}
                        </span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {empName}{' '}
                            {empCode && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                                ({empCode})
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {stop.stopType} • ETA {formatIstTime(stop.plannedEta)} • Wait {dwellMin}m (max 10m)
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={stop.status} size="sm" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <MapPin size={13} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{address}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      {empPhone ? (
                        <a
                          href={`tel:${empPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--brand-primary, #5728B2)',
                            textDecoration: 'none',
                          }}
                        >
                          <Phone size={12} /> {empPhone}
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phone not listed</span>
                      )}
                      {stop.employee?.department && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Dept: {stop.employee.department}
                        </span>
                      )}
                    </div>

                    {leg && (
                      <div
                        style={{
                          marginTop: 2,
                          padding: '8px 10px',
                          borderRadius: 8,
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px dashed var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', fontWeight: 600 }}>
                          <Navigation size={13} color="#5728B2" />
                          Next → {leg.toLabel}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {leg.trafficDurationMinutes} min • {leg.distanceKm} km
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {route.direction === 'LOGIN' && route.office && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: 'rgba(21, 128, 61, 0.08)',
                    border: '1px solid rgba(21, 128, 61, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building2 size={16} color="#15803D" />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>
                        Destination: {route.office.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {route.office.addressText || 'Office Campus Dropoff'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D' }}>
                    {formatIstTime(route.targetOfficeArrivalTime)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

