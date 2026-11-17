"use client";

import React, { useState } from "react";
import {
  FinanceTimeSeriesPoint,
  FinanceRevenueBreakdownItem,
} from "../../lib/api/types";

export const formatINR = (val: number | string | undefined | null): string => {
  if (val == null) return "₹0";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || !isFinite(num)) return "₹0";
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
};

export const FinanceSparkline: React.FC<{
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}> = ({ data, color = "var(--text-brand)", height = 34, width = 110 }) => {
  const safeData = data && data.length > 0 ? data : [0, 0, 0, 0, 0];
  const min = Math.min(...safeData);
  const max = Math.max(...safeData);
  const isAllZero = min === 0 && max === 0;
  const range = max - min || 1;

  const points = safeData
    .map((val, idx) => {
      const x = (idx / Math.max(1, safeData.length - 1)) * (width - 4) + 2;
      const y = isAllZero
        ? height - 6
        : height - 4 - ((val - min) / range) * (height - 8);
      return `${x},${y}`;
    })
    .join(" ");

  const fillPoints = `${points} ${width - 2},${height} 2,${height}`;
  const gradId = `sparkline-grad-${color.replace(/[^a-zA-Z0-9]/g, "")}`;

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
      {safeData.length > 0 && (
        <circle
          cx={width - 2}
          cy={
            isAllZero
              ? height - 6
              : height -
                4 -
                ((safeData[safeData.length - 1] - min) / range) * (height - 8)
          }
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
};

export const FinanceAreaChart: React.FC<{
  points: FinanceTimeSeriesPoint[];
  title?: string;
  selectedMetric?: "ALL" | "DRIVER" | "REVENUE";
  onMetricChange?: (metric: "ALL" | "DRIVER" | "REVENUE") => void;
}> = ({
  points = [],
  title = "Revenue & Driver Payouts",
  selectedMetric = "ALL",
  onMetricChange,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const safePoints =
    points && points.length > 0
      ? points
      : [
          { label: "Day 1", revenue: 0, driverEarnings: 0, transactions: 0 },
          { label: "Day 2", revenue: 0, driverEarnings: 0, transactions: 0 },
          { label: "Day 3", revenue: 0, driverEarnings: 0, transactions: 0 },
        ];

  const maxVal = Math.max(
    ...safePoints.map((p) => Math.max(p.revenue || 0, p.driverEarnings || 0)),
    100,
  );

  const width = 840;
  const height = 225;
  const paddingLeft = 65;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getCoordinates = (val: number, idx: number) => {
    const x =
      paddingLeft + (idx / Math.max(1, safePoints.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
    return { x, y };
  };

  const toSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`;
    return pts.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x},${curr.y}`;
      const prev = arr[idx - 1];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }, "");
  };

  const revCoords = safePoints.map((p, i) => getCoordinates(p.revenue || 0, i));
  const driverCoords = safePoints.map((p, i) =>
    getCoordinates(p.driverEarnings || 0, i),
  );

  const revPath = toSmoothPath(revCoords);
  const driverPath = toSmoothPath(driverCoords);

  const revArea = `${revPath} L ${revCoords[revCoords.length - 1].x},${paddingTop + chartHeight} L ${revCoords[0].x},${paddingTop + chartHeight} Z`;
  const driverArea = `${driverPath} L ${driverCoords[driverCoords.length - 1].x},${paddingTop + chartHeight} L ${driverCoords[0].x},${paddingTop + chartHeight} Z`;

  const hoveredPoint =
    hoverIndex !== null && safePoints[hoverIndex]
      ? safePoints[hoverIndex]
      : null;

  return (
    <div
      className="bg-card border border-subtle rounded-lg shadow-card flex flex-col"
      style={{ padding: "1.2rem 1.2rem 1rem", gap: "0.8rem" }}
    >
      <div
        className="flex justify-between items-center flex-wrap"
        style={{ gap: "0.65rem" }}
      >
        <div>
          <h3
            className="font-bold text-primary m-0"
            style={{ fontSize: "1.06rem" }}
          >
            {title}
          </h3>
          <p
            className="text-muted"
            style={{ fontSize: "0.73rem", margin: "0.15rem 0 0 0" }}
          >
            Interactive view of booking revenue and rate-card driver payouts
          </p>
        </div>

        {onMetricChange && (
          <div
            className="flex bg-base rounded-md border border-subtle"
            style={{ gap: "0.28rem", padding: "0.16rem" }}
          >
            {(
              [
                { id: "ALL", label: "All Streams" },
                { id: "REVENUE", label: "Gross GMV" },
                { id: "DRIVER", label: "Driver Earnings" },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => onMetricChange(btn.id)}
                className="rounded-sm text-caption border-0 cursor-pointer"
                style={{
                  padding: "0.24rem 0.56rem",
                  fontWeight: selectedMetric === btn.id ? 700 : 500,
                  background:
                    selectedMetric === btn.id
                      ? "var(--bg-card)"
                      : "transparent",
                  color:
                    selectedMetric === btn.id
                      ? "var(--text-brand)"
                      : "var(--text-muted)",
                  boxShadow:
                    selectedMetric === btn.id ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full block"
          style={{ height: "auto", minWidth: "600px" }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="grad-driver" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                  opacity="0.8"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontWeight="500"
                >
                  {formatINR(val)}
                </text>
              </g>
            );
          })}

          {/* Area & Line for Revenue */}
          {(selectedMetric === "ALL" || selectedMetric === "REVENUE") && (
            <>
              <path d={revArea} fill="url(#grad-revenue)" />
              <path
                d={revPath}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </>
          )}

          {/* Area & Line for Driver Payouts */}
          {(selectedMetric === "ALL" || selectedMetric === "DRIVER") && (
            <>
              <path d={driverArea} fill="url(#grad-driver)" />
              <path
                d={driverPath}
                fill="none"
                stroke="#16A34A"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </>
          )}

          {/* X Axis Labels */}
          {safePoints.map((pt, idx) => {
            const { x } = getCoordinates(0, idx);
            // Skip labels if too crowded
            const showLabel =
              safePoints.length <= 10 ||
              idx % Math.ceil(safePoints.length / 8) === 0 ||
              idx === safePoints.length - 1;
            if (!showLabel) return null;
            return (
              <text
                key={idx}
                x={x}
                y={height - 12}
                textAnchor="middle"
                fontSize="10.5"
                fill="var(--text-muted)"
                fontWeight="500"
              >
                {pt.label}
              </text>
            );
          })}

          {/* Interactive Hover Hit Zones */}
          {safePoints.map((pt, idx) => {
            const { x } = getCoordinates(0, idx);
            const colWidth = chartWidth / safePoints.length;
            return (
              <rect
                key={idx}
                x={x - colWidth / 2}
                y={paddingTop}
                width={colWidth}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}

          {/* Active Hover Line and Circles */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={revCoords[hoverIndex].x}
                y1={paddingTop}
                x2={revCoords[hoverIndex].x}
                y2={paddingTop + chartHeight}
                stroke="var(--text-brand)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {(selectedMetric === "ALL" || selectedMetric === "REVENUE") && (
                <circle
                  cx={revCoords[hoverIndex].x}
                  cy={revCoords[hoverIndex].y}
                  r="5"
                  fill="#2563EB"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              )}
              {(selectedMetric === "ALL" || selectedMetric === "DRIVER") && (
                <circle
                  cx={driverCoords[hoverIndex].x}
                  cy={driverCoords[hoverIndex].y}
                  r="5"
                  fill="#16A34A"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              )}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && hoverIndex !== null && (
          <div
            className="absolute bg-card border rounded-md shadow-elevated pointer-events-none flex flex-col"
            style={{
              top: "12px",
              left: `${Math.min(75, Math.max(15, (revCoords[hoverIndex].x / width) * 100))}%`,
              transform: "translateX(-50%)",
              padding: "0.65rem 0.85rem",
              zIndex: 10,
              gap: "0.3rem",
              minWidth: "180px",
            }}
          >
            <div className="text-compact font-bold text-primary border-b border-subtle pb-1">
              {hoveredPoint.label}
            </div>
            <div className="flex justify-between text-sm gap-2">
              <span className="font-semibold" style={{ color: "#2563EB" }}>
                ● Gross Revenue:
              </span>
              <span className="font-bold text-primary">
                {formatINR(hoveredPoint.revenue)}
              </span>
            </div>
            <div className="flex justify-between text-sm gap-2">
              <span className="font-semibold" style={{ color: "#16A34A" }}>
                ● Driver Payouts:
              </span>
              <span className="font-bold text-success">
                {formatINR(hoveredPoint.driverEarnings)}
              </span>
            </div>
            {hoveredPoint.transactions > 0 && (
              <div
                className="flex justify-between text-caption text-muted"
                style={{ paddingTop: "0.15rem" }}
              >
                <span>Trips / Invoices:</span>
                <span className="font-semibold">
                  {hoveredPoint.transactions}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex gap-6 justify-center items-center pt-2 border-t border-subtle flex-wrap">
        <div className="flex items-center gap-compact text-compact text-secondary">
          <span
            className="rounded-full inline-block"
            style={{ width: "10px", height: "10px", background: "#2563EB" }}
          />
          <span>Gross Booking Value (GMV)</span>
        </div>
        <div className="flex items-center gap-compact text-compact text-secondary">
          <span
            className="rounded-full inline-block"
            style={{ width: "10px", height: "10px", background: "#16A34A" }}
          />
          <span>Driver Net Disbursements</span>
        </div>
      </div>
    </div>
  );
};

export const FinanceBarComparisonChart: React.FC<{
  points: FinanceTimeSeriesPoint[];
  title?: string;
}> = ({ points = [], title = "Booking Revenue vs Driver Payouts" }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const safePoints =
    points && points.length > 0
      ? points
      : [
          { label: "P1", revenue: 0, driverEarnings: 0, transactions: 0 },
          { label: "P2", revenue: 0, driverEarnings: 0, transactions: 0 },
        ];

  const maxVal = Math.max(
    ...safePoints.map((p) => Math.max(p.revenue || 0, p.driverEarnings || 0)),
    100,
  );

  const width = 840;
  const height = 195;
  const paddingLeft = 65;
  const paddingRight = 24;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const groupWidth = chartWidth / safePoints.length;
  const barWidth = Math.min(24, Math.max(8, (groupWidth - 12) / 2));

  return (
    <div
      className="bg-card border border-subtle rounded-lg shadow-card flex flex-col"
      style={{ padding: "1.2rem 1.2rem 1rem", gap: "0.72rem" }}
    >
      <div>
        <h3
          className="font-bold text-primary m-0"
          style={{ fontSize: "1.06rem" }}
        >
          {title}
        </h3>
        <p
          className="text-muted"
          style={{ fontSize: "0.73rem", margin: "0.15rem 0 0 0" }}
        >
          Side-by-side booking revenue and rate-card driver payouts
        </p>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full block"
          style={{ height: "auto", minWidth: "600px" }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* Y Grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = paddingTop + chartHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                  opacity="0.8"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontWeight="500"
                >
                  {formatINR(val)}
                </text>
              </g>
            );
          })}

          {/* Bar Groups */}
          {safePoints.map((pt, idx) => {
            const groupX =
              paddingLeft +
              idx * groupWidth +
              (groupWidth - barWidth * 2 - 4) / 2;
            const revenueHeight =
              maxVal > 0 ? (pt.revenue / maxVal) * chartHeight : 0;
            const driverHeight =
              maxVal > 0 ? (pt.driverEarnings / maxVal) * chartHeight : 0;
            const revenueY = paddingTop + chartHeight - revenueHeight;
            const driverY = paddingTop + chartHeight - driverHeight;
            const isHovered = hoverIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoverIndex(idx)}
                className="cursor-pointer"
              >
                {/* Revenue Bar */}
                <rect
                  x={groupX}
                  y={revenueY}
                  width={barWidth}
                  height={Math.max(2, revenueHeight)}
                  rx="3"
                  fill="#2563EB"
                  opacity={isHovered ? 1 : 0.88}
                />
                {/* Driver Bar */}
                <rect
                  x={groupX + barWidth + 4}
                  y={driverY}
                  width={barWidth}
                  height={Math.max(2, driverHeight)}
                  rx="3"
                  fill="var(--color-success)"
                  opacity={isHovered ? 1 : 0.88}
                />
                {/* Label */}
                <text
                  x={groupX + barWidth + 2}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isHovered ? "var(--text-primary)" : "var(--text-muted)"}
                  fontWeight={isHovered ? 700 : 500}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverIndex !== null && safePoints[hoverIndex] && (
          <div
            className="absolute bg-card border rounded-md shadow-elevated text-sm flex gap-4 items-center"
            style={{ top: "8px", right: "24px", padding: "0.5rem 0.85rem" }}
          >
            <span className="font-bold text-primary">
              {safePoints[hoverIndex].label}:
            </span>
            <span className="font-semibold" style={{ color: "#2563EB" }}>
              Revenue: {formatINR(safePoints[hoverIndex].revenue)}
            </span>
            <span className="text-success font-semibold">
              Driver: {formatINR(safePoints[hoverIndex].driverEarnings)}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-6 justify-center items-center border-t border-subtle pt-2">
        <div className="flex items-center gap-compact text-control-lg text-secondary">
          <span
            className="inline-block"
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: "#2563EB",
            }}
          />
          <span>Booking Revenue</span>
        </div>
        <div className="flex items-center gap-compact text-control-lg text-secondary">
          <span
            className="inline-block"
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: "var(--color-success)",
            }}
          />
          <span>Driver Earnings Settled</span>
        </div>
      </div>
    </div>
  );
};

export const RevenueCategoryBreakdownCard: React.FC<{
  categories: FinanceRevenueBreakdownItem[];
  totalRevenue: number;
}> = ({ categories = [], totalRevenue = 0 }) => {
  return (
    <div
      className="bg-card border border-subtle rounded-lg shadow-card flex flex-col"
      style={{ padding: "1.2rem 1.2rem 1rem", gap: "0.8rem" }}
    >
      <div>
        <h3
          className="font-bold text-primary m-0"
          style={{ fontSize: "1.06rem" }}
        >
          Vehicle Fleet & Category Revenue Breakdown
        </h3>
        <p
          className="text-muted"
          style={{ fontSize: "0.73rem", margin: "0.15rem 0 0 0" }}
        >
          Contribution of each vehicle class to platform gross bookings and
          fulfilled volume
        </p>
      </div>

      {categories.length === 0 ? (
        <div
          className="text-center text-muted"
          style={{ padding: "1.4rem 1rem", fontSize: "0.775rem" }}
        >
          No category booking records available for this timeframe
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: "0.8rem" }}>
          {categories.map((cat, idx) => {
            const pct =
              totalRevenue > 0
                ? Math.round((cat.revenue / totalRevenue) * 100)
                : 0;
            return (
              <div
                key={idx}
                className="flex flex-col"
                style={{ gap: "0.3rem" }}
              >
                <div
                  className="flex justify-between items-center"
                  style={{ fontSize: "0.775rem" }}
                >
                  <div className="flex items-center gap-snug">
                    <span className="font-bold text-primary">
                      {cat.category}
                    </span>
                    <span className="text-micro text-muted">
                      ({cat.count} fulfilled trips)
                    </span>
                  </div>
                  <div className="flex items-center" style={{ gap: "0.55rem" }}>
                    <span className="font-bold text-primary">
                      {formatINR(cat.revenue)}
                    </span>
                    <span
                      className="text-caption font-semibold text-brand text-right"
                      style={{ minWidth: "34px" }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
                <div
                  className="w-full bg-base rounded-full overflow-hidden"
                  style={{ height: "8px" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, Math.min(100, pct))}%`,
                      background: "var(--brand-primary-gradient)",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
