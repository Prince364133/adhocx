"use client";

import { XCircle } from "lucide-react";
import { EmptyState } from "../../../components/common/StateViews";
import type { CancellationRecord } from "../../../lib/api/cancellations";

interface CancellationTableProps {
  records: CancellationRecord[];
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
  "Pickup Time",
  "Cancellation Date",
  "Cancellation Time",
  "Cancellation Reason",
  "Cancellation Status",
];

function formatIndiaDate(date: string): string {
  const value = new Date(`${date.slice(0, 10)}T00:00:00+05:30`);
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
            minWidth: 1260,
            height: 58,
            display: "grid",
            gridTemplateColumns: "repeat(11, minmax(100px, 1fr))",
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
                width: index === 1 || index === 9 ? "82%" : "62%",
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
      aria-label="Successful cancellation records"
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
            Cancellation history
          </h2>
          <p style={{ marginTop: 3, fontSize: 12, color: "var(--text-muted)" }}>
            Successfully cancelled bookings only
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
            title="No successful cancellations found"
            message={emptyMessage}
          />
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 1260,
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
              {records.map((record) => (
                <tr
                  key={record.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-surface)",
                  }}
                >
                  <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                    <span className="code-tag">{record.employeeId}</span>
                  </td>
                  <td
                    style={{
                      padding: "13px 14px",
                      minWidth: 150,
                      color: "var(--text-primary)",
                      fontWeight: 600,
                    }}
                  >
                    {record.employeeName}
                  </td>
                  <td
                    style={{
                      padding: "13px 14px",
                      whiteSpace: "nowrap",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                    }}
                  >
                    {record.bookingId}
                  </td>
                  <td
                    style={{
                      padding: "13px 14px",
                      minWidth: 190,
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>{record.pickupLocation}</span>
                    <span
                      aria-hidden="true"
                      style={{ padding: "0 5px", color: "var(--text-muted)" }}
                    >
                      →
                    </span>
                    <span>{record.dropLocation}</span>
                  </td>
                  <td
                    style={{
                      padding: "13px 14px",
                      minWidth: 150,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {record.officeName}
                  </td>
                  <td
                    style={{
                      padding: "13px 14px",
                      whiteSpace: "nowrap",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {formatIndiaDate(record.travelDate)}
                  </td>
                  <td
                    style={{
                      padding: "13px 14px",
                      whiteSpace: "nowrap",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {record.pickupTime}
                  </td>
                  <td
                    style={{
                      padding: "13px 14px",
                      whiteSpace: "nowrap",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {formatIndiaDate(record.cancelledAt)}
                  </td>
                  <td
                    style={{
                      padding: "13px 14px",
                      whiteSpace: "nowrap",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {formatIndiaTime(record.cancelledAt)}
                  </td>
                  <td
                    style={{
                      padding: "13px 14px",
                      minWidth: 170,
                      maxWidth: 230,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {record.cancellationReason || "Not provided"}
                  </td>
                  <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 8px",
                        border: "1px solid var(--color-danger-border)",
                        borderRadius: "var(--radius-pill)",
                        backgroundColor: "var(--color-danger-bg)",
                        color: "var(--color-danger)",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      <XCircle size={13} />
                      Cancelled Successfully
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
