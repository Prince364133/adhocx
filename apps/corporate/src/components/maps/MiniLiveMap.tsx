'use client';

import React, { useState } from 'react';
import { Navigation, ZoomIn, ZoomOut, Maximize2, Car } from 'lucide-react';

export interface MapMarker {
  id: string;
  label: string;
  status: string;
  eta: string;
  x: number;
  y: number;
  isVehicle?: boolean;
}

export interface MiniLiveMapProps {
  height?: number;
  activeVehiclePlate?: string;
  activeEta?: string;
  routeName?: string;
}

export const MiniLiveMap: React.FC<MiniLiveMapProps> = ({
  height = 340,
  activeVehiclePlate = 'TS09UB7845',
  activeEta = '11 min',
  routeName,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);

  // SVG route path coordinates from Kondapur -> Botanical Garden -> HiTEC City -> Gachibowli
  const pathD = 'M 140 230 C 220 200, 310 240, 440 180 S 560 140, 680 190';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        backgroundColor: '#EDF2F7',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Map Grid / Styled Canvas */}
      <svg
        viewBox="0 0 800 400"
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Subtle Map Roads & Blocks Background */}
        <rect width="800" height="400" fill="#EBF1F6" />

        {/* City Zones / Blocks */}
        <path d="M 50 40 L 260 40 L 240 160 L 60 140 Z" fill="#E2E8F0" opacity="0.6" />
        <path d="M 300 30 L 520 30 L 510 130 L 320 120 Z" fill="#E2E8F0" opacity="0.6" />
        <path d="M 560 50 L 750 50 L 740 150 L 580 140 Z" fill="#E2E8F0" opacity="0.6" />
        <path d="M 80 260 L 270 240 L 260 360 L 90 370 Z" fill="#E2E8F0" opacity="0.6" />
        <path d="M 320 270 L 540 260 L 530 380 L 310 370 Z" fill="#E2E8F0" opacity="0.6" />

        {/* Road networks */}
        <line x1="0" y1="180" x2="800" y2="180" stroke="#CBD5E1" strokeWidth="8" />
        <line x1="280" y1="0" x2="280" y2="400" stroke="#CBD5E1" strokeWidth="6" />
        <line x1="540" y1="0" x2="540" y2="400" stroke="#CBD5E1" strokeWidth="6" />

        {/* Landmark labels */}
        <text x="130" y="110" fill="#64748B" fontSize="13" fontWeight="700" letterSpacing="0.05em">
          KONDAPUR
        </text>
        <text x="380" y="90" fill="#64748B" fontSize="13" fontWeight="700" letterSpacing="0.05em">
          HITEC CITY
        </text>
        <text x="620" y="110" fill="#64748B" fontSize="13" fontWeight="700" letterSpacing="0.05em">
          GACHIBOWLI
        </text>

        {/* Active Route Polyline */}
        <path
          d={pathD}
          fill="none"
          stroke="#5728B2"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Origin Pin (Kondapur) */}
        <circle cx="140" cy="230" r="10" fill="#16A34A" />
        <circle cx="140" cy="230" r="4" fill="#FFFFFF" />

        {/* Waypoint Stops */}
        <circle cx="280" cy="215" r="7" fill="#5728B2" />
        <text x="280" y="219" fill="#FFFFFF" fontSize="9" fontWeight="700" textAnchor="middle">1</text>

        <circle cx="440" cy="180" r="7" fill="#5728B2" />
        <text x="440" y="184" fill="#FFFFFF" fontSize="9" fontWeight="700" textAnchor="middle">2</text>

        {/* Destination Pin (HiTEC City Hub) */}
        <circle cx="680" cy="190" r="10" fill="#EE9811" />
        <circle cx="680" cy="190" r="4" fill="#FFFFFF" />

        {/* Live Vehicle Marker */}
        <g transform="translate(435, 175)">
          {/* Animated pulse ring */}
          <circle cx="0" cy="0" r="16" fill="#5728B2" opacity="0.2">
            <animate attributeName="r" values="12;24;12" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Vehicle Icon Circle */}
          <circle cx="0" cy="0" r="14" fill="#5728B2" stroke="#FFFFFF" strokeWidth="2.5" />
          <path
            d="M -6 -3 L -4 -7 L 4 -7 L 6 -3 L 6 4 L -6 4 Z"
            fill="#FFFFFF"
          />
        </g>
      </svg>

      {/* Floating Active Vehicle Tooltip Card */}
      <div
        style={{
          position: 'absolute',
          top: '32%',
          left: '52%',
          transform: 'translate(-50%, -100%)',
          backgroundColor: 'var(--bg-surface, #FFFFFF)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {activeVehiclePlate}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#16A34A',
              backgroundColor: '#DCFCE7',
              padding: '1px 5px',
              borderRadius: '4px',
            }}
          >
            In Progress
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          ETA: <strong style={{ color: '#5728B2' }}>{activeEta}</strong> Â· 5 stops
        </div>
      </div>

      {/* Map Control Buttons */}
      <div
        style={{
          position: 'absolute',
          right: '12px',
          bottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.8))}
          style={{
            width: 32,
            height: 32,
            backgroundColor: 'var(--bg-surface, #FFFFFF)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          }}
          title="Zoom In"
        >
          <ZoomIn size={16} color="var(--text-secondary)" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
          style={{
            width: 32,
            height: 32,
            backgroundColor: 'var(--bg-surface, #FFFFFF)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          }}
          title="Zoom Out"
        >
          <ZoomOut size={16} color="var(--text-secondary)" />
        </button>
      </div>
    </div>
  );
};

export default MiniLiveMap;

