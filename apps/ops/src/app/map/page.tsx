'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateRouteItem, RouteWaypointsResponse } from '../../lib/api/opsTypes';
import { Button } from '../../components/common/Button';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Car, Compass, Phone, Radio, RefreshCw } from 'lucide-react';

declare global {
  interface Window {
    google?: any;
    __adhocxLiveMapsReady?: () => void;
  }
}

const HYDERABAD_CENTER = { lat: 17.4435, lng: 78.3772 };
let mapsLoading: Promise<void> | null = null;

function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (mapsLoading) return mapsLoading;

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) return Promise.reject(new Error('Set NEXT_PUBLIC_GOOGLE_MAPS_KEY to enable Google Maps.'));

  mapsLoading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'adhocx-ops-live-google-maps';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=__adhocxLiveMapsReady&loading=async&v=weekly`;
    script.async = true;
    script.onerror = () => {
      mapsLoading = null;
      reject(new Error('Google Maps failed to load. Check the browser key and Maps JavaScript API settings.'));
    };
    window.__adhocxLiveMapsReady = () => resolve();
    document.head.appendChild(script);
  });

  return mapsLoading;
}

function FleetGoogleMap({
  routes,
  selectedRoute,
  onSelectRoute,
}: {
  routes: CorporateRouteItem[];
  selectedRoute: CorporateRouteItem | null;
  onSelectRoute: (route: CorporateRouteItem) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const directionsRendererRef = useRef<any>(null);
  const [mapError, setMapError] = useState('');
  const [waypoints, setWaypoints] = useState<RouteWaypointsResponse | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadGoogleMaps()
      .then(() => {
        if (!active || !containerRef.current || mapRef.current) return;
        const google = window.google;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: HYDERABAD_CENTER,
          zoom: 11,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map: mapRef.current,
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: { strokeColor: '#5728B2', strokeOpacity: 0.85, strokeWeight: 5 },
        });
        setMapReady(true);
      })
      .catch((error: Error) => {
        if (active) setMapError(error.message);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const google = window.google;
    const bounds = new google.maps.LatLngBounds();
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    routes.forEach((route) => {
      const gps = route.gps;
      if (!gps || !Number.isFinite(gps.latitude) || !Number.isFinite(gps.longitude)) return;
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: { lat: gps.latitude, lng: gps.longitude },
        title: `${route.driver?.fullName || `RT-${route.id.slice(0, 6)}`} · ${gps.freshness}`,
        label: { text: '●', color: gps.freshness === 'LIVE' ? '#16A34A' : '#DC2626', fontSize: '18px' },
        zIndex: selectedRoute?.id === route.id ? 2 : 1,
      });
      marker.addListener('click', () => onSelectRoute(route));
      markersRef.current.push(marker);
      bounds.extend(marker.getPosition());
    });

    if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds, 64);
  }, [mapReady, routes, selectedRoute?.id, onSelectRoute]);

  useEffect(() => {
    let active = true;
    setWaypoints(null);
    setMapError('');
    if (!mapReady || !selectedRoute || !mapRef.current || !window.google?.maps) {
      directionsRendererRef.current?.setDirections({ routes: [] });
      return;
    }

    opsApi
      .getRouteWaypoints(selectedRoute.id)
      .then((result) => {
        if (active) setWaypoints(result);
      })
      .catch((error: Error) => {
        if (active) setMapError(`Unable to load route stops: ${error.message}`);
      });

    return () => {
      active = false;
    };
  }, [mapReady, selectedRoute?.id]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps || !selectedRoute || !waypoints) return;
    const stops = waypoints.stops
      .filter((stop) => stop.status !== 'BOARDED' && stop.status !== 'NO_SHOW' && stop.status !== 'CANCELLED')
      .sort((a, b) => a.stopSequence - b.stopSequence);
    if (stops.length === 0) {
      directionsRendererRef.current?.setDirections({ routes: [] });
      return;
    }

    const office = { lat: waypoints.officeHub.latitude, lng: waypoints.officeHub.longitude };
    const stopPositions = stops.map((stop) => ({ lat: stop.latitude, lng: stop.longitude }));
    const isLogin = waypoints.direction === 'LOGIN';
    const origin = isLogin ? stopPositions[0] : office;
    const destination = isLogin ? office : stopPositions[stopPositions.length - 1];
    const middleStops = isLogin ? stopPositions.slice(1) : stopPositions.slice(0, -1);
    if (middleStops.length > 23) {
      setMapError('This route has too many stops to display as a single Google driving route.');
      return;
    }

    setMapError('');
    new window.google.maps.DirectionsService().route(
      {
        origin,
        destination,
        waypoints: middleStops.map((location: any) => ({ location, stopover: true })),
        optimizeWaypoints: false,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: string) => {
        if (status === 'OK' && result) directionsRendererRef.current?.setDirections(result);
        else setMapError(`Google Maps could not calculate this route (${status}).`);
      },
    );
  }, [mapReady, selectedRoute?.id, waypoints]);

  return (
    <div
      style={{
        flex: 1,
        minHeight: '360px',
        backgroundColor: 'var(--bg-surface-muted)',
        borderRadius: 'var(--radius-lg, 10px)',
        border: '1px solid var(--border-subtle)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '360px' }} />
      {mapError && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'var(--bg-surface)',
            border: '1px solid var(--color-danger, #DC2626)',
            color: 'var(--text-primary)',
            fontSize: 12,
          }}
        >
          {mapError}
        </div>
      )}
      {!mapError && !routes.some((route) => route.gps) && (
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 12,
            padding: '8px 10px',
            borderRadius: 8,
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            fontSize: 12,
          }}
        >
          Waiting for live GPS positions.
        </div>
      )}
    </div>
  );
}

export default function FleetLiveMapPage() {
  const [routes, setRoutes] = useState<CorporateRouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<CorporateRouteItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(todayIst());
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    void loadMapData();
    const interval = setInterval(() => void loadMapData(), 10000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  async function loadMapData() {
    try {
      const board = await opsApi.getOpsBoard({ date: selectedDate });
      const active = (board.routes || []).filter(
        (route) => route.status === 'IN_TRANSIT' || route.status === 'ASSIGNED' || route.status === 'DISPATCHING',
      );
      setRoutes(active);
      setSelectedRoute((current) => active.find((route) => route.id === current?.id) || null);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load fleet routes.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadMapData();
    setRefreshing(false);
  }

  const gpsRoutes = routes.filter(
    (route) =>
      route.gps &&
      typeof route.gps.latitude === 'number' &&
      typeof route.gps.longitude === 'number' &&
      Number.isFinite(route.gps.latitude) &&
      Number.isFinite(route.gps.longitude),
  );
  const selectRoute = useCallback((route: CorporateRouteItem) => setSelectedRoute(route), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 104px)', gap: '16px' }}>
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
            <span>{gpsRoutes.length} GPS Transponders</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Live vehicle positions and Google road routes
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            style={{
              height: '32px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '0 8px',
              color: 'var(--text-primary)',
              fontSize: '12px',
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

      {loadError && <div role="alert" style={{ color: 'var(--color-danger, #DC2626)', fontSize: 13 }}>{loadError}</div>}

      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden', minHeight: 0 }}>
        <FleetGoogleMap routes={routes} selectedRoute={selectedRoute} onSelectRoute={selectRoute} />
        <aside
          style={{
            width: '320px',
            flexShrink: 0,
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg, 10px)',
            border: '1px solid var(--border-subtle)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {selectedRoute ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="code-tag">RT-{selectedRoute.id.slice(0, 8).toUpperCase()}</span>
                <StatusBadge status={selectedRoute.status} size="sm" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedRoute.driver?.fullName || 'Unassigned Driver'}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {selectedRoute.vehicle?.model || 'Vehicle'} · {selectedRoute.vehicle?.registrationNumber || 'No registration'}
              </p>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div>Shift: {selectedRoute.shiftTime} ({selectedRoute.direction})</div>
                <div>Occupancy: {selectedRoute.assignedPassengerCount} / {selectedRoute.maxCapacity}</div>
                <div>Destination: {selectedRoute.office?.name || 'Office hub'}</div>
                <div>
                  GPS: {selectedRoute.gps &&
                  typeof selectedRoute.gps.latitude === 'number' &&
                  typeof selectedRoute.gps.longitude === 'number' &&
                  Number.isFinite(selectedRoute.gps.latitude) &&
                  Number.isFinite(selectedRoute.gps.longitude)
                    ? `${selectedRoute.gps.latitude.toFixed(5)}, ${selectedRoute.gps.longitude.toFixed(5)} · ${selectedRoute.gps.freshness}`
                    : 'No position received'}
                </div>
              </div>
              {selectedRoute.driver?.phone && (
                <a
                  href={`tel:${selectedRoute.driver.phone}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md, 8px)',
                    backgroundColor: 'var(--brand-primary-subtle)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--brand-blue-500, #5728B2)',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <Phone size={14} /> Call Driver
                </a>
              )}
              <Button size="sm" variant="outline" onClick={() => setSelectedRoute(null)}>
                Close Telemetry
              </Button>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Compass size={20} color="var(--brand-blue-500, #5728B2)" />
                <strong style={{ color: 'var(--text-primary)' }}>Fleet Routes</strong>
              </div>
              {loading ? (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading routes…</span>
              ) : routes.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active routes for this date.</span>
              ) : (
                routes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => selectRoute(route)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <Car size={16} />
                    <span style={{ minWidth: 0, flex: 1, fontSize: 12 }}>
                      {route.driver?.fullName || `RT-${route.id.slice(0, 6)}`}
                      <small style={{ display: 'block', color: 'var(--text-muted)' }}>
                        {route.gps ? `GPS ${route.gps.freshness.toLowerCase()}` : route.status}
                      </small>
                    </span>
                    <StatusBadge status={route.status} size="sm" />
                  </button>
                ))
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
