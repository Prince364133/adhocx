"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Activity,
  Calendar,
  Car,
  ClipboardList,
  PieChart as PieChartIcon,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { adminApi } from "../../lib/api/client";
import type { AnalyticsTrendsData } from "../../lib/api/types";

function formatINR(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactINR(value: number) {
  return `₹${new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;
}

function shouldShowDateLabel(index: number, total: number): boolean {
  if (total <= 9) return true;
  if (index === total - 1) return true;
  const step = total <= 14 ? 2 : total <= 22 ? 3 : total <= 31 ? 4 : 5;
  if (index % step === 0) {
    return total - 1 - index >= Math.floor(step / 2) + 1;
  }
  return false;
}

function getTooltipStyle(
  cx: number,
  cy: number,
  width = 720,
  height = 220,
): React.CSSProperties {
  const xPercent = (cx / width) * 100;
  const yPercent = (cy / height) * 100;

  // Horizontal alignment: anchor inwards when close to left or right edges to prevent clipping
  let translateX = "-50%";
  if (xPercent < 18) {
    translateX = "4px";
  } else if (xPercent > 82) {
    translateX = "calc(-100% - 4px)";
  }

  // Vertical placement:
  // Display the tooltip ABOVE the hovered data point by default.
  // When there is insufficient space above (data point is in the top 48% of chart),
  // automatically flip the tooltip position below the point.
  const hasSpaceAbove = yPercent >= 48;
  const translateY = hasSpaceAbove ? "calc(-100% - 10px)" : "12px";

  return {
    left: `${xPercent.toFixed(1)}%`,
    top: `${yPercent.toFixed(1)}%`,
    transform: `translate(${translateX}, ${translateY})`,
  };
}

/* ─────────────────────────────────────────────────────────────
 * SVG Area & Line Chart Component for Booking Trends
 * ───────────────────────────────────────────────────────────── */
interface BookingTrendPoint {
  date?: string;
  weekStart?: string;
  month?: string;
  label: string;
  count: number;
  completedCount: number;
  cancelledCount: number;
}

function BookingTrendsChart({
  data,
  granularity,
  onGranularityChange,
}: {
  data: BookingTrendPoint[];
  granularity: "daily" | "weekly" | "monthly";
  onGranularityChange: (g: "daily" | "weekly" | "monthly") => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 720;
  const height = 220;
  const padding = { top: 28, right: 30, bottom: 30, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...data.map((d) => d.count));
  const ticks = [maxVal, Math.round(maxVal / 2), 0];

  const getX = (idx: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (idx / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return padding.top + chartHeight - (val / maxVal) * chartHeight;
  };

  const linePath = useMemo(() => {
    if (data.length === 0) return "";
    if (data.length === 1) {
      const cx = getX(0);
      const cy = getY(data[0].count);
      return `M ${cx - 24},${cy} L ${cx + 24},${cy}`;
    }
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)},${getY(d.count).toFixed(1)}`)
      .join(" ");
  }, [data, maxVal]);

  const areaPath = useMemo(() => {
    if (data.length === 0) return "";
    if (data.length === 1) {
      const cx = getX(0);
      const cy = getY(data[0].count);
      const bottomY = padding.top + chartHeight;
      return `M ${cx - 24},${cy} L ${cx + 24},${cy} L ${cx + 24},${bottomY} L ${cx - 24},${bottomY} Z`;
    }
    const firstX = getX(0).toFixed(1);
    const lastX = getX(data.length - 1).toFixed(1);
    const bottomY = (padding.top + chartHeight).toFixed(1);
    return `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  }, [linePath, data.length]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    if (data.length <= 1) {
      setHoverIndex(0);
      return;
    }
    const relativeX = mouseX - padding.left;
    const rawIdx = Math.round((relativeX / chartWidth) * (data.length - 1));
    const clampedIdx = Math.max(0, Math.min(data.length - 1, rawIdx));
    setHoverIndex(clampedIdx);
  };

  if (data.length === 0) {
    return (
      <div className="dashboard-chart-empty">
        No booking activity recorded for this period.
      </div>
    );
  }

  const activePoint = hoverIndex !== null ? data[hoverIndex] : null;
  const activeCx = hoverIndex !== null ? getX(hoverIndex) : 0;
  const activeCy = hoverIndex !== null && activePoint ? getY(activePoint.count) : 0;
  const completionRate =
    activePoint && activePoint.count > 0
      ? Math.round((activePoint.completedCount / activePoint.count) * 100)
      : 0;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="analytics-tabs">
          {(["daily", "weekly", "monthly"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`analytics-tab-btn ${granularity === tab ? "active" : ""}`}
              onClick={() => onGranularityChange(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        {activePoint && (
          <div className="text-xs text-secondary font-medium">
            <span className="font-semibold text-primary">{activePoint.label}:</span>{" "}
            <span className="text-brand font-bold">{activePoint.count} total</span> ·{" "}
            <span className="text-success">{activePoint.completedCount} completed</span>
            {activePoint.cancelledCount > 0 && (
              <span className="text-danger ml-1">· {activePoint.cancelledCount} cancelled</span>
            )}
          </div>
        )}
      </div>

      <div className="dashboard-chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="dashboard-chart-svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          style={{ cursor: "crosshair" }}
        >
          <defs>
            <linearGradient id="bookingAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--text-brand)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--text-brand)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {ticks.map((tick, index) => {
            const y = getY(tick);
            return (
              <g key={`b-tick-${index}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray={index === ticks.length - 1 ? undefined : "3 3"}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Gradient Area */}
          <path d={areaPath} fill="url(#bookingAreaGrad)" />

          {/* Line Path */}
          <path
            d={linePath}
            fill="none"
            stroke="var(--text-brand)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Hover Column and Guideline */}
          {hoverIndex !== null && (
            <g pointerEvents="none">
              <rect
                x={activeCx - chartWidth / (data.length || 1) / 2}
                y={padding.top}
                width={chartWidth / (data.length || 1)}
                height={chartHeight}
                fill="var(--text-brand)"
                fillOpacity="0.04"
                rx="4"
              />
              <line
                x1={activeCx}
                y1={padding.top}
                x2={activeCx}
                y2={padding.top + chartHeight}
                stroke="var(--text-brand)"
                strokeOpacity="0.35"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            </g>
          )}

          {/* Data Points & Value labels */}
          {data.map((d, index) => {
            const cx = getX(index);
            const cy = getY(d.count);
            const isHovered = hoverIndex === index;
            const showLabel = shouldShowDateLabel(index, data.length);
            const hasValue = d.count > 0;
            const textAnchor =
              index === 0 ? "start" : index === data.length - 1 ? "end" : "middle";

            return (
              <g key={`b-pt-${index}`}>
                {/* Data point dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5.5 : hasValue ? 4.5 : 3}
                  fill={hasValue || isHovered ? "var(--text-brand)" : "var(--surface)"}
                  stroke="var(--text-brand)"
                  strokeWidth={isHovered ? 2.5 : 1.8}
                />

                {/* Clear value display directly on point */}
                {(hasValue || isHovered) && (
                  <text
                    x={cx}
                    y={Math.max(14, cy - 8)}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="var(--text-brand)"
                  >
                    {d.count}
                  </text>
                )}

                {/* X-axis label */}
                {showLabel && (
                  <text
                    x={cx}
                    y={height - 10}
                    textAnchor={textAnchor}
                    fontSize="10"
                    fill={isHovered ? "var(--text-primary)" : "var(--text-muted)"}
                    fontWeight={isHovered ? "600" : "400"}
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Active Highlight Focus Halo */}
          {hoverIndex !== null && activePoint && (
            <g pointerEvents="none">
              <circle
                cx={activeCx}
                cy={activeCy}
                r="11"
                fill="var(--text-brand)"
                fillOpacity="0.18"
              />
              <circle
                cx={activeCx}
                cy={activeCy}
                r="5.5"
                fill="var(--text-brand)"
                stroke="var(--bg-surface, #ffffff)"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Dynamic Industry-Standard Floating Tooltip */}
        {activePoint && (
          <div
            className="chart-floating-tooltip"
            style={getTooltipStyle(activeCx, activeCy, width, height)}
          >
            <div className="chart-tooltip-header">
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <Calendar size={12} className="text-muted" />
                {activePoint.label}
              </span>
              <span className="chart-tooltip-badge bg-indigo-50 text-indigo-700">
                {activePoint.count === 1 ? "1 booking" : `${activePoint.count} bookings`}
              </span>
            </div>
            <div className="chart-tooltip-body">
              <div className="chart-tooltip-row">
                <span className="chart-tooltip-label">
                  <span className="chart-tooltip-dot" style={{ background: "var(--text-brand)" }} />
                  Total Bookings
                </span>
                <span className="chart-tooltip-value text-primary">{activePoint.count}</span>
              </div>
              <div className="chart-tooltip-row">
                <span className="chart-tooltip-label">
                  <span className="chart-tooltip-dot" style={{ background: "var(--color-success)" }} />
                  Completed
                </span>
                <span className="chart-tooltip-value text-emerald-600 font-bold">
                  {activePoint.completedCount}
                </span>
              </div>
              {activePoint.cancelledCount > 0 && (
                <div className="chart-tooltip-row">
                  <span className="chart-tooltip-label">
                    <span
                      className="chart-tooltip-dot"
                      style={{ background: "var(--color-danger, #ef4444)" }}
                    />
                    Cancelled
                  </span>
                  <span className="chart-tooltip-value text-rose-500 font-bold">
                    {activePoint.cancelledCount}
                  </span>
                </div>
              )}
              <div className="chart-tooltip-divider" />
              <div className="chart-tooltip-row text-[11px]">
                <span className="text-muted">Completion Rate</span>
                <span className="font-bold text-primary">{completionRate}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Dual-Series Comparison Bar Chart: Revenue vs Driver Payouts
 * ───────────────────────────────────────────────────────────── */
interface FinancialTrendPoint {
  date?: string;
  weekStart?: string;
  month?: string;
  label: string;
  revenue: number;
  driverPayouts: number;
  margin: number;
  marginPercentage: number;
}

function RevenueVsPayoutsChart({
  data,
  granularity,
  onGranularityChange,
}: {
  data: FinancialTrendPoint[];
  granularity: "daily" | "weekly" | "monthly";
  onGranularityChange: (g: "daily" | "weekly" | "monthly") => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 720;
  const height = 230;
  const padding = { top: 28, right: 30, bottom: 32, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...data.flatMap((d) => [d.revenue, d.driverPayouts]));
  const ticks = [maxVal, Math.round(maxVal / 2), 0];

  const slotWidth = data.length ? chartWidth / data.length : chartWidth;
  const barWidth = Math.max(3, Math.min(18, (slotWidth * 0.72) / 2));
  const barGap = 2;
  const groupWidth = barWidth * 2 + barGap;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    if (mouseX < padding.left || mouseX > width - padding.right) {
      setHoverIndex(null);
      return;
    }
    const rawIdx = Math.floor((mouseX - padding.left) / slotWidth);
    const clampedIdx = Math.max(0, Math.min(data.length - 1, rawIdx));
    setHoverIndex(clampedIdx);
  };

  if (data.length === 0) {
    return (
      <div className="dashboard-chart-empty">
        No financial transaction records in this period.
      </div>
    );
  }

  const active = hoverIndex !== null ? data[hoverIndex] : null;
  const activeGroupX =
    hoverIndex !== null
      ? padding.left + hoverIndex * slotWidth + (slotWidth - groupWidth) / 2
      : 0;
  const activeCx = activeGroupX + groupWidth / 2;
  const activeCy =
    active
      ? padding.top +
        chartHeight -
        Math.max(
          (active.revenue / maxVal) * chartHeight,
          (active.driverPayouts / maxVal) * chartHeight,
        )
      : padding.top + chartHeight / 2;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="analytics-tabs">
            {(["daily", "weekly", "monthly"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`analytics-tab-btn ${granularity === tab ? "active" : ""}`}
                onClick={() => onGranularityChange(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="dashboard-chart-legend">
            <span className="dashboard-chart-legend-item">
              <span
                className="dashboard-chart-legend-dot"
                style={{ background: "var(--color-info)" }}
              />
              Customer Revenue
            </span>
            <span className="dashboard-chart-legend-item">
              <span
                className="dashboard-chart-legend-dot"
                style={{ background: "var(--brand-secondary)" }}
              />
              Driver Payouts
            </span>
          </div>
        </div>

        {active && (
          <div className="text-xs text-secondary font-medium">
            <span className="font-semibold text-primary">{active.label}:</span>{" "}
            <span className="text-info font-bold">{formatINR(active.revenue)}</span> rev ·{" "}
            <span className="text-brand-secondary font-bold">{formatINR(active.driverPayouts)}</span> payout ·{" "}
            <span className="text-success font-bold">{formatINR(active.margin)}</span> profit
          </div>
        )}
      </div>

      <div className="dashboard-chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="dashboard-chart-svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          style={{ cursor: "pointer" }}
        >
          {ticks.map((tick, index) => {
            const y = padding.top + chartHeight - (tick / maxVal) * chartHeight;
            return (
              <g key={`rev-tick-${index}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray={index === ticks.length - 1 ? undefined : "3 3"}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {formatCompactINR(tick)}
                </text>
              </g>
            );
          })}

          {/* Active column highlight backdrop */}
          {hoverIndex !== null && (
            <rect
              x={activeGroupX - 5}
              y={padding.top}
              width={groupWidth + 10}
              height={chartHeight}
              fill="var(--text-brand)"
              fillOpacity="0.04"
              rx="4"
              pointerEvents="none"
            />
          )}

          {data.map((d, index) => {
            const groupX = padding.left + index * slotWidth + (slotWidth - groupWidth) / 2;
            const revHeight = (d.revenue / maxVal) * chartHeight;
            const payoutHeight = (d.driverPayouts / maxVal) * chartHeight;
            const showLabel = shouldShowDateLabel(index, data.length);
            const isHovered = hoverIndex === index;
            const textAnchor =
              index === 0 ? "start" : index === data.length - 1 ? "end" : "middle";

            return (
              <g key={`rev-group-${index}`}>
                {/* Revenue bar */}
                <rect
                  x={groupX}
                  y={padding.top + chartHeight - revHeight}
                  width={barWidth}
                  height={revHeight}
                  rx="3"
                  fill="var(--color-info)"
                  opacity={hoverIndex === null ? 0.88 : isHovered ? 1 : 0.62}
                  stroke={isHovered ? "var(--bg-surface)" : "none"}
                  strokeWidth={isHovered ? 1 : 0}
                />

                {/* Direct value above Revenue bar */}
                {(d.revenue > 0 || isHovered) && (
                  <text
                    x={groupX + barWidth / 2}
                    y={Math.max(14, padding.top + chartHeight - revHeight - 4)}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="700"
                    fill="var(--color-info)"
                  >
                    {formatCompactINR(d.revenue)}
                  </text>
                )}

                {/* Driver payout bar */}
                <rect
                  x={groupX + barWidth + barGap}
                  y={padding.top + chartHeight - payoutHeight}
                  width={barWidth}
                  height={payoutHeight}
                  rx="3"
                  fill="var(--brand-secondary)"
                  opacity={hoverIndex === null ? 0.88 : isHovered ? 1 : 0.62}
                  stroke={isHovered ? "var(--bg-surface)" : "none"}
                  strokeWidth={isHovered ? 1 : 0}
                />

                {/* Direct value above Driver Payout bar */}
                {(d.driverPayouts > 0 || isHovered) && (
                  <text
                    x={groupX + barWidth + barGap + barWidth / 2}
                    y={Math.max(14, padding.top + chartHeight - payoutHeight - 4)}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="700"
                    fill="var(--brand-secondary)"
                  >
                    {formatCompactINR(d.driverPayouts)}
                  </text>
                )}

                {/* X-axis label */}
                {showLabel && (
                  <text
                    x={groupX + groupWidth / 2}
                    y={height - 10}
                    textAnchor={textAnchor}
                    fontSize="10"
                    fill={isHovered ? "var(--text-primary)" : "var(--text-muted)"}
                    fontWeight={isHovered ? "600" : "400"}
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Dynamic Industry-Standard Floating Tooltip */}
        {active && (
          <div
            className="chart-floating-tooltip"
            style={getTooltipStyle(activeCx, activeCy, width, height)}
          >
            <div className="chart-tooltip-header">
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <Calendar size={12} className="text-muted" />
                {active.label}
              </span>
              <span
                className={`chart-tooltip-badge ${
                  active.margin > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {active.marginPercentage}% margin
              </span>
            </div>
            <div className="chart-tooltip-body">
              <div className="chart-tooltip-row">
                <span className="chart-tooltip-label">
                  <span className="chart-tooltip-dot" style={{ background: "var(--color-info)" }} />
                  Customer Revenue
                </span>
                <span className="chart-tooltip-value text-sky-600 font-bold">
                  {formatINR(active.revenue)}
                </span>
              </div>
              <div className="chart-tooltip-row">
                <span className="chart-tooltip-label">
                  <span className="chart-tooltip-dot" style={{ background: "var(--brand-secondary)" }} />
                  Driver Payouts
                </span>
                <span className="chart-tooltip-value text-orange-600 font-bold">
                  {formatINR(active.driverPayouts)}
                </span>
              </div>
              <div className="chart-tooltip-divider" />
              <div className="chart-tooltip-row">
                <span className="chart-tooltip-label">
                  <span className="chart-tooltip-dot" style={{ background: "var(--color-success)" }} />
                  Net Platform Profit
                </span>
                <span className="chart-tooltip-value text-emerald-600 font-bold">
                  {formatINR(active.margin)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Platform Margin & Profit Trends Chart
 * ───────────────────────────────────────────────────────────── */
function PlatformMarginTrendChart({
  data,
  totalMargin,
  marginPercent,
  granularity,
  onGranularityChange,
}: {
  data: FinancialTrendPoint[];
  totalMargin: number;
  marginPercent: number;
  granularity: "daily" | "weekly" | "monthly";
  onGranularityChange: (g: "daily" | "weekly" | "monthly") => void;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 720;
  const height = 230;
  const padding = { top: 28, right: 30, bottom: 32, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...data.map((d) => d.margin));
  const minVal = Math.min(0, ...data.map((d) => d.margin));
  const valRange = maxVal - minVal || 1;

  const getY = (val: number) =>
    padding.top + chartHeight - ((val - minVal) / valRange) * chartHeight;
  const getX = (idx: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (idx / (data.length - 1)) * chartWidth;
  };

  const zeroY = getY(0);

  const linePath = useMemo(() => {
    if (data.length === 0) return "";
    if (data.length === 1) {
      const cx = getX(0);
      const cy = getY(data[0].margin);
      return `M ${cx - 24},${cy} L ${cx + 24},${cy}`;
    }
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)},${getY(d.margin).toFixed(1)}`)
      .join(" ");
  }, [data, maxVal, minVal]);

  const areaPath = useMemo(() => {
    if (data.length === 0) return "";
    if (data.length === 1) {
      const cx = getX(0);
      const cy = getY(data[0].margin);
      return `M ${cx - 24},${cy} L ${cx + 24},${cy} L ${cx + 24},${zeroY.toFixed(1)} L ${cx - 24},${zeroY.toFixed(1)} Z`;
    }
    const firstX = getX(0).toFixed(1);
    const lastX = getX(data.length - 1).toFixed(1);
    return `${linePath} L ${lastX},${zeroY.toFixed(1)} L ${firstX},${zeroY.toFixed(1)} Z`;
  }, [linePath, data.length, zeroY]);

  const ticks = [maxVal, Math.round((maxVal + minVal) / 2), minVal];

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    if (data.length <= 1) {
      setHoverIndex(0);
      return;
    }
    const relativeX = mouseX - padding.left;
    const rawIdx = Math.round((relativeX / chartWidth) * (data.length - 1));
    const clampedIdx = Math.max(0, Math.min(data.length - 1, rawIdx));
    setHoverIndex(clampedIdx);
  };

  if (data.length === 0) {
    return (
      <div className="dashboard-chart-empty">
        No margin calculation data available for this range.
      </div>
    );
  }

  const active = hoverIndex !== null ? data[hoverIndex] : null;
  const activeCx = hoverIndex !== null ? getX(hoverIndex) : 0;
  const activeCy = hoverIndex !== null && active ? getY(active.margin) : 0;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="analytics-tabs">
            {(["daily", "weekly", "monthly"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`analytics-tab-btn ${granularity === tab ? "active" : ""}`}
                onClick={() => onGranularityChange(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <span className="analytics-badge bg-emerald-50 text-emerald-700 border border-emerald-200">
            Total Profit: {formatINR(totalMargin)}
          </span>
          <span className="analytics-badge bg-indigo-50 text-indigo-700 border border-indigo-200">
            {marginPercent}% Margin
          </span>
        </div>

        {active && (
          <div className="text-xs text-secondary font-medium">
            <span className="font-semibold text-primary">{active.label}:</span>{" "}
            <span className="text-success font-bold">{formatINR(active.margin)} net</span> (
            {active.marginPercentage}%)
          </div>
        )}
      </div>

      <div className="dashboard-chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="dashboard-chart-svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          style={{ cursor: "crosshair" }}
        >
          <defs>
            <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-success)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-success)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {ticks.map((tick, index) => {
            const y = getY(tick);
            return (
              <g key={`m-tick-${index}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {formatCompactINR(tick)}
                </text>
              </g>
            );
          })}

          {/* Zero baseline */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={width - padding.right}
            y2={zeroY}
            stroke="var(--border)"
            strokeWidth="1.5"
          />

          <path d={areaPath} fill="url(#marginGrad)" />
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-success)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active Hover Column and Guideline */}
          {hoverIndex !== null && (
            <g pointerEvents="none">
              <rect
                x={activeCx - chartWidth / (data.length || 1) / 2}
                y={padding.top}
                width={chartWidth / (data.length || 1)}
                height={chartHeight}
                fill="var(--color-success)"
                fillOpacity="0.04"
                rx="4"
              />
              <line
                x1={activeCx}
                y1={padding.top}
                x2={activeCx}
                y2={padding.top + chartHeight}
                stroke="var(--color-success)"
                strokeOpacity="0.35"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
            </g>
          )}

          {data.map((d, index) => {
            const cx = getX(index);
            const cy = getY(d.margin);
            const isHovered = hoverIndex === index;
            const showLabel = shouldShowDateLabel(index, data.length);
            const textAnchor =
              index === 0 ? "start" : index === data.length - 1 ? "end" : "middle";

            return (
              <g key={`m-pt-${index}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5.5 : d.margin !== 0 ? 4.5 : 3}
                  fill={isHovered || d.margin !== 0 ? "var(--color-success)" : "var(--surface)"}
                  stroke="var(--color-success)"
                  strokeWidth={isHovered ? 2.5 : 1.8}
                />

                {/* Direct value above line point */}
                {(d.margin !== 0 || isHovered) && (
                  <text
                    x={cx}
                    y={Math.max(14, cy - 8)}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="var(--color-success)"
                  >
                    {formatCompactINR(d.margin)}
                  </text>
                )}

                {/* X-axis label */}
                {showLabel && (
                  <text
                    x={cx}
                    y={height - 10}
                    textAnchor={textAnchor}
                    fontSize="10"
                    fill={isHovered ? "var(--text-primary)" : "var(--text-muted)"}
                    fontWeight={isHovered ? "600" : "400"}
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Active Highlight Focus Halo */}
          {hoverIndex !== null && active && (
            <g pointerEvents="none">
              <circle
                cx={activeCx}
                cy={activeCy}
                r="11"
                fill="var(--color-success)"
                fillOpacity="0.2"
              />
              <circle
                cx={activeCx}
                cy={activeCy}
                r="5.5"
                fill="var(--color-success)"
                stroke="var(--bg-surface, #ffffff)"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {/* Dynamic Industry-Standard Floating Tooltip */}
        {active && (
          <div
            className="chart-floating-tooltip"
            style={getTooltipStyle(activeCx, activeCy, width, height)}
          >
            <div className="chart-tooltip-header">
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <Calendar size={12} className="text-muted" />
                {active.label}
              </span>
              <span
                className={`chart-tooltip-badge ${
                  active.margin > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : active.margin === 0
                    ? "bg-slate-100 text-slate-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {active.margin > 0 ? "Profitable" : active.margin === 0 ? "Neutral" : "Loss"}
              </span>
            </div>
            <div className="chart-tooltip-body">
              <div className="chart-tooltip-row">
                <span className="chart-tooltip-label">
                  <span className="chart-tooltip-dot" style={{ background: "var(--color-success)" }} />
                  Net Platform Profit
                </span>
                <span className="chart-tooltip-value text-emerald-600 font-bold">
                  {formatINR(active.margin)}
                </span>
              </div>
              <div className="chart-tooltip-row">
                <span className="chart-tooltip-label">
                  <span className="chart-tooltip-dot" style={{ background: "var(--brand-secondary)" }} />
                  Margin Ratio
                </span>
                <span className="chart-tooltip-value text-primary font-bold">
                  {active.marginPercentage}%
                </span>
              </div>
              <div className="chart-tooltip-divider" />
              <div className="chart-tooltip-row text-[11px]">
                <span className="text-muted">Gross Customer Fare</span>
                <span className="font-semibold text-primary">{formatINR(active.revenue)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Interactive Donut Chart for Booking Status Distribution
 * ───────────────────────────────────────────────────────────── */
interface StatusSlice {
  status: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

const STATUS_CONFIGS = [
  {
    key: "COMPLETED",
    label: "Completed",
    color: "#10B981",
    badgeBg: "rgba(16, 185, 129, 0.12)",
    badgeText: "#059669",
    badgeBorder: "rgba(16, 185, 129, 0.25)",
    matches: (s: string) => s.toUpperCase().replace(/[\s_-]+/g, "") === "COMPLETED",
  },
  {
    key: "IN_PROGRESS",
    label: "In-Progress",
    color: "#F59E0B",
    badgeBg: "rgba(245, 158, 11, 0.12)",
    badgeText: "#D97706",
    badgeBorder: "rgba(245, 158, 11, 0.25)",
    matches: (s: string) => {
      const norm = s.toUpperCase().replace(/[\s_-]+/g, "");
      return norm === "INPROGRESS" || norm === "ASSIGNED" || norm === "ARRIVED";
    },
  },
  {
    key: "CANCELLED",
    label: "Cancelled",
    color: "#EF4444",
    badgeBg: "rgba(239, 68, 68, 0.12)",
    badgeText: "#DC2626",
    badgeBorder: "rgba(239, 68, 68, 0.25)",
    matches: (s: string) => {
      const norm = s.toUpperCase().replace(/[\s_-]+/g, "");
      return norm === "CANCELLED" || norm === "CANCELED" || norm === "NOSHOW";
    },
  },
];

function BookingStatusDonutChart({
  data,
  total,
}: {
  data: StatusSlice[];
  total: number;
}) {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  // Map incoming database/API values ensuring all 3 standard statuses are always present
  const statusItems = STATUS_CONFIGS.map((config) => {
    const matched = (data || []).filter((item) => config.matches(item.status));
    const count = matched.reduce((sum, item) => sum + (item.count || 0), 0);
    const rawPercentage = total > 0 ? (count / total) * 100 : 0;
    const percentageLabel =
      rawPercentage % 1 === 0 ? `${rawPercentage.toFixed(0)}%` : `${rawPercentage.toFixed(1)}%`;

    return {
      ...config,
      count,
      percentage: rawPercentage,
      percentageLabel,
    };
  });

  const radius = 60;
  const strokeWidth = 10;
  const center = 80;
  const circumference = 2 * Math.PI * radius;

  // Active slices for SVG donut rendering
  const activeSlices = statusItems.filter((s) => s.count > 0);
  let accumulatedAngle = 0;
  const hoveredItem = hoveredStatus ? statusItems.find((s) => s.key === hoveredStatus) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] items-center gap-5 sm:gap-6 py-1">
      {/* Left: Modern Slim Donut Chart */}
      <div className="relative flex justify-center items-center flex-shrink-0">
        <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
          {/* Subtle Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            className="dark:stroke-slate-800"
            strokeWidth={strokeWidth}
          />

          {/* Dynamic Status Slices */}
          {activeSlices.map((slice) => {
            const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((accumulatedAngle / 100) * circumference);
            accumulatedAngle += slice.percentage;
            const isHovered = hoveredStatus === slice.key;

            return (
              <circle
                key={slice.key}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredStatus(slice.key)}
                onMouseLeave={() => setHoveredStatus(null)}
              />
            );
          })}
        </svg>

        {/* Center Label: Bold Total Count + Muted 'Total Bookings' Subtitle */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none select-none">
          <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
            {hoveredItem ? hoveredItem.count : total}
          </span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400 mt-1">
            {hoveredItem ? hoveredItem.label : "Total Bookings"}
          </span>
        </div>
      </div>

      {/* Right: Detailed Status Breakdown List (Completed, In-Progress, Cancelled) */}
      <div className="flex flex-col gap-2.5 w-full min-w-0">
        {statusItems.map((item) => {
          const isHovered = hoveredStatus === item.key;
          return (
            <div
              key={item.key}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                isHovered
                  ? "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm"
                  : "bg-slate-50/70 hover:bg-slate-100/70 dark:bg-slate-900/40 dark:hover:bg-slate-900/70 border-slate-100/80 dark:border-slate-800/60"
              }`}
              onMouseEnter={() => setHoveredStatus(item.key)}
              onMouseLeave={() => setHoveredStatus(null)}
            >
              {/* Row Left: Colored Dot + Status Label */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform duration-150"
                  style={{
                    backgroundColor: item.color,
                    transform: isHovered ? "scale(1.25)" : "scale(1)",
                  }}
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {item.label}
                </span>
              </div>

              {/* Row Right: Bold Count + Subtle Pill/Badge showing Percentage */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                  {item.count}
                </span>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums transition-colors"
                  style={{
                    backgroundColor: item.badgeBg,
                    color: item.badgeText,
                    border: `1px solid ${item.badgeBorder}`,
                  }}
                >
                  {item.percentageLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * Active Requirements & Fulfillment Status Component
 * ───────────────────────────────────────────────────────────── */
function ActiveRequirementsStatusChart({
  activeRequirements,
  allRequirements,
  totalActive,
  totalAll,
}: {
  activeRequirements: Array<{ status: string; label: string; count: number; percentage: number }>;
  allRequirements: Array<{ status: string; label: string; count: number; percentage: number }>;
  totalActive: number;
  totalAll: number;
}) {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    OPEN: "var(--color-info)",
    POSTED: "var(--color-info)",
    DISPATCHING: "var(--brand-secondary)",
    PARTIALLY_FULFILLED: "var(--color-warning)",
    ASSIGNED: "var(--text-brand)",
    IN_PROGRESS: "var(--brand-secondary)",
    COMPLETED: "var(--color-success)",
    FULFILLED: "var(--color-success)",
    CANCELLED: "var(--color-danger, #ef4444)",
    NO_DRIVER_AVAILABLE: "var(--text-muted)",
  };

  const statusDescriptions: Record<string, string> = {
    OPEN: "Open demand awaiting driver quote or dispatch",
    POSTED: "Requirement broadcast to eligible drivers and vendors",
    DISPATCHING: "System assigning optimal driver and vehicle",
    ASSIGNED: "Driver confirmed and en route to passenger pickup",
    IN_PROGRESS: "Passenger in transit toward destination",
    COMPLETED: "Trip completed and payment settled",
    FULFILLED: "All required vehicles fulfilled successfully",
    CANCELLED: "Cancelled by passenger or corporate manager",
    NO_DRIVER_AVAILABLE: "No active drivers within radius",
  };

  const currentList = totalActive > 0 ? activeRequirements : allRequirements;

  return (
    <div className="flex flex-col gap-3 py-1">
      {/* Active in-flight demand status banner */}
      <div className="flex items-center justify-between p-3 rounded-lg border bg-surface-subtle">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              totalActive > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
            }`}
          />
          <div>
            <div className="text-xs font-semibold text-primary">
              {totalActive > 0
                ? `${totalActive} Active In-Flight Demand`
                : "All Requirements Fulfilled"}
            </div>
            <div className="text-[11px] text-muted">
              {totalActive > 0
                ? "Demand currently in dispatching, assigned or active state"
                : "Zero open demand backlogs. All corporate & vendor requests are satisfied."}
            </div>
          </div>
        </div>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            totalActive > 0
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {totalActive > 0 ? `${totalActive} Open` : "100% Cleared"}
        </span>
      </div>

      {/* Breakdown list with rich hover interactions */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="text-[11px] font-semibold text-muted uppercase tracking-wider">
          {totalActive > 0
            ? "Active Requirements by Status"
            : `Requirement Lifecycle Breakdown (${totalAll} total)`}
        </div>

        {currentList.map((item) => {
          const color = statusColors[item.status] || "var(--text-brand)";
          const isHovered = hoveredStatus === item.status;
          const desc = statusDescriptions[item.status] || "Requirement state";

          return (
            <div
              key={item.status}
              className={`flex flex-col gap-1.5 p-2 rounded-lg border transition-all cursor-pointer ${
                isHovered
                  ? "bg-surface-elevated border-brand shadow-sm scale-[1.01]"
                  : "bg-surface border-transparent hover:bg-surface-subtle"
              }`}
              onMouseEnter={() => setHoveredStatus(item.status)}
              onMouseLeave={() => setHoveredStatus(null)}
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-primary font-semibold">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: color }}
                  />
                  {item.label}
                  {isHovered && (
                    <span className="text-[10px] text-muted font-normal ml-1">
                      — {desc}
                    </span>
                  )}
                </span>
                <span className="text-primary font-bold">
                  {item.count}{" "}
                  <span className="text-[11px] font-semibold text-secondary px-1.5 py-0.5 rounded bg-surface-subtle ml-1">
                    {item.percentage}%
                  </span>
                </span>
              </div>
              <div className="w-full bg-surface-subtle rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(5, item.percentage)}%`,
                    background: color,
                    filter: isHovered ? "brightness(1.15)" : "none",
                  }}
                />
              </div>
            </div>
          );
        })}

        {totalAll === 0 && (
          <div className="text-xs text-muted text-center py-4 border border-dashed rounded-lg">
            No requirements recorded in the selected date range.
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * User Registration & Growth Trends Component
 * ───────────────────────────────────────────────────────────── */
interface GrowthSeriesItem {
  name: string;
  key: string;
  color: string;
  values: number[];
  current: number;
  previous: number;
  growthRate: number | null;
}

function UserGrowthTrendsChart({
  months,
  series,
}: {
  months: Array<{ key: string; label: string }>;
  series: GrowthSeriesItem[];
}) {
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  const width = 720;
  const height = 240;
  const padding = { top: 28, right: 24, bottom: 32, left: 45 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(1, ...series.flatMap((s) => s.values));
  const ticks = [maxVal, Math.round(maxVal / 2), 0];

  const slotWidth = chartWidth / months.length;
  const barWidth = Math.max(3, Math.min(18, (slotWidth * 0.72) / series.length));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (months.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    if (mouseX < padding.left || mouseX > width - padding.right) {
      setHoveredMonthIndex(null);
      return;
    }
    const rawIdx = Math.floor((mouseX - padding.left) / slotWidth);
    const clampedIdx = Math.max(0, Math.min(months.length - 1, rawIdx));
    setHoveredMonthIndex(clampedIdx);
  };

  if (months.length === 0 || series.length === 0) {
    return (
      <div className="dashboard-chart-empty">
        Registration records are not available.
      </div>
    );
  }

  const activeMonth = hoveredMonthIndex !== null ? months[hoveredMonthIndex] : null;
  const activeMonthTotal =
    hoveredMonthIndex !== null
      ? series.reduce((sum, s) => sum + (s.values[hoveredMonthIndex] ?? 0), 0)
      : 0;

  const activeGroupStart =
    hoveredMonthIndex !== null
      ? padding.left + hoveredMonthIndex * slotWidth + (slotWidth - barWidth * series.length) / 2
      : 0;
  const activeCx = activeGroupStart + (barWidth * series.length) / 2;
  const maxBarInMonth =
    hoveredMonthIndex !== null
      ? Math.max(0, ...series.map((s) => s.values[hoveredMonthIndex] ?? 0))
      : 0;
  const tallestBarHeight = (maxBarInMonth / maxVal) * chartHeight;
  const activeCy = padding.top + chartHeight - tallestBarHeight;

  return (
    <div className="flex flex-col gap-3 relative">
      {/* Legend */}
      <div className="dashboard-chart-legend">
        {series.map((item) => (
          <span key={item.key} className="dashboard-chart-legend-item">
            <span
              className="dashboard-chart-legend-dot"
              style={{ background: item.color }}
            />
            {item.name}
          </span>
        ))}
      </div>

      <div className="dashboard-chart-scroll">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="dashboard-chart-svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredMonthIndex(null)}
          style={{ cursor: "pointer" }}
        >
          {ticks.map((tick, index) => {
            const y = padding.top + chartHeight - (tick / maxVal) * chartHeight;
            return (
              <g key={`ug-tick-${index}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray={index === ticks.length - 1 ? undefined : "3 3"}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Active Month Column Highlight */}
          {hoveredMonthIndex !== null && (
            <rect
              x={activeGroupStart - 6}
              y={padding.top}
              width={barWidth * series.length + 12}
              height={chartHeight}
              fill="var(--text-brand)"
              fillOpacity="0.04"
              rx="6"
              pointerEvents="none"
            />
          )}

          {months.map((month, monthIndex) => {
            const groupWidth = barWidth * series.length;
            const groupStart = padding.left + monthIndex * slotWidth + (slotWidth - groupWidth) / 2;
            const isMonthHovered = hoveredMonthIndex === monthIndex;

            return (
              <g key={month.key}>
                {series.map((item, seriesIndex) => {
                  const val = item.values[monthIndex] ?? 0;
                  const barH = (val / maxVal) * chartHeight;
                  const barX = groupStart + seriesIndex * barWidth;

                  return (
                    <g key={item.key}>
                      <rect
                        x={barX}
                        y={padding.top + chartHeight - barH}
                        width={Math.max(2, barWidth - 2)}
                        height={barH}
                        rx="3"
                        fill={item.color}
                        opacity={
                          hoveredMonthIndex === null
                            ? 0.88
                            : isMonthHovered
                            ? 1
                            : 0.62
                        }
                      />

                      {/* Direct value above bar */}
                      {(val > 0 || isMonthHovered) && (
                        <text
                          x={barX + (barWidth - 2) / 2}
                          y={Math.max(14, padding.top + chartHeight - barH - 4)}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="700"
                          fill={item.color}
                        >
                          {val}
                        </text>
                      )}
                    </g>
                  );
                })}

                <text
                  x={padding.left + monthIndex * slotWidth + slotWidth / 2}
                  y={height - 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isMonthHovered ? "var(--text-primary)" : "var(--text-muted)"}
                  fontWeight={isMonthHovered ? "700" : "400"}
                >
                  {month.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Industry-Standard Floating Tooltip */}
        {activeMonth && (
          <div
            className="chart-floating-tooltip"
            style={getTooltipStyle(activeCx, activeCy, width, height)}
          >
            <div className="chart-tooltip-header">
              <span className="flex items-center gap-1.5 font-semibold text-primary">
                <Calendar size={12} className="text-muted" />
                {activeMonth.label} Registrations
              </span>
              <span className="chart-tooltip-badge bg-purple-50 text-purple-700">
                {activeMonthTotal} total
              </span>
            </div>
            <div className="chart-tooltip-body">
              {series.map((item) => {
                const val = item.values[hoveredMonthIndex!] ?? 0;
                const share =
                  activeMonthTotal > 0 ? Math.round((val / activeMonthTotal) * 100) : 0;
                return (
                  <div key={item.key} className="chart-tooltip-row">
                    <span className="chart-tooltip-label">
                      <span className="chart-tooltip-dot" style={{ background: item.color }} />
                      {item.name}
                    </span>
                    <span className="chart-tooltip-value text-primary font-bold">
                      {val}{" "}
                      <span className="text-[10px] text-muted font-normal">
                        ({share}%)
                      </span>
                    </span>
                  </div>
                );
              })}
              <div className="chart-tooltip-divider" />
              <div className="chart-tooltip-row text-[11px]">
                <span className="text-muted">Total New Accounts</span>
                <span className="font-bold text-primary">{activeMonthTotal}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Summary Cards */}
      <div className="dashboard-growth-summary">
        {series.map((item) => (
          <div key={item.key} className="dashboard-growth-item">
            <span>{item.name}</span>
            <strong>{item.current.toLocaleString("en-IN")} this month</strong>
            <small>
              {item.growthRate == null
                ? item.current > 0
                  ? "New registrations"
                  : "No prior baseline"
                : `${item.growthRate >= 0 ? "+" : ""}${item.growthRate.toFixed(1)}% vs. last month`}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
 * MAIN SECTION: AnalyticsTrendsSection
 * ───────────────────────────────────────────────────────────── */
export function AnalyticsTrendsSection() {
  const [activeRange, setActiveRange] = useState<"7D" | "30D" | "THIS_MONTH" | "CUSTOM">("30D");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [bookingGranularity, setBookingGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const [financialGranularity, setFinancialGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const [data, setData] = useState<AnalyticsTrendsData | null>(null);
  const [_isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [_lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchAnalytics = useCallback(
    async (range: string, start?: string, end?: string) => {
      setIsRefreshing(true);
      try {
        const res = await adminApi.getAnalyticsTrends({
          range,
          startDate: start || undefined,
          endDate: end || undefined,
        });
        setData(res);
        setLastRefreshed(new Date());
      } catch (err) {
        console.error("Failed to load analytics trends:", err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchAnalytics(activeRange, customStart, customEnd);
  }, [activeRange, fetchAnalytics]);

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      void fetchAnalytics("CUSTOM", customStart, customEnd);
    }
  };

  const currentFinancialData = useMemo(() => {
    if (!data) return [];
    if (financialGranularity === "daily") return data.financialTrends.daily;
    if (financialGranularity === "weekly") return data.financialTrends.weekly;
    return data.financialTrends.monthly;
  }, [data, financialGranularity]);

  const currentBookingData = useMemo(() => {
    if (!data) return [];
    if (bookingGranularity === "daily") return data.bookingTrends.daily;
    if (bookingGranularity === "weekly") return data.bookingTrends.weekly;
    return data.bookingTrends.monthly;
  }, [data, bookingGranularity]);

  return (
    <section className="dashboard-analytics-section" aria-label="Analytics & trends">
      {/* Section Heading & Interactive Filter Toolbar */}
      <div className="dashboard-section-heading flex-wrap">
        <div>
          <h2 className="dashboard-section-title">Analytics &amp; trends</h2>
          <p className="dashboard-section-subtitle">
            Real-time business performance, booking trends, financial margins, and user growth.
          </p>
        </div>

        {/* Date Filter Toolbar */}
        <div className="analytics-filter-bar">
          <div className="analytics-filter-group">
            <button
              type="button"
              className={`analytics-filter-btn ${activeRange === "7D" ? "active" : ""}`}
              onClick={() => setActiveRange("7D")}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              className={`analytics-filter-btn ${activeRange === "30D" ? "active" : ""}`}
              onClick={() => setActiveRange("30D")}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              className={`analytics-filter-btn ${activeRange === "THIS_MONTH" ? "active" : ""}`}
              onClick={() => setActiveRange("THIS_MONTH")}
            >
              This Month
            </button>
            <button
              type="button"
              className={`analytics-filter-btn ${activeRange === "CUSTOM" ? "active" : ""}`}
              onClick={() => setActiveRange("CUSTOM")}
            >
              Custom Range
            </button>
          </div>

          {activeRange === "CUSTOM" && (
            <div className="analytics-custom-inputs">
              <span>From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="analytics-date-input"
              />
              <span>To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="analytics-date-input"
              />
              <button
                type="button"
                onClick={handleApplyCustom}
                className="analytics-filter-btn active"
              >
                Apply
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchAnalytics(activeRange, customStart, customEnd)}
              disabled={isRefreshing}
              className="p-1.5 rounded hover:bg-surface-subtle text-muted hover:text-primary transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw size={14} className={isRefreshing ? "animate-spin text-brand" : ""} />
            </button>
            <span className="dashboard-period-label">
              <Activity size={14} />
              Live operational data
            </span>
          </div>
        </div>
      </div>

      {/* Selected Period Performance Metric Strip */}
      {data && (
        <div className="analytics-metrics-strip">
          <div className="analytics-strip-card">
            <span>Period Bookings</span>
            <strong>{data.totals.totalBookings.toLocaleString("en-IN")}</strong>
            <small className="text-success">
              {data.totals.totalBookings > 0
                ? `${Math.round((data.totals.completedBookings / data.totals.totalBookings) * 100)}% completed`
                : "No active trips"}
            </small>
          </div>
          <div className="analytics-strip-card">
            <span>Gross Revenue</span>
            <strong>{formatINR(data.totals.totalRevenue)}</strong>
            <small className="text-info">Captured from customer orders</small>
          </div>
          <div className="analytics-strip-card">
            <span>Driver Payouts</span>
            <strong>{formatINR(data.totals.totalDriverPayouts)}</strong>
            <small className="text-brand-secondary">Driver earnings in period</small>
          </div>
          <div className="analytics-strip-card">
            <span>Net Platform Margin</span>
            <strong className="text-emerald-600">{formatINR(data.totals.totalPlatformMargin)}</strong>
            <small className="text-emerald-700 font-semibold">
              {data.totals.marginPercentage}% Platform Margin
            </small>
          </div>
        </div>
      )}

      {/* 2x2 Chart Grid + Full-Width Growth Chart */}
      <div className="dashboard-chart-grid">
        {/* 1. Daily / Weekly / Monthly Booking Trends */}
        <section className="card dashboard-chart-card">
          <div className="dashboard-chart-heading">
            <div className="min-w-0">
              <h3 className="dashboard-section-title">Cab booking trends</h3>
              <p className="dashboard-section-subtitle">
                {bookingGranularity === "daily"
                  ? "Bookings created each day in selected date range"
                  : bookingGranularity === "weekly"
                  ? "Weekly aggregated booking volume"
                  : "Monthly booking trajectory"}
              </p>
            </div>
            <Car size={16} className="text-muted" />
          </div>
          {data ? (
            <BookingTrendsChart
              data={currentBookingData}
              granularity={bookingGranularity}
              onGranularityChange={setBookingGranularity}
            />
          ) : (
            <div className="dashboard-chart-empty">Loading booking trends…</div>
          )}
        </section>

        {/* 2. Revenue vs Driver Payouts */}
        <section className="card dashboard-chart-card">
          <div className="dashboard-chart-heading">
            <div className="min-w-0">
              <h3 className="dashboard-section-title">Revenue vs. driver payouts</h3>
              <p className="dashboard-section-subtitle">
                Gross customer revenue compared to driver earnings
              </p>
            </div>
            <Wallet size={16} className="text-muted" />
          </div>
          {data ? (
            <RevenueVsPayoutsChart
              data={currentFinancialData}
              granularity={financialGranularity}
              onGranularityChange={setFinancialGranularity}
            />
          ) : (
            <div className="dashboard-chart-empty">Loading revenue breakdown…</div>
          )}
        </section>

        {/* 3. Platform Margin & Profit Trends */}
        <section className="card dashboard-chart-card">
          <div className="dashboard-chart-heading">
            <div className="min-w-0">
              <h3 className="dashboard-section-title">Platform profit &amp; margin trends</h3>
              <p className="dashboard-section-subtitle">
                Net margin trajectory (revenue less driver earnings)
              </p>
            </div>
            <TrendingUp size={16} className="text-muted" />
          </div>
          {data ? (
            <PlatformMarginTrendChart
              data={currentFinancialData}
              totalMargin={data.totals.totalPlatformMargin}
              marginPercent={data.totals.marginPercentage}
              granularity={financialGranularity}
              onGranularityChange={setFinancialGranularity}
            />
          ) : (
            <div className="dashboard-chart-empty">Loading margin analytics…</div>
          )}
        </section>

        {/* 4. Booking Status Distribution Donut */}
        <section className="card dashboard-chart-card">
          <div className="dashboard-chart-heading">
            <div className="min-w-0">
              <h3 className="dashboard-section-title">Booking status distribution</h3>
              <p className="dashboard-section-subtitle">
                Completed, in-progress, and cancelled trips
              </p>
            </div>
            <PieChartIcon size={16} className="text-muted" />
          </div>
          {data ? (
            <BookingStatusDonutChart
              data={data.bookingStatusDistribution}
              total={data.totals.totalBookings}
            />
          ) : (
            <div className="dashboard-chart-empty">Loading status breakdown…</div>
          )}
        </section>

        {/* 5. Active Requirements by Status */}
        <section className="card dashboard-chart-card">
          <div className="dashboard-chart-heading">
            <div className="min-w-0">
              <h3 className="dashboard-section-title">Active requirements by status</h3>
              <p className="dashboard-section-subtitle">
                Currently open, dispatching, and in-flight demand
              </p>
            </div>
            <ClipboardList size={16} className="text-muted" />
          </div>
          {data ? (
            <ActiveRequirementsStatusChart
              activeRequirements={data.activeRequirementsByStatus}
              allRequirements={data.allRequirementsByStatus}
              totalActive={data.totals.totalActiveRequirements}
              totalAll={data.totals.totalRequirements}
            />
          ) : (
            <div className="dashboard-chart-empty">Loading requirement statuses…</div>
          )}
        </section>

        {/* 6. User Growth Rate (Full Width) */}
        <section className="card dashboard-chart-card">
          <div className="dashboard-chart-heading">
            <div className="min-w-0">
              <h3 className="dashboard-section-title">User growth rate</h3>
              <p className="dashboard-section-subtitle">
                Monthly registrations from database records across all user roles
              </p>
            </div>
            <Users size={16} className="text-muted" />
          </div>
          {data ? (
            <UserGrowthTrendsChart
              months={data.userGrowth.months}
              series={data.userGrowth.series}
            />
          ) : (
            <div className="dashboard-chart-empty">Loading user registration trends…</div>
          )}
        </section>
      </div>
    </section>
  );
}
