'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, MapPin, Navigation } from 'lucide-react';

export interface GoogleRouteMapStop {
  id?: string;
  stopSequence: number;
  stopType: string;
  employeeName?: string | null;
  employeePhone?: string | null;
  addressText?: string | null;
  lat: number;
  lng: number;
  plannedEta?: string | null;
  dwellBufferSeconds?: number | null;
  status?: string;
}

export interface GoogleRouteMapOffice {
  name: string;
  addressText?: string | null;
  lat: number;
  lng: number;
}

interface GoogleRouteMapProps {
  office: GoogleRouteMapOffice | null;
  stops: GoogleRouteMapStop[];
  decodedPath?: Array<{ lat: number; lng: number }>;
  highlightedStopSequence?: number | null;
  onSelectStop?: (stopSequence: number) => void;
  height?: number | string;
}

function formatIstTime(iso?: string | null): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);
}

export function GoogleRouteMap({
  office,
  stops,
  decodedPath,
  highlightedStopSequence,
  onSelectStop,
  height = 540,
}: GoogleRouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(
    apiKey ? null : 'Google Maps browser API key (NEXT_PUBLIC_GOOGLE_MAPS_KEY) is not configured.',
  );

  const validStops = useMemo(
    () =>
      [...stops]
        .filter((s) => Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng)))
        .sort((a, b) => a.stopSequence - b.stopSequence),
    [stops],
  );

  const pathPoints = useMemo(() => {
    if (decodedPath && decodedPath.length >= 2) {
      return decodedPath.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    }
    const pts = validStops.map((s) => ({ lat: Number(s.lat), lng: Number(s.lng) }));
    if (office && Number.isFinite(Number(office.lat)) && Number.isFinite(Number(office.lng))) {
      const last = pts[pts.length - 1];
      if (!last || Math.abs(last.lat - office.lat) > 0.0002 || Math.abs(last.lng - office.lng) > 0.0002) {
        pts.push({ lat: Number(office.lat), lng: Number(office.lng) });
      }
    }
    return pts;
  }, [decodedPath, validStops, office]);

  useEffect(() => {
    if (!apiKey) return;

    const existingMaps = (window as any).google?.maps;
    if (existingMaps && (typeof existingMaps.Map === 'function' || typeof existingMaps.importLibrary === 'function')) {
      setMapReady(true);
      setMapError(null);
      return;
    }

    const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement | null;
    if (existingScript) {
      const handleLoad = () => {
        setMapReady(true);
        setMapError(null);
      };
      const handleErr = () => setMapError('Failed to load Google Maps JavaScript SDK.');
      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleErr);
      return () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleErr);
      };
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry,marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setMapReady(true);
      setMapError(null);
    };
    script.onerror = () => {
      setMapError('Unable to reach Google Maps API. Verify browser key restrictions or network access.');
    };
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady || !containerRef.current) return;
    let cancelled = false;

    async function renderMap() {
      const google = (window as any).google;
      if (!google?.maps || !containerRef.current || cancelled) return;

      let MapConstructor = google.maps.Map;
      if (typeof MapConstructor !== 'function' && typeof google.maps.importLibrary === 'function') {
        try {
          const lib = await google.maps.importLibrary('maps');
          MapConstructor = lib.Map;
        } catch (err: any) {
          if (!cancelled) setMapError(err?.message || 'Unable to initialize Google Maps library.');
          return;
        }
      }
      if (typeof MapConstructor !== 'function' || cancelled) return;

      const defaultCenter =
        office && Number.isFinite(Number(office.lat))
          ? { lat: Number(office.lat), lng: Number(office.lng) }
          : validStops[0]
            ? { lat: Number(validStops[0].lat), lng: Number(validStops[0].lng) }
            : { lat: 17.4435, lng: 78.3772 };

      if (!mapRef.current) {
        mapRef.current = new MapConstructor(containerRef.current, {
          center: defaultCenter,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
      }

      // Clear previous markers & polyline
      for (const m of markersRef.current) m.setMap(null);
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      if (!infoWindowRef.current && google.maps.InfoWindow) {
        infoWindowRef.current = new google.maps.InfoWindow();
      }

      const bounds = new google.maps.LatLngBounds();

      // Draw actual road polyline
      if (pathPoints.length >= 2) {
        polylineRef.current = new google.maps.Polyline({
          path: pathPoints,
          geodesic: true,
          strokeColor: '#4F46E5',
          strokeOpacity: 0.92,
          strokeWeight: 5,
          map: mapRef.current,
        });
        for (const p of pathPoints) bounds.extend(p);
      }

      // Pickup / employee markers
      for (const stop of validStops) {
        const isOfficeStop = stop.stopType === 'DROPOFF' && !stop.employeeName;
        if (isOfficeStop) continue;

        const pos = { lat: Number(stop.lat), lng: Number(stop.lng) };
        bounds.extend(pos);
        const isHighlighted = highlightedStopSequence === stop.stopSequence;
        const isBoarded = stop.status === 'BOARDED' || stop.status === 'COMPLETED';

        const marker = new google.maps.Marker({
          position: pos,
          map: mapRef.current,
          label: {
            text: String(stop.stopSequence),
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '12px',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isHighlighted ? 14 : 11,
            fillColor: isBoarded ? '#10B981' : isHighlighted ? '#F59E0B' : '#4F46E5',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
          title: `${stop.stopSequence}. ${stop.employeeName || 'Pickup Stop'}`,
          zIndex: isHighlighted ? 200 : 100 + stop.stopSequence,
        });

        marker.addListener('click', () => {
          onSelectStop?.(stop.stopSequence);
          if (infoWindowRef.current) {
            const dwellMin = Math.round((stop.dwellBufferSeconds ?? 600) / 60);
            infoWindowRef.current.setContent(
              `<div style="font-family:system-ui,sans-serif;min-width:190px;padding:4px 2px;color:#0f172a">
                <div style="font-weight:700;font-size:13px;margin-bottom:4px">Stop #${stop.stopSequence}: ${stop.employeeName || 'Employee'}</div>
                ${stop.employeePhone ? `<div style="font-size:12px;margin-bottom:3px">Phone: <strong>${stop.employeePhone}</strong></div>` : ''}
                <div style="font-size:12px;color:#475569;margin-bottom:4px">${stop.addressText || 'Pickup point'}</div>
                <div style="font-size:11px;color:#64748b">ETA: ${formatIstTime(stop.plannedEta)} IST · Wait: ${dwellMin} min</div>
              </div>`,
            );
            infoWindowRef.current.open(mapRef.current, marker);
          }
        });

        markersRef.current.push(marker);
      }

      // Office Hub marker
      if (office && Number.isFinite(Number(office.lat)) && Number.isFinite(Number(office.lng))) {
        const officePos = { lat: Number(office.lat), lng: Number(office.lng) };
        bounds.extend(officePos);
        const officeMarker = new google.maps.Marker({
          position: officePos,
          map: mapRef.current,
          label: {
            text: 'HQ',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '10px',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: '#059669',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2.5,
          },
          title: `Office: ${office.name}`,
          zIndex: 180,
        });
        officeMarker.addListener('click', () => {
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(
              `<div style="font-family:system-ui,sans-serif;min-width:180px;padding:4px 2px;color:#0f172a">
                <div style="font-weight:700;font-size:13px;color:#059669">Destination Office</div>
                <div style="font-weight:600;font-size:12px">${office.name}</div>
                <div style="font-size:11px;color:#475569;margin-top:2px">${office.addressText || ''}</div>
              </div>`,
            );
            infoWindowRef.current.open(mapRef.current, officeMarker);
          }
        });
        markersRef.current.push(officeMarker);
      }

      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, { top: 44, right: 44, bottom: 44, left: 44 });
      }
    }

    void renderMap();
    return () => {
      cancelled = true;
    };
  }, [mapReady, pathPoints, validStops, office, highlightedStopSequence, onSelectStop]);

  if (mapError) {
    return (
      <div
        style={{
          height,
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-warning, #B45309)' }}>
          <AlertTriangle size={18} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>Interactive Google Map Unavailable</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>{mapError}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', marginTop: '12px' }}>
          {validStops.map((s) => (
            <div
              key={`${s.stopSequence}-${s.id || s.lat}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-muted, rgba(148,163,184,0.08))',
                fontSize: '12px',
              }}
            >
              <MapPin size={14} />
              <span style={{ fontWeight: 600 }}>#{s.stopSequence} {s.employeeName || s.stopType}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontFamily: 'monospace' }}>
                {Number(s.lat).toFixed(4)}, {Number(s.lng).toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', height, borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          color: '#FFFFFF',
          padding: '6px 10px',
          borderRadius: '8px',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backdropFilter: 'blur(4px)',
        }}
      >
        <Navigation size={12} />
        <span>
          {decodedPath && decodedPath.length >= 2 ? 'Google Maps Live Traffic Road Path' : 'Planned Stop Waypoints'} ·{' '}
          {validStops.filter((s) => !(s.stopType === 'DROPOFF' && !s.employeeName)).length} Pickups → Office
        </span>
      </div>
    </div>
  );
}
