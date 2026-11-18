'use client';

import React, { useState } from 'react';

export interface BarDataPoint {
  day: string;
  scheduled: number;
  completed: number;
}

export interface BarComparisonChartProps {
  data: BarDataPoint[];
  height?: number;
}

function computeAxisScale(rawMax: number, tickCount = 5): { maxVal: number; ticks: number[] } {
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

export const BarComparisonChart: React.FC<BarComparisonChartProps> = ({
  data,
  height = 220,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
        No comparison data available.
      </div>
    );
  }

  const paddingLeft = 44;
  const paddingRight = 20;
  const paddingTop = 24;
  const paddingBottom = 32;
  const chartWidth = 520;
  const chartHeight = height;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const rawMax = Math.max(
    0,
    ...data.map((d) => Math.max(Number(d.scheduled) || 0, Number(d.completed) || 0)),
  );
  const { maxVal, ticks } = computeAxisScale(rawMax, 5);
  const groupWidth = innerWidth / Math.max(1, data.length);
  const barWidth = Math.min(18, Math.max(8, Math.floor(groupWidth / 3)));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#93C5FD' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Scheduled</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--brand-action)' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Completed</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
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

        {/* Bars */}
        {data.map((d, i) => {
          const groupCenter =
            data.length <= 1
              ? paddingLeft + innerWidth / 2
              : paddingLeft + i * groupWidth + groupWidth / 2;
          const scheduledHeight = Math.max(0, ((Number(d.scheduled) || 0) / maxVal) * innerHeight);
          const completedHeight = Math.max(0, ((Number(d.completed) || 0) / maxVal) * innerHeight);
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={`${d.day}-${i}`}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Scheduled Bar */}
              <rect
                x={groupCenter - barWidth - 2}
                y={paddingTop + innerHeight - scheduledHeight}
                width={barWidth}
                height={scheduledHeight}
                rx={2}
                fill={isHovered ? '#60A5FA' : '#93C5FD'}
                style={{ transition: 'fill 0.15s ease' }}
              />

              {/* Completed Bar */}
              <rect
                x={groupCenter + 2}
                y={paddingTop + innerHeight - completedHeight}
                width={barWidth}
                height={completedHeight}
                rx={2}
                fill={isHovered ? 'var(--color-chart-purple-hover)' : 'var(--brand-primary)'}
                style={{ transition: 'fill 0.15s ease' }}
              />

              {/* X Axis Label */}
              <text
                x={groupCenter}
                y={chartHeight - 8}
                textAnchor="middle"
                fontSize="11"
                fill={isHovered ? 'var(--text-primary, #0F172A)' : 'var(--text-muted, #94A3B8)'}
                fontWeight={isHovered ? '600' : '400'}
              >
                {d.day}
              </text>

              {/* Tooltip on hover */}
              {isHovered && (
                <g>
                  <rect
                    x={Math.max(paddingLeft, Math.min(chartWidth - paddingRight - 100, groupCenter - 50))}
                    y={Math.max(4, paddingTop + innerHeight - Math.max(scheduledHeight, completedHeight) - 38)}
                    width="100"
                    height="32"
                    rx="4"
                    fill="var(--text-primary, #1E293B)"
                  />
                  <text
                    x={Math.max(paddingLeft + 50, Math.min(chartWidth - paddingRight - 50, groupCenter))}
                    y={Math.max(24, paddingTop + innerHeight - Math.max(scheduledHeight, completedHeight) - 18)}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="var(--text-inverse, #FFFFFF)"
                  >
                    S: {d.scheduled} | C: {d.completed}
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

export default BarComparisonChart;
