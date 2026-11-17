"use client";

/**
 * Shared building blocks for the Corporate ETS admin screens (payouts, rate cards, disputes,
 * support desk, SOS). They only use the admin design tokens and the existing Modal / Button /
 * EmptyState / ErrorState components, so every corporate screen has the same loading, empty,
 * error and not-authorised states.
 */
import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Lock, X } from "lucide-react";
import { ApiError, adminApi } from "../../lib/api/client";
import { Modal } from "../Modal";
import { Button } from "../common/Button";
import { ErrorState } from "../ErrorState";

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Integer paise (string or number) to "₹ 1,234.56" without float rounding of the paise part. */
export function formatPaise(paise: string | number | null | undefined): string {
  if (paise === null || paise === undefined || paise === "") return "—";
  const raw = String(paise).trim();
  if (!/^-?\d+$/.test(raw)) return "—";
  const negative = raw.startsWith("-");
  const digits = negative ? raw.slice(1) : raw;
  const padded = digits.padStart(3, "0");
  const rupees = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const fraction = padded.slice(-2);
  const grouped = Number(rupees).toLocaleString("en-IN");
  return `${negative ? "- " : ""}₹ ${grouped}.${fraction}`;
}

/** "1234.50" rupees (form input) to integer paise string, or null when not a valid amount. */
export function rupeesToPaise(input: string): string | null {
  const v = input.trim();
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(v)) return null;
  const [whole, frac = ""] = v.split(".");
  // String arithmetic keeps exact paise (no float, no BigInt literal for the ES2017 target).
  const paise = `${whole}${(frac + "00").slice(0, 2)}`.replace(/^0+(?=\d)/, "");
  return paise;
}

export function formatIst(
  iso: string | null | undefined,
  withTime = true,
): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  });
}

export const shortId = (id: string | null | undefined) =>
  id ? id.slice(0, 8).toUpperCase() : "—";

/** Today's IST calendar day, YYYY-MM-DD. */
export function todayIst(): string {
  return new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
}

/** IST calendar day (YYYY-MM-DD) + "HH:mm" IST to an ISO instant. */
export function istLocalToIso(day: string, time = "00:00"): string {
  return new Date(`${day}T${time}:00+05:30`).toISOString();
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Request failed";
}

export const isForbidden = (err: unknown) =>
  err instanceof ApiError && err.status === 403;

/** Logged-in admin id (for maker-checker hints). The API is the authority; this only guides the UI. */
export function currentAdminId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("adhocx_admin_user");
    return raw ? (JSON.parse(raw)?.id ?? null) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

export const ForbiddenState: React.FC<{ what: string; message?: string }> = ({
  what,
  message,
}) => (
  <div
    className="card text-center rounded-xl bg-warning-subtle"
    role="alert"
    style={{ padding: "1.35rem", borderColor: "var(--color-warning-border)" }}
  >
    <div className="flex justify-center" style={{ marginBottom: "0.55rem" }}>
      <Lock size={24} color="var(--color-warning)" />
    </div>
    <h3
      className="font-bold text-primary"
      style={{ fontSize: "1.04rem", marginBottom: "0.24rem" }}
    >
      You are not authorised to view {what}
    </h3>
    <p
      className="text-compact text-secondary my-0 mx-auto"
      style={{ maxWidth: 460 }}
    >
      {message ??
        "This area is limited to AdhocX platform administrators. Sign in with an admin account or ask a super admin for access."}
    </p>
  </div>
);

/** Error screen that turns a 403 into the not-authorised state. */
export const LoadErrorState: React.FC<{
  error: unknown;
  what: string;
  onRetry: () => void;
}> = ({ error, what, onRetry }) =>
  isForbidden(error) ? (
    <ForbiddenState what={what} message={errorMessage(error)} />
  ) : (
    <ErrorState
      title={`Unable to load ${what}`}
      message={errorMessage(error)}
      onRetry={onRetry}
    />
  );

export type BannerState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

export const Banner: React.FC<{ banner: BannerState; onClose: () => void }> = ({
  banner,
  onClose,
}) => {
  if (!banner) return null;
  const palette =
    banner.type === "success"
      ? {
          bg: "var(--color-success-bg)",
          border: "var(--color-success-border)",
          color: "var(--color-success)",
        }
      : banner.type === "error"
        ? {
            bg: "var(--color-danger-bg)",
            border: "var(--color-danger-border)",
            color: "var(--color-danger)",
          }
        : {
            bg: "var(--color-info-bg)",
            border: "var(--color-info-border)",
            color: "var(--color-info)",
          };
  return (
    <div
      role={banner.type === "error" ? "alert" : "status"}
      className="animate-banner flex items-center rounded-lg text-base font-semibold"
      style={{
        gap: "0.7rem",
        padding: "0.7rem 0.95rem",
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
      }}
    >
      {banner.type === "success" ? (
        <CheckCircle size={18} />
      ) : (
        <AlertCircle size={18} />
      )}
      <span className="flex-1">{banner.message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss message"
        className="bg-transparent border-0 cursor-pointer flex"
        style={{ color: "inherit" }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

/** Callout used to state a business rule next to the action it governs. */
export const RuleNote: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: "info" | "warning";
}> = ({ icon, children, tone = "info" }) => (
  <div
    className="flex items-start py-3 px-4 rounded-md text-primary text-base"
    style={{
      gap: "0.625rem",
      backgroundColor:
        tone === "warning" ? "var(--color-warning-bg)" : "var(--color-info-bg)",
      border: `1px solid ${tone === "warning" ? "var(--color-warning-border)" : "var(--color-info-border)"}`,
      lineHeight: 1.5,
    }}
  >
    {icon && (
      <span
        style={{
          color:
            tone === "warning" ? "var(--color-warning)" : "var(--color-info)",
          marginTop: 2,
        }}
      >
        {icon}
      </span>
    )}
    <div>{children}</div>
  </div>
);

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, actions, children }) => (
  <div className="card p-0 overflow-hidden">
    <div
      className="flex items-center justify-between gap-4 flex-wrap border-b"
      style={{ padding: "1.02rem 1.15rem 0.92rem" }}
    >
      <div>
        <h2 className="text-title-md font-bold text-primary m-0">{title}</h2>
        {subtitle && (
          <p
            className="text-compact text-muted"
            style={{ margin: "0.2rem 0 0" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex gap-2 flex-wrap items-center">{actions}</div>
      )}
    </div>
    <div>{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// Notes prompt (SOS lifecycle, ticket transitions, dispute decisions)
// ---------------------------------------------------------------------------

export interface NotesPromptProps {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  label?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger" | "success";
  extra?: React.ReactNode;
  onCancel: () => void;
  onConfirm: (notes: string) => Promise<void>;
}

export const NotesPrompt: React.FC<NotesPromptProps> = ({
  isOpen,
  title,
  description,
  label = "Notes",
  placeholder,
  required = false,
  minLength = 1,
  confirmLabel,
  confirmVariant = "primary",
  extra,
  onCancel,
  onConfirm,
}) => {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNotes("");
      setError(null);
      setBusy(false);
    }
  }, [isOpen]);

  const trimmed = notes.trim();
  const invalid = required && trimmed.length < minLength;

  async function submit() {
    if (invalid) {
      setError(
        minLength > 1
          ? `${label} must be at least ${minLength} characters.`
          : `${label} are required.`,
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => undefined : onCancel}
      title={title}
      maxWidth="520px"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={submit}
            isLoading={busy}
            disabled={invalid}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {description && (
          <div className="text-md text-secondary">{description}</div>
        )}
        {extra}
        <label className="form-group">
          <span className="form-label">
            {label} {required ? "(required)" : "(optional)"}
          </span>
          <textarea
            className="form-textarea"
            rows={4}
            value={notes}
            placeholder={placeholder}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
            autoFocus
          />
        </label>
        {error && (
          <div role="alert" className="text-danger text-base">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Tenants (filter dropdowns)
// ---------------------------------------------------------------------------

export interface TenantOption {
  id: string;
  code: string;
  name: string;
  status: string;
}

/** Corporate tenants for filters. A failure leaves the list empty and reports the error. */
export function useCorporateTenants() {
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminApi.getCorporateTenants({ limit: 100 });
        if (!cancelled) setTenants(res?.items ?? []);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nameOf = (id: string | null | undefined) => {
    if (!id) return "—";
    const t = tenants.find((x) => x.id === id);
    return t ? `${t.name} (${t.code})` : shortId(id);
  };

  return { tenants, loading, error, nameOf };
}
