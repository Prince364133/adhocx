"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Calendar, IndianRupee, Plus } from "lucide-react";
import { adminApi } from "../../lib/api/client";
import type { AdminFleetShortfallItem } from "../../lib/api/types";
import { Button, StatusBadge } from "../common";

interface Props {
  fleetId: string;
  onNotify: (type: "success" | "error", message: string) => void;
}

export const FleetShortfallsTab: React.FC<Props> = ({ fleetId, onNotify }) => {
  const [records, setRecords] = useState<AdminFleetShortfallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [minimumTripsRequired, setMinimumTripsRequired] = useState("100");
  const [actualTripsOffered, setActualTripsOffered] = useState("80");
  const [compensationAmount, setCompensationAmount] = useState("");
  const [status, setStatus] = useState<"RECORDED" | "APPROVED" | "SETTLED" | "WAIVED">("RECORDED");
  const [notes, setNotes] = useState("");

  const loadShortfalls = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminApi.listFleetShortfalls(fleetId);
      setRecords(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      onNotify(
        "error",
        err instanceof Error ? err.message : "Failed to load shortfall records.",
      );
    } finally {
      setLoading(false);
    }
  }, [fleetId, onNotify]);

  useEffect(() => {
    void loadShortfalls();
  }, [loadShortfalls]);

  const previewShortfall = Math.max(
    0,
    (Number(minimumTripsRequired) || 0) - (Number(actualTripsOffered) || 0),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd) {
      onNotify("error", "Period start and end dates are required.");
      return;
    }
    if (new Date(periodStart) > new Date(periodEnd)) {
      onNotify("error", "Period start date must be on or before end date.");
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.createFleetShortfall(fleetId, {
        periodStart,
        periodEnd,
        minimumTripsRequired: Math.max(0, Number(minimumTripsRequired) || 0),
        actualTripsOffered: Math.max(0, Number(actualTripsOffered) || 0),
        compensationAmount:
          compensationAmount.trim() !== "" ? Number(compensationAmount) : undefined,
        status,
        notes: notes.trim() || undefined,
      });
      setShowForm(false);
      setNotes("");
      setCompensationAmount("");
      onNotify("success", "Shortfall compensation record logged.");
      await loadShortfalls();
    } catch (err: unknown) {
      onNotify(
        "error",
        err instanceof Error ? err.message : "Failed to record shortfall claim.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
          <IndianRupee size={14} /> Minimum Guarantee & Shortfall Records ({records.length})
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm((p) => !p)}>
          <Plus size={13} style={{ marginRight: "4px" }} />
          {showForm ? "Cancel" : "Log Shortfall"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "14px",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
              Period Start *
              <input
                type="date"
                required
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="form-input"
                style={{ marginTop: "4px", width: "100%" }}
              />
            </label>
            <label style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
              Period End *
              <input
                type="date"
                required
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="form-input"
                style={{ marginTop: "4px", width: "100%" }}
              />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <label style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
              Minimum Trips *
              <input
                type="number"
                min={0}
                required
                value={minimumTripsRequired}
                onChange={(e) => setMinimumTripsRequired(e.target.value)}
                className="form-input"
                style={{ marginTop: "4px", width: "100%" }}
              />
            </label>
            <label style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
              Actual Trips *
              <input
                type="number"
                min={0}
                required
                value={actualTripsOffered}
                onChange={(e) => setActualTripsOffered(e.target.value)}
                className="form-input"
                style={{ marginTop: "4px", width: "100%" }}
              />
            </label>
            <label style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
              Shortfall (Auto)
              <input
                type="text"
                readOnly
                value={`${previewShortfall} trips`}
                className="form-input"
                style={{ marginTop: "4px", width: "100%", opacity: 0.85 }}
              />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
              Compensation (₹)
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 5000"
                value={compensationAmount}
                onChange={(e) => setCompensationAmount(e.target.value)}
                className="form-input"
                style={{ marginTop: "4px", width: "100%" }}
              />
            </label>
            <label style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
              Status
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "RECORDED" | "APPROVED" | "SETTLED" | "WAIVED")
                }
                className="form-input"
                style={{ marginTop: "4px", width: "100%" }}
              >
                <option value="RECORDED">RECORDED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="SETTLED">SETTLED</option>
                <option value="WAIVED">WAIVED</option>
              </select>
            </label>
          </div>
          <textarea
            rows={2}
            placeholder="Audit / calculation notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input"
          />
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Save Shortfall Record
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
          Loading shortfall claims...
        </div>
      ) : records.length === 0 ? (
        <div
          style={{
            padding: "28px",
            textAlign: "center",
            color: "var(--text-muted)",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "8px",
          }}
        >
          No shortfall compensation claims have been recorded for this fleet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {records.map((r) => (
            <div
              key={r.id}
              style={{
                padding: "12px 14px",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, fontSize: "13px" }}>
                  <Calendar size={12} />
                  {new Date(r.periodStart).toLocaleDateString("en-IN")} –{" "}
                  {new Date(r.periodEnd).toLocaleDateString("en-IN")}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "3px" }}>
                  Min Required: {r.minimumTripsRequired} · Offered: {r.actualTripsOffered} ·{" "}
                  <strong>Shortfall: {r.shortfallTrips} trips</strong>
                </div>
                {r.notes && (
                  <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {r.notes}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <StatusBadge status={r.status} size="sm" />
                {r.compensationAmount != null && (
                  <div style={{ fontWeight: 700, fontSize: "14px", marginTop: "4px", color: "var(--color-success)" }}>
                    ₹{Number(r.compensationAmount).toLocaleString("en-IN")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
