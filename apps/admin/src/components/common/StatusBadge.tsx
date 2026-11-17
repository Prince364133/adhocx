import React from "react";
import { Badge } from "../Badge";

export interface StatusBadgeProps {
  status?: string;
  label?: string;
  size?: "sm" | "md";
  showPulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = "UNKNOWN",
  label,
  size = "md",
  showPulse = false,
}) => {
  const norm = (status || "").toUpperCase().trim();

  // Determine semantic category
  let variant: "success" | "warning" | "danger" | "info" | "purple" | "neutral";
  let isLive = false;

  switch (norm) {
    case "VERIFIED":
    case "COMPLETED":
    case "FULFILLED":
    case "SETTLED":
    case "CAPTURED":
    case "ACTIVE":
    case "AVAILABLE":
    case "PUBLISHED":
    case "RESOLVED":
      variant = "success";
      break;

    case "OPEN":
    case "PENDING":
    case "UNDER_REVIEW":
    case "PARTIALLY_FULFILLED":
    case "BUSY":
    case "PROCESSING":
    case "AUTHORIZED":
      variant = "warning";
      isLive =
        norm === "UNDER_REVIEW" ||
        norm === "PARTIALLY_FULFILLED" ||
        norm === "PROCESSING";
      break;

    case "REJECTED":
    case "SUSPENDED":
    case "CANCELLED":
    case "FAILED":
    case "NO_SHOW":
    case "REFUNDED":
    case "EXPIRED":
      variant = "danger";
      break;

    case "DISPATCHING":
    case "IN_PROGRESS":
    case "ARRIVED":
    case "ASSIGNED":
      variant = "info";
      isLive = true;
      break;

    case "POSTED":
    case "CREATED":
    case "SENT":
      variant = "purple";
      break;

    case "CLOSED":
    case "DRAFT":
    case "OFFLINE":
    case "ARCHIVED":
    default:
      variant = "neutral";
      break;
  }

  const displayLabel = label ? label.toUpperCase() : norm.replace(/_/g, " ");

  return (
    <Badge variant={variant} size={size} showPulse={showPulse || isLive}>
      {displayLabel}
    </Badge>
  );
};
