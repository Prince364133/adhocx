"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  Edit3,
  Mail,
  Phone,
  Copy,
  Check,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  Clock,
  Search,
  CheckCircle2,
  Briefcase,
  Truck,
  Plus,
} from "lucide-react";
import { adminApi } from "../../lib/api/client";
import {
  VendorListItem,
  CorporateVendorDetail,
  VendorOrderItem,
} from "../../lib/api/types";
import {
  PageHeader,
  FilterBar,
  DataTable,
  Column,
  StatusBadge,
  Button,
  MetricCard,
  FeedbackBanner,
  ConfirmDialog,
  Drawer,
  Input,
  Select,
  Textarea,
} from "../../components/common";

const VENDOR_STATUS_TABS = [
  { id: "ALL", label: "All Accounts" },
  { id: "PENDING", label: "Pending Approval" },
  { id: "VERIFIED", label: "Verified" },
  { id: "REJECTED", label: "Rejected" },
  { id: "SUSPENDED", label: "Suspended" },
];

export default function UsersAndVendorsView({
  initialSection: _initialSection = "VENDORS",
}: {
  initialSection?: "VENDORS" | "USERS";
} = {}) {
  const router = useRouter();

  // Manual Vendor Onboarding Modal State
  const [isOnboardVendorOpen, setIsOnboardVendorOpen] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardData, setOnboardData] = useState({
    organizationName: "",
    fullName: "",
    phone: "",
    email: "",
    gstNumber: "",
    city: "",
    address: "",
    verificationStatus: "VERIFIED",
  });

  // Vendor listing state
  const [vendorTab, setVendorTab] = useState("ALL");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Dedicated Full-Page Selection States
  const [selectedVendor, setSelectedVendor] =
    useState<CorporateVendorDetail | null>(null);
  const [, setDetailsLoading] = useState(false);

  // Edit Modals
  const [editingVendor, setEditingVendor] = useState<
    CorporateVendorDetail | VendorListItem | null
  >(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  // Status Action Modals / Banners
  const [actionType, setActionType] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    phone?: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Feedback Notification Toast
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Order History Filter Timeframes: 'ALL' | 'DAILY' | 'MONTHLY' | 'YEARLY'
  const [orderTimeframe, setOrderTimeframe] = useState<
    "ALL" | "DAILY" | "MONTHLY" | "YEARLY"
  >("ALL");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");

  // Vendor Analytics Chart Metric: 'REVENUE' | 'COMPLETED' | 'ACTIVE_DAYS' | 'PERFORMANCE'
  const [analyticsMetric, setAnalyticsMetric] = useState<
    "REVENUE" | "COMPLETED" | "ACTIVE_DAYS" | "PERFORMANCE"
  >("REVENUE");
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(
    null,
  );

  // Initial Data Load
  useEffect(() => {
    loadVendors(vendorTab);
  }, [vendorTab]);

  useEffect(() => {
    const vendorId = new URLSearchParams(window.location.search).get("vendorId");
    if (!vendorId) return;

    let active = true;
    setDetailsLoading(true);
    adminApi
      .getVendorDetails(vendorId)
      .then((details) => {
        if (active) {
          setSelectedVendor(details);
        }
      })
      .catch(() => {
        if (active) {
          setAlert({
            type: "error",
            message: "Failed to reload vendor details.",
          });
        }
      })
      .finally(() => {
        if (active) setDetailsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function loadVendors(status: string) {
    setVendorsLoading(true);
    try {
      const data = await adminApi
        .getVendors(status)
        .catch(() => [] as VendorListItem[]);
      const list = Array.isArray(data) ? data : (data as any)?.items || [];
      setVendors(list);
    } finally {
      setVendorsLoading(false);
    }
  }

  // Filtered Vendor List
  const filteredVendors = useMemo(() => {
    if (!vendorSearch) return vendors;
    const q = vendorSearch.toLowerCase().trim();
    return vendors.filter(
      (v) =>
        (v.companyName && v.companyName.toLowerCase().includes(q)) ||
        (v.organizationName && v.organizationName.toLowerCase().includes(q)) ||
        (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
        (v.phone && v.phone.toLowerCase().includes(q)) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        (v.gstNumber && v.gstNumber.toLowerCase().includes(q)),
    );
  }, [vendors, vendorSearch]);

  // Open Full-Page Vendor Details
  async function handleOpenVendorDetails(vendor: VendorListItem) {
    setDetailsLoading(true);
    try {
      const details = await adminApi.getVendorDetails(vendor.id);
      setSelectedVendor(details);
      setOrderTimeframe("ALL");
      setOrderSearchQuery("");
      setOrderStatusFilter("ALL");
      setHoveredMonthIndex(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setAlert({
        type: "error",
        message: "Failed to load comprehensive vendor details.",
      });
    } finally {
      setDetailsLoading(false);
    }
  }

  // Trigger Edit Modal for Vendor
  function handleOpenEditVendor(
    vendor: VendorListItem | CorporateVendorDetail,
  ) {
    setEditingVendor(vendor);
    setEditFormData({
      organizationName:
        vendor.companyName || (vendor as any).organizationName || "",
      contactPerson: vendor.contactPerson || (vendor as any).fullName || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      gstNumber: vendor.gstNumber || "",
      address: (vendor as any).companyAddress || (vendor as any).address || "",
    });
  }

  // Save Edit Vendor
  async function handleSaveVendorEdit() {
    if (!editingVendor) return;
    setEditLoading(true);
    try {
      await adminApi.updateVendor(editingVendor.id, {
        organizationName: editFormData.organizationName,
        fullName: editFormData.contactPerson,
        phone: editFormData.phone,
        email: editFormData.email,
        gstNumber: editFormData.gstNumber,
        address: editFormData.address,
      });

      setAlert({
        type: "success",
        message: "Corporate vendor details updated successfully.",
      });
      setEditingVendor(null);

      // Refresh data
      loadVendors(vendorTab);
      if (selectedVendor && selectedVendor.id === editingVendor.id) {
        handleOpenVendorDetails(editingVendor as VendorListItem);
      }
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to save vendor details.",
      });
    } finally {
      setEditLoading(false);
    }
  }

  // Manually Onboard Vendor
  async function handleOnboardVendor(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!onboardData.organizationName.trim()) {
      setAlert({
        type: "error",
        message: "Company / Organization name is required.",
      });
      return;
    }
    if (!onboardData.fullName.trim()) {
      setAlert({
        type: "error",
        message: "Contact person (SPOC) full name is required.",
      });
      return;
    }
    const cleanPhone = onboardData.phone.replace(/[\s-]/g, "");
    if (!cleanPhone || (!cleanPhone.startsWith("+91") && cleanPhone.length !== 10)) {
      setAlert({
        type: "error",
        message: "Valid 10-digit mobile number is required.",
      });
      return;
    }

    setOnboardLoading(true);
    try {
      await adminApi.createVendor({
        organizationName: onboardData.organizationName.trim(),
        fullName: onboardData.fullName.trim(),
        phone: onboardData.phone.trim(),
        email: onboardData.email.trim() || undefined,
        gstNumber: onboardData.gstNumber.trim() || undefined,
        city: onboardData.city.trim() || undefined,
        address: onboardData.address.trim() || undefined,
        verificationStatus: onboardData.verificationStatus || "VERIFIED",
      });

      setAlert({
        type: "success",
        message: `Vendor "${onboardData.organizationName}" onboarded successfully.`,
      });
      setIsOnboardVendorOpen(false);
      setOnboardData({
        organizationName: "",
        fullName: "",
        phone: "",
        email: "",
        gstNumber: "",
        city: "",
        address: "",
        verificationStatus: "VERIFIED",
      });
      loadVendors(vendorTab);
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to onboard vendor.",
      });
    } finally {
      setOnboardLoading(false);
    }
  }

  // Execute Account Status Transition
  async function handleExecuteStatusAction(
    entityType: "VENDOR",
    id: string,
  ) {
    if (!actionType) return;
    setActionLoading(true);
    try {
      await adminApi.updateVendorStatus(id, actionType, actionReason);
      setAlert({
        type: "success",
        message: `Vendor account transitioned to ${actionType}.`,
      });
      loadVendors(vendorTab);
      if (selectedVendor) {
        handleOpenVendorDetails(selectedVendor as unknown as VendorListItem);
      }
      setActionType(null);
      setActionReason("");
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message: err instanceof Error ? err.message : "Status update failed.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  // Permanently Delete from Database
  async function handleExecuteDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteVendor(deleteTarget.id);
      setAlert({
        type: "success",
        message: `Corporate vendor "${deleteTarget.name}" permanently deleted from database.`,
      });
      if (selectedVendor?.id === deleteTarget.id) setSelectedVendor(null);
      loadVendors(vendorTab);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to delete record from database.",
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper: Filter order records by timeframe & search
  const filterOrders = <
    T extends {
      orderDate: string;
      orderId: string;
      orderStatus: string;
      pickupLocation?: string;
      deliveryLocation?: string;
    },
  >(
    orders: T[],
  ): T[] => {
    return orders.filter((o) => {
      // 1. Timeframe filter
      if (orderTimeframe !== "ALL") {
        const orderDate = new Date(o.orderDate);
        const now = new Date();
        if (orderTimeframe === "DAILY") {
          const isToday =
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (orderTimeframe === "MONTHLY") {
          const isThisMonth =
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        } else if (orderTimeframe === "YEARLY") {
          const isThisYear = orderDate.getFullYear() === now.getFullYear();
          if (!isThisYear) return false;
        }
      }

      // 2. Status filter
      if (orderStatusFilter !== "ALL" && o.orderStatus !== orderStatusFilter) {
        return false;
      }

      // 3. Search query
      if (orderSearchQuery) {
        const q = orderSearchQuery.toLowerCase();
        const matchId = o.orderId.toLowerCase().includes(q);
        const matchPickup = (o.pickupLocation || "").toLowerCase().includes(q);
        const matchDrop = (o.deliveryLocation || "").toLowerCase().includes(q);
        if (!matchId && !matchPickup && !matchDrop) return false;
      }

      return true;
    });
  };

  const sharedDialogs = (
    <>
      {/* MANUAL ONBOARD VENDOR DRAWER */}
      <Drawer
        isOpen={isOnboardVendorOpen}
        onClose={() => {
          if (!onboardLoading) setIsOnboardVendorOpen(false);
        }}
        width="min(92vw, 540px)"
        title="Onboard Corporate Vendor"
        subtitle="Manually create and verify a new vendor partner organization"
        icon={<Building2 size={17} />}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOnboardVendorOpen(false)}
              disabled={onboardLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOnboardVendor}
              isLoading={onboardLoading}
              leftIcon={<Plus size={15} />}
            >
              Create Vendor Account
            </Button>
          </>
        }
      >
        <form onSubmit={handleOnboardVendor} className="flex flex-col gap-4">
          <Input
            label="Company / Organization Name *"
            placeholder="e.g. Acme Corporate Logistics Ltd"
            value={onboardData.organizationName}
            onChange={(e) =>
              setOnboardData({
                ...onboardData,
                organizationName: e.target.value,
              })
            }
            required
          />

          <div
            className="grid gap-relaxed"
            style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
          >
            <Input
              label="Contact Person (SPOC) *"
              placeholder="e.g. Ramesh Sharma"
              value={onboardData.fullName}
              onChange={(e) =>
                setOnboardData({ ...onboardData, fullName: e.target.value })
              }
              required
            />

            <Input
              label="Mobile Number *"
              placeholder="e.g. 9876543210"
              value={onboardData.phone}
              onChange={(e) =>
                setOnboardData({ ...onboardData, phone: e.target.value })
              }
              required
            />
          </div>

          <div
            className="grid gap-relaxed"
            style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
          >
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. operations@acmelogistics.in"
              value={onboardData.email}
              onChange={(e) =>
                setOnboardData({ ...onboardData, email: e.target.value })
              }
            />

            <Input
              label="GST Number"
              placeholder="e.g. 29ABCDE1234F1Z5"
              value={onboardData.gstNumber}
              onChange={(e) =>
                setOnboardData({
                  ...onboardData,
                  gstNumber: e.target.value.toUpperCase(),
                })
              }
            />
          </div>

          <div
            className="grid gap-relaxed"
            style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
          >
            <Input
              label="City / Operating Hub"
              placeholder="e.g. Bengaluru"
              value={onboardData.city}
              onChange={(e) =>
                setOnboardData({ ...onboardData, city: e.target.value })
              }
            />

            <Select
              label="Initial Verification Status"
              value={onboardData.verificationStatus}
              onChange={(e) =>
                setOnboardData({
                  ...onboardData,
                  verificationStatus: e.target.value,
                })
              }
              options={[
                { value: "VERIFIED", label: "VERIFIED (Approved immediately)" },
                { value: "PENDING", label: "PENDING (Requires review)" },
              ]}
            />
          </div>

          <Textarea
            label="Registered Office Address"
            placeholder="e.g. Plot No. 42, Electronic City Phase 1, Bengaluru - 560100"
            value={onboardData.address}
            onChange={(e) =>
              setOnboardData({ ...onboardData, address: e.target.value })
            }
            rows={3}
          />
        </form>
      </Drawer>

      {/* EDIT CORPORATE VENDOR DRAWER */}
      <Drawer
        isOpen={Boolean(editingVendor)}
        onClose={() => {
          if (!editLoading) setEditingVendor(null);
        }}
        width="min(92vw, 500px)"
        title="Edit Corporate Vendor"
        subtitle="Update enterprise credentials and contact information"
        icon={<Building2 size={17} />}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingVendor(null)}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveVendorEdit}
              isLoading={editLoading}
            >
              Save Changes
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Company / Organization Name"
            value={editFormData.organizationName || ""}
            onChange={(e) =>
              setEditFormData({
                ...editFormData,
                organizationName: e.target.value,
              })
            }
          />

          <div
            className="grid gap-relaxed"
            style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
          >
            <Input
              label="Contact Person"
              value={editFormData.contactPerson || ""}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  contactPerson: e.target.value,
                })
              }
            />

            <Input
              label="Phone Number"
              value={editFormData.phone || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, phone: e.target.value })
              }
            />
          </div>

          <div
            className="grid gap-relaxed"
            style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
          >
            <Input
              label="Email Address"
              type="email"
              value={editFormData.email || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, email: e.target.value })
              }
            />

            <Input
              label="GST / Tax Identifier"
              value={editFormData.gstNumber || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, gstNumber: e.target.value })
              }
            />
          </div>

          <Textarea
            label="Registered Address"
            rows={3}
            value={editFormData.address || ""}
            onChange={(e) =>
              setEditFormData({ ...editFormData, address: e.target.value })
            }
          />
        </div>
      </Drawer>

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={handleExecuteDelete}
        variant="danger"
        title={
          deleteTarget ? "Permanently Delete Corporate Vendor?" : "Permanently Delete Record?"
        }
        subtitle="Irreversible database removal"
        description={
          deleteTarget ? (
            <>
              Are you sure you want to permanently delete{" "}
              <strong className="text-primary">
                {deleteTarget.name}{" "}
                {deleteTarget.phone ? `(${deleteTarget.phone})` : ""}
              </strong>{" "}
              from the AdhocX database? All associated vendor records,
              requirements, trips, and authentication sessions will be
              permanently purged.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Permanently Delete"
        isLoading={deleteLoading}
      />
    </>
  );

  /* =========================================================================
   * 1. FULL-PAGE VIEW: CORPORATE VENDOR DETAILS (Matches Driver Details)
   * ========================================================================= */
  if (selectedVendor) {
    const filteredVendorOrders = filterOrders(selectedVendor.orders || []);
    const analytics = selectedVendor.performanceAnalytics || [];

    // Interactive chart calculations
    const chartHeight = 220;
    const chartWidth = 660;
    const paddingX = 40;
    const paddingY = 30;
    const plotWidth = chartWidth - paddingX * 2;
    const plotHeight = chartHeight - paddingY * 2;

    const metricValues = analytics.map((a) => {
      if (analyticsMetric === "REVENUE") return a.revenue;
      if (analyticsMetric === "COMPLETED") return a.completedOrders;
      if (analyticsMetric === "ACTIVE_DAYS") return a.activeDays;
      return a.fulfillmentRate;
    });

    const maxVal = Math.max(...metricValues, 1);
    const colStep = analytics.length > 0 ? plotWidth / analytics.length : 60;
    const barWidth = Math.min(36, colStep * 0.55);

    return (
      <div className="w-full pb-2">
        {/* Top Navigation Bar with Back Button and Quick Actions */}
        <div
          className="module-bar justify-between mt-snug"
          style={{ marginBottom: "1.15rem", padding: "0.68rem 1rem" }}
        >
          <div
            className="flex items-center flex-wrap"
            style={{ gap: "0.65rem" }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedVendor(null);
                setActionType(null);
              }}
              leftIcon={<ArrowLeft size={15} />}
            >
              Back to Corporate Vendors
            </Button>
            <div className="flex items-center text-base text-muted gap-compact">
              <span>Vendors</span>
              <span>/</span>
              <span className="font-bold text-primary">
                {selectedVendor.companyName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditVendor(selectedVendor)}
              leftIcon={<Edit3 size={14} />}
            >
              Edit Details
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/vendors/${selectedVendor.id}/fulfillment`)
              }
              leftIcon={<Truck size={14} />}
            >
              Fulfillment
            </Button>

            {selectedVendor.verificationStatus !== "VERIFIED" && (
              <Button
                variant="success"
                size="sm"
                onClick={() => setActionType("VERIFIED")}
              >
                Verify Vendor
              </Button>
            )}

            {selectedVendor.verificationStatus === "VERIFIED" && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setActionType("SUSPENDED")}
              >
                Suspend Account
              </Button>
            )}

            {selectedVendor.verificationStatus === "SUSPENDED" && (
              <Button
                variant="success"
                size="sm"
                onClick={() => setActionType("VERIFIED")}
              >
                Reactivate Vendor
              </Button>
            )}

            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                setDeleteTarget({ id: selectedVendor.id,
                  name: selectedVendor.companyName,
                  phone: selectedVendor.phone,
                })
              }
              leftIcon={<Trash2 size={14} />}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Global Toast Alert */}
        {alert && !actionType && (
          <FeedbackBanner
            type={alert.type}
            message={alert.message}
            onDismiss={() => setAlert(null)}
            style={{ marginBottom: "1.15rem" }}
          />
        )}

        {/* Vendor Status Transition Confirm Dialog */}
        <ConfirmDialog
          isOpen={Boolean(actionType)}
          onClose={() => {
            if (!actionLoading) {
              setActionType(null);
              setActionReason("");
            }
          }}
          onConfirm={() =>
            handleExecuteStatusAction("VENDOR", selectedVendor.id)
          }
          variant={actionType === "VERIFIED" ? "confirm" : "danger"}
          title={
            actionType === "VERIFIED"
              ? "Approve & Verify Vendor"
              : `${actionType} Vendor`
          }
          subtitle={selectedVendor.companyName}
          description={
            actionType === "VERIFIED"
              ? "Approve corporate verification and unlock enterprise fulfillment."
              : "Transitioning vendor account standing updates platform operational permissions."
          }
          requireReason={
            actionType === "REJECTED" || actionType === "SUSPENDED"
          }
          reasonLabel={
            actionType === "REJECTED"
              ? "Mandatory Reason for Rejection"
              : "Mandatory Reason for Suspension"
          }
          reasonPlaceholder="Add administrative notes for the compliance audit trail..."
          reasonValue={actionReason}
          onReasonChange={setActionReason}
          details={
            actionType === "VERIFIED" ? (
              <div>
                <label className="form-label">
                  Optional Verification Notes
                </label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Add administrative notes for the compliance audit trail..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
            ) : undefined
          }
          confirmLabel={`Execute ${actionType}`}
          isLoading={actionLoading}
        />

        {/* 1. TOP PROFILE DETAILS HEADER CARD */}
        <div
          className="bg-surface border rounded-xl mb-6 shadow-sm flex flex-row items-center justify-between flex-wrap gap-6"
          style={{ padding: "1.5rem 1.75rem" }}
        >
          {/* Company identity & Logo */}
          <div className="flex items-center gap-5 flex-wrap">
            <div
              className="rounded-lg flex items-center justify-center text-brand flex-shrink-0 shadow-sm font-black"
              style={{
                width: "68px",
                height: "68px",
                background:
                  "linear-gradient(135deg, rgba(var(--brand-primary-rgb), 0.18), rgba(var(--brand-accent-rgb), 0.08))",
                border: "1.5px solid rgba(var(--brand-primary-rgb), 0.3)",
                fontSize: "1.5rem",
              }}
            >
              {selectedVendor.companyLogoUrl ? (
                <img
                  src={selectedVendor.companyLogoUrl}
                  alt={selectedVendor.companyName}
                  className="w-full h-full object-cover"
                  style={{ borderRadius: "inherit" }}
                />
              ) : (
                <Building2 size={32} />
              )}
            </div>

            <div>
              <div
                className="flex items-center flex-wrap"
                style={{ gap: "0.65rem" }}
              >
                <h2
                  className="font-extrabold text-primary m-0"
                  style={{ fontSize: "1.5rem" }}
                >
                  {selectedVendor.companyName}
                </h2>
                <StatusBadge
                  status={selectedVendor.verificationStatus}
                  size="sm"
                />
                <span
                  className="inline-flex items-center rounded-full text-sm font-bold gap-tight"
                  style={{
                    padding: "0.2rem 0.6rem",
                    background:
                      selectedVendor.accountStatus === "ACTIVE"
                        ? "var(--color-success-bg)"
                        : "var(--bg-surface-elevated)",
                    border: `1px solid ${selectedVendor.accountStatus === "ACTIVE" ? "var(--color-success-border)" : "var(--border)"}`,
                    color:
                      selectedVendor.accountStatus === "ACTIVE"
                        ? "var(--color-success)"
                        : "var(--text-muted)",
                  }}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: "7px",
                      height: "7px",
                      background:
                        selectedVendor.accountStatus === "ACTIVE"
                          ? "var(--color-success)"
                          : "var(--text-muted)",
                    }}
                  />
                  {selectedVendor.accountStatus}
                </span>
              </div>

              {/* Subtitle details: Contact person, Phone, Email */}
              <div className="flex items-center flex-wrap gap-4 mt-2 text-md text-secondary">
                <div className="flex items-center gap-tight">
                  <Users size={14} color="var(--text-brand)" />
                  <span className="font-semibold">
                    Contact: {selectedVendor.contactPerson}
                  </span>
                </div>
                <div className="flex items-center gap-tight">
                  <Phone size={14} color="var(--text-brand)" />
                  <span>{selectedVendor.phone}</span>
                </div>
                <div className="flex items-center gap-tight">
                  <Mail size={14} color="var(--text-brand)" />
                  <span>{selectedVendor.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Identifier & Registration Metadata */}
          <div className="flex items-center gap-6 flex-wrap border-l pl-6">
            <div className="text-left">
              <div
                className="text-muted uppercase font-bold text-label"
                style={{ letterSpacing: "0.05em" }}
              >
                Vendor ID
              </div>
              <div className="flex items-center gap-tight mt-compact">
                <span className="code-tag text-base">
                  {selectedVendor.id.slice(0, 12)}...
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(selectedVendor.id, "vendor-id")
                  }
                  className="border-0 cursor-pointer text-muted"
                  style={{ background: "none", padding: "0.15rem" }}
                  title="Copy Full Vendor ID"
                >
                  {copiedId === "vendor-id" ? (
                    <Check size={14} color="var(--color-success)" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            <div className="text-left">
              <div
                className="text-muted uppercase font-bold text-label"
                style={{ letterSpacing: "0.05em" }}
              >
                Registration Date
              </div>
              <div className="flex items-center mt-1 font-bold text-primary text-md gap-tight">
                <Calendar size={14} color="var(--text-brand)" />
                <span>
                  {new Date(selectedVendor.createdAt).toLocaleDateString(
                    "en-IN",
                    { day: "2-digit", month: "short", year: "numeric" },
                  )}
                </span>
              </div>
            </div>

            <div className="text-left">
              <div
                className="text-muted uppercase font-bold text-label"
                style={{ letterSpacing: "0.05em" }}
              >
                Escrow Balance
              </div>
              <div className="font-extrabold text-success text-title-lg mt-snug">
                ₹{selectedVendor.escrowBalance.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>

        {/* Corporate Profile Extended Grid (Address, GST, City & State) */}
        <div
          className="bg-surface-elevated border rounded-lg py-4 px-5 mb-6 grid gap-5"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <div>
            <div className="text-muted uppercase font-bold text-label">
              Company Address
            </div>
            <div className="text-md font-semibold text-primary mt-1 flex items-start gap-tight">
              <MapPin
                size={15}
                color="var(--text-brand)"
                style={{ flexShrink: 0, marginTop: "0.15rem" }}
              />
              <span>{selectedVendor.companyAddress}</span>
            </div>
          </div>

          <div>
            <div className="text-muted uppercase font-bold text-label">
              City & State
            </div>
            <div className="text-md font-semibold text-primary mt-1">
              {selectedVendor.city}
              {selectedVendor.state && selectedVendor.state !== "Not Available"
                ? `, ${selectedVendor.state}`
                : ""}
            </div>
          </div>

          <div>
            <div className="text-muted uppercase font-bold text-label">
              GST / Business Registration
            </div>
            <div
              className="text-md font-bold mt-1"
              style={{
                color: selectedVendor.gstNumber
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
              }}
            >
              {selectedVendor.gstNumber || "Not Available"}
            </div>
          </div>

          <div>
            <div className="text-muted uppercase font-bold text-label">
              Industry / Service Domain
            </div>
            <div className="text-md font-semibold text-primary mt-1">
              {selectedVendor.businessType || "—"}
            </div>
          </div>
        </div>

        {/* 2. VENDOR SUMMARY CARDS (5 Cards) */}
        <div
          className="grid gap-4 mb-6"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          }}
        >
          <MetricCard
            label="Total Orders Received"
            value={selectedVendor.totalOrdersReceived}
            subtext="All historical demands"
            icon={<Briefcase size={18} color="var(--text-brand)" />}
            accentColor="var(--text-brand)"
          />
          <MetricCard
            label="Completed Orders"
            value={selectedVendor.completedOrders}
            subtext={`${selectedVendor.totalOrdersReceived > 0 ? Math.round((selectedVendor.completedOrders / selectedVendor.totalOrdersReceived) * 100) : 0}% fulfillment rate`}
            icon={<CheckCircle2 size={18} color="var(--color-success)" />}
            accentColor="var(--color-success)"
          />
          <MetricCard
            label="Pending Orders"
            value={selectedVendor.pendingOrders}
            subtext="In fulfillment & dispatch"
            icon={<Clock size={18} color="var(--color-warning)" />}
            accentColor="var(--color-warning)"
          />
          <MetricCard
            label="Cancelled Orders"
            value={selectedVendor.cancelledOrders}
            subtext="Unassigned or aborted"
            icon={<AlertTriangle size={18} color="var(--color-danger)" />}
            accentColor="var(--color-danger)"
          />
          <MetricCard
            label="Total Revenue Generated"
            value={`₹${selectedVendor.totalRevenue.toLocaleString("en-IN")}`}
            subtext="Cumulative gross billings"
            icon={<DollarSign size={18} color="var(--text-brand)" />}
            accentColor="var(--brand-purple-text)"
          />
        </div>

        {/* 3. PERFORMANCE & ANALYTICS GRAPH (Interactive Month-Wise Analytics) */}
        <div className="bg-surface border rounded-xl p-6 mb-6 shadow-sm">
          <div
            className="flex items-center justify-between flex-wrap gap-4 mb-5"
            style={{ paddingTop: "0.15rem" }}
          >
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={20} color="var(--text-brand)" />
                <h3 className="text-xl font-extrabold text-primary m-0">
                  Vendor Performance & Operational Analytics
                </h3>
              </div>
              <div className="text-base text-muted mt-compact">
                Month-by-month demand trends, fulfillment consistency, and
                revenue trajectory
              </div>
            </div>

            {/* Metric Selector Tabs */}
            <div className="flex bg-surface-elevated p-1 rounded-md border gap-1">
              {[
                { id: "REVENUE", label: "Monthly Revenue" },
                { id: "COMPLETED", label: "Completed Orders" },
                { id: "ACTIVE_DAYS", label: "Active Days" },
                { id: "PERFORMANCE", label: "Order Performance" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setAnalyticsMetric(m.id as any);
                    setHoveredMonthIndex(null);
                  }}
                  className="border-0 rounded-sm text-sm font-bold cursor-pointer"
                  style={{
                    background:
                      analyticsMetric === m.id
                        ? "var(--brand-primary)"
                        : "transparent",
                    color:
                      analyticsMetric === m.id
                        ? "#ffffff"
                        : "var(--text-secondary)",
                    padding: "0.4rem 0.85rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Interactive Chart */}
          <div className="w-full overflow-x-auto pb-2">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full block my-0 mx-auto"
              style={{ maxWidth: "900px", height: "195px" }}
            >
              <defs>
                <linearGradient id="vendorBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--text-brand)"
                    stopOpacity="0.9"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--text-brand)"
                    stopOpacity="0.25"
                  />
                </linearGradient>
                <linearGradient
                  id="vendorBarHoverGrad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.35" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = paddingY + plotHeight * (1 - pct);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 8}
                      y={y + 3}
                      fill="var(--text-muted)"
                      fontSize="9"
                      textAnchor="end"
                      fontFamily="inherit"
                    >
                      {analyticsMetric === "REVENUE"
                        ? `₹${Math.round(maxVal * pct).toLocaleString("en-IN")}`
                        : Math.round(maxVal * pct)}
                    </text>
                  </g>
                );
              })}

              {/* Bars & Interactive Points */}
              {analytics.map((item, idx) => {
                const val =
                  analyticsMetric === "REVENUE"
                    ? item.revenue
                    : analyticsMetric === "COMPLETED"
                      ? item.completedOrders
                      : analyticsMetric === "ACTIVE_DAYS"
                        ? item.activeDays
                        : item.fulfillmentRate;

                const barH = maxVal > 0 ? (val / maxVal) * plotHeight : 0;
                const x = paddingX + idx * colStep + (colStep - barWidth) / 2;
                const y = paddingY + (plotHeight - barH);
                const isHovered = hoveredMonthIndex === idx;

                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredMonthIndex(idx)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                  >
                    {/* Bar rectangle */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(4, barH)}
                      rx="4"
                      fill={
                        isHovered
                          ? "url(#vendorBarHoverGrad)"
                          : "url(#vendorBarGrad)"
                      }
                      stroke={isHovered ? "#10B981" : "var(--text-brand)"}
                      strokeWidth={isHovered ? "2" : "1"}
                      style={{ transition: "all 0.2s ease" }}
                    />

                    {/* Month label at bottom */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 8}
                      fill={
                        isHovered ? "var(--text-primary)" : "var(--text-muted)"
                      }
                      fontSize="10"
                      fontWeight={isHovered ? "700" : "500"}
                      textAnchor="middle"
                      fontFamily="inherit"
                    >
                      {item.month}
                    </text>

                    {/* Value indicator on top of bar */}
                    <text
                      x={x + barWidth / 2}
                      y={Math.max(paddingY - 6, y - 6)}
                      fill={
                        isHovered ? "var(--text-primary)" : "var(--text-muted)"
                      }
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                      fontFamily="inherit"
                    >
                      {analyticsMetric === "REVENUE" ? `₹${val}` : val}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Tooltip Card */}
          {hoveredMonthIndex !== null && analytics[hoveredMonthIndex] && (
            <div
              className="mt-4 bg-surface-elevated rounded-md flex items-center flex-wrap gap-4"
              style={{
                padding: "0.85rem 1.25rem",
                border: "1px solid var(--border-light)",
                justifyContent: "space-around",
              }}
            >
              <div>
                <span className="text-muted uppercase text-label">Period</span>
                <div className="font-extrabold text-primary">
                  {analytics[hoveredMonthIndex].month}
                </div>
              </div>
              <div>
                <span className="text-muted uppercase text-label">Revenue</span>
                <div className="font-extrabold text-success">
                  ₹
                  {analytics[hoveredMonthIndex].revenue.toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <span className="text-muted uppercase text-label">
                  Completed Orders
                </span>
                <div className="font-extrabold text-primary">
                  {analytics[hoveredMonthIndex].completedOrders} /{" "}
                  {analytics[hoveredMonthIndex].totalOrders}
                </div>
              </div>
              <div>
                <span className="text-muted uppercase text-label">
                  Active Days
                </span>
                <div className="font-extrabold text-primary">
                  {analytics[hoveredMonthIndex].activeDays} days
                </div>
              </div>
              <div>
                <span className="text-muted uppercase text-label">
                  Fulfillment
                </span>
                <div className="font-extrabold text-brand">
                  {analytics[hoveredMonthIndex].fulfillmentRate}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. VENDOR ORDER HISTORY TABLE */}
        <div className="bg-surface border rounded-xl p-6 mb-6 shadow-sm">
          <div
            className="flex items-center justify-between flex-wrap gap-4 mb-5"
            style={{ paddingTop: "0.15rem" }}
          >
            <div>
              <div className="flex items-center gap-2">
                <FileText size={20} color="var(--text-brand)" />
                <h3 className="text-xl font-extrabold text-primary m-0">
                  Vendor Order History & Fulfilled Demands
                </h3>
              </div>
              <div className="text-base text-muted mt-compact">
                Complete audit records of vehicle bookings and logistics
                requirements
              </div>
            </div>

            {/* Timeframe Filter Buttons: Daily, Monthly, Yearly */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-surface-elevated p-1 rounded-md border gap-1">
                {[
                  { id: "ALL", label: "All Time" },
                  { id: "DAILY", label: "Daily (Today)" },
                  { id: "MONTHLY", label: "Monthly" },
                  { id: "YEARLY", label: "Yearly" },
                ].map((tf) => (
                  <button
                    key={tf.id}
                    onClick={() => setOrderTimeframe(tf.id as any)}
                    className="border-0 rounded-sm text-sm font-bold cursor-pointer"
                    style={{
                      background:
                        orderTimeframe === tf.id
                          ? "var(--brand-primary)"
                          : "transparent",
                      color:
                        orderTimeframe === tf.id
                          ? "#ffffff"
                          : "var(--text-secondary)",
                      padding: "0.35rem 0.75rem",
                    }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Status Filter Dropdown */}
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="rounded-md border bg-surface-elevated text-primary text-base font-semibold"
                style={{ padding: "0.4rem 0.75rem" }}
              >
                <option value="ALL">All Statuses</option>
                <option value="POSTED">POSTED</option>
                <option value="DISPATCHING">DISPATCHING</option>
                <option value="FULFILLED">FULFILLED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="NO_DRIVER_AVAILABLE">NO DRIVER AVAILABLE</option>
              </select>

              {/* Search Orders */}
              <div className="relative">
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Filter orders..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="rounded-md border bg-surface-elevated text-primary text-base"
                  style={{
                    padding: "0.4rem 0.75rem 0.4rem 2.2rem",
                    width: "180px",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <DataTable
            columns={[
              {
                key: "orderId",
                label: "Order ID",
                sortable: true,
                render: (o: VendorOrderItem) => (
                  <span className="code-tag font-bold">{o.orderId}</span>
                ),
              },
              {
                key: "orderDate",
                label: "Order Date",
                sortable: true,
                render: (o: VendorOrderItem) => (
                  <span className="text-base text-secondary">
                    {new Date(o.orderDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                ),
              },
              {
                key: "customerName",
                label: "Customer / Organization",
                render: (o: VendorOrderItem) => (
                  <div>
                    <div className="font-semibold text-primary text-md">
                      {o.customerName}
                    </div>
                    <div className="text-sm text-muted">
                      {o.customerContact}
                    </div>
                  </div>
                ),
              },
              {
                key: "serviceRequirement",
                label: "Service / Requirement",
                render: (o: VendorOrderItem) => (
                  <span className="text-base font-semibold text-primary">
                    {o.serviceRequirement}
                  </span>
                ),
              },
              {
                key: "pickupLocation",
                label: "Pickup Location",
                render: (o: VendorOrderItem) => (
                  <div
                    className="text-base text-secondary whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ maxWidth: "200px" }}
                    title={o.pickupLocation}
                  >
                    {o.pickupLocation}
                  </div>
                ),
              },
              {
                key: "deliveryLocation",
                label: "Delivery Location",
                render: (o: VendorOrderItem) => (
                  <div
                    className="text-base text-secondary whitespace-nowrap overflow-hidden text-ellipsis"
                    style={{ maxWidth: "200px" }}
                    title={o.deliveryLocation}
                  >
                    {o.deliveryLocation}
                  </div>
                ),
              },
              {
                key: "assignedDriver",
                label: "Assigned Driver",
                render: (o: VendorOrderItem) => (
                  <div className="text-base">
                    <div
                      className="font-semibold"
                      style={{
                        color:
                          o.assignedDriver !== "Not Assigned"
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                      }}
                    >
                      {o.assignedDriver}
                    </div>
                    {o.driverPhone && (
                      <div className="text-muted text-label">
                        {o.driverPhone}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: "orderAmount",
                label: "Order Amount",
                sortable: true,
                render: (o: VendorOrderItem) => (
                  <span className="font-extrabold text-primary text-md">
                    ₹{o.orderAmount.toLocaleString("en-IN")}
                  </span>
                ),
              },
              {
                key: "paymentStatus",
                label: "Payment",
                render: (o: VendorOrderItem) => (
                  <StatusBadge status={o.paymentStatus} size="sm" />
                ),
              },
              {
                key: "orderStatus",
                label: "Order Status",
                render: (o: VendorOrderItem) => (
                  <StatusBadge status={o.orderStatus} size="sm" />
                ),
              },
            ]}
            data={filteredVendorOrders}
            keyExtractor={(o) => o.id}
            loading={false}
            emptyTitle="No orders match the selected criteria"
            emptySubtitle="Adjust your search, status, or timeframe filters."
          />
        </div>
        {sharedDialogs}
      </div>
    );
  }

  /* =========================================================================
   * 3. MAIN LISTING VIEW: CORPORATE VENDORS & USERS HUB
   * ========================================================================= */
  const vendorColumns: Column<VendorListItem>[] = [
    {
      key: "companyName",
      label: "Organization & Contact",
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div
            className="rounded-md bg-brand-subtle flex items-center justify-center text-brand flex-shrink-0"
            style={{
              width: "38px",
              height: "38px",
              border: "1px solid rgba(var(--brand-primary-rgb), 0.25)",
            }}
          >
            <Building2 size={18} />
          </div>
          <div>
            <div className="font-bold text-primary text-value">
              {u.companyName || u.organizationName || "Corporate Partner"}
            </div>
            <div className="text-sm text-secondary mt-snug">
              {u.contactPerson && u.contactPerson !== u.companyName
                ? `${u.contactPerson}${u.phone ? ` • ${u.phone}` : ""}`
                : u.phone || u.email || "Corporate Account"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (u) => (
        <span className="text-base text-secondary">{u.email || "—"}</span>
      ),
    },
    {
      key: "verificationStatus",
      label: "Verification Status",
      sortable: true,
      render: (u) => <StatusBadge status={u.verificationStatus} size="sm" />,
    },
    {
      key: "requirementsCount",
      label: "Demands Posted",
      sortable: true,
      render: (u) => (
        <span className="font-extrabold text-primary text-value">
          {u.requirementsCount ?? 0}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Registered Date",
      sortable: true,
      render: (u) => (
        <span className="text-sm text-muted">
          {new Date(u.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Action",
      align: "right",
      render: (u) => (
        <div className="flex justify-end items-center gap-snug">
          <Button
            variant={
              u.verificationStatus === "PENDING" ? "primary" : "secondary"
            }
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenVendorDetails(u);
            }}
          >
            {u.verificationStatus === "PENDING"
              ? "Review Application →"
              : "View Details →"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditVendor(u);
            }}
            title="Edit Vendor Details"
            style={{ padding: "0.35rem 0.65rem" }}
          >
            <Edit3 size={13} style={{ marginRight: "0.25rem" }} /> Edit
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget({ id: u.id,
                name: u.companyName || u.contactPerson,
                phone: u.phone,
              });
            }}
            title="Permanently Delete Vendor from Database"
            style={{ padding: "0.35rem 0.65rem" }}
          >
            <Trash2 size={13} style={{ marginRight: "0.25rem" }} /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <PageHeader
        title="Corporate Vendors"
        subtitle="Lifecycle oversight of corporate vendor organizations, enterprise fleet partners, and transport providers across the AdhocX platform"
        liveStatus="Accounts Active"
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsOnboardVendorOpen(true)}
            leftIcon={<Plus size={15} />}
          >
            Onboard Vendor
          </Button>
        }
      />

      {/* Global Toast / Feedback */}
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      {/* CORPORATE VENDORS TABLE */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex-1">
            <FilterBar
              tabs={VENDOR_STATUS_TABS}
              activeTab={vendorTab}
              onTabChange={setVendorTab}
              search={vendorSearch}
              onSearchChange={setVendorSearch}
              searchPlaceholder="Search by company name, contact, phone, or email..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsOnboardVendorOpen(true)}
              leftIcon={<Plus size={15} />}
            >
              Onboard Vendor
            </Button>
          </div>
        </div>

        <DataTable
          columns={vendorColumns}
          data={filteredVendors}
          keyExtractor={(u) => u.id}
          loading={vendorsLoading}
          onRowClick={(u) => handleOpenVendorDetails(u)}
          emptyTitle="No corporate vendor accounts found"
          emptySubtitle={`No vendor organizations match the filter criteria "${vendorTab}".`}
        />
      </div>

      {sharedDialogs}
    </div>
  );
}
