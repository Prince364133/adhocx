'use client';

import React, { useId, useState } from 'react';

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

function computeAxisScale(rawMax: number, tickCount = 4): { maxVal: number; ticks: number[] } {
  const safeMax = Number.isFinite(rawMax) && rawMax > 0 ? rawMax : tickCount;
  const roughStep = safeMax / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  const niceNorm = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = Math.max(1, niceNorm * magnitude);
  const maxVal = step * tickCount;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * step);
  return { maxVal, ticks };
}

export const AreaTrendChart: React.FC<AreaTrendChartProps> = ({
  data,
  height = 200,
  lineColor,
  strokeColor,
  metricLabel = 'Trips',
}) => {
  const effectiveLineColor = strokeColor || lineColor || 'var(--color-chart-indigo)';
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const gradientId = useId();

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
        No trend data available.
      </div>
    );
  }

  const paddingLeft = 44;
  const paddingRight = 20;
  const paddingTop = 28;
  const paddingBottom = 30;
  const chartWidth = 520;
  const chartHeight = height;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const rawMax = Math.max(0, ...data.map((d) => Number(d.trips) || 0));
  const { maxVal, ticks } = computeAxisScale(rawMax, 4);

  const points = data.map((d, i) => {
    const x =
      data.length <= 1
        ? paddingLeft + innerWidth / 2
        : paddingLeft + (i / (data.length - 1)) * innerWidth;
    const value = Number(d.trips) || 0;
    const y = paddingTop + innerHeight - (value / maxVal) * innerHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + p.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaD =
    points.length > 1
      ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${paddingTop + innerHeight} Z`
      : '';

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={effectiveLineColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={effectiveLineColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {ticks.map((val) => {
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
        {areaD && <path d={areaD} fill={`url(#${gradientId})`} />}

        {/* Smooth Line */}
        {points.length > 1 && (
          <path d={pathD} fill="none" stroke={effectiveLineColor} strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* Data points & X Labels */}
        {points.map((p, idx) => {
          const isSelected = activeIdx === idx || (activeIdx === null && idx === points.length - 1);
          const badgeX = Math.max(paddingLeft, Math.min(chartWidth - paddingRight - 80, p.x - 40));
          const badgeY = Math.max(4, p.y - 32);

          return (
            <g key={`${p.day}-${idx}`}>
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
                fill={isSelected ? effectiveLineColor : 'var(--bg-surface, #FFFFFF)'}
                stroke={effectiveLineColor}
                strokeWidth="2.5"
                style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                onMouseEnter={() => setActiveIdx(idx)}
                onMouseLeave={() => setActiveIdx(null)}
              />

              {/* Peak badge on the last element or hovered */}
              {isSelected && (
                <g>
                  <rect
                    x={badgeX}
                    y={badgeY}
                    width="80"
                    height="24"
                    rx="4"
                    fill="var(--text-primary, #1E293B)"
                  />
                  <text
                    x={badgeX + 40}
                    y={badgeY + 16}
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
