"use client";

import React, { useCallback, useEffect, useState } from "react";
import { adminApi, ApiError } from "../../lib/api/client";
import {
  CorporatePayoutBatch,
  CorporatePayoutBatchListItem,
  CorporatePayoutRow,
} from "../../lib/api/types";
import { Button, StatusBadge, Drawer } from "../../components/common";
import { ShieldCheck, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

/**
 * Corporate driver payouts, maker-checker:
 *   1. Maker creates a batch from UNPAID earnings (status SUBMITTED = waiting for a checker).
 *   2. A different admin approves it (the server refuses the maker as checker).
 *   3. An admin submits the APPROVED batch to the payout provider (PROCESSING).
 *   4. Each payout becomes PAID / FAILED only from the provider's signed callback.
 * Nothing on this page can mark money as paid.
 */

const rupees = (paise?: string | number | null) =>
  `₹ ${(Number(paise ?? 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const STATUS_HELP: Record<string, string> = {
  SUBMITTED: "Waiting for a checker (a different admin) to approve",
  APPROVED: "Approved; ready to send to the payout provider",
  PROCESSING: "Sent to the provider; waiting for its confirmations",
  PAID: "Every payout confirmed paid by the provider",
  FAILED: "Provider reported failures; you can retry the failed payouts",
  DRAFT: "Draft",
};

const errorText = (err: unknown) =>
  err instanceof ApiError && err.status === 403
    ? "Not allowed: the admin who created a batch cannot also approve it. Ask another admin to approve."
    : err instanceof Error
      ? err.message
      : String(err);

export function CorporatePayoutBatchesSection() {
  const [batches, setBatches] = useState<CorporatePayoutBatchListItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<CorporatePayoutBatch | null>(null);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadBatches = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await adminApi.listCorporatePayoutBatches({ limit: 20 });
      setBatches(res?.items ?? []);
    } catch (err) {
      setAlert({
        type: "error",
        message: `Could not load payout batches: ${errorText(err)}`,
      });
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  async function openBatch(id: string) {
    try {
      setSelected(await adminApi.getCorporatePayoutBatch(id));
    } catch (err) {
      setAlert({
        type: "error",
        message: `Could not load batch: ${errorText(err)}`,
      });
    }
  }

  async function run(
    label: string,
    action: () => Promise<unknown>,
    success: string,
    batchId?: string,
  ) {
    setBusy(label);
    setAlert(null);
    try {
      await action();
      setAlert({ type: "success", message: success });
      await loadBatches();
      if (batchId) await openBatch(batchId);
    } catch (err) {
      setAlert({ type: "error", message: errorText(err) });
    } finally {
      setBusy(null);
    }
  }

  async function handleCreate() {
    setBusy("create");
    setAlert(null);
    try {
      // One key per click: a double-submit returns the same batch instead of creating two.
      const idempotencyKey = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const batch = await adminApi.createCorporatePayoutBatch({
        idempotencyKey,
      });
      if (!batch || !batch.totalDrivers) {
        setAlert({
          type: "success",
          message: "No unpaid driver earnings right now; nothing to batch.",
        });
      } else {
        setAlert({
          type: "success",
          message: `Batch ${batch.batchNumber} created for ${batch.totalDrivers} drivers (${rupees(batch.netPayoutPaise)} net). A different admin must approve it.`,
        });
        setSelected(batch);
      }
      await loadBatches();
    } catch (err) {
      setAlert({
        type: "error",
        message: `Could not create batch: ${errorText(err)}`,
      });
    } finally {
      setBusy(null);
    }
  }

  const cardStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-surface-elevated)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: "1.25rem",
  };

  return (
    <div className="mt-2 flex flex-col gap-4">
      {alert && (
        <div
          role="status"
          className="rounded-md font-medium flex items-center text-compact"
          style={{
            padding: "0.68rem 0.95rem",
            gap: "0.55rem",
            backgroundColor:
              alert.type === "success"
                ? "var(--color-success-bg)"
                : "var(--color-danger-bg)",
            border: `1px solid ${alert.type === "success" ? "var(--color-success-border)" : "var(--color-danger-border)"}`,
            color:
              alert.type === "success"
                ? "var(--color-success)"
                : "var(--color-danger)",
          }}
        >
          {alert.type === "success" ? (
            <CheckCircle size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      <div
        style={{
          ...cardStyle,
          padding: "1.2rem 1.2rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.85rem",
        }}
      >
        <div>
          <h2 className="font-bold text-primary text-title-md">
            Corporate Driver Payouts (Maker-Checker)
          </h2>
          <p
            className="text-secondary text-control-lg mt-compact"
            style={{ maxWidth: "46rem" }}
          >
            Create a batch from unpaid commute earnings (1% TDS under Sec 194C
            is deducted). A different admin approves it, then it is sent to the
            payout provider. Payouts show as paid only when the provider
            confirms them.
          </p>
        </div>
        <div className="flex" style={{ gap: "0.55rem" }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadBatches()}
            disabled={listLoading}
          >
            <RefreshCw size={13} style={{ marginRight: "0.35rem" }} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreate}
            disabled={busy !== null}
          >
            {busy === "create" ? "Creating batch..." : "Create payout batch"}
          </Button>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <table
          className="w-full text-left"
          style={{ borderCollapse: "collapse", fontSize: "0.775rem" }}
        >
          <thead>
            <tr className="border-b bg-surface">
              {[
                "BATCH",
                "CREATED",
                "DRIVERS",
                "NET PAYABLE",
                "TDS",
                "STATUS",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="text-muted font-semibold text-caption"
                  style={{ padding: "0.58rem 0.85rem" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listLoading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-secondary">
                  Loading batches...
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-secondary">
                  No payout batches yet.
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr key={b.id} className="border-b">
                  <td
                    className="font-bold text-primary text-mono"
                    style={{ padding: "0.85rem 1rem" }}
                  >
                    {b.batchNumber}
                  </td>
                  <td
                    className="text-secondary"
                    style={{ padding: "0.85rem 1rem" }}
                  >
                    {new Date(b.createdAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    {b.totalDrivers} ({b.totalRoutes} routes)
                  </td>
                  <td
                    className="font-bold text-success"
                    style={{ padding: "0.85rem 1rem" }}
                  >
                    {rupees(b.netPayoutPaise)}
                  </td>
                  <td
                    className="text-warning"
                    style={{ padding: "0.85rem 1rem" }}
                  >
                    {rupees(b.tdsPaise)}
                  </td>
                  <td
                    style={{ padding: "0.85rem 1rem" }}
                    title={STATUS_HELP[b.status]}
                  >
                    <StatusBadge status={b.status} />
                  </td>
                  <td
                    className="text-right"
                    style={{ padding: "0.85rem 1rem" }}
                  >
                    <Button variant="secondary" onClick={() => openBatch(b.id)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Drawer
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={
          selected ? `Payout batch ${selected.batchNumber}` : "Payout batch"
        }
      >
        {selected && (
          <BatchDetail
            batch={selected}
            busy={busy}
            onApprove={() =>
              run(
                "approve",
                () => adminApi.approveCorporatePayoutBatch(selected.id),
                `Batch ${selected.batchNumber} approved.`,
                selected.id,
              )
            }
            onSubmit={() =>
              run(
                "submit",
                () => adminApi.submitCorporatePayoutBatch(selected.id),
                `Batch ${selected.batchNumber} sent to the payout provider. Payouts turn PAID as the provider confirms them.`,
                selected.id,
              )
            }
          />
        )}
      </Drawer>
    </div>
  );
}

function BatchDetail({
  batch,
  busy,
  onApprove,
  onSubmit,
}: {
  batch: CorporatePayoutBatch;
  busy: string | null;
  onApprove: () => void;
  onSubmit: () => void;
}) {
  const payouts: CorporatePayoutRow[] = (batch.payouts ?? []).filter(
    (p: CorporatePayoutRow) => p.kind !== "REVERSAL",
  );
  const failed = payouts.filter((p) => p.status === "FAILED").length;
  return (
    <div className="flex flex-col gap-5">
      <div
        className="grid gap-3 text-base"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        <div>
          <div className="text-muted">Gross</div>
          <div className="font-bold">{rupees(batch.grossPaise)}</div>
        </div>
        <div>
          <div className="text-muted">TDS (1%)</div>
          <div className="font-bold text-warning">{rupees(batch.tdsPaise)}</div>
        </div>
        <div>
          <div className="text-muted">Net payable</div>
          <div className="font-bold text-success">
            {rupees(batch.netPayoutPaise)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-md border bg-surface-elevated">
        <ShieldCheck size={22} />
        <div className="flex-1">
          <div className="font-bold">{batch.status}</div>
          <div className="text-sm text-secondary">
            {STATUS_HELP[batch.status]}
          </div>
        </div>
        {batch.status === "SUBMITTED" && (
          <Button
            variant="primary"
            onClick={onApprove}
            disabled={busy !== null}
          >
            {busy === "approve" ? "Approving..." : "Approve as checker"}
          </Button>
        )}
        {(batch.status === "APPROVED" ||
          (batch.status === "FAILED" && failed > 0)) && (
          <Button variant="primary" onClick={onSubmit} disabled={busy !== null}>
            {busy === "submit"
              ? "Sending..."
              : batch.status === "FAILED"
                ? `Retry ${failed} failed`
                : "Send to payout provider"}
          </Button>
        )}
      </div>

      <table
        className="w-full text-base"
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr className="border-b text-muted text-left">
            <th className="p-2">Driver</th>
            <th className="p-2">Net</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">
                <div className="font-semibold">
                  {p.driver?.fullName ?? p.driverId.slice(0, 8)}
                </div>
                <div className="text-sm text-secondary">
                  {p.driver?.phone ?? ""}
                </div>
              </td>
              <td className="p-2">{rupees(p.netPaise)}</td>
              <td className="p-2" title={p.failureReason ?? undefined}>
                <StatusBadge status={p.status} />
                {p.failureReason && (
                  <div className="text-danger text-caption">
                    {p.failureReason}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
