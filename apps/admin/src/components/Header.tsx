"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CheckCheck, ExternalLink, X, Send, LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { ConfirmDialog } from "./common/ConfirmDialog";
import { adminApi, getStoredAdminUser } from "../lib/api/client";
import { InAppNotificationItem } from "../lib/api/types";

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const pathname = usePathname();
  const router = useRouter();

  // Admin user & session state
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>(
    [],
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getSectionTitle = () => {
    if (title) return title;
    if (pathname.startsWith("/dashboard")) return "Marketplace Overview";
    if (pathname.startsWith("/notifications"))
      return "Push Notifications & Campaign Hub";
    if (pathname.startsWith("/verifications")) return "Verification Center";
    if (pathname.startsWith("/drivers")) return "Driver Fleet Management";
    if (pathname.startsWith("/users")) return "Users & Corporate Vendors";
    if (pathname.startsWith("/requirements")) return "Requirements & Sourcing";
    if (pathname.startsWith("/assignments")) return "Assignment Operations";
    if (pathname.startsWith("/trips")) return "Trips & Telemetry Tracking";
    if (pathname.startsWith("/coupons")) return "Coupons & Promotions";
    if (pathname.startsWith("/blogs")) return "Blog CMS Publisher";
    if (pathname.startsWith("/settlements"))
      return "Financial Settlements & Payouts";
    if (pathname.startsWith("/finance"))
      return "Finance & Accounting Operations";
    if (pathname.startsWith("/reports"))
      return "Finance & Accounting Operations";
    if (pathname.startsWith("/feature-flags"))
      return "Feature Flags & Platform Controls";
    if (pathname.startsWith("/pricing")) return "Pricing Engine & Tariffs";
    if (pathname.startsWith("/payments")) return "Payments & Escrow Balances";
    if (pathname.startsWith("/audit")) return "Audit Logs & Compliance";
    if (pathname.startsWith("/disputes")) return "Dispute Resolution Desk";
    if (pathname.startsWith("/support")) return "Support & Helpdesk";
    return "Control Portal";
  };

  useEffect(() => {
    const user = getStoredAdminUser();
    if (user) {
      setAdminUser(user);
    }
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await adminApi.logoutAdmin();
    } finally {
      router.replace("/login");
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      const data = await adminApi.getInAppNotifications({ limit: 8 });
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Graceful fallback in dev mode if notifications endpoint is pending
    }
  }

  async function handleMarkRead(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await adminApi.markInAppNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }

  async function handleMarkAllRead() {
    setLoading(true);
    try {
      await adminApi.markAllInAppNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  function handleNotificationClick(n: InAppNotificationItem) {
    if (!n.isRead) {
      adminApi.markInAppNotificationRead(n.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, isRead: true } : item,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    if (n.data?.actionUrl || n.data?.route) {
      const target = n.data.actionUrl || n.data.route;
      if (target.startsWith("http")) {
        window.open(target, "_blank");
      } else {
        router.push(target);
      }
      setIsOpen(false);
    }
  }

  return (
    <header className="admin-header relative" style={{ zIndex: 50 }}>
      <div className="flex items-center gap-3">
        <div>
          <h2
            className="text-title-md font-bold text-primary m-0"
            style={{ letterSpacing: "-0.015em" }}
          >
            {getSectionTitle()}
          </h2>
          {subtitle && (
            <p
              className="text-caption text-muted"
              style={{ margin: "0.12rem 0 0 0" }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="relative flex items-center justify-center rounded-md border cursor-pointer"
            style={{
              width: "28px",
              height: "28px",
              background: isOpen
                ? "var(--brand-primary-subtle)"
                : "var(--bg-surface-elevated)",
              color: isOpen ? "var(--text-brand)" : "var(--text-secondary)",
              transition: "all 0.2s ease",
            }}
            title="Notification Center"
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span
                className="absolute font-extrabold flex items-center justify-center"
                style={{
                  top: "-4px",
                  right: "-4px",
                  minWidth: "15px",
                  height: "15px",
                  padding: "0 3px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #ef4444, #f43f5e)",
                  color: "#ffffff",
                  fontSize: "0.6rem",
                  boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
                  border: "2px solid var(--bg-surface)",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Dropdown */}
          {isOpen && (
            <div
              className="animate-dropdown absolute right-0 bg-surface border rounded-xl shadow-elevated flex flex-col overflow-hidden"
              style={{
                top: "calc(100% + 8px)",
                width: "380px",
                maxWidth: "calc(100vw - 2rem)",
                maxHeight: "480px",
                zIndex: 100,
              }}
            >
              {/* Header */}
              <div
                className="border-b flex items-center justify-between bg-surface-elevated"
                style={{ padding: "0.85rem 1rem" }}
              >
                <div className="flex items-center gap-2">
                  <Bell size={16} color="var(--text-brand)" />
                  <span
                    className="font-bold text-primary"
                    style={{ fontSize: "0.88rem" }}
                  >
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      className="text-caption font-bold rounded-full bg-brand-subtle text-brand"
                      style={{ padding: "0.1rem 0.45rem" }}
                    >
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-compact">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={loading}
                      className="bg-transparent border-0 text-brand text-sm font-semibold cursor-pointer flex items-center gap-1 rounded-sm"
                      style={{ padding: "0.2rem 0.4rem" }}
                    >
                      <CheckCheck size={14} />
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="bg-transparent border-0 text-muted cursor-pointer"
                    style={{ padding: "0.2rem" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Feed List */}
              <div className="overflow-y-auto" style={{ maxHeight: "340px" }}>
                {notifications.length === 0 ? (
                  <div className="py-10 px-4 text-center text-muted">
                    <Bell
                      size={32}
                      style={{ margin: "0 auto 0.5rem", opacity: 0.3 }}
                    />
                    <p className="text-body font-medium m-0">
                      No notifications yet
                    </p>
                    <p className="text-sm mt-1 mr-0 mb-0 ml-0">
                      Real-time updates and dispatched alerts will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className="border-b cursor-pointer flex gap-3 items-start"
                      style={{
                        padding: "0.8rem 1rem",
                        background: n.isRead
                          ? "transparent"
                          : "rgba(var(--brand-indigo-rgb), 0.06)",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--bg-surface-elevated)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = n.isRead
                          ? "transparent"
                          : "rgba(var(--brand-indigo-rgb), 0.06)")
                      }
                    >
                      {/* Status Dot */}
                      <div className="mt-1">
                        {!n.isRead ? (
                          <div
                            className="rounded-full bg-brand"
                            style={{
                              width: "8px",
                              height: "8px",
                              boxShadow: "0 0 8px var(--text-brand)",
                            }}
                          />
                        ) : (
                          <div
                            className="rounded-full"
                            style={{
                              width: "8px",
                              height: "8px",
                              background: "var(--border)",
                            }}
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-body-md text-primary overflow-hidden text-ellipsis whitespace-nowrap"
                            style={{ fontWeight: n.isRead ? 600 : 700 }}
                          >
                            {n.title}
                          </span>
                          <span className="text-micro text-muted flex-shrink-0">
                            {n.createdAt
                              ? new Date(n.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>

                        <p
                          className="text-sm text-secondary mt-1 mr-0 mb-0 ml-0"
                          style={{ lineHeight: 1.4 }}
                        >
                          {n.body}
                        </p>

                        {(n.data?.route || n.data?.actionUrl) && (
                          <div className="inline-flex items-center gap-1 text-caption text-brand font-semibold mt-tight">
                            <span>Open</span>
                            <ExternalLink size={10} />
                          </div>
                        )}
                      </div>

                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkRead(n.id, e)}
                          title="Mark as read"
                          className="bg-transparent border-0 text-muted cursor-pointer"
                          style={{ padding: "0.2rem" }}
                        >
                          <CheckCheck size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div
                className="border-t bg-surface-elevated flex items-center justify-between"
                style={{ padding: "0.65rem 1rem" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push("/notifications");
                  }}
                  className="bg-transparent border-0 text-brand text-sm font-bold cursor-pointer flex items-center gap-tight"
                >
                  <Send size={12} />
                  <span>Open Push Campaign Hub</span>
                </button>

                <span className="text-micro text-muted">
                  FCM Service Active
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <ThemeToggle />

        {/* Live Cluster Status */}
        <div
          className="admin-header-status inline-flex items-center gap-tight bg-success-subtle rounded-full text-micro font-semibold text-success"
          style={{
            padding: "0.2rem 0.55rem",
            border: "1px solid var(--color-success-border)",
            letterSpacing: "0.01em",
          }}
          title="All systems operational — PostgreSQL, Redis, and Firebase FCM Engine Connected"
        >
          <span
            className="pulse-dot success"
            style={{ width: "5px", height: "5px" }}
          />
          <span>Operational</span>
        </div>

        {/* Admin Profile & Logout */}
        <div
          className="admin-header-profile flex items-center gap-2 border-l"
          style={{ paddingLeft: "0.45rem" }}
        >
          <div
            className="flex flex-col items-end"
            style={{ fontSize: "0.71rem", lineHeight: 1.25 }}
          >
            <span className="font-semibold text-primary">
              {adminUser?.fullName || "Administrator"}
            </span>
            <span
              className="text-brand font-semibold"
              style={{ fontSize: "0.64rem" }}
            >
              {adminUser?.email || "admin@adhocx.com"}
            </span>
          </div>

          <button
            type="button"
            id="admin-header-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            disabled={isLoggingOut}
            title="Sign Out of Admin Control Portal"
            className="inline-flex items-center justify-center rounded-md bg-danger-subtle text-danger text-label font-semibold"
            style={{
              gap: "0.3rem",
              padding: "0.3rem 0.62rem",
              border: "1px solid var(--color-danger-border)",
              cursor: isLoggingOut ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-danger)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-danger-bg)";
              e.currentTarget.style.color = "var(--color-danger)";
            }}
          >
            <LogOut size={12} />
            <span>{isLoggingOut ? "Signing Out..." : "Log Out"}</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out of AdhocX Admin?"
        description="You will be signed out of the current administrative session and redirected to the login screen."
        confirmLabel="Sign Out"
        variant="danger"
        isLoading={isLoggingOut}
      />
    </header>
  );
};
