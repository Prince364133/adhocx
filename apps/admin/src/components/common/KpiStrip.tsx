"use client";

import React from "react";

export type KpiTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "indigo"
  | "violet"
  | "neutral";

export interface KpiStripItem {
  id?: string;
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  tone?: KpiTone;
  accentColor?: string;
  onClick?: () => void;
  active?: boolean;
}

export interface KpiStripProps {
  items: KpiStripItem[];
  columns?: number;
  className?: string;
  style?: React.CSSProperties;
}

const TONE_VALUE_COLOR: Record<KpiTone, string> = {
  default: "var(--text-primary)",
  primary: "var(--text-brand)",
  indigo: "var(--text-brand)",
  violet: "var(--brand-violet-text)",
  neutral: "var(--text-secondary)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
};

export const KpiStrip: React.FC<KpiStripProps> = ({
  items,
  columns,
  className = "",
  style = {},
}) => {
  return (
    <div
      className={`kpi-strip ${className}`}
      style={{
        gridTemplateColumns: columns
          ? `repeat(${columns}, minmax(0, 1fr))`
          : `repeat(auto-fit, minmax(150px, 1fr))`,
        ...style,
      }}
    >
      {items.map((item, idx) => {
        const valueColor =
          item.accentColor || TONE_VALUE_COLOR[item.tone || "default"];
        const clickable = Boolean(item.onClick);

        return (
          <div
            key={item.id || `${item.label}-${idx}`}
            className={`kpi-strip-cell${clickable ? " is-clickable" : ""}`}
            onClick={item.onClick}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                item.onClick?.();
              }
            }}
            style={{
              backgroundColor: item.active
                ? "var(--brand-primary-subtle)"
                : undefined,
              boxShadow: item.active
                ? "inset 0 2px 0 var(--border-focus)"
                : undefined,
            }}
          >
            <div className="flex items-center gap-tight text-caption font-medium text-secondary min-w-0">
              {item.icon && (
                <span className="text-brand inline-flex items-center flex-shrink-0">
                  {item.icon}
                </span>
              )}
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {item.label}
              </span>
            </div>

            <div
              className="font-bold tabular-nums"
              style={{
                fontSize: "1.175rem",
                color: valueColor,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              {item.value}
            </div>

            {item.subtext && (
              <div
                className="text-micro text-muted overflow-hidden text-ellipsis whitespace-nowrap"
                style={{ lineHeight: 1.35 }}
              >
                {item.subtext}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
