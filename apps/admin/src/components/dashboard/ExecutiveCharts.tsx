"use client";

import React, { useState } from "react";
import { Car, MapPin } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
 * Sparkline Component for KPI Cards (Real Data Plotter)
 * ───────────────────────────────────────────────────────────── */
export const KpiSparkline: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}> = ({ data, color = "var(--text-brand)", height = 36, width = 110 }) => {
  if (!data || data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const isAllZero = min === 0 && max === 0;
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / Math.max(1, data.length - 1)) * (width - 4) + 2;
      const y = isAllZero
        ? height - 6
        : height - 4 - ((val - min) / range) * (height - 8);
      return `${x},${y}`;
    })
    .join(" ");

  const fillPoints = `${points} ${width - 2},${height} 2,${height}`;
  const gradId = `grad-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      width={width}
      height={height}
      className="flex-shrink-0"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={color}
            stopOpacity={isAllZero ? 0.05 : 0.28}
          />
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
        strokeDasharray={isAllZero ? "3 3" : "none"}
        points={points}
      />
      {data.length > 0 && (
        <circle
          cx={width - 2}
          cy={
            isAllZero
              ? height - 6
              : height -
                4 -
                ((data[data.length - 1] - min) / range) * (height - 8)
          }
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
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "90D" | "1Y">("7D");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const data = timeSeriesData?.[timeframe] ?? [];
  if (data.length === 0) {
    return (
      <div
        className="bg-surface rounded-xl border shadow-card"
        style={{ padding: "1.2rem 1.2rem 1.05rem" }}
      >
        <h3 className="m-0 text-title-sm font-bold text-primary">
          Historical Financial Activity
        </h3>
        <p
          className="text-control text-secondary"
          style={{ margin: "0.35rem 0 0" }}
        >
          Date-bucketed financial history is unavailable. No trend is shown
          until actual payment, ledger, and settlement history is provided.
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
    }, "");
  };

  const gmvPath = toSvgPath(gmvPoints);
  const payoutPath = toSvgPath(payoutPoints);
  const gmvAreaPath = `${gmvPath} L ${gmvPoints[gmvPoints.length - 1].x},${paddingTop + chartHeight} L ${gmvPoints[0].x},${paddingTop + chartHeight} Z`;

  const totalPeriodGmv = data.reduce((acc, d) => acc + d.gmv, 0);
  const totalPeriodPayouts = data.reduce((acc, d) => acc + d.payouts, 0);

  const activePoint =
    hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  return (
    <div
      className="bg-surface rounded-xl border shadow-card flex flex-col gap-wide"
      style={{ padding: "1.2rem 1.2rem 1.05rem" }}
    >
      {/* Chart Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="rounded-full bg-brand inline-block"
              style={{ width: "8px", height: "8px" }}
            />
            <h3 className="text-title-sm font-bold text-primary m-0">
              Booking Volume & Driver Payouts
            </h3>
            <span
              className="font-bold text-success bg-success-subtle rounded-full"
              style={{
                fontSize: "0.67rem",
                padding: "0.12rem 0.45rem",
                border: "1px solid var(--color-success-border)",
              }}
            >
              Recorded period data
            </span>
          </div>
          <p className="text-control text-secondary m-0">
            Gross booking value and settled driver payouts
          </p>
        </div>

        {/* Timeframe Toggle Buttons */}
        <div
          className="flex items-center bg-base border rounded-lg"
          style={{ padding: "0.16rem" }}
        >
          {(["7D", "30D", "90D", "1Y"] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => {
                setTimeframe(tf);
                setHoverIndex(null);
              }}
              className="rounded-md border-0 cursor-pointer"
              style={{
                padding: "0.26rem 0.68rem",
                fontSize: "0.71rem",
                fontWeight: timeframe === tf ? 800 : 600,
                color: timeframe === tf ? "#ffffff" : "var(--text-secondary)",
                background:
                  timeframe === tf ? "var(--brand-primary)" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Real Metric Highlights */}
      <div
        className="grid gap-3 bg-base rounded-lg border border-subtle"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
          padding: "0.75rem 0.85rem",
        }}
      >
        <div>
          <div
            className="text-muted font-bold uppercase"
            style={{ fontSize: "0.67rem" }}
          >
            Period GMV
          </div>
          <div className="text-title-md font-extrabold text-brand mt-snug">
            ₹ {totalPeriodGmv.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <div
            className="text-muted font-bold uppercase"
            style={{ fontSize: "0.67rem" }}
          >
            Driver Payouts
          </div>
          <div className="text-title-md font-extrabold text-success mt-snug">
            ₹ {totalPeriodPayouts.toLocaleString("en-IN")}
          </div>
        </div>
        <div>
          <div
            className="text-muted font-bold uppercase"
            style={{ fontSize: "0.67rem" }}
          >
            Status
          </div>
          <div className="text-body-md font-bold text-secondary mt-1">
            {data.length} recorded periods
          </div>
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full block"
          style={{ height: "auto", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="gmvAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-chart-purple)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--brand-chart-purple)" stopOpacity="0.0" />
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
                  ₹
                  {val >= 100000
                    ? `${(val / 100000).toFixed(1)}L`
                    : val >= 1000
                      ? `${(val / 1000).toFixed(0)}k`
                      : val}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={gmvAreaPath} fill="url(#gmvAreaGrad)" />

          {/* Lines */}
          <path
            d={gmvPath}
            fill="none"
            stroke="var(--brand-chart-purple)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={payoutPath}
            fill="none"
            stroke="#16A34A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="3 3"
          />

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
                    stroke="var(--text-brand)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5 : 3}
                  fill="var(--brand-chart-purple)"
                />
                <circle
                  cx={payoutPoints[i].x}
                  cy={payoutPoints[i].y}
                  r={isHovered ? 5 : 2.5}
                  fill="#16A34A"
                />

                <text
                  x={pt.x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? "700" : "500"}
                  fill={isHovered ? "var(--text-primary)" : "var(--text-muted)"}
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
                  className="cursor-pointer"
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
            className="absolute bg-surface-elevated border rounded-lg shadow-card text-sm flex flex-col gap-tight pointer-events-none"
            style={{
              top: "10px",
              right: "20px",
              padding: "0.65rem 0.95rem",
              zIndex: 10,
            }}
          >
            <div className="font-extrabold text-primary border-b border-subtle pb-1">
              {activePoint.label} Activity
            </div>
            <div
              className="flex justify-between gap-4 font-bold"
              style={{ color: "var(--brand-chart-purple)" }}
            >
              <span>Booking volume:</span>
              <span>₹ {activePoint.gmv.toLocaleString("en-IN")}</span>
            </div>
            <div
              className="flex justify-between gap-4 font-bold"
              style={{ color: "#16A34A" }}
            >
              <span>Settled payouts:</span>
              <span>₹ {activePoint.payouts.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        className="flex items-center justify-center flex-wrap pt-2 border-t border-subtle"
        style={{ gap: "1.75rem" }}
      >
        <div className="flex items-center gap-snug text-compact text-secondary">
          <span
            className="inline-block"
            style={{
              width: "12px",
              height: "3px",
              background: "var(--brand-chart-purple)",
              borderRadius: "2px",
            }}
          />
          <span>Gross Booking Value (GMV)</span>
        </div>
        <div className="flex items-center gap-snug text-compact text-secondary">
          <span
            className="inline-block"
            style={{
              width: "12px",
              height: "3px",
              background: "#16A34A",
              borderRadius: "2px",
            }}
          />
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
  const [activeSeries, setActiveSeries] = useState<{
    drivers: boolean;
    vendors: boolean;
    users: boolean;
  }>({
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
            period: "Platform Genesis",
            drivers: Math.max(0, totalDrivers > 0 ? 1 : 0),
            vendors: Math.max(0, totalVendors > 0 ? 1 : 0),
            users: Math.max(0, totalUsers > 0 ? 2 : 0),
          },
          {
            period: "Active Fleet",
            drivers: totalDrivers,
            vendors: totalVendors,
            users: totalUsers,
          },
          {
            period: "Live Verified",
            drivers: totalDrivers,
            vendors: totalVendors,
            users: totalUsers,
          },
        ];

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.drivers, d.vendors, d.users)),
    5,
  );

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
    }, "");
  };

  const activePoint =
    hoverIndex !== null ? data[hoverIndex] : data[data.length - 1];

  return (
    <div
      className="bg-surface rounded-xl border shadow-card flex flex-col gap-wide"
      style={{ padding: "1.2rem 1.2rem 1.05rem" }}
    >
      {/* Header & Series Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div
            className="flex items-center gap-snug"
            style={{ marginBottom: "0.2rem" }}
          >
            <span
              className="rounded-full inline-block"
              style={{
                width: "7px",
                height: "7px",
                background: "var(--color-success)",
              }}
            />
            <h3 className="text-title-sm font-bold text-primary m-0">
              Ecosystem Growth & Scaling Velocity
            </h3>
          </div>
          <p className="text-control text-secondary m-0">
            Real-time supply and demand scaling: Verified Drivers, Corporate
            Vendors & Platform Accounts
          </p>
        </div>

        {/* Series Filter Toggles */}
        <div className="flex gap-compact flex-wrap">
          <button
            type="button"
            onClick={() =>
              setActiveSeries((s) => ({ ...s, drivers: !s.drivers }))
            }
            className="flex items-center rounded-full font-bold cursor-pointer"
            style={{
              gap: "0.3rem",
              padding: "0.26rem 0.62rem",
              border: activeSeries.drivers
                ? "1px solid var(--color-success)"
                : "1px solid var(--border)",
              background: activeSeries.drivers
                ? "var(--color-success-bg)"
                : "transparent",
              color: activeSeries.drivers
                ? "var(--color-success)"
                : "var(--text-muted)",
              fontSize: "0.71rem",
            }}
          >
            <span>Drivers ({totalDrivers})</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveSeries((s) => ({ ...s, vendors: !s.vendors }))
            }
            className="flex items-center rounded-full font-bold cursor-pointer"
            style={{
              gap: "0.3rem",
              padding: "0.26rem 0.62rem",
              border: activeSeries.vendors
                ? "1px solid var(--brand-secondary)"
                : "1px solid var(--border)",
              background: activeSeries.vendors
                ? "var(--brand-orange-subtle)"
                : "transparent",
              color: activeSeries.vendors
                ? "var(--brand-secondary)"
                : "var(--text-muted)",
              fontSize: "0.71rem",
            }}
          >
            <span>Vendors ({totalVendors})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSeries((s) => ({ ...s, users: !s.users }))}
            className="flex items-center rounded-full font-bold cursor-pointer"
            style={{
              gap: "0.3rem",
              padding: "0.26rem 0.62rem",
              border: activeSeries.users
                ? "1px solid var(--border-focus)"
                : "1px solid var(--border)",
              background: activeSeries.users
                ? "var(--brand-primary-subtle)"
                : "transparent",
              color: activeSeries.users
                ? "var(--text-brand)"
                : "var(--text-muted)",
              fontSize: "0.71rem",
            }}
          >
            <span>Users ({totalUsers})</span>
          </button>
        </div>
      </div>

      {/* SVG Multi-Line Chart Canvas */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full block"
          style={{ height: "auto", overflow: "visible" }}
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
            <path
              d={toSvgPath(driverPoints)}
              fill="none"
              stroke="#16A34A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}
          {activeSeries.vendors && (
            <path
              d={toSvgPath(vendorPoints)}
              fill="none"
              stroke="#FF6200"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}
          {activeSeries.users && (
            <path
              d={toSvgPath(userPoints)}
              fill="none"
              stroke="var(--brand-chart-purple)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
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
                {activeSeries.drivers && (
                  <circle
                    cx={driverPoints[i].x}
                    cy={driverPoints[i].y}
                    r={isHovered ? 5 : 3}
                    fill="#16A34A"
                  />
                )}
                {activeSeries.vendors && (
                  <circle
                    cx={vendorPoints[i].x}
                    cy={vendorPoints[i].y}
                    r={isHovered ? 5 : 3}
                    fill="#FF6200"
                  />
                )}
                {activeSeries.users && (
                  <circle
                    cx={userPoints[i].x}
                    cy={userPoints[i].y}
                    r={isHovered ? 5 : 3}
                    fill="var(--brand-chart-purple)"
                  />
                )}

                <text
                  x={driverPoints[i].x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={isHovered ? "700" : "500"}
                  fill={isHovered ? "var(--text-primary)" : "var(--text-muted)"}
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
                  className="cursor-pointer"
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
            className="absolute bg-surface-elevated border rounded-lg shadow-card text-sm flex flex-col gap-tight pointer-events-none"
            style={{
              top: "10px",
              right: "20px",
              padding: "0.65rem 0.95rem",
              zIndex: 10,
            }}
          >
            <div className="font-extrabold text-primary border-b border-subtle pb-1">
              {activePoint.period} Participant Census
            </div>
            {activeSeries.drivers && (
              <div
                className="flex justify-between gap-4 font-bold"
                style={{ color: "#16A34A" }}
              >
                <span>Verified Drivers:</span>
                <span>{activePoint.drivers}</span>
              </div>
            )}
            {activeSeries.vendors && (
              <div
                className="flex justify-between gap-4 font-bold"
                style={{ color: "#FF6200" }}
              >
                <span>Corporate Vendors:</span>
                <span>{activePoint.vendors}</span>
              </div>
            )}
            {activeSeries.users && (
              <div
                className="flex justify-between gap-4 font-bold"
                style={{ color: "var(--brand-chart-purple)" }}
              >
                <span>Platform Accounts:</span>
                <span>{activePoint.users}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards with Real Data */}
      <div
        className="grid gap-4 pt-2 border-t border-subtle"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        <div
          className="rounded-md bg-success-subtle"
          style={{ padding: "0.6rem 0.8rem" }}
        >
          <div
            className="text-success font-bold uppercase"
            style={{ fontSize: "0.67rem" }}
          >
            Verified Drivers
          </div>
          <div className="text-title-md font-extrabold text-success mt-snug">
            {totalDrivers} Active
          </div>
        </div>
        <div
          className="rounded-md"
          style={{
            padding: "0.6rem 0.8rem",
            background: "var(--brand-orange-subtle)",
          }}
        >
          <div
            className="font-bold uppercase"
            style={{ fontSize: "0.67rem", color: "var(--brand-secondary)" }}
          >
            Corporate Vendors
          </div>
          <div
            className="text-title-md font-extrabold mt-snug"
            style={{ color: "var(--brand-secondary)" }}
          >
            {totalVendors} Registered
          </div>
        </div>
        <div
          className="rounded-md bg-brand-subtle"
          style={{ padding: "0.6rem 0.8rem" }}
        >
          <div
            className="text-brand font-bold uppercase"
            style={{ fontSize: "0.67rem" }}
          >
            Total User Accounts
          </div>
          <div className="text-title-md font-extrabold text-brand mt-snug">
            {totalUsers} Accounts
          </div>
        </div>
        <div
          className="rounded-md bg-base"
          style={{ padding: "0.6rem 0.8rem" }}
        >
          <div
            className="text-muted font-bold uppercase"
            style={{ fontSize: "0.67rem" }}
          >
            Liquidity Ratio
          </div>
          <div className="text-title-md font-extrabold text-primary mt-snug">
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
      className="bg-surface rounded-xl border shadow-card flex flex-col gap-wide"
      style={{ padding: "1.2rem 1.2rem 1.05rem" }}
    >
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "0.65rem" }}
      >
        <div>
          <div
            className="flex items-center gap-snug"
            style={{ marginBottom: "0.2rem" }}
          >
            <span
              className="rounded-full inline-block"
              style={{
                width: "7px",
                height: "7px",
                background: "var(--brand-secondary)",
              }}
            />
            <h3 className="text-title-sm font-bold text-primary m-0">
              Fleet Category Demand & Fulfillment Health
            </h3>
          </div>
          <p className="text-control text-secondary m-0">
            Live vehicle volume requirements across categories from active
            marketplace bookings
          </p>
        </div>

        <span
          className="text-micro font-bold rounded-full"
          style={{
            color: hasRealData ? "var(--color-success)" : "var(--text-muted)",
            background: hasRealData
              ? "var(--color-success-bg)"
              : "var(--bg-canvas)",
            padding: "0.16rem 0.55rem",
            border:
              "1px solid " +
              (hasRealData ? "var(--color-success-border)" : "var(--border)"),
          }}
        >
          {hasRealData
            ? `${categories.length} Active Categories`
            : "0 Demands in Database"}
        </span>
      </div>

      {!hasRealData ? (
        <div
          className="text-center bg-base rounded-lg flex flex-col items-center justify-center gap-3"
          style={{
            padding: "3.5rem 1.5rem",
            border: "1px dashed var(--border)",
          }}
        >
          <div
            className="rounded-full bg-surface-elevated flex items-center justify-center text-muted"
            style={{ width: "48px", height: "48px" }}
          >
            <Car size={24} />
          </div>
          <div>
            <h4
              className="font-bold text-primary mt-0 mr-0 mb-1 ml-0"
              style={{ fontSize: "1.04rem" }}
            >
              No Category Demands Recorded Yet
            </h4>
            <p
              className="text-base text-secondary my-0 mx-auto"
              style={{ maxWidth: "440px" }}
            >
              Fleet demand distribution will track every active vehicle category
              as corporate clients post ride requirements.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {categories.map((c: any, idx: number) => {
            const categoryName = c.category || c.vehicleType || "Unspecified";
            const demands = Number(c.demands || 0);
            const rate = Number(c.rate || 0);
            return (
              <div
                key={idx}
                className="p-4 rounded-lg bg-base border border-subtle flex items-center justify-between gap-4"
              >
                <div style={{ minWidth: "120px" }}>
                  <div className="font-extrabold text-md text-primary">
                    {categoryName}
                  </div>
                  <div className="text-label text-muted">
                    {demands} total booking demands
                  </div>
                </div>

                <div className="flex-1" style={{ maxWidth: "300px" }}>
                  <div className="flex justify-between text-label text-secondary mb-1">
                    <span>Fulfillment Rate</span>
                    <span className="font-extrabold text-success">{rate}%</span>
                  </div>
                  <div
                    className="overflow-hidden"
                    style={{
                      height: "6px",
                      background: "var(--border)",
                      borderRadius: "3px",
                    }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${rate}%`,
                        background: "var(--color-success)",
                        borderRadius: "3px",
                      }}
                    />
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
      className="bg-surface rounded-xl border shadow-card flex flex-col gap-wide"
      style={{ padding: "1.2rem 1.2rem 1.05rem" }}
    >
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ gap: "0.65rem" }}
      >
        <div>
          <div
            className="flex items-center gap-snug"
            style={{ marginBottom: "0.2rem" }}
          >
            <span
              className="rounded-full inline-block"
              style={{
                width: "7px",
                height: "7px",
                background: "var(--color-info)",
              }}
            />
            <h3 className="text-title-sm font-bold text-primary m-0">
              Corridor Travel Density & SLA Adherence
            </h3>
          </div>
          <p className="text-control text-secondary m-0">
            Real-time travel corridor density, fulfillment velocity, and average
            fares across active routes
          </p>
        </div>

        <span
          className="text-micro font-bold rounded-full"
          style={{
            color: hasRealData ? "var(--color-success)" : "var(--text-muted)",
            background: hasRealData
              ? "var(--color-success-bg)"
              : "var(--bg-canvas)",
            padding: "0.16rem 0.55rem",
            border:
              "1px solid " +
              (hasRealData ? "var(--color-success-border)" : "var(--border)"),
          }}
        >
          {hasRealData
            ? `${corridors.length} Live Corridors`
            : "0 Corridors in Database"}
        </span>
      </div>

      {!hasRealData ? (
        <div
          className="text-center bg-base rounded-lg flex flex-col items-center justify-center gap-3"
          style={{
            padding: "3.5rem 1.5rem",
            border: "1px dashed var(--border)",
          }}
        >
          <div
            className="rounded-full bg-surface-elevated flex items-center justify-center text-muted"
            style={{ width: "48px", height: "48px" }}
          >
            <MapPin size={24} />
          </div>
          <div>
            <h4
              className="font-bold text-primary mt-0 mr-0 mb-1 ml-0"
              style={{ fontSize: "1.04rem" }}
            >
              No Corridor Traffic Recorded Yet
            </h4>
            <p
              className="text-base text-secondary my-0 mx-auto"
              style={{ maxWidth: "440px" }}
            >
              High-density corridor routes, volume density, and SLA fulfillment
              will track and render automatically as trips are dispatched
              between pickup and drop localities.
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
                  <td className="font-bold">
                    {c.route || c.corridor || `${c.pickupCity} ⇄ ${c.dropCity}`}
                  </td>
                  <td>
                    <span
                      className="text-xs font-bold rounded-sm bg-brand-subtle text-brand"
                      style={{ padding: "0.1rem 0.45rem" }}
                    >
                      {c.vehicleClass || c.topVehicleType || "Unspecified"}
                    </span>
                  </td>
                  <td>{c.demands || c.totalTrips || 0}</td>
                  <td className="text-success font-bold">
                    {c.fulfilled || c.totalTrips || 0}
                  </td>
                  <td>
                    ₹{" "}
                    {Number(c.avgFare || c.avgDriverRate || 0).toLocaleString(
                      "en-IN",
                    )}
                  </td>
                  <td>
                    <span className="text-label font-extrabold text-success">
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
