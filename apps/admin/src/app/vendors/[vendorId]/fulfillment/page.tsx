"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Search,
  Truck,
  Users,
} from "lucide-react";
import { adminApi } from "../../../../lib/api/client";
import type {
  VendorFulfillmentDriver,
  VendorFulfillmentRequirement,
  VendorFulfillmentResponse,
} from "../../../../lib/api/types";
import { Button, PageHeader } from "../../../../components/common";

type DriverStatusFilter =
  | "ALL"
  | "ARRIVED"
  | "PENDING"
  | "CANCELLED"
  | "NOT_ASSIGNED";

interface DemoTrip {
  id: string;
  orderAt: string;
  tripAt: string;
  requiredDrivers: number;
  arrivedDrivers: number;
  pendingDrivers: number;
  driverNames: string[];
}

const DEMO_TRIPS: DemoTrip[] = [
  {
    id: "TRP-1042",
    orderAt: "2026-11-17T09:15:00+05:30",
    tripAt: "2026-11-18T06:30:00+05:30",
    requiredDrivers: 30,
    arrivedDrivers: 25,
    pendingDrivers: 5,
    driverNames: ["Ravi Kumar", "Suresh Reddy", "Mahesh"],
  },
  {
    id: "TRP-1043",
    orderAt: "2026-11-17T10:40:00+05:30",
    tripAt: "2026-11-19T07:00:00+05:30",
    requiredDrivers: 20,
    arrivedDrivers: 15,
    pendingDrivers: 5,
    driverNames: ["Priya", "Kiran", "Anil"],
  },
];

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: string) {
  const normalized = status.toUpperCase();
  if (
    ["ARRIVED", "IN_PROGRESS", "COMPLETED", "CONFIRMED"].includes(normalized)
  ) {
    return "vendor-fulfillment-status--arrived";
  }
  if (["CANCELLED", "NO_SHOW", "REJECTED"].includes(normalized)) {
    return "vendor-fulfillment-status--cancelled";
  }
  if (normalized === "NOT_ASSIGNED") {
    return "vendor-fulfillment-status--unassigned";
  }
  return "vendor-fulfillment-status--pending";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date
    .toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/\b(am|pm)\b/gi, (period) => period.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date
    .toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/\b(am|pm)\b/gi, (period) => period.toUpperCase());
}

function tripIdsFor(requirement: VendorFulfillmentRequirement) {
  return Array.from(
    new Set(
      requirement.drivers
        .map((driver) => driver.tripId)
        .filter((tripId): tripId is string => Boolean(tripId)),
    ),
  );
}

function driverAttendanceFilterStatus(
  driver: VendorFulfillmentDriver,
): Exclude<DriverStatusFilter, "ALL" | "NOT_ASSIGNED"> {
  if (
    driver.assignmentStatus.toUpperCase() === "CANCELLED" ||
    driver.attendanceStatus.toUpperCase() === "CANCELLED"
  ) {
    return "CANCELLED";
  }
  return driver.hasArrived ? "ARRIVED" : "PENDING";
}

function driverMatchesSearch(driver: VendorFulfillmentDriver, query: string) {
  const searchable = [
    driver.tripId,
    driver.name,
    driver.phone,
    driver.driverId,
    driver.vehicleRegistration,
    driver.vehicleType,
    driver.vehicleMake,
    driver.vehicleModel,
    driver.vehicleVerificationStatus,
    driver.assignmentStatus,
    driver.attendanceStatus,
    driver.tripStatus,
    driver.arrivalAt,
    driver.assignedAt,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return searchable.includes(query);
}

function TripListCard({
  requirement,
  selected,
  onSelect,
}: {
  requirement: VendorFulfillmentRequirement;
  selected: boolean;
  onSelect: () => void;
}) {
  const tripIds = tripIdsFor(requirement);
  const primaryTripId = tripIds[0];
  const requiredDrivers = requirement.requiredDrivers ?? 0;

  return (
    <button
      type="button"
      className={`vendor-fulfillment-trip-card${selected ? " vendor-fulfillment-trip-card--selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="vendor-fulfillment-trip-card-id">
        <span className="vendor-fulfillment-trip-card-id-label">Trip ID</span>
        {primaryTripId ? (
          <code title={tripIds.join("\n")}>
            {primaryTripId}
            {tripIds.length > 1 ? ` (+${tripIds.length - 1})` : ""}
          </code>
        ) : (
          <span className="vendor-fulfillment-muted">No trip created</span>
        )}
      </div>

      <div className="vendor-fulfillment-trip-card-details">
        <div
          className="vendor-fulfillment-trip-card-row"
          title="Trip date & time"
        >
          <CalendarDays
            size={14}
            className="vendor-fulfillment-trip-card-row-icon"
            aria-hidden="true"
          />
          <span className="vendor-fulfillment-trip-card-date-time">
            {formatDateTime(requirement.reportingTime)}
          </span>
        </div>

        <div
          className="vendor-fulfillment-trip-card-row"
          title="Required number of drivers"
        >
          <Users
            size={14}
            className="vendor-fulfillment-trip-card-row-icon"
            aria-hidden="true"
          />
          <span className="vendor-fulfillment-trip-card-drivers">
            <strong>{requiredDrivers.toLocaleString()}</strong>{" "}
            {requiredDrivers === 1 ? "driver" : "drivers"} required
          </span>
        </div>
      </div>
    </button>
  );
}

function DemoTripListCard({
  trip,
  selected,
  onSelect,
}: {
  trip: DemoTrip;
  selected: boolean;
  onSelect: () => void;
}) {
  const requiredDrivers = trip.requiredDrivers ?? 0;

  return (
    <button
      type="button"
      className={`vendor-fulfillment-trip-card${selected ? " vendor-fulfillment-trip-card--selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="vendor-fulfillment-trip-card-id">
        <span className="vendor-fulfillment-trip-card-id-label">Trip ID</span>
        <code>{trip.id}</code>
      </div>

      <div className="vendor-fulfillment-trip-card-details">
        <div
          className="vendor-fulfillment-trip-card-row"
          title="Trip date & time"
        >
          <CalendarDays
            size={14}
            className="vendor-fulfillment-trip-card-row-icon"
            aria-hidden="true"
          />
          <span className="vendor-fulfillment-trip-card-date-time">
            {formatDateTime(trip.tripAt)}
          </span>
        </div>

        <div
          className="vendor-fulfillment-trip-card-row"
          title="Required number of drivers"
        >
          <Users
            size={14}
            className="vendor-fulfillment-trip-card-row-icon"
            aria-hidden="true"
          />
          <span className="vendor-fulfillment-trip-card-drivers">
            <strong>{requiredDrivers.toLocaleString()}</strong>{" "}
            {requiredDrivers === 1 ? "driver" : "drivers"} required
          </span>
        </div>
      </div>
    </button>
  );
}

function TripDetailPanel({
  data,
  requirement,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: {
  data: VendorFulfillmentResponse;
  requirement: VendorFulfillmentRequirement;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: DriverStatusFilter;
  onStatusFilterChange: (value: DriverStatusFilter) => void;
}) {
  const query = search.trim().toLowerCase();
  const tripIds = tripIdsFor(requirement);
  const progress =
    requirement.requiredDrivers > 0
      ? Math.min(
          100,
          (requirement.arrivedDrivers / requirement.requiredDrivers) * 100,
        )
      : 0;
  const visibleDrivers = requirement.drivers.filter((driver) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      driverAttendanceFilterStatus(driver) === statusFilter;
    return (
      matchesStatus &&
      (!query || driverMatchesSearch(driver, query))
    );
  });
  const showUnassigned =
    requirement.notAssignedDrivers > 0 &&
    (statusFilter === "ALL" || statusFilter === "NOT_ASSIGNED") &&
    (!query ||
      "not assigned unassigned positions"
        .toLowerCase()
        .includes(query));

  return (
    <div className="vendor-fulfillment-detail">
      <section className="vendor-fulfillment-detail-card">
        <header className="vendor-fulfillment-detail-header">
          <div className="vendor-fulfillment-detail-title">
            <span className="vendor-fulfillment-icon">
              <Truck size={18} aria-hidden="true" />
            </span>
            <div>
              <h2>Selected trip details</h2>
              <p>
                Requirement / booking ID:{" "}
                <code title={requirement.id}>{requirement.id}</code>
              </p>
            </div>
          </div>
          <span
            className={`vendor-fulfillment-status ${statusTone(requirement.status)}`}
          >
            {formatStatus(requirement.status)}
          </span>
        </header>

        <div className="vendor-fulfillment-trip-ids">
          <strong>Trip IDs</strong>
          {tripIds.length > 0 ? (
            <div>
              {tripIds.map((tripId) => (
                <code key={tripId}>{tripId}</code>
              ))}
            </div>
          ) : (
            <span className="vendor-fulfillment-muted">
              No trip records have been created for this requirement.
            </span>
          )}
        </div>

        <div className="vendor-fulfillment-info-row">
          <section
            className="vendor-fulfillment-information"
            aria-label="Trip and vendor information"
          >
            <div className="vendor-fulfillment-information-heading">
              <Building2 size={16} aria-hidden="true" />
              <h3>Vendor Details</h3>
            </div>
            <div className="vendor-fulfillment-information-grid">
              <div>
                <span>Vendor name</span>
                <strong>{data.vendorName || "Not available"}</strong>
              </div>
              <div>
                <span>Vendor ID</span>
                <code>{data.vendorId}</code>
              </div>
              <div>
                <span>Contact person / phone</span>
                <strong>
                  {[data.vendorContactName, data.vendorPhone]
                    .filter(Boolean)
                    .join(" / ") || "Not available"}
                </strong>
              </div>
              <div>
                <span>Vendor address</span>
                <strong>{data.vendorAddress || "Not available"}</strong>
              </div>
            </div>
          </section>

          <section
            className="vendor-fulfillment-information"
            aria-label="Trip information"
          >
            <div className="vendor-fulfillment-information-heading">
              <MapPin size={16} aria-hidden="true" />
              <h3>Trip Information</h3>
            </div>
            <div className="vendor-fulfillment-information-grid">
              <div>
                <span>Order / booking date &amp; time</span>
                <strong>{formatDateTime(requirement.createdAt)}</strong>
              </div>
              <div>
                <span>Scheduled trip date</span>
                <strong>{formatDate(requirement.reportingTime)}</strong>
              </div>
              <div>
                <span>Start time</span>
                <strong>{formatTime(requirement.reportingTime)}</strong>
              </div>
              <div>
                <span>Requirement / booking ID</span>
                <code title={requirement.id}>{requirement.id}</code>
              </div>
              <div>
                <span>Trip status</span>
                <strong>{formatStatus(requirement.status)}</strong>
              </div>
              <div>
                <span>Vehicle type</span>
                <strong>{requirement.vehicleType || "Not available"}</strong>
              </div>
              <div>
                <span>Pickup location</span>
                <strong>{requirement.pickupAddress || "Not available"}</strong>
              </div>
              <div>
                <span>Destination</span>
                <strong>{requirement.dropAddress || "Not available"}</strong>
              </div>
            </div>
          </section>
        </div>

        <section
          className="vendor-fulfillment-overview"
          aria-label="Fulfillment summary"
        >
          <div className="vendor-fulfillment-overview-heading">
            <div>
              <h3>Fulfillment Overview</h3>
              <p>
                {requirement.arrivedDrivers} of {requirement.requiredDrivers}{" "}
                required driver positions arrived
              </p>
            </div>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div
            className="vendor-fulfillment-progress"
            role="progressbar"
            aria-label="Fulfillment percentage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="vendor-fulfillment-counts">
            <span>
              <b>{requirement.requiredDrivers}</b> required
            </span>
            <span className="vendor-fulfillment-count-arrived">
              <b>{requirement.arrivedDrivers}</b> arrived
            </span>
            <span className="vendor-fulfillment-count-pending">
              <b>{requirement.pendingDrivers}</b> pending
            </span>
            <span className="vendor-fulfillment-count-cancelled">
              <b>{requirement.cancelledDrivers}</b> cancelled
            </span>
            <span>
              <b>{requirement.notAssignedDrivers}</b> not assigned
            </span>
          </div>
        </section>
      </section>

      <section className="vendor-fulfillment-detail-card vendor-fulfillment-driver-section">
        <div className="vendor-fulfillment-driver-toolbar">
          <div>
            <h2>Driver Details</h2>
            <p>
              Assignments, attendance and arrival records ·{" "}
              {visibleDrivers.length + (showUnassigned ? 1 : 0)} matching
            </p>
          </div>
          <div className="vendor-fulfillment-driver-filters">
            <label className="vendor-fulfillment-search">
              <Search size={16} aria-hidden="true" />
              <span className="vendor-fulfillment-visually-hidden">
                Search driver records
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search name, phone, ID, vehicle..."
              />
            </label>
            <label className="vendor-fulfillment-visually-hidden" htmlFor="driver-status-filter">
              Filter drivers by status
            </label>
            <select
              id="driver-status-filter"
              className="vendor-fulfillment-status-filter"
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as DriverStatusFilter)
              }
            >
              <option value="ALL">All statuses</option>
              <option value="ARRIVED">Arrived</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NOT_ASSIGNED">Not assigned</option>
            </select>
          </div>
        </div>

        {visibleDrivers.length === 0 && !showUnassigned ? (
          <div className="vendor-fulfillment-empty">
            {requirement.drivers.length === 0 &&
            requirement.notAssignedDrivers === 0
              ? "No driver assignment records are available for this trip."
              : "No driver records match the selected search and status filters."}
          </div>
        ) : (
          <div className="vendor-fulfillment-table-wrap">
            <table className="vendor-fulfillment-table">
              <thead>
                <tr>
                  <th scope="col">Trip ID</th>
                  <th scope="col">Driver</th>
                  <th scope="col">Vehicle details</th>
                  <th scope="col">Assignment status</th>
                  <th scope="col">Arrival status</th>
                  <th scope="col">Actual arrival</th>
                  <th scope="col">Assignment &amp; trip details</th>
                </tr>
              </thead>
              <tbody>
                {visibleDrivers.map((driver) => (
                  <tr key={driver.assignmentId}>
                    <td>
                      {driver.tripId ? (
                        <code title={driver.tripId}>{driver.tripId}</code>
                      ) : (
                        <span className="vendor-fulfillment-muted">
                          Trip not created
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="vendor-fulfillment-table-primary">
                        {driver.name || "Name unavailable"}
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        {driver.phone || "Phone unavailable"}
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        Driver ID: <code>{driver.driverId}</code>
                      </div>
                    </td>
                    <td>
                      <div className="vendor-fulfillment-table-primary">
                        {driver.vehicleRegistration || "Number unavailable"}
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        {[
                          driver.vehicleMake,
                          driver.vehicleModel,
                          driver.vehicleType,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Vehicle type/details unavailable"}
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        Verification:{" "}
                        {driver.vehicleVerificationStatus
                          ? formatStatus(driver.vehicleVerificationStatus)
                          : "Not available"}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`vendor-fulfillment-status ${statusTone(driver.assignmentStatus)}`}
                      >
                        {formatStatus(driver.assignmentStatus)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`vendor-fulfillment-status ${statusTone(driver.attendanceStatus)}`}
                      >
                        {formatStatus(driver.attendanceStatus)}
                      </span>
                    </td>
                    <td>
                      {driver.arrivalAt
                        ? formatDateTime(driver.arrivalAt)
                        : driver.hasArrived
                          ? "Arrival time unavailable"
                          : "No arrival recorded"}
                    </td>
                    <td>
                      <div className="vendor-fulfillment-table-secondary">
                        Assigned: {formatDateTime(driver.assignedAt)}
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        Trip:{" "}
                        {driver.tripStatus
                          ? formatStatus(driver.tripStatus)
                          : "Not created"}
                      </div>
                      {driver.tripStartedAt && (
                        <div className="vendor-fulfillment-table-secondary">
                          Started: {formatDateTime(driver.tripStartedAt)}
                        </div>
                      )}
                      {driver.tripCompletedAt && (
                        <div className="vendor-fulfillment-table-secondary">
                          Completed: {formatDateTime(driver.tripCompletedAt)}
                        </div>
                      )}
                      {driver.tripCancelledAt && (
                        <div className="vendor-fulfillment-table-secondary">
                          Cancelled: {formatDateTime(driver.tripCancelledAt)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {showUnassigned && (
                  <tr>
                    <td>
                      <span className="vendor-fulfillment-muted">
                        No trip record
                      </span>
                    </td>
                    <td colSpan={2}>
                      <div className="vendor-fulfillment-table-primary">
                        {requirement.notAssignedDrivers} required position
                        {requirement.notAssignedDrivers === 1 ? "" : "s"} not
                        assigned
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        No driver or assignment record exists for these
                        position(s).
                      </div>
                    </td>
                    <td>
                      <span className="vendor-fulfillment-status vendor-fulfillment-status--unassigned">
                        Not assigned
                      </span>
                    </td>
                    <td>
                      <span className="vendor-fulfillment-status vendor-fulfillment-status--unassigned">
                        Not assigned
                      </span>
                    </td>
                    <td>
                      <span className="vendor-fulfillment-muted">
                        Not available
                      </span>
                    </td>
                    <td>
                      <span className="vendor-fulfillment-muted">
                        No assignment record
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DemoTripDetailPanel({
  trip,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: {
  trip: DemoTrip;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: DriverStatusFilter;
  onStatusFilterChange: (value: DriverStatusFilter) => void;
}) {
  const query = search.trim().toLowerCase();
  const progress = Math.round(
    (trip.arrivedDrivers / trip.requiredDrivers) * 100,
  );
  const visibleDriverNames =
    statusFilter === "ALL" || statusFilter === "ARRIVED"
      ? trip.driverNames.filter((name) => {
          const searchable = [
            name,
            trip.id,
            "assigned",
            "arrived",
            "phone not provided",
            "driver id not provided",
          ]
            .join(" ")
            .toLowerCase();
          return !query || searchable.includes(query);
        })
      : [];
  const showPendingSummary =
    (statusFilter === "ALL" || statusFilter === "PENDING") &&
    trip.pendingDrivers > 0 &&
    (!query ||
      [trip.id, "pending", "individual driver details not provided"]
        .join(" ")
        .toLowerCase()
        .includes(query));
  const displayedRows =
    visibleDriverNames.length + (showPendingSummary ? 1 : 0);

  return (
    <div className="vendor-fulfillment-detail">
      <section className="vendor-fulfillment-detail-card">
        <div className="vendor-fulfillment-demo-notice" role="note">
          Sample data only. It is not saved to the API or database and is
          excluded from live totals. Only the supplied driver names are listed;
          unavailable IDs, phone numbers, vehicle information, and exact
          arrival times are not invented. The supplied arrived/pending totals
          remain the full trip counts.
        </div>

        <header className="vendor-fulfillment-detail-header">
          <div className="vendor-fulfillment-detail-title">
            <span className="vendor-fulfillment-icon">
              <Truck size={18} aria-hidden="true" />
            </span>
            <div>
              <h2>Trip details</h2>
              <p>
                Trip ID: <code>{trip.id}</code>
              </p>
            </div>
          </div>
          <span className="vendor-fulfillment-status vendor-fulfillment-status--demo">
            Demo data
          </span>
        </header>

        <div className="vendor-fulfillment-info-row">
          <section
            className="vendor-fulfillment-information"
            aria-label="Sample vendor details"
          >
            <div className="vendor-fulfillment-information-heading">
              <Building2 size={16} aria-hidden="true" />
              <h3>Vendor Details</h3>
            </div>
            <div className="vendor-fulfillment-information-grid">
              <div>
                <span>Vendor name</span>
                <strong>Not provided</strong>
              </div>
              <div>
                <span>Vendor ID</span>
                <strong>Not provided</strong>
              </div>
              <div>
                <span>Contact person / phone</span>
                <strong>Not provided</strong>
              </div>
              <div>
                <span>Vendor address</span>
                <strong>Not provided</strong>
              </div>
            </div>
          </section>

          <section
            className="vendor-fulfillment-information"
            aria-label="Sample trip information"
          >
            <div className="vendor-fulfillment-information-heading">
              <MapPin size={16} aria-hidden="true" />
              <h3>Trip Information</h3>
            </div>
            <div className="vendor-fulfillment-information-grid">
              <div>
                <span>Order / booking date &amp; time</span>
                <strong>{formatDateTime(trip.orderAt)}</strong>
              </div>
              <div>
                <span>Scheduled trip date</span>
                <strong>{formatDate(trip.tripAt)}</strong>
              </div>
              <div>
                <span>Start time</span>
                <strong>{formatTime(trip.tripAt)}</strong>
              </div>
              <div>
                <span>Requirement / booking ID</span>
                <strong>Not provided</strong>
              </div>
              <div>
                <span>Trip status</span>
                <strong>Not provided</strong>
              </div>
              <div>
                <span>Vehicle type</span>
                <strong>Not provided</strong>
              </div>
              <div>
                <span>Pickup location</span>
                <strong>Not provided</strong>
              </div>
              <div>
                <span>Destination</span>
                <strong>Not provided</strong>
              </div>
            </div>
          </section>
        </div>

        <section
          className="vendor-fulfillment-overview"
          aria-label="Sample fulfillment summary"
        >
          <div className="vendor-fulfillment-overview-heading">
            <div>
              <h3>Fulfillment Overview</h3>
              <p>
                {trip.arrivedDrivers} of {trip.requiredDrivers} required
                drivers arrived
              </p>
            </div>
            <strong>{progress}%</strong>
          </div>
          <div
            className="vendor-fulfillment-progress"
            role="progressbar"
            aria-label="Sample fulfillment percentage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="vendor-fulfillment-counts">
            <span>
              <b>{trip.requiredDrivers}</b> required
            </span>
            <span className="vendor-fulfillment-count-arrived">
              <b>{trip.arrivedDrivers}</b> arrived
            </span>
            <span className="vendor-fulfillment-count-pending">
              <b>{trip.pendingDrivers}</b> pending
            </span>
            <span className="vendor-fulfillment-count-cancelled vendor-fulfillment-count-unavailable">
              <b>Not provided</b> cancelled
            </span>
            <span className="vendor-fulfillment-count-unavailable">
              <b>Not provided</b> not assigned
            </span>
          </div>
        </section>
      </section>

      <section className="vendor-fulfillment-detail-card vendor-fulfillment-driver-section">
        <div className="vendor-fulfillment-driver-toolbar">
          <div>
            <h2>Driver Details</h2>
            <p>{displayedRows} listed sample row(s)</p>
          </div>
          <div className="vendor-fulfillment-driver-filters">
            <label className="vendor-fulfillment-search">
              <Search size={16} aria-hidden="true" />
              <span className="vendor-fulfillment-visually-hidden">
                Search sample driver records
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search listed names or status..."
              />
            </label>
            <label
              className="vendor-fulfillment-visually-hidden"
              htmlFor="demo-driver-status-filter"
            >
              Filter sample drivers by status
            </label>
            <select
              id="demo-driver-status-filter"
              className="vendor-fulfillment-status-filter"
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as DriverStatusFilter)
              }
            >
              <option value="ALL">All statuses</option>
              <option value="ARRIVED">Arrived</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NOT_ASSIGNED">Not assigned</option>
            </select>
          </div>
        </div>

        {displayedRows === 0 ? (
          <div className="vendor-fulfillment-empty">
            No supplied sample driver records match these filters. No
            cancelled or unassigned sample records were provided.
          </div>
        ) : (
          <div className="vendor-fulfillment-table-wrap">
            <table className="vendor-fulfillment-table">
              <thead>
                <tr>
                  <th scope="col">Trip ID</th>
                  <th scope="col">Driver details</th>
                  <th scope="col">Vehicle details</th>
                  <th scope="col">Assignment status</th>
                  <th scope="col">Arrival status</th>
                  <th scope="col">Actual arrival</th>
                  <th scope="col">Other details</th>
                </tr>
              </thead>
              <tbody>
                {visibleDriverNames.map((name) => (
                  <tr key={`${trip.id}-${name}`}>
                    <td>
                      <code>{trip.id}</code>
                    </td>
                    <td>
                      <div className="vendor-fulfillment-table-primary">
                        {name}
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        Phone: Not provided
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        Driver ID: Not provided
                      </div>
                    </td>
                    <td>
                      <div className="vendor-fulfillment-table-primary">
                        Vehicle details not provided
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        Registration not provided
                      </div>
                    </td>
                    <td>
                      <span className="vendor-fulfillment-status vendor-fulfillment-status--pending">
                        Assigned
                      </span>
                    </td>
                    <td>
                      <span className="vendor-fulfillment-status vendor-fulfillment-status--arrived">
                        Arrived
                      </span>
                    </td>
                    <td>Not provided</td>
                    <td>
                      <div className="vendor-fulfillment-table-secondary">
                        Trip status: Not provided
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        Assignment time: Not provided
                      </div>
                    </td>
                  </tr>
                ))}
                {showPendingSummary && (
                  <tr>
                    <td>
                      <code>{trip.id}</code>
                    </td>
                    <td colSpan={2}>
                      <div className="vendor-fulfillment-table-primary">
                        {trip.pendingDrivers} pending drivers
                      </div>
                      <div className="vendor-fulfillment-table-secondary">
                        Individual names and driver records were not supplied.
                      </div>
                    </td>
                    <td>
                      <span className="vendor-fulfillment-muted">
                        Not provided
                      </span>
                    </td>
                    <td>
                      <span className="vendor-fulfillment-status vendor-fulfillment-status--pending">
                        Pending
                      </span>
                    </td>
                    <td>Not provided</td>
                    <td>
                      <span className="vendor-fulfillment-muted">
                        Sample aggregate only
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function VendorFulfillmentPage() {
  const params = useParams<{ vendorId: string }>();
  const vendorId = params.vendorId;
  const [data, setData] = useState<VendorFulfillmentResponse | null>(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState<
    string | null
  >(null);
  const [selectedDemoTripId, setSelectedDemoTripId] = useState<string | null>(
    null,
  );
  const [tripSearch, setTripSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] =
    useState<DriverStatusFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFulfillment = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminApi.getVendorFulfillment(vendorId);
      setData(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load vendor fulfillment details.",
      );
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    void loadFulfillment();
  }, [loadFulfillment]);

  useEffect(() => {
    if (!data) {
      if (loading) return;
      if (!selectedDemoTripId) {
        setSelectedDemoTripId(DEMO_TRIPS[0]?.id ?? null);
      }
      return;
    }
    if (selectedDemoTripId) return;
    if (
      !data.requirements.some(
        (requirement) => requirement.id === selectedRequirementId,
      )
    ) {
      if (data.requirements[0]) {
        setSelectedRequirementId(data.requirements[0].id);
      } else {
        setSelectedRequirementId(null);
        setSelectedDemoTripId(DEMO_TRIPS[0]?.id ?? null);
      }
    }
  }, [data, loading, selectedRequirementId, selectedDemoTripId]);

  const visibleRequirements = useMemo(() => {
    if (!data) return [];
    const query = tripSearch.trim().toLowerCase();
    if (!query) return data.requirements;

    return data.requirements.filter((requirement) => {
      const searchableValues = [
        data.vendorId,
        data.vendorName,
        data.vendorContactName,
        requirement.id,
        requirement.status,
        requirement.vehicleType,
        requirement.pickupAddress,
        requirement.dropAddress,
        requirement.reportingTime,
        ...tripIdsFor(requirement),
        ...requirement.drivers.flatMap((driver) => [
          driver.name,
          driver.phone,
          driver.driverId,
          driver.assignmentStatus,
          driver.attendanceStatus,
        ]),
      ];
      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [data, tripSearch]);

  const visibleDemoTrips = useMemo(() => {
    const query = tripSearch.trim().toLowerCase();
    if (!query) return DEMO_TRIPS;
    return DEMO_TRIPS.filter((trip) =>
      [
        "demo sample",
        trip.id,
        trip.orderAt,
        trip.tripAt,
        trip.requiredDrivers,
        trip.arrivedDrivers,
        trip.pendingDrivers,
        ...trip.driverNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [tripSearch]);

  const selectedRequirement =
    data?.requirements.find(
      (requirement) => requirement.id === selectedRequirementId,
    ) ?? null;
  const selectedDemoTrip =
    DEMO_TRIPS.find((trip) => trip.id === selectedDemoTripId) ?? null;

  useEffect(() => {
    setDriverSearch("");
    setDriverStatusFilter("ALL");
  }, [selectedRequirementId, selectedDemoTripId]);

  return (
    <div className="admin-page vendor-fulfillment-page">
      <PageHeader
        title="Vendor Fulfillment"
        subtitle={
          data?.vendorName
            ? `Trip and driver attendance for ${data.vendorName}.`
            : "Review vendor trips, driver assignments and attendance."
        }
        breadcrumbs={[
          { label: "Corporate Vendors", href: `/users?vendorId=${vendorId}` },
          { label: "Vendor Fulfillment" },
        ]}
        backHref={`/users?vendorId=${encodeURIComponent(vendorId)}`}
        backLabel="Back to Vendor Details"
      />

      {error && (
        <div className="vendor-fulfillment-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadFulfillment}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="vendor-fulfillment-loading" role="status">
          Loading vendor trips and attendance…
        </div>
      ) : data || error ? (
        <div className="vendor-fulfillment-layout">
          <aside
            className="vendor-fulfillment-trip-list-panel"
            aria-label="Vendor trip list"
          >
            <div className="vendor-fulfillment-panel-heading">
              <div>
                <h2>Trips</h2>
                <p>
                  {visibleRequirements.length} live ·{" "}
                  {visibleDemoTrips.length} sample shown
                </p>
              </div>
              <span className="vendor-fulfillment-trip-total">
                {(data?.requirements.length ?? 0) + DEMO_TRIPS.length}
              </span>
            </div>

            <label className="vendor-fulfillment-search vendor-fulfillment-trip-search">
              <Search size={16} aria-hidden="true" />
              <span className="vendor-fulfillment-visually-hidden">
                Search vendor trips
              </span>
              <input
                type="search"
                value={tripSearch}
                onChange={(event) => setTripSearch(event.target.value)}
                placeholder="Search trip, vendor, driver..."
              />
            </label>

            <div className="vendor-fulfillment-trip-list">
              <div className="vendor-fulfillment-trip-list-group">
                <h3>Live vendor trips</h3>
                <span>API data</span>
              </div>
              {visibleRequirements.length === 0 ? (
                <div className="vendor-fulfillment-empty">
                  {!data || data.requirements.length === 0
                    ? "No live trip requirements are recorded for this vendor."
                    : "No trips match your search."}
                </div>
              ) : (
                visibleRequirements.map((requirement) => (
                  <TripListCard
                    key={requirement.id}
                    requirement={requirement}
                    selected={
                      !selectedDemoTrip &&
                      requirement.id === selectedRequirement?.id
                    }
                    onSelect={() => {
                      setSelectedRequirementId(requirement.id);
                      setSelectedDemoTripId(null);
                    }}
                  />
                ))
              )}
              <div className="vendor-fulfillment-trip-list-group vendor-fulfillment-trip-list-group--demo">
                <h3>Sample trips</h3>
                <span>Demo only · excluded from live totals</span>
              </div>
              {visibleDemoTrips.length === 0 ? (
                <div className="vendor-fulfillment-empty">
                  No sample trips match your search.
                </div>
              ) : (
                visibleDemoTrips.map((trip) => (
                  <DemoTripListCard
                    key={trip.id}
                    trip={trip}
                    selected={trip.id === selectedDemoTrip?.id}
                    onSelect={() => {
                      setSelectedDemoTripId(trip.id);
                      setSelectedRequirementId(null);
                    }}
                  />
                ))
              )}
            </div>
          </aside>

          <main
            className="vendor-fulfillment-detail-panel"
            aria-label="Selected trip detail"
          >
            {selectedDemoTrip ? (
              <DemoTripDetailPanel
                trip={selectedDemoTrip}
                search={driverSearch}
                onSearchChange={setDriverSearch}
                statusFilter={driverStatusFilter}
                onStatusFilterChange={setDriverStatusFilter}
              />
            ) : selectedRequirement && data ? (
              <TripDetailPanel
                data={data}
                requirement={selectedRequirement}
                search={driverSearch}
                onSearchChange={setDriverSearch}
                statusFilter={driverStatusFilter}
                onStatusFilterChange={setDriverStatusFilter}
              />
            ) : (
              <div className="vendor-fulfillment-detail-empty">
                <span>
                  <CheckCircle2 size={20} aria-hidden="true" />
                </span>
                <h2>No trip selected</h2>
                <p>
                  {data?.requirements.length === 0
                    ? "There are no live trips. Select one of the sample records to inspect the demo layout."
                    : "Choose a trip from the list to inspect its assignments and attendance."}
                </p>
              </div>
            )}
          </main>
        </div>
      ) : (
        !error && (
          <div className="vendor-fulfillment-empty">
            Vendor fulfillment data is unavailable.
          </div>
        )
      )}
    </div>
  );
}
