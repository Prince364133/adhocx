"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LucideIcon,
  LayoutDashboard,
  ShieldCheck,
  Car,
  CreditCard,
  WalletCards,
  Tag,
  Ticket,
  Newspaper,
  Headphones,
  Scale,
  FileText,
  BellRing,
  LogOut,
  Radio,
  ExternalLink,
  Building2,
  Sliders,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { AdhocxBrandLogo } from "./AdhocxBrandLogo";
import { ConfirmDialog } from "./common/ConfirmDialog";
import { adminApi, getStoredAdminUser } from "../lib/api/client";

interface NavSection {
  title?: string;
  items: {
    href: string;
    label: string;
    icon: LucideIcon;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "MARKETPLACE",
    items: [
      { href: "/companies", label: "Companies", icon: Building2 },
      {
        href: "/verifications",
        label: "Verification Center",
        icon: ShieldCheck,
      },
      { href: "/fleets", label: "Fleet List", icon: Truck },
      { href: "/drivers", label: "Driver Fleet", icon: Car },
      { href: "/users", label: "Vendors", icon: Building2 },
    ],
  },
  {
    title: "FINANCE & BILLING",
    items: [
      { href: "/settlements", label: "Settlements", icon: CreditCard },
      { href: "/pricing", label: "Pricing & Tariffs", icon: Tag },
    ],
  },
  {
    title: "SAFETY & EMERGENCY",
    items: [
      {
        href: "/safety/sos",
        label: "Emergency SOS",
        icon: ShieldAlert,
        badge: "P0",
      },
    ],
  },
  {
    title: "GROWTH & SUPPORT",
    items: [
      { href: "/support", label: "Support & Helpdesk", icon: Headphones },
      { href: "/disputes", label: "Disputes & Claims", icon: Scale },
      {
        href: "/notifications",
        label: "Push Notifications",
        icon: BellRing,
        badge: "FCM",
      },
      { href: "/coupons", label: "Coupons & Promos", icon: Ticket },
      { href: "/blogs", label: "Blog & Content", icon: Newspaper },
    ],
  },
  {
    title: "GOVERNANCE",
    items: [
      { href: "/feature-flags", label: "Feature Flags", icon: Sliders },
      { href: "/finance", label: "Finance", icon: WalletCards },
      { href: "/audit", label: "Audit Logs", icon: FileText },
    ],
  },
];

const OPS_PORTAL_URL =
  process.env.NEXT_PUBLIC_OPS_URL?.trim().replace(/\/+$/, "") || "";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = React.useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
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

  return (
    <aside
      className={`admin-sidebar ${isHovered ? "is-expanded" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Admin Navigation Sidebar"
    >
      {/* Brand Header */}
      <div className="sidebar-brand-header">
        {isHovered ? (
          <AdhocxBrandLogo size={26} subtitle="Control Portal" />
        ) : (
          <div style={{ transform: "scale(0.92)" }}>
            <AdhocxBrandLogo variant="icon" size={28} />
          </div>
        )}
      </div>

      {/* Scrollable Navigation Items */}
      <nav className="sidebar-nav-scrollable">
        {navSections.map((sec, sIdx) => (
          <div key={sIdx} className="sidebar-section-group">
            {sec.title &&
              (isHovered ? (
                <div className="sidebar-section-title">
                  {sec.title}
                </div>
              ) : (
                <div className="sidebar-section-divider" />
              ))}
            <div className="sidebar-items-list">
              {sec.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`sidebar-nav-item ${isActive ? "is-active" : ""}`}
                  >
                    <div className="sidebar-item-content">
                      <item.icon size={17} className="sidebar-item-icon" />
                      {isHovered && (
                        <span className="sidebar-item-label">
                          {item.label}
                        </span>
                      )}
                    </div>
                    {isHovered && item.badge && (
                      <span className="sidebar-badge">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Sticky/Fixed Wrapper */}
      <div className="sidebar-bottom-fixed-wrapper">
        {/* Tactical Fleet Flight Control Launcher */}
        {OPS_PORTAL_URL && (
          <div className="sidebar-fleet-container">
            <a
              href={OPS_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Tactical Fleet Operations"
              className="sidebar-fleet-btn"
            >
              <div className="sidebar-fleet-content">
                <Radio size={15} style={{ flexShrink: 0 }} />
                {isHovered && <span>Fleet Ops</span>}
              </div>
              {isHovered && <ExternalLink size={13} style={{ flexShrink: 0 }} />}
            </a>
          </div>
        )}

        {/* Administrative User & Logout Footer */}
        <div className="sidebar-bottom-fixed">
          <div
            className="sidebar-profile-card"
            title={
              !isHovered
                ? [
                    adminUser?.fullName || "Administrator",
                    adminUser?.email || adminUser?.phone,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : undefined
            }
          >
            <div className="sidebar-avatar">
              AD
            </div>
            {isHovered && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">
                  {adminUser?.fullName || "Administrator"}
                </span>
                {(adminUser?.email || adminUser?.phone) && (
                  <span className="sidebar-user-email">
                    {adminUser.email || adminUser.phone}
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            id="sidebar-logout-btn"
            onClick={() => setShowLogoutConfirm(true)}
            disabled={isLoggingOut}
            title={!isHovered ? "Log Out" : undefined}
            className="sidebar-logout-btn"
          >
            <LogOut size={16} />
            {isHovered && (
              <span>{isLoggingOut ? "Signing Out..." : "Log Out"}</span>
            )}
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
    </aside>
  );
};
