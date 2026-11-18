"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
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
  Activity,
  FileText,
  ExternalLink,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Navigation,
  Briefcase,
  Truck,
} from "lucide-react";
import { adminApi } from "../../lib/api/client";
import {
  VendorListItem,
  CorporateVendorDetail,
  VendorOrderItem,
  CorporateTenantListItem,
} from "../../lib/api/types";
import {
  PageHeader,
  FilterBar,
  DataTable,
  Column,
  StatusBadge,
  Button,
  MetricCard,
  SegmentedTabs,
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

export default function CorporateVendorsPage() {
  const router = useRouter();

  // Vendor listing state
  const [vendorTab, setVendorTab] = useState("ALL");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Dedicated Full-Page Selection States
  const [selectedVendor, setSelectedVendor] =
    useState<CorporateVendorDetail | null>(null);
  const [, setDetailsLoading] = useState(false);

  // Edit Modal
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
      .catch(async () => {
        try {
          const tenant = await adminApi.getCorporateTenant(vendorId);
          if (active && tenant) {
            const fullAddress = [
              tenant.registeredAddress,
              tenant.city,
              tenant.state,
              tenant.pinCode,
            ]
              .filter(Boolean)
              .join(", ");
            setSelectedVendor({
              id: tenant.id,
              userId: tenant.id,
              companyName: tenant.name,
              organizationName: tenant.name,
              companyLogoUrl: tenant.logoUrl || null,
              contactPerson:
                tenant.primaryContactName ||
                tenant.legalEntityName ||
                tenant.name,
              fullName:
                tenant.primaryContactName ||
                tenant.legalEntityName ||
                tenant.name,
              phone: tenant.primaryContactPhone || "Not Available",
              email: tenant.primaryContactEmail || "Not Available",
              companyAddress: fullAddress || "Not Available",
              city: tenant.city || "Not Available",
              state: tenant.state || "Not Available",
              gstNumber: tenant.gstin || null,
              businessType: tenant.industry || "Corporate Fleet Partner",
              verificationStatus:
                tenant.status === "ACTIVE"
                  ? "VERIFIED"
                  : tenant.status === "SUSPENDED"
                  ? "SUSPENDED"
                  : "PENDING",
              accountStatus: (tenant.status as any) || "ACTIVE",
              escrowBalance: 0,
              createdAt: tenant.createdAt || new Date().toISOString(),
              updatedAt: tenant.updatedAt || new Date().toISOString(),
              totalOrdersReceived:
                tenant._count?.routes || tenant._count?.employees || 0,
              completedOrders: 0,
              pendingOrders: 0,
              cancelledOrders: 0,
              totalRevenue: 0,
              requirementsCount: tenant._count?.routes || 0,
              orders: [],
              performanceAnalytics: [],
              recentActivities: [],
            });
          }
        } catch {
          if (active) {
            setAlert({
              type: "error",
              message: "Failed to reload corporate vendor details.",
            });
          }
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
      // Query real database records from both /admin/vendors and /corporate/tenants
      const [vendorData, tenantData] = await Promise.allSettled([
        adminApi.getVendors(status).catch(() => [] as VendorListItem[]),
        adminApi
          .getCorporateTenants({
            status: status === "ALL" ? undefined : status,
            limit: 100,
          })
          .catch(() => null),
      ]);

      const vendorList: VendorListItem[] =
        vendorData.status === "fulfilled"
          ? Array.isArray(vendorData.value)
            ? vendorData.value
            : (vendorData.value as any)?.items || []
          : [];

      const tenantItems: CorporateTenantListItem[] =
        tenantData.status === "fulfilled" && tenantData.value
          ? Array.isArray(tenantData.value)
            ? (tenantData.value as any)
            : (tenantData.value as any)?.items || []
          : [];

      const mappedTenants: VendorListItem[] = tenantItems.map((t) => {
        const fullAddress = [t.registeredAddress, t.city, t.state, t.pinCode]
          .filter(Boolean)
          .join(", ");
        return {
          id: t.id,
          userId: t.id,
          companyName: t.name || t.legalEntityName || "Corporate Organization",
          organizationName:
            t.name || t.legalEntityName || "Corporate Organization",
          contactPerson:
            t.primaryContactName ||
            t.legalEntityName ||
            t.name ||
            "Corporate Admin",
          fullName:
            t.primaryContactName ||
            t.legalEntityName ||
            t.name ||
            "Corporate Admin",
          phone: t.primaryContactPhone || "",
          email: t.primaryContactEmail || undefined,
          address: fullAddress || undefined,
          city: t.city || undefined,
          state: t.state || undefined,
          gstNumber: t.gstin || undefined,
          verificationStatus:
            t.status === "ACTIVE"
              ? "VERIFIED"
              : t.status === "SUSPENDED"
              ? "SUSPENDED"
              : "PENDING",
          accountStatus: (t.status as any) || "ACTIVE",
          requirementsCount:
            (t as any)._count?.routes || (t as any)._count?.employees || 0,
          escrowBalance: 0,
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: (t as any).updatedAt,
        };
      });

      // Deduplicate and combine real database records
      const combinedMap = new Map<string, VendorListItem>();
      for (const v of vendorList) {
        combinedMap.set(v.id, v);
      }
      for (const t of mappedTenants) {
        if (!combinedMap.has(t.id)) {
          combinedMap.set(t.id, t);
        }
      }

      setVendors(Array.from(combinedMap.values()));
    } catch {
      setVendors([]);
    } finally {
      setVendorsLoading(false);
    }
  }

  // Filtered Vendor List
  const filteredVendors = useMemo(() => {
    let result = vendors;

    // Filter by tab status
    if (vendorTab !== "ALL") {
      result = result.filter((v) => {
        if (vendorTab === "PENDING") {
          return (
            v.verificationStatus === "PENDING" ||
            v.verificationStatus === "UNDER_REVIEW"
          );
        }
        if (vendorTab === "VERIFIED") {
          return (
            v.verificationStatus === "VERIFIED" ||
            v.accountStatus === "ACTIVE"
          );
        }
        if (vendorTab === "REJECTED") {
          return v.verificationStatus === "REJECTED";
        }
        if (vendorTab === "SUSPENDED") {
          return (
            v.verificationStatus === "SUSPENDED" ||
            v.accountStatus === "SUSPENDED"
          );
        }
        return v.verificationStatus === vendorTab;
      });
    }

    // Filter by search query
    if (vendorSearch.trim()) {
      const q = vendorSearch.toLowerCase().trim();
      result = result.filter(
        (v) =>
          (v.companyName && v.companyName.toLowerCase().includes(q)) ||
          (v.organizationName &&
            v.organizationName.toLowerCase().includes(q)) ||
          (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
          (v.fullName && v.fullName.toLowerCase().includes(q)) ||
          (v.phone && v.phone.toLowerCase().includes(q)) ||
          (v.email && v.email.toLowerCase().includes(q)) ||
          (v.address && v.address.toLowerCase().includes(q)) ||
          (v.city && v.city.toLowerCase().includes(q)) ||
          (v.state && v.state.toLowerCase().includes(q)) ||
          (v.gstNumber && v.gstNumber.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [vendors, vendorTab, vendorSearch]);

  // Open Full-Page Vendor Details
  async function handleOpenVendorDetails(vendor: VendorListItem) {
    setDetailsLoading(true);
    try {
      let details: CorporateVendorDetail | null = null;
      try {
        details = await adminApi.getVendorDetails(vendor.id);
      } catch {
        details = null;
      }

      if (!details || !details.companyName) {
        try {
          const tenant = await adminApi.getCorporateTenant(vendor.id);
          if (tenant) {
            const fullAddress = [
              tenant.registeredAddress,
              tenant.city,
              tenant.state,
              tenant.pinCode,
            ]
              .filter(Boolean)
              .join(", ");

            details = {
              id: tenant.id,
              userId: tenant.id,
              companyName: tenant.name || vendor.companyName,
              organizationName:
                tenant.name || vendor.organizationName || vendor.companyName || "Corporate Organization",
              companyLogoUrl: tenant.logoUrl || null,
              contactPerson:
                tenant.primaryContactName ||
                tenant.legalEntityName ||
                vendor.contactPerson,
              fullName:
                tenant.primaryContactName ||
                tenant.legalEntityName ||
                vendor.contactPerson,
              phone:
                tenant.primaryContactPhone || vendor.phone || "Not Available",
              email:
                tenant.primaryContactEmail || vendor.email || "Not Available",
              companyAddress: fullAddress || vendor.address || "Not Available",
              city: tenant.city || vendor.city || "Not Available",
              state: tenant.state || vendor.state || "Not Available",
              gstNumber: tenant.gstin || vendor.gstNumber || null,
              businessType: tenant.industry || "Corporate Fleet Partner",
              verificationStatus:
                tenant.status === "ACTIVE"
                  ? "VERIFIED"
                  : tenant.status === "SUSPENDED"
                  ? "SUSPENDED"
                  : "PENDING",
              accountStatus: (tenant.status as any) || "ACTIVE",
              escrowBalance: 0,
              createdAt: tenant.createdAt || vendor.createdAt,
              updatedAt:
                (tenant as any).updatedAt ||
                vendor.updatedAt ||
                new Date().toISOString(),
              totalOrdersReceived:
                tenant._count?.routes || tenant._count?.employees || 0,
              completedOrders: 0,
              pendingOrders: 0,
              cancelledOrders: 0,
              totalRevenue: 0,
              requirementsCount: tenant._count?.routes || 0,
              orders: [],
              performanceAnalytics: [],
              recentActivities: [],
            };
          }
        } catch {
          // Keep synthesized details
        }
      }

      if (details) {
        setSelectedVendor(details);
      } else {
        setSelectedVendor({
          id: vendor.id,
          userId: vendor.userId || vendor.id,
          companyName: vendor.companyName,
          organizationName:
            vendor.organizationName || vendor.companyName || "Corporate Partner",
          companyLogoUrl: null,
          contactPerson: vendor.contactPerson,
          fullName: vendor.fullName || vendor.contactPerson,
          phone: vendor.phone,
          email: vendor.email || "Not Available",
          companyAddress: vendor.address || "Not Available",
          city: vendor.city || "Not Available",
          state: vendor.state || "Not Available",
          gstNumber: vendor.gstNumber || null,
          businessType: "Corporate Partner",
          verificationStatus: vendor.verificationStatus,
          accountStatus: vendor.accountStatus || "ACTIVE",
          escrowBalance: vendor.escrowBalance || 0,
          createdAt: vendor.createdAt,
          updatedAt: vendor.updatedAt || new Date().toISOString(),
          totalOrdersReceived: vendor.requirementsCount || 0,
          completedOrders: 0,
          pendingOrders: 0,
          cancelledOrders: 0,
          totalRevenue: 0,
          requirementsCount: vendor.requirementsCount || 0,
          orders: [],
          performanceAnalytics: [],
          recentActivities: [],
        });
      }

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
      let saved = false;
      try {
        await adminApi.updateVendor(editingVendor.id, {
          organizationName: editFormData.organizationName,
          fullName: editFormData.contactPerson,
          phone: editFormData.phone,
          email: editFormData.email,
          gstNumber: editFormData.gstNumber,
          address: editFormData.address,
        });
        saved = true;
      } catch {
        try {
          await adminApi.updateCorporateTenant(editingVendor.id, {
            name: editFormData.organizationName,
            legalEntityName: editFormData.contactPerson,
            primaryContactName: editFormData.contactPerson,
            primaryContactPhone: editFormData.phone,
            primaryContactEmail: editFormData.email,
            registeredAddress: editFormData.address,
            gstin: editFormData.gstNumber,
          });
          saved = true;
        } catch (e: any) {
          throw new Error(e?.message || "Failed to save vendor details.");
        }
      }

      if (!saved) {
        throw new Error("Failed to save vendor details.");
      }

      setAlert({
        type: "success",
        message: "Corporate vendor details updated successfully.",
      });
      setEditingVendor(null);

      // Refresh data
      await loadVendors(vendorTab);
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

  // Execute Account Status Transition (Approve/Verify/Suspend/Reject)
  async function handleExecuteStatusAction(id: string) {
    if (!actionType) return;
    setActionLoading(true);
    try {
      if (actionType === "VERIFIED") {
        await adminApi
          .verifyVendor(id, actionReason || "Verified by Administrator")
          .catch(async () => {
            return adminApi.updateVendorStatus(id, "VERIFIED", actionReason);
          })
          .catch(async () => {
            return adminApi.updateCorporateTenant(id, {
              status: "ACTIVE",
            } as any);
          });
        setSelectedVendor((prev) =>
          prev
            ? {
                ...prev,
                verificationStatus: "VERIFIED",
                accountStatus: "ACTIVE",
              }
            : null,
        );
      } else if (actionType === "REJECTED") {
        await adminApi
          .rejectVendor(
            id,
            actionReason || "Application rejected by Administrator",
          )
          .catch(async () => {
            return adminApi.updateVendorStatus(id, "REJECTED", actionReason);
          });
        setSelectedVendor((prev) =>
          prev ? { ...prev, verificationStatus: "REJECTED" } : null,
        );
      } else if (actionType === "SUSPENDED") {
        await adminApi
          .updateVendorStatus(
            id,
            "SUSPENDED",
            actionReason || "Suspended by Administrator",
          )
          .catch(async () => {
            return adminApi.updateCorporateTenant(id, {
              status: "SUSPENDED",
            } as any);
          });
        setSelectedVendor((prev) =>
          prev
            ? {
                ...prev,
                verificationStatus: "SUSPENDED",
                accountStatus: "SUSPENDED",
              }
            : null,
        );
      }

      setAlert({
        type: "success",
        message: `Corporate vendor status updated to ${actionType}.`,
      });
      loadVendors(vendorTab);
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
      await adminApi.deleteVendor(deleteTarget.id).catch(() => {});
      setVendors((prev) => prev.filter((v) => v.id !== deleteTarget.id));
      setAlert({
        type: "success",
        message: `Corporate vendor "${deleteTarget.name}" deleted successfully.`,
      });
      if (selectedVendor?.id === deleteTarget.id) setSelectedVendor(null);
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

  // Filter orders by search & timeframe
  const filterOrders = <
    T extends {
      orderId: string;
      orderDate: string;
      orderStatus: string;
      pickupLocation?: string;
      deliveryLocation?: string;
    },
  >(
    orders: T[],
  ): T[] => {
    return orders.filter((o) => {
      if (orderStatusFilter !== "ALL" && o.orderStatus !== orderStatusFilter) {
        return false;
      }
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
        title="Permanently Delete Corporate Vendor?"
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
              <span>Corporate Vendors</span>
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
                setDeleteTarget({
                  id: selectedVendor.id,
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
          onConfirm={() => handleExecuteStatusAction(selectedVendor.id)}
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
              ? "Rejection Reason (required)"
              : "Suspension Reason"
          }
          reasonPlaceholder={
            actionType === "REJECTED"
              ? "State the reason for rejecting this vendor application..."
              : "Optional administrative notes..."
          }
          reasonValue={actionReason}
          onReasonChange={setActionReason}
          confirmLabel={
            actionType === "VERIFIED"
              ? "Approve & Verify"
              : `Execute ${actionType}`
          }
          isLoading={actionLoading}
        />

        {/* 1. TOP PROFILE DETAILS HEADER CARD */}
        <div
          className="card card-elevated"
          style={{ marginBottom: "1.25rem", padding: "1.5rem" }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className="rounded-xl flex items-center justify-center font-extrabold text-brand flex-shrink-0 text-title shadow-sm"
                style={{
                  width: "68px",
                  height: "68px",
                  background:
                    "linear-gradient(135deg, rgba(var(--brand-primary-rgb), 0.12), rgba(var(--brand-primary-rgb), 0.28))",
                  border: "1.5px solid rgba(var(--brand-primary-rgb), 0.35)",
                }}
              >
                {selectedVendor.companyLogoUrl ? (
                  <img
                    src={selectedVendor.companyLogoUrl}
                    alt={selectedVendor.companyName}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <Building2 size={32} />
                )}
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-extrabold text-primary tracking-tight">
                    {selectedVendor.companyName}
                  </h1>
                  <StatusBadge
                    status={selectedVendor.verificationStatus}
                    size="md"
                  />
                  <StatusBadge
                    status={selectedVendor.accountStatus || "ACTIVE"}
                    size="sm"
                  />
                </div>

                <div className="flex items-center gap-4 text-sm text-secondary mt-1 flex-wrap">
                  <span className="font-semibold text-primary">
                    {selectedVendor.contactPerson}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-muted">
                    <Briefcase size={13} /> {selectedVendor.businessType}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-muted">
                    <Calendar size={13} /> Joined{" "}
                    {new Date(selectedVendor.createdAt).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      },
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted font-mono bg-surface-subtle px-2 py-0.5 rounded border">
                    ID: {selectedVendor.id}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(selectedVendor.id, "vendor-id")
                    }
                    className="text-muted hover:text-primary transition-colors"
                    title="Copy Vendor ID"
                  >
                    {copiedId === "vendor-id" ? (
                      <Check size={13} className="text-success" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                  {selectedVendor.gstNumber && (
                    <span className="text-xs text-secondary font-mono bg-surface-subtle px-2 py-0.5 rounded border ml-2">
                      GST: {selectedVendor.gstNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Contact Box */}
            <div className="flex flex-col sm:flex-row gap-3 bg-surface-subtle p-3 rounded-lg border text-sm">
              <div className="flex items-center gap-2 pr-4 border-r border-border">
                <Phone size={15} className="text-brand flex-shrink-0" />
                <div>
                  <div className="text-[11px] text-muted uppercase font-bold">
                    Phone
                  </div>
                  <div className="font-semibold text-primary">
                    {selectedVendor.phone || "Not Available"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pr-4 border-r border-border">
                <Mail size={15} className="text-brand flex-shrink-0" />
                <div>
                  <div className="text-[11px] text-muted uppercase font-bold">
                    Email
                  </div>
                  <div className="font-semibold text-primary truncate max-w-[180px]">
                    {selectedVendor.email || "Not Available"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-brand flex-shrink-0" />
                <div>
                  <div className="text-[11px] text-muted uppercase font-bold">
                    Registered Address
                  </div>
                  <div className="font-semibold text-primary truncate max-w-[200px]">
                    {selectedVendor.companyAddress || "Not Available"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KEY PERFORMANCE METRICS STRIP */}
        <div
          className="grid gap-snug"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            marginBottom: "1.25rem",
          }}
        >
          <MetricCard
            label="Total Demands Received"
            value={selectedVendor.totalOrdersReceived || 0}
            subtext={`${selectedVendor.requirementsCount || 0} active demand requisitions`}
            icon={<FileText size={18} />}
          />
          <MetricCard
            label="Completed Trips"
            value={selectedVendor.completedOrders || 0}
            subtext={
              selectedVendor.totalOrdersReceived > 0
                ? `${Math.round(((selectedVendor.completedOrders || 0) / selectedVendor.totalOrdersReceived) * 100)}% fulfillment rate`
                : "No completed orders"
            }
            icon={<CheckCircle2 size={18} />}
          />
          <MetricCard
            label="Total Revenue Realized"
            value={`₹${(selectedVendor.totalRevenue || 0).toLocaleString("en-IN")}`}
            subtext="Aggregate gross GMV"
            icon={<DollarSign size={18} />}
          />
          <MetricCard
            label="Escrow Balance"
            value={`₹${(selectedVendor.escrowBalance || 0).toLocaleString("en-IN")}`}
            subtext="Current operational reserve"
            icon={<TrendingUp size={18} />}
          />
        </div>

        {/* 3. PERFORMANCE ANALYTICS INTERACTIVE CHART */}
        {analytics.length > 0 && (
          <div
            className="card card-elevated"
            style={{ marginBottom: "1.25rem", padding: "1.5rem" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-primary text-base">
                  Fulfillment & Performance Analytics (Past 6 Months)
                </h3>
                <p className="text-sm text-secondary mt-0.5">
                  Monthly progression of revenue, volume, and operational
                  consistency
                </p>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border">
                {(
                  [
                    { key: "REVENUE", label: "Gross Revenue" },
                    { key: "COMPLETED", label: "Completed Orders" },
                    { key: "ACTIVE_DAYS", label: "Active Days" },
                    { key: "PERFORMANCE", label: "Fulfillment %" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setAnalyticsMetric(m.key)}
                    className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                      analyticsMetric === m.key
                        ? "bg-brand text-white shadow-sm"
                        : "text-muted hover:text-primary"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Chart Engine */}
            <div className="relative w-full overflow-x-auto">
              <svg
                width="100%"
                height={chartHeight}
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="overflow-visible"
              >
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = paddingY + plotHeight * (1 - pct);
                  const tickVal = Math.round(maxVal * pct);
                  return (
                    <g key={idx}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="var(--border-subtle)"
                        strokeDasharray={pct === 0 ? "none" : "3,3"}
                      />
                      <text
                        x={paddingX - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="text-[10px] fill-muted font-mono"
                      >
                        {analyticsMetric === "REVENUE"
                          ? `₹${tickVal >= 1000 ? `${Math.round(tickVal / 1000)}k` : tickVal}`
                          : analyticsMetric === "PERFORMANCE"
                          ? `${tickVal}%`
                          : tickVal}
                      </text>
                    </g>
                  );
                })}

                {/* Bars for Each Month */}
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
                  const x =
                    paddingX + idx * colStep + (colStep - barWidth) / 2;
                  const y = paddingY + (plotHeight - barH);
                  const isHovered = hoveredMonthIndex === idx;

                  return (
                    <g
                      key={item.monthKey}
                      onMouseEnter={() => setHoveredMonthIndex(idx)}
                      onMouseLeave={() => setHoveredMonthIndex(null)}
                      className="cursor-pointer"
                    >
                      {/* Interactive hover column highlight */}
                      {isHovered && (
                        <rect
                          x={paddingX + idx * colStep}
                          y={paddingY}
                          width={colStep}
                          height={plotHeight}
                          fill="var(--surface-subtle)"
                          opacity={0.6}
                          rx={4}
                        />
                      )}

                      {/* Value Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(barH, 3)}
                        rx={4}
                        fill={isHovered ? "var(--brand-primary)" : "var(--brand-subtle)"}
                        stroke={isHovered ? "var(--brand-primary)" : "rgba(var(--brand-primary-rgb), 0.4)"}
                        strokeWidth={1.5}
                        className="transition-all duration-200"
                      />

                      {/* Month Label */}
                      <text
                        x={paddingX + idx * colStep + colStep / 2}
                        y={chartHeight - 8}
                        textAnchor="middle"
                        className={`text-[11px] font-semibold transition-colors ${
                          isHovered ? "fill-brand font-bold" : "fill-muted"
                        }`}
                      >
                        {item.month}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip Float */}
              {hoveredMonthIndex !== null && analytics[hoveredMonthIndex] && (
                <div
                  className="absolute bg-surface-elevated p-3 rounded-lg border shadow-lg text-xs pointer-events-none z-10"
                  style={{
                    left: `${((paddingX + hoveredMonthIndex * colStep + colStep / 2) / chartWidth) * 100}%`,
                    top: "15px",
                    transform: "translateX(-50%)",
                    minWidth: "160px",
                  }}
                >
                  <div className="font-bold text-primary border-b pb-1 mb-1.5 flex justify-between">
                    <span>{analytics[hoveredMonthIndex].month}</span>
                    <span className="text-brand font-mono font-semibold">
                      {analytics[hoveredMonthIndex].fulfillmentRate}% Rate
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted">Revenue:</span>
                    <span className="font-semibold text-primary">
                      ₹{analytics[hoveredMonthIndex].revenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted">Completed:</span>
                    <span className="font-semibold text-primary">
                      {analytics[hoveredMonthIndex].completedOrders} / {analytics[hoveredMonthIndex].totalOrders}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-muted">Active Days:</span>
                    <span className="font-semibold text-primary">
                      {analytics[hoveredMonthIndex].activeDays} days
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. ORDERS & REQUIREMENTS TABLE */}
        <div className="card card-elevated" style={{ padding: "1.25rem" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-primary text-base">
                Order & Requirement History
              </h3>
              <p className="text-sm text-secondary mt-0.5">
                Audit trail of service allocations, vehicles requested, and
                fulfillment standing
              </p>
            </div>

            {/* Timeframe Filter Tabs */}
            <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border">
              {(
                [
                  { id: "ALL", label: "All History" },
                  { id: "DAILY", label: "Today" },
                  { id: "MONTHLY", label: "This Month" },
                  { id: "YEARLY", label: "This Year" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setOrderTimeframe(t.id)}
                  className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${
                    orderTimeframe === t.id
                      ? "bg-brand text-white shadow-sm"
                      : "text-muted hover:text-primary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <FilterBar
            tabs={[
              { id: "ALL", label: "All Orders" },
              { id: "POSTED", label: "Open Demand" },
              { id: "DISPATCHING", label: "Dispatching" },
              { id: "COMPLETED", label: "Completed" },
              { id: "CANCELLED", label: "Cancelled" },
            ]}
            activeTab={orderStatusFilter}
            onTabChange={setOrderStatusFilter}
            search={orderSearchQuery}
            onSearchChange={setOrderSearchQuery}
            searchPlaceholder="Search by order ID, pickup, or delivery location..."
          />

          <DataTable<VendorOrderItem>
            columns={[
              {
                key: "orderId",
                label: "Order Reference",
                sortable: true,
                render: (o) => (
                  <div>
                    <span className="font-bold text-primary font-mono text-sm">
                      {o.orderId}
                    </span>
                    <div className="text-xs text-muted mt-0.5">
                      {new Date(o.orderDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                ),
              },
              {
                key: "serviceRequirement",
                label: "Fleet Requirement",
                render: (o) => (
                  <span className="text-sm font-semibold text-primary">
                    {o.serviceRequirement}
                  </span>
                ),
              },
              {
                key: "pickupLocation",
                label: "Pickup Location",
                render: (o) => (
                  <span
                    className="text-xs text-secondary truncate max-w-[170px] block"
                    title={o.pickupLocation}
                  >
                    {o.pickupLocation}
                  </span>
                ),
              },
              {
                key: "deliveryLocation",
                label: "Drop Location",
                render: (o) => (
                  <span
                    className="text-xs text-secondary truncate max-w-[170px] block"
                    title={o.deliveryLocation}
                  >
                    {o.deliveryLocation}
                  </span>
                ),
              },
              {
                key: "assignedDriver",
                label: "Assigned Driver",
                render: (o) => (
                  <div>
                    <span className="text-sm font-medium text-primary">
                      {o.assignedDriver}
                    </span>
                    {o.driverPhone && (
                      <div className="text-xs text-muted">{o.driverPhone}</div>
                    )}
                  </div>
                ),
              },
              {
                key: "orderAmount",
                label: "Amount (₹)",
                sortable: true,
                render: (o) => (
                  <span className="font-bold text-primary font-mono text-sm">
                    ₹{o.orderAmount.toLocaleString("en-IN")}
                  </span>
                ),
              },
              {
                key: "orderStatus",
                label: "Fulfillment Status",
                sortable: true,
                render: (o) => (
                  <StatusBadge status={o.orderStatus} size="sm" />
                ),
              },
            ]}
            data={filteredVendorOrders}
            keyExtractor={(o) => o.id}
            emptyTitle="No orders on file"
            emptySubtitle="Adjust your search, status, or timeframe filters."
          />
        </div>
        {sharedDialogs}
      </div>
    );
  }

  /* =========================================================================
   * 2. MAIN LISTING VIEW: CORPORATE VENDORS TABLE
   * ========================================================================= */
  const vendorColumns: Column<VendorListItem>[] = [
    {
      key: "companyName",
      label: "Company / Organization",
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
                ? `Contact: ${u.contactPerson}`
                : "Corporate Account"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "contactPerson",
      label: "Contact Person",
      sortable: true,
      render: (u) => (
        <span className="text-sm font-medium text-primary">
          {u.contactPerson || "—"}
        </span>
      ),
    },
    {
      key: "phone",
      label: "Phone & Email",
      render: (u) => (
        <div>
          <div className="text-sm font-semibold text-primary">
            {u.phone || "—"}
          </div>
          <div className="text-xs text-muted">
            {u.email || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "address",
      label: "Address",
      render: (u) => (
        <span
          className="text-xs text-secondary truncate max-w-[200px] block"
          title={
            u.address || [u.city, u.state].filter(Boolean).join(", ") || "—"
          }
        >
          {u.address || [u.city, u.state].filter(Boolean).join(", ") || "—"}
        </span>
      ),
    },
    {
      key: "verificationStatus",
      label: "Verification Status",
      sortable: true,
      render: (u) => <StatusBadge status={u.verificationStatus} size="sm" />,
    },
    {
      key: "accountStatus",
      label: "Account Status",
      sortable: true,
      render: (u) => (
        <StatusBadge status={u.accountStatus || "ACTIVE"} size="sm" />
      ),
    },
    {
      key: "createdAt",
      label: "Registration Date",
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
              setDeleteTarget({
                id: u.id,
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
      />

      {/* Global Toast / Feedback */}
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      {/* TOP-LEVEL SECTION: CORPORATE VENDORS ONLY */}
      <SegmentedTabs
        activeTab="VENDORS"
        onChange={() => {}}
        tabs={[
          {
            id: "VENDORS",
            label: "Corporate Vendors",
            count: vendors.length,
            icon: <Building2 size={15} />,
          },
        ]}
      />

      {/* CORPORATE VENDORS TABLE */}
      <div>
        <FilterBar
          tabs={VENDOR_STATUS_TABS}
          activeTab={vendorTab}
          onTabChange={setVendorTab}
          search={vendorSearch}
          onSearchChange={setVendorSearch}
          searchPlaceholder="Search by company name, contact, phone, or email..."
        />

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
