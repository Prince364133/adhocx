"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Star,
  Mail,
  Phone,
  Car,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  IndianRupee,
  TrendingUp,
  Edit3,
  ArrowLeft,
  ExternalLink,
  Check,
  Navigation,
} from "lucide-react";
import {
  adminApi,
  resolveDocumentUrl,
  complianceBlockersFromError,
  OVERRIDE_REASON_MIN_LENGTH,
} from "../../lib/api/client";
import {
  DriverListItem,
  DriverDetail,
  VehicleCategory,
} from "../../lib/api/types";
import {
  PageHeader,
  FilterBar,
  DataTable,
  Column,
  StatusBadge,
  Button,
  KpiStrip,
  FeedbackBanner,
  ConfirmDialog,
  Drawer,
} from "../../components/common";

const STATUS_TABS = [
  { id: "ALL", label: "All Drivers" },
  { id: "UNDER_REVIEW", label: "Under Review" },
  { id: "PENDING", label: "Incomplete (Draft)" },
  { id: "VERIFIED", label: "Verified" },
  { id: "REJECTED", label: "Rejected" },
  { id: "SUSPENDED", label: "Suspended" },
];

/** Driver is paused from new offers by the anti-cherry-picking cooldown. */
const isCoolingDown = (drv: { cooldownUntil?: string | null }) =>
  !!drv.cooldownUntil && new Date(drv.cooldownUntil).getTime() > Date.now();

const formatTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const formatCurrency = (amount: number) =>
  "₹" + Math.round(amount).toLocaleString("en-IN");

/**
 * Computes performance aggregates and time-series data for a driver
 * strictly from actual trip records returned by the API. If no data exists, zeroes are returned without mock numbers.
 */
function computeDriverPerformance(driver: DriverDetail, selectedYear: number) {
  const actualTrips = Array.isArray(driver.trips) ? driver.trips : [];

  const totalOrders = actualTrips.length;
  const completedOrders = actualTrips.filter(
    (t) => t.status === "COMPLETED",
  ).length;
  const cancelledOrders = actualTrips.filter(
    (t) => t.status === "CANCELLED",
  ).length;
  const totalEarnings = actualTrips
    .filter((t) => t.status === "COMPLETED")
    .reduce(
      (acc, t) => acc + Number(t.totalDriverEarnings ?? t.driverRate ?? 0),
      0,
    );

  const uniqueActiveDays = new Set(
    actualTrips
      .map((t) => t.completedAt || t.startedAt || t.createdAt)
      .filter(Boolean)
      .map((iso) => {
        const d = new Date(iso);
        return Number.isNaN(d.getTime()) ? null : d.toDateString();
      })
      .filter((v): v is string => Boolean(v)),
  );
  const activeDays = uniqueActiveDays.size;

  // Monthly breakdown for selectedYear (real trip records only)
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthData = months.map((monthName, idx) => {
    const tripsThisMonth = actualTrips.filter((t) => {
      const raw = t.completedAt || t.startedAt || t.createdAt;
      if (!raw) return false;
      const d = new Date(raw);
      return (
        !Number.isNaN(d.getTime()) &&
        d.getFullYear() === selectedYear &&
        d.getMonth() === idx
      );
    });

    const completed = tripsThisMonth.filter(
      (t) => t.status === "COMPLETED",
    ).length;
    const cancelled = tripsThisMonth.filter(
      (t) => t.status === "CANCELLED",
    ).length;
    const rev = tripsThisMonth
      .filter((t) => t.status === "COMPLETED")
      .reduce(
        (sum, t) => sum + Number(t.totalDriverEarnings ?? t.driverRate ?? 0),
        0,
      );
    const uniqueDays = new Set(
      tripsThisMonth
        .map((t) => t.completedAt || t.startedAt || t.createdAt)
        .filter(Boolean)
        .map((iso) => new Date(iso).toDateString()),
    ).size;

    return {
      month: `${monthName} ${selectedYear}`,
      monthShort: monthName,
      monthIndex: idx,
      year: selectedYear,
      totalOrders: tripsThisMonth.length,
      completedOrders: completed,
      cancelledOrders: cancelled,
      earnings: rev,
      activeDays: uniqueDays,
    };
  });

  // Daily breakdown (last 14 days, real trip records only)
  const dailyData: Array<{
    date: string;
    day: string;
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    earnings: number;
  }> = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
    const formattedDate = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const tripsToday = actualTrips.filter((t) => {
      const raw = t.completedAt || t.startedAt || t.createdAt;
      if (!raw) return false;
      const tripDate = new Date(raw);
      return (
        !Number.isNaN(tripDate.getTime()) &&
        tripDate.toISOString().split("T")[0] === dateStr
      );
    });

    const completed = tripsToday.filter((t) => t.status === "COMPLETED").length;
    const cancelled = tripsToday.filter((t) => t.status === "CANCELLED").length;
    const rev = tripsToday
      .filter((t) => t.status === "COMPLETED")
      .reduce(
        (sum, t) => sum + Number(t.totalDriverEarnings ?? t.driverRate ?? 0),
        0,
      );

    dailyData.push({
      date: formattedDate,
      day: dayName,
      totalOrders: tripsToday.length,
      completedOrders: completed,
      cancelledOrders: cancelled,
      earnings: rev,
    });
  }

  // Yearly breakdown (real trip records only)
  const currentYear = today.getFullYear();
  const years = Array.from(
    new Set([selectedYear, currentYear, currentYear - 1, currentYear - 2]),
  ).sort((a, b) => b - a);

  const yearlyData = years.map((yr) => {
    const tripsThisYear = actualTrips.filter((t) => {
      const raw = t.completedAt || t.startedAt || t.createdAt;
      if (!raw) return false;
      const d = new Date(raw);
      return !Number.isNaN(d.getTime()) && d.getFullYear() === yr;
    });
    const completed = tripsThisYear.filter(
      (t) => t.status === "COMPLETED",
    ).length;
    const cancelled = tripsThisYear.filter(
      (t) => t.status === "CANCELLED",
    ).length;
    const rev = tripsThisYear
      .filter((t) => t.status === "COMPLETED")
      .reduce(
        (sum, t) => sum + Number(t.totalDriverEarnings ?? t.driverRate ?? 0),
        0,
      );
    const uniqueDays = new Set(
      tripsThisYear
        .map((t) => t.completedAt || t.startedAt || t.createdAt)
        .filter(Boolean)
        .map((iso) => new Date(iso).toDateString()),
    ).size;

    return {
      year: yr,
      totalOrders: tripsThisYear.length,
      completedOrders: completed,
      cancelledOrders: cancelled,
      earnings: rev,
      activeDays: uniqueDays,
    };
  });

  return {
    summary: {
      totalOrders,
      completedOrders,
      cancelledOrders,
      activeDays,
      totalEarnings,
    },
    daily: dailyData,
    monthly: monthData,
    yearly: yearlyData,
  };
}

export default function DriversPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [drivers, setDrivers] = useState<DriverListItem[]>([]);
  const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>(
    [],
  );
  const [vehicleCategoriesLoading, setVehicleCategoriesLoading] =
    useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<DriverDetail | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [actionType, setActionType] = useState<
    "VERIFY" | "REJECT" | "SUSPEND" | "REACTIVATE" | null
  >(null);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Performance View Sub-States
  const [historyTab, setHistoryTab] = useState<"DAILY" | "MONTHLY" | "YEARLY">(
    "DAILY",
  );
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [hoveredGraphPoint, setHoveredGraphPoint] = useState<number | null>(
    null,
  );

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    phone: "",
    vehiclePlate: "",
    vehicleModel: "",
    vehicleType: "",
  });

  useEffect(() => {
    loadDrivers(activeTab);
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .getPricingTiers()
      .then((categories) => {
        if (!cancelled)
          setVehicleCategories(
            categories.filter((category) => category.isActive),
          );
      })
      .catch((error) => {
        if (!cancelled) {
          setAlert({
            type: "error",
            message: `Could not load active vehicle categories: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      })
      .finally(() => {
        if (!cancelled) setVehicleCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadDrivers(status: string) {
    setLoading(true);
    try {
      const data = await adminApi
        .getDrivers(status)
        .catch(() => [] as DriverListItem[]);
      const list = Array.isArray(data) ? data : (data as any)?.items || [];
      setDrivers(list);
    } finally {
      setLoading(false);
    }
  }

  const filteredDrivers = useMemo(() => {
    if (!search) return drivers;
    const q = search.toLowerCase();
    return drivers.filter(
      (d) =>
        d.fullName.toLowerCase().includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        (d.email && d.email.toLowerCase().includes(q)) ||
        (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(q)),
    );
  }, [drivers, search]);

  async function handleOpenDetails(driver: DriverListItem) {
    try {
      const detail: any = await adminApi.getDriverDetails(driver.id).catch(
        () =>
          ({
            ...driver,
            documents: [],
          }) as unknown as DriverDetail,
      );

      let docs: any[] = [];
      const profilePhoto =
        detail.profilePhotoUrl || detail.kycDocuments?.profilePhotoUrl;
      const kycDocsArray = Array.isArray(detail.kycDocuments?.documents)
        ? detail.kycDocuments.documents
        : Array.isArray(detail.kycDocuments)
          ? detail.kycDocuments
          : [];

      if (kycDocsArray.length > 0) {
        docs = kycDocsArray.map((doc: any, idx: number) => ({
          id: doc.id || `${detail.id}_doc_${idx}`,
          documentType: doc.type || doc.documentType || "DOCUMENT",
          title:
            doc.title ||
            (doc.type || doc.documentType)?.replace(/_/g, " ") ||
            `Document ${idx + 1}`,
          fileUrl: resolveDocumentUrl(doc.url || doc.fileUrl),
          verified: detail.verificationStatus === "VERIFIED",
          createdAt: doc.uploadedAt || detail.updatedAt || detail.createdAt,
        }));
      } else if (
        Array.isArray(detail.documents) &&
        detail.documents.length > 0
      ) {
        docs = detail.documents.map((doc: any) => ({
          ...doc,
          fileUrl: resolveDocumentUrl(doc.fileUrl || doc.url),
        }));
      } else {
        docs = [
          ...(profilePhoto
            ? [
                {
                  id: `${detail.id}_profile_photo`,
                  documentType: "PROFILE_PHOTO",
                  title: "Profile Photo / Selfie",
                  fileUrl: resolveDocumentUrl(profilePhoto),
                  verified: detail.verificationStatus === "VERIFIED",
                  createdAt: detail.createdAt,
                },
              ]
            : []),
          ...(detail.dlFrontUrl
            ? [
                {
                  id: `${detail.id}_dl_front`,
                  documentType: "DRIVING_LICENSE_FRONT",
                  title: "Driving License (Front)",
                  fileUrl: resolveDocumentUrl(detail.dlFrontUrl),
                  verified: detail.verificationStatus === "VERIFIED",
                  createdAt: detail.createdAt,
                },
              ]
            : []),
          ...(detail.dlBackUrl
            ? [
                {
                  id: `${detail.id}_dl_back`,
                  documentType: "DRIVING_LICENSE_BACK",
                  title: "Driving License (Back)",
                  fileUrl: resolveDocumentUrl(detail.dlBackUrl),
                  verified: detail.verificationStatus === "VERIFIED",
                  createdAt: detail.createdAt,
                },
              ]
            : []),
          ...(detail.rcFrontUrl
            ? [
                {
                  id: `${detail.id}_rc_front`,
                  documentType: "RC_FRONT",
                  title: "Vehicle RC (Front)",
                  fileUrl: resolveDocumentUrl(detail.rcFrontUrl),
                  verified: detail.verificationStatus === "VERIFIED",
                  createdAt: detail.createdAt,
                },
              ]
            : detail.rcDocUrl
              ? [
                  {
                    id: `${detail.id}_rc`,
                    documentType: "RC_BOOK",
                    title: "Vehicle RC Book",
                    fileUrl: resolveDocumentUrl(detail.rcDocUrl),
                    verified: detail.verificationStatus === "VERIFIED",
                    createdAt: detail.createdAt,
                  },
                ]
              : []),
          ...(detail.rcBackUrl
            ? [
                {
                  id: `${detail.id}_rc_back`,
                  documentType: "RC_BACK",
                  title: "Commercial Vehicle Permit",
                  fileUrl: resolveDocumentUrl(detail.rcBackUrl),
                  verified: detail.verificationStatus === "VERIFIED",
                  createdAt: detail.createdAt,
                },
              ]
            : []),
          ...(detail.insuranceDocUrl
            ? [
                {
                  id: `${detail.id}_ins`,
                  documentType: "INSURANCE",
                  title: "Vehicle Insurance",
                  fileUrl: resolveDocumentUrl(detail.insuranceDocUrl),
                  verified: detail.verificationStatus === "VERIFIED",
                  createdAt: detail.createdAt,
                },
              ]
            : []),
          ...(detail.vehiclePhotoUrl
            ? [
                {
                  id: `${detail.id}_veh`,
                  documentType: "VEHICLE_PHOTO",
                  title: "Vehicle Photo",
                  fileUrl: resolveDocumentUrl(detail.vehiclePhotoUrl),
                  verified: detail.verificationStatus === "VERIFIED",
                  createdAt: detail.createdAt,
                },
              ]
            : []),
          ...(detail.aadharFrontUrl
            ? [
                {
                  id: `${detail.id}_aadhar_front`,
                  documentType: "AADHAR_FRONT",
                  title: "Aadhar Card (Front)",
                  fileUrl: resolveDocumentUrl(detail.aadharFrontUrl),
                  verified: detail.verificationStatus === "VERIFIED",
                  createdAt: detail.createdAt,
                },
              ]
            : []),
          ...(detail.aadharBackUrl
            ? [
                {
                  id: `${detail.id}_aadhar_back`,
                  documentType: "AADHAR_BACK",
                  title: "Aadhar Card (Back)",
                  fileUrl: resolveDocumentUrl(detail.aadharBackUrl),
                  verified: detail.verificationStatus === "VERIFIED",
                  createdAt: detail.createdAt,
                },
              ]
            : []),
          ...(detail.panDocUrl
            ? [
                {
                  id: `${detail.id}_pan`,
                  documentType: "PAN_CARD",
                  title: "PAN Card",
                  fileUrl: resolveDocumentUrl(detail.panDocUrl),
                  verified: detail.verificationStatus === "VERIFIED",
                  createdAt: detail.createdAt,
                },
              ]
            : []),
        ];
      }

      if (
        profilePhoto &&
        !docs.some((d: any) => d.documentType === "PROFILE_PHOTO")
      ) {
        docs.unshift({
          id: `${detail.id}_profile_photo`,
          documentType: "PROFILE_PHOTO",
          title: "Profile Photo / Selfie",
          fileUrl: resolveDocumentUrl(profilePhoto),
          verified: detail.verificationStatus === "VERIFIED",
          createdAt: detail.createdAt,
        });
      }

      const fullDetail: DriverDetail = {
        ...detail,
        documents: docs,
      };

      setSelectedDriver(fullDetail);
      setReason("");
      setActionType(null);
      setIsEditModalOpen(false);
      setHoveredGraphPoint(null);
    } catch {
      setAlert({
        type: "error",
        message: "Failed to load detailed driver information.",
      });
    }
  }

  function handleOpenEdit(driver: DriverListItem) {
    setEditFormData({
      fullName: driver.fullName || "",
      phone: driver.phone || "",
      vehiclePlate: driver.vehiclePlate || "",
      vehicleModel: driver.vehicleModel || "",
      vehicleType: vehicleCategories.some(
        (category) => category.vehicleType === driver.vehicleType,
      )
        ? driver.vehicleType || ""
        : "",
    });
    handleOpenDetails(driver).then(() => {
      setIsEditModalOpen(true);
    });
  }

  function handleTriggerEditFromDetails() {
    if (!selectedDriver) return;
    setEditFormData({
      fullName: selectedDriver.fullName || "",
      phone: selectedDriver.phone || "",
      vehiclePlate: selectedDriver.vehiclePlate || "",
      vehicleModel: selectedDriver.vehicleModel || "",
      vehicleType: vehicleCategories.some(
        (category) => category.vehicleType === selectedDriver.vehicleType,
      )
        ? selectedDriver.vehicleType || ""
        : "",
    });
    setIsEditModalOpen(true);
  }

  async function handleSaveEditDriver() {
    if (!selectedDriver) return;
    if (
      !vehicleCategories.some(
        (category) => category.vehicleType === editFormData.vehicleType,
      )
    ) {
      setAlert({
        type: "error",
        message:
          "Select an active vehicle category from Pricing before saving.",
      });
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.updateDriver(selectedDriver.id, {
        fullName: editFormData.fullName,
        phone: editFormData.phone,
        vehiclePlate: editFormData.vehiclePlate,
        vehicleModel: editFormData.vehicleModel,
        vehicleType: editFormData.vehicleType,
      });

      // Update current selected driver
      setSelectedDriver((prev) =>
        prev
          ? {
              ...prev,
              fullName: editFormData.fullName,
              phone: editFormData.phone,
              vehiclePlate: editFormData.vehiclePlate,
              vehicleModel: editFormData.vehicleModel,
              vehicleType: editFormData.vehicleType,
            }
          : null,
      );

      // Update in drivers list
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === selectedDriver.id
            ? {
                ...d,
                fullName: editFormData.fullName,
                phone: editFormData.phone,
                vehiclePlate: editFormData.vehiclePlate,
                vehicleModel: editFormData.vehicleModel,
                vehicleType: editFormData.vehicleType,
              }
            : d,
        ),
      );

      setIsEditModalOpen(false);
      setAlert({
        type: "success",
        message: `Driver ${editFormData.fullName} updated successfully.`,
      });
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to update driver details.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleExecuteAction() {
    if (!selectedDriver || !actionType) return;
    if (
      (actionType === "REJECT" || actionType === "SUSPEND") &&
      !reason.trim()
    ) {
      setAlert({
        type: "error",
        message: `Please provide a reason for ${actionType.toLowerCase()}.`,
      });
      return;
    }

    setActionLoading(true);
    try {
      if (actionType === "VERIFY") {
        const trimmed = reason.trim();
        await adminApi.verifyDriver(
          selectedDriver.id,
          trimmed || undefined,
          trimmed || "Approved by admin override",
        );
      } else if (actionType === "REJECT") {
        await adminApi.rejectDriver(selectedDriver.id, reason);
      } else if (actionType === "SUSPEND") {
        await adminApi.suspendDriver(selectedDriver.id, reason);
      } else if (actionType === "REACTIVATE") {
        await adminApi.reactivateDriver(selectedDriver.id);
      }

      setAlert({
        type: "success",
        message: `Driver ${selectedDriver.fullName} status updated to ${actionType}.`,
      });
      setActionType(null);
      setReason("");
      // Reload driver details and list
      await handleOpenDetails(selectedDriver);
      loadDrivers(activeTab);
    } catch (err: unknown) {
      const blockers = complianceBlockersFromError(err);
      setAlert({
        type: "error",
        message: blockers
          ? `Cannot approve: ${blockers.map((b) => `${b.code.replace(/_/g, " ")}${b.message ? ` (${b.message})` : ""}`).join("; ")}. ` +
            `Enter an override reason of at least ${OVERRIDE_REASON_MIN_LENGTH} characters to approve anyway.`
          : err instanceof Error
            ? err.message
            : "Action execution failed.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearCooldown() {
    if (!selectedDriver) return;
    setActionLoading(true);
    try {
      await adminApi.clearDriverCooldown(selectedDriver.id);
      setAlert({
        type: "success",
        message: `Cooldown lifted for ${selectedDriver.fullName}. Offers resumed.`,
      });
      await handleOpenDetails(selectedDriver);
      loadDrivers(activeTab);
    } catch (err: unknown) {
      setAlert({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to clear cooldown.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  // Performance data memoized for the selected driver and year
  const performanceData = useMemo(() => {
    if (!selectedDriver) return null;
    return computeDriverPerformance(selectedDriver, selectedYear);
  }, [selectedDriver, selectedYear]);

  // Main Fleet Management Table Columns
  const columns: Column<DriverListItem>[] = [
    {
      key: "fullName",
      label: "Driver Name & Contact",
      sortable: true,
      render: (drv) => (
        <div className="flex items-center gap-3">
          <div
            className="rounded-full bg-brand-subtle flex items-center justify-center font-extrabold text-brand flex-shrink-0 text-body"
            style={{
              width: "38px",
              height: "38px",
              border: "1px solid rgba(var(--brand-primary-rgb), 0.25)",
            }}
          >
            {drv.fullName ? drv.fullName.slice(0, 2).toUpperCase() : "DR"}
          </div>
          <div>
            <div className="font-bold text-primary text-value">
              {drv.fullName}
            </div>
            <div
              className="text-sm text-secondary flex flex-col mt-snug"
              style={{ gap: "0.15rem" }}
            >
              <span>{drv.phone}</span>
              {drv.email ? (
                <div className="flex items-center text-muted gap-tight text-label">
                  <Mail size={11} style={{ flexShrink: 0 }} />
                  <span style={{ wordBreak: "break-all" }}>{drv.email}</span>
                </div>
              ) : null}
            </div>
            <div className="mt-tight">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetails(drv);
                }}
                className="border-0 p-0 text-brand text-sm font-bold cursor-pointer inline-flex items-center"
                style={{
                  background: "none",
                  gap: "0.2rem",
                  textDecoration: "underline",
                  textUnderlineOffset: "2px",
                }}
              >
                View Details →
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "vehiclePlate",
      label: "Vehicle Assigned",
      render: (drv) => (
        <div>
          <span
            className="code-tag font-bold"
            style={{ letterSpacing: "0.04em" }}
          >
            {drv.vehiclePlate || "Not Assigned"}
          </span>
          <div className="text-sm text-muted mt-compact">
            {drv.vehicleModel ? `${drv.vehicleModel} • ` : ""}
            {drv.vehicleType || "Standard"}
          </div>
        </div>
      ),
    },
    {
      key: "verificationStatus",
      label: "KYC Status",
      sortable: true,
      render: (drv) => (
        <StatusBadge status={drv.verificationStatus} size="sm" />
      ),
    },
    {
      key: "availabilityStatus",
      label: "Availability",
      render: (drv) => (
        <StatusBadge status={drv.availabilityStatus} size="sm" showPulse />
      ),
    },
    {
      key: "trustScore",
      label: "Trust & Reputation",
      sortable: true,
      render: (drv) => {
        const score = drv.trustScore ?? 100;
        const color =
          score >= 90
            ? "var(--color-success)"
            : score >= 75
              ? "var(--color-warning)"
              : "var(--color-danger)";
        return (
          <div>
            <div className="font-extrabold text-md" style={{ color }}>
              {score.toFixed(1)}% Trust
            </div>
            <div className="text-sm text-secondary flex items-center gap-1 mt-snug">
              <Star size={12} fill="#F59E0B" color="#F59E0B" />
              <span>
                {(drv.averageRating ?? 5.0).toFixed(1)} ({drv.ratingCount ?? 0})
                • {drv.totalTrips ?? 0} trips
              </span>
            </div>
            <div className="text-sm text-secondary mt-snug">
              {(drv.acceptanceRate ?? 100).toFixed(0)}% acceptance
              {isCoolingDown(drv) && (
                <span className="text-warning font-bold">
                  {" "}
                  • Paused until {formatTime(drv.cooldownUntil)}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "walletBalance",
      label: "Wallet Balance",
      sortable: true,
      render: (drv) => (
        <span className="font-bold text-primary text-value">
          ₹{Number(drv.walletBalance || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (drv) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={
              drv.verificationStatus === "UNDER_REVIEW"
                ? "primary"
                : "secondary"
            }
            size="sm"
            onClick={() => handleOpenDetails(drv)}
          >
            {drv.verificationStatus === "UNDER_REVIEW"
              ? "Review KYC"
              : "View Details"}
          </Button>
          <Link href={`/drivers/route-earnings?driverId=${drv.id}`}>
            <Button
              variant="outline"
              size="sm"
              title="Driver Route & Earnings Tracking"
              style={{
                padding: "0.375rem 0.6rem",
                color: "var(--text-brand)",
                borderColor: "var(--border-light)",
              }}
            >
              <Navigation size={14} style={{ marginRight: "0.25rem" }} />
              <span className="text-sm font-semibold">Route & Earnings</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(drv)}
            title="Edit Driver Profile"
            style={{ padding: "0.375rem 0.6rem" }}
          >
            <Edit3 size={15} style={{ marginRight: "0.25rem" }} />
            <span className="text-sm font-semibold">Edit</span>
          </Button>
        </div>
      ),
    },
  ];

  // =========================================================================
  // VIEW: FULL-PAGE DRIVER DETAILS
  // =========================================================================
  if (selectedDriver) {
    const summary = performanceData?.summary || {
      totalOrders: selectedDriver.totalTrips ?? 0,
      completedOrders: selectedDriver.totalTrips ?? 0,
      cancelledOrders: selectedDriver.declinedOffers ?? 0,
      activeDays: 0,
      totalEarnings: Number(selectedDriver.walletBalance || 0),
    };

    const ratingVal = selectedDriver.averageRating ?? 5.0;
    const trustScoreVal = selectedDriver.trustScore ?? 100.0;
    const isOnline =
      selectedDriver.availabilityStatus === "ONLINE" ||
      selectedDriver.availabilityStatus === "AVAILABLE";

    // Chart parameters
    const chartMonths = performanceData?.monthly || [];
    const maxEarnings = Math.max(...chartMonths.map((m) => m.earnings), 50000);
    const maxActiveDays = Math.max(...chartMonths.map((m) => m.activeDays), 30);
    const chartWidth = 520;
    const chartHeight = 220;
    const plotYBottom = 180;
    const plotYTop = 25;
    const plotHeight = plotYBottom - plotYTop;
    const colWidth = (chartWidth - 70) / 12;

    return (
      <div className="admin-page">
        {/* Top Navigation Bar with Back Button and Quick Actions */}
        <div
          className="module-bar mb-0 justify-between mt-snug"
          style={{ padding: "0.68rem 1rem" }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDriver(null);
                setActionType(null);
                setIsEditModalOpen(false);
              }}
              leftIcon={<ArrowLeft size={15} />}
            >
              Back to Driver Fleet
            </Button>
            <div className="flex items-center text-base text-muted gap-compact">
              <span>Drivers</span>
              <span>/</span>
              <span className="font-bold text-primary">
                {selectedDriver.fullName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/drivers/route-earnings?driverId=${selectedDriver.id}`}
            >
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Navigation size={14} />}
              >
                Route & Earnings
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerEditFromDetails}
              leftIcon={<Edit3 size={14} />}
            >
              Edit Profile
            </Button>

            {selectedDriver.verificationStatus === "UNDER_REVIEW" && (
              <>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setActionType("REJECT")}
                >
                  Reject KYC
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setActionType("VERIFY")}
                >
                  Approve KYC
                </Button>
              </>
            )}
            {selectedDriver.verificationStatus === "VERIFIED" && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setActionType("SUSPEND")}
              >
                Suspend Driver
              </Button>
            )}
            {selectedDriver.verificationStatus === "SUSPENDED" && (
              <Button
                variant="success"
                size="sm"
                onClick={() => setActionType("REACTIVATE")}
              >
                Reactivate Driver
              </Button>
            )}
            {isCoolingDown(selectedDriver) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearCooldown}
                isLoading={actionLoading}
              >
                Clear Cooldown ({formatTime(selectedDriver.cooldownUntil)})
              </Button>
            )}
          </div>
        </div>

        {/* Confirm Driver Status Transition Dialog */}
        <ConfirmDialog
          isOpen={Boolean(actionType)}
          onClose={() => {
            if (!actionLoading) {
              setActionType(null);
              setReason("");
            }
          }}
          onConfirm={() => handleExecuteAction()}
          variant={
            actionType === "VERIFY" || actionType === "REACTIVATE"
              ? "confirm"
              : "danger"
          }
          title={
            actionType === "VERIFY"
              ? "Approve Driver KYC"
              : actionType === "REJECT"
                ? "Reject Driver KYC"
                : actionType === "SUSPEND"
                  ? "Suspend Driver Account"
                  : "Reactivate Driver Account"
          }
          subtitle={`${selectedDriver.fullName}${selectedDriver.vehiclePlate ? ` · ${selectedDriver.vehiclePlate}` : ""}`}
          description={
            actionType === "REJECT"
              ? "Declining KYC will block this driver from accepting dispatches. Provide a clear rejection reason."
              : actionType === "SUSPEND"
                ? "Suspending this driver immediately halts active dispatches. Specify the audit reason."
                : actionType === "VERIFY"
                  ? "Mark this driver KYC package as verified and unlock live trip assignments."
                  : "Restore this suspended driver account back to verified active status."
          }
          requireReason={actionType === "REJECT" || actionType === "SUSPEND"}
          reasonLabel={
            actionType === "REJECT"
              ? "Mandatory Reason for Rejection"
              : "Mandatory Reason for Suspension"
          }
          reasonPlaceholder="e.g. Expired commercial driving permit or unverified vehicle registration"
          reasonValue={reason}
          onReasonChange={setReason}
          details={
            actionType === "VERIFY" || actionType === "REACTIVATE" ? (
              <div className="flex flex-col" style={{ gap: "0.65rem" }}>
                {alert?.type === "error" && (
                  <FeedbackBanner type="error" message={alert.message} />
                )}
                <div>
                  <label className="form-label">
                    {actionType === "VERIFY"
                      ? "Approval Notes / Compliance Override Reason (optional unless blockers exist)"
                      : "Optional Reactivation Notes"}
                  </label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Add operational or override notes for the audit trail..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={actionLoading}
                  />
                </div>
              </div>
            ) : alert?.type === "error" ? (
              <FeedbackBanner type="error" message={alert.message} />
            ) : undefined
          }
          confirmLabel={actionType ? `Execute ${actionType}` : "Confirm"}
          isLoading={actionLoading}
        />

        {/* Global Toast / Alert */}
        {alert && !actionType && (
          <FeedbackBanner
            type={alert.type}
            message={alert.message}
            onDismiss={() => setAlert(null)}
          />
        )}

        {/* SECTION 2: Top Profile Details Header Card */}
        <div
          className="bg-surface border rounded-lg shadow-xs flex flex-row items-center justify-between flex-wrap gap-5"
          style={{ padding: "1.15rem 1.35rem" }}
        >
          {/* Driver identity */}
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="rounded-full bg-brand-subtle flex items-center justify-center font-bold text-brand flex-shrink-0 text-title-sm"
              style={{
                width: "52px",
                height: "52px",
                border: "1px solid rgba(var(--brand-primary-rgb), 0.25)",
              }}
            >
              {selectedDriver.fullName
                ? selectedDriver.fullName.slice(0, 2).toUpperCase()
                : "DR"}
            </div>

            <div>
              <div
                className="flex items-center flex-wrap"
                style={{ gap: "0.625rem" }}
              >
                <h1
                  className="font-bold text-primary m-0"
                  style={{ fontSize: "1.36rem", letterSpacing: "-0.02em" }}
                >
                  {selectedDriver.fullName}
                </h1>
                <StatusBadge
                  status={selectedDriver.verificationStatus}
                  size="sm"
                />
                <span
                  className="inline-flex items-center rounded-full text-sm font-bold gap-tight"
                  style={{
                    padding: "0.2rem 0.6rem",
                    background: isOnline
                      ? "var(--color-success-bg)"
                      : "var(--bg-surface-elevated)",
                    border: `1px solid ${isOnline ? "var(--color-success-border)" : "var(--border)"}`,
                    color: isOnline
                      ? "var(--color-success)"
                      : "var(--text-muted)",
                  }}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: "8px",
                      height: "8px",
                      background: isOnline
                        ? "var(--color-success)"
                        : "var(--text-muted)",
                    }}
                  />
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </span>
              </div>

              {/* Subtitle details: Phone, Email, Vehicle Plate */}
              <div className="flex items-center flex-wrap gap-4 mt-2 text-md text-secondary">
                <div className="flex items-center gap-tight">
                  <Phone size={14} color="var(--text-brand)" />
                  <span>{selectedDriver.phone || "No phone recorded"}</span>
                </div>
                <div className="flex items-center gap-tight">
                  <Mail size={14} color="var(--text-brand)" />
                  <span>{selectedDriver.email || "No email registered"}</span>
                </div>
                <div className="flex items-center gap-tight">
                  <Car size={14} color="var(--brand-orange)" />
                  <span className="font-semibold">
                    {selectedDriver.vehiclePlate || "No Plate"}{" "}
                    <span className="text-muted">
                      (
                      {selectedDriver.vehicleModel
                        ? `${selectedDriver.vehicleModel} • `
                        : ""}
                      {selectedDriver.vehicleType || "Standard"})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Score & Star Rating */}
          <div className="flex items-center gap-6 flex-wrap border-l pl-6">
            {/* Trust Score */}
            <div className="text-left">
              <div
                className="text-sm text-muted uppercase font-bold"
                style={{ letterSpacing: "0.05em" }}
              >
                Trust Score
              </div>
              <div
                className="flex items-center font-extrabold gap-tight mt-compact"
                style={{
                  fontSize: "1.25rem",
                  color:
                    trustScoreVal >= 90
                      ? "var(--color-success)"
                      : trustScoreVal >= 75
                        ? "var(--color-warning)"
                        : "var(--color-danger)",
                }}
              >
                <ShieldCheck size={20} />
                <span>{trustScoreVal.toFixed(1)}%</span>
              </div>
              <div
                className="text-sm text-muted"
                style={{ marginTop: "0.1rem" }}
              >
                {(selectedDriver.acceptanceRate ?? 100).toFixed(0)}% acceptance
              </div>
            </div>

            {/* Star Rating */}
            <div className="text-left">
              <div
                className="text-sm text-muted uppercase font-bold"
                style={{ letterSpacing: "0.05em" }}
              >
                Driver Rating
              </div>
              <div className="flex items-center gap-1 mt-compact">
                {[1, 2, 3, 4, 5].map((starIdx) => (
                  <Star
                    key={starIdx}
                    size={16}
                    fill={
                      starIdx <= Math.round(ratingVal)
                        ? "#F59E0B"
                        : "transparent"
                    }
                    color={
                      starIdx <= Math.round(ratingVal)
                        ? "#F59E0B"
                        : "var(--border-light)"
                    }
                  />
                ))}
                <span className="font-extrabold text-xl text-primary ml-tight">
                  {ratingVal.toFixed(1)}
                </span>
              </div>
              <div
                className="text-sm text-muted"
                style={{ marginTop: "0.1rem" }}
              >
                {selectedDriver.ratingCount ?? 0} passenger reviews
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Summary Cards (5 Cards) */}
        <KpiStrip
          columns={5}
          items={[
            {
              label: "Total Orders",
              value: summary.totalOrders.toLocaleString("en-IN"),
              subtext: "Lifetime platform dispatch count",
              tone: "primary",
              icon: <TrendingUp size={15} />,
            },
            {
              label: "Completed Orders",
              value: summary.completedOrders.toLocaleString("en-IN"),
              subtext:
                summary.totalOrders > 0
                  ? `${Math.round((summary.completedOrders / summary.totalOrders) * 100)}% fulfillment rate`
                  : "100% fulfillment rate",
              tone: "success",
              icon: <CheckCircle2 size={15} />,
            },
            {
              label: "Cancelled Orders",
              value: summary.cancelledOrders.toLocaleString("en-IN"),
              subtext:
                summary.totalOrders > 0
                  ? `${Math.round((summary.cancelledOrders / summary.totalOrders) * 100)}% drop rate`
                  : "0% drop rate",
              tone: "danger",
              icon: <XCircle size={15} />,
            },
            {
              label: "Active Days",
              value: `${summary.activeDays} Days`,
              subtext: "Operational days on route",
              tone: "info",
              icon: <Calendar size={15} />,
            },
            {
              label: "Total Earnings",
              value: formatCurrency(summary.totalEarnings),
              subtext: `Wallet: ₹${Number(selectedDriver.walletBalance || 0).toLocaleString("en-IN")}`,
              tone: "warning",
              icon: <IndianRupee size={15} />,
            },
          ]}
        />

        {/* SECTION 4 & 5: Earnings History Table (Left) + Performance Graph (Right) */}
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
            marginBottom: "1.75rem",
          }}
        >
          {/* Left Column: Earnings and Orders History Table */}
          <div className="bg-surface border rounded-xl p-6 shadow-sm flex flex-col">
            {/* Header + Tabs (Daily, Monthly, Yearly) */}
            <div
              className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-3 border-b"
              style={{ paddingTop: "0.15rem" }}
            >
              <div>
                <h3 className="m-0 font-bold text-primary text-title-md">
                  Earnings and Orders History
                </h3>
                <div className="text-sm text-muted mt-compact">
                  {historyTab === "DAILY" &&
                    "Recent daily breakdown (past 14 days)"}
                  {historyTab === "MONTHLY" &&
                    `Monthly metrics for ${selectedYear}`}
                  {historyTab === "YEARLY" &&
                    "Year-over-year operational trends"}
                </div>
              </div>

              {/* Tabs for Daily / Monthly / Yearly */}
              <div
                className="inline-flex bg-surface-elevated rounded-md border"
                style={{ padding: "3px" }}
              >
                {(["DAILY", "MONTHLY", "YEARLY"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setHistoryTab(tab)}
                    className="border-0 rounded-sm text-sm font-bold cursor-pointer"
                    style={{
                      background:
                        historyTab === tab
                          ? "var(--brand-primary)"
                          : "transparent",
                      color:
                        historyTab === tab
                          ? "#ffffff"
                          : "var(--text-secondary)",
                      padding: "0.35rem 0.75rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Table */}
            <div
              className="overflow-x-auto flex-1"
              style={{ maxHeight: "380px" }}
            >
              <table
                className="w-full text-base"
                style={{ borderCollapse: "collapse" }}
              >
                <thead>
                  <tr className="border-b text-left text-muted">
                    <th
                      className="font-bold"
                      style={{ padding: "0.6rem 0.75rem" }}
                    >
                      {historyTab === "DAILY"
                        ? "Date / Day"
                        : historyTab === "MONTHLY"
                          ? "Month"
                          : "Year"}
                    </th>
                    <th
                      className="font-bold text-center"
                      style={{ padding: "0.6rem 0.75rem" }}
                    >
                      Orders
                    </th>
                    <th
                      className="font-bold text-center"
                      style={{ padding: "0.6rem 0.75rem" }}
                    >
                      Completed
                    </th>
                    <th
                      className="font-bold text-center"
                      style={{ padding: "0.6rem 0.75rem" }}
                    >
                      Cancelled
                    </th>
                    <th
                      className="font-bold text-right"
                      style={{ padding: "0.6rem 0.75rem" }}
                    >
                      {historyTab === "DAILY"
                        ? "Daily Earnings"
                        : "Period Earnings"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {historyTab === "DAILY" &&
                    performanceData?.daily.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-subtle"
                        style={{
                          background:
                            idx % 2 === 0 ? "transparent" : "var(--bg-base)",
                        }}
                      >
                        <td
                          className="font-semibold text-primary"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          {row.date}{" "}
                          <span className="text-muted font-medium text-label">
                            ({row.day})
                          </span>
                        </td>
                        <td
                          className="text-center text-secondary"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          {row.totalOrders}
                        </td>
                        <td
                          className="text-center"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          <span
                            className="inline-block rounded-full font-bold text-sm"
                            style={{
                              padding: "0.15rem 0.45rem",
                              background:
                                row.completedOrders > 0
                                  ? "var(--color-success-bg)"
                                  : "transparent",
                              color:
                                row.completedOrders > 0
                                  ? "var(--color-success)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {row.completedOrders}
                          </span>
                        </td>
                        <td
                          className="text-center"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          <span
                            className="inline-block rounded-full font-bold text-sm"
                            style={{
                              padding: "0.15rem 0.45rem",
                              background:
                                row.cancelledOrders > 0
                                  ? "var(--color-danger-bg)"
                                  : "transparent",
                              color:
                                row.cancelledOrders > 0
                                  ? "var(--color-danger)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {row.cancelledOrders}
                          </span>
                        </td>
                        <td
                          className="text-right font-bold text-success"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          {formatCurrency(row.earnings)}
                        </td>
                      </tr>
                    ))}

                  {historyTab === "MONTHLY" &&
                    performanceData?.monthly.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-subtle"
                        style={{
                          background:
                            idx % 2 === 0 ? "transparent" : "var(--bg-base)",
                        }}
                      >
                        <td
                          className="font-semibold text-primary"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          {row.month}
                        </td>
                        <td
                          className="text-center text-secondary"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          {row.totalOrders}
                        </td>
                        <td
                          className="text-center"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          <span
                            className="inline-block rounded-full font-bold text-sm"
                            style={{
                              padding: "0.15rem 0.45rem",
                              background:
                                row.completedOrders > 0
                                  ? "var(--color-success-bg)"
                                  : "transparent",
                              color:
                                row.completedOrders > 0
                                  ? "var(--color-success)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {row.completedOrders}
                          </span>
                        </td>
                        <td
                          className="text-center"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          <span
                            className="inline-block rounded-full font-bold text-sm"
                            style={{
                              padding: "0.15rem 0.45rem",
                              background:
                                row.cancelledOrders > 0
                                  ? "var(--color-danger-bg)"
                                  : "transparent",
                              color:
                                row.cancelledOrders > 0
                                  ? "var(--color-danger)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {row.cancelledOrders}
                          </span>
                        </td>
                        <td
                          className="text-right font-bold text-success"
                          style={{ padding: "0.65rem 0.75rem" }}
                        >
                          {formatCurrency(row.earnings)}
                        </td>
                      </tr>
                    ))}

                  {historyTab === "YEARLY" &&
                    performanceData?.yearly.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-subtle"
                        style={{
                          background:
                            idx % 2 === 0 ? "transparent" : "var(--bg-base)",
                        }}
                      >
                        <td className="p-3 font-bold text-primary text-md">
                          {row.year}
                        </td>
                        <td className="p-3 text-center text-secondary font-semibold">
                          {row.totalOrders}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className="inline-block rounded-full bg-success-subtle text-success font-bold text-sm"
                            style={{ padding: "0.15rem 0.5rem" }}
                          >
                            {row.completedOrders}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className="inline-block rounded-full bg-danger-subtle text-danger font-bold text-sm"
                            style={{ padding: "0.15rem 0.5rem" }}
                          >
                            {row.cancelledOrders}
                          </span>
                        </td>
                        <td className="p-3 text-right font-extrabold text-success text-md">
                          {formatCurrency(row.earnings)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Performance Graph (Revenue vs Active Days) */}
          <div className="bg-surface border rounded-xl p-6 shadow-sm flex flex-col">
            {/* Graph Header with Year Selector */}
            <div
              className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-3 border-b"
              style={{ paddingTop: "0.15rem" }}
            >
              <div>
                <h3 className="m-0 font-bold text-primary text-title-md">
                  Performance Graph
                </h3>
                <div className="text-sm text-muted mt-compact">
                  Revenue (₹) vs Active Days across {selectedYear}
                </div>
              </div>

              {/* Year Selector */}
              <div
                className="inline-flex bg-surface-elevated rounded-md border"
                style={{ padding: "3px" }}
              >
                {[2026, 2025].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setSelectedYear(yr)}
                    className="border-0 rounded-sm text-sm font-bold cursor-pointer"
                    style={{
                      background:
                        selectedYear === yr
                          ? "var(--brand-primary)"
                          : "transparent",
                      color:
                        selectedYear === yr
                          ? "#ffffff"
                          : "var(--text-secondary)",
                      padding: "0.35rem 0.75rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Chart */}
            <div
              className="relative w-full flex-1"
              style={{ minHeight: "260px" }}
            >
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full"
                style={{ overflow: "visible" }}
              >
                <defs>
                  {/* Revenue Bar Gradient */}
                  <linearGradient
                    id="revenueBarGrad"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="var(--text-brand)" stopOpacity="0.85" />
                    <stop
                      offset="100%"
                      stopColor="var(--brand-purple-text)"
                      stopOpacity="0.25"
                    />
                  </linearGradient>
                  {/* Revenue Bar Hovered Gradient */}
                  <linearGradient
                    id="revenueBarHoverGrad"
                    x1="0%"
                    y1="0%"
                    x2="0%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#FF5F09" stopOpacity="0.9" />
                    <stop
                      offset="100%"
                      stopColor="#FF5F09"
                      stopOpacity="0.35"
                    />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                  const y = plotYBottom - pct * plotHeight;
                  const revVal = Math.round(maxEarnings * pct);
                  const daysVal = Math.round(maxActiveDays * pct);
                  return (
                    <g key={i}>
                      <line
                        x1="45"
                        y1={y}
                        x2={chartWidth - 25}
                        y2={y}
                        stroke="var(--border)"
                        strokeDasharray={pct === 0 ? "none" : "3,3"}
                        strokeWidth="1"
                      />
                      {/* Left Y-axis label: Revenue */}
                      <text
                        x="40"
                        y={y + 3}
                        textAnchor="end"
                        fontSize="9"
                        fill="var(--text-muted)"
                        fontWeight="600"
                      >
                        {revVal >= 1000
                          ? `₹${Math.round(revVal / 1000)}k`
                          : `₹${revVal}`}
                      </text>
                      {/* Right Y-axis label: Active Days */}
                      <text
                        x={chartWidth - 20}
                        y={y + 3}
                        textAnchor="start"
                        fontSize="9"
                        fill="#FF5F09"
                        fontWeight="700"
                      >
                        {daysVal}d
                      </text>
                    </g>
                  );
                })}

                {/* Bars for Revenue */}
                {chartMonths.map((m, idx) => {
                  const xCenter = 50 + idx * colWidth + colWidth / 2;
                  const barWidth = 16;
                  const barHeight = Math.max(
                    2,
                    (m.earnings / maxEarnings) * plotHeight,
                  );
                  const barY = plotYBottom - barHeight;
                  const isHovered = hoveredGraphPoint === idx;

                  return (
                    <g
                      key={`bar-${idx}`}
                      onMouseEnter={() => setHoveredGraphPoint(idx)}
                      onMouseLeave={() => setHoveredGraphPoint(null)}
                      className="cursor-pointer"
                    >
                      {/* Invisible hover capture area */}
                      <rect
                        x={50 + idx * colWidth}
                        y={plotYTop}
                        width={colWidth}
                        height={plotHeight + 25}
                        fill="transparent"
                      />

                      {/* Highlight pillar behind bar when hovered */}
                      {isHovered && (
                        <rect
                          x={50 + idx * colWidth + 2}
                          y={plotYTop}
                          width={colWidth - 4}
                          height={plotHeight}
                          fill="rgba(var(--brand-primary-rgb), 0.08)"
                          rx="4"
                        />
                      )}

                      {/* Revenue Bar */}
                      <rect
                        x={xCenter - barWidth / 2}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        rx="3"
                        fill={
                          isHovered
                            ? "url(#revenueBarHoverGrad)"
                            : "url(#revenueBarGrad)"
                        }
                        stroke={isHovered ? "#FF5F09" : "var(--text-brand)"}
                        strokeWidth={isHovered ? "1.5" : "1"}
                      />

                      {/* X-axis Month Label */}
                      <text
                        x={xCenter}
                        y={plotYBottom + 16}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight={isHovered ? "800" : "600"}
                        fill={
                          isHovered
                            ? "var(--text-brand)"
                            : "var(--text-muted)"
                        }
                      >
                        {m.monthShort}
                      </text>
                    </g>
                  );
                })}

                {/* Line Path for Active Days */}
                {chartMonths.length > 1 && (
                  <>
                    <path
                      d={chartMonths
                        .map((m, idx) => {
                          const x = 50 + idx * colWidth + colWidth / 2;
                          const y =
                            plotYBottom -
                            (m.activeDays / maxActiveDays) * plotHeight;
                          return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                        })
                        .join(" ")}
                      fill="none"
                      stroke="#FF5F09"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Nodes for Active Days */}
                    {chartMonths.map((m, idx) => {
                      const x = 50 + idx * colWidth + colWidth / 2;
                      const y =
                        plotYBottom -
                        (m.activeDays / maxActiveDays) * plotHeight;
                      const isHovered = hoveredGraphPoint === idx;

                      return (
                        <circle
                          key={`node-${idx}`}
                          cx={x}
                          cy={y}
                          r={isHovered ? "5" : "3.5"}
                          fill="#ffffff"
                          stroke="#FF5F09"
                          strokeWidth={isHovered ? "3" : "2"}
                          style={{ transition: "all 0.15s ease" }}
                        />
                      );
                    })}
                  </>
                )}
              </svg>

              {/* Empty state overlay when no monthly activity exists */}
              {chartMonths.every((m) => m.earnings === 0 && m.activeDays === 0) && (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4 rounded-lg"
                  style={{
                    background: "rgba(var(--bg-surface-rgb, 255, 255, 255), 0.7)",
                    backdropFilter: "blur(1.5px)",
                  }}
                >
                  <span className="text-sm font-bold text-primary mb-1">
                    No Operational Activity in {selectedYear}
                  </span>
                  <span className="text-caption text-muted max-w-xs">
                    Monthly revenue and active day trajectories will update automatically when trips are completed.
                  </span>
                </div>
              )}

              {/* Floating Tooltip Card */}
              {hoveredGraphPoint !== null && chartMonths[hoveredGraphPoint] && (
                <div
                  className="absolute rounded-md text-sm shadow-elevated pointer-events-none"
                  style={{
                    top: "10px",
                    left: `${Math.min(
                      380,
                      Math.max(60, 50 + hoveredGraphPoint * colWidth - 50),
                    )}px`,
                    background: "var(--text-primary)",
                    color: "#ffffff",
                    padding: "0.6rem 0.85rem",
                    zIndex: 10,
                    lineHeight: "1.4",
                  }}
                >
                  <div
                    className="font-extrabold text-base"
                    style={{ marginBottom: "0.2rem", color: "#F8FAFC" }}
                  >
                    {chartMonths[hoveredGraphPoint].month}
                  </div>
                  <div
                    className="flex items-center gap-2"
                    style={{ color: "#E2E8F0" }}
                  >
                    <span style={{ color: "var(--brand-lavender)" }}>● Revenue:</span>
                    <span className="font-bold" style={{ color: "#34D399" }}>
                      {formatCurrency(chartMonths[hoveredGraphPoint].earnings)}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2"
                    style={{ color: "#E2E8F0" }}
                  >
                    <span style={{ color: "#FB923C" }}>● Active Days:</span>
                    <span className="font-bold">
                      {chartMonths[hoveredGraphPoint].activeDays} days
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2"
                    style={{ color: "#E2E8F0" }}
                  >
                    <span style={{ color: "#94A3B8" }}>● Completed:</span>
                    <span className="font-bold">
                      {chartMonths[hoveredGraphPoint].completedOrders} orders
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div
              className="flex items-center justify-center mt-4 pt-3 border-t text-sm font-semibold text-secondary"
              style={{ gap: "1.75rem" }}
            >
              <div className="flex items-center gap-compact">
                <div
                  className="bg-brand"
                  style={{ width: "12px", height: "12px", borderRadius: "2px" }}
                />
                <span>Monthly Revenue (₹ Paired)</span>
              </div>
              <div className="flex items-center gap-compact">
                <div
                  style={{
                    width: "12px",
                    height: "3px",
                    background: "#FF5F09",
                    borderRadius: "2px",
                  }}
                />
                <div
                  className="rounded-full"
                  style={{
                    width: "6px",
                    height: "6px",
                    background: "#FF5F09",
                    marginLeft: "-7px",
                  }}
                />
                <span>Active Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 6: Submitted Compliance Documents */}
        <div className="bg-surface border rounded-xl p-6 shadow-sm">
          <div
            className="flex items-center justify-between mb-4"
            style={{ paddingTop: "0.15rem" }}
          >
            <div>
              <h3 className="m-0 font-bold text-primary text-title-md">
                Submitted Compliance Documents
              </h3>
              <div className="text-sm text-muted mt-compact">
                Verified digital copies of official government licenses, vehicle
                RC, and insurance
              </div>
            </div>
            <span
              className="text-sm font-bold text-brand bg-brand-subtle rounded-full"
              style={{ padding: "0.2rem 0.6rem" }}
            >
              {selectedDriver.documents?.length || 0} Files on Record
            </span>
          </div>

          {selectedDriver.documents && selectedDriver.documents.length > 0 ? (
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              }}
            >
              {selectedDriver.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-surface-elevated border rounded-lg flex flex-col justify-between gap-3"
                  style={{ padding: "1rem 1.15rem" }}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold uppercase text-muted"
                        style={{ letterSpacing: "0.04em" }}
                      >
                        {doc.documentType.replace(/_/g, " ")}
                      </span>
                      {doc.verified ? (
                        <span
                          className="font-bold text-success flex items-center text-caption"
                          style={{ gap: "0.2rem" }}
                        >
                          <Check size={12} /> Verified
                        </span>
                      ) : (
                        <span className="font-bold text-warning text-caption">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-primary mt-1 text-value">
                      {doc.title || doc.documentType.replace(/_/g, " ")}
                    </div>
                    <div className="text-sm text-muted mt-compact">
                      Uploaded:{" "}
                      {doc.createdAt
                        ? new Date(doc.createdAt).toLocaleDateString("en-IN")
                        : "On File"}
                    </div>
                  </div>

                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="no-underline w-full"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      <ExternalLink
                        size={14}
                        style={{ marginRight: "0.35rem" }}
                      />
                      View Document
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-surface-elevated rounded-md text-muted text-md">
              No compliance documents currently on file for this driver.
            </div>
          )}
        </div>

        {/* EDIT PROFILE DRAWER */}
        <Drawer
          isOpen={isEditModalOpen}
          onClose={() => {
            if (!actionLoading) setIsEditModalOpen(false);
          }}
          width="min(92vw, 480px)"
          title="Edit Driver Profile"
          subtitle={`Update administrative details for ${selectedDriver.fullName}`}
          icon={<Edit3 size={17} />}
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveEditDriver}
                isLoading={actionLoading}
              >
                Save Changes
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="form-label">Full Legal Name</label>
              <input
                type="text"
                className="form-input"
                value={editFormData.fullName}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, fullName: e.target.value })
                }
              />
            </div>

            <div>
              <label className="form-label">Phone Number (Mobile)</label>
              <input
                type="text"
                className="form-input"
                value={editFormData.phone}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, phone: e.target.value })
                }
              />
            </div>

            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "1fr 1fr" }}
            >
              <div>
                <label className="form-label">Vehicle Plate Number</label>
                <input
                  type="text"
                  className="form-input uppercase"
                  placeholder="e.g. TS07KA2864"
                  value={editFormData.vehiclePlate}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      vehiclePlate: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="form-label">Vehicle Model</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Maruti Dzire"
                  value={editFormData.vehicleModel}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      vehicleModel: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <label className="form-label">Vehicle Category / Type</label>
              <select
                className="form-select"
                value={editFormData.vehicleType}
                disabled={
                  vehicleCategoriesLoading || vehicleCategories.length === 0
                }
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    vehicleType: e.target.value,
                  })
                }
              >
                <option value="">Select an active category</option>
                {vehicleCategories.map((category) => (
                  <option
                    key={category.vehicleType}
                    value={category.vehicleType}
                  >
                    {category.categoryLabel}
                  </option>
                ))}
              </select>
              {vehicleCategories.length === 0 && !vehicleCategoriesLoading && (
                <small className="form-hint">
                  Add an active category in Pricing before editing vehicle
                  types.
                </small>
              )}
            </div>
          </div>
        </Drawer>
      </div>
    );
  }

  // =========================================================================
  // VIEW: FLEET MANAGEMENT LIST TABLE (DEFAULT)
  // =========================================================================
  return (
    <div className="admin-page">
      <PageHeader
        title="Driver Fleet Management"
        subtitle="Operational oversight of commercial drivers, compliance documents, and real-time availability"
        liveStatus="Fleet Active"
      />

      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
        />
      )}

      <FilterBar
        tabs={STATUS_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by driver name, phone, email, plate..."
      />

      <DataTable
        columns={columns}
        data={filteredDrivers}
        keyExtractor={(d) => d.id}
        loading={loading}
        onRowClick={(d) => handleOpenDetails(d)}
        emptyTitle="No drivers found"
        emptySubtitle={`No drivers currently match the filter criteria: "${activeTab}".`}
      />
    </div>
  );
}
