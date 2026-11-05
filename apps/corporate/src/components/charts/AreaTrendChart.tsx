'use client';

import React, { useState } from 'react';

export interface DataPoint {
  day: string;
  trips: number;
}

export interface AreaTrendChartProps {
  data: DataPoint[];
  height?: number;
  lineColor?: string;
  strokeColor?: string;
  metricLabel?: string;
}

export const AreaTrendChart: React.FC<AreaTrendChartProps> = ({
  data,
  height = 200,
  lineColor,
  strokeColor,
  metricLabel = 'Trips',
}) => {
  const effectiveLineColor = strokeColor || lineColor || '#6366F1';
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const chartWidth = 520;
  const chartHeight = height;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map((d) => d.trips), 450);
  const minVal = 0;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * innerWidth;
    const y = paddingTop + innerHeight - ((d.trips - minVal) / (maxVal - minVal)) * innerHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${paddingTop + innerHeight} Z`;

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={effectiveLineColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={effectiveLineColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 100, 200, 300, 400].map((val) => {
          const y = paddingTop + innerHeight - (val / maxVal) * innerHeight;
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="var(--border-subtle, #E2E8F0)"
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-muted, #94A3B8)"
                fontWeight="500"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Shaded Area */}
        <path d={areaD} fill="url(#areaGradient)" />

        {/* Smooth Line */}
        <path d={pathD} fill="none" stroke={effectiveLineColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Data points & X Labels */}
        {points.map((p, idx) => {
          const isSelected = activeIdx === idx || (activeIdx === null && idx === points.length - 1);
          return (
            <g key={p.day}>
              <text
                x={p.x}
                y={chartHeight - 8}
                textAnchor="middle"
                fontSize="11"
                fill={isSelected ? 'var(--text-primary, #0F172A)' : 'var(--text-muted, #94A3B8)'}
                fontWeight={isSelected ? '600' : '400'}
              >
                {p.day}
              </text>

              {/* Interactive target */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isSelected ? 6 : 4}
                fill={isSelected ? lineColor : 'var(--bg-surface, #FFFFFF)'}
                stroke={lineColor}
                strokeWidth="2.5"
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              />

              {/* Peak badge on the last element or hovered */}
              {isSelected && (
                <g>
                  <rect
                    x={p.x - 34}
                    y={p.y - 32}
                    width="68"
                    height="24"
                    rx="4"
                    fill="var(--text-primary, #1E293B)"
                  />
                  <text
                    x={p.x}
                    y={p.y - 16}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="var(--text-inverse, #FFFFFF)"
                  >
                    {p.trips} {metricLabel}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default AreaTrendChart;

