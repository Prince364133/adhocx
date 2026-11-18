"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Building2,
  Car,
  ClipboardList,
  RefreshCw,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Button,
  MetricCard,
  PageHeader,
} from "../../components/common";
import { adminApi } from "../../lib/api/client";
import type {
  AdminMetrics,
  CorporateTenantListItem,
  DriverListItem,
  FinanceDashboardData,
  FinanceSettlementReportItem,
  RequirementListItem,
  TripFrequencyReport,
  UserListItem,
  VendorListItem,
} from "../../lib/api/types";

interface DashboardData {
  metrics: AdminMetrics | null;
  drivers: DriverListItem[];
  vendors: VendorListItem[];
  corporateClients: CorporateTenantListItem[];
  corporateClientCount: number | null;
  employees: UserListItem[];
  employeeCount: number | null;
  requirements: RequirementListItem[];
  finance: FinanceDashboardData | null;
  tripReport: TripFrequencyReport | null;
}

interface ChartDatum {
  label: string;
  value: number;
}

interface GrowthMonth {
  key: string;
  label: string;
}

interface GrowthSeries {
  name: string;
  color: string;
  values: number[];
  current: number;
  previous: number;
}

const EMPTY_DASHBOARD_DATA: DashboardData = {
  metrics: null,
  drivers: [],
  vendors: [],
  corporateClients: [],
  corporateClientCount: null,
  employees: [],
  employeeCount: null,
  requirements: [],
  finance: null,
  tripReport: null,
};

const ACTIVE_REQUIREMENT_STATUSES = new Set([
  "OPEN",
  "POSTED",
  "DISPATCHING",
  "PARTIALLY_FULFILLED",
  "ASSIGNED",
  "ACTIVE",
]);
const PENDING_PAYOUT_STATUSES = new Set([
  "PENDING",
  "PROCESSING",
  "INITIATED",
  "APPROVED",
]);
function getIndiaDateInputValue() {
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parts = Object.fromEntries(
    dateParts.map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getIndiaMonth() {
  const dateParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const parts = Object.fromEntries(
    dateParts.map(({ type, value }) => [type, value]),
  );
  return { year: Number(parts.year), month: Number(parts.month) };
}

function getIndiaDateKey(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.map(({ type, value: partValue }) => [type, partValue]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getMonthKey(value?: string | null) {
  const dateKey = getIndiaDateKey(value);
  return dateKey ? dateKey.slice(0, 7) : null;
}

function formatINR(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactINR(value: number) {
  return `₹${new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function isActiveRequirement(requirement: RequirementListItem) {
  return ACTIVE_REQUIREMENT_STATUSES.has(
    (requirement.status || "").toUpperCase(),
  );
}

function isPendingPayout(settlement: FinanceSettlementReportItem) {
  return PENDING_PAYOUT_STATUSES.has(settlement.status.toUpperCase());
}

function getRecentGrowthMonths(count = 6): GrowthMonth[] {
  const { year, month } = getIndiaMonth();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - index - 1), 1));
    const monthKey = `${date.getUTCFullYear()}-${String(
      date.getUTCMonth() + 1,
    ).padStart(2, "0")}`;
    return {
      key: monthKey,
      label: new Intl.DateTimeFormat("en-IN", {
        month: "short",
        timeZone: "UTC",
      }).format(date),
    };
  });
}

function getMonthlyRegistrations(
  records: Array<{ createdAt?: string | null }>,
  months: GrowthMonth[],
) {
  const counts = new Map(months.map(({ key }) => [key, 0]));
  records.forEach(({ createdAt }) => {
    const key = getMonthKey(createdAt);
    if (key && counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return months.map(({ key }) => counts.get(key) ?? 0);
}

function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card dashboard-chart-card">
      <div className="dashboard-chart-heading">
        <div className="min-w-0">
          <h2 className="dashboard-section-title">{title}</h2>
          <p className="dashboard-section-subtitle">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function BarChart({
  data,
  color = "var(--color-info)",
  currency = false,
}: {
  data: ChartDatum[];
  color?: string;
  currency?: boolean;
}) {
  const width = 720;
  const height = 232;
  const padding = { top: 16, right: 12, bottom: 34, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(0, ...data.map(({ value }) => value));
  const minValue = Math.min(0, ...data.map(({ value }) => value));
  const chartMaxValue = maxValue === 0 && minValue === 0 ? 1 : maxValue;
  const valueRange = chartMaxValue - minValue || 1;
  const valueY = (value: number) =>
    padding.top + ((chartMaxValue - value) / valueRange) * chartHeight;
  const zeroY = valueY(0);
  const ticks = [
    chartMaxValue,
    (chartMaxValue + minValue) / 2,
    minValue,
  ];
  const slotWidth = data.length ? chartWidth / data.length : chartWidth;
  const barWidth = Math.max(5, Math.min(34, slotWidth * 0.62));
  const labelStep = Math.max(1, Math.ceil(data.length / 12));
  const formatValue = currency ? formatCompactINR : formatCompactNumber;

  if (data.length === 0) {
    return (
      <div className="dashboard-chart-empty">
        No report data is available for this period.
      </div>
    );
  }

  return (
    <div className="dashboard-chart-scroll">
      <svg
        className="dashboard-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${data.length} data points`}
        style={{ minWidth: data.length > 14 ? 620 : 500 }}
      >
        {ticks.map((tick, index) => {
          const y = valueY(tick);
          return (
            <g key={`tick-${index}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="var(--border-subtle)"
                strokeDasharray={index === 0 ? undefined : "4 4"}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-muted)"
              >
                {formatValue(tick)}
              </text>
            </g>
          );
        })}
        {data.map(({ label, value }, index) => {
          const endY = valueY(value);
          const barHeight = Math.abs(zeroY - endY);
          const x =
            padding.left + index * slotWidth + (slotWidth - barWidth) / 2;
          const showLabel =
            index % labelStep === 0 || index === data.length - 1;
          return (
            <g key={`${label}-${index}`}>
              <rect
                x={x}
                y={Math.min(zeroY, endY)}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={color}
              >
                <title>{`${label}: ${formatValue(value)}`}</title>
              </rect>
              {showLabel && (
                <text
                  x={padding.left + index * slotWidth + slotWidth / 2}
                  y={height - 11}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function GroupedBarChart({
  months,
  series,
}: {
  months: GrowthMonth[];
  series: GrowthSeries[];
}) {
  if (months.length === 0 || series.length === 0) {
    return (
      <div className="dashboard-chart-empty">
        Registration history is not available.
      </div>
    );
  }

  const width = 720;
  const height = 240;
  const padding = { top: 16, right: 12, bottom: 36, left: 42 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(
    1,
    ...series.flatMap(({ values }) => values.map((value) => value)),
  );
  const slotWidth = chartWidth / months.length;
  const barWidth = Math.max(
    4,
    Math.min(20, (slotWidth * 0.72) / series.length),
  );

  return (
    <div className="dashboard-chart-scroll">
      <svg
        className="dashboard-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Monthly registrations for corporate clients, vendors, drivers, and employees"
        style={{ minWidth: 520 }}
      >
        {[0, maxValue / 2, maxValue].map((tick, index) => {
          const y = padding.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <g key={`growth-tick-${index}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="var(--border-subtle)"
                strokeDasharray={index === 0 ? undefined : "4 4"}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-muted)"
              >
                {formatCompactNumber(tick)}
              </text>
            </g>
          );
        })}
        {months.map((month, monthIndex) => {
          const groupWidth = barWidth * series.length;
          const groupStart =
            padding.left +
            monthIndex * slotWidth +
            (slotWidth - groupWidth) / 2;
          return (
            <g key={month.key}>
              {series.map((item, seriesIndex) => {
                const value = item.values[monthIndex] ?? 0;
                const barHeight = (value / maxValue) * chartHeight;
                return (
                  <rect
                    key={item.name}
                    x={groupStart + seriesIndex * barWidth}
                    y={padding.top + chartHeight - barHeight}
                    width={Math.max(3, barWidth - 2)}
                    height={barHeight}
                    rx="3"
                    fill={item.color}
                  >
                    <title>{`${month.label} ${item.name}: ${value}`}</title>
                  </rect>
                );
              })}
              <text
                x={padding.left + monthIndex * slotWidth + slotWidth / 2}
                y={height - 12}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-muted)"
              >
                {month.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChartLegend({ series }: { series: GrowthSeries[] }) {
  return (
    <div className="dashboard-chart-legend">
      {series.map((item) => (
        <span key={item.name} className="dashboard-chart-legend-item">
          <span
            className="dashboard-chart-legend-dot"
            style={{ background: item.color }}
          />
          {item.name}
        </span>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { year, month } = getIndiaMonth();
  const indiaToday = getIndiaDateInputValue();
  const [data, setData] = useState(EMPTY_DASHBOARD_DATA);
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const requestSeqRef = useRef(0);

  const loadDashboardData = useCallback(async () => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    const reqSeq = ++requestSeqRef.current;
    if (mountedRef.current) setIsRefreshing(true);

    try {
      const results = await Promise.allSettled([
        adminApi.getMetrics(),
        adminApi.getDrivers("ALL"),
        adminApi.getVendors("ALL"),
        adminApi.getCorporateTenants({ page: 1, limit: 100 }),
        adminApi.getUsers({ role: "EMPLOYEE", page: 1, limit: 100 }),
        adminApi.getUserCount({ role: "EMPLOYEE" }),
        adminApi.getRequirements("ALL"),
        adminApi.getFinanceDashboard({ range: "30D" }),
        adminApi.getTripFrequencyReport(year, month),
      ]);

      if (!mountedRef.current || reqSeq !== requestSeqRef.current) return;

      const sourceNames = [
        "Summary metrics",
        "Drivers",
        "Vendors",
        "Corporate clients",
        "Employees",
        "Employee count",
        "Requirements",
        "Finance",
        "Daily booking usage",
      ];
      setSourceErrors(
        results.flatMap((result, index) =>
          result.status === "rejected" ? [sourceNames[index]] : [],
        ),
      );

      setData((current) => {
        const corporateClients =
          results[3].status === "fulfilled"
            ? results[3].value.items
            : current.corporateClients;
        const corporateClientCount =
          results[3].status === "fulfilled"
            ? results[3].value.pagination.total
            : current.corporateClientCount;
        const employees =
          results[4].status === "fulfilled"
            ? results[4].value.filter(
                (user) =>
                  typeof user.role === "string" &&
                  user.role.toUpperCase().includes("EMPLOYEE"),
              )
            : current.employees;

        return {
          metrics:
            results[0].status === "fulfilled"
              ? results[0].value
              : current.metrics,
          drivers:
            results[1].status === "fulfilled"
              ? results[1].value
              : current.drivers,
          vendors:
            results[2].status === "fulfilled"
              ? results[2].value
              : current.vendors,
          corporateClients,
          corporateClientCount,
          employees,
          employeeCount:
            results[5].status === "fulfilled"
              ? results[5].value
              : current.employeeCount,
          requirements:
            results[6].status === "fulfilled"
              ? results[6].value
              : current.requirements,
          finance:
            results[7].status === "fulfilled"
              ? results[7].value
              : current.finance,
          tripReport:
            results[8].status === "fulfilled"
              ? results[8].value
              : current.tripReport,
        };
      });
      setLastUpdated(new Date());
      setIsLoading(false);
      setIsRefreshing(false);
    } finally {
      if (reqSeq === requestSeqRef.current) {
        requestInFlightRef.current = false;
      }
    }
  }, [year, month]);

  useEffect(() => {
    mountedRef.current = true;
    let intervalId: number | null = null;

    const stopPolling = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const startPolling = () => {
      stopPolling();
      if (!mountedRef.current || document.hidden) return;
      intervalId = window.setInterval(() => {
        if (!document.hidden) {
          void loadDashboardData();
        }
      }, 60_000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        void loadDashboardData();
        startPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (!document.hidden) {
      void loadDashboardData();
      startPolling();
    }

    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
      requestInFlightRef.current = false;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadDashboardData]);

  const activeRequirements = useMemo(
    () => data.requirements.filter(isActiveRequirement),
    [data.requirements],
  );
  const activeRequirementsByStatus = useMemo(() => {
    const counts = new Map<string, number>();
    activeRequirements.forEach(({ status }) => {
      const label = status.replaceAll("_", " ");
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return [...counts.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [activeRequirements]);

  const todayBookings = useMemo(() => {
    if (!data.tripReport) return null;
    return (
      data.tripReport.dailyTrips.find((trip) => trip.date === indiaToday)
        ?.count ?? 0
    );
  }, [data.tripReport, indiaToday]);

  const dailyBookingData = useMemo(
    () =>
      (data.tripReport?.dailyTrips ?? [])
        .filter((trip) => trip.date <= indiaToday)
        .slice(-30)
        .map((trip) => ({
          label: trip.date.slice(-2),
          value: trip.count,
        })),
    [data.tripReport, indiaToday],
  );

  const payoutRequestedData = useMemo(() => {
    const byDate = new Map<string, number>();
    (data.finance?.settlements ?? []).forEach((settlement) => {
      if (!isPendingPayout(settlement)) return;
      const date = getIndiaDateKey(settlement.requestedDate);
      if (!date) return;
      byDate.set(
        date,
        (byDate.get(date) ?? 0) + Number(settlement.amount || 0),
      );
    });
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, value]) => ({ label: date.slice(5), value }));
  }, [data.finance]);

  const marginData = useMemo(
    () => {
      const byDate = new Map<string, number>();
      (data.finance?.transactions ?? []).forEach((transaction) => {
        const date = getIndiaDateKey(transaction.transactionDate);
        if (!date) return;
        byDate.set(
          date,
          (byDate.get(date) ?? 0) +
            Number(transaction.totalOrderAmount || 0) -
            Number(transaction.driverEarnings || 0),
        );
      });
      return [...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([date, value]) => ({ label: date.slice(5), value }));
    },
    [data.finance],
  );

  const tripStatusData = useMemo(
    () =>
      (data.tripReport?.statusBreakdown ?? []).map(({ status, count }) => ({
        label: status.replaceAll("_", " "),
        value: count,
      })),
    [data.tripReport],
  );

  const growthMonths = useMemo(() => getRecentGrowthMonths(), []);
  const growthSeries = useMemo<GrowthSeries[]>(() => {
    const sources = [
      {
        name: "Corporate clients",
        color: "var(--brand-secondary)",
        records: data.corporateClients,
      },
      {
        name: "Vendors",
        color: "var(--color-info)",
        records: data.vendors,
      },
      {
        name: "Drivers",
        color: "var(--color-success)",
        records: data.drivers,
      },
      {
        name: "Employees",
        color: "var(--text-brand)",
        records: data.employees,
      },
    ];

    return sources.map(({ name, color, records }) => {
      const values = getMonthlyRegistrations(records, growthMonths);
      return {
        name,
        color,
        values,
        current: values.at(-1) ?? 0,
        previous: values.at(-2) ?? 0,
      };
    });
  }, [
    data.corporateClients,
    data.drivers,
    data.employees,
    data.vendors,
    growthMonths,
  ]);

  const payoutRequestedTotal =
    data.finance?.metrics.pendingSettlementRequests ?? null;
  const platformMargin =
    data.finance == null || data.finance.transactions.length === 0
      ? null
      : data.finance.transactions.reduce(
          (margin, transaction) =>
            margin +
            Number(transaction.totalOrderAmount || 0) -
            Number(transaction.driverEarnings || 0),
          0,
        );
  const activeRequirementTotal =
    data.metrics?.activeRequirements ?? activeRequirements.length;

  const corporateGrowthRate = (series: GrowthSeries) =>
    series.previous > 0
      ? ((series.current - series.previous) / series.previous) * 100
      : null;

  return (
    <main className="admin-page dashboard-page">
      <PageHeader
        title="Business Dashboard"
        subtitle="Marketplace activity, financial performance, and driver operations."
        actions={
          <div className="dashboard-header-actions">
            {lastUpdated && (
              <span className="dashboard-updated-label">
                Updated{" "}
                {new Intl.DateTimeFormat("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(lastUpdated)}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadDashboardData()}
              disabled={isRefreshing}
              leftIcon={
                <RefreshCw
                  size={14}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              }
            >
              {isRefreshing ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        }
      />

      {sourceErrors.length > 0 && (
        <div className="dashboard-load-alert" role="status">
          Some dashboard data could not be refreshed:{" "}
          {sourceErrors.join(", ")}. Previously loaded values remain visible.
        </div>
      )}

      <section className="dashboard-kpi-grid" aria-label="Business summary">
        <MetricCard
          label="Driver payouts requested"
          value={
            isLoading
              ? "…"
              : data.finance
                ? formatINR(payoutRequestedTotal)
                : "—"
          }
          subtext="Pending and processing settlement requests"
          icon={<Wallet size={15} />}
          accentColor="var(--brand-secondary)"
        />
        <MetricCard
          label="Completed-trip margin"
          value={
            isLoading
              ? "…"
              : platformMargin == null
                ? "—"
                : formatINR(platformMargin)
          }
          subtext="Last 30 days · fare revenue less driver earnings"
          icon={<TrendingUp size={15} />}
          accentColor="var(--color-info)"
        />
        <MetricCard
          label="Active requirements"
          value={
            isLoading && data.metrics == null
              ? "…"
              : activeRequirementTotal.toLocaleString("en-IN")
          }
          subtext="Open and in-flight demand"
          icon={<ClipboardList size={15} />}
          accentColor="var(--color-success)"
        />
        <MetricCard
          label="Daily cab bookings"
          value={
            isLoading && todayBookings == null
              ? "…"
              : todayBookings == null
                ? "—"
                : todayBookings.toLocaleString("en-IN")
          }
          subtext="Trips created today · India time"
          icon={<Car size={15} />}
          accentColor="var(--text-brand)"
        />
      </section>

      <section className="dashboard-entity-section" aria-label="Registered accounts">
        <div className="dashboard-section-heading">
          <div>
            <h2 className="dashboard-section-title">Registered accounts</h2>
          </div>
        </div>

        <div className="dashboard-account-grid">
          {[
            {
              title: "Total Drivers",
              count: data.metrics?.totalDrivers,
              icon: <Car size={15} strokeWidth={1.8} />,
              accentColor: "var(--color-info)",
            },
            {
              title: "Total Vendors",
              count: data.metrics?.totalVendors,
              icon: <Store size={15} strokeWidth={1.8} />,
              accentColor: "var(--brand-secondary)",
            },
            {
              title: "Total Corporate Clients",
              count: data.corporateClientCount,
              icon: <Building2 size={15} strokeWidth={1.8} />,
              accentColor: "var(--color-warning)",
            },
            {
              title: "Total Employees",
              count: data.employeeCount,
              icon: <Users size={15} strokeWidth={1.8} />,
              accentColor: "var(--color-success)",
            },
          ].map(({ title, count, icon, accentColor }) => (
            <MetricCard
              key={title}
              label={title}
              value={
                count == null
                  ? isLoading
                    ? "…"
                    : "—"
                  : count.toLocaleString("en-IN")
              }
              icon={icon}
              accentColor={accentColor}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-analytics-section">
        <div className="dashboard-section-heading">
          <div>
            <h2 className="dashboard-section-title">Analytics &amp; trends</h2>
            <p className="dashboard-section-subtitle">
              Current-month booking usage and 30-day financial activity.
            </p>
          </div>
          <span className="dashboard-period-label">
            <Activity size={14} />
            Live operational data
          </span>
        </div>

        <div className="dashboard-chart-grid">
          <ChartCard
            title="Daily cab booking usage"
            subtitle="Trips created each day this month · India time"
            action={<Car size={16} className="text-muted" />}
          >
            <BarChart data={dailyBookingData} color="var(--brand-secondary)" />
          </ChartCard>

          <ChartCard
            title="Trip status"
            subtitle="Trips created this month by current status"
            action={<Activity size={16} className="text-muted" />}
          >
            <BarChart data={tripStatusData} color="var(--color-info)" />
          </ChartCard>

          <ChartCard
            title="Driver payouts requested"
            subtitle="Pending and processing requests by day · last 30 days"
            action={<Wallet size={16} className="text-muted" />}
          >
            <BarChart
              data={payoutRequestedData}
              color="var(--color-info)"
              currency
            />
          </ChartCard>

          <ChartCard
            title="Completed-trip margin"
            subtitle="Daily completed-trip fares less driver earnings · last 30 days"
            action={<TrendingUp size={16} className="text-muted" />}
          >
            <BarChart data={marginData} color="var(--color-success)" currency />
          </ChartCard>

          <ChartCard
            title="Active requirements"
            subtitle="Currently open or in-flight requirements by status"
            action={<ClipboardList size={16} className="text-muted" />}
          >
            <BarChart
              data={activeRequirementsByStatus}
              color="var(--text-brand)"
            />
          </ChartCard>

          <ChartCard
            title="User growth rate"
            subtitle="Monthly registrations from available records; current month is to date"
            action={<Users size={16} className="text-muted" />}
          >
            <GroupedBarChart months={growthMonths} series={growthSeries} />
            <ChartLegend series={growthSeries} />
            <div className="dashboard-growth-summary">
              {growthSeries.map((series) => {
                const rate = corporateGrowthRate(series);
                return (
                  <div key={series.name} className="dashboard-growth-item">
                    <span>{series.name}</span>
                    <strong>
                      {series.current.toLocaleString("en-IN")} this month
                    </strong>
                    <small>
                      {rate == null
                        ? series.current > 0
                          ? "New registrations"
                          : "No prior-month baseline"
                        : `${rate >= 0 ? "+" : ""}${rate.toFixed(1)}% vs. last month`}
                    </small>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </div>
      </section>

      <footer className="dashboard-footer-note">
        <Building2 size={14} />
        Platform margin is calculated as reported revenue minus driver payouts.
        {lastUpdated
          ? ` Last refreshed ${new Intl.DateTimeFormat("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(lastUpdated)}.`
          : " Data refreshes automatically every minute."}
      </footer>
    </main>
  );
}
