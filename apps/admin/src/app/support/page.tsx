"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Headphones,
  Clock,
  Search,
  CheckCircle2,
  Building2,
  User,
  Car,
  MessageSquare,
  Send,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { adminApi } from "../../lib/api/client";
import {
  SupportTicketItem,
  CorporateSupportTicket,
  CorporateTicketMessage,
  CorporateTicketStatus,
} from "../../lib/api/types";
import {
  PageHeader,
  KpiStrip,
  SegmentedTabs,
  FilterBar,
  DataTable,
  StatusBadge,
  Button,
  Drawer,
  FeedbackBanner,
  ConfirmDialog,
  Form,
  Input,
  Textarea,
} from "../../components/common";

const DESK_TABS = [
  { id: "CORPORATE_ETS", label: "Corporate ETS Support" },
  { id: "ON_DEMAND", label: "On-Demand Helpdesk & Disputes" },
];

const CORP_STATUS_TABS = [
  { id: "ALL", label: "All Tickets" },
  { id: "OPEN", label: "Open" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "CLOSED", label: "Closed" },
];

const ON_DEMAND_STATUS_TABS = [
  { id: "ALL", label: "All Tickets" },
  { id: "PENDING", label: "Pending" },
  { id: "UNDER_REVIEW", label: "Under Review" },
  { id: "RESOLVED", label: "Resolved" },
];

export default function SupportPage() {
  const [activeDesk, setActiveDesk] = useState<"CORPORATE_ETS" | "ON_DEMAND">(
    "CORPORATE_ETS",
  );
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // Corporate ETS State
  // ---------------------------------------------------------------------------
  const [corpTickets, setCorpTickets] = useState<CorporateSupportTicket[]>([]);
  const [corpLoading, setCorpLoading] = useState(true);
  const [corpActiveTab, setCorpActiveTab] = useState("ALL");
  const [corpSearchQuery, setCorpSearchQuery] = useState("");
  const [selectedCorpTicket, setSelectedCorpTicket] =
    useState<CorporateSupportTicket | null>(null);

  // Corporate message thread state
  const [corpMessages, setCorpMessages] = useState<CorporateTicketMessage[]>(
    [],
  );
  const [corpMessagesLoading, setCorpMessagesLoading] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Corporate status update state
  const [corpStatusNote, setCorpStatusNote] = useState("");
  const [corpTargetStatus, setCorpTargetStatus] =
    useState<CorporateTicketStatus>("IN_PROGRESS");
  const [corpStatusLoading, setCorpStatusLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // On-Demand Helpdesk State (Preserving existing functionality)
  // ---------------------------------------------------------------------------
  const [onDemandTickets, setOnDemandTickets] = useState<SupportTicketItem[]>(
    [],
  );
  const [onDemandLoading, setOnDemandLoading] = useState(false);
  const [onDemandActiveTab, setOnDemandActiveTab] = useState("ALL");
  const [onDemandSearchQuery, setOnDemandSearchQuery] = useState("");
  const [selectedOnDemandTicket, setSelectedOnDemandTicket] =
    useState<SupportTicketItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [onDemandActionLoading, setOnDemandActionLoading] = useState(false);
  const [confirmResolveOpen, setConfirmResolveOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Corporate ETS Handlers
  // ---------------------------------------------------------------------------
  const loadCorpTickets = useCallback(async (status?: string) => {
    setCorpLoading(true);
    try {
      const data = await adminApi
        .listCorporateSupportTickets({
          status:
            status && status !== "ALL"
              ? (status as CorporateTicketStatus)
              : undefined,
          limit: 100,
        })
        .catch(() => [] as CorporateSupportTicket[]);
      setCorpTickets(Array.isArray(data) ? data : []);
    } finally {
      setCorpLoading(false);
    }
  }, []);

  const loadCorpMessages = useCallback(async (ticketId: string) => {
    setCorpMessagesLoading(true);
    try {
      const msgs = await adminApi
        .listCorporateTicketMessages(ticketId)
        .catch(() => [] as CorporateTicketMessage[]);
      setCorpMessages(Array.isArray(msgs) ? msgs : []);
    } finally {
      setCorpMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeDesk === "CORPORATE_ETS") {
      loadCorpTickets(corpActiveTab);
    } else {
      loadOnDemandTickets(onDemandActiveTab);
    }
  }, [activeDesk, corpActiveTab, onDemandActiveTab, loadCorpTickets]);

  const handleSelectCorpTicket = (ticket: CorporateSupportTicket) => {
    setSelectedCorpTicket(ticket);
    setCorpStatusNote(ticket.resolutionNotes || ticket.adminNotes || "");
    setCorpTargetStatus(
      ticket.status === "OPEN"
        ? "IN_PROGRESS"
        : ticket.status === "IN_PROGRESS"
          ? "RESOLVED"
          : ticket.status === "RESOLVED"
            ? "CLOSED"
            : "IN_PROGRESS",
    );
    setReplyMessage("");
    setIsInternalReply(false);
    loadCorpMessages(ticket.id);
  };

  const handleSendCorpReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCorpTicket || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const newMsg = await adminApi.sendCorporateTicketMessage(
        selectedCorpTicket.id,
        {
          message: replyMessage.trim(),
          isInternal: isInternalReply,
        },
      );
      setCorpMessages((prev) => [...prev, newMsg]);
      setReplyMessage("");
      setAlert({
        type: "success",
        message: isInternalReply
          ? "Internal ops note recorded."
          : "Reply sent. Visible in Corporate Portal.",
      });
      loadCorpTickets(corpActiveTab);
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err.message || "Failed to send reply",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateCorpStatus = async (
    status: CorporateTicketStatus,
    customNote?: string,
  ) => {
    if (!selectedCorpTicket) return;

    setCorpStatusLoading(true);
    try {
      const noteToSend = customNote !== undefined ? customNote : corpStatusNote;
      const updated = await adminApi.updateCorporateSupportTicketStatus(
        selectedCorpTicket.id,
        status,
        noteToSend.trim() || undefined,
      );
      setSelectedCorpTicket(updated);
      setAlert({
        type: "success",
        message: `Corporate support ticket #${updated.ticketNumber || updated.id.slice(0, 8).toUpperCase()} updated to ${status}.`,
      });
      loadCorpTickets(corpActiveTab);
      loadCorpMessages(updated.id);
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err.message || "Failed to update ticket status",
      });
    } finally {
      setCorpStatusLoading(false);
    }
  };

  // Filtered Corporate Tickets
  const filteredCorp = useMemo(() => {
    if (!corpSearchQuery.trim()) return corpTickets;
    const q = corpSearchQuery.toLowerCase().trim();
    return corpTickets.filter((t) => {
      return (
        t.id.toLowerCase().includes(q) ||
        (t.ticketNumber && t.ticketNumber.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q)) ||
        (t.tenant?.name && t.tenant.name.toLowerCase().includes(q)) ||
        (t.tenant?.code && t.tenant.code.toLowerCase().includes(q)) ||
        (t.employee?.fullName &&
          t.employee.fullName.toLowerCase().includes(q)) ||
        (t.employee?.employeeCode &&
          t.employee.employeeCode.toLowerCase().includes(q)) ||
        (t.employee?.phone && t.employee.phone.toLowerCase().includes(q)) ||
        (t.employee?.phoneNumber &&
          t.employee.phoneNumber.toLowerCase().includes(q)) ||
        (t.driver?.name && t.driver.name.toLowerCase().includes(q)) ||
        (t.driver?.phone && t.driver.phone.toLowerCase().includes(q)) ||
        (t.routeId && t.routeId.toLowerCase().includes(q))
      );
    });
  }, [corpTickets, corpSearchQuery]);

  // Corporate Metrics
  const corpMetrics = useMemo(() => {
    const open = corpTickets.filter((t) => t.status === "OPEN").length;
    const inProgress = corpTickets.filter(
      (t) => t.status === "IN_PROGRESS",
    ).length;
    const resolved = corpTickets.filter(
      (t) => t.status === "RESOLVED" || t.status === "CLOSED",
    ).length;
    return { total: corpTickets.length, open, inProgress, resolved };
  }, [corpTickets]);

  // ---------------------------------------------------------------------------
  // On-Demand Handlers
  // ---------------------------------------------------------------------------
  async function loadOnDemandTickets(status: string) {
    setOnDemandLoading(true);
    try {
      const data = await adminApi
        .getSupportTickets({
          status: status !== "ALL" ? status : undefined,
        })
        .catch(() => [] as SupportTicketItem[]);
      setOnDemandTickets(Array.isArray(data) ? data : []);
    } finally {
      setOnDemandLoading(false);
    }
  }

  const filteredOnDemand = useMemo(() => {
    if (!onDemandSearchQuery.trim()) return onDemandTickets;
    const q = onDemandSearchQuery.toLowerCase().trim();
    return onDemandTickets.filter((t) => {
      return (
        t.id.toLowerCase().includes(q) ||
        (t.reporterName && t.reporterName.toLowerCase().includes(q)) ||
        (t.issueType && t.issueType.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.reporterPhone && t.reporterPhone.toLowerCase().includes(q))
      );
    });
  }, [onDemandTickets, onDemandSearchQuery]);

  const onDemandMetrics = useMemo(() => {
    const pending = onDemandTickets.filter(
      (t) => t.status === "PENDING",
    ).length;
    const review = onDemandTickets.filter(
      (t) => t.status === "UNDER_REVIEW",
    ).length;
    const resolved = onDemandTickets.filter(
      (t) => t.status === "RESOLVED",
    ).length;
    return { total: onDemandTickets.length, pending, review, resolved };
  }, [onDemandTickets]);

  async function handleResolveOnDemand(
    status: "PENDING" | "UNDER_REVIEW" | "RESOLVED",
  ) {
    if (!selectedOnDemandTicket) return;

    setOnDemandActionLoading(true);
    try {
      await adminApi.resolveSupportTicket(selectedOnDemandTicket.id, {
        status,
        notes:
          resolutionNotes ||
          selectedOnDemandTicket.operatorNotes ||
          "Processed by Administrator",
      });

      setAlert({
        type: "success",
        message: `Support ticket #${selectedOnDemandTicket.id.slice(0, 8).toUpperCase()} updated to ${status}.`,
      });
      setConfirmResolveOpen(false);
      setSelectedOnDemandTicket(null);
      setResolutionNotes("");
      loadOnDemandTickets(onDemandActiveTab);
    } catch (err: any) {
      setAlert({
        type: "error",
        message: err.message || "Failed to update support ticket",
      });
    } finally {
      setOnDemandActionLoading(false);
    }
  }

  return (
    <div className="admin-page">
      {/* Alert Banner */}
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Support & Operational Helpdesk"
        subtitle="Unified resolution platform for Corporate ETS SLAs, commuter complaints, driver dispatch escalations, and ride disputes"
        liveStatus="Helpdesk Dispatch Online"
      />

      {/* Primary Module Tabs */}
      <SegmentedTabs
        tabs={DESK_TABS}
        activeTab={activeDesk}
        onChange={(tab) => setActiveDesk(tab as "CORPORATE_ETS" | "ON_DEMAND")}
      />

      {activeDesk === "CORPORATE_ETS" ? (
        <>
          {/* Corporate ETS KPI Metrics */}
          <KpiStrip
            columns={4}
            items={[
              {
                id: "total",
                label: "Corporate Tickets",
                value: corpMetrics.total,
                subtext: "Active ETS support queue",
                icon: <Headphones size={16} color="var(--text-brand)" />,
                tone: "indigo",
              },
              {
                id: "open",
                label: "Open / Triage Pending",
                value: corpMetrics.open,
                subtext: "Awaiting operator response",
                icon: <Clock size={16} color="var(--color-danger)" />,
                tone: "danger",
              },
              {
                id: "in_progress",
                label: "Under Investigation",
                value: corpMetrics.inProgress,
                subtext: "Active resolution & driver inquiry",
                icon: <Search size={16} color="var(--color-warning)" />,
                tone: "warning",
              },
              {
                id: "resolved",
                label: "Resolved / Closed Cases",
                value: corpMetrics.resolved,
                subtext: "Completed interventions",
                icon: <CheckCircle2 size={16} color="var(--color-success)" />,
                tone: "success",
              },
            ]}
          />

          {/* Corporate ETS Filter Bar */}
          <FilterBar
            tabs={CORP_STATUS_TABS.map((t) => ({
              id: t.id,
              label: t.label,
            }))}
            activeTab={corpActiveTab}
            onTabChange={setCorpActiveTab}
            search={corpSearchQuery}
            onSearchChange={setCorpSearchQuery}
            searchPlaceholder="Search by ticket #, company, employee, driver, category..."
          />

          {/* Corporate ETS DataTable */}
          <DataTable
            columns={[
              {
                key: "id",
                label: "TICKET # & SLA",
                render: (t: CorporateSupportTicket) => (
                  <div>
                    <div
                      className="text-mono font-bold text-base"
                      style={{ color: "var(--text-brand)" }}
                    >
                      #{t.ticketNumber || t.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-sm text-muted mt-compact">
                      {new Date(t.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      {new Date(t.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div
                      className="inline-block mt-1 text-xs font-semibold"
                      style={{
                        color: "var(--support-accent)",
                        backgroundColor: "var(--support-accent-soft)",
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}
                    >
                      SLA: {t.slaMinutes}m
                    </div>
                  </div>
                ),
              },
              {
                key: "tenant",
                label: "CORPORATE CLIENT",
                render: (t: CorporateSupportTicket) => (
                  <div>
                    <div className="font-semibold text-primary text-base">
                      {t.tenant?.name || "Corporate Client"}
                    </div>
                    <div className="text-sm text-muted mt-micro">
                      Code:{" "}
                      <span className="text-mono font-semibold">
                        {t.tenant?.code || "—"}
                      </span>
                    </div>
                  </div>
                ),
              },
              {
                key: "employee",
                label: "COMMUTER / EMPLOYEE",
                render: (t: CorporateSupportTicket) => (
                  <div>
                    <div className="font-semibold text-primary text-body-sm">
                      {t.employee?.fullName || "Employee"}
                    </div>
                    <div className="text-sm text-muted mt-micro">
                      {t.employee?.phoneNumber || t.employee?.phone || "—"}
                      {t.employee?.employeeCode && (
                        <span
                          className="text-brand font-medium"
                          style={{ marginLeft: 6 }}
                        >
                          ({t.employee.employeeCode})
                        </span>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: "driver",
                label: "DRIVER & ROUTE",
                render: (t: CorporateSupportTicket) => (
                  <div className="text-sm">
                    {t.driver ? (
                      <div>
                        <div className="font-semibold text-primary">
                          {t.driver.name}
                        </div>
                        <div className="text-muted">
                          {t.driver.phone ||
                            t.driver.licenseNumber ||
                            "Assigned Driver"}
                        </div>
                        {t.driver.vehiclePlate && (
                          <div
                            className="text-mono font-bold"
                            style={{ color: "var(--text-brand)" }}
                          >
                            {t.driver.vehiclePlate}
                          </div>
                        )}
                      </div>
                    ) : t.routeId ? (
                      <div>
                        <span className="text-secondary">Route Linked:</span>
                        <div className="text-mono text-brand font-semibold">
                          {t.routeId.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                    ) : (
                      <span
                        className="text-muted"
                        style={{ fontStyle: "italic" }}
                      >
                        Direct Portal Issue
                      </span>
                    )}
                  </div>
                ),
              },
              {
                key: "issue",
                label: "CATEGORY & SUMMARY",
                render: (t: CorporateSupportTicket) => (
                  <div style={{ maxWidth: "280px" }}>
                    <div className="mb-1">
                      <span
                        className="rounded-sm bg-card-elevated border border-subtle text-xs font-bold uppercase"
                        style={{ padding: "0.15rem 0.5rem", color: "#475569" }}
                      >
                        {t.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="text-base font-semibold text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                      {t.subject}
                    </div>
                    <div
                      className="text-sm text-muted whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ marginTop: "0.1rem" }}
                    >
                      {t.description}
                    </div>
                  </div>
                ),
              },
              {
                key: "priority",
                label: "PRIORITY",
                render: (t: CorporateSupportTicket) => {
                  const p = (t.priority || "MEDIUM").toUpperCase();
                  const isHigh = p === "CRITICAL" || p === "HIGH";
                  return (
                    <span
                      className="text-xs font-bold"
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: 4,
                        backgroundColor: isHigh ? "#FEE2E2" : "var(--support-blue-soft)",
                        color: isHigh ? "#DC2626" : "var(--support-accent)",
                        border: `1px solid ${isHigh ? "#FECACA" : "var(--support-accent-border)"}`,
                      }}
                    >
                      {p}
                    </span>
                  );
                },
              },
              {
                key: "status",
                label: "STATUS",
                render: (t: CorporateSupportTicket) => (
                  <StatusBadge status={t.status} />
                ),
              },
              {
                key: "actions",
                label: "ACTIONS",
                align: "right",
                render: (t: CorporateSupportTicket) => (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSelectCorpTicket(t)}
                  >
                    Manage & Chat
                  </Button>
                ),
              },
            ]}
            data={filteredCorp}
            keyExtractor={(t) => t.id}
            loading={corpLoading}
            emptyTitle="No corporate support tickets found"
            emptySubtitle="No tickets matching this status filter or search term."
          />

          {/* Corporate Support Ticket Slide-out Drawer */}
          <Drawer
            isOpen={!!selectedCorpTicket}
            onClose={() => setSelectedCorpTicket(null)}
            title={
              selectedCorpTicket
                ? `Support Ticket #${selectedCorpTicket.ticketNumber || selectedCorpTicket.id.slice(0, 8).toUpperCase()}`
                : "Support Ticket"
            }
            subtitle={
              selectedCorpTicket
                ? `Category: ${selectedCorpTicket.category.replace(/_/g, " ")} · Priority: ${selectedCorpTicket.priority}`
                : ""
            }
            footer={
              selectedCorpTicket ? (
                <div className="flex gap-3 w-full justify-between items-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedCorpTicket(null)}
                  >
                    Close
                  </Button>
                  <div className="flex gap-2">
                    {selectedCorpTicket.status === "OPEN" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={corpStatusLoading}
                        onClick={() => handleUpdateCorpStatus("IN_PROGRESS")}
                      >
                        Start Investigation
                      </Button>
                    )}
                    {selectedCorpTicket.status !== "RESOLVED" &&
                      selectedCorpTicket.status !== "CLOSED" && (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={corpStatusLoading}
                          onClick={() => handleUpdateCorpStatus("RESOLVED")}
                        >
                          Resolve Ticket
                        </Button>
                      )}
                    {selectedCorpTicket.status === "RESOLVED" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={corpStatusLoading}
                        onClick={() => handleUpdateCorpStatus("CLOSED")}
                      >
                        Close Ticket
                      </Button>
                    )}
                    {(selectedCorpTicket.status === "RESOLVED" ||
                      selectedCorpTicket.status === "CLOSED") && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={corpStatusLoading}
                        onClick={() =>
                          handleUpdateCorpStatus(
                            "IN_PROGRESS",
                            "Reopened by Admin Operator",
                          )
                        }
                      >
                        <RotateCcw size={13} style={{ marginRight: 4 }} />{" "}
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              ) : null
            }
          >
            {selectedCorpTicket && (
              <div className="flex flex-col gap-5">
                {/* Status Summary & Quick Status Switcher */}
                <div
                  className="p-4 rounded-md bg-surface-elevated border border-subtle flex flex-col"
                  style={{ gap: "0.875rem" }}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-muted">
                        Current Lifecycle Status
                      </div>
                      <div className="mt-1">
                        <StatusBadge status={selectedCorpTicket.status} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted">Created At & SLA</div>
                      <div className="text-base text-primary mt-1 font-semibold">
                        {new Date(
                          selectedCorpTicket.createdAt,
                        ).toLocaleString()}
                      </div>
                      <div
                        className="text-sm font-semibold"
                        style={{ color: "var(--support-accent)" }}
                      >
                        SLA Window: {selectedCorpTicket.slaMinutes} mins
                      </div>
                    </div>
                  </div>

                  {/* Operator Status Changer */}
                  <div className="border-t border-subtle pt-3">
                    <div
                      className="text-sm font-semibold text-primary"
                      style={{ marginBottom: "0.375rem" }}
                    >
                      Update Ticket Status & Notes:
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      {(
                        [
                          "OPEN",
                          "IN_PROGRESS",
                          "RESOLVED",
                          "CLOSED",
                        ] as CorporateTicketStatus[]
                      ).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setCorpTargetStatus(st)}
                          className="text-sm font-bold cursor-pointer"
                          style={{
                            padding: "4px 10px",
                            borderRadius: 4,
                            border:
                              corpTargetStatus === st
                                ? "2px solid var(--border-focus)"
                                : "1px solid var(--border-color)",
                            backgroundColor:
                              corpTargetStatus === st
                                ? "var(--support-accent-softer)"
                                : "var(--bg-surface)",
                            color:
                              corpTargetStatus === st
                                ? "var(--text-brand)"
                                : "var(--text-secondary)",
                          }}
                        >
                          {st.replace(/_/g, " ")}
                        </button>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={
                          corpStatusLoading ||
                          corpTargetStatus === selectedCorpTicket.status
                        }
                        onClick={() => handleUpdateCorpStatus(corpTargetStatus)}
                      >
                        {corpStatusLoading ? "Saving..." : "Apply Status"}
                      </Button>
                    </div>
                    <Input
                      size="sm"
                      value={corpStatusNote}
                      onChange={(e) => setCorpStatusNote(e.target.value)}
                      placeholder="Add status change remark or operator notes..."
                      wrapperClassName="!mb-0 mt-2"
                    />
                  </div>
                </div>

                {/* Information Cards: Company, Employee, Driver */}
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  {/* Company Info */}
                  <div className="p-4 rounded-md bg-surface-elevated border border-subtle">
                    <div
                      className="flex items-center text-sm font-bold mb-2"
                      style={{ gap: 6, color: "var(--text-brand)" }}
                    >
                      <Building2 size={14} /> Corporate Account
                    </div>
                    <div className="text-base font-semibold text-primary">
                      {selectedCorpTicket.tenant?.name || "Corporate Client"}
                    </div>
                    <div className="text-sm text-muted mt-compact">
                      Code:{" "}
                      <span className="text-mono">
                        {selectedCorpTicket.tenant?.code || "—"}
                      </span>
                    </div>
                  </div>

                  {/* Employee Info */}
                  <div className="p-4 rounded-md bg-surface-elevated border border-subtle">
                    <div
                      className="flex items-center text-sm font-bold mb-2"
                      style={{ gap: 6, color: "var(--support-accent)" }}
                    >
                      <User size={14} /> Affected Employee
                    </div>
                    <div className="text-base font-semibold text-primary">
                      {selectedCorpTicket.employee?.fullName || "Employee"}
                    </div>
                    <div className="text-sm text-muted mt-compact">
                      Phone:{" "}
                      <span className="text-mono">
                        {selectedCorpTicket.employee?.phoneNumber ||
                          selectedCorpTicket.employee?.phone ||
                          "—"}
                      </span>
                    </div>
                    {selectedCorpTicket.employee?.email && (
                      <div className="text-sm text-muted">
                        {selectedCorpTicket.employee.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Driver / Route Information */}
                {(selectedCorpTicket.driver || selectedCorpTicket.routeId) && (
                  <div className="p-4 rounded-md bg-surface-elevated border border-subtle">
                    <div
                      className="flex items-center text-sm font-bold mb-2"
                      style={{ gap: 6, color: "#047857" }}
                    >
                      <Car size={14} /> Driver & Vehicle Telemetry
                    </div>
                    {selectedCorpTicket.driver ? (
                      <div className="flex justify-between text-base">
                        <div>
                          <span className="text-muted">Driver:</span>{" "}
                          <strong>{selectedCorpTicket.driver.name}</strong>
                          {selectedCorpTicket.driver.phone && (
                            <span> ({selectedCorpTicket.driver.phone})</span>
                          )}
                        </div>
                        {selectedCorpTicket.driver.vehiclePlate && (
                          <div>
                            <span className="text-muted">Vehicle:</span>{" "}
                            <span className="text-mono font-bold">
                              {selectedCorpTicket.driver.vehiclePlate}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-base text-primary">
                        Linked Route ID:{" "}
                        <span className="text-mono text-brand">
                          {selectedCorpTicket.routeId}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Original Issue Description */}
                <div className="p-4 rounded-md bg-surface-elevated border border-subtle">
                  <div className="text-sm font-bold text-muted uppercase mb-tight">
                    Issue Reported
                  </div>
                  <div className="text-md font-bold text-primary mb-2">
                    {selectedCorpTicket.subject}
                  </div>
                  <p
                    className="text-base text-secondary p-3 rounded-sm bg-surface border border-subtle m-0 whitespace-pre-wrap"
                    style={{ lineHeight: 1.5 }}
                  >
                    {selectedCorpTicket.description ||
                      "No description provided."}
                  </p>
                </div>

                {/* Resolution Summary (If present) */}
                {selectedCorpTicket.resolutionNotes && (
                  <div
                    className="p-4 rounded-md flex flex-col"
                    style={{
                      backgroundColor: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      gap: 4,
                    }}
                  >
                    <div
                      className="flex items-center text-sm font-bold"
                      style={{ gap: 6, color: "#166534" }}
                    >
                      <CheckCircle2 size={15} color="#16A34A" /> Official
                      Resolution Notes
                    </div>
                    <div
                      className="text-base"
                      style={{ color: "#14532D", lineHeight: 1.5 }}
                    >
                      {selectedCorpTicket.resolutionNotes}
                    </div>
                    {selectedCorpTicket.resolvedAt && (
                      <div
                        className="text-sm"
                        style={{ color: "#16A34A", marginTop: 4 }}
                      >
                        Resolved at:{" "}
                        {new Date(
                          selectedCorpTicket.resolvedAt,
                        ).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                {/* Two-Way Message Conversation Thread */}
                <div className="p-4 rounded-md bg-surface-elevated border border-subtle flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div
                      className="flex items-center text-base font-bold text-primary"
                      style={{ gap: 6 }}
                    >
                      <MessageSquare size={15} color="var(--text-brand)" /> Conversation
                      History ({corpMessages.length})
                    </div>
                    <button
                      type="button"
                      onClick={() => loadCorpMessages(selectedCorpTicket.id)}
                      disabled={corpMessagesLoading}
                      className="border-0 cursor-pointer text-muted flex items-center text-sm"
                      style={{ background: "none", gap: 4 }}
                    >
                      <RefreshCw
                        size={12}
                        style={{
                          animation: corpMessagesLoading
                            ? "spin 1s linear infinite"
                            : undefined,
                        }}
                      />{" "}
                      Refresh
                    </button>
                  </div>

                  {/* Messages Stream */}
                  <div
                    className="overflow-y-auto flex flex-col p-2 bg-surface rounded-sm border border-subtle"
                    style={{ maxHeight: "260px", gap: "0.625rem" }}
                  >
                    {corpMessagesLoading && corpMessages.length === 0 ? (
                      <div className="text-center p-6 text-muted text-sm">
                        Loading message history...
                      </div>
                    ) : corpMessages.length === 0 ? (
                      <div className="text-center p-6 text-muted text-sm">
                        No messages recorded yet. Reply below to communicate
                        with the company, driver, or employee.
                      </div>
                    ) : (
                      corpMessages.map((m) => {
                        const isPlatformStaff =
                          m.senderRole === "ADMIN" || m.senderRole === "OPS";
                        const isInternal = Boolean(m.isInternal);

                        return (
                          <div
                            key={m.id}
                            className="rounded-sm"
                            style={{
                              padding: "0.625rem 0.875rem",
                              backgroundColor: isInternal
                                ? "#FEF3C7"
                                : isPlatformStaff
                                  ? "var(--support-accent-soft)"
                                  : "var(--bg-surface-elevated)",
                              border: `1px solid ${
                                isInternal
                                  ? "#FCD34D"
                                  : isPlatformStaff
                                    ? "var(--support-accent-border-strong)"
                                    : "var(--border-subtle)"
                              }`,
                              marginLeft: isPlatformStaff ? "1rem" : 0,
                              marginRight: isPlatformStaff ? 0 : "1rem",
                            }}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <div
                                className="text-sm font-bold"
                                style={{
                                  color: isPlatformStaff
                                    ? "var(--support-accent)"
                                    : "var(--text-primary)",
                                }}
                              >
                                {m.senderName ||
                                  (isPlatformStaff
                                    ? "AdhocX Support Desk"
                                    : "Client User")}
                                <span
                                  className="text-xs font-semibold text-muted"
                                  style={{ marginLeft: 6 }}
                                >
                                  ({m.senderRole})
                                </span>
                                {isInternal && (
                                  <span
                                    className="text-2xs font-extrabold"
                                    style={{
                                      marginLeft: 6,
                                      padding: "1px 5px",
                                      backgroundColor: "#F59E0B",
                                      color: "#FFFFFF",
                                      borderRadius: 3,
                                    }}
                                  >
                                    INTERNAL NOTE
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted">
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <div
                              className="text-base text-primary whitespace-pre-wrap"
                              style={{ lineHeight: 1.4 }}
                            >
                              {m.message}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Reply Form */}
                  <Form
                    onSubmit={handleSendCorpReply}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <Textarea
                      rows={3}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type a response to the company, employee, or driver..."
                      wrapperClassName="!mb-0"
                    />
                    <div className="flex justify-between items-center">
                      <label
                        className="flex items-center text-sm text-secondary cursor-pointer"
                        style={{ gap: 6 }}
                      >
                        <input
                          type="checkbox"
                          checked={isInternalReply}
                          onChange={(e) => setIsInternalReply(e.target.checked)}
                          className="cursor-pointer"
                        />
                        Internal ops note only (hidden from Corporate Portal)
                      </label>
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={sendingReply || !replyMessage.trim()}
                      >
                        <Send size={13} style={{ marginRight: 4 }} />
                        {sendingReply ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </Form>
                </div>
              </div>
            )}
          </Drawer>
        </>
      ) : (
        <>
          {/* On-Demand KPI Metrics */}
          <KpiStrip
            columns={4}
            items={[
              {
                id: "total",
                label: "Total Support Cases",
                value: onDemandMetrics.total,
                subtext: "Active ticket queue",
                icon: <Headphones size={16} color="var(--text-brand)" />,
                tone: "indigo",
              },
              {
                id: "pending",
                label: "Pending Triage",
                value: onDemandMetrics.pending,
                subtext: "Unassigned tickets",
                icon: <Clock size={16} color="var(--color-danger)" />,
                tone: "danger",
              },
              {
                id: "review",
                label: "Under Investigation",
                value: onDemandMetrics.review,
                subtext: "Operator active handling",
                icon: <Search size={16} color="var(--color-warning)" />,
                tone: "warning",
              },
              {
                id: "resolved",
                label: "Resolved Cases",
                value: onDemandMetrics.resolved,
                subtext: "Completed interventions",
                icon: <CheckCircle2 size={16} color="var(--color-success)" />,
                tone: "success",
              },
            ]}
          />

          {/* On-Demand Filter Bar */}
          <FilterBar
            tabs={ON_DEMAND_STATUS_TABS.map((t) => ({
              id: t.id,
              label: t.label,
            }))}
            activeTab={onDemandActiveTab}
            onTabChange={setOnDemandActiveTab}
            search={onDemandSearchQuery}
            onSearchChange={setOnDemandSearchQuery}
            searchPlaceholder="Search by user, phone, issue, description, ID..."
          />

          {/* On-Demand Tickets DataTable */}
          <DataTable
            columns={[
              {
                key: "id",
                label: "TICKET #",
                render: (t: SupportTicketItem) => (
                  <div>
                    <div className="text-mono font-bold text-brand text-base">
                      #{t.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-sm text-muted mt-compact">
                      {new Date(t.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ),
              },
              {
                key: "reporterName",
                label: "REPORTER & CONTACT",
                render: (t: SupportTicketItem) => (
                  <div>
                    <div className="font-semibold text-primary text-body-sm">
                      {t.reporterName}
                    </div>
                    <div className="text-sm text-muted mt-micro">
                      <span className="text-brand font-medium">
                        {t.reporterRole}
                      </span>{" "}
                      • {t.reporterPhone || "—"}
                    </div>
                  </div>
                ),
              },
              {
                key: "issueType",
                label: "ISSUE CATEGORY",
                render: (t: SupportTicketItem) => (
                  <span
                    className="rounded-sm bg-card-elevated border border-subtle text-sm font-semibold text-secondary"
                    style={{ padding: "0.2rem 0.5rem" }}
                  >
                    {t.issueType.replace(/_/g, " ")}
                  </span>
                ),
              },
              {
                key: "description",
                label: "DESCRIPTION & CONTEXT",
                render: (t: SupportTicketItem) => (
                  <div style={{ maxWidth: "320px" }}>
                    <div className="text-base text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                      {t.description || "No description provided"}
                    </div>
                    {t.relatedTripId && (
                      <div className="text-sm text-muted mt-snug">
                        Trip: {t.relatedTripId.slice(0, 8).toUpperCase()}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "status",
                label: "STATUS",
                render: (t: SupportTicketItem) => (
                  <StatusBadge status={t.status} />
                ),
              },
              {
                key: "actions",
                label: "ACTIONS",
                align: "right",
                render: (t: SupportTicketItem) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedOnDemandTicket(t);
                      setResolutionNotes(t.operatorNotes || "");
                    }}
                  >
                    Inspect Ticket
                  </Button>
                ),
              },
            ]}
            data={filteredOnDemand}
            keyExtractor={(t) => t.id}
            loading={onDemandLoading}
            emptyTitle="No support tickets found"
            emptySubtitle="No tickets matching this status filter."
          />

          {/* On-Demand Support Ticket Drawer */}
          <Drawer
            isOpen={!!selectedOnDemandTicket}
            onClose={() => setSelectedOnDemandTicket(null)}
            title={
              selectedOnDemandTicket
                ? `Support Ticket #${selectedOnDemandTicket.id.slice(0, 8).toUpperCase()}`
                : "Support Ticket"
            }
            subtitle={
              selectedOnDemandTicket
                ? `Issue: ${selectedOnDemandTicket.issueType}`
                : ""
            }
            footer={
              selectedOnDemandTicket ? (
                <div className="flex gap-3 w-full justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedOnDemandTicket(null)}
                  >
                    Close
                  </Button>
                  {selectedOnDemandTicket.status !== "UNDER_REVIEW" &&
                    selectedOnDemandTicket.status !== "RESOLVED" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResolveOnDemand("UNDER_REVIEW")}
                        disabled={onDemandActionLoading}
                      >
                        Mark In Review
                      </Button>
                    )}
                  {selectedOnDemandTicket.status !== "RESOLVED" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setConfirmResolveOpen(true)}
                      disabled={onDemandActionLoading}
                    >
                      Resolve Ticket
                    </Button>
                  )}
                </div>
              ) : null
            }
          >
            {selectedOnDemandTicket && (
              <div className="flex flex-col gap-5">
                <div className="p-4 rounded-md bg-surface-elevated border border-subtle flex justify-between items-center">
                  <div>
                    <div className="text-sm text-muted">Ticket Status</div>
                    <div className="mt-1">
                      <StatusBadge status={selectedOnDemandTicket.status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted">Timestamp</div>
                    <div className="text-base text-primary mt-1">
                      {new Date(
                        selectedOnDemandTicket.createdAt,
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-md bg-surface-elevated border border-subtle flex flex-col gap-3">
                  <div className="text-base font-semibold text-primary border-b border-subtle pb-2">
                    Reporter Details
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted">Name:</span>
                    <span className="font-semibold text-primary">
                      {selectedOnDemandTicket.reporterName}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted">Role:</span>
                    <span className="text-brand font-semibold">
                      {selectedOnDemandTicket.reporterRole}
                    </span>
                  </div>
                  <div className="flex justify-between text-base">
                    <span className="text-muted">Phone Number:</span>
                    <span className="text-mono text-primary">
                      {selectedOnDemandTicket.reporterPhone || "—"}
                    </span>
                  </div>
                  {selectedOnDemandTicket.relatedTripId && (
                    <div className="flex justify-between text-base">
                      <span className="text-muted">Related Trip:</span>
                      <span className="text-mono text-brand">
                        {selectedOnDemandTicket.relatedTripId}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-5 rounded-md bg-surface-elevated border border-subtle">
                  <div className="text-base font-semibold text-primary mb-2">
                    Issue Description ({selectedOnDemandTicket.issueType})
                  </div>
                  <p
                    className="text-base text-secondary rounded-sm bg-surface border border-subtle"
                    style={{ lineHeight: 1.5, padding: "0.875rem" }}
                  >
                    {selectedOnDemandTicket.description ||
                      "No description provided."}
                  </p>
                </div>

                <div className="p-5 rounded-md bg-surface-elevated border border-subtle flex flex-col gap-3">
                  <Textarea
                    label="Operator Triage & Resolution Notes"
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Log internal telemetry review, FASTag reconciliation, or action taken..."
                    wrapperClassName="!mb-0"
                  />
                </div>
              </div>
            )}
          </Drawer>

          <ConfirmDialog
            isOpen={confirmResolveOpen && !!selectedOnDemandTicket}
            onClose={() =>
              !onDemandActionLoading && setConfirmResolveOpen(false)
            }
            onConfirm={() => handleResolveOnDemand("RESOLVED")}
            variant="success"
            isLoading={onDemandActionLoading}
            title="Mark Support Ticket Resolved?"
            subtitle={
              selectedOnDemandTicket
                ? `Ticket #${selectedOnDemandTicket.id.slice(0, 8).toUpperCase()}`
                : undefined
            }
            description={
              <span>
                Confirm resolving this {selectedOnDemandTicket?.issueType} case
                reported by{" "}
                <strong>{selectedOnDemandTicket?.reporterName}</strong> and
                persisting operator triage notes.
              </span>
            }
            confirmLabel="Resolve Ticket"
          />
        </>
      )}
    </div>
  );
}
