"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CreditCard, CheckCircle2, Lock, RotateCcw } from "lucide-react";
import { adminApi } from "../../lib/api/client";
import { AdminPaymentItem, AdminPaymentMetrics } from "../../lib/api/types";
import {
  PageHeader,
  KpiStrip,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
} from "../../components/common";

const STATUS_TABS = [
  { id: "ALL", label: "All Payments" },
  { id: "HELD_IN_ESCROW", label: "Escrow Held" },
  { id: "RELEASED", label: "Released / Settled" },
  { id: "PENDING", label: "Pending" },
  { id: "REFUNDED", label: "Refunded" },
  { id: "FAILED", label: "Failed" },
];

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [payments, setPayments] = useState<AdminPaymentItem[]>([]);
  const [metrics, setMetrics] = useState<AdminPaymentMetrics>({
    totalEscrowVolume: 0,
    activeEscrowHolds: 0,
    settledVolume: 0,
    pendingTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] =
    useState<AdminPaymentItem | null>(null);

  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  async function loadData(status: string) {
    setLoading(true);
    try {
      const [paymentsRes, metricsRes] = await Promise.all([
        adminApi
          .getAdminPayments({
            status: status !== "ALL" ? status : undefined,
            limit: 100,
          })
          .catch(() => ({ items: [], total: 0 })),
        adminApi.getAdminPaymentMetrics().catch(() => ({
          totalEscrowVolume: 0,
          activeEscrowHolds: 0,
          settledVolume: 0,
          pendingTransactions: 0,
        })),
      ]);
      setPayments(paymentsRes.items || []);
      setMetrics(metricsRes);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase().trim();
    return payments.filter((p) => {
      return (
        p.id.toLowerCase().includes(q) ||
        (p.vendorName && p.vendorName.toLowerCase().includes(q)) ||
        (p.requirementId && p.requirementId.toLowerCase().includes(q)) ||
        (p.gatewayPaymentId && p.gatewayPaymentId.toLowerCase().includes(q)) ||
        (p.gatewayOrderId && p.gatewayOrderId.toLowerCase().includes(q))
      );
    });
  }, [payments, searchQuery]);

  return (
    <div className="admin-page">
      {/* Page Header */}
      <PageHeader
        title="Customer Payments & Escrow Ledger"
        subtitle="Monitor enterprise client invoices, pre-authorized escrow payments, and captured ride receipts"
        liveStatus="Payment Gateway Synced (RazorpayX)"
      />

      {/* Top Level Metric Cards */}
      <KpiStrip
        columns={4}
        items={[
          {
            id: "total-escrow",
            label: "Total Escrow Volume",
            value: `₹ ${Number(metrics.totalEscrowVolume || 0).toLocaleString("en-IN")}`,
            subtext: "Total escrow deposits to date",
            icon: <CreditCard size={16} color="var(--text-brand)" />,
            tone: "indigo",
          },
          {
            id: "settled",
            label: "Settled & Disbursed",
            value: `₹ ${Number(metrics.settledVolume || 0).toLocaleString("en-IN")}`,
            subtext: "Released to drivers upon completion",
            icon: <CheckCircle2 size={16} color="var(--color-success)" />,
            tone: "success",
          },
          {
            id: "active-holds",
            label: "Active Escrow Holds",
            value: `₹ ${Number(metrics.activeEscrowHolds || 0).toLocaleString("en-IN")}`,
            subtext: "Locked in escrow for active trips",
            icon: <Lock size={16} color="var(--brand-violet-text)" />,
            tone: "violet",
          },
          {
            id: "pending",
            label: "Pending Transactions",
            value: metrics.pendingTransactions || 0,
            subtext: "Awaiting gateway clearance",
            icon: <RotateCcw size={16} color="var(--color-warning)" />,
            tone: "warning",
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
              ? payments.length
              : payments.filter((p) => p.status === t.id).length,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by vendor, gateway reference, transaction ID..."
      />

      {/* Payments DataTable */}
      <DataTable
        columns={[
          {
            header: "PAYMENT ID",
            accessor: (p: AdminPaymentItem) => (
              <div>
                <div className="text-mono font-bold text-brand text-base">
                  #{p.id.slice(0, 10).toUpperCase()}
                </div>
                <div className="text-sm text-muted mt-compact">
                  {new Date(p.createdAt).toLocaleDateString()}
                </div>
              </div>
            ),
          },
          {
            header: "ENTERPRISE VENDOR",
            accessor: (p: AdminPaymentItem) => (
              <div className="font-semibold text-primary text-body-sm">
                {p.vendorName || "Corporate Client"}
              </div>
            ),
          },
          {
            header: "REQUIREMENT REF",
            accessor: (p: AdminPaymentItem) => (
              <span
                className="text-mono text-sm bg-card-elevated rounded-sm border border-subtle"
                style={{ padding: "0.2rem 0.4rem" }}
              >
                {p.requirementId
                  ? `#REQ-${p.requirementId.slice(0, 6).toUpperCase()}`
                  : "WALLET TOP-UP"}
              </span>
            ),
          },
          {
            header: "TRANSACTION AMOUNT",
            accessor: (p: AdminPaymentItem) => (
              <div className="font-bold text-primary text-value">
                ₹{" "}
                {Number(p.amount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
            ),
          },
          {
            header: "GATEWAY & REFERENCE",
            accessor: (p: AdminPaymentItem) => (
              <div>
                <div className="text-base font-medium text-primary">
                  {p.paymentGateway || "RAZORPAY"} ({p.type.replace(/_/g, " ")})
                </div>
                <div className="text-sm text-mono text-muted mt-micro">
                  {p.gatewayPaymentId || p.gatewayOrderId || "Direct Clearance"}
                </div>
              </div>
            ),
          },
          {
            header: "STATUS",
            accessor: (p: AdminPaymentItem) => (
              <StatusBadge status={p.status} />
            ),
          },
          {
            header: "ACTIONS",
            align: "right",
            accessor: (p: AdminPaymentItem) => (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPayment(p);
                }}
              >
                Receipt Dossier
              </Button>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(p) => p.id}
        loading={loading}
        onRowClick={(p) => setSelectedPayment(p)}
        emptyMessage="No payment transactions found matching your filters"
      />

      {/* Slide-out Payment Dossier Drawer */}
      <Drawer
        isOpen={!!selectedPayment}
        onClose={() => setSelectedPayment(null)}
        title={
          selectedPayment
            ? `Payment Dossier #${selectedPayment.id.slice(0, 10).toUpperCase()}`
            : "Payment Dossier"
        }
        subtitle={
          selectedPayment
            ? `Gateway ID: ${selectedPayment.gatewayPaymentId || selectedPayment.gatewayOrderId || "N/A"}`
            : ""
        }
        footer={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedPayment(null)}
          >
            Close Dossier
          </Button>
        }
      >
        {selectedPayment && (
          <div className="flex flex-col gap-5">
            {/* Amount Summary */}
            <div className="p-5 rounded-md bg-card-elevated border border-subtle flex justify-between items-center">
              <div>
                <div className="text-sm text-muted">Payment Status</div>
                <div className="mt-1">
                  <StatusBadge status={selectedPayment.status} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted">Gross Invoiced Amount</div>
                <div
                  className="font-bold text-primary mt-micro"
                  style={{ fontSize: "1.375rem" }}
                >
                  ₹{" "}
                  {Number(selectedPayment.amount || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>

            {/* Transaction Breakdown Card */}
            <div
              className="p-5 rounded-md bg-card border border-subtle flex flex-col"
              style={{ gap: "0.875rem" }}
            >
              <div className="text-base font-semibold text-primary border-b border-subtle pb-2">
                Escrow & Gateway Details
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted">Enterprise Client:</span>
                <span className="font-semibold text-primary">
                  {selectedPayment.vendorName || "Corporate Client"}
                </span>
              </div>
              {selectedPayment.requirementId && (
                <div className="flex justify-between text-base">
                  <span className="text-muted">Requirement Ref:</span>
                  <span className="text-mono text-brand">
                    #{selectedPayment.requirementId.slice(0, 10).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base">
                <span className="text-muted">Payment Gateway:</span>
                <span className="font-medium text-primary">
                  {selectedPayment.paymentGateway}
                </span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted">Transaction Type:</span>
                <span className="font-semibold text-primary">
                  {selectedPayment.type.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted">Payment Order ID:</span>
                <span className="text-mono text-secondary">
                  {selectedPayment.gatewayOrderId || "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-base border-t border-subtle pt-3">
                <span className="font-semibold text-secondary">
                  Settled Timestamp:
                </span>
                <span className="font-bold text-md text-primary">
                  {new Date(selectedPayment.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
