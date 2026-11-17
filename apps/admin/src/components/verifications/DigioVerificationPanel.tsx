"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ScanFace,
  Car,
  CreditCard,
  ShieldAlert,
  UserCheck,
  DownloadCloud,
  Landmark,
  Info,
} from "lucide-react";
import {
  DigioComplianceAlert,
  DigioEntityVerificationsResponse,
  DigioVerificationItem,
  VerificationItem,
} from "../../lib/api/types";
import { adminApi } from "../../lib/api/client";

interface DigioVerificationPanelProps {
  item: VerificationItem;
  /** Called whenever the driver's compliance alerts are (re)loaded. */
  onAlertsChange?: (alerts: DigioComplianceAlert[]) => void;
}

const DRIVER_CHECK_LABELS: Array<{ key: string; label: string }> = [
  { key: "DIGILOCKER", label: "DigiLocker" },
  { key: "ID_OCR", label: "ID OCR & Quality" },
  { key: "AADHAAR_MASK", label: "Aadhaar Masked" },
  { key: "PAN", label: "PAN Card" },
  { key: "DRIVING_LICENSE", label: "Driving License" },
  { key: "VEHICLE_RC", label: "Vehicle RC (Vahan)" },
  { key: "FACE_MATCH", label: "Face Match" },
  { key: "LIVENESS", label: "Selfie Liveness" },
  { key: "FUZZY_MATCH", label: "Name Cross-Match" },
  { key: "BANK_ACCOUNT", label: "Bank Account" },
  { key: "UPI_VPA", label: "UPI VPA" },
];

export const DigioVerificationPanel: React.FC<DigioVerificationPanelProps> = ({
  item,
  onAlertsChange,
}) => {
  const [data, setData] = useState<DigioEntityVerificationsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Manual override inputs when driver skipped pre-verification on onboarding
  const [panInput, setPanInput] = useState("");
  const [dlInput, setDlInput] = useState("");
  const [dobInput, setDobInput] = useState("");
  const [rcInput, setRcInput] = useState(item.vehiclePlate || "");

  const isDriver = item.entityType === "DRIVER";

  const loadVerifications = useCallback(async () => {
    if (!isDriver) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await adminApi.getDriverDigioVerifications(item.id);
      setData(res);
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Unable to load Digio verification telemetry",
      );
    } finally {
      setLoading(false);
    }
  }, [item.id, isDriver]);

  useEffect(() => {
    setRcInput(item.vehiclePlate || "");
    loadVerifications();
  }, [loadVerifications, item.vehiclePlate]);

  useEffect(() => {
    if (data) {
      if (item.verificationStatus === "PENDING") {
        onAlertsChange?.([]);
      } else {
        onAlertsChange?.(data.complianceAlerts || []);
      }
    }
  }, [data, onAlertsChange, item.verificationStatus]);

  if (!isDriver) {
    return null;
  }

  const handleRunDriverSuite = async () => {
    setRunning(true);
    setErrorMsg(null);
    setStatusBanner(null);
    try {
      const res = await adminApi.runDriverDigioSuite(item.id, {
        includeFuzzyMatch: true,
        ...(panInput.trim()
          ? { panOverride: panInput.trim().toUpperCase() }
          : {}),
        ...(dlInput.trim() ? { dlOverride: dlInput.trim().toUpperCase() } : {}),
        ...(dobInput.trim() ? { dobOverride: dobInput.trim() } : {}),
        ...(rcInput.trim() ? { rcOverride: rcInput.trim().toUpperCase() } : {}),
      });
      const errCount = Object.keys(res.errors || {}).length;
      setStatusBanner(
        `Executed ${res.executedChecks.length} check(s)${
          errCount
            ? ` (${errCount} skipped/error: ${Object.entries(res.errors)
                .map(([k, v]) => `${k}: ${v}`)
                .join("; ")})`
            : " cleanly"
        }`,
      );
      await loadVerifications();
    } catch (err: any) {
      setErrorMsg(err?.message || "Automated suite execution failed");
    } finally {
      setRunning(false);
    }
  };

  const runSingleAction = async (label: string, action: () => Promise<any>) => {
    setRunning(true);
    setErrorMsg(null);
    setStatusBanner(null);
    try {
      const res = await action();
      setStatusBanner(
        `${label}: ${res?.complianceNotes || res?.status || "Completed"}`,
      );
      await loadVerifications();
    } catch (err: any) {
      setErrorMsg(`${label} failed: ${err?.message || "Unknown error"}`);
    } finally {
      setRunning(false);
    }
  };

  const renderBadge = (rec?: DigioVerificationItem) => {
    if (!rec) {
      return (
        <span className="text-caption text-muted font-semibold">
          Not Checked
        </span>
      );
    }
    if (rec.verified && rec.complianceOk !== false) {
      return (
        <span
          className="inline-flex items-center gap-1 text-caption font-bold"
          style={{ color: "#10b981" }}
        >
          <CheckCircle2 size={12} /> Verified
          {rec.matchScore !== null && rec.matchScore !== undefined
            ? ` (${rec.matchScore}%)`
            : ""}
        </span>
      );
    }
    if (rec.verified && rec.complianceOk === false) {
      return (
        <span
          className="inline-flex items-center gap-1 text-caption font-bold"
          style={{ color: "#f59e0b" }}
        >
          <AlertTriangle size={12} /> Warning
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 text-caption font-bold"
        style={{ color: "#f43f5e" }}
      >
        <XCircle size={12} /> Failed
      </span>
    );
  };

  const latest = data?.latestByType || {};
  const alerts: DigioComplianceAlert[] = data?.complianceAlerts || [];
  const aadharFrontDoc = item.documents?.find((d) =>
    String(d.documentType || "")
      .toUpperCase()
      .includes("AADHAR"),
  );
  const digilockerReqId = latest["DIGILOCKER"]?.digioRequestId;
  const rcRec = latest["VEHICLE_RC"];
  const dlRec = latest["DRIVING_LICENSE"];
  const bankRec = latest["BANK_ACCOUNT"];
  const referenceName =
    dlRec?.verifiedName || latest["PAN"]?.verifiedName || bankRec?.verifiedName;

  return (
    <div
      className="mt-5"
      style={{
        padding: "1.1rem",
        borderRadius: "12px",
        background: "rgba(var(--brand-primary-rgb), 0.04)",
        border: "1px solid rgba(var(--brand-primary-rgb), 0.22)",
      }}
    >
      <div
        className="flex justify-between items-center gap-3 flex-wrap"
        style={{ paddingTop: "0.15rem", marginBottom: "0.9rem" }}
      >
        <div className="flex items-center" style={{ gap: "0.625rem" }}>
          <ShieldCheck size={18} style={{ color: "var(--text-brand)" }} />
          <div>
            <h3
              className="m-0 font-bold text-primary"
              style={{ fontSize: "1.06rem" }}
            >
              Digio Driver Identity, DL & Vehicle RC Engine
            </h3>
            <p className="m-0 text-sm text-muted">
              Parivahan RC, Commercial DL, PAN, Aadhaar Masking, Liveness, Face
              Match & Payout checks
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadVerifications}
            disabled={loading || running}
            className="bg-surface border text-secondary text-sm font-semibold cursor-pointer flex items-center gap-tight"
            style={{
              padding: "0.45rem 0.75rem",
              borderRadius: "8px",
              transition: "all 0.15s ease",
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>

          <button
            type="button"
            onClick={handleRunDriverSuite}
            disabled={running || item.verificationStatus === "PENDING"}
            title={
              item.verificationStatus === "PENDING"
                ? "Applicant has not submitted documents yet"
                : undefined
            }
            className="bg-brand border-0 text-sm font-semibold flex items-center gap-compact shadow-sm"
            style={{
              padding: "0.45rem 0.9rem",
              borderRadius: "8px",
              color: "#ffffff",
              cursor: running
                ? "wait"
                : item.verificationStatus === "PENDING"
                  ? "not-allowed"
                  : "pointer",
              opacity: item.verificationStatus === "PENDING" ? 0.6 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {running ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Play size={13} />
            )}
            Run Full Digio Suite
          </button>
        </div>
      </div>

      {item.verificationStatus === "PENDING" && (
        <div
          className="text-sm font-medium flex items-center gap-2"
          style={{
            padding: "0.55rem 0.85rem",
            borderRadius: "8px",
            background: "rgba(100, 116, 139, 0.1)",
            border: "1px solid rgba(100, 116, 139, 0.25)",
            color: "var(--text-secondary)",
            marginBottom: "0.85rem",
          }}
        >
          <Info size={15} className="flex-shrink-0" />
          <span>Automated Digio suite will activate once the applicant completes onboarding and submits their documents.</span>
        </div>
      )}

      {/* Compliance Blockers & Warnings */}
      {item.verificationStatus !== "PENDING" && alerts.length > 0 && (
        <div
          className="flex flex-col gap-compact"
          style={{ marginBottom: "0.85rem" }}
        >
          {alerts.map((al, i) => {
            const isBlocker = al.severity === "BLOCKER";
            return (
              <div
                key={`${al.code}-${i}`}
                className="text-sm font-semibold flex items-center gap-snug"
                style={{
                  padding: "0.55rem 0.85rem",
                  borderRadius: "8px",
                  background: isBlocker
                    ? "rgba(244, 63, 94, 0.12)"
                    : "rgba(245, 158, 11, 0.12)",
                  border: `1px solid ${isBlocker ? "rgba(244, 63, 94, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
                  color: isBlocker ? "#f43f5e" : "#d97706",
                }}
              >
                <ShieldAlert size={14} />
                <span>
                  <strong>[{al.severity}]</strong> {al.message}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {statusBanner && (
        <div
          className="animate-banner mb-3 bg-success-subtle text-success text-compact font-semibold"
          style={{
            padding: "0.6rem 0.85rem",
            borderRadius: "8px",
            border: "1px solid var(--color-success-border)",
          }}
        >
          {statusBanner}
        </div>
      )}

      {errorMsg && (
        <div
          className="animate-banner mb-3 bg-danger-subtle text-danger text-compact font-semibold"
          style={{
            padding: "0.6rem 0.85rem",
            borderRadius: "8px",
            border: "1px solid var(--color-danger-border)",
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Status Matrix */}
      {loading ? (
        <div className="p-4 text-body-sm text-muted">
          Loading Digio verification records...
        </div>
      ) : (
        <div
          className="grid mb-4"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))",
            gap: "0.65rem",
          }}
        >
          {DRIVER_CHECK_LABELS.map((def) => {
            const rec = latest[def.key];
            return (
              <div
                key={def.key}
                className="bg-surface border"
                style={{ padding: "0.7rem 0.85rem", borderRadius: "8px" }}
              >
                <div className="flex justify-between items-center gap-2">
                  <span className="text-sm font-bold text-primary">
                    {def.label}
                  </span>
                  {renderBadge(rec)}
                </div>
                {rec?.identifier && (
                  <div className="text-caption text-muted mt-1">
                    {rec.identifier}
                  </div>
                )}
                {rec?.verifiedName && (
                  <div className="text-caption text-secondary mt-snug font-semibold">
                    {rec.verifiedName}
                  </div>
                )}
                {rec?.complianceNotes && (
                  <div className="text-micro text-muted mt-compact">
                    {rec.complianceNotes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Verified Vahan RC / Commercial DL Compliance Breakdown */}
      {(rcRec?.summary || dlRec?.summary) && (
        <div
          className="grid gap-3 mb-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {rcRec?.summary && (
            <div
              className="bg-surface border text-secondary"
              style={{
                padding: "0.75rem 0.9rem",
                borderRadius: "8px",
                fontSize: "0.73rem",
              }}
            >
              <div className="font-bold text-primary mb-tight">
                Vahan RC Breakdown ({rcRec.summary.rcNumber || rcRec.identifier}
                )
              </div>
              <div>
                Model: {rcRec.summary.makerModel || "—"} (
                {rcRec.summary.fuelType || "—"})
              </div>
              <div>
                Status: {rcRec.summary.rcStatus || "—"} • Blacklist:{" "}
                {rcRec.summary.blacklistStatus || "NONE"}
              </div>
              <div>
                Fitness Upto: {rcRec.summary.fitUpto || "—"} • PUCC Upto:{" "}
                {rcRec.summary.puccUpto || "—"}
              </div>
              <div>
                Insurance: {rcRec.summary.insuranceCompany || "—"} (Till{" "}
                {rcRec.summary.insuranceUpto || "—"})
              </div>
              <div>
                Permit: {rcRec.summary.permitType || "—"} (Till{" "}
                {rcRec.summary.nationalPermitUpto ||
                  rcRec.summary.permitValidUpto ||
                  "—"}
                )
              </div>
              <div>Challans Recorded: {rcRec.summary.challanCount ?? 0}</div>
            </div>
          )}

          {dlRec?.summary && (
            <div
              className="bg-surface border text-secondary"
              style={{
                padding: "0.75rem 0.9rem",
                borderRadius: "8px",
                fontSize: "0.73rem",
              }}
            >
              <div className="font-bold text-primary mb-tight">
                Driving License Details (
                {dlRec.summary.dlNumber || dlRec.identifier})
              </div>
              <div>
                Holder: {dlRec.summary.holderName || dlRec.verifiedName || "—"}
              </div>
              <div>
                Status: {dlRec.summary.status || "—"} • Issue Date:{" "}
                {dlRec.summary.issueDate || "—"}
              </div>
              <div>
                Non-Transport Valid To:{" "}
                {dlRec.summary.nonTransportValidTo || "—"}
              </div>
              <div>
                Transport (Commercial) Valid To:{" "}
                {dlRec.summary.transportValidTo || "—"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Manual Triggers & Biometric/Aadhaar/DigiLocker Actions */}
      <div
        className="grid gap-3 pt-3 border-t"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        <div className="flex gap-compact">
          <input
            placeholder="PAN Override (ABCDE1234F)"
            value={panInput}
            onChange={(e) => setPanInput(e.target.value.toUpperCase())}
            className="flex-1 border bg-surface text-primary text-sm"
            style={{ padding: "0.4rem 0.6rem", borderRadius: "6px" }}
          />
          <button
            type="button"
            disabled={running || panInput.trim().length !== 10}
            onClick={() =>
              runSingleAction("PAN Check", () =>
                adminApi.verifyPanDigio({
                  panNumber: panInput.trim(),
                  name: item.name,
                  targetDriverId: item.id,
                }),
              )
            }
            className="border bg-surface-elevated text-primary text-label font-semibold cursor-pointer"
            style={{ padding: "0.4rem 0.65rem", borderRadius: "6px" }}
          >
            <CreditCard size={12} /> PAN
          </button>
        </div>

        <div className="flex gap-compact">
          <input
            placeholder="DL No."
            value={dlInput}
            onChange={(e) => setDlInput(e.target.value.toUpperCase())}
            className="border bg-surface text-primary text-sm"
            style={{
              width: "48%",
              padding: "0.4rem 0.6rem",
              borderRadius: "6px",
            }}
          />
          <input
            placeholder="DOB (DD/MM/YYYY)"
            value={dobInput}
            onChange={(e) => setDobInput(e.target.value)}
            className="border bg-surface text-primary text-sm"
            style={{
              width: "36%",
              padding: "0.4rem 0.5rem",
              borderRadius: "6px",
            }}
          />
          <button
            type="button"
            disabled={
              running || dlInput.trim().length < 6 || dobInput.trim().length < 8
            }
            onClick={() =>
              runSingleAction("DL Check", () =>
                adminApi.verifyDlDigio({
                  dlNumber: dlInput.trim(),
                  dob: dobInput.trim(),
                  name: item.name,
                  targetDriverId: item.id,
                }),
              )
            }
            className="border bg-surface-elevated text-primary text-label font-semibold cursor-pointer"
            style={{ padding: "0.4rem 0.6rem", borderRadius: "6px" }}
          >
            DL
          </button>
        </div>

        <div className="flex gap-compact flex-wrap">
          <input
            placeholder="Vehicle Plate (RC)"
            value={rcInput}
            onChange={(e) => setRcInput(e.target.value.toUpperCase())}
            className="flex-1 border bg-surface text-primary text-sm"
            style={{
              minWidth: "120px",
              padding: "0.4rem 0.6rem",
              borderRadius: "6px",
            }}
          />
          <button
            type="button"
            disabled={running || rcInput.trim().length < 6}
            onClick={() =>
              runSingleAction("Vehicle RC Check", () =>
                adminApi.verifyRcDigio({
                  registrationNumber: rcInput.trim(),
                  targetDriverId: item.id,
                }),
              )
            }
            className="border bg-surface-elevated text-primary text-label font-semibold cursor-pointer flex items-center gap-1"
            style={{ padding: "0.4rem 0.65rem", borderRadius: "6px" }}
          >
            <Car size={12} /> RC
          </button>
        </div>
      </div>

      {/* Biometric, Aadhaar Masking, Name Match & DigiLocker Secondary Row */}
      <div className="flex gap-2 flex-wrap" style={{ marginTop: "0.7rem" }}>
        <button
          type="button"
          disabled={running}
          onClick={() =>
            runSingleAction("Face Match", () =>
              adminApi.faceMatchDriverDigio(item.id),
            )
          }
          className="border bg-surface-elevated text-primary text-label font-semibold cursor-pointer flex items-center gap-1"
          style={{ padding: "0.4rem 0.65rem", borderRadius: "6px" }}
        >
          <ScanFace size={12} /> Face Match
        </button>

        <button
          type="button"
          disabled={running}
          onClick={() =>
            runSingleAction("Selfie Liveness", () =>
              adminApi.livenessDriverDigio(item.id),
            )
          }
          className="border bg-surface-elevated text-primary text-label font-semibold cursor-pointer flex items-center gap-1"
          style={{ padding: "0.4rem 0.65rem", borderRadius: "6px" }}
        >
          <UserCheck size={12} /> Selfie Liveness
        </button>

        {aadharFrontDoc?.fileUrl && (
          <button
            type="button"
            disabled={running}
            onClick={() =>
              runSingleAction("Aadhaar Mask", () =>
                adminApi.maskAadhaarDriverDigio({
                  documentUrl: aadharFrontDoc.fileUrl,
                  side: "FRONT",
                  targetDriverId: item.id,
                }),
              )
            }
            className="border bg-surface-elevated text-primary text-label font-semibold cursor-pointer flex items-center gap-1"
            style={{ padding: "0.4rem 0.65rem", borderRadius: "6px" }}
          >
            <Landmark size={12} /> Mask Aadhaar
          </button>
        )}

        {referenceName && (
          <button
            type="button"
            disabled={running}
            onClick={() =>
              runSingleAction("Fuzzy Name Match", () =>
                adminApi.fuzzyMatchDriverDigio({
                  sourceText: item.name,
                  targetText: String(referenceName),
                  context: "name",
                  minConfidence: 75,
                  targetDriverId: item.id,
                }),
              )
            }
            className="border bg-surface-elevated text-primary text-label font-semibold cursor-pointer"
            style={{ padding: "0.4rem 0.65rem", borderRadius: "6px" }}
          >
            Cross-Check Name
          </button>
        )}

        {digilockerReqId && (
          <button
            type="button"
            disabled={running}
            onClick={() =>
              runSingleAction("Sync DigiLocker Media", async () => {
                await adminApi.syncDigilockerStatusDigio(digilockerReqId);
                return adminApi.syncDigilockerMediaDigio(digilockerReqId);
              })
            }
            className="border bg-surface-elevated text-primary text-label font-semibold cursor-pointer flex items-center gap-1"
            style={{ padding: "0.4rem 0.65rem", borderRadius: "6px" }}
          >
            <DownloadCloud size={12} /> Sync DigiLocker Docs
          </button>
        )}
      </div>
    </div>
  );
};
