"use client";

import { CalendarDays, RotateCcw, Search } from "lucide-react";

export type CancellationDatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "week"
  | "month"
  | "custom";

interface CancellationFiltersProps {
  datePreset: CancellationDatePreset;
  customDate: string;
  search: string;
  office: string;
  route: string;
  offices: string[];
  routes: string[];
  onDatePresetChange: (value: CancellationDatePreset) => void;
  onCustomDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onOfficeChange: (value: string) => void;
  onRouteChange: (value: string) => void;
  onReset: () => void;
}

const selectStyle: React.CSSProperties = {
  height: 38,
  minWidth: 150,
  padding: "0 11px",
  backgroundColor: "var(--bg-input)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-md)",
  color: "var(--text-secondary)",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
  outlineColor: "var(--border-focus)",
};

export function CancellationFilters(props: CancellationFiltersProps) {
  const {
    datePreset,
    customDate,
    search,
    office,
    route,
    offices,
    routes,
    onDatePresetChange,
    onCustomDateChange,
    onSearchChange,
    onOfficeChange,
    onRouteChange,
    onReset,
  } = props;

  return (
    <section
      className="surface-card"
      aria-label="Filter successful cancellations"
      style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--text-primary)",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        <CalendarDays size={16} color="var(--brand-primary)" />
        Filters
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <label
          style={{ flex: "1 1 235px", minWidth: 210, position: "relative" }}
        >
          <Search
            size={15}
            aria-hidden="true"
            color="var(--text-muted)"
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            type="search"
            aria-label="Search by employee ID, employee name, or booking ID"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search employee or booking..."
            style={{
              ...selectStyle,
              width: "100%",
              paddingLeft: 34,
              fontWeight: 400,
            }}
          />
        </label>

        <label>
          <select
            aria-label="Filter by cancellation date range"
            value={datePreset}
            onChange={(event) =>
              onDatePresetChange(event.target.value as CancellationDatePreset)
            }
            style={selectStyle}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Date</option>
          </select>
        </label>

        {datePreset === "custom" && (
          <label>
            <span className="sr-only">Select cancellation date</span>
            <input
              type="date"
              aria-label="Select cancellation date"
              value={customDate}
              onChange={(event) => onCustomDateChange(event.target.value)}
              style={selectStyle}
            />
          </label>
        )}

        <label>
          <select
            aria-label="Filter by office"
            value={office}
            onChange={(event) => onOfficeChange(event.target.value)}
            style={selectStyle}
          >
            <option value="">All Offices</option>
            {offices.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <select
            aria-label="Filter by route"
            value={route}
            onChange={(event) => onRouteChange(event.target.value)}
            style={{ ...selectStyle, minWidth: 185 }}
          >
            <option value="">All Routes</option>
            {routes.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onReset}
          style={{
            height: 38,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: "0 12px",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)",
            fontFamily: "inherit",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RotateCcw size={14} />
          Reset Filters
        </button>
      </div>
    </section>
  );
}
