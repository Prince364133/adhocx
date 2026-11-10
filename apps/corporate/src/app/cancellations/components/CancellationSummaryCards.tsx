"use client";

import {
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
} from "lucide-react";

export type CancellationMetric = "all" | "today" | "week" | "month";

interface CancellationSummaryCardsProps {
  counts: Record<CancellationMetric, number>;
  activeMetric: CancellationMetric | null;
  loading: boolean;
  onSelect: (metric: CancellationMetric) => void;
}

const metrics = [
  {
    key: "all",
    label: "Total Cancellations",
    icon: <CheckCircle2 size={17} />,
    color: "var(--brand-primary)",
  },
  {
    key: "today",
    label: "Today's Cancellations",
    icon: <CalendarDays size={17} />,
    color: "var(--color-info)",
  },
  {
    key: "week",
    label: "This Week's Cancellations",
    icon: <CalendarRange size={17} />,
    color: "var(--color-purple)",
  },
  {
    key: "month",
    label: "This Month's Cancellations",
    icon: <CalendarCheck2 size={17} />,
    color: "var(--color-success)",
  },
] as const;

export function CancellationSummaryCards({
  counts,
  activeMetric,
  loading,
  onSelect,
}: CancellationSummaryCardsProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: 14,
      }}
    >
      {metrics.map((metric) => {
        const active = activeMetric === metric.key;

        return (
          <button
            key={metric.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(metric.key)}
            className="surface-card"
            style={{
              minHeight: 116,
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              textAlign: "left",
              color: "var(--text-primary)",
              cursor: "pointer",
              borderColor: active ? metric.color : "var(--border-subtle)",
              boxShadow: active
                ? "var(--shadow-elevated)"
                : "var(--shadow-card)",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: "var(--text-secondary)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: `color-mix(in srgb, ${metric.color} 12%, transparent)`,
                  color: metric.color,
                  flexShrink: 0,
                }}
              >
                {metric.icon}
              </span>
              {metric.label}
            </span>
            {loading ? (
              <span
                aria-label="Loading count"
                style={{
                  width: 72,
                  height: 30,
                  borderRadius: 6,
                  backgroundColor: "var(--bg-surface-muted)",
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: 28,
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                {counts[metric.key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
