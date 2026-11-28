"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Car,
  Check,
  Download,
  IndianRupee,
  RefreshCw,
  Share2,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import {
  Button,
  Card,
  DataTable,
  KpiStrip,
  PageHeader,
  SegmentedTabs,
  StatusBadge,
} from "../../components/common";
import type { Column } from "../../components/common/DataTable";
import { adminApi } from "../../lib/api/client";
import type {
  AdminFleetPayoutItem,
  CorporateTenantListItem,
  DriverListItem,
  FinanceDashboardData,
  FleetListItem,
  SettlementListItem,
  VendorListItem,
} from "../../lib/api/types";

type BusinessType = "all" | "driver" | "fleet" | "vendor" | "corporate";
type SingleBusinessType = Exclude<BusinessType, "all">;
type DateRangeOption = "7D" | "30D" | "90D" | "CUSTOM";
type GranularityOption = "DAILY" | "WEEKLY" | "MONTHLY";

const ALL_BUSINESS_TABS: { id: BusinessType; label: string }[] = [
  { id: "all", label: "Compare All" },
  { id: "driver", label: "Drivers" },
  { id: "fleet", label: "Fleet" },
  { id: "vendor", label: "Vendors" },
  { id: "corporate", label: "Corporate" },
];

const RANGE_OPTIONS: { id: DateRangeOption; label: string }[] = [
  { id: "7D", label: "7D" },
  { id: "30D", label: "30D" },
  { id: "90D", label: "90D" },
  { id: "CUSTOM", label: "Custom" },
];

function isSingleBusinessType(value: string | null): value is SingleBusinessType {
  return value === "driver" || value === "fleet" || value === "vendor" || value === "corporate";
}

function isValidBusinessType(value: string | null): value is BusinessType {
  return value === "all" || isSingleBusinessType(value);
}

function isValidRange(value: string | null): value is DateRangeOption {
  return value === "7D" || value === "30D" || value === "90D" || value === "CUSTOM";
}

function isValidGranularity(value: string | null): value is GranularityOption {
  return value === "DAILY" || value === "WEEKLY" || value === "MONTHLY";
}

function formatINR(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getDateWindow(
  range: DateRangeOption,
  customStart: string,
  customEnd: string,
): { startMs: number; endMs: number } {
  const now = Date.now();
  if (range === "CUSTOM" && customStart && customEnd) {
    const s = new Date(`${customStart}T00:00:00`).getTime();
    const e = new Date(`${customEnd}T23:59:59`).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && s <= e) {
      return { startMs: s, endMs: e };
    }
  }
  const days = range === "7D" ? 7 : range === "90D" ? 90 : 30;
  return { startMs: now - days * 24 * 60 * 60 * 1000, endMs: now };
}

function isInWindow(
  dateStr: string | undefined | null,
  startMs: number,
  endMs: number,
): boolean {
  if (!dateStr) return false;
  const ts = new Date(dateStr).getTime();
  return Number.isFinite(ts) && ts >= startMs && ts <= endMs;
}

function buildTimeSeries(
  dates: Array<string | undefined | null>,
  granularity: GranularityOption,
  startMs: number,
  endMs: number,
): Array<{ label: string; count: number }> {
  const bucketMap = new Map<string, number>();
  const spanDays = Math.max(1, Math.ceil((endMs - startMs) / (24 * 60 * 60 * 1000)));
  const stepDays = granularity === "MONTHLY" ? 30 : granularity === "WEEKLY" ? 7 : 1;
  const bucketCount = Math.min(18, Math.max(4, Math.ceil(spanDays / stepDays)));

  const orderedKeys: string[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const t = startMs + ((endMs - startMs) * i) / Math.max(1, bucketCount - 1);
    const d = new Date(t);
    const key =
      granularity === "MONTHLY"
        ? d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    if (!bucketMap.has(key)) {
      bucketMap.set(key, 0);
      orderedKeys.push(key);
    }
  }

  for (const raw of dates) {
    if (!raw) continue;
    const ts = new Date(raw).getTime();
    if (!Number.isFinite(ts) || ts < startMs || ts > endMs) continue;
    const d = new Date(ts);
    const key =
      granularity === "MONTHLY"
        ? d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    if (bucketMap.has(key)) {
      bucketMap.set(key, (bucketMap.get(key) || 0) + 1);
    } else if (orderedKeys.length > 0) {
      const nearestIdx = Math.min(
        orderedKeys.length - 1,
        Math.max(
          0,
          Math.floor(((ts - startMs) / Math.max(1, endMs - startMs)) * orderedKeys.length),
        ),
      );
      const nearestKey = orderedKeys[nearestIdx];
      bucketMap.set(nearestKey, (bucketMap.get(nearestKey) || 0) + 1);
    }
  }

  return orderedKeys.map((label) => ({ label, count: bucketMap.get(label) || 0 }));
}

const InsightsGrowthChart: React.FC<{
  series: Array<{ label: string; count: number }>;
  title: string;
  color?: string;
}> = ({ series, title, color = "var(--brand-primary)" }) => {
  const width = 680;
  const height = 180;
  const padX = 28;
  const padY = 20;
  const maxVal = Math.max(1, ...series.map((s) => s.count));

  const coords = series.map((pt, idx) => {
    const x =
      series.length <= 1
        ? width / 2
        : padX + (idx / (series.length - 1)) * (width - padX * 2);
    const y =
      height - padY - (pt.count / maxVal) * (height - padY * 2);
    return { ...pt, x, y };
  });

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPoints =
    coords.length > 0
      ? `${linePoints} ${coords[coords.length - 1].x},${height - padY} ${coords[0].x},${height - padY}`
      : "";

  return (
    <Card style={{ marginTop: "1rem", padding: "1rem 1.15rem" }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="m-0 text-title-sm font-semibold text-primary">{title}</h3>
          <p className="m-0 text-body-sm text-muted">
            Period activity distribution across selected granularity
          </p>
        </div>
        <span className="text-body-sm font-semibold text-brand">
          Peak: {Math.max(0, ...series.map((s) => s.count))}
        </span>
      </div>
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: "100%", minWidth: "420px", height: "180px", display: "block" }}
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id="insightsTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <line
            x1={padX}
            y1={height - padY}
            x2={width - padX}
            y2={height - padY}
            stroke="var(--border-color)"
            strokeWidth="1"
          />
          {areaPoints && <polygon points={areaPoints} fill="url(#insightsTrendGrad)" />}
          {linePoints && (
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={linePoints}
            />
          )}
          {coords.map((c, idx) => {
            const showLabel =
              coords.length <= 8 || idx === 0 || idx === coords.length - 1 || idx % 2 === 0;
            return (
              <g key={`${c.label}-${idx}`}>
                <circle cx={c.x} cy={c.y} r="3.5" fill={color} />
                {showLabel && (
                  <text
                    x={c.x}
                    y={height - 4}
                    textAnchor="middle"
                    fontSize="10"
                    fill="var(--text-muted)"
                  >
                    {c.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </Card>
  );
};

interface SummaryRow {
  id: string;
  name: string;
  subtitle?: string;
  status: string;
  metricLabel: string;
  amountValue?: number;
  createdAt?: string;
}

function BusinessInsightsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const contextParam = searchParams.get("context");
  const businessParam = searchParams.get("business");
  const isContextLocked = isSingleBusinessType(contextParam);

  const initialBusiness: BusinessType = isSingleBusinessType(contextParam)
    ? contextParam
    : isValidBusinessType(businessParam)
      ? businessParam
      : "all";
  const initialRange: DateRangeOption = isValidRange(searchParams.get("range"))
    ? (searchParams.get("range") as DateRangeOption)
    : "30D";
  const initialGranularity: GranularityOption = isValidGranularity(
    searchParams.get("granularity"),
  )
    ? (searchParams.get("granularity") as GranularityOption)
    : "DAILY";

  const [business, setBusiness] = useState<BusinessType>(initialBusiness);
  const [range, setRange] = useState<DateRangeOption>(initialRange);
  const [granularity, setGranularity] = useState<GranularityOption>(initialGranularity);
  const [customStart, setCustomStart] = useState<string>(
    searchParams.get("startDate") || "",
  );
  const [customEnd, setCustomEnd] = useState<string>(searchParams.get("endDate") || "");
  const [copiedLink, setCopiedLink] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [fleets, setFleets] = useState<FleetListItem[]>([]);
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [corporates, setCorporates] = useState<CorporateTenantListItem[]>([]);
  const [finance, setFinance] = useState<FinanceDashboardData | null>(null);
  const [settlements, setSettlements] = useState<SettlementListItem[]>([]);
  const [fleetPayouts, setFleetPayouts] = useState<AdminFleetPayoutItem[]>([]);

  useEffect(() => {
    const activeParam = searchParams.get("context") || searchParams.get("business");
    if (isValidBusinessType(activeParam) && activeParam !== business) {
      setBusiness(activeParam);
    }
    const paramRange = searchParams.get("range");
    if (isValidRange(paramRange) && paramRange !== range) {
      setRange(paramRange);
    }
    const paramGranularity = searchParams.get("granularity");
    if (isValidGranularity(paramGranularity) && paramGranularity !== granularity) {
      setGranularity(paramGranularity);
    }
  }, [searchParams, business, range, granularity]);

  const updateUrlParams = useCallback(
    (
      nextBiz: BusinessType,
      nextRange: DateRangeOption,
      nextGranularity: GranularityOption,
      nextStart = customStart,
      nextEnd = customEnd,
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      if (isSingleBusinessType(searchParams.get("context"))) {
        params.set("context", nextBiz === "all" ? "driver" : nextBiz);
      } else {
        params.set("business", nextBiz);
      }
      params.set("range", nextRange);
      params.set("granularity", nextGranularity);
      if (nextRange === "CUSTOM" && nextStart && nextEnd) {
        params.set("startDate", nextStart);
        params.set("endDate", nextEnd);
      } else {
        params.delete("startDate");
        params.delete("endDate");
      }
      router.replace(`/business-insights?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, customStart, customEnd],
  );

  const handleSelectBusiness = (nextBiz: string) => {
    if (!isValidBusinessType(nextBiz)) return;
    setBusiness(nextBiz);
    updateUrlParams(nextBiz, range, granularity);
  };

  const handleSelectRange = (nextRange: DateRangeOption) => {
    setRange(nextRange);
    updateUrlParams(business, nextRange, granularity);
  };

  const handleSelectGranularity = (nextGranularity: GranularityOption) => {
    setGranularity(nextGranularity);
    updateUrlParams(business, range, nextGranularity);
  };

  const loadData = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      try {
        const financeParams =
          range === "CUSTOM" && customStart && customEnd
            ? { range: "CUSTOM", startDate: customStart, endDate: customEnd }
            : { range };

        const [
          driversRes,
          fleetsRes,
          vendorsRes,
          corporatesRes,
          financeRes,
          settlementsRes,
          fleetPayoutsRes,
        ] = await Promise.all([
          adminApi.getDrivers().catch(() => [] as DriverListItem[]),
          adminApi
            .listFleets({ limit: 200 })
            .then((r) => r.items || [])
            .catch(() => [] as FleetListItem[]),
          adminApi.getVendors().catch(() => [] as VendorListItem[]),
          adminApi
            .getCorporateTenants({ limit: 200 })
            .then((r) => r.items || [])
            .catch(() => [] as CorporateTenantListItem[]),
          adminApi.getFinanceDashboard(financeParams).catch(() => null),
          adminApi.getSettlements("ALL").catch(() => [] as SettlementListItem[]),
          adminApi
            .listFleetPayouts({ limit: 200 })
            .then((r) => r.items || [])
            .catch(() => [] as AdminFleetPayoutItem[]),
        ] as const);

        setDrivers(Array.isArray(driversRes) ? driversRes : []);
        setFleets(Array.isArray(fleetsRes) ? fleetsRes : []);
        setVendors(Array.isArray(vendorsRes) ? vendorsRes : []);
        setCorporates(Array.isArray(corporatesRes) ? corporatesRes : []);
        setFinance(financeRes);
        setSettlements(Array.isArray(settlementsRes) ? settlementsRes : []);
        setFleetPayouts(Array.isArray(fleetPayoutsRes) ? fleetPayoutsRes : []);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [range, customStart, customEnd],
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard failures in restricted contexts
    }
  };

  const moduleView = useMemo(() => {
    const { startMs, endMs } = getDateWindow(range, customStart, customEnd);
    const recentDrivers = drivers.filter((d) => isInWindow(d.createdAt, startMs, endMs));
    const verifiedDrivers = drivers.filter((d) => d.verificationStatus === "VERIFIED");
    const driverEarningsTotal =
      finance?.driverSummary?.totalDriverEarnings ??
      drivers.reduce(
        (sum, d) =>
          sum + (Number((d as any).totalEarnings ?? (d as any).walletBalance) || 0),
        0,
      );

    const driverSettlements = settlements.filter((s) => s.entityType !== "FLEET");
    const fleetSettlements = settlements.filter((s) => s.entityType === "FLEET");

    const pendingDriverPayouts = driverSettlements
      .filter((s) => s.status === "PENDING")
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const settledDriverPayouts = driverSettlements
      .filter((s) => s.status === "SETTLED")
      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    const fleetPayoutTotals = new Map<string, number>();
    for (const p of fleetPayouts) {
      fleetPayoutTotals.set(
        p.fleetId,
        (fleetPayoutTotals.get(p.fleetId) || 0) + (Number(p.amount) || 0),
      );
    }

    const pendingFleetPayouts =
      fleetSettlements
        .filter((s) => s.status === "PENDING")
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0) +
      fleetPayouts
        .filter((p) => p.status !== "SETTLED" && p.status !== "REJECTED")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const settledFleetPayouts =
      fleetSettlements
        .filter((s) => s.status === "SETTLED")
        .reduce((sum, s) => sum + (Number(s.amount) || 0), 0) +
      fleetPayouts
        .filter((p) => p.status === "SETTLED")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    if (business === "all") {
      const activeFleets = fleets.filter((f) => f.status === "ACTIVE").length;
      const verifiedVendors = vendors.filter((v) => v.verificationStatus === "VERIFIED").length;
      const activeCorps = corporates.filter((c) => c.status === "ACTIVE").length;
      const totalEscrow = vendors.reduce((sum, v) => sum + (Number(v.escrowBalance) || 0), 0);
      const totalEmployees = corporates.reduce((sum, c) => sum + (c._count?.employees || 0), 0);

      const rows: SummaryRow[] = [
        {
          id: "biz-driver",
          name: "Drivers",
          subtitle: `${verifiedDrivers.length} verified drivers`,
          status: "ACTIVE",
          metricLabel: `${drivers.length} total (${recentDrivers.length} new)`,
          amountValue: driverEarningsTotal,
        },
        {
          id: "biz-fleet",
          name: "Fleet",
          subtitle: `${activeFleets} active fleets`,
          status: "ACTIVE",
          metricLabel: `${fleets.reduce((s, f) => s + (f.totalDrivers || 0), 0)} fleet drivers`,
          amountValue: settledFleetPayouts + pendingFleetPayouts,
        },
        {
          id: "biz-vendor",
          name: "Vendors",
          subtitle: `${verifiedVendors} verified vendors`,
          status: "ACTIVE",
          metricLabel: `${vendors.reduce((s, v) => s + (v.requirementsCount || 0), 0)} requirements`,
          amountValue: totalEscrow,
        },
        {
          id: "biz-corporate",
          name: "Corporate",
          subtitle: `${activeCorps} active clients`,
          status: "ACTIVE",
          metricLabel: `${totalEmployees} employees`,
        },
      ];

      const allDates = [
        ...drivers.map((d) => d.createdAt),
        ...fleets.map((f) => f.createdAt),
        ...vendors.map((v) => v.createdAt),
        ...corporates.map((c) => c.createdAt),
      ];

      return {
        title: "All Businesses — Comparative Overview",
        description:
          "Cross-module growth and financial summary across Drivers, Fleet, Vendors, and Corporate.",
        kpis: [
          { label: "Total Drivers", value: drivers.length.toLocaleString("en-IN"), subtext: `${verifiedDrivers.length} verified`, icon: <Car size={15} />, accentColor: "var(--color-info)" },
          { label: "Total Fleets", value: fleets.length.toLocaleString("en-IN"), subtext: `${activeFleets} active`, icon: <Truck size={15} />, accentColor: "var(--brand-primary)" },
          { label: "Total Vendors", value: vendors.length.toLocaleString("en-IN"), subtext: `${formatINR(totalEscrow)} escrow`, icon: <Store size={15} />, accentColor: "var(--brand-secondary)" },
          { label: "Corporate Clients", value: corporates.length.toLocaleString("en-IN"), subtext: `${totalEmployees} employees`, icon: <Building2 size={15} />, accentColor: "var(--color-warning)" },
        ],
        series: buildTimeSeries(allDates, granularity, startMs, endMs),
        chartTitle: `Cross-Business Onboarding Trend (${granularity.toLowerCase()})`,
        chartColor: "var(--brand-primary)",
        rows,
        tableTitle: "Business Module Comparison",
      };
    }

    if (business === "driver") {
      const rows: SummaryRow[] = drivers.slice(0, 25).map((d) => ({
        id: d.id,
        name: d.fullName || "Driver",
        subtitle: d.phone,
        status: d.verificationStatus || "PENDING",
        metricLabel: `${d.totalTrips ?? 0} trips`,
        amountValue:
          Number((d as any).totalEarnings ?? (d as any).walletBalance) || 0,
      }));
      return {
        title: "Drivers — Growth & Financials",
        description:
          "Driver acquisition, verification throughput, trip earnings, and settlement payouts.",
        kpis: [
          { label: "Total Drivers", value: drivers.length.toLocaleString("en-IN"), subtext: `${verifiedDrivers.length} verified`, icon: <Car size={15} />, accentColor: "var(--color-info)" },
          { label: `New Signups (${range})`, value: recentDrivers.length.toLocaleString("en-IN"), subtext: "Within selected window", icon: <TrendingUp size={15} />, accentColor: "var(--color-success)" },
          { label: "Driver Earnings", value: formatINR(driverEarningsTotal), subtext: "Cumulative reported driver earnings", icon: <IndianRupee size={15} />, accentColor: "var(--brand-primary)" },
          { label: "Pending Settlements", value: formatINR(pendingDriverPayouts), subtext: `${formatINR(settledDriverPayouts)} settled`, icon: <Wallet size={15} />, accentColor: "var(--color-warning)" },
        ],
        series: buildTimeSeries(
          drivers.map((d) => d.createdAt),
          granularity,
          startMs,
          endMs,
        ),
        chartTitle: `Driver Onboarding Growth (${granularity.toLowerCase()})`,
        chartColor: "var(--color-info)",
        rows,
        tableTitle: "Top Driver Financial Performance",
      };
    }

    if (business === "fleet") {
      const recentFleets = fleets.filter((f) => isInWindow(f.createdAt, startMs, endMs));
      const activeFleets = fleets.filter((f) => f.status === "ACTIVE");
      const totalFleetDrivers = fleets.reduce((sum, f) => sum + (f.totalDrivers || 0), 0);
      const rows: SummaryRow[] = fleets.slice(0, 25).map((f) => ({
        id: f.id,
        name: f.name || f.ownerName || "Fleet Partner",
        subtitle: `${f.ownerName} · ${f.city || "India"}`,
        status: f.status || "INACTIVE",
        metricLabel: `${f.totalDrivers ?? 0} drivers`,
        amountValue: fleetPayoutTotals.get(f.id) || 0,
        createdAt: f.createdAt,
      }));
      return {
        title: "Fleet — Growth & Financials",
        description:
          "Fleet partner onboarding, active fleet capacity, and fleet payout tracking.",
        kpis: [
          { label: "Total Fleets", value: fleets.length.toLocaleString("en-IN"), subtext: `${activeFleets.length} active`, icon: <Truck size={15} />, accentColor: "var(--color-info)" },
          { label: `New Fleets (${range})`, value: recentFleets.length.toLocaleString("en-IN"), subtext: `${totalFleetDrivers} linked drivers`, icon: <TrendingUp size={15} />, accentColor: "var(--color-success)" },
          { label: "Fleet Driver Pool", value: totalFleetDrivers.toLocaleString("en-IN"), subtext: "Active fleet-managed capacity", icon: <Users size={15} />, accentColor: "var(--brand-primary)" },
          { label: "Fleet Settlements", value: formatINR(settledFleetPayouts), subtext: `${formatINR(pendingFleetPayouts)} pending`, icon: <Wallet size={15} />, accentColor: "var(--color-warning)" },
        ],
        series: buildTimeSeries(
          fleets.map((f) => f.createdAt),
          granularity,
          startMs,
          endMs,
        ),
        chartTitle: `Fleet Partner Growth (${granularity.toLowerCase()})`,
        chartColor: "var(--brand-primary)",
        rows,
        tableTitle: "Fleet Partners Overview",
      };
    }

    if (business === "vendor") {
      const recentVendors = vendors.filter((v) => isInWindow(v.createdAt, startMs, endMs));
      const verifiedVendors = vendors.filter((v) => v.verificationStatus === "VERIFIED");
      const totalEscrow = vendors.reduce((sum, v) => sum + (Number(v.escrowBalance) || 0), 0);
      const totalRequirements = vendors.reduce((sum, v) => sum + (Number(v.requirementsCount) || 0), 0);
      const rows: SummaryRow[] = vendors.slice(0, 25).map((v) => ({
        id: v.id,
        name: v.organizationName || v.companyName || v.fullName || "Vendor",
        subtitle: v.phone || v.email,
        status: v.verificationStatus || "PENDING",
        metricLabel: `${v.requirementsCount ?? 0} requirements`,
        amountValue: Number(v.escrowBalance) || 0,
        createdAt: v.createdAt,
      }));
      return {
        title: "Vendors — Growth & Financials",
        description:
          "Vendor enterprise onboarding, verification status, requirements, and escrow holds.",
        kpis: [
          { label: "Total Vendors", value: vendors.length.toLocaleString("en-IN"), subtext: `${verifiedVendors.length} verified`, icon: <Store size={15} />, accentColor: "var(--brand-secondary)" },
          { label: `New Vendors (${range})`, value: recentVendors.length.toLocaleString("en-IN"), subtext: "Within selected window", icon: <TrendingUp size={15} />, accentColor: "var(--color-success)" },
          { label: "Total Requirements", value: totalRequirements.toLocaleString("en-IN"), subtext: "Posted across vendor partners", icon: <Wallet size={15} />, accentColor: "var(--brand-primary)" },
          { label: "Active Escrow Holds", value: formatINR(totalEscrow), subtext: "Reserved for active requirements", icon: <IndianRupee size={15} />, accentColor: "var(--color-warning)" },
        ],
        series: buildTimeSeries(
          vendors.map((v) => v.createdAt),
          granularity,
          startMs,
          endMs,
        ),
        chartTitle: `Vendor Onboarding Growth (${granularity.toLowerCase()})`,
        chartColor: "var(--brand-secondary)",
        rows,
        tableTitle: "Vendor Balances & Status",
      };
    }

    // corporate
    const recentCorps = corporates.filter((c) => isInWindow(c.createdAt, startMs, endMs));
    const activeCorps = corporates.filter((c) => c.status === "ACTIVE");
    const totalEmployees = corporates.reduce((sum, c) => sum + (c._count?.employees || 0), 0);
    const totalRoutes = corporates.reduce((sum, c) => sum + (c._count?.routes || 0), 0);
    const rows: SummaryRow[] = corporates.slice(0, 25).map((c) => ({
      id: c.id,
      name: c.name || "Corporate Client",
      subtitle: `${c.code || "CORP"} · ${c._count?.employees ?? 0} employees`,
      status: c.status || "INACTIVE",
      metricLabel: `${c._count?.routes ?? 0} routes`,
      createdAt: c.createdAt,
    }));
    return {
      title: "Corporate — Growth & Financials",
      description: "Corporate client onboarding, employee adoption, and ETS route operations.",
      kpis: [
        { label: "Corporate Clients", value: corporates.length.toLocaleString("en-IN"), subtext: `${activeCorps.length} active`, icon: <Building2 size={15} />, accentColor: "var(--color-warning)" },
        { label: `New Clients (${range})`, value: recentCorps.length.toLocaleString("en-IN"), subtext: "Within selected window", icon: <TrendingUp size={15} />, accentColor: "var(--color-success)" },
        { label: "Corporate Employees", value: totalEmployees.toLocaleString("en-IN"), subtext: "Enrolled corporate commuters", icon: <Users size={15} />, accentColor: "var(--brand-primary)" },
        { label: "Active ETS Routes", value: totalRoutes.toLocaleString("en-IN"), subtext: "Configured corporate routes", icon: <IndianRupee size={15} />, accentColor: "var(--color-info)" },
      ],
      series: buildTimeSeries(
        corporates.map((c) => c.createdAt),
        granularity,
        startMs,
        endMs,
      ),
      chartTitle: `Corporate Client Onboarding (${granularity.toLowerCase()})`,
      chartColor: "var(--color-warning)",
      rows,
      tableTitle: "Corporate Clients Overview",
    };
  }, [
    business,
    corporates,
    customEnd,
    customStart,
    drivers,
    finance,
    fleetPayouts,
    fleets,
    granularity,
    range,
    settlements,
    vendors,
  ]);

  const handleExportCsv = () => {
    const header = ["ID", "Name", "Details", "Status", "Metric", "Amount (INR)"];
    const lines = moduleView.rows.map((r) =>
      [
        r.id,
        `"${(r.name || "").replace(/"/g, '""')}"`,
        `"${(r.subtitle || "").replace(/"/g, '""')}"`,
        r.status,
        `"${r.metricLabel}"`,
        r.amountValue != null ? String(r.amountValue) : "",
      ].join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adhocx-${business}-insights-${range.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: Column<SummaryRow>[] = [
    {
      key: "name",
      header: "Account / Partner",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-primary">{row.name}</span>
          {row.subtitle && <span className="text-body-sm text-muted">{row.subtitle}</span>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "metricLabel",
      header: "Operational Volume",
      render: (row) => <span className="text-secondary font-medium">{row.metricLabel}</span>,
    },
    {
      key: "amountValue",
      header: "Financial Value",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-primary">
          {row.amountValue != null ? formatINR(row.amountValue) : "—"}
        </span>
      ),
    },
  ];

  const activeLabel =
    ALL_BUSINESS_TABS.find((t) => t.id === business)?.label || "Business";

  return (
    <main className="admin-page">
      <PageHeader
        title={`${activeLabel} · Insights`}
        subtitle={`Micro growth analytics and financial performance scoped to ${activeLabel}`}
        liveStatus={isContextLocked ? "Context-Scoped View" : "Shareable Filtered View"}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyShareLink}
              leftIcon={copiedLink ? <Check size={14} /> : <Share2 size={14} />}
            >
              {copiedLink ? "Link Copied" : "Share View"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download size={14} />}
            >
              Export CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadData(true)}
              disabled={refreshing}
              leftIcon={<RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />}
            >
              {refreshing ? "Syncing..." : "Refresh"}
            </Button>
          </div>
        }
      />

      <Card className="mb-4" style={{ padding: "0.9rem 1.1rem" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          {!isContextLocked ? (
            <SegmentedTabs
              tabs={ALL_BUSINESS_TABS}
              activeTab={business}
              onChange={handleSelectBusiness}
            />
          ) : (
            <div className="text-body-md font-semibold text-brand">
              Scoped to: {activeLabel}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {RANGE_OPTIONS.map((opt) => (
              <Button
                key={opt.id}
                size="sm"
                variant={range === opt.id ? "primary" : "outline"}
                onClick={() => handleSelectRange(opt.id)}
              >
                {opt.label}
              </Button>
            ))}

            {range === "CUSTOM" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  aria-label="Start date"
                  value={customStart}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomStart(val);
                    updateUrlParams(business, "CUSTOM", granularity, val, customEnd);
                  }}
                  className="form-input"
                  style={{ height: "30px", fontSize: "0.78rem", padding: "0 0.5rem" }}
                />
                <span className="text-muted text-body-sm">to</span>
                <input
                  type="date"
                  aria-label="End date"
                  value={customEnd}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomEnd(val);
                    updateUrlParams(business, "CUSTOM", granularity, customStart, val);
                  }}
                  className="form-input"
                  style={{ height: "30px", fontSize: "0.78rem", padding: "0 0.5rem" }}
                />
              </div>
            )}

            <span className="text-muted" style={{ margin: "0 0.25rem" }}>
              |
            </span>

            {(["DAILY", "WEEKLY", "MONTHLY"] as const).map((g) => (
              <Button
                key={g}
                size="sm"
                variant={granularity === g ? "secondary" : "outline"}
                onClick={() => handleSelectGranularity(g)}
              >
                {g.charAt(0) + g.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="mb-3">
        <h2 className="m-0 text-title-md font-bold text-primary">{moduleView.title}</h2>
        <p className="m-0 text-body-md text-secondary">{moduleView.description}</p>
      </div>

      <KpiStrip
        columns={4}
        items={moduleView.kpis.map((kpi) => ({
          id: kpi.label,
          label: kpi.label,
          value: loading ? "…" : kpi.value,
          subtext: kpi.subtext,
          icon: kpi.icon,
          accentColor: kpi.accentColor,
        }))}
      />

      <InsightsGrowthChart
        series={moduleView.series}
        title={moduleView.chartTitle}
        color={moduleView.chartColor}
      />

      <Card style={{ marginTop: "1rem", padding: "1rem 1.15rem" }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="m-0 text-title-sm font-semibold text-primary">{moduleView.tableTitle}</h3>
          <span className="text-body-sm text-muted">
            Showing {moduleView.rows.length} records
          </span>
        </div>
        <DataTable
          columns={columns}
          data={moduleView.rows}
          keyExtractor={(r) => r.id}
          loading={loading}
          emptyMessage={`No ${business} records available for the selected range.`}
        />
      </Card>
    </main>
  );
}

export default function BusinessInsightsPage() {
  return (
    <Suspense
      fallback={
        <main className="admin-page">
          <div className="text-muted text-body-lg p-6">Loading Business Insights...</div>
        </main>
      }
    >
      <BusinessInsightsContent />
    </Suspense>
  );
}
