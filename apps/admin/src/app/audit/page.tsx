"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FileText, ShieldCheck, Car, Wallet } from "lucide-react";
import { adminApi } from "../../lib/api/client";
import { AuditLogItem } from "../../lib/api/types";
import {
  PageHeader,
  KpiStrip,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
} from "../../components/common";

const ROLE_TABS = [
  { id: "ALL", label: "All Events" },
  { id: "ADMIN", label: "Admin Actions" },
  { id: "DRIVER", label: "Driver Activity" },
  { id: "VENDOR", label: "Enterprise / Vendor" },
  { id: "SYSTEM", label: "System Automated" },
];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setLoading(true);
    try {
      const data = await adminApi
        .getAuditLogs(100)
        .catch(() => [] as AuditLogItem[]);
      setLogs(data);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (activeTab !== "ALL" && log.actorRole?.toUpperCase() !== activeTab) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        log.action.toLowerCase().includes(q) ||
        log.entityName.toLowerCase().includes(q) ||
        (log.actorPhone && log.actorPhone.toLowerCase().includes(q)) ||
        (log.entityId && log.entityId.toLowerCase().includes(q))
      );
    });
  }, [logs, activeTab, searchQuery]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    const adminEvents = logs.filter((l) => l.actorRole === "ADMIN").length;
    const supplyEvents = logs.filter((l) => l.actorRole === "DRIVER").length;
    const financialEvents = logs.filter(
      (l) => l.entityName === "SETTLEMENT" || l.entityName === "PAYMENT",
    ).length;

    return {
      total: logs.length,
      adminEvents,
      supplyEvents,
      financialEvents,
    };
  }, [logs]);

  return (
    <div className="admin-page">
      {/* Page Header */}
      <PageHeader
        title="Audit Logs & Compliance"
        subtitle="Immutable compliance ledger tracing every administrative mutation across the platform"
        liveStatus="Append-Only Ledger"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={loadAuditLogs}
            leftIcon="↻"
          >
            Refresh
          </Button>
        }
      />

      {/* Unified Reference KPI Strip */}
      <KpiStrip
        columns={4}
        items={[
          {
            label: "Total Audit Events",
            value: metrics.total,
            subtext: "Fetched ledger batch",
            tone: "primary",
            icon: <FileText size={14} />,
          },
          {
            label: "Admin Interventions",
            value: metrics.adminEvents,
            subtext: "Manual operator actions",
            tone: "warning",
            icon: <ShieldCheck size={14} />,
          },
          {
            label: "Supply Transitions",
            value: metrics.supplyEvents,
            subtext: "Driver & vehicle updates",
            tone: "success",
            icon: <Car size={14} />,
          },
          {
            label: "Financial Actions",
            value: metrics.financialEvents,
            subtext: "Payout & settlement entries",
            tone: "info",
            icon: <Wallet size={14} />,
          },
        ]}
      />

      {/* Unified Audit Log Table with Embedded Filter Toolbar */}
      <DataTable
        title="Compliance Activity Stream"
        subtitle="Select any log row to inspect full before/after metadata in the right-side drawer."
        countLabel={`${filteredLogs.length} entries`}
        toolbar={
          <FilterBar
            tabs={ROLE_TABS.map((t) => ({
              id: t.id,
              label: t.label,
              count:
                t.id === "ALL"
                  ? logs.length
                  : logs.filter((l) => l.actorRole?.toUpperCase() === t.id)
                      .length,
            }))}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search logs..."
            style={{ marginBottom: 0 }}
          />
        }
        columns={[
          {
            header: "TIMESTAMP",
            accessor: (log) => (
              <div className="text-sm text-secondary whitespace-nowrap">
                <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                <div className="text-muted text-xs">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ),
          },
          {
            header: "ACTOR & ROLE",
            accessor: (log) => (
              <div>
                <div
                  className="font-semibold text-primary"
                  style={{ fontSize: "0.78125rem" }}
                >
                  {log.actorPhone || "System"}
                </div>
                <div
                  className="text-2xs text-mono text-brand"
                  style={{ marginTop: "0.1rem" }}
                >
                  {log.actorRole || "SYSTEM"}
                </div>
              </div>
            ),
          },
          {
            header: "ACTION",
            accessor: (log) => <StatusBadge status={log.action} size="sm" />,
          },
          {
            header: "TARGET ENTITY",
            accessor: (log) => (
              <div>
                <span className="font-semibold text-sm text-primary">
                  {log.entityName}
                </span>
                <div
                  title={log.entityId || undefined}
                  className="text-mono text-xs text-muted"
                  style={{ marginTop: "0.1rem" }}
                >
                  {log.entityId
                    ? `#${log.entityId.length > 10 ? `${log.entityId.slice(0, 8)}…` : log.entityId}`
                    : "—"}
                </div>
              </div>
            ),
          },
          {
            header: "PAYLOAD",
            align: "right",
            accessor: (log) => (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedLog(log);
                }}
              >
                Inspect
              </Button>
            ),
          },
        ]}
        data={filteredLogs}
        keyExtractor={(log) => log.id}
        loading={loading}
        onRowClick={(log) => setSelectedLog(log)}
        emptyTitle="No audit records found"
        emptySubtitle="No audit events match your selected role filter or search term."
      />

      {/* Slide-out Audit Payload Drawer */}
      <Drawer
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={
          selectedLog ? `Audit Event: ${selectedLog.action}` : "Audit Event"
        }
        subtitle={selectedLog ? `Journal Entry #${selectedLog.id}` : ""}
        footer={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedLog(null)}
          >
            Close Inspector
          </Button>
        }
      >
        {selectedLog && (
          <div className="flex flex-col" style={{ gap: "0.9rem" }}>
            {/* Event Summary Card */}
            <div
              className="rounded-md bg-card border border-subtle flex flex-col gap-2"
              style={{ padding: "0.9rem" }}
            >
              <div
                className="text-sm font-semibold text-primary border-b border-subtle"
                style={{ paddingBottom: "0.4rem" }}
              >
                Event Metadata
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Actor Identity:</span>
                <span className="font-semibold text-primary">
                  {selectedLog.actorPhone || "System"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Role Authority:</span>
                <span className="text-mono text-brand">
                  {selectedLog.actorRole || "SYSTEM"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Target Entity:</span>
                <span className="font-semibold text-primary">
                  {selectedLog.entityName}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Target Entity ID:</span>
                <span className="text-mono text-secondary">
                  {selectedLog.entityId || "N/A"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Origin IP Address:</span>
                <span className="text-mono text-muted">
                  {selectedLog.ipAddress || "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Recorded Timestamp:</span>
                <span className="text-primary">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            {/* JSON Payload Viewer */}
            <div
              className="rounded-md bg-card border border-subtle"
              style={{ padding: "0.9rem" }}
            >
              <div className="text-sm font-semibold text-primary mb-2">
                Journal Payload Data (Immutable JSON)
              </div>
              <pre
                className="m-0 text-mono text-sm bg-base border border-subtle p-3 rounded-sm overflow-x-auto"
                style={{ color: "var(--brand-secondary)", lineHeight: 1.45 }}
              >
                {selectedLog.payload
                  ? JSON.stringify(selectedLog.payload, null, 2)
                  : "// No structured payload recorded"}
              </pre>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
