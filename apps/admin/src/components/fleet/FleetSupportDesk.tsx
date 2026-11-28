"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Headphones,
  Paperclip,
  Search,
  Send,
} from "lucide-react";
import { adminApi } from "../../lib/api/client";
import type {
  AdminFleetSupportMetrics,
  AdminFleetSupportStatusType,
  AdminFleetSupportTicket,
} from "../../lib/api/types";
import {
  Button,
  DataTable,
  Drawer,
  FeedbackBanner,
  FilterBar,
  KpiStrip,
  StatusBadge,
  Textarea,
} from "../common";

const FLEET_SUPPORT_TABS = [
  { id: "ALL", label: "All Tickets" },
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "CLOSED", label: "Closed" },
];

export const FleetSupportDesk: React.FC = () => {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [tickets, setTickets] = useState<AdminFleetSupportTicket[]>([]);
  const [metrics, setMetrics] = useState<AdminFleetSupportMetrics>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [selected, setSelected] = useState<AdminFleetSupportTicket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listFleetSupportTickets({
        status: activeTab !== "ALL" ? activeTab : undefined,
        limit: 100,
      });
      setTickets(res.items || []);
      if (res.metrics) setMetrics(res.metrics);
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load Fleet support tickets.",
      });
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase().trim();
    return tickets.filter(
      (t) =>
        t.ticketNumber.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.fleet?.name?.toLowerCase().includes(q) ||
        t.fleet?.code?.toLowerCase().includes(q),
    );
  }, [tickets, searchQuery]);

  const openTicket = async (t: AdminFleetSupportTicket) => {
    setSelected(t);
    setReplyText("");
    setDetailLoading(true);
    try {
      const detail = await adminApi.getFleetSupportTicketDetail(t.id);
      setSelected(detail);
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load ticket conversation.",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !replyText.trim()) return;
    setActionLoading(true);
    try {
      const updated = await adminApi.replyFleetSupportTicket(
        selected.id,
        replyText.trim(),
      );
      setSelected(updated);
      setReplyText("");
      setAlert({
        type: "success",
        message: `Reply sent to ${selected.fleet?.name || "Fleet"} and notification emitted.`,
      });
      await loadTickets();
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to send support reply.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (nextStatus: AdminFleetSupportStatusType) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const updated = await adminApi.updateFleetSupportTicketStatus(
        selected.id,
        nextStatus,
        replyText.trim() || undefined,
      );
      setSelected(updated);
      setReplyText("");
      setAlert({
        type: "success",
        message: `Ticket ${updated.ticketNumber} updated to ${nextStatus}.`,
      });
      await loadTickets();
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update ticket status.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      <KpiStrip
        columns={4}
        items={[
          {
            id: "total",
            label: "Total Fleet Tickets",
            value: metrics.total,
            subtext: "Submitted by Fleet Portal",
            icon: <Headphones size={16} color="var(--text-brand)" />,
            tone: "indigo",
          },
          {
            id: "open",
            label: "Open",
            value: metrics.open,
            subtext: "Awaiting support response",
            icon: <Clock size={16} color="var(--color-danger)" />,
            tone: "danger",
          },
          {
            id: "in_progress",
            label: "In Progress",
            value: metrics.inProgress,
            subtext: "Active conversations",
            icon: <Search size={16} color="var(--color-warning)" />,
            tone: "warning",
          },
          {
            id: "resolved",
            label: "Resolved / Closed",
            value: metrics.resolved,
            subtext: "Completed Fleet cases",
            icon: <CheckCircle2 size={16} color="var(--color-success)" />,
            tone: "success",
          },
        ]}
      />

      <FilterBar
        tabs={FLEET_SUPPORT_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search ticket #, fleet name, code, subject..."
      />

      <DataTable
        columns={[
          {
            key: "ticketNumber",
            label: "TICKET #",
            render: (t: AdminFleetSupportTicket) => (
              <div>
                <div className="text-mono font-bold text-brand text-base">
                  {t.ticketNumber}
                </div>
                <div className="text-sm text-muted mt-compact">
                  {new Date(t.updatedAt).toLocaleDateString("en-IN")}
                </div>
              </div>
            ),
          },
          {
            key: "fleet",
            label: "FLEET PARTNER",
            render: (t: AdminFleetSupportTicket) => (
              <div>
                <div className="font-semibold text-primary text-body-sm">
                  {t.fleet?.name || "Fleet"} ({t.fleet?.code || "—"})
                </div>
                <div className="text-sm text-muted mt-micro">
                  {t.createdBy?.fullName || t.fleet?.ownerName} ·{" "}
                  {t.createdBy?.phone || t.fleet?.phone}
                </div>
              </div>
            ),
          },
          {
            key: "category",
            label: "CATEGORY",
            render: (t: AdminFleetSupportTicket) => (
              <span className="rounded-sm bg-card-elevated border border-subtle text-sm font-semibold text-secondary" style={{ padding: "0.2rem 0.5rem" }}>
                {t.category}
              </span>
            ),
          },
          {
            key: "subject",
            label: "SUBJECT",
            render: (t: AdminFleetSupportTicket) => (
              <div style={{ maxWidth: "320px" }}>
                <div className="font-medium text-primary text-base whitespace-nowrap overflow-hidden text-ellipsis">
                  {t.subject}
                </div>
                <div className="text-sm text-muted whitespace-nowrap overflow-hidden text-ellipsis">
                  {t.description}
                </div>
              </div>
            ),
          },
          {
            key: "status",
            label: "STATUS",
            render: (t: AdminFleetSupportTicket) => <StatusBadge status={t.status} />,
          },
          {
            key: "actions",
            label: "ACTION",
            align: "right",
            render: (t: AdminFleetSupportTicket) => (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void openTicket(t);
                }}
              >
                Open Thread
              </Button>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(t) => t.id}
        loading={loading}
        onRowClick={(t) => void openTicket(t)}
        emptyTitle="No Fleet Portal tickets"
        emptySubtitle={`No fleet support tickets matching "${activeTab}".`}
      />

      <Drawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.ticketNumber}: ${selected.subject}` : "Fleet Ticket"}
        subtitle={
          selected
            ? `${selected.fleet?.name || "Fleet"} (${selected.fleet?.code || "—"}) · ${selected.category}`
            : ""
        }
        width="640px"
        footer={
          selected && (
            <div className="flex gap-2 flex-wrap justify-end w-full">
              {selected.status !== "IN_PROGRESS" && selected.status !== "CLOSED" && (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={actionLoading}
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                >
                  Mark In Progress
                </Button>
              )}
              {selected.status !== "RESOLVED" && selected.status !== "CLOSED" && (
                <Button
                  variant="success"
                  size="sm"
                  isLoading={actionLoading}
                  onClick={() => handleStatusChange("RESOLVED")}
                >
                  Mark Resolved
                </Button>
              )}
              {selected.status !== "CLOSED" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={actionLoading}
                  onClick={() => handleStatusChange("CLOSED")}
                >
                  Close Ticket
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={actionLoading}
                  onClick={() => handleStatusChange("OPEN")}
                >
                  Reopen Ticket
                </Button>
              )}
            </div>
          )
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-md bg-card-elevated border border-subtle flex justify-between items-center">
              <div>
                <div className="text-sm text-muted">Status</div>
                <div className="mt-1">
                  <StatusBadge status={selected.status} />
                </div>
              </div>
              <div className="text-right text-sm text-secondary">
                <div>{selected.createdBy?.fullName || selected.fleet?.ownerName}</div>
                <div className="text-mono text-muted">
                  {selected.createdBy?.phone || selected.fleet?.phone}
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div className="text-muted text-base p-4">Loading conversation thread...</div>
            ) : (
              <div className="flex flex-col gap-3">
                {(selected.messages || []).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-md border border-subtle"
                    style={{
                      backgroundColor:
                        m.senderRole === "ADMIN" || m.senderRole === "OPS"
                          ? "rgba(99, 102, 241, 0.08)"
                          : "var(--bg-surface)",
                    }}
                  >
                    <div className="flex justify-between text-xs text-muted mb-1">
                      <span className="font-semibold text-primary">
                        {m.senderName || m.senderRole} ({m.senderRole})
                      </span>
                      <span>{new Date(m.createdAt).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="text-base text-primary whitespace-pre-wrap">{m.body}</div>
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-2">
                        {m.attachments.map((att) => (
                          <a
                            key={att.key}
                            href={att.downloadUrl || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand underline"
                          >
                            <Paperclip size={11} /> {att.fileName}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selected.status !== "CLOSED" ? (
              <form onSubmit={handleSendReply} className="flex flex-col gap-2 pt-2 border-t border-subtle">
                <Textarea
                  label="Reply to Fleet Owner"
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your support response (automatically notifies Fleet Portal)..."
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={actionLoading}
                    disabled={!replyText.trim()}
                    leftIcon={<Send size={13} />}
                  >
                    Send Reply
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-3 rounded-md bg-surface border border-subtle text-sm text-muted">
                This ticket is closed. Click &quot;Reopen Ticket&quot; below to post additional replies.
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
};
