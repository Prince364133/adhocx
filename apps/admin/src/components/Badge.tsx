import React from "react";

export type BadgeVariant =
  "success" | "warning" | "info" | "danger" | "neutral" | "primary" | "purple";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  status?: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  showPulse?: boolean;
};

export const Badge: React.FC<BadgeProps> = ({
  status,
  variant,
  size = "md",
  showPulse = false,
  children,
  className = "",
  ...props
}) => {
  const content = children ?? status ?? "";
  const text = typeof content === "string" ? content : status || "";
  const normalized = text.toUpperCase();

  let resolvedVariant = variant || "neutral";

  if (!variant) {
    switch (normalized) {
      case "OPEN":
      case "IN_PROGRESS":
      case "ARRIVED":
      case "POSTED":
      case "FULFILLED":
      case "ASSIGNED":
      case "BUSY":
        resolvedVariant = "info";
        break;

      case "RESOLVED":
      case "VERIFIED":
      case "COMPLETED":
      case "PAID":
      case "CAPTURED":
      case "SETTLED":
      case "AVAILABLE":
        resolvedVariant = "success";
        break;

      case "UNDER_REVIEW":
      case "PENDING":
      case "DISPATCHING":
      case "PROCESSING":
      case "PARTIALLY_FULFILLED":
      case "OFFLINE":
        resolvedVariant = "warning";
        break;

      case "REJECTED":
      case "SUSPENDED":
      case "CANCELLED":
      case "FAILED":
      case "NO_SHOW":
      case "UNAVAILABLE":
        resolvedVariant = "danger";
        break;
    }
  }

  const pulseVariant =
    resolvedVariant === "primary" ? "purple" : resolvedVariant;

  return (
    <span
      {...props}
      className={`badge badge-${resolvedVariant} badge-${size}${className ? ` ${className}` : ""}`.trim()}
    >
      {showPulse && <span className={`pulse-dot ${pulseVariant}`} />}
      {content}
    </span>
  );
};
