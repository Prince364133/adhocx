"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: number;
    label?: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  accentColor?: string;
  onClick?: () => void;
  active?: boolean;
  style?: React.CSSProperties;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  trend,
  icon,
  accentColor = "var(--text-brand)",
  onClick,
  active = false,
  style = {},
}) => {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        background: "var(--bg-card)",
        border: active
          ? "1px solid var(--border-focus)"
          : "1px solid var(--border)",
        borderTop: `2px solid ${accentColor}`,
        borderRadius: "var(--radius-lg)",
        padding: "0.72rem 0.9rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "0.35rem",
        boxShadow: active ? "var(--shadow-glow-purple)" : "var(--shadow-card)",
        cursor: onClick ? "pointer" : "default",
        transition:
          "transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "var(--shadow-elevated)";
        if (onClick && !active) {
          e.currentTarget.style.borderColor = "var(--brand-primary-border)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = active
          ? "var(--shadow-glow-purple)"
          : "var(--shadow-card)";
        if (!active) {
          e.currentTarget.style.borderColor = "var(--border)";
        }
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="stat-label text-caption font-semibold text-secondary"
          style={{ lineHeight: 1.3 }}
        >
          {label}
        </span>
        {icon && (
          <span
            className="rounded-md bg-card-elevated border inline-flex items-center justify-center flex-shrink-0"
            style={{ width: "24px", height: "24px", color: accentColor }}
          >
            {icon}
          </span>
        )}
      </div>

      <div
        className="stat-value font-bold text-primary tabular-nums"
        style={{
          fontSize: "1.2rem",
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>

      {(subtext || trend) && (
        <div className="flex items-center justify-between gap-snug flex-wrap">
          {subtext && (
            <span
              className="text-micro text-muted"
              style={{ lineHeight: 1.35 }}
            >
              {subtext}
            </span>
          )}
          {trend && (
            <span
              className="inline-flex items-center font-semibold rounded-full"
              style={{
                gap: "0.22rem",
                fontSize: "0.67rem",
                padding: "0.1rem 0.42rem",
                background:
                  trend.isPositive !== false
                    ? "var(--color-success-bg)"
                    : "var(--color-danger-bg)",
                color:
                  trend.isPositive !== false
                    ? "var(--color-success)"
                    : "var(--color-danger)",
              }}
            >
              {trend.isPositive !== false ? (
                <TrendingUp size={11} />
              ) : (
                <TrendingDown size={11} />
              )}
              <span>
                {trend.value > 0 ? `+${trend.value}%` : `${trend.value}%`}
                {trend.label ? ` ${trend.label}` : ""}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
