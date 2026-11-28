"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, CreditCard, XCircle } from "lucide-react";
import { adminApi } from "../../lib/api/client";
import type {
  AdminFleetPayoutItem,
  AdminFleetPayoutMetrics,
  FleetPayoutStatusType,
} from "../../lib/api/types";
import {
  Button,
  ConfirmDialog,
  DataTable,
  Drawer,
  FeedbackBanner,
  FilterBar,
  KpiStrip,
  StatusBadge,
  Textarea,
} from "../common";

const PAYOUT_STATUS_TABS = [
  { id: "ALL", label: "All Requests" },
  { id: "REQUESTED", label: "Requested" },
  { id: "UNDER_REVIEW", label: "Under Review" },
  { id: "APPROVED", label: "Approved" },
  { id: "SETTLED", label: "Settled" },
  { id: "REJECTED", label: "Rejected" },
];

export const FleetPayoutsDesk: React.FC = () => {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [payouts, setPayouts] = useState<AdminFleetPayoutItem[]>([]);
  const [metrics, setMetrics] = useState<AdminFleetPayoutMetrics>({
    pendingCount: 0,
    pendingAmount: 0,
    settledCount: 0,
    settledAmount: 0,
    rejectedCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [selected, setSelected] = useState<AdminFleetPayoutItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<FleetPayoutStatusType | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listFleetPayouts({
        status: activeTab !== "ALL" ? activeTab : undefined,
        limit: 100,
      });
      setPayouts(res.items || []);
      if (res.metrics) setMetrics(res.metrics);
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load Fleet payout requests.",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadPayouts();
  }, [loadPayouts]);

  const filteredPayouts = useMemo(() => {
    if (!searchQuery.trim()) return payouts;
    const q = searchQuery.toLowerCase().trim();
    return payouts.filter(
      (p) =>
        p.referenceCode.toLowerCase().includes(q) ||
        p.fleet?.name?.toLowerCase().includes(q) ||
        p.fleet?.code?.toLowerCase().includes(q) ||
        p.fleet?.ownerName?.toLowerCase().includes(q),
    );
  }, [payouts, searchQuery]);

  const openInspection = (item: AdminFleetPayoutItem) => {
    setSelected(item);
    setTargetStatus(null);
    setNotes("");
    setRejectionReason("");
  };

  const requestStatusAction = (nextStatus: FleetPayoutStatusType) => {
    if (!selected) return;
    if (nextStatus === "REJECTED" && !rejectionReason.trim()) {
      setTargetStatus("REJECTED");
      setAlert({
        type: "error",
        message: "Please enter a rejection reason before confirming rejection.",
      });
      return;
    }
    setTargetStatus(nextStatus);
    setConfirmOpen(true);
  };

  const handleConfirmProcess = async () => {
    if (!selected || !targetStatus) return;
    setProcessing(true);
    try {
      await adminApi.processFleetPayout(selected.id, {
        status: targetStatus,
        ...(targetStatus === "REJECTED" ? { rejectionReason: rejectionReason.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      setConfirmOpen(false);
      setSelected(null);
      setTargetStatus(null);
      setAlert({
        type: "success",
        message: `Fleet payout ${selected.referenceCode} updated to ${targetStatus}.`,
      });
      await loadPayouts();
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to process fleet payout.",
      });
    } finally {
      setProcessing(false);
    }
  };

  const isTerminal = selected?.status === "SETTLED" || selected?.status === "REJECTED";

  return (
    <div>
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      <KpiStrip
        columns={3}
        items={[
          {
            id: "pending",
            label: "Active Fleet Payouts",
            value: metrics.pendingCount,
            subtext: `₹ ${metrics.pendingAmount.toLocaleString("en-IN")} awaiting settlement`,
            icon: <Clock size={16} color="var(--color-warning)" />,
            tone: "warning",
          },
          {
            id: "settled",
            label: "Settled Fleet Payouts",
            value: metrics.settledCount,
            subtext: `₹ ${metrics.settledAmount.toLocaleString("en-IN")} disbursed`,
            icon: <CreditCard size={16} color="var(--color-success)" />,
            tone: "success",
          },
          {
            id: "rejected",
            label: "Rejected Claims",
            value: metrics.rejectedCount,
            subtext: "Returned with reason",
            icon: <XCircle size={16} color="var(--color-danger)" />,
            tone: "danger",
          },
        ]}
      />

      <FilterBar
        tabs={PAYOUT_STATUS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search reference code, fleet name, or fleet code..."
      />

      <DataTable
        columns={[
          {
            header: "REFERENCE CODE",
            accessor: (p) => (
              <div>
                <div className="text-mono font-bold text-brand text-base">{p.referenceCode}</div>
                <div className="text-sm text-muted mt-compact">
                  {new Date(p.createdAt).toLocaleDateString("en-IN")}
                </div>
              </div>
            ),
          },
          {
            header: "FLEET PARTNER",
            accessor: (p) => (
              <div>
                <div className="font-semibold text-primary text-body-sm">
                  {p.fleet?.name || "Fleet"} ({p.fleet?.code || "—"})
                </div>
                <div className="text-sm text-muted mt-micro">
                  {p.fleet?.ownerName} · {p.fleet?.phone}
                </div>
              </div>
            ),
          },
          {
            header: "AMOUNT",
            accessor: (p) => (
              <div className="font-bold text-success">
                ₹ {Number(p.amount).toLocaleString("en-IN")}
              </div>
            ),
          },
          {
            header: "PERIOD",
            accessor: (p) => (
              <span className="text-sm text-secondary">
                {p.periodStart
                  ? `${new Date(p.periodStart).toLocaleDateString("en-IN")} – ${p.periodEnd ? new Date(p.periodEnd).toLocaleDateString("en-IN") : "Current"}`
                  : "Cumulative Balance"}
              </span>
            ),
          },
          {
            header: "STATUS",
            accessor: (p) => <StatusBadge status={p.status} />,
          },
          {
            header: "ACTIONS",
            align: "right",
            accessor: (p) => (
              <Button
                variant={p.status === "SETTLED" || p.status === "REJECTED" ? "ghost" : "primary"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openInspection(p);
                }}
              >
                {p.status === "SETTLED" || p.status === "REJECTED"
                  ? "Inspect"
                  : "Review & Process →"}
              </Button>
            ),
          },
        ]}
        data={filteredPayouts}
        keyExtractor={(p) => p.id}
        loading={loading}
        onRowClick={openInspection}
        emptyTitle="No fleet payout requests"
        emptySubtitle={`No fleet payouts matching "${activeTab}".`}
      />

      <Drawer
        isOpen={!!selected}
        onClose={() => {
          setSelected(null);
          setTargetStatus(null);
        }}
        title={
          selected
            ? `Fleet Payout: ₹${Number(selected.amount).toLocaleString("en-IN")}`
            : "Fleet Payout"
        }
        subtitle={selected ? `${selected.referenceCode} · ${selected.fleet?.name || "Fleet"}` : ""}
        footer={
          selected && !isTerminal ? (
            <div className="flex gap-2 flex-wrap justify-end w-full">
              {selected.status === "REQUESTED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => requestStatusAction("UNDER_REVIEW")}
                >
                  Mark Under Review
                </Button>
              )}
              {(selected.status === "REQUESTED" || selected.status === "UNDER_REVIEW") && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => requestStatusAction("APPROVED")}
                >
                  Approve
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => requestStatusAction("REJECTED")}
              >
                Reject Payout
              </Button>
              <Button
                variant="success"
                size="sm"
                leftIcon={<CheckCircle2 size={14} />}
                onClick={() => requestStatusAction("SETTLED")}
              >
                Mark Settled
              </Button>
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
          )
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-md bg-card-elevated border border-subtle flex justify-between items-center">
              <div>
                <div className="text-sm text-muted">Status</div>
                <div className="mt-1">
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted">Requested Payout</div>
                <div className="font-bold text-success" style={{ fontSize: "1.3rem" }}>
                  ₹ {Number(selected.amount).toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-md bg-card border border-subtle flex flex-col gap-2 text-base">
              <div className="flex justify-between">
                <span className="text-muted">Fleet Name & Code:</span>
                <span className="font-semibold text-primary">
                  {selected.fleet?.name} ({selected.fleet?.code})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Requested By:</span>
                <span className="text-primary">
                  {selected.requestedBy?.fullName || "Owner"} ({selected.requestedBy?.phone || selected.fleet?.phone})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Submitted At:</span>
                <span className="text-secondary">{new Date(selected.createdAt).toLocaleString("en-IN")}</span>
              </div>
              {selected.settledAt && (
                <div className="flex justify-between">
                  <span className="text-muted">Settled At:</span>
                  <span className="text-success font-semibold">
                    {new Date(selected.settledAt).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              {selected.notes && (
                <div className="pt-2 border-t border-subtle text-sm text-secondary whitespace-pre-wrap">
                  <strong>Notes:</strong> {selected.notes}
                </div>
              )}
              {selected.rejectionReason && (
                <div className="pt-2 border-t border-subtle text-sm text-danger">
                  <strong>Rejection Reason:</strong> {selected.rejectionReason}
                </div>
              )}
            </div>

            {!isTerminal && (
              <div className="flex flex-col gap-3">
                <Textarea
                  label="Admin UTR / Remittance Notes (Optional)"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter NEFT/IMPS UTR reference or audit memo..."
                />
                <Textarea
                  label="Rejection Reason (Required only if rejecting)"
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explain why this payout request cannot be processed..."
                />
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={confirmOpen && !!selected && !!targetStatus}
        onClose={() => !processing && setConfirmOpen(false)}
        onConfirm={handleConfirmProcess}
        variant={targetStatus === "REJECTED" ? "danger" : "success"}
        isLoading={processing}
        title={`Update Payout to ${targetStatus?.replace(/_/g, " ")}?`}
        subtitle={selected?.referenceCode}
        description={
          <span>
            Confirm updating <strong>{selected?.fleet?.name}</strong> payout of{" "}
            <strong>₹{Number(selected?.amount || 0).toLocaleString("en-IN")}</strong> to{" "}
            <strong>{targetStatus}</strong>.
          </span>
        }
        confirmLabel={`Confirm ${targetStatus || ""}`}
      />
    </div>
  );
};
