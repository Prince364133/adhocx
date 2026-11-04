'use client';

import React, { useState } from 'react';
import { RoutePlanningResult, CalculatedRoute, PlannedRouteStop } from '../../lib/api/opsTypes';
import { Compass, AlertTriangle, MapPin, Building, ShieldCheck } from 'lucide-react';

interface SpatialTopologyCanvasProps {
  plan: RoutePlanningResult;
  selectedCab: number | null;
  onSelectCab: (cab: number) => void;
  routeColors: string[];
}

export function SpatialTopologyCanvas({
  plan,
  selectedCab,
  onSelectCab,
  routeColors,
}: SpatialTopologyCanvasProps) {
  const [hoveredStop, setHoveredStop] = useState<{
    stop: PlannedRouteStop;
    cab: number;
    letter: string;
    screenX: number;
    screenY: number;
  } | null>(null);

  const WIDTH = 820;
  const HEIGHT = 580;
  const PADDING = 60;

  // Collect all coordinates to compute bounding box
  const allPoints: { lat: number; lng: number }[] = [
    { lat: plan.office.lat, lng: plan.office.lng },
  ];
  plan.routes.forEach((r) => {
    r.stops.forEach((s) => allPoints.push({ lat: s.lat, lng: s.lng }));
  });

  const lats = allPoints.map((p) => p.lat);
  const lngs = allPoints.map((p) => p.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // Buffer range slightly
  const latSpan = Math.max(maxLat - minLat, 0.05) * 1.15;
  const lngSpan = Math.max(maxLng - minLng, 0.05) * 1.15;
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;

  const adjMinLat = midLat - latSpan / 2;
  const adjMaxLat = midLat + latSpan / 2;
  const adjMinLng = midLng - lngSpan / 2;
  const adjMaxLng = midLng + lngSpan / 2;

  // Project lat/lng to SVG (x, y)
  const project = (lat: number, lng: number) => {
    const x = PADDING + ((lng - adjMinLng) / (adjMaxLng - adjMinLng)) * (WIDTH - 2 * PADDING);
    // Y inverted in SVG
    const y = HEIGHT - PADDING - ((lat - adjMinLat) / (adjMaxLat - adjMinLat)) * (HEIGHT - 2 * PADDING);
    return { x, y };
  };

  const officePos = project(plan.office.lat, plan.office.lng);

  // Compute scale: pixels per km roughly based on latitude
  // 1 degree latitude ~ 111 km
  const kmPerDegLat = 110.574;
  const pixelsPerLatDeg = (HEIGHT - 2 * PADDING) / latSpan;
  const pixelsPerKm = pixelsPerLatDeg / kmPerDegLat;

  const routesToRender = selectedCab
    ? plan.routes.filter((r) => r.cab === selectedCab)
    : plan.routes;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '520px',
        backgroundColor: '#050D24',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid #1E293B',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Overlay Legend */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '14px',
          zIndex: 10,
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: '6px 14px',
          borderRadius: '20px',
          border: '1px solid #334155',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#38BDF8' }}>
          <Compass size={14} />
          <span>Spatial Radar Topology</span>
        </div>
        <div style={{ height: '14px', width: '1px', backgroundColor: '#334155' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          <span>Office Hub</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
          <span>&gt;{plan.officeRadiusKm}km Out-of-Catchment</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: '100%', height: '100%', flex: 1, userSelect: 'none' }}
      >
        <defs>
          <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Radar Rings around Office */}
        {[10, 25, plan.officeRadiusKm].map((radiusKm) => {
          const rPixels = radiusKm * pixelsPerKm;
          if (rPixels <= 0) return null;
          const isCatchmentLimit = radiusKm === plan.officeRadiusKm;
          return (
            <g key={radiusKm}>
              <circle
                cx={officePos.x}
                cy={officePos.y}
                r={rPixels}
                fill={isCatchmentLimit ? 'rgba(14, 165, 233, 0.02)' : 'none'}
                stroke={isCatchmentLimit ? '#0EA5E9' : '#1E293B'}
                strokeWidth={isCatchmentLimit ? 1.5 : 1}
                strokeDasharray={isCatchmentLimit ? '6 4' : '3 3'}
              />
              <text
                x={officePos.x + 8}
                y={officePos.y - rPixels + 12}
                fill={isCatchmentLimit ? '#38BDF8' : '#475569'}
                fontSize="10"
                fontFamily="monospace"
              >
                {radiusKm} km {isCatchmentLimit ? '(Catchment Boundary)' : ''}
              </text>
            </g>
          );
        })}

        {/* Office Hub Glow Ring */}
        <circle cx={officePos.x} cy={officePos.y} r={32} fill="url(#hubGlow)" />

        {/* Route Paths */}
        {routesToRender.map((route) => {
          const color = routeColors[(route.cab - 1) % routeColors.length];
          const isSelected = selectedCab === route.cab;

          // Build path through all stops to office
          const points = route.stops.map((s) => project(s.lat, s.lng));
          points.push(officePos);

          if (points.length < 2) return null;

          let pathD = `M ${points[0].x} ${points[0].y}`;
          for (let i = 1; i < points.length; i++) {
            // Smooth curve to next point
            const prev = points[i - 1];
            const curr = points[i];
            const midX = (prev.x + curr.x) / 2;
            const midY = (prev.y + curr.y) / 2;
            pathD += ` Q ${prev.x} ${prev.y}, ${midX} ${midY} T ${curr.x} ${curr.y}`;
          }

          return (
            <g key={`path-cab-${route.cab}`}>
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? 4 : 2.5}
                strokeOpacity={isSelected ? 1 : 0.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ cursor: 'pointer', transition: 'stroke-width 0.2s' }}
                onClick={() => onSelectCab(route.cab)}
              />
            </g>
          );
        })}

        {/* Pickup Stops */}
        {routesToRender.map((route) => {
          const color = routeColors[(route.cab - 1) % routeColors.length];
          return route.stops.map((stop, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const pos = project(stop.lat, stop.lng);
            const isAlert = stop.outOfRadius;

            return (
              <g
                key={`stop-${route.cab}-${letter}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredStop({
                    stop,
                    cab: route.cab,
                    letter,
                    screenX: pos.x,
                    screenY: pos.y,
                  });
                }}
                onMouseLeave={() => setHoveredStop(null)}
                onClick={() => onSelectCab(route.cab)}
              >
                {/* Node circle */}
                <circle
                  r={12}
                  fill={isAlert ? '#EF4444' : color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  filter="url(#glow)"
                />
                <text
                  textAnchor="middle"
                  dy=".3em"
                  fill="#FFFFFF"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {letter}
                </text>
              </g>
            );
          });
        })}

        {/* Central Office Hub Marker */}
        <g transform={`translate(${officePos.x}, ${officePos.y})`}>
          <circle r={14} fill="#10B981" stroke="#FFFFFF" strokeWidth={2.5} />
          <text
            textAnchor="middle"
            dy=".35em"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            HQ
          </text>
          <text
            y={24}
            textAnchor="middle"
            fill="#34D399"
            fontSize="11"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            {plan.office.name.split(',')[0]}
          </text>
        </g>
      </svg>

      {/* Interactive Tooltip Card on Hover */}
      {hoveredStop && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(hoveredStop.screenX + 15, WIDTH - 260),
            top: Math.max(hoveredStop.screenY - 110, 20),
            zIndex: 50,
            backgroundColor: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#F8FAFC',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
            pointerEvents: 'none',
            fontSize: '12px',
            minWidth: '220px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, color: '#38BDF8', fontSize: '13px' }}>
              Cab #{hoveredStop.cab} · Stop {hoveredStop.letter}
            </span>
            {hoveredStop.stop.outOfRadius && (
              <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 600 }}>
                <AlertTriangle size={12} /> Out-of-radius
              </span>
            )}
          </div>
          <div style={{ fontWeight: 600, color: '#F1F5F9', marginBottom: '2px' }}>
            {hoveredStop.stop.name}
          </div>
          <div style={{ color: '#94A3B8', fontSize: '11px', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
            {hoveredStop.stop.matchedAddress}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', borderTop: '1px solid #1E293B', paddingTop: '6px' }}>
            <div>
              <span style={{ color: '#64748B', fontSize: '10px' }}>Pickup ETA: </span>
              <strong style={{ color: '#F8FAFC' }}>{hoveredStop.stop.eta}</strong>
            </div>
            <div>
              <span style={{ color: '#64748B', fontSize: '10px' }}>Distance: </span>
              <strong style={{ color: '#F8FAFC' }}>{hoveredStop.stop.officeDistanceKm} km</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

