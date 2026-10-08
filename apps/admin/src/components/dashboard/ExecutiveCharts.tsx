'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  DollarSign,
  Users,
  Car,
  Building2,
  Layers,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
 * Sparkline Component for KPI Cards
 * ───────────────────────────────────────────────────────────── */
export const KpiSparkline: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}> = ({ data, color = 'var(--brand-primary)', height = 36, width = 110 }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - 4) + 2;
      const y = height - 4 - ((val - min) / range) * (height - 8);
      return `${x},${y}`;
    })
    .join(' ');

  const fillPoints = `${points} ${width - 2},${height} 2,${height}`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill={`url(#grad-${color.replace(/[^a-zA-Z0-9]/g, '')})`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* End point dot */}
      {data.length > 0 && (
        <circle
          cx={(width - 4) + 2}
          cy={height - 4 - ((data[data.length - 1] - min) / range) * (height - 8)}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 1. Revenue & Financial Income Chart
 * ───────────────────────────────────────────────────────────── */
interface RevenueDataPoint {
  label: string;
  gmv: number;
  revenue: number;
  payouts: number;
}

const defaultRevenueData: Record<string, RevenueDataPoint[]> = {
  '7D': [
    { label: 'Mon', gmv: 142000, revenue: 21300, payouts: 120700 },
    { label: 'Tue', gmv: 168000, revenue: 25200, payouts: 142800 },
    { label: 'Wed', gmv: 154000, revenue: 23100, payouts: 130900 },
    { label: 'Thu', gmv: 198000, revenue: 29700, payouts: 168300 },
    { label: 'Fri', gmv: 235000, revenue: 35250, payouts: 199750 },
    { label: 'Sat', gmv: 186000, revenue: 27900, payouts: 158100 },
    { label: 'Sun', gmv: 165500, revenue: 24825, payouts: 140675 },
  ],
  '30D': [
    { label: 'Week 1', gmv: 890000, revenue: 133500, payouts: 756500 },
    { label: 'Week 2', gmv: 1045000, revenue: 156750, payouts: 888250 },
    { label: 'Week 3', gmv: 1180000, revenue: 177000, payouts: 1003000 },
    { label: 'Week 4', gmv: 1248500, revenue: 187275, payouts: 1061225 },
  ],
  '90D': [
    { label: 'Month 1', gmv: 3450000, revenue: 517500, payouts: 2932500 },
    { label: 'Month 2', gmv: 4120000, revenue: 618000, payouts: 3502000 },
    { label: 'Month 3', gmv: 4890000, revenue: 733500, payouts: 4156500 },
  ],
  '1Y': [
    { label: 'Q1', gmv: 8500000, revenue: 1275000, payouts: 7225000 },
    { label: 'Q2', gmv: 10800000, revenue: 1620000, payouts: 9180000 },
    { label: 'Q3', gmv: 13200000, revenue: 1980000, payouts: 11220000 },
    { label: 'Q4 (Est)', gmv: 16500000, revenue: 2475000, payouts: 14025000 },
  ],
};

export const RevenueIncomeChart: React.FC<{
  currentGmv?: number;
  currentRevenue?: number;
}> = ({ currentGmv, currentRevenue }) => {
  const [timeframe, setTimeframe] = useState<'7D' | '30D' | '90D' | '1Y'>('7D');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = defaultRevenueData[timeframe];
  const maxGmv = Math.max(...data.map((d) => d.gmv)) * 1.15;

  const width = 760;
  const height = 260;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getCoordinates = (val: number, idx: number) => {
    const x = paddingLeft + (idx / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (val / maxGmv) * chartHeight;
    return { x, y };
  };

  const gmvPoints = data.map((d, i) => getCoordinates(d.gmv, i));
  const revenuePoints = data.map((d, i) => getCoordinates(d.revenue, i));
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
  const revenuePath = toSvgPath(revenuePoints);
  const payoutPath = toSvgPath(payoutPoints);

  const gmvAreaPath = `${gmvPath} L ${gmvPoints[gmvPoints.length - 1].x},${paddingTop + chartHeight} L ${gmvPoints[0].x},${paddingTop + chartHeight} Z`;

  const totalPeriodGmv = data.reduce((acc, d) => acc + d.gmv, 0);
  const totalPeriodRev = data.reduce((acc, d) => acc + d.revenue, 0);

  const activePoint = hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
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
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Platform Revenue & Income Velocity
            </h3>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--color-success)',
                background: 'var(--color-success-bg)',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--color-success-border)',
              }}
            >
              +18.4% WoW
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
            Gross Booking Value (GMV) vs. Platform Take-Rate (15.0%) & Clearances
          </p>
        </div>

        {/* Timeframe Selector & Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '3px', background: 'var(--brand-primary)', borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Gross GMV</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '3px', background: 'var(--brand-secondary)', borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Take-Rate (Net)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ width: '10px', height: '3px', background: 'var(--color-success)', borderRadius: '2px' }} />
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Driver Payouts</span>
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-canvas)',
              padding: '0.2rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            {(['7D', '30D', '90D', '1Y'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                style={{
                  padding: '0.28rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: timeframe === tf ? 700 : 500,
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: timeframe === tf ? 'var(--bg-surface)' : 'transparent',
                  color: timeframe === tf ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  boxShadow: timeframe === tf ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Tooltip Callout Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          background: 'var(--bg-canvas)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {hoverIndex !== null ? `${activePoint.label} GMV` : 'Period Cumulative GMV'}
          </span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ₹ {(hoverIndex !== null ? activePoint.gmv : totalPeriodGmv).toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--brand-secondary)', fontWeight: 600 }}>
            {hoverIndex !== null ? `${activePoint.label} Net Margin` : 'Net Platform Margin'}
          </span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-secondary)' }}>
            ₹ {(hoverIndex !== null ? activePoint.revenue : totalPeriodRev).toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600 }}>
            Driver Settlement Share (85%)
          </span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-success)' }}>
            ₹ {(hoverIndex !== null ? activePoint.payouts : totalPeriodGmv - totalPeriodRev).toLocaleString('en-IN')}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Platform Take-Rate Efficiency
          </span>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
            15.0% <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-success)' }}>Fixed Tariff</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area Chart */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', minWidth: '600px', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="gmvAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5B42F3" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#5B42F3" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="payoutAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines */}
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
                  stroke="var(--border)"
                  strokeDasharray="4,4"
                  strokeOpacity="0.75"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontFamily="'Inter', sans-serif"
                >
                  {val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : `₹${Math.round(val / 1000)}k`}
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          <path d={gmvAreaPath} fill="url(#gmvAreaGrad)" />

          {/* Main Stroke Lines */}
          <path d={gmvPath} fill="none" stroke="var(--brand-primary)" strokeWidth="3" strokeLinecap="round" />
          <path d={payoutPath} fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3,3" />
          <path d={revenuePath} fill="none" stroke="var(--brand-secondary)" strokeWidth="2.5" strokeLinecap="round" />

          {/* X-Axis Labels & Hover Rects */}
          {data.map((d, i) => {
            const pt = gmvPoints[i];
            const isHovered = hoverIndex === i;
            return (
              <g key={i}>
                {/* Vertical hover line */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={paddingTop}
                    x2={pt.x}
                    y2={paddingTop + chartHeight}
                    stroke="var(--brand-primary)"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />
                )}

                {/* Data Points */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="var(--brand-primary)"
                  strokeWidth={isHovered ? 3 : 2}
                  style={{ transition: 'r 0.15s ease' }}
                />

                <circle
                  cx={revenuePoints[i].x}
                  cy={revenuePoints[i].y}
                  r={isHovered ? 5 : 3.5}
                  fill="#ffffff"
                  stroke="var(--brand-secondary)"
                  strokeWidth="2"
                />

                {/* X-axis label */}
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

                {/* Invisible hover trigger columns */}
                <rect
                  x={pt.x - chartWidth / (data.length * 2)}
                  y={paddingTop}
                  width={chartWidth / data.length}
                  height={chartHeight}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIndex(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 2. Ecosystem Growth Chart (Drivers, Vendors, Users)
 * ───────────────────────────────────────────────────────────── */
interface EcosystemDataPoint {
  period: string;
  drivers: number;
  vendors: number;
  users: number;
}

const defaultEcosystemData: EcosystemDataPoint[] = [
  { period: 'May', drivers: 28, vendors: 6, users: 45 },
  { period: 'Jun', drivers: 42, vendors: 9, users: 78 },
  { period: 'Jul', drivers: 65, vendors: 14, users: 120 },
  { period: 'Aug', drivers: 94, vendors: 21, users: 185 },
  { period: 'Sep', drivers: 138, vendors: 28, users: 260 },
  { period: 'Oct (Live)', drivers: 184, vendors: 36, users: 345 },
];

export const EcosystemGrowthChart: React.FC<{
  totalDrivers?: number;
  totalVendors?: number;
}> = ({ totalDrivers = 184, totalVendors = 36 }) => {
  const [activeSeries, setActiveSeries] = useState<{ drivers: boolean; vendors: boolean; users: boolean }>({
    drivers: true,
    vendors: true,
    users: true,
  });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = defaultEcosystemData;
  const maxVal = Math.max(...data.map((d) => Math.max(d.drivers, d.vendors, d.users))) * 1.15;

  const width = 760;
  const height = 250;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getCoordinates = (val: number, idx: number) => {
    const x = paddingLeft + (idx / (data.length - 1)) * chartWidth;
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
        padding: '1.5rem',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Header */}
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
                background: '#0284C7',
                display: 'inline-block',
              }}
            />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Tri-Party Ecosystem Scaling Velocity
            </h3>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#0284C7',
                background: 'rgba(2, 132, 199, 0.1)',
                padding: '0.15rem 0.5rem',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
              }}
            >
              1.84x Supply Coverage
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
            Active Driver Supply, Logistics Vendors, and Enterprise Clients over time
          </p>
        </div>

        {/* Series Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveSeries((s) => ({ ...s, drivers: !s.drivers }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-pill)',
              border: activeSeries.drivers ? '1px solid #16A34A' : '1px solid var(--border)',
              background: activeSeries.drivers ? 'rgba(22, 163, 74, 0.1)' : 'var(--bg-canvas)',
              color: activeSeries.drivers ? '#16A34A' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Car size={14} />
            <span>Drivers ({data[data.length - 1].drivers})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSeries((s) => ({ ...s, vendors: !s.vendors }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-pill)',
              border: activeSeries.vendors ? '1px solid #FF6200' : '1px solid var(--border)',
              background: activeSeries.vendors ? 'rgba(255, 98, 0, 0.1)' : 'var(--bg-canvas)',
              color: activeSeries.vendors ? '#FF6200' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Building2 size={14} />
            <span>Vendors ({data[data.length - 1].vendors})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSeries((s) => ({ ...s, users: !s.users }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 'var(--radius-pill)',
              border: activeSeries.users ? '1px solid #5B42F3' : '1px solid var(--border)',
              background: activeSeries.users ? 'rgba(91, 66, 243, 0.1)' : 'var(--bg-canvas)',
              color: activeSeries.users ? '#5B42F3' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={14} />
            <span>Clients ({data[data.length - 1].users})</span>
          </button>
        </div>
      </div>

      {/* Snapshot Header */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          padding: '0.65rem 1rem',
          background: 'var(--bg-canvas)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8125rem',
        }}
      >
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Focus Period: </span>
          <strong style={{ color: 'var(--text-primary)' }}>{activePoint.period}</strong>
        </div>
        <div>
          <span style={{ color: '#16A34A' }}>● Active Drivers: </span>
          <strong>{activePoint.drivers}</strong>
        </div>
        <div>
          <span style={{ color: '#FF6200' }}>● Transport Vendors: </span>
          <strong>{activePoint.vendors}</strong>
        </div>
        <div>
          <span style={{ color: '#5B42F3' }}>● Corporate Clients: </span>
          <strong>{activePoint.users}</strong>
        </div>
        <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>
          Supply/Demand Health: <strong style={{ color: 'var(--color-success)' }}>Optimal (98.4%)</strong>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', minWidth: '600px', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHoverIndex(null)}
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
                  stroke="var(--border)"
                  strokeDasharray="4,4"
                  strokeOpacity="0.75"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
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

          {/* Paths */}
          {activeSeries.users && (
            <path d={toSvgPath(userPoints)} fill="none" stroke="#5B42F3" strokeWidth="2.8" strokeLinecap="round" />
          )}
          {activeSeries.drivers && (
            <path d={toSvgPath(driverPoints)} fill="none" stroke="#16A34A" strokeWidth="2.8" strokeLinecap="round" />
          )}
          {activeSeries.vendors && (
            <path d={toSvgPath(vendorPoints)} fill="none" stroke="#FF6200" strokeWidth="2.8" strokeLinecap="round" />
          )}

          {/* Points & Hover lines */}
          {data.map((d, i) => {
            const isHovered = hoverIndex === i;
            const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
            return (
              <g key={i}>
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={paddingTop + chartHeight}
                    stroke="var(--brand-primary)"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />
                )}

                {activeSeries.users && (
                  <circle
                    cx={userPoints[i].x}
                    cy={userPoints[i].y}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#ffffff"
                    stroke="#5B42F3"
                    strokeWidth="2"
                  />
                )}
                {activeSeries.drivers && (
                  <circle
                    cx={driverPoints[i].x}
                    cy={driverPoints[i].y}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#ffffff"
                    stroke="#16A34A"
                    strokeWidth="2"
                  />
                )}
                {activeSeries.vendors && (
                  <circle
                    cx={vendorPoints[i].x}
                    cy={vendorPoints[i].y}
                    r={isHovered ? 5.5 : 3.5}
                    fill="#ffffff"
                    stroke="#FF6200"
                    strokeWidth="2"
                  />
                )}

                <text
                  x={x}
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
                  x={x - chartWidth / (data.length * 2)}
                  y={paddingTop}
                  width={chartWidth / data.length}
                  height={chartHeight}
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoverIndex(i)}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 3. Fleet Vehicle Category Demand & Fulfillment Breakdown
 * ───────────────────────────────────────────────────────────── */
interface CategoryStat {
  category: string;
  demands: number;
  fulfilled: number;
  rate: number;
  avgFare: number;
}

const defaultCategoryStats: CategoryStat[] = [
  { category: 'SEDAN', demands: 148, fulfilled: 144, rate: 97.3, avgFare: 1450 },
  { category: 'SUV', demands: 96, fulfilled: 92, rate: 95.8, avgFare: 2200 },
  { category: 'TEMPO_TRAVELLER', demands: 34, fulfilled: 33, rate: 97.1, avgFare: 4800 },
  { category: 'BUS', demands: 18, fulfilled: 18, rate: 100.0, avgFare: 8500 },
  { category: 'TATA_ACE', demands: 42, fulfilled: 41, rate: 97.6, avgFare: 1650 },
  { category: 'HATCHBACK', demands: 68, fulfilled: 66, rate: 97.0, avgFare: 1100 },
];

export const FleetCategoryDistributionChart: React.FC<{
  categories?: any[];
}> = ({ categories }) => {
  const data = (categories && categories.length > 0) ? categories.map((c) => ({
    category: c.category || c.vehicleType || 'SEDAN',
    demands: c.demands || 10,
    fulfilled: Math.round((c.demands || 10) * ((c.rate || 95) / 100)),
    rate: c.rate || 95,
    avgFare: c.avgFare || 1800,
  })) : defaultCategoryStats;

  const maxDemands = Math.max(...data.map((d) => d.demands)) * 1.15;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--brand-secondary)',
                display: 'inline-block',
              }}
            />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Fleet Category Demand & Fulfillment Health
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
            Corporate volume requested vs. guaranteed assignments dispatched
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', background: 'var(--brand-primary)', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Demand Volume</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', background: 'var(--color-success)', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Fulfilled Rides</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {data.map((cat, idx) => {
          const demandPct = Math.round((cat.demands / maxDemands) * 100);
          const fulfilledPct = Math.round((cat.fulfilled / maxDemands) * 100);
          const formattedLabel = cat.category.replace('_', ' ');

          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formattedLabel}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Avg Ticket: <strong style={{ color: 'var(--text-primary)' }}>₹ {cat.avgFare.toLocaleString('en-IN')}</strong>
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--color-success)',
                      background: 'var(--color-success-bg)',
                      padding: '0.1rem 0.45rem',
                      borderRadius: 'var(--radius-pill)',
                    }}
                  >
                    {cat.rate}% SLA
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {cat.fulfilled} / {cat.demands} Cabs
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div
                style={{
                  height: '10px',
                  width: '100%',
                  background: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-pill)',
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid var(--border)',
                }}
              >
                {/* Demand Background Bar */}
                <div
                  style={{
                    height: '100%',
                    width: `${demandPct}%`,
                    background: 'var(--brand-primary-subtle)',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                />
                {/* Fulfilled Solid Bar */}
                <div
                  style={{
                    height: '100%',
                    width: `${fulfilledPct}%`,
                    background: 'linear-gradient(90deg, #5B42F3 0%, #16A34A 100%)',
                    borderRadius: 'var(--radius-pill)',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
 * 4. High-Density Corridors & Zonal Route Density
 * ───────────────────────────────────────────────────────────── */
interface CorridorRow {
  route: string;
  vehicleClass: string;
  demands: number;
  fulfilled: number;
  avgFare: number;
  fulfillmentRate: number;
}

const defaultCorridors: CorridorRow[] = [
  {
    route: 'Gurugram Cyber City ⇄ Noida Sector 62',
    vehicleClass: 'SEDAN',
    demands: 84,
    fulfilled: 82,
    avgFare: 1650,
    fulfillmentRate: 97.6,
  },
  {
    route: 'Delhi IGI Airport T3 ⇄ Gurugram Horizon',
    vehicleClass: 'SUV',
    demands: 62,
    fulfilled: 61,
    avgFare: 2400,
    fulfillmentRate: 98.4,
  },
  {
    route: 'HITEC City ⇄ Nanakramguda Financial District',
    vehicleClass: 'SEDAN',
    demands: 58,
    fulfilled: 58,
    avgFare: 850,
    fulfillmentRate: 100.0,
  },
  {
    route: 'Delhi ⇄ Agra Industrial Corridor',
    vehicleClass: 'TEMPO_TRAVELLER',
    demands: 24,
    fulfilled: 23,
    avgFare: 6200,
    fulfillmentRate: 95.8,
  },
  {
    route: 'Faridabad Industrial ⇄ Okhla Phase III',
    vehicleClass: 'TATA_ACE',
    demands: 38,
    fulfilled: 37,
    avgFare: 1550,
    fulfillmentRate: 97.4,
  },
];

export const CorridorMatrixChart: React.FC<{
  corridors?: any[];
}> = ({ corridors }) => {
  const data = (corridors && corridors.length > 0)
    ? corridors.map((c) => ({
        route: c.route || `${c.pickupCity || 'City A'} ⇄ ${c.dropCity || 'City B'}`,
        vehicleClass: c.vehicleClass || c.topVehicleType || 'SEDAN',
        demands: c.demands || c.totalTrips || 10,
        fulfilled: c.fulfilled || c.totalTrips || 10,
        avgFare: c.avgFare || c.avgDriverRate || 1800,
        fulfillmentRate: c.fulfillmentRate || 98.0,
      }))
    : defaultCorridors;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#8B5CF6',
                display: 'inline-block',
              }}
            />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              High-Density Corridor Intelligence
            </h3>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
            Top enterprise commuter and outstation freight routes
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>HIGHWAY / CORRIDOR</th>
              <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>PRIMARY CLASS</th>
              <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>TRIP VOLUME</th>
              <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700 }}>AVG FARE</th>
              <th style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>FULFILLMENT SLA</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: i === data.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                  transition: 'background 0.15s ease',
                }}
              >
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {c.route}
                </td>
                <td style={{ padding: '0.75rem 0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-canvas)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {c.vehicleClass}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {c.demands} Trips
                </td>
                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  ₹ {c.avgFare.toLocaleString('en-IN')}
                </td>
                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: 'var(--color-success)',
                      background: 'var(--color-success-bg)',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--color-success-border)',
                    }}
                  >
                    {c.fulfillmentRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
