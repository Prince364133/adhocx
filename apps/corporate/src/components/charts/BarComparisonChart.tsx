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

export const BarComparisonChart: React.FC<BarComparisonChartProps> = ({
  data,
  height = 220,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 24;
  const paddingBottom = 32;
  const chartWidth = 520;
  const chartHeight = height;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const maxVal = 500;
  const groupWidth = innerWidth / data.length;
  const barWidth = 14;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#93C5FD' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Scheduled</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#5728B2' }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Completed</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        {/* Horizontal grid lines */}
        {[0, 100, 200, 300, 400, 500].map((val) => {
          const y = paddingTop + innerHeight - (val / maxVal) * innerHeight;
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="3 3"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#94A3B8"
                fontWeight="500"
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const groupCenter = paddingLeft + i * groupWidth + groupWidth / 2;
          const scheduledHeight = (d.scheduled / maxVal) * innerHeight;
          const completedHeight = (d.completed / maxVal) * innerHeight;
          const isHovered = hoveredIdx === i;

          return (
            <g
              key={d.day}
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
                fill={isHovered ? '#0948AC' : '#5728B2'}
                style={{ transition: 'fill 0.15s ease' }}
              />

              {/* X Axis Label */}
              <text
                x={groupCenter}
                y={chartHeight - 8}
                textAnchor="middle"
                fontSize="11"
                fill={isHovered ? '#0F172A' : '#94A3B8'}
                fontWeight={isHovered ? '600' : '400'}
              >
                {d.day}
              </text>

              {/* Tooltip on hover */}
              {isHovered && (
                <g>
                  <rect
                    x={groupCenter - 50}
                    y={Math.min(paddingTop + innerHeight - Math.max(scheduledHeight, completedHeight) - 40, paddingTop)}
                    width="100"
                    height="32"
                    rx="4"
                    fill="#1E293B"
                  />
                  <text
                    x={groupCenter}
                    y={Math.min(paddingTop + innerHeight - Math.max(scheduledHeight, completedHeight) - 20, paddingTop + 20)}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#FFFFFF"
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

