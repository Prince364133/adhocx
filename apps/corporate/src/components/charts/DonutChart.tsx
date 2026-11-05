'use client';

import React, { useState } from 'react';

export interface DonutSegment {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface DonutChartProps {
  title?: string;
  totalLabel?: string;
  totalValue?: string | number;
  centerLabel?: string;
  centerValue?: string | number;
  segments?: DonutSegment[];
  data?: DonutSegment[];
  size?: number;
  thickness?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  totalLabel,
  totalValue,
  centerLabel,
  centerValue,
  segments,
  data,
  size = 190,
  thickness = 24,
}) => {
  const effectiveSegments = segments || data || [];
  const effectiveTotalLabel = totalLabel || centerLabel || 'Total';
  const effectiveTotalValue = totalValue ?? centerValue ?? effectiveSegments.reduce((acc, s) => acc + s.count, 0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const radius = (size - thickness) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate cumulative percentages
  const total = effectiveSegments.reduce((acc, s) => acc + s.count, 0) || 1;

  let accumulatedPercent = 0;
  const slices = effectiveSegments.map((seg, i) => {
    const fraction = seg.count / total;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += fraction;

    return {
      ...seg,
      index: i,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={thickness}
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isHovered = hoveredIdx === slice.index;
            return (
              <circle
                key={slice.label}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={isHovered ? thickness + 4 : thickness}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                  opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1,
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoveredIdx(slice.index)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.1,
            }}
          >
            {hoveredIdx !== null ? effectiveSegments[hoveredIdx].count : effectiveTotalValue}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginTop: '2px',
            }}
          >
            {hoveredIdx !== null ? effectiveSegments[hoveredIdx].label : effectiveTotalLabel}
          </span>
        </div>
      </div>

      {/* Legends */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 160, flex: 1 }}>
        {effectiveSegments.map((seg, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={seg.label}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: seg.color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {seg.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {seg.count}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', minWidth: '42px', textAlign: 'right' }}>
                  ({seg.pct}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonutChart;

