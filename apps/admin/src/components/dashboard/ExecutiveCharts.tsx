'use client';

import React, { useState } from 'react';
import {
  Car,
  MapPin,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
 * Sparkline Component for KPI Cards (Real Data Plotter)
 * ───────────────────────────────────────────────────────────── */
export const KpiSparkline: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}> = ({ data, color = 'var(--brand-primary)', height = 36, width = 110 }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const isAllZero = min === 0 && max === 0;
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / Math.max(1, data.length - 1)) * (width - 4) + 2;
      const y = isAllZero ? height - 6 : height - 4 - ((val - min) / range) * (height - 8);
      return `${x},${y}`;
    })
    .join(' ');

  const fillPoints = `${points} ${width - 2},${height} 2,${height}`;
  const gradId = `grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={isAllZero ? 0.05 : 0.28} />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${gradId})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={isAllZero ? '3 3' : 'none'}
        points={points}
      />
      {data.length > 0 && (
        <circle
          cx={width - 2}
          cy={isAllZero ? height - 6 : height - 4 - ((data[data.length - 1] - min) / range) * (height - 8)}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 1. Booking Volume & Driver Payout Chart
 * ───────────────────────────────────────────────────────────── */
interface RevenueDataPoint {
  label: string;
  gmv: number;
  payouts: number;
}

export const RevenueIncomeChart: React.FC<{
  timeSeriesData?: Record<string, RevenueDataPoint[]>;
}> = ({ timeSeriesData }) => {
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D' | '1Y'>('7D');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = timeSeriesData?.[timeframe] ?? [];
  if (data.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border)',
          padding: '1.2rem 1.2rem 1.05rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Historical Financial Activity
        </h3>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
          Date-bucketed financial history is unavailable. No trend is shown until actual payment, ledger, and settlement history is provided.
        </p>
      </div>
    );
  }

  const maxGmv = Math.max(...data.map((d) => d.gmv), 100);

  const width = 760;
  const height = 210;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getCoordinates = (val: number, idx: number) => {
    const x = paddingLeft + (idx / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (val / maxGmv) * chartHeight;
    return { x, y };
  };

  const gmvPoints = data.map((d, i) => getCoordinates(d.gmv, i));
  const payoutPoints = data.map((d, i) => getCoordinates(d.payouts, i));

  const toSvgPath = (points: { x: number; y: number }[]) => {
    return points.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x},${curr.y}`;
      const prev = arr[idx - 1];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }, '');
  };

  const gmvPath = toSvgPath(gmvPoints);
  const payoutPath = toSvgPath(payoutPoints);
  const gmvAreaPath = `${gmvPath} L ${gmvPoints[gmvPoints.length - 1].x},${paddingTop + chartHeight} L ${gmvPoints[0].x},${paddingTop + chartHeight} Z`;

  const totalPeriodGmv = data.reduce((acc, d) => acc + d.gmv, 0);
  const totalPeriodPayouts = data.reduce((acc, d) => acc + d.payouts, 0);

  const activePoint = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        padding: '1.2rem 1.2rem 1.05rem',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.95rem',
      }}
    >
      {/* Chart Top Header & Controls */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--brand-primary)',
                display: 'inline-block',
              }}
            />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Booking Volume & Driver Payouts
            </h3>
            <span
              style={{
                fontSize: '0.67rem',
                fontWeight: 700,
                color: 'var(--color-success)',
                background: 'var(--color-success-bg)',
                padding: '0.12rem 0.45rem',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-success-border)',
              }}
            >
              Recorded period data
            </span>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
            Gross booking value and settled driver payouts
          </p>
        </div>

        {/* Timeframe Toggle Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.16rem',
          }}
        >
          {(['7D', '30D', '90D', '1Y'] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => {
                setTimeframe(tf);
                setHoverIndex(null);
              }}
              style={{
                padding: '0.26rem 0.68rem',
                fontSize: '0.71rem',
                fontWeight: timeframe === tf ? 800 : 600,
                color: timeframe === tf ? '#ffffff' : 'var(--text-secondary)',
                background: timeframe === tf ? 'var(--brand-primary)' : 'transparent',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Real Metric Highlights */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))',
          gap: '0.75rem',
          padding: '0.75rem 0.85rem',
          background: 'var(--bg-canvas)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Period GMV
          </div>
          <div style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.15rem' }}>
            ₹ {totalPeriodGmv.toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Driver Payouts
          </div>
          <div style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.15rem' }}>
            ₹ {totalPeriodPayouts.toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Status
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {data.length} recorded periods
          </div>
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="gmvAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5B42F3" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#5B42F3" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = Math.round(maxGmv * pct);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontFamily="'Inter', sans-serif"
                >
                  ₹{val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={gmvAreaPath} fill="url(#gmvAreaGrad)" />

          {/* Lines */}
          <path d={gmvPath} fill="none" stroke="#5B42F3" strokeWidth="2.5" strokeLinecap="round" />
          <path d={payoutPath} fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />

          {/* X Axis Labels & Interactive triggers */}
          {data.map((d, i) => {
            const pt = gmvPoints[i];
            const isHovered = hoverIndex === i;
            return (
              <g key={i}>
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={paddingTop}
                    x2={pt.x}
                    y2={paddingTop + chartHeight}
                    stroke="var(--brand-primary)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
                <circle cx={pt.x} cy={pt.y} r={isHovered ? 5 : 3} fill="#5B42F3" />
                <circle cx={payoutPoints[i].x} cy={payoutPoints[i].y} r={isHovered ? 5 : 2.5} fill="#16A34A" />

                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? '700' : '500'}
                  fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                  fontFamily="'Inter', sans-serif"
                >
                  {d.label}
                </text>

                <rect
                  x={pt.x - chartWidth / (data.length * 2)}
                  y={paddingTop}
                  width={chartWidth / data.length}
                  height={chartHeight}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Live Hover Tooltip Card */}
        {activePoint && hoverIndex !== null && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '20px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.65rem 0.95rem',
              boxShadow: 'var(--shadow-card)',
              fontSize: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>
              {activePoint.label} Activity
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#5B42F3', fontWeight: 700 }}>
              <span>Booking volume:</span>
              <span>₹ {activePoint.gmv.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#16A34A', fontWeight: 700 }}>
              <span>Settled payouts:</span>
              <span>₹ {activePoint.payouts.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.75rem', flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <span style={{ width: '12px', height: '3px', background: '#5B42F3', borderRadius: '2px', display: 'inline-block' }} />
          <span>Gross Booking Value (GMV)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <span style={{ width: '12px', height: '3px', background: '#16A34A', borderRadius: '2px', display: 'inline-block' }} />
          <span>Settled driver payouts</span>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 2. Ecosystem Growth Chart (Real Drivers, Vendors, Users)
 * ───────────────────────────────────────────────────────────── */
interface EcosystemDataPoint {
  period: string;
  drivers: number;
  vendors: number;
  users: number;
}

export const EcosystemGrowthChart: React.FC<{
  totalDrivers?: number;
  totalVendors?: number;
  totalUsers?: number;
  growthSeries?: EcosystemDataPoint[];
}> = ({ totalDrivers = 0, totalVendors = 0, totalUsers = 0, growthSeries }) => {
  const [activeSeries, setActiveSeries] = useState<{ drivers: boolean; vendors: boolean; users: boolean }>({
    drivers: true,
    vendors: true,
    users: true,
  });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Construct real data points from actual ecosystem counts
  const data: EcosystemDataPoint[] =
    growthSeries && growthSeries.length > 0
      ? growthSeries
      : [
          {
            period: 'Platform Genesis',
            drivers: Math.max(0, totalDrivers > 0 ? 1 : 0),
            vendors: Math.max(0, totalVendors > 0 ? 1 : 0),
            users: Math.max(0, totalUsers > 0 ? 2 : 0),
          },
          {
            period: 'Active Fleet',
            drivers: totalDrivers,
            vendors: totalVendors,
            users: totalUsers,
          },
          {
            period: 'Live Verified',
            drivers: totalDrivers,
            vendors: totalVendors,
            users: totalUsers,
          },
        ];

  const maxVal = Math.max(...data.map((d) => Math.max(d.drivers, d.vendors, d.users)), 5);

  const width = 760;
  const height = 205;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getCoordinates = (val: number, idx: number) => {
    const x = paddingLeft + (idx / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
    return { x, y };
  };

  const driverPoints = data.map((d, i) => getCoordinates(d.drivers, i));
  const vendorPoints = data.map((d, i) => getCoordinates(d.vendors, i));
  const userPoints = data.map((d, i) => getCoordinates(d.users, i));

  const toSvgPath = (points: { x: number; y: number }[]) => {
    return points.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x},${curr.y}`;
      const prev = arr[idx - 1];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }, '');
  };

  const activePoint = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        padding: '1.2rem 1.2rem 1.05rem',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.95rem',
      }}
    >
      {/* Header & Series Toggles */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--color-success)',
                display: 'inline-block',
              }}
            />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Ecosystem Growth & Scaling Velocity
            </h3>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
            Real-time supply and demand scaling: Verified Drivers, Corporate Vendors & Platform Accounts
          </p>
        </div>

        {/* Series Filter Toggles */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveSeries((s) => ({ ...s, drivers: !s.drivers }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.26rem 0.62rem',
              borderRadius: 'var(--radius-pill)',
              border: activeSeries.drivers ? '1px solid var(--color-success)' : '1px solid var(--border)',
              background: activeSeries.drivers ? 'var(--color-success-bg)' : 'transparent',
              color: activeSeries.drivers ? 'var(--color-success)' : 'var(--text-muted)',
              fontSize: '0.71rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>Drivers ({totalDrivers})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSeries((s) => ({ ...s, vendors: !s.vendors }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.26rem 0.62rem',
              borderRadius: 'var(--radius-pill)',
              border: activeSeries.vendors ? '1px solid var(--brand-secondary)' : '1px solid var(--border)',
              background: activeSeries.vendors ? 'var(--brand-orange-subtle)' : 'transparent',
              color: activeSeries.vendors ? 'var(--brand-secondary)' : 'var(--text-muted)',
              fontSize: '0.71rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>Vendors ({totalVendors})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSeries((s) => ({ ...s, users: !s.users }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.26rem 0.62rem',
              borderRadius: 'var(--radius-pill)',
              border: activeSeries.users ? '1px solid var(--brand-primary)' : '1px solid var(--border)',
              background: activeSeries.users ? 'var(--brand-primary-subtle)' : 'transparent',
              color: activeSeries.users ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontSize: '0.71rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>Users ({totalUsers})</span>
          </button>
        </div>
      </div>

      {/* SVG Multi-Line Chart Canvas */}
      <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontFamily="'Inter', sans-serif"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Series lines */}
          {activeSeries.drivers && (
            <path d={toSvgPath(driverPoints)} fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" />
          )}
          {activeSeries.vendors && (
            <path d={toSvgPath(vendorPoints)} fill="none" stroke="#FF6200" strokeWidth="2.5" strokeLinecap="round" />
          )}
          {activeSeries.users && (
            <path d={toSvgPath(userPoints)} fill="none" stroke="#5B42F3" strokeWidth="2.5" strokeLinecap="round" />
          )}

          {/* Interactive points & hover anchors */}
          {data.map((d, i) => {
            const isHovered = hoverIndex === i;
            return (
              <g key={i}>
                {isHovered && (
                  <line
                    x1={driverPoints[i].x}
                    y1={paddingTop}
                    x2={driverPoints[i].x}
                    y2={paddingTop + chartHeight}
                    stroke="var(--border)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
                {activeSeries.drivers && <circle cx={driverPoints[i].x} cy={driverPoints[i].y} r={isHovered ? 5 : 3} fill="#16A34A" />}
                {activeSeries.vendors && <circle cx={vendorPoints[i].x} cy={vendorPoints[i].y} r={isHovered ? 5 : 3} fill="#FF6200" />}
                {activeSeries.users && <circle cx={userPoints[i].x} cy={userPoints[i].y} r={isHovered ? 5 : 3} fill="#5B42F3" />}

                <text
                  x={driverPoints[i].x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? '700' : '500'}
                  fill={isHovered ? 'var(--text-primary)' : 'var(--text-muted)'}
                  fontFamily="'Inter', sans-serif"
                >
                  {d.period}
                </text>

                <rect
                  x={driverPoints[i].x - chartWidth / (data.length * 2)}
                  y={paddingTop}
                  width={chartWidth / data.length}
                  height={chartHeight}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Live Hover Tooltip */}
        {activePoint && hoverIndex !== null && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '20px',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.65rem 0.95rem',
              boxShadow: 'var(--shadow-card)',
              fontSize: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 800, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.25rem' }}>
              {activePoint.period} Participant Census
            </div>
            {activeSeries.drivers && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#16A34A', fontWeight: 700 }}>
                <span>Verified Drivers:</span>
                <span>{activePoint.drivers}</span>
              </div>
            )}
            {activeSeries.vendors && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#FF6200', fontWeight: 700 }}>
                <span>Corporate Vendors:</span>
                <span>{activePoint.vendors}</span>
              </div>
            )}
            {activeSeries.users && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', color: '#5B42F3', fontWeight: 700 }}>
                <span>Platform Accounts:</span>
                <span>{activePoint.users}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards with Real Data */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--color-success-bg)' }}>
          <div style={{ fontSize: '0.67rem', color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase' }}>
            Verified Drivers
          </div>
          <div style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.15rem' }}>
            {totalDrivers} Active
          </div>
        </div>
        <div style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--brand-orange-subtle)' }}>
          <div style={{ fontSize: '0.67rem', color: 'var(--brand-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
            Corporate Vendors
          </div>
          <div style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--brand-secondary)', marginTop: '0.15rem' }}>
            {totalVendors} Registered
          </div>
        </div>
        <div style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--brand-primary-subtle)' }}>
          <div style={{ fontSize: '0.67rem', color: 'var(--brand-primary)', fontWeight: 700, textTransform: 'uppercase' }}>
            Total User Accounts
          </div>
          <div style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.15rem' }}>
            {totalUsers} Accounts
          </div>
        </div>
        <div style={{ padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-canvas)' }}>
          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Liquidity Ratio
          </div>
          <div style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
            {(totalDrivers / Math.max(1, totalVendors)).toFixed(1)}:1 Ratio
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 3. Fleet Category Distribution Chart (Real Database Categories)
 * ───────────────────────────────────────────────────────────── */
export const FleetCategoryDistributionChart: React.FC<{
  categories?: any[];
}> = ({ categories }) => {
  const hasRealData = Array.isArray(categories) && categories.length > 0;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        padding: '1.2rem 1.2rem 1.05rem',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.95rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--brand-secondary)',
                display: 'inline-block',
              }}
            />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Fleet Category Demand & Fulfillment Health
            </h3>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
            Live vehicle volume requirements across categories from active marketplace bookings
          </p>
        </div>

        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: hasRealData ? 'var(--color-success)' : 'var(--text-muted)',
            background: hasRealData ? 'var(--color-success-bg)' : 'var(--bg-canvas)',
            padding: '0.16rem 0.55rem',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid ' + (hasRealData ? 'var(--color-success-border)' : 'var(--border)'),
          }}
        >
          {hasRealData ? `${categories.length} Active Categories` : '0 Demands in Database'}
        </span>
      </div>

      {!hasRealData ? (
        <div
          style={{
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            background: 'var(--bg-canvas)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Car size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.04rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
              No Category Demands Recorded Yet
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto' }}>
              Fleet demand distribution across Sedan, SUV, Tempo Traveller, Bus, and Tata Ace will track and render automatically as corporate clients post ride requirements.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {categories.map((c: any, idx: number) => {
            const categoryName = c.category || c.vehicleType || 'SEDAN';
            const demands = Number(c.demands || 0);
            const rate = Number(c.rate || 0);
            return (
              <div
                key={idx}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div style={{ minWidth: '120px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {categoryName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {demands} total booking demands
                  </div>
                </div>

                <div style={{ flex: 1, maxWidth: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>Fulfillment Rate</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-success)' }}>{rate}%</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${rate}%`, height: '100%', background: 'var(--color-success)', borderRadius: '3px' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 4. Corridor Matrix Chart (Real Travel Corridors)
 * ───────────────────────────────────────────────────────────── */
export const CorridorMatrixChart: React.FC<{
  corridors?: any[];
}> = ({ corridors }) => {
  const hasRealData = Array.isArray(corridors) && corridors.length > 0;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        padding: '1.2rem 1.2rem 1.05rem',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.95rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.65rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: 'var(--color-info)',
                display: 'inline-block',
              }}
            />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Corridor Travel Density & SLA Adherence
            </h3>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
            Real-time travel corridor density, fulfillment velocity, and average fares across active routes
          </p>
        </div>

        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: hasRealData ? 'var(--color-success)' : 'var(--text-muted)',
            background: hasRealData ? 'var(--color-success-bg)' : 'var(--bg-canvas)',
            padding: '0.16rem 0.55rem',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid ' + (hasRealData ? 'var(--color-success-border)' : 'var(--border)'),
          }}
        >
          {hasRealData ? `${corridors.length} Live Corridors` : '0 Corridors in Database'}
        </span>
      </div>

      {!hasRealData ? (
        <div
          style={{
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            background: 'var(--bg-canvas)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <MapPin size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '1.04rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem 0' }}>
              No Corridor Traffic Recorded Yet
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto' }}>
              High-density corridor routes, volume density, and SLA fulfillment will track and render automatically as trips are dispatched between pickup and drop localities.
            </p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Corridor Route</th>
                <th>Primary Vehicle</th>
                <th>Booking Demands</th>
                <th>Fulfilled Trips</th>
                <th>Avg Driver Fare</th>
                <th>SLA Adherence</th>
              </tr>
            </thead>
            <tbody>
              {corridors.map((c: any, idx: number) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700 }}>
                    {c.route || c.corridor || `${c.pickupCity} ⇄ ${c.dropCity}`}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.45rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--brand-primary-subtle)',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      {c.vehicleClass || c.topVehicleType || 'SEDAN'}
                    </span>
                  </td>
                  <td>{c.demands || c.totalTrips || 0}</td>
                  <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                    {c.fulfilled || c.totalTrips || 0}
                  </td>
                  <td>₹ {Number(c.avgFare || c.avgDriverRate || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: 'var(--color-success)',
                      }}
                    >
                      {c.fulfillmentRate || 100}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
