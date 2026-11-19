"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { AnalyticsTrendsSection } from "../../components/dashboard/AnalyticsTrendsSection";
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
  const todayBookings = useMemo(() => {
    if (!data.tripReport) return null;
    return (
      data.tripReport.dailyTrips.find((trip) => trip.date === indiaToday)
        ?.count ?? 0
    );
  }, [data.tripReport, indiaToday]);

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

      <AnalyticsTrendsSection />

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
