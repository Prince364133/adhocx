'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { adminApi } from '../../lib/api/client';
import {
  FinanceDashboardData,
  FinanceTransactionItem,
  FinanceDriverItem,
  FinanceSettlementReportItem,
  FinanceRefundItem,
  DriverFinancialHistoryDetail,
} from '../../lib/api/types';
import {
  PageHeader,
  Card,
  Button,
  DataTable,
  StatusBadge,
  Drawer,
} from '../../components/common';
import {
  FinanceAreaChart,
  FinanceSparkline,
  formatINR,
} from '../../components/finance/FinanceCharts';

type SubTab = 'OVERVIEW' | 'TRANSACTIONS' | 'DRIVERS' | 'SETTLEMENTS' | 'REFUNDS';
type TimeframeTab = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export default function FinanceDashboardPage() {
  // Date range filter state
  const [dateRange, setDateRange] = useState('30D');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  // Active navigation sub-tab
  const [activeTab, setActiveTab] = useState<SubTab>('OVERVIEW');

  // Chart timeframe state
  const [chartTimeframe, setChartTimeframe] = useState<TimeframeTab>('DAILY');
  const [chartMetric, setChartMetric] = useState<'ALL' | 'DRIVER' | 'REVENUE'>('ALL');

  // Data state
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Filter & Search states
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('ALL');
  const [driverSearch, setDriverSearch] = useState('');
  const [settlementStatus, setSettlementStatus] = useState('ALL');

  // Driver details drawer
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [driverDetail, setDriverDetail] = useState<DriverFinancialHistoryDetail | null>(null);
  const [driverDetailLoading, setDriverDetailLoading] = useState(false);

  // Single transaction preview modal
  const [selectedTransaction, setSelectedTransaction] = useState<FinanceTransactionItem | null>(null);

  // Export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = useCallback(async (isManual = false) => {
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
        message: 'No financial data available',
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
  }, [dateRange, showCustomRange, customStart, customEnd]);

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
    if (val === 'CUSTOM') {
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
    if (chartTimeframe === 'DAILY') return data.revenueAnalytics.daily || [];
    if (chartTimeframe === 'WEEKLY') return data.revenueAnalytics.weekly || [];
    if (chartTimeframe === 'MONTHLY') return data.revenueAnalytics.monthly || [];
    if (chartTimeframe === 'QUARTERLY') return data.revenueAnalytics.quarterly || [];
    return data.revenueAnalytics.yearly || [];
  }, [data, chartTimeframe]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    let items = data.transactions;
    if (transactionStatus !== 'ALL') {
      items = items.filter((t) => (t.paymentStatus || '').toUpperCase() === transactionStatus.toUpperCase());
    }
    if (transactionSearch.trim()) {
      const q = transactionSearch.toLowerCase().trim();
      items = items.filter(
        (t) =>
          (t.transactionId || '').toLowerCase().includes(q) ||
          (t.orderId || '').toLowerCase().includes(q) ||
          (t.driverName || '').toLowerCase().includes(q) ||
          (t.customerName || '').toLowerCase().includes(q) ||
          (t.vehicleType || '').toLowerCase().includes(q)
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
          (d.driverName || '').toLowerCase().includes(q) ||
          (d.driverPhone || '').toLowerCase().includes(q) ||
          (d.vehiclePlate || '').toLowerCase().includes(q) ||
          (d.vehicleType || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, driverSearch]);

  // Filtered settlements
  const filteredSettlements = useMemo(() => {
    if (!data?.settlements) return [];
    let items = data.settlements;
    if (settlementStatus !== 'ALL') {
      items = items.filter((s) => s.status.toUpperCase() === settlementStatus.toUpperCase());
    }
    return items;
  }, [data, settlementStatus]);

  // Sparkline data generators
  const revenueTrend = useMemo(() => {
    if (!data?.revenueAnalytics?.daily || data.revenueAnalytics.daily.length === 0) return [0, 0, 0, 0];
    return data.revenueAnalytics.daily.map((d) => d.revenue);
  }, [data]);

  const driverTrend = useMemo(() => {
    if (!data?.revenueAnalytics?.daily || data.revenueAnalytics.daily.length === 0) return [0, 0, 0, 0];
    return data.revenueAnalytics.daily.map((d) => d.driverEarnings);
  }, [data]);

  // CSV Export functions with proper BOM for Excel compatibility
  const downloadCsv = (filename: string, csvContent: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportTransactions = () => {
    const headers = [
      'Transaction ID',
      'Order ID',
      'Driver Name',
      'Driver Phone',
      'Customer / Corporate',
      'Order Amount (INR)',
      'Driver Payout (INR)',
      'Payment Status',
      'Payment Method',
      'Date & Time',
    ];
    const rows = filteredTransactions.map((t) => [
      `"${t.transactionId}"`,
      `"${t.orderId}"`,
      `"${t.driverName}"`,
      `"${t.driverPhone || ''}"`,
      `"${t.customerName}"`,
      t.totalOrderAmount,
      t.driverEarnings,
      `"${t.paymentStatus}"`,
      `"${t.paymentMethod}"`,
      `"${t.transactionDate}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(`adhocx_transactions_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleExportDrivers = () => {
    const headers = [
      'Driver ID',
      'Driver Name',
      'Phone',
      'Vehicle Type',
      'Vehicle Plate',
      'Trips Completed',
      'Total Earnings (INR)',
      'Amount Paid (INR)',
      'Pending Balance (INR)',
      'Bank Account',
      'IFSC',
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
      `"${d.bankAccountNumber || ''}"`,
      `"${d.bankIfsc || ''}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(`adhocx_driver_earnings_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleExportSettlements = () => {
    const headers = [
      'Settlement ID',
      'Driver Name',
      'Amount (INR)',
      'Status',
      'Bank Name',
      'Account Number',
      'IFSC',
      'Bank UTR / Ref',
      'Requested At',
      'Processed At',
    ];
    const rows = filteredSettlements.map((s) => [
      `"${s.settlementId}"`,
      `"${s.driverName}"`,
      s.amount,
      `"${s.status}"`,
      `"${s.bankName || ''}"`,
      `"${s.bankAccountNumber || ''}"`,
      `"${s.bankIfsc || ''}"`,
      `"${s.transactionRef || ''}"`,
      `"${s.requestedDate}"`,
      `"${s.processedDate || ''}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    downloadCsv(`adhocx_settlements_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleExportExecutiveSummary = () => {
    const lines = [
      'AdhocX Executive Financial Audit Summary',
      `Generated At: ${new Date().toLocaleString('en-IN')}`,
      `Filter Period: ${dateRange}`,
      '',
      'KEY METRIC,VALUE',
      `Total Revenue Generated (GMV),${metrics.totalRevenue}`,
      `Total Amount Paid to Drivers,${metrics.totalPaidToDrivers}`,
      `Pending Driver Payments,${metrics.pendingDriverPayments}`,
      `Total Transactions,${metrics.totalTransactions}`,
      `Refunds & Deductions,${metrics.totalRefunds || 0}`,
      '',
      'TIME PERIOD,REVENUE (INR),DRIVER PAYOUT (INR),TRANSACTIONS',
      ...currentChartPoints.map(
        (p) => `"${p.label}",${p.revenue},${p.driverEarnings},${p.transactions}`
      ),
    ];
    downloadCsv(`adhocx_financial_summary_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`, lines.join('\n'));
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
            ? 'Syncing Live Telemetry...'
            : `Ledger Synced (${lastSyncTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`
        }
        actions={
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Quick Presets Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                value={dateRange}
                onChange={(e) => handleRangeChange(e.target.value)}
                style={{
                  padding: '0.38rem 0.72rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                }}
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
              leftIcon={<RotateCcw size={15} className={isRefreshing ? 'animate-spin' : ''} />}
              title="Pull latest transaction and completed trip telemetry"
            >
              {isRefreshing ? 'Syncing...' : 'Sync Live'}
            </Button>

            {/* Download Financial Reports Menu */}
            <div style={{ position: 'relative' }}>
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
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.35rem',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-elevated)',
                    zIndex: 50,
                    minWidth: '240px',
                    padding: '0.4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                  }}
                  onMouseLeave={() => setShowExportMenu(false)}
                >
                  <button
                    type="button"
                    onClick={handleExportTransactions}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-base)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <FileSpreadsheet size={16} color="var(--brand-primary)" />
                    <span>Transactions Ledger (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportDrivers}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-base)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Users size={16} color="var(--color-success)" />
                    <span>Driver Earnings Report (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSettlements}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-base)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <CreditCard size={16} color="#8B5CF6" />
                    <span>Settlements & Payouts (CSV)</span>
                  </button>

                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.2rem 0' }} />

                  <button
                    type="button"
                    onClick={handleExportExecutiveSummary}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--brand-primary)',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-base)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <FileText size={16} color="var(--brand-primary)" />
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
        <form
          onSubmit={handleApplyCustomRange}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            boxShadow: 'var(--shadow-sm)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            <Calendar size={16} color="var(--brand-primary)" />
            <span>Select Custom Range:</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>From:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              required
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>To:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                padding: '0.4rem 0.6rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
              }}
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
              setDateRange('30D');
            }}
          >
            Cancel
          </Button>
        </form>
      )}

      {/* ─────────────────────────────────────────────────────────────
       * Top 6 Summary Cards (All 6 in One Single Line)
       * ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: '0.75rem',
          width: '100%',
        }}
      >
        {/* Card 1: Total Revenue Generated */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.78rem 0.8rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#2563EB' }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Total Revenue
              </span>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={15} color="#2563EB" />
              </div>
            </div>
            <div style={{ fontSize: 'clamp(1.02rem, 1.15vw, 1.28rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? '...' : formatINR(metrics.totalRevenue)}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.25, height: '2.5em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              Gross booking value (GMV) of completed orders
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {metrics.totalTransactions} Invoiced
            </span>
            <FinanceSparkline data={revenueTrend} color="#2563EB" width={68} height={24} />
          </div>
        </div>

        {/* Card 2: Driver Earnings */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.78rem 0.8rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--brand-primary)' }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Driver Earnings
              </span>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DollarSign size={15} color="var(--brand-primary)" />
              </div>
            </div>
            <div style={{ fontSize: 'clamp(1.02rem, 1.15vw, 1.28rem)', fontWeight: 800, color: 'var(--brand-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? '...' : formatINR(data?.driverSummary?.totalDriverEarnings)}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.25, height: '2.5em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              Payouts based on the agreed rate card
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--brand-primary)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Rate-card payout
            </span>
            <FinanceSparkline data={driverTrend} color="var(--brand-primary)" width={68} height={24} />
          </div>
        </div>

        {/* Card 3: Total Amount Paid to Drivers */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.78rem 0.8rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--color-success)' }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Paid to Drivers
              </span>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={15} color="var(--color-success)" />
              </div>
            </div>
            <div style={{ fontSize: 'clamp(1.02rem, 1.15vw, 1.28rem)', fontWeight: 800, color: 'var(--color-success)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? '...' : formatINR(metrics.totalPaidToDrivers)}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.25, height: '2.5em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              Disbursed to driver bank accounts (SETTLED)
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Wire Settled
            </span>
            <FinanceSparkline data={driverTrend} color="var(--color-success)" width={68} height={24} />
          </div>
        </div>

        {/* Card 4: Pending Driver Payments */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.78rem 0.8rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--color-warning)' }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Pending Payments
              </span>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--color-warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={15} color="var(--color-warning)" />
              </div>
            </div>
            <div style={{ fontSize: 'clamp(1.02rem, 1.15vw, 1.28rem)', fontWeight: 800, color: 'var(--color-warning)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? '...' : formatINR(metrics.pendingDriverPayments)}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.25, height: '2.5em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              Queued withdrawals & unsettled wallet balances
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-warning)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Ready for Payout
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {data?.settlements.filter((s) => s.status === 'PENDING').length || 0} queued
            </span>
          </div>
        </div>

        {/* Card 5: Total Transactions */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.78rem 0.8rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#8B5CF6' }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Transactions
              </span>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CreditCard size={15} color="#8B5CF6" />
              </div>
            </div>
            <div style={{ fontSize: 'clamp(1.02rem, 1.15vw, 1.28rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? '...' : (metrics.totalTransactions || 0).toLocaleString('en-IN')}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.25, height: '2.5em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              Fulfilled ride orders and customer payments
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.68rem', color: '#8B5CF6', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Dual-Ledger
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {data?.driverSummary?.drivers.length || 0} drivers
            </span>
          </div>
        </div>

        {/* Card 6: Refunds */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.78rem 0.8rem',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#0284C7' }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Refunds
              </span>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldCheck size={15} color="#0284C7" />
              </div>
            </div>
            <div style={{ fontSize: 'clamp(1.02rem, 1.15vw, 1.28rem)', fontWeight: 800, color: '#0284C7', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {loading ? '...' : formatINR(metrics.totalRefunds || 0)}
            </div>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0', lineHeight: 1.25, height: '2.5em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              Refunded customer payments
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.65rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.68rem', color: '#0284C7', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Refunds recorded
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--color-success)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Adjustments
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
       * Sub-Navigation Navigation Bar (Tabs for All Key Finance Areas)
       * ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '0.25rem',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'OVERVIEW', label: 'Revenue Analytics & Overview', icon: PieChart },
          { id: 'TRANSACTIONS', label: `Transactions Ledger (${filteredTransactions.length})`, icon: CreditCard },
          { id: 'DRIVERS', label: `Driver Earnings & Payouts (${filteredDrivers.length})`, icon: Users },
          { id: 'SETTLEMENTS', label: `Settlement Reports (${filteredSettlements.length})`, icon: Wallet },
          { id: 'REFUNDS', label: `Refunds & Deductions (${data?.refunds?.length || 0})`, icon: AlertTriangle },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SubTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.84rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? 'var(--shadow-glow-purple)' : 'none',
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
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Timeframe Controls Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Aggregation Period:
              </span>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-base)', padding: '0.2rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                {(
                  [
                    { id: 'DAILY', label: 'Daily' },
                    { id: 'WEEKLY', label: 'Weekly' },
                    { id: 'MONTHLY', label: 'Monthly' },
                    { id: 'QUARTERLY', label: 'Quarterly' },
                    { id: 'YEARLY', label: 'Yearly' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setChartTimeframe(t.id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      fontWeight: chartTimeframe === t.id ? 700 : 500,
                      border: 'none',
                      background: chartTimeframe === t.id ? 'var(--brand-primary)' : 'transparent',
                      color: chartTimeframe === t.id ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Showing {currentChartPoints.length} data intervals ({chartTimeframe.toLowerCase()})
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
      {activeTab === 'TRANSACTIONS' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingTop: '0.15rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.06rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Unified Transactions Ledger
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Completed bookings, order amounts, and rate-card driver payouts
              </p>
            </div>

            {/* Filter toolbar */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search box */}
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by ID, driver, client..."
                  value={transactionSearch}
                  onChange={(e) => setTransactionSearch(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-base)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8125rem',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Status filter */}
              <select
                value={transactionStatus}
                onChange={(e) => setTransactionStatus(e.target.value)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">PAID / CAPTURED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="REFUNDED">REFUNDED</option>
                <option value="PENDING">PENDING</option>
              </select>

              <Button variant="outline" size="sm" onClick={handleExportTransactions} leftIcon={<Download size={14} />}>
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
                header: 'TRANSACTION ID',
                accessor: (t: FinanceTransactionItem) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                      {t.transactionId}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(t.transactionId);
                      }}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                      title="Copy Transaction ID"
                    >
                      {copiedId === t.transactionId ? <Check size={13} color="var(--color-success)" /> : <Copy size={13} />}
                    </button>
                  </div>
                ),
              },
              {
                header: 'ORDER / TRIP ID',
                accessor: (t: FinanceTransactionItem) => (
                  <div>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                      {t.orderId}
                    </span>
                    {t.vehicleType && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.vehicleType}</div>
                    )}
                  </div>
                ),
              },
              {
                header: 'DRIVER NAME',
                accessor: (t: FinanceTransactionItem) => (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                      {t.driverName}
                    </div>
                    {t.driverPhone && t.driverPhone !== '—' && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.driverPhone}</div>
                    )}
                  </div>
                ),
              },
              {
                header: 'CUSTOMER / CLIENT',
                accessor: (t: FinanceTransactionItem) => (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                      {t.customerName}
                    </div>
                    {t.pickupCity && t.dropCity && t.pickupCity !== '—' && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {t.pickupCity} → {t.dropCity}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: 'TOTAL ORDER AMOUNT',
                accessor: (t: FinanceTransactionItem) => (
                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                    {formatINR(t.totalOrderAmount)}
                  </span>
                ),
              },
              {
                header: 'DRIVER PAYOUT',
                accessor: (t: FinanceTransactionItem) => (
                  <span style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.84rem' }}>
                    {formatINR(t.driverEarnings)}
                  </span>
                ),
              },
              {
                header: 'PAYMENT STATUS',
                accessor: (t: FinanceTransactionItem) => (
                  <StatusBadge status={t.paymentStatus || 'COMPLETED'} />
                ),
              },
              {
                header: 'TRANSACTION DATE',
                accessor: (t: FinanceTransactionItem) => (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(t.transactionDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(t.transactionDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
      {activeTab === 'DRIVERS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Driver Fleet Metric Overview Banner */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
            }}
          >
            <div style={{ background: 'var(--bg-card)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Driver Gross Earnings</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
                {formatINR(data?.driverSummary?.totalDriverEarnings)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Total accumulated on completed trips</div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Amount Paid (Disbursed)</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '0.3rem' }}>
                {formatINR(data?.driverSummary?.amountPaidToDrivers)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', marginTop: '0.2rem' }}>Bank wire settlements successfully completed</div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-card)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Pending Payments</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '0.3rem' }}>
                {formatINR(data?.driverSummary?.pendingDriverPayments)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-warning)', marginTop: '0.2rem' }}>Available wallet balance awaiting payout</div>
            </div>

          </div>

          {/* Driver Fleet Table */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingTop: '0.15rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.06rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Driver Fleet Financial Accounts & Settlements
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Individual driver earnings, bank payout progress, and dedicated wallet ledger breakdown
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search by driver name, phone, plate..."
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-base)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8125rem',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <Button variant="outline" size="sm" onClick={handleExportDrivers} leftIcon={<Download size={14} />}>
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
                  header: 'DRIVER DETAILS',
                  accessor: (d: FinanceDriverItem) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'var(--brand-primary-gradient)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          flexShrink: 0,
                        }}
                      >
                        {d.driverName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                          {d.driverName}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{d.driverPhone}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'VEHICLE ASSIGNED',
                  accessor: (d: FinanceDriverItem) => (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                        {d.vehicleType}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {d.vehiclePlate}
                      </div>
                    </div>
                  ),
                },
                {
                  header: 'COMPLETED TRIPS',
                  accessor: (d: FinanceDriverItem) => (
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                      {d.tripsCompleted}
                    </span>
                  ),
                },
                {
                  header: 'TOTAL EARNINGS',
                  accessor: (d: FinanceDriverItem) => (
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      {formatINR(d.totalEarnings)}
                    </span>
                  ),
                },
                {
                  header: 'AMOUNT PAID',
                  accessor: (d: FinanceDriverItem) => (
                    <span style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.84rem' }}>
                      {formatINR(d.amountPaid)}
                    </span>
                  ),
                },
                {
                  header: 'PENDING BALANCE',
                  accessor: (d: FinanceDriverItem) => (
                    <span
                      style={{
                        fontWeight: 700,
                        color: d.pendingBalance > 0 ? 'var(--color-warning)' : 'var(--text-muted)',
                        fontSize: '0.84rem',
                      }}
                    >
                      {formatINR(d.pendingBalance)}
                    </span>
                  ),
                },
                {
                  header: 'BANK ACCOUNT',
                  accessor: (d: FinanceDriverItem) => (
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {d.bankAccountNumber || '—'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.bankIfsc || ''}</div>
                    </div>
                  ),
                },
                {
                  header: 'ACTIONS',
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
      {activeTab === 'SETTLEMENTS' && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingTop: '0.15rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.06rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Driver Bank Settlements & Disbursement Reports
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Bank wire settlements, withdrawal payout batches, and banking UTR reference logs
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <select
                value={settlementStatus}
                onChange={(e) => setSettlementStatus(e.target.value)}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Settlement Statuses</option>
                <option value="SETTLED">SETTLED (Bank Disbursed)</option>
                <option value="PENDING">PENDING (Action Required)</option>
                <option value="FAILED">FAILED / CANCELLED</option>
              </select>

              <Button variant="outline" size="sm" onClick={handleExportSettlements} leftIcon={<Download size={14} />}>
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
                header: 'SETTLEMENT ID',
                accessor: (s: FinanceSettlementReportItem) => (
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                    {s.settlementId}
                  </span>
                ),
              },
              {
                header: 'DRIVER BENEFICIARY',
                accessor: (s: FinanceSettlementReportItem) => (
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                      {s.driverName}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Acc: {s.bankAccountName || s.driverName}
                    </div>
                  </div>
                ),
              },
              {
                header: 'PAYOUT AMOUNT',
                accessor: (s: FinanceSettlementReportItem) => (
                  <span style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '0.9rem' }}>
                    {formatINR(s.amount)}
                  </span>
                ),
              },
              {
                header: 'BANK DETAILS',
                accessor: (s: FinanceSettlementReportItem) => (
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                      {s.bankName || 'Bank Account'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {s.bankAccountNumber} • {s.bankIfsc}
                    </div>
                  </div>
                ),
              },
              {
                header: 'STATUS',
                accessor: (s: FinanceSettlementReportItem) => <StatusBadge status={s.status} />,
              },
              {
                header: 'BANK UTR / REF',
                accessor: (s: FinanceSettlementReportItem) => (
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {s.transactionRef || '—'}
                  </span>
                ),
              },
              {
                header: 'REQUESTED DATE',
                accessor: (s: FinanceSettlementReportItem) => (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(s.requestedDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
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
      {activeTab === 'REFUNDS' && (
        <Card>
          <div style={{ marginBottom: '1.25rem', paddingTop: '0.15rem' }}>
            <h3 style={{ fontSize: '1.06rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Refunds, Deductions & SLA Penalties
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Summary of refunded customer payments, disputed cancellations, and driver penalty deductions
            </p>
          </div>

          <DataTable
            data={data?.refunds || []}
            keyExtractor={(r) => r.id}
            emptyTitle="No refunds or deductions recorded"
            emptySubtitle="All platform cancellations and disputed refund transactions will be tracked here."
            columns={[
              {
                header: 'REFERENCE ID',
                accessor: (r: FinanceRefundItem) => (
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                    {r.transactionRef}
                  </span>
                ),
              },
              {
                header: 'ORDER ID',
                accessor: (r: FinanceRefundItem) => (
                  <span style={{ fontFamily: 'monospace', color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.8rem' }}>
                    {r.orderId}
                  </span>
                ),
              },
              {
                header: 'CLIENT / VENDOR',
                accessor: (r: FinanceRefundItem) => (
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                    {r.customerName}
                  </span>
                ),
              },
              {
                header: 'REFUNDED AMOUNT',
                accessor: (r: FinanceRefundItem) => (
                  <span style={{ fontWeight: 800, color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                    {formatINR(r.amount)}
                  </span>
                ),
              },
              {
                header: 'REASON / REVERSAL NOTE',
                accessor: (r: FinanceRefundItem) => (
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.reason}</span>
                ),
              },
              {
                header: 'STATUS',
                accessor: (r: FinanceRefundItem) => <StatusBadge status={r.status} />,
              },
              {
                header: 'REFUND DATE',
                accessor: (r: FinanceRefundItem) => (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(r.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
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
        title={driverDetail ? `${driverDetail.driver.fullName} — Financial Ledger` : 'Driver Financial Ledger'}
        subtitle={driverDetail ? `Phone: ${driverDetail.driver.phone} • Plate: ${driverDetail.driver.vehiclePlate}` : 'Loading driver ledger...'}
        width="650px"
      >
        {driverDetailLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading driver transactions...</p>
          </div>
        ) : !driverDetail ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            Unable to load driver financial details.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Wallet Overview Box */}
            <div
              style={{
                background: 'var(--brand-primary-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                  Current Wallet Balance
                </div>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.2rem' }}>
                  {formatINR(driverDetail.driver.walletBalance)}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Available for immediate bank withdrawal
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Vehicle Model</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {driverDetail.driver.vehicleType}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {driverDetail.driver.vehiclePlate}
                </div>
              </div>
            </div>

            {/* Completed Trips Breakdown */}
            <div>
              <h4 style={{ fontSize: '1.04rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem', marginBottom: '0.65rem' }}>
                Completed Trips & Earnings ({driverDetail.trips.length})
              </h4>
              {driverDetail.trips.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)' }}>
                  No completed trips logged for this driver yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '220px', overflowY: 'auto' }}>
                  {driverDetail.trips.map((tr) => (
                    <div
                      key={tr.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                          {tr.orderId}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          {tr.pickupAddress?.split(',')[0]} → {tr.dropAddress?.split(',')[0]}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: 'var(--color-success)', fontSize: '0.84rem' }}>
                          +{formatINR(tr.totalEarnings)}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          Fare: {formatINR(tr.fare)} {tr.toll > 0 ? `+ Toll ${formatINR(tr.toll)}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settlement Payout History */}
            <div>
              <h4 style={{ fontSize: '1.04rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem', marginBottom: '0.65rem' }}>
                Bank Payout History ({driverDetail.settlements.length})
              </h4>
              {driverDetail.settlements.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)' }}>
                  No withdrawal settlements requested yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {driverDetail.settlements.map((st) => (
                    <div
                      key={st.id}
                      style={{
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {formatINR(st.amount)}
                          </span>
                          <StatusBadge status={st.status} size="sm" />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          UTR: {st.transactionRef || 'Pending bank release'}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(st.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
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
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '520px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-elevated)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Transaction Receipt Details
                </h3>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  {selectedTransaction.transactionId}
                </span>
              </div>
              <StatusBadge status={selectedTransaction.paymentStatus} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Order Reference:</span>
                <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontFamily: 'monospace' }}>
                  {selectedTransaction.orderId}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Payment Method:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedTransaction.paymentMethod}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Customer / Client:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedTransaction.customerName}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Driver Beneficiary:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedTransaction.driverName}
                </div>
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Gross Booking Fare (GMV):</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {formatINR(selectedTransaction.totalOrderAmount)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>Driver Payout:</span>
                <span style={{ fontWeight: 800, color: 'var(--color-success)' }}>
                  {formatINR(selectedTransaction.driverEarnings)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
              <Button variant="primary" size="sm" onClick={() => setSelectedTransaction(null)}>
                Close Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

