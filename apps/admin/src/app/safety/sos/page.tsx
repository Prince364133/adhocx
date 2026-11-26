"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Radio,
  CheckCircle2,
  RefreshCw,
  Search,
  Phone,
  Car,
  Building2,
  MapPin,
  Clock,
  Battery,
  ExternalLink,
  Check,
  Send,
  AlertOctagon,
  Copy,
  User,
  ShieldCheck,
  Filter,
  Eye,
  FileText,
} from "lucide-react";
import { adminApi, getApiBaseUrl, getStoredAdminToken } from "../../../lib/api/client";
import { CorporateSosAlert, CorporateSosStatus } from "../../../lib/api/types";
import {
  PageHeader,
  KpiStrip,
  MetricCard,
  SegmentedTabs,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
  FeedbackBanner,
  Modal,
  CardLoadingSkeleton,
  EmptyState,
  ErrorState,
} from "../../../components/common";

const SOS_STATUS_TABS = [
  { id: "ALL", label: "All Emergencies" },
  { id: "ACTIVE", label: "Active (P0)" },
  { id: "ACKNOWLEDGED", label: "Acknowledged" },
  { id: "INVESTIGATING", label: "Investigating" },
  { id: "ESCALATED", label: "Escalated" },
  { id: "RESOLVED", label: "Resolved" },
];

function isActiveStatus(status: string): boolean {
  const s = String(status || "").toUpperCase();
  return ["NEW", "ACTIVE", "ACKNOWLEDGED", "INVESTIGATING", "ESCALATED", "RESPONDED"].includes(s);
}

function isCriticalUrgent(status: string): boolean {
  const s = String(status || "").toUpperCase();
  return ["NEW", "ACTIVE", "ESCALATED"].includes(s);
}

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function AdminSosCommandCenterPage() {
  const [alerts, setAlerts] = useState<CorporateSosAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<CorporateSosAlert | null>(null);

  // Real-time synchronization status
  const [sseConnected, setSseConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());
  const [newAlertFlash, setNewAlertFlash] = useState<string | null>(null);

  // Action state
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Manual Trigger SOS Modal (for emergency dispatch testing / simulation from Admin)
  const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
  const [raiseRouteId, setRaiseRouteId] = useState("");
  const [raiseLat, setRaiseLat] = useState("17.4435");
  const [raiseLng, setRaiseLng] = useState("78.3772");
  const [raiseReason, setRaiseReason] = useState("Emergency SOS triggered by Admin Command Centre");
  const [raiseBattery, setRaiseBattery] = useState("85");
  const [isRaisingSos, setIsRaisingSos] = useState(false);

  const inFlightRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ---------------------------------------------------------------------------
  // Load SOS Alerts
  // ---------------------------------------------------------------------------
  const loadAlerts = useCallback(async (force = false) => {
    if (!force && inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await adminApi.listCorporateSosAlerts({ limit: 100 });
      setAlerts(Array.isArray(data) ? data : []);
      setLoadError("");
      setLastSyncedAt(new Date());
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load SOS emergency alerts.");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Real-time Synchronization (SSE + 5s Auto-polling fallback)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    void loadAlerts(true);

    // 1. Establish SSE Connection
    const token = getStoredAdminToken();
    const baseUrl = getApiBaseUrl();
    const sseUrl = `${baseUrl}/notifications/events?channel=admin:command-center:sos`;

    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setSseConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.event !== "heartbeat") {
            setLastSyncedAt(new Date());
            void loadAlerts(true);
            if (payload.event === "CORPORATE_SOS_ALERT") {
              setNewAlertFlash(
                `🚨 NEW P0 SOS Alert received for route ${payload.payload?.routeId || "corporate trip"}!`
              );
              setTimeout(() => setNewAlertFlash(null), 8000);
            }
          }
        } catch {
          // Heartbeat or parse error
        }
      };

      es.onerror = () => {
        setSseConnected(false);
      };
    } catch {
      setSseConnected(false);
    }

    // 2. Resilient Polling Fallback (every 5 seconds, paused when tab hidden)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void loadAlerts(false);
    }, 5000);

    const handleVisibility = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void loadAlerts(false);
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [loadAlerts]);

  // Keep selected alert synced with fresh data from feed
  useEffect(() => {
    if (selectedAlert) {
      const fresh = alerts.find((a) => a.id === selectedAlert.id);
      if (fresh) {
        setSelectedAlert(fresh);
      }
    }
  }, [alerts, selectedAlert]);

  // ---------------------------------------------------------------------------
  // Action Handlers (Acknowledge, Investigate, Escalate, Resolve)
  // ---------------------------------------------------------------------------
  const handleAcknowledge = async (alertId: string) => {
    setActionLoadingId(alertId);
    setFeedback(null);
    try {
      await adminApi.acknowledgeCorporateSosAlert(alertId);
      setFeedback({
        type: "success",
        message: `SOS alert INC-${alertId.slice(0, 8).toUpperCase()} acknowledged. Status updated to ACKNOWLEDGED.`,
      });
      await loadAlerts(true);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to acknowledge alert." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInvestigate = async (alertId: string) => {
    const notes = actionNotes[alertId]?.trim() || "Admin commander opened active investigation.";
    setActionLoadingId(alertId);
    setFeedback(null);
    try {
      await adminApi.investigateCorporateSosAlert(alertId, notes);
      setFeedback({
        type: "success",
        message: `SOS alert marked as INVESTIGATING. Notes logged into crisis ledger.`,
      });
      await loadAlerts(true);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to update alert to investigating." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEscalate = async (alertId: string) => {
    const notes = actionNotes[alertId]?.trim() || "Critical safety escalation initiated by Admin Command Centre.";
    setActionLoadingId(alertId);
    setFeedback(null);
    try {
      await adminApi.escalateCorporateSosAlert(alertId, notes);
      setFeedback({
        type: "success",
        message: `SOS alert ESCALATED to highest priority field response.`,
      });
      await loadAlerts(true);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to escalate alert." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolve = async (alertId: string, outcome: "RESOLVED" | "FALSE_ALARM" = "RESOLVED") => {
    const notes = actionNotes[alertId]?.trim() || (outcome === "RESOLVED" ? "Incident investigated and resolved safely." : "Dispatcher investigated and verified false alarm.");
    setActionLoadingId(alertId);
    setFeedback(null);
    try {
      await adminApi.closeCorporateSosAlert(alertId, notes, outcome);
      setFeedback({
        type: "success",
        message: `SOS alert closed as ${outcome}. Incident resolution audit recorded.`,
      });
      await loadAlerts(true);
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(null);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to resolve SOS alert." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleManualTriggerSos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!raiseRouteId.trim()) {
      setFeedback({ type: "error", message: "Route ID is required to trigger an SOS alert." });
      return;
    }
    setIsRaisingSos(true);
    setFeedback(null);
    try {
      await adminApi.triggerCorporateSosAlert({
        routeId: raiseRouteId.trim(),
        latitude: parseFloat(raiseLat) || 17.4435,
        longitude: parseFloat(raiseLng) || 78.3772,
        triggerReason: raiseReason.trim() || "Emergency SOS raised by Admin Command Centre",
        batteryPct: parseInt(raiseBattery, 10) || 85,
      });
      setFeedback({
        type: "success",
        message: "Emergency SOS broadcast successfully. Alert dispatched to Command Centre and Ops Panel.",
      });
      setIsRaiseModalOpen(false);
      await loadAlerts(true);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to trigger SOS alert." });
    } finally {
      setIsRaisingSos(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setFeedback({ type: "success", message: `${label} copied to clipboard!` });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // ---------------------------------------------------------------------------
  // KPI Calculations
  // ---------------------------------------------------------------------------
  const metrics = useMemo(() => {
    const total = alerts.length;
    const active = alerts.filter((a) => isActiveStatus(a.status)).length;
    const critical = alerts.filter((a) => isCriticalUrgent(a.status)).length;
    const investigating = alerts.filter((a) => a.status === "INVESTIGATING").length;
    const resolved = alerts.filter((a) => a.status === "RESOLVED" || a.status === "FALSE_ALARM").length;
    return { total, active, critical, investigating, resolved };
  }, [alerts]);

  // ---------------------------------------------------------------------------
  // Filtered Alerts
  // ---------------------------------------------------------------------------
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      // Tab filter
      if (activeTab === "ACTIVE" && !isActiveStatus(a.status)) return false;
      if (activeTab === "ACKNOWLEDGED" && a.status !== "ACKNOWLEDGED") return false;
      if (activeTab === "INVESTIGATING" && a.status !== "INVESTIGATING") return false;
      if (activeTab === "ESCALATED" && a.status !== "ESCALATED") return false;
      if (activeTab === "RESOLVED" && a.status !== "RESOLVED" && a.status !== "FALSE_ALARM") return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const incId = a.id.toLowerCase();
        const routeId = (a.routeId || "").toLowerCase();
        const driverName = (a.route?.driver?.fullName || "").toLowerCase();
        const driverPhone = (a.route?.driver?.phone || "").toLowerCase();
        const tenantName = (a.route?.tenant?.name || "").toLowerCase();
        const vehiclePlate = (a.route as any)?.vehicle?.registrationNumber?.toLowerCase() || "";
        const role = (a.triggeredByRole || "").toLowerCase();

        return (
          incId.includes(q) ||
          routeId.includes(q) ||
          driverName.includes(q) ||
          driverPhone.includes(q) ||
          tenantName.includes(q) ||
          vehiclePlate.includes(q) ||
          role.includes(q)
        );
      }

      return true;
    });
  }, [alerts, activeTab, searchQuery]);

  return (
    <div className="admin-page-container" style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Real-time Flash Notification Banner */}
      {newAlertFlash && (
        <div
          role="alert"
          style={{
            backgroundColor: "rgba(220, 38, 38, 0.12)",
            border: "1.5px solid var(--color-danger, #DC2626)",
            borderRadius: "var(--radius-md, 8px)",
            padding: "12px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            animation: "pulse 1.8s infinite",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--color-danger, #DC2626)", fontWeight: 700, fontSize: "14px" }}>
            <AlertOctagon size={20} />
            <span>{newAlertFlash}</span>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setActiveTab("ACTIVE");
              setNewAlertFlash(null);
            }}
          >
            View Active Emergencies
          </Button>
        </div>
      )}

      {/* Global Feedback Banner */}
      {feedback && (
        <div style={{ marginBottom: "20px" }}>
          <FeedbackBanner
            type={feedback.type}
            message={feedback.message}
            onDismiss={() => setFeedback(null)}
          />
        </div>
      )}

      {/* Header */}
      <PageHeader
        title="SOS Emergency Command Centre"
        subtitle="Live 24×7 P0 crisis response, passenger distress telemetry, and incident audit log synchronized with Operations Panel."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Live Sync Status Pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "9999px",
                backgroundColor: sseConnected ? "rgba(22, 163, 74, 0.12)" : "rgba(87, 40, 178, 0.08)",
                border: `1px solid ${sseConnected ? "rgba(22, 163, 74, 0.3)" : "rgba(87, 40, 178, 0.2)"}`,
                fontSize: "12px",
                fontWeight: 600,
                color: sseConnected ? "#16A34A" : "var(--color-primary, #5728b2)",
              }}
              title={`Last synced: ${lastSyncedAt.toLocaleTimeString()}`}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: sseConnected ? "#16A34A" : "#5728b2",
                  boxShadow: sseConnected ? "0 0 8px #16A34A" : "none",
                }}
              />
              <span>{sseConnected ? "Live SSE Synced" : "Auto-Polling (5s)"}</span>
            </div>

            <Button
              size="md"
              variant="outline"
              leftIcon={<RefreshCw size={14} className={refreshing ? "spin" : ""} />}
              isLoading={refreshing}
              onClick={async () => {
                setRefreshing(true);
                try {
                  await loadAlerts(true);
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              Refresh Feed
            </Button>

            <Button
              size="md"
              style={{
                backgroundColor: "var(--color-danger, #DC2626)",
                color: "#FFFFFF",
                border: "none",
                fontWeight: 600,
              }}
              leftIcon={<AlertOctagon size={15} />}
              onClick={() => setIsRaiseModalOpen(true)}
            >
              Simulate / Raise SOS
            </Button>
          </div>
        }
      />

      {/* KPI Cards Strip */}
      <div style={{ marginTop: "20px", marginBottom: "24px" }}>
        <KpiStrip
          items={[
            {
              label: "Total SOS Incidents",
              value: metrics.total,
              icon: <ShieldAlert size={16} />,
              tone: "neutral",
            },
            {
              label: "Active Emergencies",
              value: metrics.active,
              icon: <AlertOctagon size={16} />,
              tone: metrics.active > 0 ? "danger" : "success",
              subtext: metrics.active > 0 ? "P0 Crisis" : "Nominal",
            },
            {
              label: "Under Investigation",
              value: metrics.investigating,
              icon: <Radio size={16} />,
              tone: "info",
            },
            {
              label: "Resolved Incidents",
              value: metrics.resolved,
              icon: <CheckCircle2 size={16} />,
              tone: "success",
            },
          ]}
        />
      </div>

      {/* Segmented Filter Tabs & Search Bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
        <SegmentedTabs
          tabs={SOS_STATUS_TABS}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />

        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search incident ID, route ID, driver name, vehicle plate, or tenant..."
          onReset={() => {
            setSearchQuery("");
            setActiveTab("ALL");
          }}
        />
      </div>

      {/* Main Content Area */}
      {loading ? (
        <CardLoadingSkeleton count={4} />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void loadAlerts(true)} />
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title={searchQuery || activeTab !== "ALL" ? "No matching SOS incidents" : "No active SOS emergencies reported"}
          description={
            searchQuery || activeTab !== "ALL"
              ? "No incident records matched your active filter or search keywords."
              : "All corporate passenger routes are running within safe parameters. Automated 24×7 distress monitors are armed."
          }
          icon={<CheckCircle2 size={24} />}
          action={
            searchQuery || activeTab !== "ALL"
              ? {
                  label: "Clear Filters",
                  onClick: () => {
                    setSearchQuery("");
                    setActiveTab("ALL");
                  },
                }
              : undefined
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredAlerts.map((alert) => {
            const isUrgent = isCriticalUrgent(alert.status);
            const isActive = isActiveStatus(alert.status);
            const driver = alert.route?.driver;
            const vehicle = (alert.route as any)?.vehicle;
            const tenant = alert.route?.tenant;
            const office = alert.route?.office;
            const lat = Number(alert.latitude);
            const lng = Number(alert.longitude);
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

            const canAcknowledge =
              alert.status === "NEW" ||
              alert.status === "ACTIVE" ||
              (alert.status === "ESCALATED" && !alert.acknowledgedAt);
            const canInvestigate =
              alert.status === "ACKNOWLEDGED" ||
              alert.status === "ESCALATED" ||
              alert.status === "RESPONDED";
            const canEscalate = alert.status !== "ESCALATED" && isActive;
            const canResolve = isActive;

            return (
              <div
                key={alert.id}
                style={{
                  backgroundColor: isUrgent ? "rgba(220, 38, 38, 0.04)" : "var(--bg-surface, #FFFFFF)",
                  border: isUrgent ? "1.5px solid var(--color-danger, #DC2626)" : "1px solid var(--border-subtle, #E5E7EB)",
                  borderRadius: "var(--radius-lg, 12px)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  boxShadow: isUrgent ? "0 4px 16px rgba(220, 38, 38, 0.12)" : "var(--shadow-card)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Header Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        backgroundColor: isUrgent ? "var(--color-danger, #DC2626)" : "var(--color-primary, #5728b2)",
                        color: "#FFFFFF",
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        letterSpacing: "0.04em",
                      }}
                    >
                      P0 EMERGENCY
                    </span>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(alert.id, "Incident ID")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontFamily: "monospace",
                        fontWeight: 700,
                        fontSize: "13px",
                        color: "var(--text-primary)",
                      }}
                      title="Click to copy ID"
                    >
                      <span>INC-{alert.id.slice(0, 8).toUpperCase()}</span>
                      <Copy size={13} style={{ color: "var(--text-muted)" }} />
                    </button>

                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      Triggered by:{" "}
                      <strong style={{ color: "var(--text-primary)" }}>
                        {alert.triggeredByRole || "PASSENGER"}
                      </strong>
                    </span>

                    {tenant?.name && (
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        · Client: <strong style={{ color: "var(--text-primary)" }}>{tenant.name}</strong>
                      </span>
                    )}

                    {alert.escalationLevel > 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "rgba(234, 88, 12, 0.12)",
                          color: "#EA580C",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        Escalation Lvl {alert.escalationLevel}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={13} />
                      {new Date(alert.createdAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} ({formatRelativeTime(alert.createdAt)})
                    </span>
                    <StatusBadge status={alert.status} size="md" showPulse={isUrgent} />
                  </div>
                </div>

                {/* Telemetry & Route Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "14px",
                    backgroundColor: "var(--bg-card-nested, rgba(0, 0, 0, 0.02))",
                    padding: "14px 18px",
                    borderRadius: "var(--radius-md, 8px)",
                    border: "1px solid var(--border-subtle, #E5E7EB)",
                  }}
                >
                  {/* Reporting Party */}
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                      REPORTING COMMUTER
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "14px", marginTop: "3px" }}>
                      {alert.triggeredByRole === "DRIVER" ? "Driver Partner" : "Corporate Employee"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-primary, #5728b2)", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <User size={12} />
                      <span>ID: {alert.triggeredById.slice(0, 8)}...</span>
                      {alert.batteryPct !== null && alert.batteryPct !== undefined && (
                        <span style={{ marginLeft: "8px", display: "inline-flex", alignItems: "center", gap: "2px", color: alert.batteryPct < 20 ? "#DC2626" : "var(--text-secondary)" }}>
                          <Battery size={13} />
                          {alert.batteryPct}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Driver & Cab Details */}
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                      ASSIGNED DRIVER &amp; CAB
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "14px", marginTop: "3px" }}>
                      {driver?.fullName || "Assigned Driver"}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                      {driver?.phone ? (
                        <a
                          href={`tel:${driver.phone}`}
                          style={{ color: "var(--color-primary, #5728b2)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}
                        >
                          <Phone size={12} />
                          {driver.phone}
                        </a>
                      ) : (
                        <span>No phone</span>
                      )}
                      <span>·</span>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)" }}>
                        {vehicle?.registrationNumber || "CAB VEHICLE"}
                      </span>
                    </div>
                  </div>

                  {/* Route & Shift Details */}
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                      ROUTE &amp; SHIFT
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px", marginTop: "3px" }}>
                      {tenant?.name || "Corporate Fleet"}
                      {office?.name ? ` · ${office.name}` : ""}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Route: <span style={{ fontFamily: "monospace" }}>{alert.routeId.slice(0, 8)}</span>
                      {alert.route?.direction ? ` · ${alert.route.direction}` : ""}
                    </div>
                  </div>

                  {/* GPS & Location */}
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                      INCIDENT GPS LOCATION
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px", marginTop: "3px" }}>
                      {Number.isFinite(lat) && Number.isFinite(lng) ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Location acquired"}
                    </div>
                    <div style={{ marginTop: "4px" }}>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "12px",
                          color: "var(--color-primary, #5728b2)",
                          textDecoration: "none",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <MapPin size={12} />
                        View Live on Google Maps
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Audit & Notes Display */}
                {alert.resolutionNotes && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <strong style={{ color: "var(--text-primary)" }}>Investigation / Resolution Notes:</strong>{" "}
                    {alert.resolutionNotes}
                  </div>
                )}

                {/* Action Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                    borderTop: "1px solid var(--border-subtle)",
                    paddingTop: "12px",
                  }}
                >
                  {/* Left: Input for notes */}
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    <input
                      type="text"
                      placeholder="Add dispatcher notes or resolution audit..."
                      value={actionNotes[alert.id] || ""}
                      onChange={(e) =>
                        setActionNotes({ ...actionNotes, [alert.id]: e.target.value })
                      }
                      style={{
                        width: "100%",
                        height: "36px",
                        backgroundColor: "var(--bg-input, #FFFFFF)",
                        border: "1px solid var(--border-subtle, #E5E7EB)",
                        borderRadius: "var(--radius-md, 8px)",
                        padding: "0 12px",
                        fontSize: "13px",
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                    />
                  </div>

                  {/* Right: Operational Action Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Eye size={13} />}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      View Details
                    </Button>

                    {canAcknowledge && (
                      <Button
                        size="sm"
                        style={{
                          backgroundColor: "#2563EB",
                          color: "#FFFFFF",
                          border: "none",
                        }}
                        isLoading={actionLoadingId === alert.id}
                        onClick={() => void handleAcknowledge(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}

                    {canInvestigate && (
                      <Button
                        size="sm"
                        style={{
                          backgroundColor: "#D97706",
                          color: "#FFFFFF",
                          border: "none",
                        }}
                        isLoading={actionLoadingId === alert.id}
                        onClick={() => void handleInvestigate(alert.id)}
                      >
                        Investigate
                      </Button>
                    )}

                    {canEscalate && (
                      <Button
                        size="sm"
                        style={{
                          backgroundColor: "#DC2626",
                          color: "#FFFFFF",
                          border: "none",
                        }}
                        isLoading={actionLoadingId === alert.id}
                        onClick={() => void handleEscalate(alert.id)}
                      >
                        Escalate
                      </Button>
                    )}

                    {canResolve && (
                      <Button
                        size="sm"
                        style={{
                          backgroundColor: "#16A34A",
                          color: "#FFFFFF",
                          border: "none",
                        }}
                        isLoading={actionLoadingId === alert.id}
                        onClick={() => void handleResolve(alert.id, "RESOLVED")}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Incident Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedAlert)}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert ? `Incident INC-${selectedAlert.id.slice(0, 8).toUpperCase()}` : "Incident Details"}
        subtitle="Complete emergency telemetry, route metadata, and FSM transition log"
        width="620px"
      >
        {selectedAlert && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Status & Severity Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md, 8px)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>INCIDENT STATUS</div>
                <div style={{ marginTop: "4px" }}>
                  <StatusBadge status={selectedAlert.status} size="md" showPulse={isCriticalUrgent(selectedAlert.status)} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>SEVERITY LEVEL</div>
                <div style={{ fontWeight: 800, color: "var(--color-danger, #DC2626)", fontSize: "15px", marginTop: "4px" }}>
                  CRITICAL_P0
                </div>
              </div>
            </div>

            {/* FSM Progression Timeline */}
            <div>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "10px" }}>
                5-Stage Crisis FSM Progression
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "8px",
                  fontSize: "12px",
                }}
              >
                {[
                  { stage: "1. Triggered", done: true, time: selectedAlert.createdAt },
                  { stage: "2. Acknowledged", done: Boolean(selectedAlert.acknowledgedAt), time: selectedAlert.acknowledgedAt },
                  { stage: "3. Investigated", done: selectedAlert.status === "INVESTIGATING" || Boolean(selectedAlert.resolvedAt), time: null },
                  { stage: "4. Escalated", done: selectedAlert.status === "ESCALATED" || selectedAlert.escalationLevel > 0, time: selectedAlert.escalatedAt },
                  { stage: "5. Closed", done: Boolean(selectedAlert.resolvedAt), time: selectedAlert.resolvedAt },
                ].map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "10px",
                      borderRadius: "6px",
                      backgroundColor: s.done ? "rgba(22, 163, 74, 0.08)" : "var(--bg-surface)",
                      border: `1px solid ${s.done ? "rgba(22, 163, 74, 0.3)" : "var(--border-subtle)"}`,
                      color: s.done ? "#16A34A" : "var(--text-muted)",
                      fontWeight: s.done ? 600 : 400,
                    }}
                  >
                    <div>{s.done ? "✓ " : "○ "}{s.stage}</div>
                    {s.time && (
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                        {formatRelativeTime(s.time)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Data Breakdown */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                padding: "16px",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md, 8px)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>INCIDENT UUID</div>
                <div style={{ fontSize: "13px", fontFamily: "monospace", color: "var(--text-primary)", marginTop: "2px" }}>
                  {selectedAlert.id}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>CORPORATE ROUTE UUID</div>
                <div style={{ fontSize: "13px", fontFamily: "monospace", color: "var(--text-primary)", marginTop: "2px" }}>
                  {selectedAlert.routeId}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>CLIENT TENANT</div>
                <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600, marginTop: "2px" }}>
                  {selectedAlert.route?.tenant?.name || "Corporate Enterprise"} ({selectedAlert.route?.tenant?.code || "N/A"})
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>DESTINATION OFFICE</div>
                <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "2px" }}>
                  {selectedAlert.route?.office?.name || "Corporate Headquarters"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>ASSIGNED DRIVER</div>
                <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600, marginTop: "2px" }}>
                  {selectedAlert.route?.driver?.fullName || "Assigned Driver"} ({selectedAlert.route?.driver?.phone || "No phone"})
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>ASSIGNED CAB</div>
                <div style={{ fontSize: "13px", fontFamily: "monospace", color: "var(--text-primary)", marginTop: "2px" }}>
                  {(selectedAlert.route as any)?.vehicle?.registrationNumber || "CAB VEHICLE"}
                  {(selectedAlert.route as any)?.vehicle?.model ? ` (${(selectedAlert.route as any).vehicle.model})` : ""}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>TELEMETRY GPS</div>
                <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "2px" }}>
                  {selectedAlert.latitude}, {selectedAlert.longitude}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 700 }}>DEVICE BATTERY</div>
                <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "2px" }}>
                  {selectedAlert.batteryPct !== null ? `${selectedAlert.batteryPct}%` : "Not available"}
                </div>
              </div>
            </div>

            {/* Quick Actions in Drawer */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>
                Command Center Actions
              </h4>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <Button
                  size="md"
                  variant="outline"
                  leftIcon={<ExternalLink size={14} />}
                  onClick={() => window.open(`https://www.google.com/maps?q=${selectedAlert.latitude},${selectedAlert.longitude}`, "_blank")}
                >
                  Open in Google Maps
                </Button>

                {isActiveStatus(selectedAlert.status) && (
                  <>
                    <Button
                      size="md"
                      style={{ backgroundColor: "#2563EB", color: "#FFFFFF" }}
                      isLoading={actionLoadingId === selectedAlert.id}
                      onClick={() => void handleAcknowledge(selectedAlert.id)}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="md"
                      style={{ backgroundColor: "#D97706", color: "#FFFFFF" }}
                      isLoading={actionLoadingId === selectedAlert.id}
                      onClick={() => void handleInvestigate(selectedAlert.id)}
                    >
                      Investigate
                    </Button>
                    <Button
                      size="md"
                      style={{ backgroundColor: "#16A34A", color: "#FFFFFF" }}
                      isLoading={actionLoadingId === selectedAlert.id}
                      onClick={() => void handleResolve(selectedAlert.id, "RESOLVED")}
                    >
                      Resolve Safely
                    </Button>
                    <Button
                      size="md"
                      variant="outline"
                      isLoading={actionLoadingId === selectedAlert.id}
                      onClick={() => void handleResolve(selectedAlert.id, "FALSE_ALARM")}
                    >
                      Close as False Alarm
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Manual / Simulate SOS Modal */}
      <Modal
        isOpen={isRaiseModalOpen}
        onClose={() => setIsRaiseModalOpen(false)}
        title="Simulate / Raise SOS Emergency Alert"
        subtitle="Manually trigger a P0 emergency alert on a corporate route to test end-to-end synchronization across Admin & Ops panels."
      >
        <form onSubmit={handleManualTriggerSos} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
              Corporate Route ID *
            </label>
            <input
              type="text"
              placeholder="e.g. 13031ad2-854f-48cc-86d5-da2e3a1b1b43"
              value={raiseRouteId}
              onChange={(e) => setRaiseRouteId(e.target.value)}
              required
              style={{
                width: "100%",
                height: "38px",
                backgroundColor: "var(--bg-input, #FFFFFF)",
                border: "1px solid var(--border-subtle, #E5E7EB)",
                borderRadius: "var(--radius-md, 8px)",
                padding: "0 12px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={raiseLat}
                onChange={(e) => setRaiseLat(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: "38px",
                  backgroundColor: "var(--bg-input, #FFFFFF)",
                  border: "1px solid var(--border-subtle, #E5E7EB)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "0 12px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={raiseLng}
                onChange={(e) => setRaiseLng(e.target.value)}
                required
                style={{
                  width: "100%",
                  height: "38px",
                  backgroundColor: "var(--bg-input, #FFFFFF)",
                  border: "1px solid var(--border-subtle, #E5E7EB)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "0 12px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Emergency Reason
              </label>
              <input
                type="text"
                value={raiseReason}
                onChange={(e) => setRaiseReason(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  backgroundColor: "var(--bg-input, #FFFFFF)",
                  border: "1px solid var(--border-subtle, #E5E7EB)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "0 12px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px" }}>
                Battery %
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={raiseBattery}
                onChange={(e) => setRaiseBattery(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  backgroundColor: "var(--bg-input, #FFFFFF)",
                  border: "1px solid var(--border-subtle, #E5E7EB)",
                  borderRadius: "var(--radius-md, 8px)",
                  padding: "0 12px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsRaiseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              isLoading={isRaisingSos}
              leftIcon={<AlertOctagon size={15} />}
            >
              Broadcast P0 SOS
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
