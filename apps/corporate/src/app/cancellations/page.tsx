"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarX, CheckCircle2, Info } from "lucide-react";
import {
  CancellationFilters,
  CancellationDatePreset,
} from "./components/CancellationFilters";
import {
  CancellationMetric,
  CancellationSummaryCards,
} from "./components/CancellationSummaryCards";
import { CancellationTable } from "./components/CancellationTable";
import { ErrorState } from "../../components/common/StateViews";
import { useSession } from "../../lib/auth/SessionContext";
import {
  CancellationRecord,
  cancellationsApi,
  getIndiaDateKey,
  getWeekStartDateKey,
  shiftDateKey,
} from "../../lib/api/cancellations";

const DEFAULT_TENANT_ID = "9d66820f-280c-400c-98dc-e021d0045b58";

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
  record: CancellationRecord,
  preset: CancellationDatePreset,
  customDate: string,
  today: string,
): boolean {
  const date = getIndiaDateKey(new Date(record.cancelledAt));

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

export default function CancellationRequestsPage() {
  const { tenantId, offices } = useSession();
  const activeTenantId = tenantId || DEFAULT_TENANT_ID;
  const [records, setRecords] = useState<CancellationRecord[]>([]);
  const [source, setSource] = useState<"api" | "sample">("api");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [datePreset, setDatePreset] = useState<CancellationDatePreset>("all");
  const [customDate, setCustomDate] = useState("");
  const [search, setSearch] = useState("");
  const [office, setOffice] = useState("");
  const [route, setRoute] = useState("");

  const loadCancellations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await cancellationsApi.list(activeTenantId);
      setRecords(result.records);
      setSource(result.source);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [activeTenantId]);

  useEffect(() => {
    void loadCancellations();
  }, [loadCancellations]);

  const today = getIndiaDateKey(new Date());
  const counts = useMemo(
    () => ({
      all: records.length,
      today: records.filter((record) =>
        isWithinPreset(record, "today", "", today),
      ).length,
      week: records.filter((record) =>
        isWithinPreset(record, "week", "", today),
      ).length,
      month: records.filter((record) =>
        isWithinPreset(record, "month", "", today),
      ).length,
    }),
    [records, today],
  );

  const routeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          records.map(
            (record) => `${record.pickupLocation} → ${record.dropLocation}`,
          ),
        ),
      ).sort(),
    [records],
  );
  const officeOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...offices.map((item) => item.name),
          ...records.map((record) => record.officeName),
        ]),
      ).sort(),
    [offices, records],
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return records.filter((record) => {
      if (!isWithinPreset(record, datePreset, customDate, today)) return false;
      if (office && record.officeName !== office) return false;
      if (
        route &&
        `${record.pickupLocation} → ${record.dropLocation}` !== route
      )
        return false;
      if (!query) return true;
      return [record.employeeId, record.employeeName, record.bookingId].some(
        (value) => value.toLocaleLowerCase().includes(query),
      );
    });
  }, [records, datePreset, customDate, today, office, route, search]);

  const selectMetric = (metric: CancellationMetric) => {
    const preset: CancellationDatePreset = metric === "all" ? "all" : metric;
    setDatePreset(preset);
    setCustomDate("");
  };

  const resetFilters = () => {
    setDatePreset("all");
    setCustomDate("");
    setSearch("");
    setOffice("");
    setRoute("");
  };

  const activeMetric = getMetricForPreset(datePreset);
  const emptyMessage =
    datePreset === "custom"
      ? "No successful cancellations found for the selected date."
      : "No successful cancellations found for the selected date range.";

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
            View employee bookings that were cancelled successfully.
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
          Successful only
        </span>
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
            12-hour cancellation policy
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
            Automatic cancellation is successful only when submitted at least 12
            hours before scheduled pickup. Later requests are not treated as
            automatically successful.
          </p>
        </div>
      </section>

      {source === "sample" && !error && (
        <section
          role="status"
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
            <strong style={{ color: "var(--text-primary)" }}>
              Sample data
            </strong>
            {" — "}The live cancellations endpoint is not available yet. These
            example records will be replaced when backend support is added.
          </p>
        </section>
      )}

      {error ? (
        <ErrorState error={error} onRetry={() => void loadCancellations()} />
      ) : (
        <>
          <CancellationSummaryCards
            counts={counts}
            activeMetric={activeMetric}
            loading={loading}
            onSelect={selectMetric}
          />

          <CancellationFilters
            datePreset={datePreset}
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
