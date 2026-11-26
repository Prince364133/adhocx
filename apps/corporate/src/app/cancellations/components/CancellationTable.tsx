"use client";

import { XCircle } from "lucide-react";
import { EmptyState } from "../../../components/common/StateViews";
import type {
  BookingRequestItem,
  RouteListItem,
  RouteStop,
} from "../../../lib/api/types";

export type CancellationTableEntry =
  | { kind: "cancelled"; record: BookingRequestItem }
  | { kind: "absent"; route: RouteListItem; stop: RouteStop };

export function getEntryLocations(
  entry: CancellationTableEntry,
): [string, string] {
  if (entry.kind === "cancelled") {
    const office = entry.record.roster?.office?.name ?? "Office";
    return entry.record.direction === "LOGIN"
      ? ["Employee pickup", office]
      : [office, "Employee drop-off"];
  }

  const employeeLocation =
    entry.stop.addressText ?? entry.stop.locationName ?? "Location unavailable";
  const officeLocation = entry.route.office?.name ?? "Office";
  return entry.route.direction === "LOGIN"
    ? [employeeLocation, officeLocation]
    : [officeLocation, employeeLocation];
}

interface CancellationTableProps {
  records: CancellationTableEntry[];
  loading: boolean;
  emptyMessage: string;
}

const columns = [
  "Employee ID",
  "Employee Name",
  "Booking ID",
  "Route",
  "Office",
  "Travel Date",
  "Shift Time",
  "Direction",
  "Last Updated",
  "Employee Status",
];

function formatIndiaDate(date: string): string {
  const value = date.includes("T")
    ? new Date(date)
    : new Date(`${date.slice(0, 10)}T00:00:00+05:30`);
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function formatIndiaTime(date: string): string {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function SkeletonRows() {
  return (
    <div aria-label="Loading cancellation records" role="status">
      {Array.from({ length: 5 }, (_, row) => (
        <div
          key={row}
          style={{
            minWidth: 1120,
            height: 58,
            display: "grid",
            gridTemplateColumns: "repeat(10, minmax(100px, 1fr))",
            alignItems: "center",
            gap: 12,
            padding: "0 14px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {columns.map((column, index) => (
            <span
              key={`${column}-${index}`}
              style={{
                width: index === 1 ? "82%" : "62%",
                height: 12,
                borderRadius: 6,
                backgroundColor: "var(--bg-surface-muted)",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CancellationTable({
  records,
  loading,
  emptyMessage,
}: CancellationTableProps) {
  return (
    <section
      className="surface-card"
      id="cancellation-records"
      aria-label="Cancellation and absence records"
      style={{ overflow: "hidden" }}
    >
      <div
        style={{
          padding: "18px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Employee trip history
          </h2>
          <p style={{ marginTop: 3, fontSize: 12, color: "var(--text-muted)" }}>
            Cancelled requests and employees marked absent
          </p>
        </div>
        <span
          aria-live="polite"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 10px",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--bg-surface-muted)",
            color: "var(--text-secondary)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {loading
            ? "Loading…"
            : `${records.length} ${records.length === 1 ? "record" : "records"}`}
        </span>
      </div>

      {loading ? (
        <div style={{ overflowX: "auto" }}>
          <SkeletonRows />
        </div>
      ) : records.length === 0 ? (
        <div style={{ padding: 20 }}>
          <EmptyState
            title="No matching employee trips found"
            message={emptyMessage}
          />
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 1120,
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: 12,
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--bg-surface-muted)",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                {columns.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    style={{
                      padding: "12px 14px",
                      color: "var(--text-secondary)",
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.035em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((entry) => {
                const isCancellation = entry.kind === "cancelled";
                const employeeId = isCancellation
                  ? entry.record.employee?.employeeCode ?? "—"
                  : entry.stop.employee?.employeeCode ?? "—";
                const employeeName = isCancellation
                  ? entry.record.employee?.fullName ?? "—"
                  : entry.stop.employeeName ??
                    entry.stop.employee?.fullName ??
                    "—";
                const bookingId = isCancellation
                  ? entry.record.id
                  : entry.stop.transportRequest?.id ?? "—";
                const [pickupLocation, dropLocation] = getEntryLocations(entry);
                const officeName = isCancellation
                  ? entry.record.roster?.office?.name ?? "—"
                  : entry.route.office?.name ?? "—";
                const travelDate = isCancellation
                  ? entry.record.scheduledDate
                  : entry.route.shiftDate;
                const pickupTime = isCancellation
                  ? entry.record.shiftTime
                  : entry.stop.plannedEta ??
                    entry.stop.plannedTime ??
                    entry.route.targetPickup1Time;
                const lastUpdated = isCancellation
                  ? entry.record.updatedAt
                  : null;
                const direction = isCancellation
                  ? entry.record.direction
                  : entry.route.direction;

                return (
                  <tr
                    key={
                      entry.kind === "cancelled"
                        ? `cancelled-${entry.record.id}`
                        : `absent-${entry.route.id}-${entry.stop.id}`
                    }
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                      <span className="code-tag">{employeeId}</span>
                    </td>
                    <td
                      style={{
                        padding: "13px 14px",
                        minWidth: 150,
                        color: "var(--text-primary)",
                        fontWeight: 600,
                      }}
                    >
                      {employeeName}
                    </td>
                    <td
                      style={{
                        padding: "13px 14px",
                        whiteSpace: "nowrap",
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      {bookingId}
                    </td>
                    <td
                      style={{
                        padding: "13px 14px",
                        minWidth: 190,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span>{pickupLocation}</span>
                      <span
                        aria-hidden="true"
                        style={{
                          padding: "0 5px",
                          color: "var(--text-muted)",
                        }}
                      >
                        →
                      </span>
                      <span>{dropLocation}</span>
                    </td>
                    <td
                      style={{
                        padding: "13px 14px",
                        minWidth: 150,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {officeName}
                    </td>
                    <td
                      style={{
                        padding: "13px 14px",
                        whiteSpace: "nowrap",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {formatIndiaDate(travelDate)}
                    </td>
                    <td
                      style={{
                        padding: "13px 14px",
                        whiteSpace: "nowrap",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {pickupTime}
                    </td>
                    <td
                      style={{
                        padding: "13px 14px",
                        whiteSpace: "nowrap",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {direction}
                    </td>
                    <td
                      style={{
                        padding: "13px 14px",
                        whiteSpace: "nowrap",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {lastUpdated
                        ? `${formatIndiaDate(lastUpdated)} ${formatIndiaTime(
                            lastUpdated,
                          )}`
                        : "—"}
                    </td>
                    <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "4px 8px",
                          border: `1px solid ${
                            isCancellation
                              ? "var(--color-danger-border)"
                              : "var(--color-warning-border)"
                          }`,
                          borderRadius: "var(--radius-pill)",
                          backgroundColor: isCancellation
                            ? "var(--color-danger-bg)"
                            : "var(--color-warning-bg)",
                          color: isCancellation
                            ? "var(--color-danger)"
                            : "var(--color-warning)",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {isCancellation && <XCircle size={13} />}
                        {isCancellation ? "Cancelled" : "Absent"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
