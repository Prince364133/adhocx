"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TrendingUp,
  CreditCard,
  Wallet,
  Users,
  Clock,
  RotateCcw,
  Download,
  Calendar,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  DollarSign,
  PieChart,
  ChevronRight,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";
import { adminApi } from "../../lib/api/client";
import {
  FinanceDashboardData,
  FinanceTransactionItem,
  FinanceDriverItem,
  FinanceSettlementReportItem,
  FinanceRefundItem,
  DriverFinancialHistoryDetail,
} from "../../lib/api/types";
import {
  PageHeader,
  Card,
  Button,
  Form,
  DataTable,
  StatusBadge,
  Drawer,
} from "../../components/common";
import {
  FinanceAreaChart,
  FinanceSparkline,
  formatINR,
} from "../../components/finance/FinanceCharts";

type SubTab =
  "OVERVIEW" | "TRANSACTIONS" | "DRIVERS" | "SETTLEMENTS" | "REFUNDS";
type TimeframeTab = "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export default function FinanceDashboardPage() {
  // Date range filter state
  const [dateRange, setDateRange] = useState("30D");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Active navigation sub-tab
  const [activeTab, setActiveTab] = useState<SubTab>("OVERVIEW");

  // Chart timeframe state
  const [chartTimeframe, setChartTimeframe] = useState<TimeframeTab>("DAILY");
  const [chartMetric, setChartMetric] = useState<"ALL" | "DRIVER" | "REVENUE">(
    "ALL",
  );

  // Data state
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Filter & Search states
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("ALL");
  const [driverSearch, setDriverSearch] = useState("");
  const [settlementStatus, setSettlementStatus] = useState("ALL");

  // Driver details drawer
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [driverDetail, setDriverDetail] =
    useState<DriverFinancialHistoryDetail | null>(null);
  const [driverDetailLoading, setDriverDetailLoading] = useState(false);

  // Single transaction preview modal
  const [selectedTransaction, setSelectedTransaction] =
    useState<FinanceTransactionItem | null>(null);

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(
    async (isManual = false) => {
      if (isManual) setIsRefreshing(true);
      else setLoading(true);

      try {
        const res = await adminApi.getFinanceDashboard({
          range: dateRange,
          startDate: showCustomRange && customStart ? customStart : undefined,
          endDate: showCustomRange && customEnd ? customEnd : undefined,
        });
        setData(res);
        setLastSyncTime(new Date());
      } catch {
        // In case of network or API error, create a clean zero state with 0 undefined / NaN
        setData({
          isEmpty: true,
          message: "No financial data available",
          range: dateRange,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          metrics: {
            totalRevenue: 0,
            totalPaidToDrivers: 0,
            pendingDriverPayments: 0,
            totalTransactions: 0,
            totalRefunds: 0,
          },
          revenueAnalytics: {
            daily: [],
            weekly: [],
            monthly: [],
            quarterly: [],
            yearly: [],
          },
          driverSummary: {
            totalDriverEarnings: 0,
            amountPaidToDrivers: 0,
            pendingDriverPayments: 0,
            drivers: [],
          },
          transactions: [],
          settlements: [],
          refunds: [],
          revenueBreakdown: [],
        });
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [dateRange, showCustomRange, customStart, customEnd],
  );

  useEffect(() => {
    loadData();
    // Auto-refresh financial figures every 25 seconds
    const timer = setInterval(() => {
      loadData(false);
    }, 25000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleRangeChange = (val: string) => {
    setDateRange(val);
    if (val === "CUSTOM") {
      setShowCustomRange(true);
    } else {
      setShowCustomRange(false);
    }
  };

  const handleApplyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart) return;
    loadData();
  };

  const handleCopy = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Open driver details drawer
  const handleOpenDriver = async (driverId: string) => {
    setSelectedDriverId(driverId);
    setDriverDetailLoading(true);
    try {
      const res = await adminApi.getDriverFinancialHistory(driverId);
      setDriverDetail(res);
    } catch {
      setDriverDetail(null);
    } finally {
      setDriverDetailLoading(false);
    }
  };

  // Safe metrics fallback
  const metrics = useMemo(() => {
    return (
      data?.metrics || {
        totalRevenue: 0,
        totalPaidToDrivers: 0,
        pendingDriverPayments: 0,
        totalTransactions: 0,
        totalRefunds: 0,
      }
    );
  }, [data]);

  // Current active chart points based on selected timeframe
  const currentChartPoints = useMemo(() => {
    if (!data?.revenueAnalytics) return [];
    if (chartTimeframe === "DAILY") return data.revenueAnalytics.daily || [];
    if (chartTimeframe === "WEEKLY") return data.revenueAnalytics.weekly || [];
    if (chartTimeframe === "MONTHLY")
      return data.revenueAnalytics.monthly || [];
    if (chartTimeframe === "QUARTERLY")
      return data.revenueAnalytics.quarterly || [];
    return data.revenueAnalytics.yearly || [];
  }, [data, chartTimeframe]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    let items = data.transactions;
    if (transactionStatus !== "ALL") {
      items = items.filter(
        (t) =>
          (t.paymentStatus || "").toUpperCase() ===
          transactionStatus.toUpperCase(),
      );
    }
    if (transactionSearch.trim()) {
      const q = transactionSearch.toLowerCase().trim();
      items = items.filter(
        (t) =>
          (t.transactionId || "").toLowerCase().includes(q) ||
          (t.orderId || "").toLowerCase().includes(q) ||
          (t.driverName || "").toLowerCase().includes(q) ||
          (t.customerName || "").toLowerCase().includes(q) ||
          (t.vehicleType || "").toLowerCase().includes(q),
      );
    }
    return items;
  }, [data, transactionStatus, transactionSearch]);

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    if (!data?.driverSummary?.drivers) return [];
    let list = data.driverSummary.drivers;
    if (driverSearch.trim()) {
      const q = driverSearch.toLowerCase().trim();
      list = list.filter(
        (d) =>
          (d.driverName || "").toLowerCase().includes(q) ||
          (d.driverPhone || "").toLowerCase().includes(q) ||
          (d.vehiclePlate || "").toLowerCase().includes(q) ||
          (d.vehicleType || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, driverSearch]);

  // Filtered settlements
  const filteredSettlements = useMemo(() => {
    if (!data?.settlements) return [];
    let items = data.settlements;
    if (settlementStatus !== "ALL") {
      items = items.filter(
        (s) => s.status.toUpperCase() === settlementStatus.toUpperCase(),
      );
    }
    return items;
  }, [data, settlementStatus]);

  // Sparkline data generators
  const revenueTrend = useMemo(() => {
    if (
      !data?.revenueAnalytics?.daily ||
      data.revenueAnalytics.daily.length === 0
    )
      return [0, 0, 0, 0];
    return data.revenueAnalytics.daily.map((d) => d.revenue);
  }, [data]);

  const driverTrend = useMemo(() => {
    if (
      !data?.revenueAnalytics?.daily ||
      data.revenueAnalytics.daily.length === 0
    )
      return [0, 0, 0, 0];
    return data.revenueAnalytics.daily.map((d) => d.driverEarnings);
  }, [data]);

  // CSV Export functions with proper BOM for Excel compatibility
  const downloadCsv = (filename: string, csvContent: string) => {
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportTransactions = () => {
    const headers = [
      "Transaction ID",
      "Order ID",
      "Driver Name",
      "Driver Phone",
      "Customer / Corporate",
      "Order Amount (INR)",
      "Driver Payout (INR)",
      "Payment Status",
      "Payment Method",
      "Date & Time",
    ];
    const rows = filteredTransactions.map((t) => [
      `"${t.transactionId}"`,
      `"${t.orderId}"`,
      `"${t.driverName}"`,
      `"${t.driverPhone || ""}"`,
      `"${t.customerName}"`,
      t.totalOrderAmount,
      t.driverEarnings,
      `"${t.paymentStatus}"`,
      `"${t.paymentMethod}"`,
      `"${t.transactionDate}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadCsv(
      `adhocx_transactions_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
  };

  const handleExportDrivers = () => {
    const headers = [
      "Driver ID",
      "Driver Name",
      "Phone",
      "Vehicle Type",
      "Vehicle Plate",
      "Trips Completed",
      "Total Earnings (INR)",
      "Amount Paid (INR)",
      "Pending Balance (INR)",
      "Bank Account",
      "IFSC",
    ];
    const rows = filteredDrivers.map((d) => [
      `"${d.driverId}"`,
      `"${d.driverName}"`,
      `"${d.driverPhone}"`,
      `"${d.vehicleType}"`,
      `"${d.vehiclePlate}"`,
      d.tripsCompleted,
      d.totalEarnings,
      d.amountPaid,
      d.pendingBalance,
      `"${d.bankAccountNumber || ""}"`,
      `"${d.bankIfsc || ""}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadCsv(
      `adhocx_driver_earnings_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
  };

  const handleExportSettlements = () => {
    const headers = [
      "Settlement ID",
      "Driver Name",
      "Amount (INR)",
      "Status",
      "Bank Name",
      "Account Number",
      "IFSC",
      "Bank UTR / Ref",
      "Requested At",
      "Processed At",
    ];
    const rows = filteredSettlements.map((s) => [
      `"${s.settlementId}"`,
      `"${s.driverName}"`,
      s.amount,
      `"${s.status}"`,
      `"${s.bankName || ""}"`,
      `"${s.bankAccountNumber || ""}"`,
      `"${s.bankIfsc || ""}"`,
      `"${s.transactionRef || ""}"`,
      `"${s.requestedDate}"`,
      `"${s.processedDate || ""}"`,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    downloadCsv(
      `adhocx_settlements_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
    );
  };

  const handleExportExecutiveSummary = () => {
    const lines = [
      "AdhocX Executive Financial Audit Summary",
      `Generated At: ${new Date().toLocaleString("en-IN")}`,
      `Filter Period: ${dateRange}`,
      "",
      "KEY METRIC,VALUE",
      `Total Revenue Generated (GMV),${metrics.totalRevenue}`,
      `Total Amount Paid to Drivers,${metrics.totalPaidToDrivers}`,
      `Pending Driver Payments,${metrics.pendingDriverPayments}`,
      `Total Transactions,${metrics.totalTransactions}`,
      `Refunds & Deductions,${metrics.totalRefunds || 0}`,
      "",
      "TIME PERIOD,REVENUE (INR),DRIVER PAYOUT (INR),TRANSACTIONS",
      ...currentChartPoints.map(
        (p) =>
          `"${p.label}",${p.revenue},${p.driverEarnings},${p.transactions}`,
      ),
    ];
    downloadCsv(
      `adhocx_financial_summary_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`,
      lines.join("\n"),
    );
  };

  return (
    <div className="admin-page">
      {/* ─────────────────────────────────────────────────────────────
       * Page Header & Date Range Action Toolbar
       * ───────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Finance & Accounting Dashboard"
        subtitle="Real-time booking revenue, driver payouts, disbursements, and escrow settlements"
        liveStatus={
          isRefreshing
            ? "Syncing Live Telemetry..."
            : `Ledger Synced (${lastSyncTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })})`
        }
        actions={
          <div
            className="flex items-center flex-wrap"
            style={{ gap: "0.65rem" }}
          >
            {/* Quick Presets Dropdown */}
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => handleRangeChange(e.target.value)}
                className="rounded-md bg-card border border-subtle text-primary font-semibold cursor-pointer shadow-sm text-control-lg"
                style={{ padding: "0.38rem 0.72rem" }}
              >
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days (Current Month)</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="LAST_MONTH">Last Month</option>
                <option value="90D">Q3 Quarterly (90D)</option>
                <option value="1Y">Year-to-Date (1Y)</option>
                <option value="CUSTOM">Custom Date Range...</option>
              </select>
            </div>

            {/* Manual Sync Button */}
            <Button
              variant="outline"
              size="md"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              leftIcon={
                <RotateCcw
                  size={15}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              }
              title="Pull latest transaction and completed trip telemetry"
            >
              {isRefreshing ? "Syncing..." : "Sync Live"}
            </Button>

            {/* Download Financial Reports Menu */}
            <div className="relative">
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowExportMenu(!showExportMenu)}
                leftIcon={<Download size={16} />}
              >
                Download Financial Reports
              </Button>

              {showExportMenu && (
                <div
                  className="absolute right-0 bg-card border rounded-md shadow-elevated flex flex-col mt-tight"
                  style={{
                    top: "100%",
                    zIndex: 50,
                    minWidth: "240px",
                    padding: "0.4rem",
                    gap: "0.2rem",
                  }}
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <button
                    type="button"
                    onClick={handleExportTransactions}
                    className="flex items-center gap-2 rounded-sm border-0 bg-transparent text-primary text-base text-left cursor-pointer w-full"
                    style={{ padding: "0.55rem 0.75rem" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--bg-base)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <FileSpreadsheet size={16} color="var(--text-brand)" />
                    <span>Transactions Ledger (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDrivers}
                    className="flex items-center gap-2 rounded-sm border-0 bg-transparent text-primary text-base text-left cursor-pointer w-full"
                    style={{ padding: "0.55rem 0.75rem" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--bg-base)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <Users size={16} color="var(--color-success)" />
                    <span>Driver Earnings Report (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSettlements}
                    className="flex items-center gap-2 rounded-sm border-0 bg-transparent text-primary text-base text-left cursor-pointer w-full"
                    style={{ padding: "0.55rem 0.75rem" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--bg-base)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <CreditCard size={16} color="var(--brand-violet-text)" />
                    <span>Settlements & Payouts (CSV)</span>
                  </button>

                  <div
                    style={{
                      height: "1px",
                      background: "var(--border-subtle)",
                      margin: "0.2rem 0",
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleExportExecutiveSummary}
                    className="flex items-center gap-2 rounded-sm border-0 bg-transparent text-brand font-semibold text-base text-left cursor-pointer w-full"
                    style={{ padding: "0.55rem 0.75rem" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--bg-base)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <FileText size={16} color="var(--text-brand)" />
                    <span>Full Executive Audit Summary (CSV)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Custom Date Range Picker (Conditional Bar) */}
      {showCustomRange && (
        <Form
          onSubmit={handleApplyCustomRange}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "0.75rem 1rem",
            boxShadow: "var(--shadow-sm)",
            flexWrap: "wrap",
          }}
        >
          <div className="flex items-center font-semibold text-primary gap-compact text-body-md">
            <Calendar size={16} color="var(--text-brand)" />
            <span>Select Custom Range:</span>
          </div>

          <div className="flex items-center gap-compact">
            <label className="text-muted text-compact">From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              required
              className="rounded-sm border border-subtle bg-base text-primary text-base"
              style={{ padding: "0.4rem 0.6rem" }}
            />
          </div>

          <div className="flex items-center gap-compact">
            <label className="text-muted text-compact">To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-sm border border-subtle bg-base text-primary text-base"
              style={{ padding: "0.4rem 0.6rem" }}
            />
          </div>

          <Button type="submit" variant="primary" size="sm">
            Apply Custom Filter
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCustomRange(false);
              setDateRange("30D");
            }}
          >
            Cancel
          </Button>
        </Form>
      )}

      {/* ─────────────────────────────────────────────────────────────
       * Top 6 Summary Cards (All 6 in One Single Line)
       * ───────────────────────────────────────────────────────────── */}
      <div
        className="grid gap-3 w-full"
        style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
      >
        {/* Card 1: Total Revenue Generated */}
        <div
          className="bg-card border border-subtle rounded-lg shadow-card flex flex-col justify-between relative overflow-hidden min-w-0"
          style={{ padding: "0.78rem 0.8rem" }}
        >
          <div
            className="absolute top-0 left-0 right-0"
            style={{ height: "3px", background: "#2563EB" }}
          />
          <div>
            <div className="flex justify-between items-center gap-1 mb-compact">
              <span
                className="font-bold text-muted uppercase whitespace-nowrap overflow-hidden text-ellipsis text-caption"
                style={{ letterSpacing: "0.03em" }}
              >
                Total Revenue
              </span>
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: "24px",
                  height: "24px",
                  background: "rgba(37, 99, 235, 0.1)",
                }}
              >
                <TrendingUp size={15} color="#2563EB" />
              </div>
            </div>
            <div
              className="font-extrabold text-primary whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                fontSize: "clamp(1.02rem, 1.15vw, 1.28rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {loading ? "..." : formatINR(metrics.totalRevenue)}
            </div>
            <p
              className="text-muted overflow-hidden text-micro"
              style={{
                margin: "0.2rem 0 0 0",
                lineHeight: 1.25,
                height: "2.5em",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              Gross booking value (GMV) of completed orders
            </p>
          </div>
          <div
            className="flex justify-between items-end border-t border-subtle gap-1"
            style={{ marginTop: "0.65rem", paddingTop: "0.45rem" }}
          >
            <span
              className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-micro"
              style={{ color: "#2563EB" }}
            >
              {metrics.totalTransactions} Invoiced
            </span>
            <FinanceSparkline
              data={revenueTrend}
              color="#2563EB"
              width={68}
              height={24}
            />
          </div>
        </div>

        {/* Card 2: Driver Earnings */}
        <div
          className="bg-card border border-subtle rounded-lg shadow-card flex flex-col justify-between relative overflow-hidden min-w-0"
          style={{ padding: "0.78rem 0.8rem" }}
        >
          <div
            className="absolute top-0 left-0 right-0 bg-brand"
            style={{ height: "3px" }}
          />
          <div>
            <div className="flex justify-between items-center gap-1 mb-compact">
              <span
                className="font-bold text-muted uppercase whitespace-nowrap overflow-hidden text-ellipsis text-caption"
                style={{ letterSpacing: "0.03em" }}
              >
                Driver Earnings
              </span>
              <div
                className="rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0"
                style={{ width: "24px", height: "24px" }}
              >
                <DollarSign size={15} color="var(--text-brand)" />
              </div>
            </div>
            <div
              className="font-extrabold text-brand whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                fontSize: "clamp(1.02rem, 1.15vw, 1.28rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {loading
                ? "..."
                : formatINR(data?.driverSummary?.totalDriverEarnings)}
            </div>
            <p
              className="text-muted overflow-hidden text-micro"
              style={{
                margin: "0.2rem 0 0 0",
                lineHeight: 1.25,
                height: "2.5em",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              Payouts based on the agreed rate card
            </p>
          </div>
          <div
            className="flex justify-between items-end border-t border-subtle gap-1"
            style={{ marginTop: "0.65rem", paddingTop: "0.45rem" }}
          >
            <span className="text-brand font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-micro">
              Rate-card payout
            </span>
            <FinanceSparkline
              data={driverTrend}
              color="var(--text-brand)"
              width={68}
              height={24}
            />
          </div>
        </div>

        {/* Card 3: Total Amount Paid to Drivers */}
        <div
          className="bg-card border border-subtle rounded-lg shadow-card flex flex-col justify-between relative overflow-hidden min-w-0"
          style={{ padding: "0.78rem 0.8rem" }}
        >
          <div
            className="absolute top-0 left-0 right-0"
            style={{ height: "3px", background: "var(--color-success)" }}
          />
          <div>
            <div className="flex justify-between items-center gap-1 mb-compact">
              <span
                className="font-bold text-muted uppercase whitespace-nowrap overflow-hidden text-ellipsis text-caption"
                style={{ letterSpacing: "0.03em" }}
              >
                Paid to Drivers
              </span>
              <div
                className="rounded-full bg-success-subtle flex items-center justify-center flex-shrink-0"
                style={{ width: "24px", height: "24px" }}
              >
                <CheckCircle2 size={15} color="var(--color-success)" />
              </div>
            </div>
            <div
              className="font-extrabold text-success whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                fontSize: "clamp(1.02rem, 1.15vw, 1.28rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {loading ? "..." : formatINR(metrics.totalPaidToDrivers)}
            </div>
            <p
              className="text-muted overflow-hidden text-micro"
              style={{
                margin: "0.2rem 0 0 0",
                lineHeight: 1.25,
                height: "2.5em",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              Disbursed to driver bank accounts (SETTLED)
            </p>
          </div>
          <div
            className="flex justify-between items-end border-t border-subtle gap-1"
            style={{ marginTop: "0.65rem", paddingTop: "0.45rem" }}
          >
            <span className="text-success font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-micro">
              Wire Settled
            </span>
            <FinanceSparkline
              data={driverTrend}
              color="var(--color-success)"
              width={68}
              height={24}
            />
          </div>
        </div>

        {/* Card 4: Pending Driver Payments */}
        <div
          className="bg-card border border-subtle rounded-lg shadow-card flex flex-col justify-between relative overflow-hidden min-w-0"
          style={{ padding: "0.78rem 0.8rem" }}
        >
          <div
            className="absolute top-0 left-0 right-0"
            style={{ height: "3px", background: "var(--color-warning)" }}
          />
          <div>
            <div className="flex justify-between items-center gap-1 mb-compact">
              <span
                className="font-bold text-muted uppercase whitespace-nowrap overflow-hidden text-ellipsis text-caption"
                style={{ letterSpacing: "0.03em" }}
              >
                Pending Payments
              </span>
              <div
                className="rounded-full bg-warning-subtle flex items-center justify-center flex-shrink-0"
                style={{ width: "24px", height: "24px" }}
              >
                <Clock size={15} color="var(--color-warning)" />
              </div>
            </div>
            <div
              className="font-extrabold text-warning whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                fontSize: "clamp(1.02rem, 1.15vw, 1.28rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {loading ? "..." : formatINR(metrics.pendingDriverPayments)}
            </div>
            <p
              className="text-muted overflow-hidden text-micro"
              style={{
                margin: "0.2rem 0 0 0",
                lineHeight: 1.25,
                height: "2.5em",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              Queued withdrawals & unsettled wallet balances
            </p>
          </div>
          <div
            className="flex justify-between items-end border-t border-subtle gap-1"
            style={{ marginTop: "0.65rem", paddingTop: "0.45rem" }}
          >
            <span className="text-warning font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-micro">
              Ready for Payout
            </span>
            <span className="text-muted whitespace-nowrap text-micro">
              {data?.settlements.filter((s) => s.status === "PENDING").length ||
                0}{" "}
              queued
            </span>
          </div>
        </div>

        {/* Card 5: Total Transactions */}
        <div
          className="bg-card border border-subtle rounded-lg shadow-card flex flex-col justify-between relative overflow-hidden min-w-0"
          style={{ padding: "0.78rem 0.8rem" }}
        >
          <div
            className="absolute top-0 left-0 right-0"
            style={{ height: "3px", background: "var(--brand-violet-text)" }}
          />
          <div>
            <div className="flex justify-between items-center gap-1 mb-compact">
              <span
                className="font-bold text-muted uppercase whitespace-nowrap overflow-hidden text-ellipsis text-caption"
                style={{ letterSpacing: "0.03em" }}
              >
                Transactions
              </span>
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: "24px",
                  height: "24px",
                  background: "rgba(var(--brand-violet-rgb), 0.1)",
                }}
              >
                <CreditCard size={15} color="var(--brand-violet-text)" />
              </div>
            </div>
            <div
              className="font-extrabold text-primary whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                fontSize: "clamp(1.02rem, 1.15vw, 1.28rem)",
                letterSpacing: "-0.02em",
              }}
            >
              {loading
                ? "..."
                : (metrics.totalTransactions || 0).toLocaleString("en-IN")}
            </div>
            <p
              className="text-muted overflow-hidden text-micro"
              style={{
                margin: "0.2rem 0 0 0",
                lineHeight: 1.25,
                height: "2.5em",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              Fulfilled ride orders and customer payments
            </p>
          </div>
          <div
            className="flex justify-between items-end border-t border-subtle gap-1"
            style={{ marginTop: "0.65rem", paddingTop: "0.45rem" }}
          >
            <span
              className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-micro"
              style={{ color: "var(--brand-violet-text)" }}
            >
              Dual-Ledger
            </span>
            <span className="text-muted whitespace-nowrap text-micro">
              {data?.driverSummary?.drivers.length || 0} drivers
            </span>
          </div>
        </div>

        {/* Card 6: Refunds */}
        <div
          className="bg-card border border-subtle rounded-lg shadow-card flex flex-col justify-between relative overflow-hidden min-w-0"
          style={{ padding: "0.78rem 0.8rem" }}
        >
          <div
            className="absolute top-0 left-0 right-0"
            style={{ height: "3px", background: "#0284C7" }}
          />
          <div>
            <div className="flex justify-between items-center gap-1 mb-compact">
              <span
                className="font-bold text-muted uppercase whitespace-nowrap overflow-hidden text-ellipsis text-caption"
                style={{ letterSpacing: "0.03em" }}
              >
                Refunds
              </span>
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width: "24px",
                  height: "24px",
                  background: "rgba(2, 132, 199, 0.1)",
                }}
              >
                <ShieldCheck size={15} color="#0284C7" />
              </div>
            </div>
            <div
              className="font-extrabold whitespace-nowrap overflow-hidden text-ellipsis"
              style={{
                fontSize: "clamp(1.02rem, 1.15vw, 1.28rem)",
                color: "#0284C7",
                letterSpacing: "-0.02em",
              }}
            >
              {loading ? "..." : formatINR(metrics.totalRefunds || 0)}
            </div>
            <p
              className="text-muted overflow-hidden text-micro"
              style={{
                margin: "0.2rem 0 0 0",
                lineHeight: 1.25,
                height: "2.5em",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              Refunded customer payments
            </p>
          </div>
          <div
            className="flex justify-between items-end border-t border-subtle gap-1"
            style={{ marginTop: "0.65rem", paddingTop: "0.45rem" }}
          >
            <span
              className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-micro"
              style={{ color: "#0284C7" }}
            >
              Refunds recorded
            </span>
            <span className="text-success font-semibold whitespace-nowrap text-micro">
              Adjustments
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * Sub-Navigation Navigation Bar (Tabs for All Key Finance Areas)
       * ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b pb-1 overflow-x-auto">
        {[
          {
            id: "OVERVIEW",
            label: "Revenue Analytics & Overview",
            icon: PieChart,
          },
          {
            id: "TRANSACTIONS",
            label: `Transactions Ledger (${filteredTransactions.length})`,
            icon: CreditCard,
          },
          {
            id: "DRIVERS",
            label: `Driver Earnings & Payouts (${filteredDrivers.length})`,
            icon: Users,
          },
          {
            id: "SETTLEMENTS",
            label: `Settlement Reports (${filteredSettlements.length})`,
            icon: Wallet,
          },
          {
            id: "REFUNDS",
            label: `Refunds & Deductions (${data?.refunds?.length || 0})`,
            icon: AlertTriangle,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SubTab)}
              className="flex items-center gap-2 rounded-md border-0 cursor-pointer whitespace-nowrap text-body-lg"
              style={{
                padding: "0.65rem 1rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                backgroundColor: isActive
                  ? "var(--brand-primary)"
                  : "transparent",
                transition: "all 0.15s ease",
                boxShadow: isActive ? "var(--shadow-glow-purple)" : "none",
              }}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * TAB 1: REVENUE ANALYTICS & OVERVIEW
       * ───────────────────────────────────────────────────────────── */}
      {activeTab === "OVERVIEW" && (
        <div className="flex flex-col gap-6">
          {/* Timeframe Controls Bar */}
          <div className="flex justify-between items-center flex-wrap gap-3 bg-card border border-subtle rounded-md py-3 px-4 shadow-sm">
            <div className="finance-timeframe-controls flex items-center gap-2">
              <span className="font-bold text-primary text-body-md">
                Aggregation Period:
              </span>
              <div
                className="flex gap-1 bg-base rounded-md border border-subtle"
                style={{ padding: "0.2rem" }}
              >
                {(
                  [
                    { id: "DAILY", label: "Daily" },
                    { id: "WEEKLY", label: "Weekly" },
                    { id: "MONTHLY", label: "Monthly" },
                    { id: "QUARTERLY", label: "Quarterly" },
                    { id: "YEARLY", label: "Yearly" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setChartTimeframe(t.id)}
                    className="rounded-sm border-0 cursor-pointer text-compact"
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontWeight: chartTimeframe === t.id ? 700 : 500,
                      background:
                        chartTimeframe === t.id
                          ? "var(--brand-primary)"
                          : "transparent",
                      color:
                        chartTimeframe === t.id
                          ? "#ffffff"
                          : "var(--text-secondary)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-muted text-compact">
              Showing {currentChartPoints.length} data intervals (
              {chartTimeframe.toLowerCase()})
            </div>
          </div>

          {/* Interactive Multi-Line Area Chart */}
          <FinanceAreaChart
            points={currentChartPoints}
            title={`${chartTimeframe} Revenue Growth & Driver Payouts`}
            selectedMetric={chartMetric}
            onMetricChange={setChartMetric}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
       * TAB 2: TRANSACTIONS DETAILS TABLE
       * ───────────────────────────────────────────────────────────── */}
      {activeTab === "TRANSACTIONS" && (
        <Card>
          <div
            className="flex justify-between items-center mb-5 flex-wrap gap-4"
            style={{ paddingTop: "0.15rem" }}
          >
            <div>
              <h3
                className="font-bold text-primary m-0"
                style={{ fontSize: "1.06rem" }}
              >
                Unified Transactions Ledger
              </h3>
              <p className="text-muted text-compact mt-compact">
                Completed bookings, order amounts, and rate-card driver payouts
              </p>
            </div>

            {/* Filter toolbar */}
            <div className="flex gap-3 items-center flex-wrap">
              {/* Search box */}
              <div className="relative" style={{ minWidth: "240px" }}>
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search by ID, driver, client..."
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value)}
                  className="rounded-md border border-subtle bg-base text-primary text-base w-full box-border"
                  style={{ padding: "0.5rem 0.75rem 0.5rem 2.2rem" }}
                />
              </div>

              {/* Status filter */}
              <select
                value={transactionStatus}
                onChange={(e) => setTransactionStatus(e.target.value)}
                className="rounded-md border border-subtle bg-base text-primary text-base font-semibold cursor-pointer"
                style={{ padding: "0.5rem 0.85rem" }}
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">PAID / CAPTURED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="REFUNDED">REFUNDED</option>
                <option value="PENDING">PENDING</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTransactions}
                leftIcon={<Download size={14} />}
              >
                Export CSV
              </Button>
            </div>
          </div>

          <DataTable
            data={filteredTransactions}
            keyExtractor={(t) => t.id}
            emptyTitle="No financial records found"
            emptySubtitle="No transactions match the selected filters or date range. All new trips and orders automatically populate here."
            columns={[
              {
                header: "TRANSACTION ID",
                accessor: (t: FinanceTransactionItem) => (
                  <div className="flex items-center gap-compact">
                    <span className="text-mono font-bold text-primary text-body-md">
                      {t.transactionId}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(t.transactionId);
                      }}
                      className="border-0 bg-transparent cursor-pointer text-muted"
                      style={{ padding: "2px" }}
                      title="Copy Transaction ID"
                    >
                      {copiedId === t.transactionId ? (
                        <Check size={13} color="var(--color-success)" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                ),
              },
              {
                header: "ORDER / TRIP ID",
                accessor: (t: FinanceTransactionItem) => (
                  <div>
                    <span className="text-mono text-brand font-semibold text-compact">
                      {t.orderId}
                    </span>
                    {t.vehicleType && (
                      <div className="text-muted text-caption">
                        {t.vehicleType}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: "DRIVER NAME",
                accessor: (t: FinanceTransactionItem) => (
                  <div>
                    <div className="font-semibold text-primary text-body-md">
                      {t.driverName}
                    </div>
                    {t.driverPhone && t.driverPhone !== "—" && (
                      <div className="text-muted text-label">
                        {t.driverPhone}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: "CUSTOMER / CLIENT",
                accessor: (t: FinanceTransactionItem) => (
                  <div>
                    <div className="font-semibold text-primary text-body-md">
                      {t.customerName}
                    </div>
                    {t.pickupCity && t.dropCity && t.pickupCity !== "—" && (
                      <div className="text-muted text-caption">
                        {t.pickupCity} → {t.dropCity}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: "TOTAL ORDER AMOUNT",
                accessor: (t: FinanceTransactionItem) => (
                  <span className="font-extrabold text-primary text-body-lg">
                    {formatINR(t.totalOrderAmount)}
                  </span>
                ),
              },
              {
                header: "DRIVER PAYOUT",
                accessor: (t: FinanceTransactionItem) => (
                  <span className="font-bold text-success text-body-lg">
                    {formatINR(t.driverEarnings)}
                  </span>
                ),
              },
              {
                header: "PAYMENT STATUS",
                accessor: (t: FinanceTransactionItem) => (
                  <StatusBadge status={t.paymentStatus || "COMPLETED"} />
                ),
              },
              {
                header: "TRANSACTION DATE",
                accessor: (t: FinanceTransactionItem) => (
                  <div className="text-sm text-secondary">
                    {new Date(t.transactionDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    <div className="text-muted text-caption">
                      {new Date(t.transactionDate).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ),
              },
            ]}
            onRowClick={(row) => setSelectedTransaction(row)}
          />
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
       * TAB 3: DRIVER EARNINGS & PAYMENTS ROSTER
       * ───────────────────────────────────────────────────────────── */}
      {activeTab === "DRIVERS" && (
        <div className="flex flex-col gap-6">
          {/* Driver Fleet Metric Overview Banner */}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <div className="bg-card py-4 px-5 rounded-lg border border-subtle shadow-card">
              <div className="text-sm font-semibold text-muted uppercase">
                Total Driver Gross Earnings
              </div>
              <div
                className="font-extrabold text-primary"
                style={{ fontSize: "1.45rem", marginTop: "0.3rem" }}
              >
                {formatINR(data?.driverSummary?.totalDriverEarnings)}
              </div>
              <div className="text-muted text-label mt-compact">
                Total accumulated on completed trips
              </div>
            </div>

            <div className="bg-card py-4 px-5 rounded-lg border border-subtle shadow-card">
              <div className="text-sm font-semibold text-muted uppercase">
                Total Amount Paid (Disbursed)
              </div>
              <div
                className="font-extrabold text-success"
                style={{ fontSize: "1.45rem", marginTop: "0.3rem" }}
              >
                {formatINR(data?.driverSummary?.amountPaidToDrivers)}
              </div>
              <div className="text-success text-label mt-compact">
                Bank wire settlements successfully completed
              </div>
            </div>

            <div className="bg-card py-4 px-5 rounded-lg border border-subtle shadow-card">
              <div className="text-sm font-semibold text-muted uppercase">
                Total Pending Payments
              </div>
              <div
                className="font-extrabold text-warning"
                style={{ fontSize: "1.45rem", marginTop: "0.3rem" }}
              >
                {formatINR(data?.driverSummary?.pendingDriverPayments)}
              </div>
              <div className="text-warning text-label mt-compact">
                Available wallet balance awaiting payout
              </div>
            </div>
          </div>

          {/* Driver Fleet Table */}
          <Card>
            <div
              className="flex justify-between items-center mb-5 flex-wrap gap-3"
              style={{ paddingTop: "0.15rem" }}
            >
              <div>
                <h3
                  className="font-bold text-primary m-0"
                  style={{ fontSize: "1.06rem" }}
                >
                  Driver Fleet Financial Accounts & Settlements
                </h3>
                <p className="text-muted text-compact mt-compact">
                  Individual driver earnings, bank payout progress, and
                  dedicated wallet ledger breakdown
                </p>
              </div>

              <div className="flex gap-3 items-center flex-wrap">
                <div className="relative" style={{ minWidth: "220px" }}>
                  <Search
                    size={15}
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search by driver name, phone, plate..."
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    className="rounded-md border border-subtle bg-base text-primary text-base w-full box-border"
                    style={{ padding: "0.5rem 0.75rem 0.5rem 2.2rem" }}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDrivers}
                  leftIcon={<Download size={14} />}
                >
                  Export Drivers CSV
                </Button>
              </div>
            </div>

            <DataTable
              data={filteredDrivers}
              keyExtractor={(d) => d.driverId}
              emptyTitle="No driver financial records found"
              emptySubtitle="Driver accounts and payout ledgers will populate automatically as driver profiles complete trips."
              columns={[
                {
                  header: "DRIVER DETAILS",
                  accessor: (d: FinanceDriverItem) => (
                    <div
                      className="flex items-center"
                      style={{ gap: "0.65rem" }}
                    >
                      <div
                        className="rounded-full flex items-center justify-center font-bold flex-shrink-0 text-body-sm"
                        style={{
                          width: "36px",
                          height: "36px",
                          background: "var(--brand-primary-gradient)",
                          color: "#ffffff",
                        }}
                      >
                        {d.driverName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-primary text-body-lg">
                          {d.driverName}
                        </div>
                        <div className="text-muted text-control">
                          {d.driverPhone}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  header: "VEHICLE ASSIGNED",
                  accessor: (d: FinanceDriverItem) => (
                    <div>
                      <div className="font-semibold text-primary text-body-md">
                        {d.vehicleType}
                      </div>
                      <div className="text-muted text-mono text-label">
                        {d.vehiclePlate}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "COMPLETED TRIPS",
                  accessor: (d: FinanceDriverItem) => (
                    <span className="font-bold text-primary text-body-lg">
                      {d.tripsCompleted}
                    </span>
                  ),
                },
                {
                  header: "TOTAL EARNINGS",
                  accessor: (d: FinanceDriverItem) => (
                    <span className="font-extrabold text-primary text-body">
                      {formatINR(d.totalEarnings)}
                    </span>
                  ),
                },
                {
                  header: "AMOUNT PAID",
                  accessor: (d: FinanceDriverItem) => (
                    <span className="font-bold text-success text-body-lg">
                      {formatINR(d.amountPaid)}
                    </span>
                  ),
                },
                {
                  header: "PENDING BALANCE",
                  accessor: (d: FinanceDriverItem) => (
                    <span
                      className="font-bold text-body-lg"
                      style={{
                        color:
                          d.pendingBalance > 0
                            ? "var(--color-warning)"
                            : "var(--text-muted)",
                      }}
                    >
                      {formatINR(d.pendingBalance)}
                    </span>
                  ),
                },
                {
                  header: "BANK ACCOUNT",
                  accessor: (d: FinanceDriverItem) => (
                    <div>
                      <div className="text-secondary text-mono text-compact">
                        {d.bankAccountNumber || "—"}
                      </div>
                      <div className="text-muted text-caption">
                        {d.bankIfsc || ""}
                      </div>
                    </div>
                  ),
                },
                {
                  header: "ACTIONS",
                  accessor: (d: FinanceDriverItem) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDriver(d.driverId)}
                      rightIcon={<ChevronRight size={13} />}
                    >
                      View Ledger
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
       * TAB 4: SETTLEMENT REPORTS & PAYOUTS
       * ───────────────────────────────────────────────────────────── */}
      {activeTab === "SETTLEMENTS" && (
        <Card>
          <div
            className="flex justify-between items-center mb-5 flex-wrap gap-3"
            style={{ paddingTop: "0.15rem" }}
          >
            <div>
              <h3
                className="font-bold text-primary m-0"
                style={{ fontSize: "1.06rem" }}
              >
                Driver Bank Settlements & Disbursement Reports
              </h3>
              <p className="text-muted text-compact mt-compact">
                Bank wire settlements, withdrawal payout batches, and banking
                UTR reference logs
              </p>
            </div>

            <div className="flex gap-3 items-center">
              <select
                value={settlementStatus}
                onChange={(e) => setSettlementStatus(e.target.value)}
                className="rounded-md border border-subtle bg-base text-primary text-base font-semibold cursor-pointer"
                style={{ padding: "0.5rem 0.85rem" }}
              >
                <option value="ALL">All Settlement Statuses</option>
                <option value="SETTLED">SETTLED (Bank Disbursed)</option>
                <option value="PENDING">PENDING (Action Required)</option>
                <option value="FAILED">FAILED / CANCELLED</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSettlements}
                leftIcon={<Download size={14} />}
              >
                Export Settlements CSV
              </Button>
            </div>
          </div>

          <DataTable
            data={filteredSettlements}
            keyExtractor={(s) => s.id}
            emptyTitle="No settlement records found"
            emptySubtitle="Driver withdrawal payout requests will appear here for processing and banking verification."
            columns={[
              {
                header: "SETTLEMENT ID",
                accessor: (s: FinanceSettlementReportItem) => (
                  <span className="text-mono font-bold text-primary text-body-md">
                    {s.settlementId}
                  </span>
                ),
              },
              {
                header: "DRIVER BENEFICIARY",
                accessor: (s: FinanceSettlementReportItem) => (
                  <div>
                    <div className="font-bold text-primary text-body-lg">
                      {s.driverName}
                    </div>
                    <div className="text-muted text-label">
                      Acc: {s.bankAccountName || s.driverName}
                    </div>
                  </div>
                ),
              },
              {
                header: "PAYOUT AMOUNT",
                accessor: (s: FinanceSettlementReportItem) => (
                  <span className="font-extrabold text-success text-body-xl">
                    {formatINR(s.amount)}
                  </span>
                ),
              },
              {
                header: "BANK DETAILS",
                accessor: (s: FinanceSettlementReportItem) => (
                  <div>
                    <div className="font-semibold text-primary text-body-sm">
                      {s.bankName || "Bank Account"}
                    </div>
                    <div className="text-muted text-mono text-label">
                      {s.bankAccountNumber} • {s.bankIfsc}
                    </div>
                  </div>
                ),
              },
              {
                header: "STATUS",
                accessor: (s: FinanceSettlementReportItem) => (
                  <StatusBadge status={s.status} />
                ),
              },
              {
                header: "BANK UTR / REF",
                accessor: (s: FinanceSettlementReportItem) => (
                  <span className="text-mono text-secondary text-compact">
                    {s.transactionRef || "—"}
                  </span>
                ),
              },
              {
                header: "REQUESTED DATE",
                accessor: (s: FinanceSettlementReportItem) => (
                  <div className="text-sm text-secondary">
                    {new Date(s.requestedDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
       * TAB 5: REFUNDS AND DEDUCTIONS
       * ───────────────────────────────────────────────────────────── */}
      {activeTab === "REFUNDS" && (
        <Card>
          <div className="mb-5" style={{ paddingTop: "0.15rem" }}>
            <h3
              className="font-bold text-primary m-0"
              style={{ fontSize: "1.06rem" }}
            >
              Refunds, Deductions & SLA Penalties
            </h3>
            <p className="text-muted text-compact mt-compact">
              Summary of refunded customer payments, disputed cancellations, and
              driver penalty deductions
            </p>
          </div>

          <DataTable
            data={data?.refunds || []}
            keyExtractor={(r) => r.id}
            emptyTitle="No refunds or deductions recorded"
            emptySubtitle="All platform cancellations and disputed refund transactions will be tracked here."
            columns={[
              {
                header: "REFERENCE ID",
                accessor: (r: FinanceRefundItem) => (
                  <span className="text-mono font-bold text-primary text-body-md">
                    {r.transactionRef}
                  </span>
                ),
              },
              {
                header: "ORDER ID",
                accessor: (r: FinanceRefundItem) => (
                  <span className="text-mono text-brand font-semibold text-body-sm">
                    {r.orderId}
                  </span>
                ),
              },
              {
                header: "CLIENT / VENDOR",
                accessor: (r: FinanceRefundItem) => (
                  <span className="font-semibold text-primary text-body-md">
                    {r.customerName}
                  </span>
                ),
              },
              {
                header: "REFUNDED AMOUNT",
                accessor: (r: FinanceRefundItem) => (
                  <span className="font-extrabold text-danger text-body">
                    {formatINR(r.amount)}
                  </span>
                ),
              },
              {
                header: "REASON / REVERSAL NOTE",
                accessor: (r: FinanceRefundItem) => (
                  <span className="text-secondary text-compact">
                    {r.reason}
                  </span>
                ),
              },
              {
                header: "STATUS",
                accessor: (r: FinanceRefundItem) => (
                  <StatusBadge status={r.status} />
                ),
              },
              {
                header: "REFUND DATE",
                accessor: (r: FinanceRefundItem) => (
                  <span className="text-sm text-muted">
                    {new Date(r.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ),
              },
            ]}
          />
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
       * INDIVIDUAL DRIVER FINANCIAL DRAWER
       * ───────────────────────────────────────────────────────────── */}
      <Drawer
        isOpen={selectedDriverId !== null}
        onClose={() => {
          setSelectedDriverId(null);
          setDriverDetail(null);
        }}
        title={
          driverDetail
            ? `${driverDetail.driver.fullName} — Financial Ledger`
            : "Driver Financial Ledger"
        }
        subtitle={
          driverDetail
            ? `Phone: ${driverDetail.driver.phone} • Plate: ${driverDetail.driver.vehiclePlate}`
            : "Loading driver ledger..."
        }
        width="650px"
      >
        {driverDetailLoading ? (
          <div
            className="flex items-center justify-center"
            style={{ minHeight: "300px" }}
          >
            <p className="text-muted text-body">
              Loading driver transactions...
            </p>
          </div>
        ) : !driverDetail ? (
          <div className="text-center py-12 px-4 text-muted">
            Unable to load driver financial details.
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Wallet Overview Box */}
            <div className="bg-brand-subtle border rounded-md p-5 flex justify-between items-center">
              <div>
                <div className="font-semibold text-brand uppercase text-control">
                  Current Wallet Balance
                </div>
                <div
                  className="font-extrabold text-brand mt-compact"
                  style={{ fontSize: "1.65rem" }}
                >
                  {formatINR(driverDetail.driver.walletBalance)}
                </div>
                <div className="text-secondary text-label mt-snug">
                  Available for immediate bank withdrawal
                </div>
              </div>
              <div className="text-right">
                <div className="text-muted text-control">Vehicle Model</div>
                <div className="font-bold text-primary text-body">
                  {driverDetail.driver.vehicleType}
                </div>
                <div className="text-muted text-mono text-label">
                  {driverDetail.driver.vehiclePlate}
                </div>
              </div>
            </div>

            {/* Completed Trips Breakdown */}
            <div>
              <h4
                className="font-bold text-primary mt-snug"
                style={{ fontSize: "1.04rem", marginBottom: "0.65rem" }}
              >
                Completed Trips & Earnings ({driverDetail.trips.length})
              </h4>
              {driverDetail.trips.length === 0 ? (
                <div className="text-muted p-4 bg-base rounded-sm text-body-sm">
                  No completed trips logged for this driver yet.
                </div>
              ) : (
                <div
                  className="flex flex-col gap-2 overflow-y-auto"
                  style={{ maxHeight: "220px" }}
                >
                  {driverDetail.trips.map((tr) => (
                    <div
                      key={tr.id}
                      className="bg-card border border-subtle rounded-sm flex justify-between items-center"
                      style={{ padding: "0.65rem 0.85rem" }}
                    >
                      <div>
                        <div className="text-mono text-sm font-bold text-brand">
                          {tr.orderId}
                        </div>
                        <div className="text-secondary text-label mt-snug">
                          {tr.pickupAddress?.split(",")[0]} →{" "}
                          {tr.dropAddress?.split(",")[0]}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-success text-body-lg">
                          +{formatINR(tr.totalEarnings)}
                        </div>
                        <div className="text-muted text-micro">
                          Fare: {formatINR(tr.fare)}{" "}
                          {tr.toll > 0 ? `+ Toll ${formatINR(tr.toll)}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settlement Payout History */}
            <div>
              <h4
                className="font-bold text-primary mt-snug"
                style={{ fontSize: "1.04rem", marginBottom: "0.65rem" }}
              >
                Bank Payout History ({driverDetail.settlements.length})
              </h4>
              {driverDetail.settlements.length === 0 ? (
                <div className="text-muted p-4 bg-base rounded-sm text-body-sm">
                  No withdrawal settlements requested yet.
                </div>
              ) : (
                <div
                  className="flex flex-col gap-2 overflow-y-auto"
                  style={{ maxHeight: "180px" }}
                >
                  {driverDetail.settlements.map((st) => (
                    <div
                      key={st.id}
                      className="bg-card border border-subtle rounded-sm flex justify-between items-center"
                      style={{ padding: "0.65rem 0.85rem" }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary text-body-md">
                            {formatINR(st.amount)}
                          </span>
                          <StatusBadge status={st.status} size="sm" />
                        </div>
                        <div className="text-muted text-caption mt-snug">
                          UTR: {st.transactionRef || "Pending bank release"}
                        </div>
                      </div>
                      <div className="text-muted text-caption">
                        {new Date(st.requestedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ─────────────────────────────────────────────────────────────
       * TRANSACTION DETAILS MODAL
       * ───────────────────────────────────────────────────────────── */}
      {selectedTransaction && (
        <div
          className="top-0 left-0 right-0 bottom-0 flex items-center justify-center p-4 fixed"
          style={{ background: "rgba(0, 0, 0, 0.45)", zIndex: 100 }}
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="bg-card border rounded-lg w-full p-6 shadow-elevated flex flex-col gap-4"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-subtle pb-3">
              <div>
                <h3 className="font-bold text-primary m-0 text-title-md">
                  Transaction Receipt Details
                </h3>
                <span className="text-sm text-mono text-muted">
                  {selectedTransaction.transactionId}
                </span>
              </div>
              <StatusBadge status={selectedTransaction.paymentStatus} />
            </div>

            <div
              className="grid gap-relaxed text-body-md"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <div>
                <span className="text-muted text-sm">Order Reference:</span>
                <div className="font-bold text-brand text-mono">
                  {selectedTransaction.orderId}
                </div>
              </div>
              <div>
                <span className="text-muted text-sm">Payment Method:</span>
                <div className="font-semibold text-primary">
                  {selectedTransaction.paymentMethod}
                </div>
              </div>
              <div>
                <span className="text-muted text-sm">Customer / Client:</span>
                <div className="font-semibold text-primary">
                  {selectedTransaction.customerName}
                </div>
              </div>
              <div>
                <span className="text-muted text-sm">Driver Beneficiary:</span>
                <div className="font-semibold text-primary">
                  {selectedTransaction.driverName}
                </div>
              </div>
            </div>

            <div className="bg-base rounded-md p-4 border border-subtle flex flex-col gap-2">
              <div className="flex justify-between text-body-lg">
                <span className="text-secondary">
                  Gross Booking Fare (GMV):
                </span>
                <span className="font-bold text-primary">
                  {formatINR(selectedTransaction.totalOrderAmount)}
                </span>
              </div>
              <div className="flex justify-between text-body-lg">
                <span className="font-bold text-success">Driver Payout:</span>
                <span className="font-extrabold text-success">
                  {formatINR(selectedTransaction.driverEarnings)}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedTransaction(null)}
              >
                Close Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
