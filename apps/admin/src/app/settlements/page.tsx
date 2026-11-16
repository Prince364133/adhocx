"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Clock, CreditCard, RotateCcw, ShieldCheck } from "lucide-react";
import { adminApi } from "../../lib/api/client";
import { SettlementListItem } from "../../lib/api/types";
import {
  PageHeader,
  KpiStrip,
  SegmentedTabs,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
  FeedbackBanner,
  ConfirmDialog,
  Input,
  Textarea,
} from "../../components/common";
import { CorporatePayoutBatchesSection } from "./CorporatePayoutBatchesSection";

const STATUS_TABS = [
  { id: "ALL", label: "All Settlements" },
  { id: "PENDING", label: "Pending Payouts" },
  { id: "SETTLED", label: "Settled" },
  { id: "FAILED", label: "Failed / Refunded" },
];

export default function SettlementsPage() {
  const [activeModule, setActiveModule] = useState<
    "CORPORATE_BATCHES" | "ON_DEMAND"
  >("ON_DEMAND");
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [settlements, setSettlements] = useState<SettlementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] =
    useState<SettlementListItem | null>(null);
  const [actionType, setActionType] = useState<"SETTLED" | "FAILED" | null>(
    null,
  );
  const [transactionRef, setTransactionRef] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [bankReviewLoading, setBankReviewLoading] = useState(false);
  const [bankReviewReason, setBankReviewReason] = useState("");
  const [confirmActionOpen, setConfirmActionOpen] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    loadSettlements(activeTab);
  }, [activeTab]);

  async function loadSettlements(status: string) {
    setLoading(true);
    try {
      const data = await adminApi
        .getSettlements(status)
        .catch(() => [] as SettlementListItem[]);
      setSettlements(data);
    } finally {
      setLoading(false);
    }
  }

  // Filter settlements by search query
  const filteredSettlements = useMemo(() => {
    if (!searchQuery.trim()) return settlements;
    const q = searchQuery.toLowerCase();
    return settlements.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.driverName?.toLowerCase().includes(q) ||
        s.bankAccountName?.toLowerCase().includes(q) ||
        s.bankIfsc?.toLowerCase().includes(q) ||
        s.transactionRef?.toLowerCase().includes(q),
    );
  }, [settlements, searchQuery]);

  // Settlement KPI calculations
  const metrics = useMemo(() => {
    const pending = settlements.filter((s) => s.status === "PENDING");
    const settled = settlements.filter((s) => s.status === "SETTLED");
    const failed = settlements.filter((s) => s.status === "FAILED");

    const pendingTotal = pending.reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0,
    );
    const settledTotal = settled.reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0,
    );

    return {
      pendingCount: pending.length,
      pendingTotal,
      settledCount: settled.length,
      settledTotal,
      failedCount: failed.length,
    };
  }, [settlements]);

  function requestActionConfirm() {
    if (!selectedSettlement || !actionType) return;
    if (
      actionType === "SETTLED" &&
      selectedSettlement.bankVerificationStatus !== "VERIFIED"
    ) {
      setAlert({
        type: "error",
        message:
          "Manually verify the driver bank details before marking this payout as paid.",
      });
      return;
    }
    if (actionType === "SETTLED" && !transactionRef.trim()) {
      setAlert({
        type: "error",
        message: "Bank UTR / Transaction Reference is required to settle.",
      });
      return;
    }
    if (actionType === "FAILED" && !failureReason.trim()) {
      setAlert({ type: "error", message: "Failure reason is required." });
      return;
    }
    setConfirmActionOpen(true);
  }

  async function handleBankReview(status: "VERIFIED" | "REJECTED") {
    if (!selectedSettlement) return;
    if (status === "REJECTED" && !bankReviewReason.trim()) {
      setAlert({
        type: "error",
        message: "A reason is required when rejecting bank details.",
      });
      return;
    }

    setBankReviewLoading(true);
    try {
      const result = await adminApi.reviewSettlementBank(
        selectedSettlement.id,
        {
          status,
          ...(status === "REJECTED" ? { reason: bankReviewReason.trim() } : {}),
        },
      );
      setSelectedSettlement({
        ...selectedSettlement,
        bankVerificationStatus: result.bankVerificationStatus,
      });
      setBankReviewReason("");
      setAlert({
        type: "success",
        message:
          status === "VERIFIED"
            ? "Bank details verified. This payout can now be marked as paid after transfer."
            : "Bank details rejected. The driver has been notified.",
      });
      await loadSettlements(activeTab);
    } catch (err: any) {
      setAlert({ type: "error", message: err.message || "Bank review failed" });
    } finally {
      setBankReviewLoading(false);
    }
  }

  async function handleExecuteAction() {
    if (!selectedSettlement || !actionType) return;
    setActionLoading(true);

    try {
      if (actionType === "SETTLED") {
        if (!transactionRef.trim()) {
          setAlert({
            type: "error",
            message: "Bank UTR / Transaction Reference is required to settle.",
          });
          setActionLoading(false);
          return;
        }
        await adminApi.processSettlement(selectedSettlement.id, {
          status: "SETTLED",
          transactionRef,
        });
        setAlert({
          type: "success",
          message: `Payout of ₹${selectedSettlement.amount.toLocaleString("en-IN")} successfully marked SETTLED with UTR: ${transactionRef}`,
        });
      } else if (actionType === "FAILED") {
        if (!failureReason.trim()) {
          setAlert({ type: "error", message: "Failure reason is required." });
          setActionLoading(false);
          return;
        }
        await adminApi.processSettlement(selectedSettlement.id, {
          status: "FAILED",
          failureReason,
        });
        setAlert({
          type: "success",
          message: `Settlement marked FAILED. Funds of ₹${selectedSettlement.amount.toLocaleString("en-IN")} have been automatically refunded back to driver's wallet.`,
        });
      }

      setConfirmActionOpen(false);
      setSelectedSettlement(null);
      setActionType(null);
      loadSettlements(activeTab);
    } catch (err: any) {
      setAlert({ type: "error", message: err.message || "Operation failed" });
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
        title="Driver Settlements & Payouts"
        subtitle="Inspect withdrawal requests, verify bank IFSC details, authorize bank payouts, and audit automated refund rollbacks"
        liveStatus="Bank Gateway Synchronized"
      />

      {/* Module Selector: Corporate ETS Batches vs On-Demand Settlements */}
      <SegmentedTabs
        tabs={[
          {
            id: "CORPORATE_BATCHES",
            label: "Corporate Driver Payout Batches (Maker-Checker)",
          },
          { id: "ON_DEMAND", label: "On-Demand Driver Withdrawals" },
        ]}
        activeTab={activeModule}
        onChange={setActiveModule}
      />

      {activeModule === "CORPORATE_BATCHES" ? (
        <CorporatePayoutBatchesSection />
      ) : (
        <>
          {/* Settlement Metrics KPI Grid */}
          <KpiStrip
            columns={3}
            items={[
              {
                id: "pending",
                label: "Pending Payouts",
                value: metrics.pendingCount,
                subtext: `₹ ${metrics.pendingTotal.toLocaleString("en-IN")} awaiting authorization`,
                icon: <Clock size={16} color="var(--color-warning)" />,
                tone: "warning",
              },
              {
                id: "settled",
                label: "Settled Disbursals",
                value: metrics.settledCount,
                subtext: `₹ ${metrics.settledTotal.toLocaleString("en-IN")} successfully wired`,
                icon: <CreditCard size={16} color="var(--color-success)" />,
                tone: "success",
              },
              {
                id: "failed",
                label: "Failed / Rollbacks",
                value: metrics.failedCount,
                subtext: "Refunded to driver wallets",
                icon: <RotateCcw size={16} color="var(--color-danger)" />,
                tone: "danger",
              },
            ]}
          />

          {/* Filter Bar */}
          <FilterBar
            tabs={STATUS_TABS.map((t) => ({
              id: t.id,
              label: t.label,
              count:
                t.id === "ALL"
                  ? settlements.length
                  : settlements.filter((s) => s.status === t.id).length,
            }))}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by ID, driver name, IFSC, or UTR..."
          />

          {/* Settlements DataTable */}
          <DataTable
            columns={[
              {
                header: "SETTLEMENT ID",
                accessor: (s) => (
                  <div>
                    <div className="text-mono font-bold text-brand text-base">
                      #{s.id.slice(0, 10)}
                    </div>
                    <div className="text-sm text-muted mt-compact">
                      Requested {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ),
              },
              {
                header: "DRIVER INFO",
                accessor: (s) => (
                  <div>
                    <div className="font-semibold text-primary text-body-sm">
                      {s.driverName || "Driver"}
                    </div>
                    <div className="text-sm text-muted text-mono mt-micro">
                      ID: {s.driverId?.slice(0, 12)}
                    </div>
                  </div>
                ),
              },
              {
                header: "PAYOUT AMOUNT",
                accessor: (s) => (
                  <div
                    className="font-bold text-success"
                    style={{ fontSize: "0.88rem" }}
                  >
                    ₹ {Number(s.amount).toLocaleString("en-IN")}
                  </div>
                ),
              },
              {
                header: "BANK ACCOUNT & IFSC",
                accessor: (s) => (
                  <div>
                    <div className="font-medium text-primary text-base">
                      {s.bankAccountName || "Account Holder"}
                    </div>
                    <div className="text-sm text-muted text-mono mt-micro">
                      {s.bankAccountNumber} •{" "}
                      <span className="text-secondary">{s.bankIfsc}</span>
                    </div>
                  </div>
                ),
              },
              {
                header: "STATUS",
                accessor: (s) => <StatusBadge status={s.status} />,
              },
              {
                header: "PAYMENT PROOF (UTR)",
                accessor: (s) => (
                  <span
                    className="text-mono text-base"
                    style={{
                      color: s.transactionRef
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    }}
                  >
                    {s.transactionRef || "—"}
                  </span>
                ),
              },
              {
                header: "ACTIONS",
                align: "right",
                accessor: (s) => (
                  <div className="flex justify-end gap-2">
                    {s.status === "PENDING" ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSettlement(s);
                          setActionType(null);
                          setTransactionRef("");
                          setFailureReason("");
                        }}
                      >
                        Process Payout →
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSettlement(s);
                          setActionType(null);
                        }}
                      >
                        Inspect Dossier
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
            data={filteredSettlements}
            keyExtractor={(s) => s.id}
            loading={loading}
            onRowClick={(s) => {
              setSelectedSettlement(s);
              setActionType(null);
              setTransactionRef("");
              setFailureReason("");
            }}
            emptyTitle="No settlements found"
            emptySubtitle={`No withdrawal settlements matching filter "${activeTab}".`}
          />

          {/* Slide-out Settlement Drawer */}
          <Drawer
            isOpen={!!selectedSettlement}
            onClose={() => {
              setSelectedSettlement(null);
              setActionType(null);
            }}
            title={
              selectedSettlement
                ? `Payout Dossier: ₹${Number(selectedSettlement.amount).toLocaleString("en-IN")}`
                : "Payout Dossier"
            }
            subtitle={
              selectedSettlement
                ? `Settlement ID #${selectedSettlement.id}`
                : ""
            }
            footer={
              selectedSettlement && selectedSettlement.status === "PENDING" ? (
                actionType ? (
                  <div className="flex gap-3 w-full justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActionType(null)}
                      disabled={actionLoading}
                    >
                      Back
                    </Button>
                    <Button
                      variant={actionType === "SETTLED" ? "success" : "danger"}
                      size="sm"
                      onClick={requestActionConfirm}
                      loading={actionLoading}
                    >
                      Confirm{" "}
                      {actionType === "SETTLED" ? "Settlement" : "Rollback"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3 w-full justify-end">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setActionType("FAILED")}
                    >
                      Mark as Failed (Refund)
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => setActionType("SETTLED")}
                    >
                      Mark as Settled
                    </Button>
                  </div>
                )
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedSettlement(null)}
                >
                  Close Dossier
                </Button>
              )
            }
          >
            {selectedSettlement && (
              <div className="flex flex-col gap-5">
                {/* Status Summary Banner */}
                <div className="p-4 rounded-md bg-card-elevated border border-subtle flex justify-between items-center">
                  <div>
                    <div className="text-sm text-muted">Status</div>
                    <div className="mt-1">
                      <StatusBadge status={selectedSettlement.status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted">Amount Payable</div>
                    <div
                      className="font-bold text-success mt-micro"
                      style={{ fontSize: "1.375rem" }}
                    >
                      ₹{" "}
                      {Number(selectedSettlement.amount).toLocaleString(
                        "en-IN",
                      )}
                    </div>
                  </div>
                </div>

                {/* Bank Details Card */}
                <div
                  className="p-5 rounded-md bg-card border border-subtle flex flex-col"
                  style={{ gap: "0.875rem" }}
                >
                  <div className="text-base font-semibold text-primary border-b border-subtle pb-2">
                    Beneficiary Banking Profile
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted">Account Holder:</span>
                    <span className="font-semibold text-primary">
                      {selectedSettlement.bankAccountName}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted">Account Number:</span>
                    <span className="text-mono font-semibold text-primary">
                      {selectedSettlement.bankAccountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted">Bank IFSC Code:</span>
                    <span className="text-mono font-semibold text-brand">
                      {selectedSettlement.bankIfsc}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted">Bank Name:</span>
                    <span className="text-primary">
                      {selectedSettlement.bankName || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted">Bank Verification:</span>
                    <span className="text-primary">
                      {selectedSettlement.bankVerificationStatus ||
                        "NOT_SUBMITTED"}
                    </span>
                  </div>
                  {selectedSettlement.bankVerificationStatus !== "VERIFIED" && (
                    <div className="flex flex-col gap-2">
                      <input
                        value={bankReviewReason}
                        onChange={(event) =>
                          setBankReviewReason(event.target.value)
                        }
                        placeholder="Reason if rejecting bank details"
                        aria-label="Bank review rejection reason"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={bankReviewLoading}
                          onClick={() => handleBankReview("REJECTED")}
                        >
                          Reject bank details
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={bankReviewLoading}
                          onClick={() => handleBankReview("VERIFIED")}
                        >
                          Verify bank details
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between text-base">
                    <span className="text-muted">Driver ID:</span>
                    <span className="text-mono text-secondary">
                      {selectedSettlement.driverId}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted">Requested On:</span>
                    <span className="text-primary">
                      {new Date(selectedSettlement.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedSettlement.transactionRef && (
                    <div className="flex justify-between text-base">
                      <span className="text-muted">Bank UTR / Ref:</span>
                      <span className="text-mono font-bold text-success">
                        {selectedSettlement.transactionRef}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action forms for PENDING settlements */}
                {selectedSettlement.status === "PENDING" &&
                  actionType === "SETTLED" && (
                    <div
                      className="p-5 rounded-md flex flex-col gap-3"
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.06)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      <div className="text-md font-semibold text-success">
                        Authorize Bank Disbursal
                      </div>
                      <div>
                        <Input
                          label="Bank UTR / Transaction Reference"
                          required
                          placeholder="e.g. UTR1234567890 or NEFT-REF-889"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          hint="Enter the bank UTR as payment proof after the transfer. This marks the payout complete and notifies the driver in the app."
                        />
                      </div>
                    </div>
                  )}

                {selectedSettlement.status === "PENDING" &&
                  actionType === "FAILED" && (
                    <div
                      className="p-5 rounded-md flex flex-col gap-3"
                      style={{
                        backgroundColor: "rgba(239, 68, 68, 0.06)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                      }}
                    >
                      <div className="text-md font-semibold text-danger">
                        Fail & Rollback Settlement
                      </div>
                      <div>
                        <Textarea
                          label="Rejection / Failure Reason"
                          required
                          rows={3}
                          placeholder="e.g. Beneficiary account closed or invalid IFSC code"
                          value={failureReason}
                          onChange={(e) => setFailureReason(e.target.value)}
                        />
                        <div
                          className="mt-3 p-3 rounded-sm text-sm text-warning flex items-start gap-2"
                          style={{
                            background: "rgba(245, 158, 11, 0.1)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            lineHeight: 1.4,
                          }}
                        >
                          <ShieldCheck
                            size={16}
                            style={{ flexShrink: 0, marginTop: "2px" }}
                          />
                          <div>
                            <strong>Automated Ledger Safeguard:</strong> Marking
                            this payout as FAILED will automatically credit ₹
                            {selectedSettlement.amount.toLocaleString("en-IN")}{" "}
                            back into the driver's wallet with an audited{" "}
                            <code>WITHDRAWAL_REFUND</code> ledger transaction.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </Drawer>

          <ConfirmDialog
            isOpen={confirmActionOpen && !!selectedSettlement && !!actionType}
            onClose={() => !actionLoading && setConfirmActionOpen(false)}
            onConfirm={handleExecuteAction}
            variant={actionType === "FAILED" ? "danger" : "success"}
            isLoading={actionLoading}
            title={
              actionType === "FAILED"
                ? "Fail Payout & Refund Wallet?"
                : "Authorize & Settle Driver Payout?"
            }
            subtitle={
              selectedSettlement
                ? `Settlement #${selectedSettlement.id}`
                : undefined
            }
            description={
              actionType === "FAILED" ? (
                <span>
                  Marking this payout as <strong>FAILED</strong> will
                  immediately refund{" "}
                  <strong>
                    ₹
                    {Number(selectedSettlement?.amount || 0).toLocaleString(
                      "en-IN",
                    )}
                  </strong>{" "}
                  back to{" "}
                  <strong>{selectedSettlement?.driverName || "driver"}</strong>
                  &apos;s wallet ledger.
                </span>
              ) : (
                <span>
                  Confirm wiring{" "}
                  <strong>
                    ₹
                    {Number(selectedSettlement?.amount || 0).toLocaleString(
                      "en-IN",
                    )}
                  </strong>{" "}
                  to{" "}
                  <strong>
                    {selectedSettlement?.bankAccountName ||
                      selectedSettlement?.driverName ||
                      "beneficiary"}
                  </strong>
                  .
                </span>
              )
            }
            details={
              <div className="text-base text-secondary">
                {actionType === "SETTLED" ? (
                  <>
                    <strong>Bank UTR Ref:</strong>{" "}
                    <span className="text-mono">{transactionRef}</span>
                  </>
                ) : (
                  <>
                    <strong>Rejection Reason:</strong> {failureReason}
                  </>
                )}
              </div>
            }
            confirmLabel={
              actionType === "FAILED"
                ? "Confirm Fail & Refund"
                : "Confirm Settlement"
            }
          />
        </>
      )}
    </div>
  );
}
