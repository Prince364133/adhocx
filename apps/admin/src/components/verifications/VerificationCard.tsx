"use client";

import React from "react";
import {
  BadgeCheck,
  Building2,
  Phone,
  MapPin,
  FileText,
  Mail,
} from "lucide-react";
import { VerificationItem } from "../../lib/api/types";

interface CardProps {
  item: VerificationItem;
  onSelect: (item: VerificationItem) => void;
  onApproveQuick: (item: VerificationItem) => void;
  onDeclineQuick: (item: VerificationItem) => void;
  isProcessing?: boolean;
}

export const VerificationCard: React.FC<CardProps> = ({
  item,
  onSelect,
  onApproveQuick,
  onDeclineQuick,
  isProcessing: _isProcessing = false,
}) => {
  const isDriver = item.entityType === "DRIVER";
  const isUnderReview = item.verificationStatus === "UNDER_REVIEW";
  const isPending = item.verificationStatus === "PENDING";
  const isVerified = item.verificationStatus === "VERIFIED";
  const isRejected = item.verificationStatus === "REJECTED";

  const statusColor = isVerified
    ? "var(--color-success)"
    : isRejected
      ? "var(--color-danger)"
      : isPending
        ? "var(--text-muted)"
        : "var(--color-warning)";

  const statusBg = isVerified
    ? "var(--color-success-bg)"
    : isRejected
      ? "var(--color-danger-bg)"
      : isPending
        ? "rgba(100, 116, 139, 0.12)"
        : "var(--color-warning-bg)";

  const statusLabel = isVerified
    ? "Approved"
    : isRejected
      ? "Declined"
      : isPending
        ? "Incomplete Draft"
        : "Under Review";

  return (
    <div
      onClick={() => onSelect(item)}
      className="card interactive-card flex flex-col justify-between relative overflow-hidden"
      style={{ padding: "0.85rem 0.98rem" }}
    >
      <div>
        {/* Card Header: Entity Type Tag & Status */}
        <div
          className="flex justify-between items-center"
          style={{ marginBottom: "0.68rem" }}
        >
          <span
            className="font-bold uppercase rounded-xs flex items-center"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.06em",
              color: isDriver ? "var(--text-brand)" : "var(--color-info)",
              background: isDriver
                ? "var(--brand-primary-subtle)"
                : "rgba(14, 165, 233, 0.12)",
              padding: "0.18rem 0.44rem",
              gap: "0.32rem",
            }}
          >
            {isDriver ? <BadgeCheck size={12} /> : <Building2 size={12} />}
            <span>{isDriver ? "DRIVER" : "VENDOR"} KYC</span>
          </span>

          <span
            className="font-bold rounded-xs"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.04em",
              color: statusColor,
              background: statusBg,
              padding: "0.18rem 0.44rem",
            }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Applicant Avatar & Name */}
        <div
          className="flex items-center"
          style={{ gap: "0.62rem", marginBottom: "0.68rem" }}
        >
          <div
            className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
            style={{
              width: "36px",
              height: "36px",
              background: isDriver
                ? "var(--brand-violet-gradient)"
                : "linear-gradient(135deg, #0ea5e9, #0284c7)",
              fontSize: "0.88rem",
              color: "#ffffff",
            }}
          >
            {item.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <div className="text-body-xl font-bold text-primary whitespace-nowrap overflow-hidden text-ellipsis">
              {item.name}
            </div>
            {item.organizationName && (
              <div
                className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                style={{ color: "var(--brand-secondary)" }}
              >
                {item.organizationName}
              </div>
            )}
            <div
              className="text-sm text-muted flex items-center mt-snug"
              style={{ gap: "0.3rem" }}
            >
              <Phone size={12} />
              <span>{item.phone || "Email contact only"}</span>
            </div>
            {item.email && (
              <div
                className="text-label text-muted flex items-center"
                style={{ gap: "0.3rem", marginTop: "0.1rem" }}
              >
                <Mail size={12} style={{ flexShrink: 0 }} />
                <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {item.email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle or Organization Specs */}
        <div
          className="bg-card-elevated rounded-sm mb-3 flex flex-col text-sm"
          style={{ padding: "0.625rem 0.75rem", gap: "0.375rem" }}
        >
          {isDriver ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted">Vehicle Plate:</span>
                <span className="font-bold text-primary">
                  {item.vehiclePlate || "Not Registered"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Class & Model:</span>
                <span className="text-secondary">
                  {item.vehicleType
                    ? `${item.vehicleType}${item.vehicleModel ? ` · ${item.vehicleModel}` : ""}`
                    : item.vehicleModel || "Unspecified"}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between">
                <span className="text-muted">GST Number:</span>
                <span className="font-bold text-primary">
                  {item.gstNumber || "Not Provided"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">HQ City:</span>
                <span className="text-secondary">
                  {item.address || item.location?.address || "Unspecified"}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Live Location Tag */}
        {item.location && (
          <div
            className="flex items-center text-xs text-muted mb-3 whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ gap: "0.375rem" }}
          >
            <MapPin size={12} />
            <span className="overflow-hidden text-ellipsis">
              {item.location.address}
            </span>
          </div>
        )}

        {/* Rejection notice if present */}
        {isRejected && item.rejectionReason && (
          <div
            className="bg-danger-subtle rounded-xs p-2 text-xs text-danger mb-3"
            style={{ border: "1px solid var(--color-danger-border)" }}
          >
            <strong>Decline Reason:</strong> {item.rejectionReason}
          </div>
        )}
      </div>

      {/* Card Footer: Document count & Action buttons */}
      <div>
        <div className="flex justify-between items-center border-t border-subtle pt-3 mb-3 text-sm">
          <span className="text-muted flex items-center gap-tight">
            <FileText size={13} />
            <span>{item.documents?.length ?? 0} Docs Uploaded</span>
          </span>
          <span className="text-muted text-xs">
            {new Date(item.submittedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className="flex-1 p-2 bg-surface-elevated text-primary text-sm font-semibold cursor-pointer"
            style={{
              borderRadius: "6px",
              border: "1px solid var(--border-light)",
              transition: "background 0.15s ease",
            }}
          >
            Inspect Details →
          </button>

          {isUnderReview && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveQuick(item);
                }}
                title="Quick Approve"
                className="py-2 px-3 text-sm font-bold cursor-pointer"
                style={{
                  borderRadius: "6px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  color: "#10b981",
                }}
              >
                Approve
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeclineQuick(item);
                }}
                title="Decline with Reason"
                className="py-2 px-3 text-sm font-bold cursor-pointer"
                style={{
                  borderRadius: "6px",
                  background: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  color: "#f43f5e",
                }}
              >
                Decline
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
