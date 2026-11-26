'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RouteOption, TestEmployee } from '../types';
import { ExternalLink, Navigation, Compass, Layers, AlertCircle, RefreshCw } from 'lucide-react';

interface TestRouteMapProps {
  passengers: TestEmployee[];
  officeLat: number;
  officeLng: number;
  officeAddress: string;
  activeRoute: RouteOption;
  routeOptions?: RouteOption[];
  onSelectRouteOption?: (index: number) => void;
  cabTitle: string;
  routeColor?: string;
}

export const TestRouteMap: React.FC<TestRouteMapProps> = ({
  passengers,
  officeLat,
  officeLng,
  officeAddress,
  activeRoute,
  routeOptions,
  onSelectRouteOption,
  cabTitle,
  routeColor = '#5728B2',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [googleMapLoaded, setGoogleMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [useSvgFallback, setUseSvgFallback] = useState(false);
  const googleMapInstance = useRef<any>(null);
  const activePolylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
    '';

  // 1. Load Google Maps Script with Fallback timer
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if google maps is already loaded on window
    if ((window as any).google?.maps) {
      setGoogleMapLoaded(true);
      return;
    }

    let isMounted = true;

    // Timeout: if Google Maps hasn't loaded within 3 seconds, allow SVG radar fallback
    const fallbackTimer = setTimeout(() => {
      if (isMounted && !(window as any).google?.maps) {
        setUseSvgFallback(true);
      }
    }, 3000);

    // Look for existing script tag
    const existingScript = (document.getElementById('google-maps-script') ||
      document.getElementById('google-maps-test-script')) as HTMLScriptElement | null;

    if (existingScript) {
      if ((window as any).google?.maps) {
        setGoogleMapLoaded(true);
        clearTimeout(fallbackTimer);
      } else {
        existingScript.addEventListener(
          'load',
          () => {
            if (isMounted) {
              setGoogleMapLoaded(true);
              setUseSvgFallback(false);
              clearTimeout(fallbackTimer);
            }
          },
          { once: true },
        );
        existingScript.addEventListener('error', () => {
          if (isMounted) {
            setMapError(true);
            setUseSvgFallback(true);
          }
        });
      }
      return () => {
        isMounted = false;
        clearTimeout(fallbackTimer);
      };
    }

    // Inject Google Maps script
    const script = document.createElement('script');
    script.id = 'google-maps-test-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (isMounted) {
        setGoogleMapLoaded(true);
        setUseSvgFallback(false);
        clearTimeout(fallbackTimer);
      }
    };
    script.onerror = () => {
      if (isMounted) {
        setMapError(true);
        setUseSvgFallback(true);
      }
    };
    document.head.appendChild(script);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
  }, [apiKey]);

  // 2. Render / Update Google Map
  useEffect(() => {
    if (!googleMapLoaded || !mapContainerRef.current || useSvgFallback) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    try {
      // Initialize Map
      if (!googleMapInstance.current) {
        googleMapInstance.current = new google.maps.Map(mapContainerRef.current, {
          center: { lat: officeLat || 17.4414, lng: officeLng || 78.3809 },
          zoom: 12,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          ],
        });
      }

      const map = googleMapInstance.current;

      // Clear existing markers & polyline
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (activePolylineRef.current) {
        activePolylineRef.current.setMap(null);
      }

      const bounds = new google.maps.LatLngBounds();

      // Plot pickup stop markers (Numbered 1..N)
      passengers.forEach((p, idx) => {
        const pos = { lat: p.lat, lng: p.lng };
        bounds.extend(pos);

        const marker = new google.maps.Marker({
          position: pos,
          map,
          title: `Stop ${idx + 1}: ${p.name}`,
          label: {
            text: String(idx + 1),
            color: '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '12px',
          },
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 15,
            fillColor: idx === 0 ? routeColor : '#059669',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 6px; font-family: sans-serif; font-size: 13px; color: #1e293b;">
              <div style="font-weight: 700; color: #4338ca; margin-bottom: 2px;">
                Stop #${idx + 1}: ${p.name} (${p.gender})
              </div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">📞 ${p.phone}</div>
              <div style="font-size: 12px; max-width: 220px; color: #334155;">${p.pickupAddress}</div>
              <div style="margin-top: 6px; font-weight: 600; color: #047857; font-size: 11px;">
                ⏱ Estimated Pickup: ${p.estimatedPickupTime || '07:15 AM'}
              </div>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      });

      // Plot Destination Office Marker
      const officePos = { lat: officeLat, lng: officeLng };
      bounds.extend(officePos);

      const officeMarker = new google.maps.Marker({
        position: officePos,
        map,
        title: `Office: ${officeAddress}`,
        label: {
          text: '🏢',
          fontSize: '14px',
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 16,
          fillColor: '#DC2626',
          fillOpacity: 0.95,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        },
      });

      const officeInfo = new google.maps.InfoWindow({
        content: `
          <div style="padding: 6px; font-family: sans-serif; font-size: 13px;">
            <div style="font-weight: 800; color: #b91c1c;">🏢 Destination Office</div>
            <div style="font-size: 12px; color: #334155; margin-top: 2px;">${officeAddress}</div>
            <div style="color: #047857; font-weight: 600; font-size: 11px; margin-top: 4px;">
              Target Shift Arrival: 08:00 AM
            </div>
          </div>
        `,
      });
      officeMarker.addListener('click', () => officeInfo.open(map, officeMarker));
      markersRef.current.push(officeMarker);

      // Plot active route polyline
      if (activeRoute.decodedPath && activeRoute.decodedPath.length > 0) {
        const pathCoords = activeRoute.decodedPath.map(([lat, lng]) => ({ lat, lng }));
        pathCoords.forEach((pt) => bounds.extend(pt));

        activePolylineRef.current = new google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: routeColor,
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map,
        });
      }

      // Trigger bounds fit and resize
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
      setTimeout(() => {
        if (googleMapInstance.current) {
          google.maps.event.trigger(googleMapInstance.current, 'resize');
          googleMapInstance.current.fitBounds(bounds);
        }
      }, 100);
    } catch (err) {
      console.warn('[Google Maps Render Error]:', err);
      setUseSvgFallback(true);
    }
  }, [googleMapLoaded, passengers, officeLat, officeLng, officeAddress, activeRoute, routeColor, useSvgFallback]);

  // SVG Fallback Projection Calculation
  const allCoords = [
    { lat: officeLat, lng: officeLng },
    ...passengers.map((p) => ({ lat: p.lat, lng: p.lng })),
  ];
  if (activeRoute?.decodedPath) {
    activeRoute.decodedPath.forEach(([lat, lng]) => allCoords.push({ lat, lng }));
  }

  const minLat = Math.min(...allCoords.map((c) => c.lat));
  const maxLat = Math.max(...allCoords.map((c) => c.lat));
  const minLng = Math.min(...allCoords.map((c) => c.lng));
  const maxLng = Math.max(...allCoords.map((c) => c.lng));

  const latSpan = Math.max(maxLat - minLat, 0.05) * 1.2;
  const lngSpan = Math.max(maxLng - minLng, 0.05) * 1.2;
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;

  const adjMinLat = midLat - latSpan / 2;
  const adjMaxLat = midLat + latSpan / 2;
  const adjMinLng = midLng - lngSpan / 2;
  const adjMaxLng = midLng + lngSpan / 2;

  const SVG_W = 800;
  const SVG_H = 500;
  const PADDING = 50;

  const projectToSvg = (lat: number, lng: number) => {
    const x = PADDING + ((lng - adjMinLng) / (adjMaxLng - adjMinLng)) * (SVG_W - 2 * PADDING);
    const y = SVG_H - PADDING - ((lat - adjMinLat) / (adjMaxLat - adjMinLat)) * (SVG_H - 2 * PADDING);
    return { x, y };
  };

  const svgOffice = projectToSvg(officeLat, officeLng);
  const svgStops = passengers.map((p) => ({
    ...p,
    ...projectToSvg(p.lat, p.lng),
  }));

  const svgPolylinePoints = (activeRoute.decodedPath && activeRoute.decodedPath.length > 0
    ? activeRoute.decodedPath.map(([lat, lng]) => projectToSvg(lat, lng))
    : [...svgStops, svgOffice]
  )
    .map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg, 10px)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      {/* Top Map Header & Live Verification Actions */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--brand-primary-subtle)',
              color: routeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Navigation size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {cabTitle}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(87, 40, 178, 0.1)',
                  color: routeColor,
                }}
              >
                {passengers.length} Stops
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>
                Active: <strong>{activeRoute.title}</strong> ({activeRoute.formattedDistance} · {activeRoute.formattedEta})
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: activeRoute.isRealRoad ? 'rgba(5, 150, 105, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                  color: activeRoute.isRealRoad ? '#059669' : '#d97706',
                  border: `1px solid ${activeRoute.isRealRoad ? 'rgba(5, 150, 105, 0.2)' : 'rgba(217, 119, 6, 0.2)'}`,
                }}
              >
                {activeRoute.isRealRoad ? 'Live Road Polyline' : 'Stop Graph (Offline Matrix)'}
              </span>
            </div>

            {/* 3-Route Candidate Switcher in Map Header */}
            {routeOptions && routeOptions.length > 0 && onSelectRouteOption && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Switch Route:
                </span>
                {routeOptions.map((opt, oIdx) => {
                  const isCurrent = activeRoute.index === opt.index || activeRoute.title === opt.title;
                  return (
                    <button
                      key={opt.index}
                      type="button"
                      onClick={() => onSelectRouteOption(oIdx)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: isCurrent ? `2px solid ${routeColor}` : '1px solid var(--border-subtle)',
                        backgroundColor: isCurrent ? 'var(--brand-primary-subtle)' : 'var(--bg-surface)',
                        color: isCurrent ? routeColor : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: isCurrent ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: isCurrent ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      }}
                    >
                      <span>{oIdx === 0 ? '1. Primary' : oIdx === 1 ? '2. Alternative' : '3. Alternate 2'}</span>
                      <span style={{ fontSize: '10px', opacity: 0.85 }}>({opt.formattedDistance})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Toggle between Google Map and SVG Topology if needed */}
          <button
            type="button"
            onClick={() => setUseSvgFallback(!useSvgFallback)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 9px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
            }}
            title="Toggle between Google Maps Satellite/Roads and Radar Vector Topology"
          >
            <Layers size={12} />
            <span>{useSvgFallback ? 'Try Google Maps' : 'Radar Topology'}</span>
          </button>

          {/* Prominent Google Maps Verification Button */}
          <a
            href={activeRoute.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#1167EE',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            <ExternalLink size={13} />
            Verify in Google Maps
          </a>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: '380px', backgroundColor: 'var(--bg-canvas)' }}>
        {/* Google Maps Container */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            display: useSvgFallback ? 'none' : 'block',
          }}
        />

        {/* SVG Vector Topology Canvas Fallback */}
        {useSvgFallback && (
          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ width: '100%', height: '100%', flex: 1, backgroundColor: 'var(--bg-surface-muted)' }}
            >
              {/* Grid Background Lines */}
              <defs>
                <pattern id="test-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border-subtle)" strokeWidth="0.5" strokeOpacity="0.5" />
                </pattern>
              </defs>
              <rect width={SVG_W} height={SVG_H} fill="url(#test-grid)" />

              {/* Catchment Radius Ring from Office */}
              <circle
                cx={svgOffice.x}
                cy={svgOffice.y}
                r="180"
                fill="none"
                stroke="var(--brand-blue-500, #5728B2)"
                strokeWidth="1"
                strokeDasharray="4 4"
                strokeOpacity="0.3"
              />

              {/* Active Route Road Polyline */}
              <polyline
                points={svgPolylinePoints}
                fill="none"
                stroke={routeColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity="0.85"
              />

              {/* Pickup Stop Markers */}
              {svgStops.map((stop, idx) => (
                <g key={stop.id} transform={`translate(${stop.x}, ${stop.y})`}>
                  <circle
                    r="14"
                    fill={idx === 0 ? routeColor : '#059669'}
                    stroke="#FFFFFF"
                    strokeWidth="2.5"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
                  />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontWeight="bold"
                    style={{ userSelect: 'none' }}
                  >
                    {idx + 1}
                  </text>
                  <text
                    x="18"
                    y="4"
                    fill="var(--text-primary)"
                    fontSize="10"
                    fontWeight="600"
                    style={{ userSelect: 'none' }}
                  >
                    {stop.name.split(' ')[0]} ({stop.estimatedPickupTime || '07:15'})
                  </text>
                </g>
              ))}

              {/* Office Destination Marker */}
              <g transform={`translate(${svgOffice.x}, ${svgOffice.y})`}>
                <circle
                  r="18"
                  fill="#DC2626"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  style={{ filter: 'drop-shadow(0 2px 5px rgba(220,38,38,0.4))' }}
                />
                <text textAnchor="middle" dy="5" fontSize="13">
                  🏢
                </text>
                <text
                  x="22"
                  y="5"
                  fill="#DC2626"
                  fontSize="11"
                  fontWeight="bold"
                  style={{ userSelect: 'none' }}
                >
                  Office Hub (08:00 AM)
                </text>
              </g>
            </svg>
          </div>
        )}

        {/* Loading overlay if Google Maps is still loading and fallback not activated */}
        {!googleMapLoaded && !useSvgFallback && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(2px)',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--brand-blue-500, #5728B2)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '10px',
              }}
            />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Loading Route Map...
            </div>
          </div>
        )}

        {/* Floating Legend */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '8px 12px',
            boxShadow: 'var(--shadow-sm)',
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            zIndex: 5,
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '3px' }}>
            Map Legend
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: routeColor }} />
            <span style={{ color: 'var(--text-secondary)' }}>Origin Stop (First Pickup)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#059669' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Intermediate Stops</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px' }}>🏢</span>
            <span style={{ color: 'var(--text-secondary)' }}>Office Hub Destination</span>
          </div>
        </div>
      </div>

      {/* Stop Traversal Strip Underneath Map */}
      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          fontSize: '11px',
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>
          Traversal Order:
        </span>
        {passengers.map((p, idx) => (
          <div
            key={p.id}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: idx === 0 ? routeColor : '#059669',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 700,
              }}
            >
              {idx + 1}
            </span>
            <span style={{ color: 'var(--text-primary)' }}>{p.name.split(' ')[0]}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              {p.estimatedPickupTime || '07:15'}
            </span>
            {idx < passengers.length - 1 && <span style={{ color: 'var(--text-muted)', marginLeft: '2px' }}>→</span>}
          </div>
        ))}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: 'rgba(220, 38, 38, 0.1)',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            color: '#DC2626',
            fontWeight: 700,
          }}
        >
          <span>🏢 Office Drop</span>
          <span style={{ fontSize: '10px' }}>08:00 AM</span>
        </div>
      </div>
    </div>
  );
};
