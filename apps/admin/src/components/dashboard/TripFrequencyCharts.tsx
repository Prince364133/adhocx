"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "../../lib/api/client";
import { TripFrequencyReport } from "../../lib/api/types";

interface DailyTripFrequency {
  date: string;
  count: number;
}

interface TripFrequencyPanelProps {
  title: string;
  data: DailyTripFrequency[];
  showWeekday: boolean;
  onSelectDay?: (date: string) => void;
  selectedDate?: string | null;
}

const chartWidth = 680;
const chartHeight = 185;
const padding = { top: 16, right: 12, bottom: 38, left: 44 };

function formatDate(date: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatTime(dateTime: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateTime));
}

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

function getMondayDateKey(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const monday = new Date(0);
  monday.setUTCFullYear(year, month - 1, day);
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

function formatWeekRange(start: string, end: string) {
  return `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(
    end,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  )}`;
}

function TripFrequencyPanel({
  title,
  data,
  showWeekday,
  onSelectDay,
  selectedDate,
}: TripFrequencyPanelProps) {
  const total = data.reduce((sum, day) => sum + day.count, 0);
  const chartAreaWidth = chartWidth - padding.left - padding.right;
  const chartAreaHeight = chartHeight - padding.top - padding.bottom;
  const maxCount = Math.max(3, ...data.map((day) => day.count));
  const ticks = [0, Math.ceil(maxCount / 2), maxCount];
  const slotWidth = chartAreaWidth / data.length;
  const labelStep = data.length <= 7 ? 1 : 5;
  const points = data.map((day, index) => ({
    x: padding.left + index * slotWidth + slotWidth / 2,
    y: padding.top + chartAreaHeight - (day.count / maxCount) * chartAreaHeight,
  }));
  const linePath = points
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x},${y}`)
    .join(" ");

  return (
    <section
      className="min-w-0 bg-surface border rounded-xl shadow-card"
      style={{ padding: "1.2rem 1.15rem 1rem" }}
    >
      <div className="flex justify-between items-start gap-relaxed">
        <div>
          <h3 className="m-0 text-title-sm font-bold text-primary">{title}</h3>
          <p
            className="text-label text-secondary"
            style={{ margin: "0.16rem 0 0" }}
          >
            Number of trips created per day; this is not a unique-cab count.
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <div
            className="text-title-lg font-bold text-brand tabular-nums"
            style={{ lineHeight: 1.15 }}
          >
            {total.toLocaleString()}
          </div>
          <div className="mt-snug text-muted" style={{ fontSize: "0.67rem" }}>
            total trips
          </div>
        </div>
      </div>

      <div
        className="w-full mt-4"
        style={{ overflowX: data.length > 10 ? "auto" : "hidden" }}
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          role="img"
          aria-label={`${title}: ${total} total trips`}
          className="block w-full"
          style={{
            minWidth: data.length > 10 ? 480 : undefined,
            height: "auto",
          }}
        >
          {ticks.map((tick, index) => {
            const y =
              padding.top +
              chartAreaHeight -
              (tick / maxCount) * chartAreaHeight;
            return (
              <g key={`${tick}-${index}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeDasharray={tick === 0 ? undefined : "4 4"}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--text-muted)"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {data.map((day, index) => {
            const point = points[index];
            const shouldShowLabel =
              index % labelStep === 0 || index === data.length - 1;
            const label = showWeekday
              ? formatDate(day.date, { weekday: "short" })
              : formatDate(day.date, { day: "numeric" });
            const isSelected = selectedDate === day.date;

            return (
              <g
                key={day.date}
                role={onSelectDay ? "button" : undefined}
                tabIndex={onSelectDay ? 0 : undefined}
                aria-label={
                  onSelectDay
                    ? `${formatDate(day.date, { dateStyle: "medium" })}: ${day.count} trips`
                    : undefined
                }
                aria-pressed={onSelectDay ? isSelected : undefined}
                onClick={onSelectDay ? () => onSelectDay(day.date) : undefined}
                onKeyDown={
                  onSelectDay
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectDay(day.date);
                        }
                      }
                    : undefined
                }
                style={
                  onSelectDay
                    ? { cursor: "pointer", outline: "none" }
                    : undefined
                }
              >
                <rect
                  x={point.x - slotWidth / 2}
                  y={padding.top}
                  width={slotWidth}
                  height={chartAreaHeight}
                  fill="transparent"
                  pointerEvents={onSelectDay ? "all" : "none"}
                >
                  <title>{`${formatDate(day.date, { dateStyle: "medium" })}: ${day.count} trips`}</title>
                </rect>
                {shouldShowLabel && (
                  <text
                    x={point.x}
                    y={chartHeight - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill={
                      isSelected
                        ? "var(--brand-secondary)"
                        : "var(--text-muted)"
                    }
                    fontWeight={isSelected ? 800 : 400}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
          <path
            d={linePath}
            fill="none"
            stroke="var(--text-brand)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
          {points.map((point, index) => (
            <circle
              key={`point-${data[index].date}`}
              cx={point.x}
              cy={point.y}
              r={selectedDate === data[index].date ? 5 : 3.5}
              fill={
                selectedDate === data[index].date
                  ? "var(--brand-secondary)"
                  : "var(--text-brand)"
              }
              pointerEvents="none"
            />
          ))}
        </svg>
      </div>
    </section>
  );
}

function TripStatusBars({
  statuses,
}: {
  statuses: TripFrequencyReport["statusBreakdown"];
}) {
  const maxCount = Math.max(1, ...statuses.map(({ count }) => count));

  if (statuses.length === 0) return null;

  return (
    <div
      aria-label="Trips by status"
      className="flex flex-wrap mt-4 bg-base border border-subtle rounded-lg"
      style={{ gap: "0.75rem 1.25rem", padding: "0.85rem 1rem" }}
    >
      {statuses.map(({ status, count }) => (
        <div key={status} className="min-w-0" style={{ flex: "1 1 130px" }}>
          <div className="flex justify-between gap-2 mb-tight">
            <span className="overflow-hidden text-ellipsis whitespace-nowrap text-caption font-bold text-secondary">
              {status.replaceAll("_", " ")}
            </span>
            <strong className="text-caption text-primary">
              {count.toLocaleString()}
            </strong>
          </div>
          <div
            role="img"
            aria-label={`${status.replaceAll("_", " ")}: ${count} trips`}
            className="overflow-hidden rounded-full"
            style={{ height: "0.45rem", background: "var(--border-subtle)" }}
          >
            <div
              className="h-full bg-brand"
              style={{
                width: `${(count / maxCount) * 100}%`,
                borderRadius: "inherit",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TripDayReport({
  report,
  loading,
  error,
}: {
  report: TripFrequencyReport | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <p aria-live="polite" className="text-secondary text-base">
        Loading selected-day report…
      </p>
    );
  }
  if (error) {
    return (
      <p
        role="alert"
        className="text-base"
        style={{ color: "var(--color-error)" }}
      >
        {error}
      </p>
    );
  }
  if (!report?.selectedDay || !report.selectedDayTrips) return null;

  return (
    <div
      className="border-t border-subtle"
      style={{ marginTop: "1.15rem", paddingTop: "1.15rem" }}
    >
      <div className="flex flex-wrap justify-between gap-2 mb-3">
        <h4
          className="m-0 font-bold text-primary"
          style={{ fontSize: "1.04rem" }}
        >
          Report for {formatDate(report.selectedDay, { dateStyle: "long" })}
        </h4>
        <span className="text-body-sm text-secondary">
          {report.selectedDayTotal}{" "}
          {report.selectedDayTotal === 1 ? "trip" : "trips"}
          {report.selectedDayTotal !== null &&
          report.selectedDayTotal > report.selectedDayTrips.length
            ? ` · showing latest ${report.selectedDayTrips.length}`
            : ""}
        </span>
      </div>
      {report.selectedDayTrips.length === 0 ? (
        <p className="m-0 text-muted text-base">
          No trips were created on this day.
        </p>
      ) : (
        <div className="grid gap-2">
          {report.selectedDayTrips.map((trip) => (
            <div
              key={trip.id}
              className="grid p-3 bg-base border border-subtle rounded-md"
              style={{
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: "0.25rem 1rem",
              }}
            >
              <strong className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base text-primary">
                {trip.pickupAddress} → {trip.dropAddress}
              </strong>
              <span className="text-sm text-secondary">
                {trip.status.replaceAll("_", " ")}
              </span>
              <span className="text-sm text-muted">
                {trip.driver.fullName} · {trip.vehicleType}
              </span>
              <span className="text-sm text-muted">
                {formatTime(trip.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripFrequencyCharts() {
  const today = new Date();
  const [weeklyAnchorDate, setWeeklyAnchorDate] = useState(
    getIndiaDateInputValue,
  );
  const [weeklySelectedDate, setWeeklySelectedDate] = useState<string | null>(
    null,
  );
  const [weeklyReport, setWeeklyReport] = useState<TripFrequencyReport | null>(
    null,
  );
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklyDayLoading, setWeeklyDayLoading] = useState(false);
  const [weeklyDayError, setWeeklyDayError] = useState<string | null>(null);
  const [year, setYear] = useState(today.getUTCFullYear());
  const [month, setMonth] = useState(today.getUTCMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthlyReport, setMonthlyReport] =
    useState<TripFrequencyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayReportLoading, setDayReportLoading] = useState(false);
  const [dayReportError, setDayReportError] = useState<string | null>(null);

  const selectedWeekStart = getMondayDateKey(weeklyAnchorDate);
  const selectedWeekEndDate = new Date(`${selectedWeekStart}T00:00:00Z`);
  selectedWeekEndDate.setUTCDate(selectedWeekEndDate.getUTCDate() + 6);
  const selectedWeek = {
    start: selectedWeekStart,
    end: selectedWeekEndDate.toISOString().slice(0, 10),
  };

  useEffect(() => {
    if (!selectedWeekStart) return;
    let active = true;
    setWeeklyLoading(true);
    setWeeklyError(null);
    setWeeklyReport(null);
    setWeeklySelectedDate(null);

    adminApi
      .getWeeklyTripFrequencyReport(selectedWeekStart)
      .then((report) => {
        if (active) setWeeklyReport(report);
      })
      .catch(() => {
        if (active)
          setWeeklyError(
            "Could not load the trip report for this week. Please try again.",
          );
      })
      .finally(() => {
        if (active) setWeeklyLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedWeekStart]);

  useEffect(() => {
    if (!weeklySelectedDate || !selectedWeekStart) return;
    let active = true;
    setWeeklyDayLoading(true);
    setWeeklyDayError(null);

    adminApi
      .getWeeklyTripFrequencyReport(selectedWeekStart, weeklySelectedDate)
      .then((report) => {
        if (active) setWeeklyReport(report);
      })
      .catch(() => {
        if (active)
          setWeeklyDayError(
            "Could not load the selected day report. Please try again.",
          );
      })
      .finally(() => {
        if (active) setWeeklyDayLoading(false);
      });

    return () => {
      active = false;
    };
  }, [weeklySelectedDate, selectedWeekStart]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setMonthlyReport(null);
    setSelectedDate(null);

    adminApi
      .getTripFrequencyReport(year, month)
      .then((report) => {
        if (active) setMonthlyReport(report);
      })
      .catch(() => {
        if (active)
          setError(
            "Could not load the trip report for this month. Please try again.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [year, month]);

  useEffect(() => {
    if (!selectedDate) return;
    let active = true;
    setDayReportLoading(true);
    setDayReportError(null);
    const day = Number(selectedDate.slice(-2));

    adminApi
      .getTripFrequencyReport(year, month, day)
      .then((report) => {
        if (active) setMonthlyReport(report);
      })
      .catch(() => {
        if (active)
          setDayReportError(
            "Could not load the selected day report. Please try again.",
          );
      })
      .finally(() => {
        if (active) setDayReportLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedDate, year, month]);

  const weeklyTrips = weeklyReport?.dailyTrips ?? [];
  const monthNames = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(undefined, {
      month: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2020, index, 1))),
  );
  const monthlyTrips = monthlyReport?.dailyTrips ?? [];

  return (
    <div
      className="grid mt-snug"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
        gap: "1.15rem",
      }}
    >
      <section
        className="min-w-0 bg-surface border rounded-xl shadow-card"
        style={{ padding: "1.2rem 1.15rem 1rem" }}
      >
        <div className="flex flex-wrap justify-between items-start gap-relaxed">
          <div>
            <h3 className="m-0 text-title-sm font-bold text-primary">
              Weekly Cab Usage
            </h3>
            <p
              className="text-label text-secondary"
              style={{ margin: "0.2rem 0 0" }}
            >
              Daily trip counts for Monday through Sunday. Select a bar for that
              day&apos;s trips.
            </p>
          </div>
          <div className="flex flex-wrap gap-snug items-center">
            <label className="flex items-center gap-tight text-secondary text-label">
              <span>Choose date</span>
              <input
                aria-label="Choose date for weekly cab usage"
                type="date"
                value={weeklyAnchorDate}
                max={getIndiaDateInputValue()}
                onChange={(event) => {
                  if (event.target.value)
                    setWeeklyAnchorDate(event.target.value);
                }}
                className="border rounded-md bg-base text-primary text-control"
                style={{ padding: "0.3rem 0.45rem" }}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-relaxed mt-3">
          <div
            className="bg-base rounded-md"
            style={{ padding: "0.52rem 0.72rem" }}
          >
            <div
              className="text-muted font-bold uppercase"
              style={{ fontSize: "0.65rem" }}
            >
              Cab trips this week
            </div>
            <div
              aria-live="polite"
              className="mt-snug text-brand font-extrabold"
              style={{ fontSize: "1.02rem" }}
            >
              {weeklyLoading
                ? "…"
                : (weeklyReport?.totalTrips ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
        {!weeklyLoading && weeklyReport && (
          <TripStatusBars statuses={weeklyReport.statusBreakdown} />
        )}

        {weeklyError ? (
          <p
            role="alert"
            className="mt-4 text-base"
            style={{ color: "var(--color-error)" }}
          >
            {weeklyError}
          </p>
        ) : weeklyLoading ? (
          <p aria-live="polite" className="mt-4 text-secondary text-base">
            Loading weekly trip report…
          </p>
        ) : selectedWeek ? (
          <>
            <div className="w-full overflow-x-auto mt-4">
              <div style={{ minWidth: 420 }}>
                <TripFrequencyPanel
                  title={`Trips ${formatWeekRange(selectedWeek.start, selectedWeek.end)}`}
                  data={weeklyTrips}
                  showWeekday
                  onSelectDay={setWeeklySelectedDate}
                  selectedDate={weeklySelectedDate}
                />
              </div>
            </div>
            <TripDayReport
              report={weeklyReport}
              loading={weeklyDayLoading}
              error={weeklyDayError}
            />
          </>
        ) : null}
      </section>
      <section
        className="min-w-0 bg-surface border rounded-xl shadow-card"
        style={{ padding: "1.2rem 1.15rem 1rem" }}
      >
        <div className="flex flex-wrap justify-between items-start gap-relaxed">
          <div>
            <h3 className="m-0 text-title-sm font-bold text-primary">
              Monthly Trip Report
            </h3>
            <p
              className="text-label text-secondary"
              style={{ margin: "0.2rem 0 0" }}
            >
              Select a month and year; select a bar for its trip report.
            </p>
          </div>
          <div className="flex gap-snug">
            <label className="flex items-center gap-tight text-secondary text-label">
              <span>Month</span>
              <select
                aria-label="Report month"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                className="border rounded-md bg-base text-primary text-control"
                style={{ padding: "0.3rem 0.45rem" }}
              >
                {monthNames.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-tight text-secondary text-label">
              <span>Year</span>
              <input
                aria-label="Report year"
                type="number"
                min={1}
                max={9999}
                step={1}
                value={year}
                onChange={(event) => {
                  if (event.target.value === "") return;
                  const nextYear = Number(event.target.value);
                  if (
                    Number.isInteger(nextYear) &&
                    nextYear >= 1 &&
                    nextYear <= 9999
                  )
                    setYear(nextYear);
                }}
                className="border rounded-md bg-base text-primary text-control"
                style={{ width: "4.8rem", padding: "0.3rem 0.45rem" }}
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-relaxed mt-3">
          <div
            className="bg-base rounded-md"
            style={{ padding: "0.52rem 0.72rem" }}
          >
            <div
              className="text-muted font-bold uppercase"
              style={{ fontSize: "0.65rem" }}
            >
              Trips this month
            </div>
            <div
              aria-live="polite"
              className="mt-snug text-brand font-extrabold"
              style={{ fontSize: "1.02rem" }}
            >
              {loading
                ? "…"
                : (monthlyReport?.totalTrips ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-4 text-base"
            style={{ color: "var(--color-error)" }}
          >
            {error}
          </p>
        ) : loading ? (
          <p aria-live="polite" className="mt-4 text-secondary text-base">
            Loading monthly trip report…
          </p>
        ) : (
          <>
            <div className="w-full overflow-x-auto mt-4">
              <div style={{ minWidth: 480 }}>
                <TripFrequencyPanel
                  title={`${monthNames[month - 1]} ${year}`}
                  data={monthlyTrips}
                  showWeekday={false}
                  onSelectDay={setSelectedDate}
                  selectedDate={selectedDate}
                />
              </div>
            </div>
            <TripDayReport
              report={monthlyReport}
              loading={dayReportLoading}
              error={dayReportError}
            />
          </>
        )}
      </section>
    </div>
  );
}
