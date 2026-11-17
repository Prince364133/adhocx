"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Send,
  Smartphone,
  CheckCircle2,
  XCircle,
  Radio,
  Users,
  Car,
  Building2,
  RefreshCw,
  Search,
  Eye,
  X,
  Layers,
  Calendar,
  UserCheck,
  Plus,
  Check,
  type LucideIcon,
} from "lucide-react";
import { adminApi } from "../../lib/api/client";
import {
  NotificationCampaignItem,
  NotificationMetrics,
  AudienceFilter,
  BroadcastPushPayload,
  TestPushPayload,
  AudienceEstimateResult,
  UserListItem,
} from "../../lib/api/types";
import {
  PageHeader,
  KpiStrip,
  Button,
  Card,
  DataTable,
  Column,
  Drawer,
  ConfirmDialog,
  FeedbackBanner,
  Modal,
  Input,
  Textarea,
} from "../../components/common";

const BLUE_PRIMARY = "var(--brand-primary)";
const BLUE_TEXT = "var(--text-brand)";
const BLUE_FOCUS = "var(--border-focus)";
const BLUE_HOVER = "var(--brand-primary-hover)";
const BLUE_SUBTLE = "var(--brand-primary-subtle)";
const BLUE_BORDER = "var(--brand-primary-border)";

type AudienceMode = "ALL" | "DRIVER" | "VENDOR" | "SPECIFIC";
type DeliveryStatusKey = "SENT" | "DELIVERED" | "FAILED";

const PAGE_SIZE = 10;

const AUDIENCE_OPTIONS: Array<{
  id: AudienceMode;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "ALL",
    label: "All Users",
    description: "All active users, drivers, and vendors",
    icon: Users,
  },
  {
    id: "DRIVER",
    label: "Drivers Only",
    description: "Registered fleet drivers",
    icon: Car,
  },
  {
    id: "VENDOR",
    label: "Vendors Only",
    description: "Corporate & transport vendors",
    icon: Building2,
  },
  {
    id: "SPECIFIC",
    label: "Specific Users",
    description: "Select specific users if required",
    icon: UserCheck,
  },
];

function getCampaignDeliveryStatus(
  c: NotificationCampaignItem,
): DeliveryStatusKey {
  const status = (c.status || "").toUpperCase();
  const targeted = c.totalTargeted ?? 0;
  const success = c.successCount ?? 0;
  const failed = c.failureCount ?? 0;

  if (status === "FAILED" || (targeted > 0 && success === 0 && failed > 0)) {
    return "FAILED";
  }
  if (status === "DELIVERED" || (success > 0 && failed === 0)) {
    return "DELIVERED";
  }
  return "SENT";
}

function getRecipientCount(c: NotificationCampaignItem): number {
  if (typeof c.totalTargeted === "number" && c.totalTargeted > 0) {
    return c.totalTargeted;
  }
  return (c.successCount || 0) + (c.failureCount || 0);
}

function formatDate(isoString?: string): string {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

const inputBaseStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.48rem 0.72rem",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-light, #CBD5E1)",
  fontSize: "0.78rem",
  background: "var(--bg-card, #FFFFFF)",
  color: "var(--text-primary)",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

function applyBlueFocus(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
) {
  e.currentTarget.style.borderColor = BLUE_FOCUS;
  e.currentTarget.style.boxShadow = "0 0 0 3px var(--brand-primary-subtle)";
}

function clearBlueFocus(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
) {
  e.currentTarget.style.borderColor = "var(--border-light, #CBD5E1)";
  e.currentTarget.style.boxShadow = "none";
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Metrics & Campaigns
  const [metrics, setMetrics] = useState<NotificationMetrics>({
    totalDelivered: 0,
    totalCampaigns: 0,
    activeDevicesCount: 0,
    devicesByPlatform: { android: 0, ios: 0, web: 0 },
    deliverySuccessRate: 0,
    inAppNotificationsCount: 0,
  });
  const [campaigns, setCampaigns] = useState<NotificationCampaignItem[]>([]);
  const [totalCampaignsCount, setTotalCampaignsCount] = useState(0);

  // Create Notification Form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Audience Selection
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("ALL");
  const [selectedUsers, setSelectedUsers] = useState<UserListItem[]>([]);
  const [manualPhones, setManualPhones] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState<UserListItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Audience Estimate
  const [audienceEstimate, setAudienceEstimate] =
    useState<AudienceEstimateResult>({
      matchingUsers: 0,
      matchingDevices: 0,
      platformBreakdown: { android: 0, ios: 0, web: 0 },
    });

  // Campaign History Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | DeliveryStatusKey>(
    "ALL",
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isConfirmBroadcastOpen, setIsConfirmBroadcastOpen] = useState(false);
  const [isTestPushOpen, setIsTestPushOpen] = useState(false);
  const [testPhoneOrToken, setTestPhoneOrToken] = useState("");
  const [testTitle, setTestTitle] = useState("");
  const [testBody, setTestBody] = useState("");
  const [testImageUrl, setTestImageUrl] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [selectedCampaign, setSelectedCampaign] =
    useState<NotificationCampaignItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [metricData, campaignData] = await Promise.all([
        adminApi.getNotificationMetrics().catch(() => ({
          totalDelivered: 0,
          totalCampaigns: 0,
          activeDevicesCount: 0,
          devicesByPlatform: { android: 0, ios: 0, web: 0 },
          deliverySuccessRate: 0,
          inAppNotificationsCount: 0,
        })),
        adminApi.getNotificationCampaigns(1, 100).catch(() => ({
          campaigns: [],
          total: 0,
        })),
      ]);
      setMetrics(metricData);
      setCampaigns(campaignData.campaigns || []);
      setTotalCampaignsCount(campaignData.total || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Build backend AudienceFilter cleanly (avoid passing both userIds and phones together)
  const activeAudienceFilter = useMemo<AudienceFilter | null>(() => {
    if (audienceMode !== "SPECIFIC") {
      return { role: audienceMode };
    }

    if (selectedUsers.length === 0 && manualPhones.length === 0) {
      return null;
    }

    if (manualPhones.length === 0) {
      return {
        role: "ALL",
        userIds: selectedUsers.map((u) => u.id),
      };
    }

    const phonesFromSelected = selectedUsers
      .map((u) => u.phone)
      .filter((p): p is string => Boolean(p && p !== "Not Available"));

    const allPhones = Array.from(
      new Set([...phonesFromSelected, ...manualPhones]),
    );
    if (allPhones.length > 0) {
      return { role: "ALL", phones: allPhones };
    }

    return {
      role: "ALL",
      userIds: selectedUsers.map((u) => u.id),
    };
  }, [audienceMode, selectedUsers, manualPhones]);

  // Re-estimate audience reach when target changes
  useEffect(() => {
    if (!activeAudienceFilter) {
      setAudienceEstimate({
        matchingUsers: 0,
        matchingDevices: 0,
        platformBreakdown: { android: 0, ios: 0, web: 0 },
      });
      setEstimating(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setEstimating(true);
      try {
        const res = await adminApi
          .estimateNotificationAudience(activeAudienceFilter)
          .catch(() => null);
        if (!cancelled && res && typeof res.matchingUsers === "number") {
          setAudienceEstimate(res);
        }
      } finally {
        if (!cancelled) setEstimating(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeAudienceFilter]);

  // Load searchable users when Specific Users mode is active
  useEffect(() => {
    if (audienceMode !== "SPECIFIC") return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const list = await adminApi
          .getUsers({
            status: "ACTIVE",
            search: userSearchQuery.trim() || undefined,
            limit: 20,
          })
          .catch(() => [] as UserListItem[]);
        if (!cancelled) {
          setAvailableUsers(Array.isArray(list) ? list : []);
        }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [audienceMode, userSearchQuery]);

  // Campaign Overview metrics
  const overviewStats = useMemo(() => {
    const campaignTotalSent = campaigns.reduce(
      (acc, c) => acc + getRecipientCount(c),
      0,
    );
    const campaignSuccess = campaigns.reduce(
      (acc, c) => acc + (c.successCount || 0),
      0,
    );
    const campaignFailed = campaigns.reduce(
      (acc, c) => acc + (c.failureCount || 0),
      0,
    );

    return {
      totalSent: Math.max(
        metrics.totalDelivered + campaignFailed,
        campaignTotalSent,
      ),
      totalDelivered: Math.max(metrics.totalDelivered, campaignSuccess),
      totalFailed: campaignFailed,
      totalCampaigns: Math.max(
        metrics.totalCampaigns || 0,
        campaigns.length,
        totalCampaignsCount,
      ),
    };
  }, [campaigns, metrics, totalCampaignsCount]);

  // Status counts for Campaign History
  const statusCounts = useMemo(() => {
    let sent = 0;
    let delivered = 0;
    let failed = 0;
    campaigns.forEach((c) => {
      const s = getCampaignDeliveryStatus(c);
      if (s === "DELIVERED") delivered++;
      else if (s === "FAILED") failed++;
      else sent++;
    });
    return {
      all: campaigns.length,
      sent,
      delivered,
      failed,
    };
  }, [campaigns]);

  // Filtered & paginated campaigns
  const filteredCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (q) {
        const matchesTitle = c.title?.toLowerCase().includes(q);
        const matchesBody = c.body?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody) return false;
      }
      if (
        statusFilter !== "ALL" &&
        getCampaignDeliveryStatus(c) !== statusFilter
      ) {
        return false;
      }
      return true;
    });
  }, [campaigns, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCampaigns.length / PAGE_SIZE),
  );
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredCampaigns.slice(start, start + PAGE_SIZE);
  }, [filteredCampaigns, currentPage]);

  const specificCount = selectedUsers.length + manualPhones.length;
  const isAudienceReady = audienceMode !== "SPECIFIC" || specificCount > 0;
  const canBroadcast = Boolean(
    title.trim() && body.trim() && isAudienceReady && !submitting,
  );

  function toggleSpecificUser(user: UserListItem) {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      return exists ? prev.filter((u) => u.id !== user.id) : [...prev, user];
    });
  }

  function handleAddManualPhone() {
    const trimmed = userSearchQuery.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 10) return;

    if (!manualPhones.includes(trimmed)) {
      setManualPhones((prev) => [...prev, trimmed]);
    }
    setUserSearchQuery("");
  }

  function clearForm() {
    setTitle("");
    setBody("");
    setImageUrl("");
    setSelectedUsers([]);
    setManualPhones([]);
    setUserSearchQuery("");
  }

  async function handleBroadcastPush() {
    if (!title.trim() || !body.trim()) {
      setAlert({
        type: "error",
        message:
          "Please enter both Notification Title and Notification Message before sending.",
      });
      return;
    }

    if (!activeAudienceFilter) {
      setAlert({
        type: "error",
        message: "Please select at least one specific user or phone number.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload: BroadcastPushPayload = {
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        filter: activeAudienceFilter,
      };

      const res = await adminApi.broadcastPushNotification(payload);
      const usersTargeted = res.totalTargetedUsers ?? 0;
      const devicesTargeted = res.totalTargetedDevices ?? 0;
      const delivered = res.successCount ?? 0;
      const failed = res.failureCount ?? 0;

      if (usersTargeted === 0) {
        setAlert({
          type: "error",
          message:
            "No active users matched the selected audience. Verify your selection and try again.",
        });
      } else if (
        res.status === "FAILED" ||
        (devicesTargeted > 0 && delivered === 0 && failed > 0)
      ) {
        setAlert({
          type: "error",
          message: `Campaign recorded, but FCM delivery failed for ${failed} device(s). Verify Firebase Cloud Messaging configuration.`,
        });
      } else if (devicesTargeted === 0) {
        setAlert({
          type: "success",
          message: `Notification sent to ${usersTargeted} user(s) in-app (0 active FCM device tokens registered).`,
        });
      } else {
        setAlert({
          type: "success",
          message: `Notification broadcast sent to ${usersTargeted} user(s) across ${devicesTargeted} device(s) — ${delivered} delivered${failed > 0 ? `, ${failed} failed` : ""}.`,
        });
      }

      clearForm();
      setIsConfirmBroadcastOpen(false);
      await loadData();
    } catch (err: any) {
      setAlert({
        type: "error",
        message:
          err?.message ||
          "Failed to dispatch notification. Please verify FCM credentials and backend status.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function openTestPushModal() {
    setTestTitle(title.trim() || "AdhocX Test Notification");
    setTestBody(
      body.trim() ||
        "This is a live test notification from AdhocX Push Notifications.",
    );
    setTestImageUrl(imageUrl.trim());
    setIsTestPushOpen(true);
  }

  async function handleSendTestPush() {
    const target = testPhoneOrToken.trim();
    if (!target) {
      setAlert({
        type: "error",
        message:
          "Please enter a phone number or FCM registration token to send a test notification.",
      });
      return;
    }

    setSendingTest(true);
    try {
      const isToken = target.length > 30 || target.includes(":");
      const payload: TestPushPayload = {
        title: testTitle.trim() || "AdhocX Test Notification",
        body:
          testBody.trim() ||
          "This is a live test notification from AdhocX Push Notifications.",
        imageUrl: testImageUrl.trim() || undefined,
        targetToken: isToken ? target : undefined,
        targetPhone: !isToken ? target : undefined,
        data: { test: "true", sentAt: new Date().toISOString() },
      };

      const res = await adminApi.sendTestPushNotification(payload);
      if (res.totalTokens === 0) {
        setAlert({
          type: "success",
          message: `User identified and in-app notification saved for ${target} (no active FCM device token registered yet).`,
        });
      } else if (res.successCount > 0) {
        setAlert({
          type: "success",
          message: `Test notification delivered to ${res.successCount} device(s)${res.failureCount > 0 ? ` (${res.failureCount} failed)` : ""}.`,
        });
      } else {
        setAlert({
          type: "error",
          message: `Test push delivery failed (${res.failureCount} failed). Verify the phone number or FCM device token.`,
        });
      }

      setIsTestPushOpen(false);
      await loadData();
    } catch (err: any) {
      setAlert({
        type: "error",
        message:
          err?.message ||
          "Failed to send test notification. Verify recipient phone or FCM token.",
      });
    } finally {
      setSendingTest(false);
    }
  }

  function renderAudienceBadge(c: NotificationCampaignItem) {
    const phones = c.targetFilter?.phones;
    const userIds = c.targetFilter?.userIds;

    if (phones && phones.length > 0) {
      return (
        <span
          className="inline-flex items-center rounded-full text-sm font-semibold whitespace-nowrap gap-tight"
          style={{
            padding: "0.25rem 0.625rem",
            background: "rgba(217, 119, 6, 0.1)",
            color: "#B45309",
            border: "1px solid rgba(217, 119, 6, 0.25)",
          }}
        >
          <UserCheck size={12} />
          {phones.length === 1
            ? phones[0]
            : `Specific Users (${phones.length})`}
        </span>
      );
    }

    if (userIds && userIds.length > 0) {
      return (
        <span
          className="inline-flex items-center rounded-full text-sm font-semibold whitespace-nowrap gap-tight"
          style={{
            padding: "0.25rem 0.625rem",
            background: "rgba(217, 119, 6, 0.1)",
            color: "#B45309",
            border: "1px solid rgba(217, 119, 6, 0.25)",
          }}
        >
          <UserCheck size={12} />
          Specific Users ({userIds.length})
        </span>
      );
    }

    const role = (c.targetRole || c.targetFilter?.role || "ALL").toUpperCase();
    if (role === "DRIVER") {
      return (
        <span
          className="inline-flex items-center rounded-full text-sm font-semibold whitespace-nowrap gap-tight"
          style={{
            padding: "0.25rem 0.625rem",
            background: "rgba(22, 163, 74, 0.1)",
            color: "#15803D",
            border: "1px solid rgba(22, 163, 74, 0.25)",
          }}
        >
          <Car size={12} />
          Drivers Only
        </span>
      );
    }

    if (role === "VENDOR") {
      return (
        <span
          className="inline-flex items-center rounded-full text-sm font-semibold whitespace-nowrap gap-tight"
          style={{
            padding: "0.25rem 0.625rem",
            background: "rgba(2, 132, 199, 0.1)",
            color: "#0369A1",
            border: "1px solid rgba(2, 132, 199, 0.25)",
          }}
        >
          <Building2 size={12} />
          Vendors Only
        </span>
      );
    }

    return (
      <span
        className="inline-flex items-center rounded-full text-sm font-semibold whitespace-nowrap gap-tight"
        style={{
          padding: "0.25rem 0.625rem",
          background: BLUE_SUBTLE,
          color: BLUE_HOVER,
          border: `1px solid ${BLUE_BORDER}`,
        }}
      >
        <Users size={12} />
        All Users
      </span>
    );
  }

  function renderStatusBadge(c: NotificationCampaignItem, showCounts = false) {
    const status = getCampaignDeliveryStatus(c);

    const badgeConfig: Record<
      DeliveryStatusKey,
      {
        label: string;
        bg: string;
        color: string;
        border: string;
        icon: React.ReactNode;
      }
    > = {
      DELIVERED: {
        label: "Delivered",
        bg: "rgba(22, 163, 74, 0.1)",
        color: "#15803D",
        border: "rgba(22, 163, 74, 0.25)",
        icon: <CheckCircle2 size={13} />,
      },
      FAILED: {
        label: "Failed",
        bg: "rgba(220, 38, 38, 0.1)",
        color: "#DC2626",
        border: "rgba(220, 38, 38, 0.25)",
        icon: <XCircle size={13} />,
      },
      SENT: {
        label: "Sent",
        bg: BLUE_SUBTLE,
        color: BLUE_TEXT,
        border: BLUE_BORDER,
        icon: <Send size={12} />,
      },
    };

    const cfg = badgeConfig[status];
    const hasPartialBreakdown =
      showCounts &&
      status === "SENT" &&
      c.successCount > 0 &&
      c.failureCount > 0;

    return (
      <div
        className="inline-flex flex-col items-start"
        style={{ gap: "0.2rem" }}
      >
        <span
          className="inline-flex items-center rounded-full text-sm font-bold whitespace-nowrap gap-tight"
          style={{
            padding: "0.25rem 0.65rem",
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
          }}
        >
          {cfg.icon}
          {cfg.label}
        </span>
        {hasPartialBreakdown && (
          <span className="text-muted whitespace-nowrap text-caption">
            {c.successCount} delivered · {c.failureCount} failed
          </span>
        )}
      </div>
    );
  }

  function getAudienceLabelForConfirm(): string {
    if (audienceMode === "SPECIFIC") {
      return `Specific Users (${specificCount} selected)`;
    }
    if (audienceMode === "DRIVER") return "Drivers Only";
    if (audienceMode === "VENDOR") return "Vendors Only";
    return "All Users";
  }

  const campaignColumns: Column<NotificationCampaignItem>[] = [
    {
      header: "Campaign Name",
      accessor: (c) => (
        <div className="flex items-center gap-3" style={{ maxWidth: "340px" }}>
          {c.imageUrl && (
            <img
              src={c.imageUrl}
              alt=""
              className="rounded-sm object-cover border border-subtle flex-shrink-0"
              style={{ width: "36px", height: "36px" }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          )}
          <div className="min-w-0">
            <div className="font-semibold text-primary overflow-hidden text-ellipsis whitespace-nowrap text-body-lg">
              {c.title || "Untitled Campaign"}
            </div>
            <div className="text-sm text-muted overflow-hidden text-ellipsis whitespace-nowrap mt-snug">
              {c.body || "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Target Audience",
      accessor: (c) => renderAudienceBadge(c),
    },
    {
      header: "Date",
      accessor: (c) => (
        <span className="inline-flex items-center text-secondary whitespace-nowrap gap-compact text-body-sm">
          <Calendar size={13} color="var(--text-muted)" />
          {formatDate(c.createdAt)}
        </span>
      ),
    },
    {
      header: "Total Recipients",
      accessor: (c) => {
        const count = getRecipientCount(c);
        return (
          <span className="inline-flex items-center font-semibold text-primary whitespace-nowrap gap-tight">
            <Users size={13} color="var(--text-muted)" />
            {count.toLocaleString()} {count === 1 ? "recipient" : "recipients"}
          </span>
        );
      },
    },
    {
      header: "Delivery Status",
      accessor: (c) => renderStatusBadge(c, true),
    },
    {
      header: "Action",
      align: "right",
      accessor: (c) => (
        <Button
          variant="outline"
          size="sm"
          leftIcon={<Eye size={13} color={BLUE_TEXT} />}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedCampaign(c);
          }}
          style={{
            borderColor: BLUE_BORDER,
            color: BLUE_HOVER,
            background: "var(--bg-card)",
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  const searchLooksLikePhone = userSearchQuery.replace(/\D/g, "").length >= 10;

  return (
    <div className="admin-page">
      {/* Page Header */}
      <PageHeader
        title="Push Notifications & Campaign Studio"
        subtitle="Create and send Firebase Cloud Messaging (FCM) notifications to users, drivers, and vendors."
        liveStatus="FCM Engine Active"
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            }
            onClick={loadData}
            disabled={loading}
          >
            Refresh
          </Button>
        }
      />

      {/* Feedback Banner */}
      {alert && (
        <FeedbackBanner
          type={alert.type}
          message={alert.message}
          onDismiss={() => setAlert(null)}
          autoDismissMs={6000}
        />
      )}

      {/* 1. CAMPAIGN OVERVIEW */}
      <section
        aria-label="Campaign Overview"
        className="w-full"
        style={{ marginTop: "0.1rem" }}
      >
        <KpiStrip
          columns={4}
          items={[
            {
              label: "Total Notifications Sent",
              value: overviewStats.totalSent.toLocaleString(),
              subtext: "Dispatched across all campaigns",
              tone: "primary",
              icon: <Send size={14} />,
            },
            {
              label: "Successful Deliveries",
              value: overviewStats.totalDelivered.toLocaleString(),
              subtext: "Delivered to active devices",
              tone: "success",
              icon: <CheckCircle2 size={14} />,
            },
            {
              label: "Failed Notifications",
              value: overviewStats.totalFailed.toLocaleString(),
              subtext: "Invalid tokens or delivery errors",
              tone: "danger",
              icon: <XCircle size={14} />,
            },
            {
              label: "Total Campaigns",
              value: overviewStats.totalCampaigns.toLocaleString(),
              subtext: "Broadcast & targeted runs",
              tone: "info",
              icon: <Layers size={14} />,
            },
          ]}
        />
      </section>

      {/* 2. CREATE NOTIFICATION & 3. AUDIENCE SELECTION */}
      <section
        aria-label="Create Notification and Audience Selection"
        className="w-full mt-compact"
      >
        <Card padding="lg" style={{ width: "100%" }}>
          <div className="flex flex-col gap-6">
            {/* Section Header */}
            <div
              className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-subtle"
              style={{ paddingTop: "0.15rem" }}
            >
              <div>
                <h2
                  className="font-bold text-primary m-0 text-title-md"
                  style={{ letterSpacing: "-0.015em" }}
                >
                  Create Notification
                </h2>
                <p
                  className="text-base text-secondary"
                  style={{ margin: "0.2rem 0 0 0" }}
                >
                  Compose your push message, select the target audience, and
                  send via Firebase Cloud Messaging.
                </p>
              </div>
              <div
                className="inline-flex items-center rounded-full font-semibold gap-snug text-body-sm"
                style={{
                  padding: "0.35rem 0.75rem",
                  background: BLUE_SUBTLE,
                  color: BLUE_HOVER,
                  border: `1px solid ${BLUE_BORDER}`,
                }}
              >
                <Users size={14} />
                <span>
                  {estimating
                    ? "Calculating reach..."
                    : audienceMode === "SPECIFIC" && specificCount === 0
                      ? "Select at least 1 specific user"
                      : `Estimated Reach: ${audienceEstimate.matchingUsers} user(s) · ${audienceEstimate.matchingDevices} device(s)`}
                </span>
              </div>
            </div>

            {/* Notification Content Fields */}
            <div className="flex flex-col" style={{ gap: "1.15rem" }}>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "1.15rem",
                }}
              >
                {/* Notification Title */}
                <div>
                  <div className="flex justify-between items-center mb-compact">
                    <label
                      htmlFor="notif-title"
                      className="font-semibold text-primary text-body-lg"
                    >
                      Notification Title{" "}
                      <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <span className="text-muted text-label">
                      {title.length} / 65
                    </span>
                  </div>
                  <input
                    id="notif-title"
                    type="text"
                    maxLength={65}
                    placeholder="e.g. Weekend Fleet Incentive Bonus"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onFocus={applyBlueFocus}
                    onBlur={clearBlueFocus}
                    style={inputBaseStyle}
                  />
                </div>

                {/* Optional Image URL */}
                <div>
                  <div className="flex justify-between items-center mb-compact">
                    <label
                      htmlFor="notif-image-url"
                      className="font-semibold text-primary text-body-lg"
                    >
                      Optional Image URL
                    </label>
                    <span className="text-muted text-label">
                      Banner image (optional)
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="notif-image-url"
                      type="url"
                      placeholder="https://example.com/banner.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onFocus={applyBlueFocus}
                      onBlur={clearBlueFocus}
                      style={{
                        ...inputBaseStyle,
                        paddingRight: imageUrl
                          ? "2.25rem"
                          : inputBaseStyle.padding,
                      }}
                    />
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        title="Clear image URL"
                        className="absolute center-y border-0 cursor-pointer text-muted flex items-center top-1/2"
                        style={{
                          right: "0.6rem",
                          background: "none",
                          padding: "0.2rem",
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notification Message */}
              <div>
                <div className="flex justify-between items-center mb-compact">
                  <label
                    htmlFor="notif-message"
                    className="font-semibold text-primary text-body-lg"
                  >
                    Notification Message{" "}
                    <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <span className="text-muted text-label">
                    {body.length} / 240
                  </span>
                </div>
                <textarea
                  id="notif-message"
                  rows={3}
                  maxLength={240}
                  placeholder="Write a clear message for the notification recipients..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onFocus={applyBlueFocus}
                  onBlur={clearBlueFocus}
                  style={{
                    ...inputBaseStyle,
                    resize: "vertical",
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>

            {/* 3. AUDIENCE SELECTION */}
            <div
              className="border-t border-subtle"
              style={{ paddingTop: "1.45rem" }}
            >
              <div style={{ marginBottom: "0.85rem" }}>
                <h3 className="font-bold text-primary m-0 text-title-sm">
                  Audience Selection
                </h3>
                <p
                  className="text-secondary text-body-sm"
                  style={{ margin: "0.15rem 0 0 0" }}
                >
                  Choose who should receive this notification.
                </p>
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: "0.875rem",
                }}
              >
                {AUDIENCE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = audienceMode === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAudienceMode(option.id)}
                      className="text-left rounded-lg cursor-pointer flex items-start gap-3"
                      style={{
                        padding: "0.95rem 1.05rem",
                        border: isSelected
                          ? `2px solid ${BLUE_FOCUS}`
                          : "1px solid var(--border-subtle)",
                        background: isSelected ? BLUE_SUBTLE : "var(--bg-card)",
                        transition: "all 0.16s ease",
                        fontFamily: "inherit",
                      }}
                    >
                      <div
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "8px",
                          background: isSelected
                            ? BLUE_PRIMARY
                            : "var(--bg-card-elevated)",
                          color: isSelected
                            ? "#FFFFFF"
                            : "var(--text-secondary)",
                        }}
                      >
                        <Icon size={17} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-primary text-body-xl">
                            {option.label}
                          </span>
                          <span
                            className="rounded-full inline-flex items-center justify-center flex-shrink-0"
                            style={{
                              width: "16px",
                              height: "16px",
                              border: `2px solid ${isSelected ? BLUE_FOCUS : "var(--border-light)"}`,
                            }}
                          >
                            {isSelected && (
                              <span
                                className="rounded-full"
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  background: BLUE_PRIMARY,
                                }}
                              />
                            )}
                          </span>
                        </div>
                        <p
                          className="mt-1 mr-0 mb-0 ml-0 text-secondary"
                          style={{ fontSize: "0.775rem", lineHeight: 1.35 }}
                        >
                          {option.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Specific Users Picker */}
              {audienceMode === "SPECIFIC" && (
                <div
                  className="mt-4 rounded-md bg-card-elevated flex flex-col gap-relaxed"
                  style={{
                    padding: "1rem 1.15rem",
                    border: `1px solid ${BLUE_BORDER}`,
                  }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-primary text-body-lg">
                      Select Specific Users
                    </span>
                    <span
                      className="font-semibold text-compact"
                      style={{ color: BLUE_HOVER }}
                    >
                      {specificCount} {specificCount === 1 ? "user" : "users"}{" "}
                      selected
                    </span>
                  </div>

                  {/* Selected Chips */}
                  {specificCount > 0 && (
                    <div className="flex flex-wrap gap-snug">
                      {selectedUsers.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center rounded-full bg-card font-semibold gap-compact text-compact"
                          style={{
                            padding: "0.25rem 0.6rem",
                            border: `1px solid ${BLUE_BORDER}`,
                            color: BLUE_HOVER,
                          }}
                        >
                          <span>{u.fullName || u.phone}</span>
                          {u.phone && u.fullName && (
                            <span className="text-muted font-medium">
                              ({u.phone})
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleSpecificUser(u)}
                            aria-label={`Remove ${u.fullName || u.phone}`}
                            className="border-0 cursor-pointer text-muted inline-flex p-0"
                            style={{ background: "none" }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                      {manualPhones.map((phone) => (
                        <span
                          key={phone}
                          className="inline-flex items-center rounded-full bg-card font-semibold gap-compact text-compact"
                          style={{
                            padding: "0.25rem 0.6rem",
                            border: `1px solid ${BLUE_BORDER}`,
                            color: BLUE_HOVER,
                          }}
                        >
                          <Smartphone size={12} />
                          <span>{phone}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setManualPhones((prev) =>
                                prev.filter((p) => p !== phone),
                              )
                            }
                            aria-label={`Remove ${phone}`}
                            className="border-0 cursor-pointer text-muted inline-flex p-0"
                            style={{ background: "none" }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search & Add Phone Row */}
                  <div className="flex flex-wrap" style={{ gap: "0.65rem" }}>
                    <div
                      className="relative flex-1"
                      style={{ minWidth: "220px" }}
                    >
                      <Search
                        size={15}
                        style={{
                          position: "absolute",
                          left: "0.75rem",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--text-muted)",
                          pointerEvents: "none",
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Search user by name, phone, or email (or enter phone number)..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && searchLooksLikePhone) {
                            e.preventDefault();
                            handleAddManualPhone();
                          }
                        }}
                        onFocus={applyBlueFocus}
                        onBlur={clearBlueFocus}
                        style={{
                          ...inputBaseStyle,
                          paddingLeft: "2.2rem",
                          paddingTop: "0.5rem",
                          paddingBottom: "0.5rem",
                        }}
                      />
                    </div>
                    {searchLooksLikePhone && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Plus size={14} />}
                        onClick={handleAddManualPhone}
                        style={{
                          borderColor: BLUE_FOCUS,
                          color: BLUE_TEXT,
                          background: "var(--bg-card)",
                        }}
                      >
                        Add Phone
                      </Button>
                    )}
                  </div>

                  {/* User Directory List */}
                  <div
                    className="overflow-y-auto rounded-md border border-subtle bg-card"
                    style={{ maxHeight: "190px" }}
                  >
                    {loadingUsers ? (
                      <div
                        className="text-center text-muted text-body-sm"
                        style={{ padding: "1.1rem" }}
                      >
                        Loading active users...
                      </div>
                    ) : availableUsers.length === 0 ? (
                      <div
                        className="text-center text-muted text-body-sm"
                        style={{ padding: "1.1rem" }}
                      >
                        No matching users found. You can enter a phone number
                        above and click &ldquo;Add Phone&rdquo;.
                      </div>
                    ) : (
                      availableUsers.map((user) => {
                        const checked = selectedUsers.some(
                          (u) => u.id === user.id,
                        );
                        return (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => toggleSpecificUser(user)}
                            className="w-full flex items-center justify-between gap-3 border-0 border-b border-subtle cursor-pointer text-left"
                            style={{
                              padding: "0.6rem 0.85rem",
                              background: checked ? BLUE_SUBTLE : "transparent",
                              fontFamily: "inherit",
                            }}
                          >
                            <div
                              className="flex items-center min-w-0"
                              style={{ gap: "0.65rem" }}
                            >
                              <span
                                className="inline-flex items-center justify-center flex-shrink-0"
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "4px",
                                  border: `1.5px solid ${checked ? BLUE_FOCUS : "var(--border-light)"}`,
                                  background: checked
                                    ? BLUE_PRIMARY
                                    : "var(--bg-card)",
                                  color: "#FFFFFF",
                                }}
                              >
                                {checked && <Check size={11} strokeWidth={3} />}
                              </span>
                              <div className="min-w-0">
                                <div
                                  className="font-semibold text-primary overflow-hidden text-ellipsis whitespace-nowrap"
                                  style={{ fontSize: "0.825rem" }}
                                >
                                  {user.fullName || "Unnamed User"}
                                </div>
                                <div className="text-muted text-control">
                                  {user.phone || user.email || user.id}
                                </div>
                              </div>
                            </div>
                            <span
                              className="text-xs font-bold uppercase rounded-full bg-card-elevated text-secondary border border-subtle flex-shrink-0"
                              style={{ padding: "0.15rem 0.5rem" }}
                            >
                              {user.role || "USER"}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons Bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-5 border-t border-subtle">
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<Smartphone size={16} color={BLUE_TEXT} />}
                onClick={openTestPushModal}
                style={{
                  borderColor: BLUE_BORDER,
                  color: BLUE_HOVER,
                  background: "var(--bg-card)",
                }}
              >
                Send Test Notification
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={clearForm}
                  disabled={!title && !body && !imageUrl && specificCount === 0}
                >
                  Clear
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  leftIcon={<Send size={15} />}
                  onClick={() => setIsConfirmBroadcastOpen(true)}
                  disabled={!canBroadcast}
                >
                  Send / Broadcast Notification
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. CAMPAIGN HISTORY & 5. NOTIFICATION STATUS */}
      <section
        aria-label="Campaign History and Notification Status"
        className="w-full mt-1"
      >
        <div className="flex flex-col gap-4 w-full">
          {/* History Header + Notification Status Filter Bar */}
          <div
            className="flex items-center justify-between flex-wrap gap-relaxed"
            style={{ paddingTop: "0.15rem" }}
          >
            <div>
              <h2
                className="font-bold text-primary m-0 text-title-md"
                style={{ letterSpacing: "-0.015em" }}
              >
                Campaign History
              </h2>
              <p
                className="text-base text-secondary"
                style={{ margin: "0.15rem 0 0 0" }}
              >
                Sent, delivered, and failed push notification campaigns.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* 5. Notification Status Pills (All / Sent / Delivered / Failed) */}
              <div
                role="tablist"
                aria-label="Notification Status"
                className="notification-status-tabs flex items-center gap-1 bg-surface-elevated p-1 rounded-md border border-subtle"
              >
                {(
                  [
                    {
                      id: "ALL",
                      label: "All",
                      count: statusCounts.all,
                      dotColor: null,
                    },
                    {
                      id: "SENT",
                      label: "Sent",
                      count: statusCounts.sent,
                      dotColor: BLUE_TEXT,
                    },
                    {
                      id: "DELIVERED",
                      label: "Delivered",
                      count: statusCounts.delivered,
                      dotColor: "#16A34A",
                    },
                    {
                      id: "FAILED",
                      label: "Failed",
                      count: statusCounts.failed,
                      dotColor: "#DC2626",
                    },
                  ] as const
                ).map((tab) => {
                  const isActive = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setStatusFilter(tab.id)}
                      className="rounded-sm border-0 cursor-pointer inline-flex items-center text-control-lg gap-tight"
                      style={{
                        padding: "0.3rem 0.65rem",
                        fontWeight: isActive ? 600 : 500,
                        color: isActive
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        background: isActive
                          ? "var(--bg-surface)"
                          : "transparent",
                        boxShadow: isActive ? "var(--shadow-sm)" : "none",
                        fontFamily: "inherit",
                      }}
                    >
                      {tab.dotColor && (
                        <span
                          className="rounded-full inline-block"
                          style={{
                            width: "7px",
                            height: "7px",
                            background: tab.dotColor,
                          }}
                        />
                      )}
                      <span>{tab.label}</span>
                      <span
                        className="rounded-full text-xs font-bold"
                        style={{
                          padding: "0.05rem 0.4rem",
                          background: isActive ? BLUE_SUBTLE : "var(--bg-base)",
                          color: isActive ? BLUE_TEXT : "var(--text-muted)",
                        }}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Input */}
              <div
                className="relative"
                style={{ width: "240px", maxWidth: "100%" }}
              >
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={applyBlueFocus}
                  onBlur={clearBlueFocus}
                  style={{
                    ...inputBaseStyle,
                    padding: "0.42rem 1.75rem 0.42rem 2.1rem",
                    fontSize: "0.8rem",
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear campaign search"
                    className="absolute center-y border-0 text-muted cursor-pointer flex top-1/2"
                    style={{
                      right: "0.55rem",
                      background: "none",
                      padding: "0.15rem",
                    }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Clean Full-Width Table */}
          <DataTable
            columns={campaignColumns}
            data={paginatedCampaigns}
            loading={loading}
            emptyIcon={<Radio size={24} />}
            emptyTitle="No Notification Campaigns Found"
            emptySubtitle={
              searchQuery || statusFilter !== "ALL"
                ? "No campaigns match the current search or status filter."
                : "Sent broadcast notifications will appear here."
            }
            pagination={
              filteredCampaigns.length > PAGE_SIZE
                ? {
                    currentPage,
                    totalPages,
                    totalItems: filteredCampaigns.length,
                    pageSize: PAGE_SIZE,
                    onPageChange: setCurrentPage,
                  }
                : undefined
            }
          />
        </div>
      </section>

      {/* DRAWER: VIEW CAMPAIGN DETAILS */}
      <Drawer
        isOpen={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        title="Campaign Details"
        subtitle={
          selectedCampaign ? formatDate(selectedCampaign.createdAt) : undefined
        }
        icon={<Radio size={17} />}
        width="540px"
        footer={
          <Button
            variant="secondary"
            size="md"
            onClick={() => setSelectedCampaign(null)}
          >
            Close
          </Button>
        }
      >
        {selectedCampaign && (
          <div className="flex flex-col gap-4">
            <div
              className="flex items-center justify-between border-b border-subtle"
              style={{ paddingBottom: "0.8rem" }}
            >
              <div>
                <div className="font-bold text-muted uppercase text-label">
                  Delivery Status
                </div>
                <div style={{ marginTop: "0.3rem" }}>
                  {renderStatusBadge(selectedCampaign, false)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-muted uppercase text-label">
                  Date
                </div>
                <div
                  className="font-medium text-secondary text-body-md"
                  style={{ marginTop: "0.3rem" }}
                >
                  {formatDate(selectedCampaign.createdAt)}
                </div>
              </div>
            </div>

            <div className="bg-card-elevated rounded-md p-4 border border-subtle">
              {selectedCampaign.imageUrl && (
                <img
                  src={selectedCampaign.imageUrl}
                  alt="Campaign banner"
                  className="w-full object-cover rounded-sm border border-subtle"
                  style={{ maxHeight: "180px", marginBottom: "0.8rem" }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              )}
              <h3
                className="font-bold text-primary text-title-sm"
                style={{ margin: "0 0 0.4rem 0" }}
              >
                {selectedCampaign.title || "Untitled Campaign"}
              </h3>
              <p
                className="m-0 text-secondary whitespace-pre-wrap text-body-lg"
                style={{ lineHeight: 1.5 }}
              >
                {selectedCampaign.body || "No message content."}
              </p>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "0.8rem",
              }}
            >
              <div
                className="rounded-md bg-card border border-subtle"
                style={{ padding: "0.8rem 0.95rem" }}
              >
                <div className="font-bold text-muted uppercase text-caption">
                  Target Audience
                </div>
                <div className="mt-tight">
                  {renderAudienceBadge(selectedCampaign)}
                </div>
              </div>

              <div
                className="rounded-md bg-card border border-subtle"
                style={{ padding: "0.8rem 0.95rem" }}
              >
                <div className="font-bold text-muted uppercase text-caption">
                  Total Recipients
                </div>
                <div
                  className="font-bold text-primary mt-compact"
                  style={{ fontSize: "1.1rem" }}
                >
                  {getRecipientCount(selectedCampaign).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Notification Status Breakdown */}
            <div
              className="grid gap-3 rounded-md bg-card-elevated border border-subtle text-center"
              style={{
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                padding: "0.9rem",
              }}
            >
              <div>
                <span
                  className="font-bold text-caption"
                  style={{ color: BLUE_TEXT }}
                >
                  SENT
                </span>
                <div
                  className="font-bold text-title-lg"
                  style={{ color: BLUE_TEXT, marginTop: "0.18rem" }}
                >
                  {getRecipientCount(selectedCampaign).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-success font-bold text-caption">
                  DELIVERED
                </span>
                <div
                  className="font-bold text-success text-title-lg"
                  style={{ marginTop: "0.18rem" }}
                >
                  {(selectedCampaign.successCount ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-danger font-bold text-caption">
                  FAILED
                </span>
                <div
                  className="font-bold text-danger text-title-lg"
                  style={{ marginTop: "0.18rem" }}
                >
                  {(selectedCampaign.failureCount ?? 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* MODAL: SEND TEST NOTIFICATION */}
      <Modal
        isOpen={isTestPushOpen}
        onClose={() => setIsTestPushOpen(false)}
        title="Send Test Notification"
        subtitle="Verify Firebase Cloud Messaging delivery to a device before broadcasting"
        size="sm"
        maxWidth="500px"
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsTestPushOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              leftIcon={<Send size={14} />}
              onClick={handleSendTestPush}
              disabled={!testPhoneOrToken.trim() || sendingTest}
              loading={sendingTest}
            >
              {sendingTest ? "Sending..." : "Send Test Notification"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col" style={{ gap: "0.9rem" }}>
          <Input
            id="test-target"
            label="Phone Number or FCM Device Token"
            required
            placeholder="e.g. +91 98765 43210 or FCM token"
            value={testPhoneOrToken}
            onChange={(e) => setTestPhoneOrToken(e.target.value)}
          />

          <Input
            id="test-title"
            label="Notification Title"
            placeholder="AdhocX Test Notification"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
          />

          <Textarea
            id="test-body"
            label="Notification Message"
            rows={3}
            placeholder="This is a live test notification from AdhocX."
            value={testBody}
            onChange={(e) => setTestBody(e.target.value)}
          />

          <Input
            id="test-image"
            type="url"
            label="Optional Image URL"
            placeholder="https://example.com/banner.jpg"
            value={testImageUrl}
            onChange={(e) => setTestImageUrl(e.target.value)}
          />
        </div>
      </Modal>

      {/* CONFIRMATION DIALOG: BROADCAST */}
      <ConfirmDialog
        isOpen={isConfirmBroadcastOpen}
        onClose={() => setIsConfirmBroadcastOpen(false)}
        onConfirm={handleBroadcastPush}
        title="Confirm Notification Broadcast"
        description="This will immediately dispatch a push notification via Firebase Cloud Messaging to the selected audience."
        confirmLabel={submitting ? "Sending..." : "Confirm & Send"}
        variant="confirm"
        isLoading={submitting}
        details={
          <div className="flex flex-col" style={{ gap: "0.38rem" }}>
            <div>
              <strong>Target Audience: </strong>
              <span className="font-semibold" style={{ color: BLUE_TEXT }}>
                {getAudienceLabelForConfirm()}
              </span>
            </div>
            <div>
              <strong>Estimated Reach: </strong>
              <span>
                {audienceEstimate.matchingUsers} user(s) (
                {audienceEstimate.matchingDevices} active device(s))
              </span>
            </div>
            <div>
              <strong>Title: </strong>
              <span>{title}</span>
            </div>
          </div>
        }
      />
    </div>
  );
}
