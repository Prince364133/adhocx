"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Search,
  CheckCircle2,
  OctagonAlert,
  Check,
  X,
} from "lucide-react";
import { adminApi } from "../../lib/api/client";
import { DisputeListItem } from "../../lib/api/types";
import {
  PageHeader,
  KpiStrip,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
  FeedbackBanner,
  ConfirmDialog,
  Textarea,
} from "../../components/common";

const STATUS_TABS = [
  { id: "ALL", label: "All Tickets" },
  { id: "OPEN", label: "Open" },
  { id: "UNDER_REVIEW", label: "Under Review" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "REJECTED", label: "Rejected" },
];

const DISPUTE_CONTEXT_TITLES: Record<string, string> = {
  driver: "Drivers · Disputes & Claims",
  fleet: "Fleet · Disputes & Claims",
  vendor: "Vendors · Disputes & Claims",
  corporate: "Corporate · Disputes & Claims",
};

function DisputesPageContent() {
  const searchParams = useSearchParams();
  const contextParam = searchParams.get("context");

  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] =
    useState<DisputeListItem | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<
    "RESOLVED" | "REJECTED"
  >("RESOLVED");
  const [resolutionText, setResolutionText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmResolveOpen, setConfirmResolveOpen] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    loadDisputes(activeTab);
  }, [activeTab]);

  async function loadDisputes(status: string) {
    setLoading(true);
    try {
      const data = await adminApi
        .getDisputes(status)
        .catch(() => [] as DisputeListItem[]);
      const list = Array.isArray(data)
        ? data
        : (data as any)?.items && Array.isArray((data as any).items)
          ? (data as any).items
          : [];
      setDisputes(list);
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }

  const contextScopedDisputes = useMemo(() => {
    const list = Array.isArray(disputes) ? disputes : [];
    if (!contextParam) return list;
    const target = contextParam.toUpperCase();
    const hasRoleMetadata = list.some(
      (d: any) => d.entityType || d.reporterRole || d.accusedRole,
    );
    if (!hasRoleMetadata) return list;
    return list.filter((d: any) => {
      const et = String(d.entityType || "").toUpperCase();
      const rr = String(d.reporterRole || "").toUpperCase();
      const ar = String(d.accusedRole || "").toUpperCase();
      return et === target || rr === target || ar === target;
    });
  }, [disputes, contextParam]);

  // Filter disputes by search query
  const filteredDisputes = useMemo(() => {
    if (!searchQuery.trim()) return contextScopedDisputes;
    const q = searchQuery.toLowerCase();
    return contextScopedDisputes.filter(
      (d) =>
        d.id.toLowerCase().includes(q) ||
        d.tripId.toLowerCase().includes(q) ||
        d.reporterName?.toLowerCase().includes(q) ||
        d.accusedName?.toLowerCase().includes(q) ||
        d.reason.toLowerCase().includes(q) ||
        d.description?.toLowerCase().includes(q),
    );
  }, [contextScopedDisputes, searchQuery]);

  // Calculate ticket metrics
  const metrics = useMemo(() => {
    const open = contextScopedDisputes.filter((d) => d.status === "OPEN").length;
    const review = contextScopedDisputes.filter((d) => d.status === "UNDER_REVIEW").length;
    const resolved = contextScopedDisputes.filter((d) => d.status === "RESOLVED").length;
    const rejected = contextScopedDisputes.filter((d) => d.status === "REJECTED").length;

    return { open, review, resolved, rejected };
  }, [contextScopedDisputes]);

  function requestResolveConfirm() {
    if (!selectedDispute) return;
    if (!resolutionText.trim()) {
      setAlert({
        type: "error",
        message: "Resolution justification is required.",
      });
      return;
    }
    setConfirmResolveOpen(true);
  }

  async function handleResolve() {
    if (!selectedDispute) return;
    if (!resolutionText.trim()) {
      setAlert({
        type: "error",
        message: "Resolution justification is required.",
      });
      return;
    }

    setActionLoading(true);
    try {
      await adminApi.resolveDispute(selectedDispute.id, {
        status: resolutionStatus,
        resolutionText,
      });

      setAlert({
        type: "success",
        message: `Dispute ticket #${selectedDispute.id} marked as ${resolutionStatus}. Both parties notified.`,
      });

      setConfirmResolveOpen(false);
      setSelectedDispute(null);
      setResolutionText("");
      loadDisputes(activeTab);
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err.message || "Failed to update dispute",
      });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="admin-page">
      {/* Alert Banner */}
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title={(contextParam && DISPUTE_CONTEXT_TITLES[contextParam]) || "Disputes & Escalation Arbitration"}
        subtitle="Investigate conflict tickets, toll disagreements, route deviations, and driver-customer escalations"
        liveStatus="Arbitration Desk Active"
      />

      {/* Dispute KPI Summary Grid */}
      <KpiStrip
        columns={4}
        items={[
          {
            id: "open",
            label: "Open Tickets",
            value: metrics.open,
            subtext: "Requires immediate investigation",
            icon: <AlertCircle size={16} color="var(--color-danger)" />,
            tone: "danger",
          },
          {
            id: "review",
            label: "Under Review",
            value: metrics.review,
            subtext: "Telemetry & receipt audit",
            icon: <Search size={16} color="var(--color-warning)" />,
            tone: "warning",
          },
          {
            id: "resolved",
            label: "Resolved Cases",
            value: metrics.resolved,
            subtext: "Settled or refunded",
            icon: <CheckCircle2 size={16} color="var(--color-success)" />,
            tone: "success",
          },
          {
            id: "rejected",
            label: "Dismissed / Rejected",
            value: metrics.rejected,
            subtext: "Unsubstantiated claims",
            icon: <OctagonAlert size={16} color="var(--text-muted)" />,
            tone: "neutral",
          },
        ]}
      />

      {/* Filter Bar */}
      <FilterBar
        tabs={STATUS_TABS.map((t) => {
          const list = Array.isArray(disputes) ? disputes : [];
          return {
            id: t.id,
            label: t.label,
            count:
              t.id === "ALL"
                ? list.length
                : list.filter((d) => d.status === t.id).length,
          };
        })}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by ticket ID, trip, parties, or reason..."
      />

      {/* Disputes DataTable */}
      <DataTable
        columns={[
          {
            header: "TICKET & TRIP ID",
            accessor: (d) => (
              <div>
                <div className="text-mono font-bold text-brand text-base">
                  #{d.id}
                </div>
                <div
                  className="text-mono text-sm mt-compact"
                  style={{ color: "var(--brand-secondary)" }}
                >
                  Trip: {d.tripId}
                </div>
              </div>
            ),
          },
          {
            header: "PARTIES INVOLVED",
            accessor: (d) => (
              <div>
                <div className="font-semibold text-primary text-md">
                  {d.reporterName || d.reporterId}
                </div>
                <div className="text-sm text-muted mt-micro">
                  vs.{" "}
                  <span className="text-secondary">
                    {d.accusedName || d.accusedId}
                  </span>
                </div>
              </div>
            ),
          },
          {
            header: "REASON & STATEMENT",
            accessor: (d) => (
              <div style={{ maxWidth: "320px" }}>
                <div className="font-semibold text-primary text-base">
                  {d.reason}
                </div>
                <div className="text-sm text-muted whitespace-nowrap overflow-hidden text-ellipsis mt-compact">
                  {d.description || "No description provided"}
                </div>
              </div>
            ),
          },
          {
            header: "STATUS",
            accessor: (d) => <StatusBadge status={d.status} />,
          },
          {
            header: "DATE FILED",
            accessor: (d) => (
              <div className="text-sm text-secondary">
                {new Date(d.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            ),
          },
          {
            header: "ACTIONS",
            align: "right",
            accessor: (d) => (
              <Button
                variant={
                  d.status === "OPEN" || d.status === "UNDER_REVIEW"
                    ? "primary"
                    : "outline"
                }
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDispute(d);
                  setResolutionText(d.resolutionText || "");
                  setResolutionStatus(
                    d.status === "REJECTED" ? "REJECTED" : "RESOLVED",
                  );
                }}
              >
                {d.status === "OPEN" || d.status === "UNDER_REVIEW"
                  ? "Arbitrate →"
                  : "View Findings"}
              </Button>
            ),
          },
        ]}
        data={filteredDisputes}
        keyExtractor={(d) => d.id}
        loading={loading}
        onRowClick={(d) => {
          setSelectedDispute(d);
          setResolutionText(d.resolutionText || "");
          setResolutionStatus(
            d.status === "REJECTED" ? "REJECTED" : "RESOLVED",
          );
        }}
        emptyTitle="No dispute tickets found"
        emptySubtitle="No dispute tickets found matching this filter criteria."
      />

      {/* Slide-out Arbitration Drawer */}
      <Drawer
        isOpen={!!selectedDispute}
        onClose={() => setSelectedDispute(null)}
        title={
          selectedDispute
            ? `Dispute Ticket #${selectedDispute.id}`
            : "Dispute Arbitration"
        }
        subtitle={
          selectedDispute ? `Trip Reference: ${selectedDispute.tripId}` : ""
        }
        footer={
          selectedDispute &&
          (selectedDispute.status === "OPEN" ||
            selectedDispute.status === "UNDER_REVIEW") ? (
            <div className="flex gap-3 w-full justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDispute(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={requestResolveConfirm}
                loading={actionLoading}
              >
                Submit Arbitration Finding
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedDispute(null)}
            >
              Close Ticket
            </Button>
          )
        }
      >
        {selectedDispute && (
          <div className="flex flex-col gap-5">
            {/* Status Overview */}
            <div className="p-4 rounded-md bg-card-elevated border border-subtle flex justify-between items-center">
              <div>
                <div className="text-sm text-muted">Ticket Status</div>
                <div className="mt-1">
                  <StatusBadge status={selectedDispute.status} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted">Filed Date</div>
                <div className="text-base text-primary mt-1">
                  {new Date(selectedDispute.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Parties Card */}
            <div className="p-5 rounded-md bg-card border border-subtle flex flex-col gap-3">
              <div className="text-base font-semibold text-primary border-b border-subtle pb-2">
                Conflict Counterparties
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted">Filing Reporter:</span>
                <span className="font-semibold text-primary">
                  {selectedDispute.reporterName || selectedDispute.reporterId}
                </span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted">Accused Counterparty:</span>
                <span
                  className="font-semibold"
                  style={{ color: "var(--brand-secondary)" }}
                >
                  {selectedDispute.accusedName || selectedDispute.accusedId}
                </span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted">Trip Reference:</span>
                <span className="text-mono text-brand">
                  {selectedDispute.tripId}
                </span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted">Claim Category:</span>
                <span className="font-semibold text-warning">
                  {selectedDispute.reason}
                </span>
              </div>
            </div>

            {/* Reporter Statement */}
            <div className="p-5 rounded-md bg-card border border-subtle">
              <div className="text-base font-semibold text-primary mb-2">
                Complainant's Written Statement
              </div>
              <p
                className="text-base text-secondary rounded-sm bg-base border border-subtle"
                style={{ lineHeight: 1.5, padding: "0.875rem" }}
              >
                {selectedDispute.description ||
                  "No formal written explanation provided."}
              </p>
            </div>

            {/* Resolution Form or Findings */}
            {selectedDispute.status === "OPEN" ||
            selectedDispute.status === "UNDER_REVIEW" ? (
              <div className="bg-card border border-subtle rounded-lg p-5">
                <h4
                  className="font-bold text-primary mb-4 text-title-sm"
                  style={{ marginTop: "0.1rem" }}
                >
                  Execute Official Arbitration Decision
                </h4>

                {/* Outcome Toggle */}
                <div
                  className="grid gap-3 mb-4"
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  <button
                    type="button"
                    onClick={() => setResolutionStatus("RESOLVED")}
                    className="rounded-md text-base font-semibold cursor-pointer flex items-center justify-center gap-compact"
                    style={{
                      padding: "0.625rem",
                      border:
                        resolutionStatus === "RESOLVED"
                          ? "1px solid var(--color-success)"
                          : "1px solid var(--border-subtle)",
                      backgroundColor:
                        resolutionStatus === "RESOLVED"
                          ? "rgba(16, 185, 129, 0.12)"
                          : "transparent",
                      color:
                        resolutionStatus === "RESOLVED"
                          ? "var(--color-success)"
                          : "var(--text-secondary)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Check size={14} /> Accept & Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus("REJECTED")}
                    className="rounded-md text-base font-semibold cursor-pointer flex items-center justify-center gap-compact"
                    style={{
                      padding: "0.625rem",
                      border:
                        resolutionStatus === "REJECTED"
                          ? "1px solid var(--color-danger)"
                          : "1px solid var(--border-subtle)",
                      backgroundColor:
                        resolutionStatus === "REJECTED"
                          ? "rgba(239, 68, 68, 0.12)"
                          : "transparent",
                      color:
                        resolutionStatus === "REJECTED"
                          ? "var(--color-danger)"
                          : "var(--text-secondary)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <X size={14} /> Dismiss / Reject Claim
                  </button>
                </div>

                <Textarea
                  label="Findings & Action Plan"
                  required
                  rows={4}
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Document telemetry cross-checks, route review, or any refund/credit issued..."
                  hint="This finding will be permanently audited and sent to both parties in their incident logs."
                />
              </div>
            ) : (
              <div className="p-5 rounded-md bg-card border border-subtle">
                <div className="text-base font-semibold text-primary mb-2">
                  Arbitrator's Recorded Findings
                </div>
                <p
                  className="text-base text-secondary rounded-sm bg-base border border-subtle"
                  style={{ lineHeight: 1.5, padding: "0.875rem" }}
                >
                  {selectedDispute.resolutionText || "Case marked closed."}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={confirmResolveOpen && !!selectedDispute}
        onClose={() => !actionLoading && setConfirmResolveOpen(false)}
        onConfirm={handleResolve}
        variant={resolutionStatus === "REJECTED" ? "warning" : "success"}
        isLoading={actionLoading}
        title={
          resolutionStatus === "REJECTED"
            ? "Dismiss & Reject Dispute Claim?"
            : "Accept & Resolve Dispute Claim?"
        }
        subtitle={selectedDispute ? `Ticket #${selectedDispute.id}` : undefined}
        description={
          <span>
            This arbitration finding will be recorded in the incident audit log
            and notifications will be dispatched to both{" "}
            <strong>
              {selectedDispute?.reporterName || selectedDispute?.reporterId}
            </strong>{" "}
            and{" "}
            <strong>
              {selectedDispute?.accusedName || selectedDispute?.accusedId}
            </strong>
            .
          </span>
        }
        details={
          <div className="text-base text-secondary">
            <strong>Recorded Decision:</strong> {resolutionText}
          </div>
        }
        confirmLabel={
          resolutionStatus === "REJECTED" ? "Reject Claim" : "Submit Resolution"
        }
      />
    </div>
  );
}

export default function DisputesPage() {
  return (
    <Suspense
      fallback={
        <div className="admin-page">
          <div className="text-muted text-body-lg p-6">Loading Disputes & Claims...</div>
        </div>
      }
    >
      <DisputesPageContent />
    </Suspense>
  );
}
