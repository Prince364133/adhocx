"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  User,
  Car,
  Building2,
  MapPin,
  Compass,
  FileText,
  CheckCircle2,
  XCircle,
  Edit3,
  Check,
  Loader2,
} from "lucide-react";
import {
  VerificationItem,
  DriverKycDocument,
  DigioComplianceAlert,
} from "../../lib/api/types";
import { adminApi, resolveDocumentUrl } from "../../lib/api/client";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { DigioVerificationPanel } from "./DigioVerificationPanel";
import { Drawer, Button } from "../common";

interface DetailModalProps {
  item: VerificationItem | null;
  onClose: () => void;
  /** `overrideReason` is set when the driver has compliance blockers and the admin justified approving anyway. */
  onApprove: (item: VerificationItem, overrideReason?: string) => void;
  onDecline: (item: VerificationItem) => void;
  isProcessing: boolean;
  /** Blocking issues the API returned (400 COMPLIANCE_BLOCKERS) on the last approval attempt for this item. */
  approvalBlockers?: DigioComplianceAlert[];
}

export const VerificationDetailModal: React.FC<DetailModalProps> = ({
  item: selectedItem,
  onClose,
  onApprove,
  onDecline,
  isProcessing,
  approvalBlockers,
}) => {
  // Keep last selected item while closing so Drawer slide-out animation never flashes empty.
  const [cachedItem, setCachedItem] = useState<VerificationItem | null>(
    selectedItem,
  );
  useEffect(() => {
    if (selectedItem) {
      setCachedItem(selectedItem);
    }
  }, [selectedItem]);
  const item = selectedItem ?? cachedItem;

  const [panelAlerts, setPanelAlerts] = useState<DigioComplianceAlert[]>([]);
  const [overrideReason, setOverrideReason] = useState("");
  const itemId = selectedItem?.id;
  useEffect(() => {
    setPanelAlerts([]);
    setOverrideReason("");
    setIsEditingContact(false);
    setContactError(null);
    setEditName(selectedItem?.name || "");
    setEditPhone(selectedItem?.phone || "");
  }, [itemId, selectedItem?.name, selectedItem?.phone]);
  const handleAlertsChange = useCallback(
    (alerts: DigioComplianceAlert[]) => setPanelAlerts(alerts),
    [],
  );

  // Blockers known from the Digio panel plus any the API reported on a refused approval.
  const blockers = useMemo(() => {
    const byCode = new Map<string, DigioComplianceAlert>();
    [...panelAlerts, ...(approvalBlockers || [])]
      .filter((a) => a.severity === "BLOCKER")
      .forEach((a) => byCode.set(a.code, a));
    return [...byCode.values()];
  }, [panelAlerts, approvalBlockers]);
  const isPendingItem = item?.verificationStatus === "PENDING";
  const needsOverride =
    item?.entityType === "DRIVER" && (blockers.length > 0 || isPendingItem);
  const approveDisabled = isProcessing;

  const [activePreviewDoc, setActivePreviewDoc] =
    useState<DriverKycDocument | null>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editName, setEditName] = useState(selectedItem?.name || "");
  const [editPhone, setEditPhone] = useState(selectedItem?.phone || "");
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  if (!item) return null;

  const handleSaveContact = async () => {
    setIsSavingContact(true);
    setContactError(null);
    try {
      if (item.entityType === "DRIVER") {
        await adminApi.updateDriver(item.id, {
          fullName: editName.trim(),
          phone: editPhone.trim(),
        });
      } else {
        await adminApi.updateVendor(item.id, {
          fullName: editName.trim(),
          phone: editPhone.trim(),
        });
      }
      item.name = editName.trim();
      item.phone = editPhone.trim();
      setIsEditingContact(false);
    } catch (e: any) {
      setContactError(e.message || "Failed to update contact info");
    } finally {
      setIsSavingContact(false);
    }
  };

  const isDriver = item.entityType === "DRIVER";
  const isVerified = item.verificationStatus === "VERIFIED";
  const isRejected = item.verificationStatus === "REJECTED";
  const isPending = item.verificationStatus === "PENDING";
  const isUnderReview = item.verificationStatus === "UNDER_REVIEW";

  const statusBg = isVerified
    ? "rgba(16, 185, 129, 0.15)"
    : isRejected
      ? "rgba(244, 63, 94, 0.15)"
      : isPending
        ? "rgba(100, 116, 139, 0.15)"
        : "rgba(245, 158, 11, 0.15)";

  const statusColor = isVerified
    ? "#10b981"
    : isRejected
      ? "#f43f5e"
      : isPending
        ? "#64748b"
        : "#f59e0b";
  const statusLabel = isVerified
    ? "VERIFIED"
    : isRejected
      ? "REJECTED"
      : isPending
        ? "ONBOARDING INCOMPLETE (DRAFT)"
        : "UNDER REVIEW";

  const drawerFooter = (
    <div className="flex justify-between items-center w-full gap-3 flex-wrap">
      <Button variant="outline" size="sm" onClick={onClose}>
        Close
      </Button>

      <div className="flex flex-wrap" style={{ gap: "0.625rem" }}>
        <Button
          variant="danger"
          size="sm"
          onClick={() => onDecline(item)}
          disabled={isProcessing}
          leftIcon={<XCircle size={15} />}
        >
          Decline Application...
        </Button>

        <Button
          variant="success"
          size="sm"
          onClick={() =>
            onApprove(
              item,
              needsOverride
                ? overrideReason.trim() || "Approved by admin override"
                : undefined,
            )
          }
          disabled={approveDisabled}
          isLoading={isProcessing}
          leftIcon={<CheckCircle2 size={15} />}
        >
          {isProcessing
            ? "Activating..."
            : needsOverride
              ? "Approve with Override"
              : "Approve & Activate"}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Drawer
        isOpen={Boolean(selectedItem)}
        onClose={onClose}
        width="min(94vw, 760px)"
        title={`${item.name}${item.organizationName ? ` · ${item.organizationName}` : ""}`}
        subtitle={`${item.entityType} APPLICATION`}
        badge={
          <span
            className="text-caption font-bold whitespace-nowrap"
            style={{
              color: statusColor,
              background: statusBg,
              padding: "0.2rem 0.55rem",
              borderRadius: "999px",
            }}
          >
            {statusLabel}
          </span>
        }
        footer={drawerFooter}
      >
        <div className="flex flex-col" style={{ gap: "1.15rem" }}>
          {/* Incomplete draft notice if still pending submission */}
          {isPending && (
            <div
              className="py-3 px-4 flex items-center gap-3 text-sm font-medium"
              style={{
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                borderRadius: "10px",
                color: "#d97706",
              }}
            >
              <AlertTriangle size={18} className="flex-shrink-0" />
              <div>
                <strong>Onboarding Incomplete (Draft Registration):</strong> This applicant verified their mobile number but has not uploaded required KYC documents or submitted their registration for review.
              </div>
            </div>
          )}

          {/* Rejection banner if rejected */}
          {isRejected && item.rejectionReason && (
            <div
              className="py-4 px-5"
              style={{
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                borderRadius: "10px",
              }}
            >
              <div
                className="font-bold text-md mb-1 flex items-center gap-2"
                style={{ color: "#f43f5e" }}
              >
                <AlertTriangle size={16} /> Application Was Declined
              </div>
              <div className="text-secondary text-base">
                <strong>Reason Sent to Applicant:</strong>{" "}
                {item.rejectionReason}
              </div>
            </div>
          )}

          {/* Grid for Personal Info & Vehicle/Fleet Details */}
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            }}
          >
            {/* Applicant Profile Card */}
            <div
              className="bg-base border p-5"
              style={{ borderRadius: "12px" }}
            >
              <div
                className="flex justify-between items-center mb-4"
                style={{ paddingTop: "0.1rem" }}
              >
                <h3
                  className="font-bold uppercase text-muted flex items-center gap-2 m-0"
                  style={{ fontSize: "0.94rem", letterSpacing: "0.06em" }}
                >
                  <User size={15} color="var(--text-brand)" /> Profile
                  Information
                </h3>
                {!isEditingContact ? (
                  <button
                    onClick={() => {
                      setEditName(item.name);
                      setEditPhone(item.phone);
                      setIsEditingContact(true);
                    }}
                    className="bg-transparent text-brand text-sm font-semibold cursor-pointer flex items-center gap-1"
                    style={{
                      border: "1px solid var(--border-light)",
                      borderRadius: "6px",
                      padding: "0.2rem 0.5rem",
                    }}
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                ) : (
                  <div className="flex" style={{ gap: "0.375rem" }}>
                    <button
                      onClick={handleSaveContact}
                      disabled={isSavingContact}
                      className="bg-brand border-0 text-sm font-semibold cursor-pointer flex items-center gap-1"
                      style={{
                        borderRadius: "6px",
                        color: "#fff",
                        padding: "0.2rem 0.5rem",
                      }}
                    >
                      {isSavingContact ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}{" "}
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingContact(false)}
                      disabled={isSavingContact}
                      className="bg-transparent text-muted text-sm cursor-pointer"
                      style={{
                        border: "1px solid var(--border-light)",
                        borderRadius: "6px",
                        padding: "0.2rem 0.5rem",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {contactError && (
                <div className="text-sm mb-2" style={{ color: "#f43f5e" }}>
                  {contactError}
                </div>
              )}

              <div className="flex flex-col gap-3 text-base">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Full Name:</span>
                  {isEditingContact ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-surface border text-primary py-1 px-2 text-base"
                      style={{ borderRadius: "6px", width: "180px" }}
                    />
                  ) : (
                    <span className="font-semibold text-primary">
                      {item.name}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Mobile Number:</span>
                  {isEditingContact ? (
                    <input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="bg-surface border text-primary py-1 px-2 text-base"
                      style={{ borderRadius: "6px", width: "180px" }}
                    />
                  ) : (
                    <span className="font-semibold text-primary">
                      {item.phone}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Email Address:</span>
                  <span
                    className="font-semibold text-base"
                    style={{
                      color: item.email
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    }}
                  >
                    {item.email || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Entity Role:</span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    {item.entityType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Submitted At:</span>
                  <span className="text-secondary">
                    {new Date(item.submittedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicle / Enterprise Card */}
            <div
              className="bg-base border p-5"
              style={{ borderRadius: "12px" }}
            >
              <h3
                className="font-bold uppercase text-muted mb-4 flex items-center gap-2"
                style={{
                  fontSize: "0.94rem",
                  letterSpacing: "0.06em",
                  paddingTop: "0.1rem",
                }}
              >
                {isDriver ? (
                  <Car size={15} color="var(--text-brand)" />
                ) : (
                  <Building2 size={15} color="var(--color-info)" />
                )}{" "}
                {isDriver ? "Vehicle Specifications" : "Business Details"}
              </h3>

              <div className="flex flex-col gap-3 text-base">
                {isDriver ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted">Registration Plate:</span>
                      <span
                        className="font-bold"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        {item.vehiclePlate || "Not Registered"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Vehicle Tier:</span>
                      <span className="font-semibold text-primary">
                        {item.vehicleType || "Unspecified"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Car Model:</span>
                      <span className="text-secondary">
                        {item.vehicleModel || "Unspecified"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted">Organization:</span>
                      <span
                        className="font-bold"
                        style={{ color: "var(--accent-secondary)" }}
                      >
                        {item.organizationName || "Not Provided"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">GST Number:</span>
                      <span className="font-semibold text-primary">
                        {item.gstNumber || "Not Provided"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Address:</span>
                      <span className="text-secondary">
                        {item.address ||
                          item.location?.address ||
                          "Not Provided"}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Live Registered GPS Telemetry Card */}
          {item.location && (
            <div
              className="bg-base border p-5"
              style={{ borderRadius: "12px" }}
            >
              <div
                className="flex justify-between items-center mb-4"
                style={{ paddingTop: "0.1rem" }}
              >
                <h3
                  className="font-bold uppercase text-muted flex items-center gap-2"
                  style={{ fontSize: "0.94rem", letterSpacing: "0.06em" }}
                >
                  <MapPin size={15} color="var(--color-success)" /> Registered
                  Location & Telemetry
                </h3>
                <span
                  className="text-xs font-semibold text-success"
                  style={{
                    background: "rgba(16, 185, 129, 0.12)",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                  }}
                >
                  GPS Active (Zone A)
                </span>
              </div>

              <div className="flex gap-6 items-center flex-wrap">
                <div
                  className="bg-surface-elevated border flex flex-col items-center justify-center gap-1 text-brand"
                  style={{
                    width: "120px",
                    height: "80px",
                    borderRadius: "8px",
                  }}
                >
                  <Compass size={24} color="var(--text-brand)" />
                  <span className="text-xs font-semibold">Map Radar</span>
                </div>

                <div
                  className="flex flex-col text-base"
                  style={{ gap: "0.375rem" }}
                >
                  <div>
                    <span className="text-muted">Registered Location: </span>
                    <strong className="text-primary">
                      {item.location.address}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted">Coordinates: </span>
                    <span
                      className="text-mono"
                      style={{ color: "var(--accent-secondary)" }}
                    >
                      {item.location.latitude.toFixed(4)}° N,{" "}
                      {item.location.longitude.toFixed(4)}° E
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Document Verification Gallery */}
          <div>
            <div
              className="flex justify-between items-center mb-4"
              style={{ paddingTop: "0.1rem" }}
            >
              <h3
                className="font-bold uppercase text-muted flex items-center gap-2"
                style={{ fontSize: "0.94rem", letterSpacing: "0.06em" }}
              >
                <FileText size={15} color="var(--text-brand)" /> KYC &
                Compliance Documents ({item.documents?.length ?? 0})
              </h3>
              <span className="text-sm text-muted">
                Click document card to inspect & zoom
              </span>
            </div>

            {!item.documents || item.documents.length === 0 ? (
              <div
                className="p-8 text-center bg-base text-muted text-base"
                style={{
                  border: "1px dashed var(--border)",
                  borderRadius: "10px",
                }}
              >
                No documents have been uploaded for this applicant yet.
              </div>
            ) : (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                }}
              >
                {item.documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setActivePreviewDoc(doc)}
                    className="bg-base border p-4 flex flex-col gap-3 cursor-pointer"
                    style={{
                      borderRadius: "10px",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--accent-primary)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <div
                      className="bg-surface-elevated flex items-center justify-center overflow-hidden relative border"
                      style={{ height: "110px", borderRadius: "6px" }}
                    >
                      <img
                        src={resolveDocumentUrl(doc.fileUrl)}
                        alt={doc.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const currentSrc = e.currentTarget.src;
                          if (
                            (currentSrc.includes("localhost:") ||
                              currentSrc.includes(":7002/uploads/")) &&
                            !e.currentTarget.dataset.retried
                          ) {
                            e.currentTarget.dataset.retried = "true";
                            const filePart = currentSrc.split("/uploads/")[1];
                            if (filePart) {
                              e.currentTarget.src = `https://api.adhocx.com/uploads/${filePart}`;
                              return;
                            }
                          }
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <FileText
                        size={28}
                        color="var(--text-muted)"
                        style={{ position: "absolute" }}
                      />
                    </div>

                    <div>
                      <div className="text-base font-semibold text-primary">
                        {doc.title}
                      </div>
                      <div className="text-xs text-muted mt-micro">
                        Encrypted Cloudflare R2
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Digio Driver Identity, DL & Vehicle RC Verification Panel */}
            {item.entityType === "DRIVER" && (
              <DigioVerificationPanel
                item={item}
                onAlertsChange={handleAlertsChange}
              />
            )}
          </div>

          {/* Compliance blockers: approving requires a recorded justification */}
          {needsOverride && (
            <div
              role="alert"
              className="py-4 px-5"
              style={{
                borderRadius: "10px",
                border: "1px solid rgba(244, 63, 94, 0.45)",
                background: "rgba(244, 63, 94, 0.08)",
              }}
            >
              <div
                className="flex items-center gap-2 font-bold text-md"
                style={{ color: "#f43f5e" }}
              >
                <AlertTriangle size={16} />{" "}
                {blockers.length > 0
                  ? `${blockers.length} compliance issue${blockers.length === 1 ? "" : "s"} detected`
                  : "Onboarding Incomplete (Draft Registration)"}{" "}
                (approving requires administrative override)
              </div>
              {blockers.length > 0 && (
                <ul
                  className="mt-2 mx-0 mb-3 pl-5 text-primary text-base"
                  style={{ lineHeight: 1.5 }}
                >
                  {blockers.map((b) => (
                    <li key={b.code}>
                      <strong>{b.code.replace(/_/g, " ")}</strong>
                      {b.message ? ` — ${b.message}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              {blockers.length === 0 && isPendingItem && (
                <p className="mt-2 mx-0 mb-3 text-secondary text-base">
                  This applicant has not completed document submission. If approving manually without applicant documents, a recorded justification note is required.
                </p>
              )}
              <label
                htmlFor="override-reason"
                className="block text-base font-semibold text-secondary"
                style={{ marginBottom: "0.375rem" }}
              >
                Optional override note (recorded in the audit log)
              </label>
              <textarea
                id="override-reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={2}
                placeholder="Optional note (leave blank to approve immediately with default override audit entry)"
                className="w-full box-border py-2 px-3 bg-surface text-primary text-base"
                style={{
                  borderRadius: "8px",
                  border: "1px solid var(--border-light)",
                  resize: "vertical",
                }}
              />
            </div>
          )}
        </div>
      </Drawer>

      {/* Document Zoom Lightbox Modal */}
      <DocumentPreviewModal
        isOpen={activePreviewDoc !== null}
        document={activePreviewDoc}
        onClose={() => setActivePreviewDoc(null)}
      />
    </>
  );
};
