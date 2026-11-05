'use client';

import React, { useState } from 'react';
import { RoutePlanningResult, PlannedRouteStop } from '../../lib/api/opsTypes';
import { Compass, AlertTriangle } from 'lucide-react';

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
    const y = HEIGHT - PADDING - ((lat - adjMinLat) / (adjMaxLat - adjMinLat)) * (HEIGHT - 2 * PADDING);
    return { x, y };
  };

  const officePos = project(plan.office.lat, plan.office.lng);

  // Compute scale: pixels per km roughly based on latitude
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
        backgroundColor: 'var(--bg-surface-muted)',
        borderRadius: 'var(--radius-lg, 12px)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background-color 0.2s, border-color 0.2s',
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
          backgroundColor: 'var(--bg-surface)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-pill)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--brand-blue-500, #5728B2)', fontWeight: 600 }}>
          <Compass size={14} />
          <span>Spatial Radar Topology</span>
        </div>
        <div style={{ height: '14px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
          <span>Office Hub</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
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
            <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
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
                fill={isCatchmentLimit ? 'rgba(87, 40, 178, 0.03)' : 'none'}
                stroke={isCatchmentLimit ? 'var(--brand-blue-500, #5728B2)' : 'var(--border-strong, #CBD5E1)'}
                strokeWidth={isCatchmentLimit ? 1.5 : 1}
                strokeDasharray={isCatchmentLimit ? '6 4' : '3 3'}
              />
              <text
                x={officePos.x + 8}
                y={officePos.y - rPixels + 12}
                fill={isCatchmentLimit ? 'var(--brand-blue-500, #5728B2)' : 'var(--text-muted, #94A3B8)'}
                fontSize="10"
                fontFamily="monospace"
                fontWeight="600"
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

          const points = route.stops.map((s) => project(s.lat, s.lng));
          points.push(officePos);

          if (points.length < 2) return null;

          let pathD = `M ${points[0].x} ${points[0].y}`;
          for (let i = 1; i < points.length; i++) {
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
                strokeOpacity={isSelected ? 1 : 0.75}
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
                onMouseEnter={() => {
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
                  fill={isAlert ? '#DC2626' : color}
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
          <circle r={14} fill="#16A34A" stroke="#FFFFFF" strokeWidth={2.5} />
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
            fill="var(--text-primary)"
            fontSize="11"
            fontWeight="700"
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
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '10px 14px',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-elevated)',
            pointerEvents: 'none',
            fontSize: '12px',
            minWidth: '220px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700, color: 'var(--brand-blue-500, #5728B2)', fontSize: '13px' }}>
              Cab #{hoveredStop.cab} · Stop {hoveredStop.letter}
            </span>
            {hoveredStop.stop.outOfRadius && (
              <span style={{ color: 'var(--color-danger, #DC2626)', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: 600 }}>
                <AlertTriangle size={12} /> Out-of-radius
              </span>
            )}
          </div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
            {hoveredStop.stop.name}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
            {hoveredStop.stop.matchedAddress}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Pickup ETA: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{hoveredStop.stop.eta}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Distance: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{hoveredStop.stop.officeDistanceKm} km</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
