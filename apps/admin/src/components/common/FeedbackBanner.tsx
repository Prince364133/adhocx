"use client";

import React, { useEffect } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";

export type BannerTone = "success" | "error" | "warning" | "info";

export interface FeedbackBannerProps {
  type: BannerTone;
  title?: string;
  message: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

const TONE_MAP: Record<
  BannerTone,
  {
    bg: string;
    border: string;
    color: string;
    icon: React.ReactNode;
  }
> = {
  success: {
    bg: "var(--color-success-bg)",
    border: "var(--color-success-border)",
    color: "var(--color-success)",
    icon: <CheckCircle2 size={16} />,
  },
  error: {
    bg: "var(--color-danger-bg)",
    border: "var(--color-danger-border)",
    color: "var(--color-danger)",
    icon: <AlertCircle size={16} />,
  },
  warning: {
    bg: "var(--color-warning-bg)",
    border: "var(--color-warning-border)",
    color: "var(--color-warning)",
    icon: <AlertTriangle size={16} />,
  },
  info: {
    bg: "var(--color-info-bg)",
    border: "var(--color-info-border)",
    color: "var(--color-info)",
    icon: <Info size={16} />,
  },
};

export const FeedbackBanner: React.FC<FeedbackBannerProps> = ({
  type,
  title,
  message,
  onDismiss,
  autoDismissMs,
  action,
  style = {},
}) => {
  useEffect(() => {
    if (!autoDismissMs || !onDismiss) return;
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [autoDismissMs, onDismiss, message, type]);

  const tone = TONE_MAP[type];

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className="animate-banner"
      style={{
        padding: "0.58rem 0.85rem",
        borderRadius: "var(--radius-lg)",
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.65rem",
        fontSize: "0.775rem",
        ...style,
      }}
    >
      <div
        className="flex items-start min-w-0 flex-1"
        style={{ gap: "0.55rem" }}
      >
        <span
          className="inline-flex flex-shrink-0"
          style={{ marginTop: "0.1rem" }}
        >
          {tone.icon}
        </span>
        <div className="min-w-0" style={{ lineHeight: 1.4 }}>
          {title && (
            <div className="font-bold" style={{ marginBottom: "0.1rem" }}>
              {title}
            </div>
          )}
          <div className="font-medium">{message}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {action}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="bg-transparent border-0 cursor-pointer rounded-xs inline-flex items-center justify-center"
            style={{ color: "inherit", padding: "0.2rem", opacity: 0.8 }}
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
};
