"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarX, CheckCircle2, Info, RefreshCw } from "lucide-react";
import { CancellationFilters } from "./components/CancellationFilters";
import type {
  CancellationDatePreset,
  EmployeeStatusFilter,
} from "./components/CancellationFilters";
import { CancellationSummaryCards } from "./components/CancellationSummaryCards";
import type { CancellationMetric } from "./components/CancellationSummaryCards";
import {
  CancellationTable,
  getEntryLocations,
} from "./components/CancellationTable";
import type { CancellationTableEntry } from "./components/CancellationTable";
import { ErrorState } from "../../components/common/StateViews";
import { useSession } from "../../lib/auth/SessionContext";
import { routesApi } from "../../lib/api/corporate";
import { cancellationsApi } from "../../lib/api/cancellations";
import type { BookingRequestItem, RouteListItem } from "../../lib/api/types";

const ROUTES_PAGE_SIZE = 1000;
const CANCELLATIONS_PAGE_SIZE = 100;

function getIndiaDateKey(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getWeekStartDateKey(dateKey: string): string {
  const day = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return shiftDateKey(dateKey, -((day + 6) % 7));
}

function getMetricForPreset(
  preset: CancellationDatePreset,
): CancellationMetric | null {
  if (preset === "all") return "all";
  if (preset === "today") return "today";
  if (preset === "week") return "week";
  if (preset === "month") return "month";
  return null;
}

function isWithinPreset(
  dateValue: string,
  preset: CancellationDatePreset,
  customDate: string,
  today: string,
): boolean {
  const date = getIndiaDateKey(new Date(dateValue));
  if (!date) return false;

  switch (preset) {
    case "today":
      return date === today;
    case "yesterday":
      return date === shiftDateKey(today, -1);
    case "last7":
      return date >= shiftDateKey(today, -6) && date <= today;
    case "last30":
      return date >= shiftDateKey(today, -29) && date <= today;
    case "week":
      return date >= getWeekStartDateKey(today) && date <= today;
    case "month":
      return date.startsWith(today.slice(0, 7));
    case "custom":
      return Boolean(customDate) && date === customDate;
    case "all":
      return true;
  }
}

async function loadAllCancellations(tenantId: string): Promise<BookingRequestItem[]> {
  const firstPage = await cancellationsApi.list(tenantId, {
    page: 1,
    limit: CANCELLATIONS_PAGE_SIZE,
  });
  const records = [...firstPage.items];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const result = await cancellationsApi.list(tenantId, {
      page,
      limit: CANCELLATIONS_PAGE_SIZE,
    });
    records.push(...result.items);
  }

  return records;
}

async function loadRoutesWithNoShows(tenantId: string): Promise<RouteListItem[]> {
  const noShowRoutes: RouteListItem[] = [];
  let offset = 0;

  while (true) {
    const routes = await routesApi.list(tenantId, {
      includeStops: true,
      limit: ROUTES_PAGE_SIZE,
      offset,
    });
    noShowRoutes.push(
      ...routes.filter((route) =>
        route.stops?.some((stop) => stop.status === "NO_SHOW"),
      ),
    );
    if (routes.length < ROUTES_PAGE_SIZE) return noShowRoutes;
    offset += ROUTES_PAGE_SIZE;
  }
}

export default function CancellationRequestsPage() {
  const { tenantId, offices, status: sessionStatus } = useSession();
  const [records, setRecords] = useState<BookingRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState<CancellationDatePreset>("all");
  const [employeeStatus, setEmployeeStatus] =
    useState<EmployeeStatusFilter>("all");
  const [customDate, setCustomDate] = useState("");
  const [search, setSearch] = useState("");
  const [office, setOffice] = useState("");
  const [route, setRoute] = useState("");
  const [noShowRoutes, setNoShowRoutes] = useState<RouteListItem[]>([]);

  const loadCancellations = useCallback(async () => {
    if (!tenantId) {
      setError(new Error("Your session is not associated with a corporate tenant."));
      setRecords([]);
      setNoShowRoutes([]);
      setRouteError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setRouteError(null);
    try {
      const [recordsResult, routesResult] = await Promise.allSettled([
        loadAllCancellations(tenantId),
        loadRoutesWithNoShows(tenantId),
      ]);
      if (recordsResult.status === "rejected") throw recordsResult.reason;
      setRecords(recordsResult.value);
      if (routesResult.status === "fulfilled") {
        setNoShowRoutes(routesResult.value);
      } else {
        setNoShowRoutes([]);
        setRouteError(
          routesResult.reason instanceof Error
            ? routesResult.reason.message
            : "The routes API returned an unexpected error.",
        );
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    void loadCancellations();
  }, [loadCancellations, sessionStatus]);

  const today = getIndiaDateKey(new Date());
  const counts = useMemo(
    () => ({
      all: records.length,
      today: records.filter((record) =>
        isWithinPreset(record.updatedAt, "today", "", today),
      ).length,
      week: records.filter((record) =>
        isWithinPreset(record.updatedAt, "week", "", today),
      ).length,
      month: records.filter((record) =>
        isWithinPreset(record.updatedAt, "month", "", today),
      ).length,
    }),
    [records, today],
  );
  const absentTodayCount = useMemo(
    () =>
      noShowRoutes.reduce((count, routeItem) => {
        if (!isWithinPreset(routeItem.shiftDate, "today", "", today)) {
          return count;
        }
        return (
          count +
          (routeItem.stops ?? []).filter((stop) => stop.status === "NO_SHOW")
            .length
        );
      }, 0),
    [noShowRoutes, today],
  );

  const routeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...records.map((record) => {
              const entry: CancellationTableEntry = {
                kind: "cancelled",
                record,
              };
              const [pickupLocation, dropLocation] = getEntryLocations(entry);
              return `${pickupLocation} → ${dropLocation}`;
            }),
            ...noShowRoutes.flatMap((route) =>
              (route.stops ?? [])
                .filter((stop) => stop.status === "NO_SHOW")
                .map((stop) => {
                  const entry: CancellationTableEntry = {
                    kind: "absent",
                    route,
                    stop,
                  };
                  const [pickupLocation, dropLocation] =
                    getEntryLocations(entry);
                  return `${pickupLocation} → ${dropLocation}`;
                }),
            ),
          ],
        ),
      ).sort(),
    [records, noShowRoutes],
  );
  const officeOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...offices.map((item) => item.name),
          ...records.map((record) => record.roster?.office?.name ?? ""),
          ...noShowRoutes.map((route) => route.office?.name ?? ""),
        ].filter(Boolean)),
      ).sort(),
    [offices, records, noShowRoutes],
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const entries: CancellationTableEntry[] = [
      ...(employeeStatus === "absent"
        ? []
        : records.map((record) => ({ kind: "cancelled" as const, record }))),
      ...(employeeStatus === "cancelled"
        ? []
        : noShowRoutes.flatMap((routeItem) =>
            (routeItem.stops ?? [])
              .filter((stop) => stop.status === "NO_SHOW")
              .map((stop) => ({
                kind: "absent" as const,
                route: routeItem,
                stop,
              })),
          )),
    ];

    return entries.filter((entry) => {
      const dateValue =
        entry.kind === "cancelled"
          ? entry.record.updatedAt
          : entry.route.shiftDate;
      if (!isWithinPreset(dateValue, datePreset, customDate, today))
        return false;

      const officeName =
        entry.kind === "cancelled"
          ? entry.record.roster?.office?.name ?? ""
          : entry.route.office?.name ?? "";
      if (office && officeName !== office) return false;

      const [pickupLocation, dropLocation] = getEntryLocations(entry);
      if (
        route &&
        `${pickupLocation} → ${dropLocation}` !== route
      ) {
        return false;
      }

      if (!query) return true;
      const searchValues =
        entry.kind === "cancelled"
          ? [
              entry.record.employee?.employeeCode ?? "",
              entry.record.employee?.fullName ?? "",
              entry.record.id,
            ]
          : [
              entry.stop.employee?.employeeCode ?? "",
              entry.stop.employeeName ?? entry.stop.employee?.fullName ?? "",
              entry.stop.transportRequest?.id ?? "",
            ];
      return searchValues.some((value) =>
        value.toLocaleLowerCase().includes(query),
      );
    });
  }, [
    records,
    noShowRoutes,
    employeeStatus,
    datePreset,
    customDate,
    today,
    office,
    route,
    search,
  ]);

  const selectMetric = (metric: CancellationMetric) => {
    const preset: CancellationDatePreset = metric === "all" ? "all" : metric;
    setDatePreset(preset);
    setCustomDate("");
  };

  const resetFilters = () => {
    setDatePreset("all");
    setEmployeeStatus("all");
    setCustomDate("");
    setSearch("");
    setOffice("");
    setRoute("");
  };

  const activeMetric = getMetricForPreset(datePreset);
  const emptyMessage =
    employeeStatus === "absent"
      ? "No employees marked absent were found for the selected filters."
      : employeeStatus === "cancelled"
      ? "No cancelled requests were found for the selected filters."
        : datePreset === "custom"
          ? "No requests found for the selected date."
          : "No requests found for the selected filters.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            aria-hidden="true"
            style={{
              width: 46,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              borderRadius: "var(--radius-xl)",
              backgroundColor: "var(--brand-primary-subtle)",
              color: "var(--brand-primary)",
            }}
          >
            <CalendarX size={22} />
          </div>
          <div>
            <h1
              style={{
                fontSize: 25,
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
                lineHeight: 1.2,
              }}
            >
              Cancellation Requests
            </h1>
          </div>
          <p
            style={{
              marginTop: 5,
              fontSize: 13,
              color: "var(--text-secondary)",
            }}
          >
            View cancelled bookings and employees marked absent.
          </p>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "7px 11px",
            border: "1px solid var(--color-success-border)",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--color-success-bg)",
            color: "var(--color-success)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <CheckCircle2 size={14} />
          Cancellations & absences
        </span>
        <button
          type="button"
          onClick={() => void loadCancellations()}
          disabled={loading}
          aria-label="Refresh cancellation and absence records"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </header>

      <section
        role="note"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          border: "1px solid var(--border-subtle)",
          borderLeft: "3px solid var(--brand-primary)",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "var(--bg-surface)",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--brand-primary-subtle)",
            color: "var(--brand-primary)",
          }}
        >
          <Info size={17} />
        </span>
        <div>
          <h2
            style={{
              marginBottom: 2,
              color: "var(--text-primary)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Cancellation timing
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            Cancellation eligibility is validated by the Corporate API. Date
            filters use the last-updated time for cancellations and the
            scheduled route date for absences.
          </p>
        </div>
      </section>

      {routeError !== null && !error && (
        <section
          role="alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "12px 15px",
            border: "1px solid var(--color-warning-border)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-warning-bg)",
            color: "var(--text-secondary)",
            fontSize: 12,
          }}
        >
          <Info
            size={16}
            aria-hidden="true"
            color="var(--color-warning)"
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <p>
            Absence records could not be loaded: {routeError}.
            {" "}Cancelled requests are still available.
          </p>
        </section>
      )}

      {error ? (
        <ErrorState error={error} onRetry={() => void loadCancellations()} />
      ) : (
        <>
          <CancellationSummaryCards
            counts={counts}
            absentTodayCount={routeError ? null : absentTodayCount}
            activeMetric={activeMetric}
            loading={loading}
            onSelect={selectMetric}
          />

          <CancellationFilters
            datePreset={datePreset}
            employeeStatus={employeeStatus}
            customDate={customDate}
            search={search}
            office={office}
            route={route}
            offices={officeOptions}
            routes={routeOptions}
            onDatePresetChange={(value) => {
              setDatePreset(value);
              if (value !== "custom") setCustomDate("");
            }}
            onEmployeeStatusChange={setEmployeeStatus}
            onCustomDateChange={setCustomDate}
            onSearchChange={setSearch}
            onOfficeChange={setOffice}
            onRouteChange={setRoute}
            onReset={resetFilters}
          />

          <CancellationTable
            records={filteredRecords}
            loading={loading}
            emptyMessage={emptyMessage}
          />
        </>
      )}
    </div>
  );
}
