"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Truck,
  Plus,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  Users,
  Eye,
  EyeOff,
  KeyRound,
  Edit2,
  Power,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Shield,
  Star,
  ExternalLink,
} from "lucide-react";
import { FleetPortalAccessTab } from "../../components/fleet/FleetPortalAccessTab";
import { FleetShortfallsTab } from "../../components/fleet/FleetShortfallsTab";
import { adminApi } from "../../lib/api/client";
import {
  FleetListItem,
  FleetDetail,
  FleetMetrics,
} from "../../lib/api/types";
import {
  PageHeader,
  FilterBar,
  DataTable,
  Column,
  StatusBadge,
  Button,
  KpiStrip,
  Drawer,
  FeedbackBanner,
  ConfirmDialog,
  TableLoadingSkeleton,
  EmptyState,
  ErrorState,
} from "../../components/common";

const STATUS_TABS = [
  { id: "ALL", label: "All Fleets" },
  { id: "ACTIVE", label: "Active Fleets" },
  { id: "INACTIVE", label: "Inactive Fleets" },
];

export default function FleetListPage() {
  const [fleets, setFleets] = useState<FleetListItem[]>([]);
  const [metrics, setMetrics] = useState<FleetMetrics>({
    totalFleets: 0,
    activeFleets: 0,
    inactiveFleets: 0,
    totalFleetDrivers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Drawer & Modals state
  const [selectedFleetId, setSelectedFleetId] = useState<string | null>(null);
  const [fleetDetail, setFleetDetail] = useState<FleetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<
    "overview" | "drivers" | "activity" | "financials" | "portal" | "shortfalls"
  >("overview");

  const handleSubTabNotify = useCallback(
    (type: "success" | "error", message: string) => {
      setFeedback({ type, message });
    },
    [],
  );

  // Create Fleet Side Drawer
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [showPortalPassword, setShowPortalPassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    ownerName: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    gstin: "",
    notes: "",
    portalPassword: "",
    confirmPortalPassword: "",
  });

  // Edit Fleet Modal
  const [editingFleet, setEditingFleet] = useState<FleetListItem | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    ownerName: "",
    phone: "",
    email: "",
    city: "",
    address: "",
    gstin: "",
    notes: "",
  });

  // Status Change Dialog
  const [statusTargetFleet, setStatusTargetFleet] = useState<FleetListItem | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Regenerate Code Dialog
  const [regenTargetFleet, setRegenTargetFleet] = useState<FleetListItem | null>(null);
  const [regenSubmitting, setRegenSubmitting] = useState(false);

  const fetchFleets = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listFleets({
        search: searchQuery.trim() || undefined,
        status: statusFilter,
        page: currentPage,
        limit: 15,
      });
      setFleets(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.total || 0);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err: any) {
      console.error("Failed to load fleets:", err);
      setError(err?.message || "Failed to load platform fleets.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [searchQuery, statusFilter, currentPage]);

  useEffect(() => {
    void fetchFleets();
  }, [fetchFleets]);

  // Load detailed fleet when selected
  useEffect(() => {
    if (!selectedFleetId) {
      setFleetDetail(null);
      return;
    }
    let isMounted = true;
    setDetailLoading(true);
    adminApi
      .getFleetDetails(selectedFleetId)
      .then((data) => {
        if (isMounted) setFleetDetail(data);
      })
      .catch((err) => {
        if (isMounted) {
          setFeedback({ type: "error", message: `Failed to load fleet details: ${err.message}` });
        }
      })
      .finally(() => {
        if (isMounted) setDetailLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [selectedFleetId]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGeneratePortalPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let generated = "Flt@";
    for (let i = 0; i < 8; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateForm((prev) => ({
      ...prev,
      portalPassword: generated,
      confirmPortalPassword: generated,
    }));
    setShowPortalPassword(true);
  };

  // Submit Create Fleet
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.ownerName.trim() || !createForm.phone.trim()) {
      setFeedback({ type: "error", message: "Please fill in all required fields (Fleet Name, Owner Name, Phone)." });
      return;
    }
    const pwd = createForm.portalPassword.trim();
    if (pwd && pwd.length < 8) {
      setFeedback({ type: "error", message: "Fleet Portal password must be at least 8 characters." });
      return;
    }
    if (pwd && pwd !== createForm.confirmPortalPassword.trim()) {
      setFeedback({ type: "error", message: "Fleet Portal password and confirm password do not match." });
      return;
    }
    setCreateSubmitting(true);
    try {
      const created = await adminApi.createFleet({
        name: createForm.name.trim(),
        code: createForm.code.trim() || undefined,
        ownerName: createForm.ownerName.trim(),
        phone: createForm.phone.trim(),
        email: createForm.email.trim() || undefined,
        city: createForm.city.trim() || undefined,
        address: createForm.address.trim() || undefined,
        gstin: createForm.gstin.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
        portalPassword: pwd || undefined,
      });
      setShowCreateModal(false);
      setShowPortalPassword(false);
      setCreateForm({
        name: "",
        code: "",
        ownerName: "",
        phone: "",
        email: "",
        city: "",
        address: "",
        gstin: "",
        notes: "",
        portalPassword: "",
        confirmPortalPassword: "",
      });
      setFeedback({
        type: "success",
        message: pwd
          ? `Fleet "${created.name}" (${created.code}) & Portal Owner login created successfully.`
          : `Fleet "${created.name}" (${created.code}) registered successfully.`,
      });
      await fetchFleets(true);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to register fleet." });
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (fleet: FleetListItem) => {
    setEditingFleet(fleet);
    setEditForm({
      name: fleet.name,
      ownerName: fleet.ownerName,
      phone: fleet.phone,
      email: fleet.email || "",
      city: fleet.city || "",
      address: fleet.address || "",
      gstin: fleet.gstin || "",
      notes: fleet.notes || "",
    });
  };

  // Submit Edit Fleet
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFleet) return;
    setEditSubmitting(true);
    try {
      const updated = await adminApi.updateFleet(editingFleet.id, editForm);
      setEditingFleet(null);
      setFeedback({ type: "success", message: `Fleet "${updated.name}" updated successfully.` });
      await fetchFleets(true);
      if (selectedFleetId === editingFleet.id) {
        const detail = await adminApi.getFleetDetails(editingFleet.id);
        setFleetDetail(detail);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to update fleet." });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Status Change Confirmation
  const handleConfirmStatusChange = async () => {
    if (!statusTargetFleet) return;
    setStatusSubmitting(true);
    const nextStatus = statusTargetFleet.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await adminApi.updateFleetStatus(
        statusTargetFleet.id,
        nextStatus,
        `Toggled by Admin on ${new Date().toLocaleDateString()}`,
      );
      setStatusTargetFleet(null);
      setFeedback({
        type: "success",
        message: `Fleet "${statusTargetFleet.name}" is now marked as ${nextStatus}.`,
      });
      await fetchFleets(true);
      if (selectedFleetId === statusTargetFleet.id) {
        const detail = await adminApi.getFleetDetails(statusTargetFleet.id);
        setFleetDetail(detail);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to update fleet status." });
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Code Regeneration Confirmation
  const handleConfirmRegenerateCode = async () => {
    if (!regenTargetFleet) return;
    setRegenSubmitting(true);
    try {
      const res = await adminApi.regenerateFleetCode(regenTargetFleet.id);
      setRegenTargetFleet(null);
      setFeedback({
        type: "success",
        message: `Fleet Code for "${res.name}" regenerated. New Code: ${res.code}`,
      });
      await fetchFleets(true);
      if (selectedFleetId === regenTargetFleet.id) {
        const detail = await adminApi.getFleetDetails(regenTargetFleet.id);
        setFleetDetail(detail);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Failed to regenerate Fleet Code." });
    } finally {
      setRegenSubmitting(false);
    }
  };

  // Table Columns
  const columns: Column<FleetListItem>[] = useMemo(
    () => [
      {
        key: "fleetDetails",
        header: "Fleet Details",
        render: (f) => (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "14px" }}>
                {f.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyCode(f.code);
                }}
                title="Click to copy unique Fleet Code"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 7px",
                  fontSize: "11px",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  backgroundColor: "var(--bg-card-nested, rgba(99, 102, 241, 0.08))",
                  color: "var(--brand-primary, #6366F1)",
                  border: "1px solid var(--border-subtle, rgba(99, 102, 241, 0.2))",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {copiedCode === f.code ? <Check size={11} /> : <Copy size={11} />}
                {f.code}
              </button>
            </div>
            {f.city && (
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                <MapPin size={12} /> {f.city}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "fleetOwner",
        header: "Fleet Owner & Contact",
        render: (f) => (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px" }}>
              {f.ownerName}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "var(--text-secondary)" }}>
              <a
                href={`tel:${f.phone}`}
                style={{ color: "var(--brand-primary, #6366F1)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "3px" }}
              >
                <Phone size={11} /> {f.phone}
              </a>
              {f.email && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
                  <Mail size={11} /> {f.email}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Fleet Status",
        render: (f) => (
          <StatusBadge
            status={f.status}
            label={f.status === "ACTIVE" ? "Active Fleet" : "Inactive Fleet"}
            size="md"
          />
        ),
      },
      {
        key: "createdAt",
        header: "Registration Date",
        render: (f) => (
          <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
            {new Date(f.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (f) => (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedFleetId(f.id)}
              title="View fleet profile, drivers, activity, and financials"
            >
              <Eye size={13} style={{ marginRight: "4px" }} />
              Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditModal(f)}
              title="Edit fleet information"
            >
              <Edit2 size={13} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusTargetFleet(f)}
              title={f.status === "ACTIVE" ? "Deactivate this fleet" : "Activate this fleet"}
              style={{
                color: f.status === "ACTIVE" ? "var(--color-danger, #EF4444)" : "var(--color-success, #10B981)",
                borderColor: f.status === "ACTIVE" ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
              }}
            >
              <Power size={13} />
            </Button>
          </div>
        ),
      },
    ],
    [copiedCode],
  );

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1480px", margin: "0 auto" }}>
      {/* Feedback Banner */}
      {feedback && (
        <div style={{ marginBottom: "16px" }}>
          <FeedbackBanner
            type={feedback.type}
            message={feedback.message}
            onDismiss={() => setFeedback(null)}
          />
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Fleet List"
        subtitle="Centrally monitor, register, and configure platform commercial fleets and verify fleet-code operations."
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <Link href="/settlements?context=fleet">
              <Button variant="outline" size="md">
                <ExternalLink size={14} style={{ marginRight: "5px" }} />
                Fleet Payouts
              </Button>
            </Link>
            <Link href="/support?context=fleet">
              <Button variant="outline" size="md">
                Fleet Support
              </Button>
            </Link>
            <Link href="/business-insights?context=fleet">
              <Button variant="outline" size="md">
                Fleet Insights
              </Button>
            </Link>
            <Button variant="primary" size="md" onClick={() => setShowCreateModal(true)}>
              <Plus size={15} style={{ marginRight: "6px" }} />
              Register Fleet
            </Button>
          </div>
        }
      />

      {/* KPI Overview Strip */}
      <div style={{ marginTop: "20px", marginBottom: "24px" }}>
        <KpiStrip
          items={[
            {
              label: "Total Fleets",
              value: metrics.totalFleets,
              icon: <Truck size={16} />,
              tone: "default",
            },
            {
              label: "Active Fleets",
              value: metrics.activeFleets,
              icon: <CheckCircle2 size={16} />,
              tone: "success",
              subtext: "Operational",
            },
            {
              label: "Inactive Fleets",
              value: metrics.inactiveFleets,
              icon: <XCircle size={16} />,
              tone: metrics.inactiveFleets > 0 ? "warning" : "default",
              subtext: "Suspended / Inactive",
            },
            {
              label: "Total Fleet Drivers",
              value: metrics.totalFleetDrivers,
              icon: <Users size={16} />,
              tone: "info",
              subtext: "Assigned across fleets",
            },
          ]}
        />
      </div>

      {/* Filter Bar with Tabs and Search */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search fleet name, fleet code, owner name, or phone number..."
        tabs={STATUS_TABS}
        activeTab={statusFilter}
        onTabChange={(tab) => {
          setStatusFilter(tab);
          setCurrentPage(1);
        }}
        tabVariant="segments"
        onReset={() => {
          setSearchQuery("");
          setStatusFilter("ALL");
          setCurrentPage(1);
        }}
      />

      {/* Main Table / States */}
      {loading ? (
        <TableLoadingSkeleton rows={6} columns={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void fetchFleets()} />
      ) : fleets.length === 0 ? (
        <EmptyState
          title={searchQuery || statusFilter !== "ALL" ? "No matching fleets found" : "No fleets registered yet"}
          description={
            searchQuery || statusFilter !== "ALL"
              ? "No fleet records matched your query. Try clearing or relaxing the search filters."
              : "Register your first commercial fleet to begin organizing drivers and monitoring collective operations."
          }
          icon={<Truck size={32} />}
          action={
            searchQuery || statusFilter !== "ALL"
              ? {
                  label: "Clear Filters",
                  onClick: () => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    setCurrentPage(1);
                  },
                }
              : {
                  label: "Register New Fleet",
                  onClick: () => setShowCreateModal(true),
                }
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <DataTable
            data={fleets}
            columns={columns}
            keyExtractor={(item) => item.id}
          />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: "13px",
                color: "var(--text-secondary)",
              }}
            >
              <span>
                Showing page {currentPage} of {totalPages} ({totalCount} total fleets)
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fleet Details Drawer */}
      <Drawer
        isOpen={Boolean(selectedFleetId)}
        onClose={() => setSelectedFleetId(null)}
        title={fleetDetail?.fleet?.name || "Fleet Profile"}
        subtitle="Centralized fleet profile, associated drivers, activity, and financials"
        width="680px"
      >
        {detailLoading ? (
          <div style={{ padding: "24px" }}>
            <TableLoadingSkeleton rows={4} columns={3} />
          </div>
        ) : fleetDetail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Header Badge Strip */}
            <div
              style={{
                padding: "16px",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700 }}>
                  OFFICIAL FLEET CODE
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "18px", fontWeight: 800, fontFamily: "monospace", color: "var(--text-primary)" }}>
                    {fleetDetail.fleet.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(fleetDetail.fleet.code)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      backgroundColor: "var(--bg-card-nested, rgba(99, 102, 241, 0.08))",
                      color: "var(--brand-primary, #6366F1)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {copiedCode === fleetDetail.fleet.code ? <Check size={12} /> : <Copy size={12} />}
                    {copiedCode === fleetDetail.fleet.code ? "Copied" : "Copy Code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRegenTargetFleet(fleetDetail.fleet)}
                    title="Regenerate Fleet Code"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      backgroundColor: "transparent",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    <RotateCcw size={12} />
                    Regenerate
                  </button>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, marginBottom: "4px" }}>
                  OPERATIONAL STATUS
                </div>
                <StatusBadge
                  status={fleetDetail.fleet.status}
                  label={fleetDetail.fleet.status === "ACTIVE" ? "Active" : "Inactive"}
                  size="md"
                />
              </div>
            </div>

            {/* Drawer Sub-tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--border-subtle)",
                gap: "8px",
              }}
            >
              {[
                { id: "overview", label: "Overview" },
                { id: "drivers", label: `Drivers (${fleetDetail.drivers.length})` },
                { id: "activity", label: `Activity (${fleetDetail.activity.recentTrips.length})` },
                { id: "financials", label: "Financials" },
                { id: "portal", label: "Portal Access" },
                { id: "shortfalls", label: "Shortfall Claims" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveDetailTab(t.id as any)}
                  style={{
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: activeDetailTab === t.id ? 700 : 500,
                    color: activeDetailTab === t.id ? "var(--brand-primary, #6366F1)" : "var(--text-secondary)",
                    borderBottom: activeDetailTab === t.id ? "2px solid var(--brand-primary, #6366F1)" : "2px solid transparent",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeDetailTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                    padding: "16px",
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>OWNER NAME</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginTop: "2px" }}>
                      {fleetDetail.fleet.ownerName}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>CONTACT PHONE</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginTop: "2px" }}>
                      <a href={`tel:${fleetDetail.fleet.phone}`} style={{ color: "var(--brand-primary, #6366F1)", textDecoration: "none" }}>
                        {fleetDetail.fleet.phone}
                      </a>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>EMAIL ADDRESS</div>
                    <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "2px" }}>
                      {fleetDetail.fleet.email || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>CITY / REGION</div>
                    <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "2px" }}>
                      {fleetDetail.fleet.city || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>GSTIN / TAX ID</div>
                    <div style={{ fontSize: "13px", fontFamily: "monospace", color: "var(--text-primary)", marginTop: "2px" }}>
                      {fleetDetail.fleet.gstin || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>REGISTERED ON</div>
                    <div style={{ fontSize: "13px", color: "var(--text-primary)", marginTop: "2px" }}>
                      {new Date(fleetDetail.fleet.createdAt).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {fleetDetail.fleet.address && (
                  <div style={{ padding: "14px", backgroundColor: "var(--bg-surface)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                      BUSINESS ADDRESS
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{fleetDetail.fleet.address}</div>
                  </div>
                )}

                {fleetDetail.fleet.notes && (
                  <div style={{ padding: "14px", backgroundColor: "var(--bg-surface)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                      INTERNAL AUDIT NOTES
                    </div>
                    <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{fleetDetail.fleet.notes}</div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DRIVERS */}
            {activeDetailTab === "drivers" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    {fleetDetail.drivers.length} Associated Drivers
                  </span>
                </div>

                {fleetDetail.drivers.length === 0 ? (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-surface)", borderRadius: "8px" }}>
                    No drivers are currently associated with this fleet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {fleetDetail.drivers.map((drv) => (
                      <div
                        key={drv.id}
                        style={{
                          padding: "12px 14px",
                          backgroundColor: "var(--bg-surface)",
                          borderRadius: "6px",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "13.5px", color: "var(--text-primary)" }}>
                            {drv.fullName}
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                            {drv.phone || "No phone"} · Plate: {drv.vehiclePlate || "N/A"} ({drv.vehicleModel || "Vehicle"})
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                            <Star size={12} style={{ color: "#EAB308" }} /> {drv.averageRating?.toFixed(1) || "5.0"}
                          </span>
                          <StatusBadge status={drv.availabilityStatus} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ACTIVITY */}
            {activeDetailTab === "activity" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Recent Trips by Drivers of {fleetDetail.fleet.name}
                </div>
                {fleetDetail.activity.recentTrips.length === 0 ? (
                  <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", backgroundColor: "var(--bg-surface)", borderRadius: "8px" }}>
                    No recent trip activity recorded for drivers associated with this fleet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {fleetDetail.activity.recentTrips.map((tr) => (
                      <div
                        key={tr.id}
                        style={{
                          padding: "12px 14px",
                          backgroundColor: "var(--bg-surface)",
                          borderRadius: "6px",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>
                            Driver: {tr.driver?.fullName || "Assigned Driver"}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            {tr.pickupAddress?.slice(0, 30)} → {tr.dropAddress?.slice(0, 30)}
                          </span>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <StatusBadge status={tr.status} size="sm" />
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                            {new Date(tr.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: FINANCIAL DETAILS */}
            {activeDetailTab === "financials" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "var(--bg-surface)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>
                      COMPLETED TRIPS
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>
                      {fleetDetail.financials.completedTrips}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Executed by fleet drivers
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "var(--bg-surface)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>
                      ESTIMATED DRIVER EARNINGS
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-success, #10B981)", marginTop: "4px" }}>
                      ₹{fleetDetail.financials.estimatedEarnings.toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                      Gross platform driver payouts
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px",
                    backgroundColor: "rgba(99, 102, 241, 0.05)",
                    border: "1px solid rgba(99, 102, 241, 0.15)",
                    borderRadius: "6px",
                    fontSize: "12.5px",
                    color: "var(--text-secondary)",
                  }}
                >
                  Financial metrics reflect aggregated performance of drivers active in this fleet. Use{" "}
                  <Link href="/settlements?context=fleet" style={{ color: "var(--brand-primary)", fontWeight: 600 }}>
                    Fleet Payouts
                  </Link>{" "}
                  and the <strong>Shortfall Claims</strong> tab to manage disbursals and guaranteed trip compensation.
                </div>
              </div>
            )}

            {/* TAB 5: PORTAL ACCESS */}
            {activeDetailTab === "portal" && (
              <FleetPortalAccessTab
                fleetId={fleetDetail.fleet.id}
                ownerName={fleetDetail.fleet.ownerName}
                ownerPhone={fleetDetail.fleet.phone}
                ownerEmail={fleetDetail.fleet.email || undefined}
                onNotify={handleSubTabNotify}
              />
            )}

            {/* TAB 6: SHORTFALL CLAIMS */}
            {activeDetailTab === "shortfalls" && (
              <FleetShortfallsTab
                fleetId={fleetDetail.fleet.id}
                onNotify={handleSubTabNotify}
              />
            )}
          </div>
        ) : null}
      </Drawer>

      {/* Side Drawer: Register New Fleet */}
      <Drawer
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowPortalPassword(false);
        }}
        title="Register New Fleet"
        subtitle="Configure commercial fleet identity, Fleet Code, and Fleet Portal login credentials"
        width="600px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", width: "100%" }}>
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                setShowPortalPassword(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              form="register-fleet-form"
              isLoading={createSubmitting}
            >
              Register Fleet
            </Button>
          </div>
        }
      >
        <form
          id="register-fleet-form"
          onSubmit={handleCreateSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", margin: 0 }}>
            Enter official business credentials. A unique Fleet Code will be generated automatically if left blank.
          </p>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
              Fleet Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Metro Express Mobility"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
              Fleet Code (Optional — leave blank to auto-generate)
            </label>
            <input
              type="text"
              placeholder="e.g. FLT-BLR01 (auto-generated if empty)"
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                fontFamily: "monospace",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                Fleet Owner Name <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Full Legal Name"
                value={createForm.ownerName}
                onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                Phone Number <span style={{ color: "red" }}>*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="owner@fleetdomain.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                Operating City
              </label>
              <input
                type="text"
                placeholder="e.g. Bengaluru, Hyderabad"
                value={createForm.city}
                onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
              GSTIN / Tax ID
            </label>
            <input
              type="text"
              placeholder="e.g. 29ABCDE1234F1Z5"
              value={createForm.gstin}
              onChange={(e) => setCreateForm({ ...createForm, gstin: e.target.value.toUpperCase() })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
                fontFamily: "monospace",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
              Address
            </label>
            <textarea
              rows={2}
              placeholder="Registered business address..."
              value={createForm.address}
              onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            />
          </div>

          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <div
                style={{
                  fontSize: "12.5px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Shield size={14} color="var(--brand-primary)" />
                Fleet Portal Login Password Creation
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGeneratePortalPassword}
              >
                <KeyRound size={12} style={{ marginRight: "4px" }} />
                Generate Password
              </Button>
            </div>

            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              Set an initial password (at least 8 characters) to immediately enable signing in on AdhocX Fleet Portal with the owner phone or email above, or leave blank to provision later.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                  Portal Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPortalPassword ? "text" : "password"}
                    minLength={8}
                    placeholder="Min 8 characters (optional)"
                    value={createForm.portalPassword}
                    onChange={(e) => setCreateForm({ ...createForm, portalPassword: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 34px 8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-card, var(--bg-surface))",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                    }}
                  />
                  <button
                    type="button"
                    aria-label={showPortalPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPortalPassword((prev) => !prev)}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    {showPortalPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                  Confirm Password
                </label>
                <input
                  type={showPortalPassword ? "text" : "password"}
                  minLength={8}
                  placeholder="Re-enter password"
                  value={createForm.confirmPortalPassword}
                  onChange={(e) => setCreateForm({ ...createForm, confirmPortalPassword: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-card, var(--bg-surface))",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                />
              </div>
            </div>
          </div>
        </form>
      </Drawer>

      {/* Side Drawer: Edit Fleet */}
      <Drawer
        isOpen={Boolean(editingFleet)}
        onClose={() => setEditingFleet(null)}
        title={editingFleet ? `Edit Fleet: ${editingFleet.name}` : "Edit Fleet"}
        subtitle="Update registered fleet partner details and internal audit notes"
        width="560px"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", width: "100%" }}>
            <Button variant="outline" size="md" type="button" onClick={() => setEditingFleet(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              form="edit-fleet-form"
              isLoading={editSubmitting}
            >
              Save Changes
            </Button>
          </div>
        }
      >
        <form id="edit-fleet-form" onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
              Fleet Name
            </label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "13.5px",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                Owner Name
              </label>
              <input
                type="text"
                required
                value={editForm.ownerName}
                onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                Email Address
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
                City
              </label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: "13.5px",
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
              Address
            </label>
            <input
              type="text"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
              GSTIN / Tax ID
            </label>
            <input
              type="text"
              value={editForm.gstin}
              onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontFamily: "monospace",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "4px" }}>
              Audit Notes
            </label>
            <textarea
              rows={2}
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            />
          </div>

        </form>
      </Drawer>

      {/* Dialog: Toggle Fleet Status */}
      <ConfirmDialog
        isOpen={Boolean(statusTargetFleet)}
        onClose={() => setStatusTargetFleet(null)}
        onConfirm={handleConfirmStatusChange}
        title={
          statusTargetFleet?.status === "ACTIVE"
            ? `Deactivate Fleet "${statusTargetFleet?.name}"?`
            : `Activate Fleet "${statusTargetFleet?.name}"?`
        }
        description={
          statusTargetFleet?.status === "ACTIVE"
            ? "Deactivating this fleet will prevent new drivers from being assigned or onboarding under this fleet code. Existing drivers will retain their association but new links will be rejected."
            : "Activating this fleet will allow drivers to be associated, assigned, or transferred under this fleet code."
        }
        confirmLabel={statusTargetFleet?.status === "ACTIVE" ? "Deactivate Fleet" : "Activate Fleet"}
        variant={statusTargetFleet?.status === "ACTIVE" ? "danger" : "confirm"}
        isLoading={statusSubmitting}
      />

      {/* Dialog: Regenerate Fleet Code */}
      <ConfirmDialog
        isOpen={Boolean(regenTargetFleet)}
        onClose={() => setRegenTargetFleet(null)}
        onConfirm={handleConfirmRegenerateCode}
        title={`Regenerate Fleet Code for "${regenTargetFleet?.name}"?`}
        description={`This will invalidate the previous Fleet Code (${regenTargetFleet?.code}) and generate a new secure unique code. Any pending driver onboarding invites referencing the old code will need to use the new code.`}
        confirmLabel="Regenerate Code"
        variant="warning"
        isLoading={regenSubmitting}
      />
    </div>
  );
}
