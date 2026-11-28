"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  Truck,
  TrendingUp,
  BarChart3,
  Store,
  Wrench,
  ChevronRight,
  List,
} from "lucide-react";
import { AdhocxBrandLogo } from "./AdhocxBrandLogo";
import { ConfirmDialog } from "./common/ConfirmDialog";
import { adminApi, getStoredAdminUser } from "../lib/api/client";

interface NavChildItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  matchPath: string;
  matchContext?: string;
}

interface NavGroupItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
  children?: NavChildItem[];
}

const NAV_ITEMS: NavGroupItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    id: "finance",
    label: "Finance",
    icon: WalletCards,
    href: "/finance",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: TrendingUp,
    href: "/analytics",
  },
  {
    id: "drivers",
    label: "Drivers",
    icon: Car,
    children: [
      { href: "/drivers", label: "Driver List", icon: List, matchPath: "/drivers" },
      {
        href: "/verifications?context=driver",
        label: "Verification Center",
        icon: ShieldCheck,
        matchPath: "/verifications",
        matchContext: "driver",
      },
      {
        href: "/support?context=driver",
        label: "Support & Helpdesk",
        icon: Headphones,
        matchPath: "/support",
        matchContext: "driver",
      },
      {
        href: "/disputes?context=driver",
        label: "Disputes & Claims",
        icon: Scale,
        matchPath: "/disputes",
        matchContext: "driver",
      },
      {
        href: "/settlements?context=driver",
        label: "Settlement",
        icon: CreditCard,
        matchPath: "/settlements",
        matchContext: "driver",
      },
      {
        href: "/business-insights?context=driver",
        label: "Business Insights",
        icon: BarChart3,
        matchPath: "/business-insights",
        matchContext: "driver",
      },
    ],
  },
  {
    id: "fleet",
    label: "Fleet",
    icon: Truck,
    children: [
      { href: "/fleets", label: "Fleet List", icon: List, matchPath: "/fleets" },
      {
        href: "/verifications?context=fleet",
        label: "Verification Center",
        icon: ShieldCheck,
        matchPath: "/verifications",
        matchContext: "fleet",
      },
      {
        href: "/support?context=fleet",
        label: "Support & Helpdesk",
        icon: Headphones,
        matchPath: "/support",
        matchContext: "fleet",
      },
      {
        href: "/disputes?context=fleet",
        label: "Disputes & Claims",
        icon: Scale,
        matchPath: "/disputes",
        matchContext: "fleet",
      },
      {
        href: "/settlements?context=fleet",
        label: "Settlement",
        icon: CreditCard,
        matchPath: "/settlements",
        matchContext: "fleet",
      },
      {
        href: "/business-insights?context=fleet",
        label: "Business Insights",
        icon: BarChart3,
        matchPath: "/business-insights",
        matchContext: "fleet",
      },
    ],
  },
  {
    id: "vendors",
    label: "Vendors",
    icon: Store,
    children: [
      { href: "/vendors", label: "Vendor List", icon: List, matchPath: "/vendors" },
      {
        href: "/verifications?context=vendor",
        label: "Verification Center",
        icon: ShieldCheck,
        matchPath: "/verifications",
        matchContext: "vendor",
      },
      {
        href: "/support?context=vendor",
        label: "Support & Helpdesk",
        icon: Headphones,
        matchPath: "/support",
        matchContext: "vendor",
      },
      {
        href: "/disputes?context=vendor",
        label: "Disputes & Claims",
        icon: Scale,
        matchPath: "/disputes",
        matchContext: "vendor",
      },
      {
        href: "/business-insights?context=vendor",
        label: "Business Insights",
        icon: BarChart3,
        matchPath: "/business-insights",
        matchContext: "vendor",
      },
    ],
  },
  {
    id: "corporate",
    label: "Corporate",
    icon: Building2,
    children: [
      { href: "/companies", label: "Corporate List", icon: List, matchPath: "/companies" },
      {
        href: "/verifications?context=corporate",
        label: "Verification Center",
        icon: ShieldCheck,
        matchPath: "/verifications",
        matchContext: "corporate",
      },
      {
        href: "/support?context=corporate",
        label: "Support & Helpdesk",
        icon: Headphones,
        matchPath: "/support",
        matchContext: "corporate",
      },
      {
        href: "/disputes?context=corporate",
        label: "Disputes & Claims",
        icon: Scale,
        matchPath: "/disputes",
        matchContext: "corporate",
      },
      {
        href: "/business-insights?context=corporate",
        label: "Business Insights",
        icon: BarChart3,
        matchPath: "/business-insights",
        matchContext: "corporate",
      },
    ],
  },
  {
    id: "utilities",
    label: "Utilities",
    icon: Wrench,
    children: [
      { href: "/pricing", label: "Pricing & Tariff", icon: Tag, matchPath: "/pricing" },
      {
        href: "/notifications",
        label: "Push Notifications",
        icon: BellRing,
        badge: "FCM",
        matchPath: "/notifications",
      },
      { href: "/coupons", label: "Coupons", icon: Ticket, matchPath: "/coupons" },
      { href: "/blogs", label: "Blogs", icon: Newspaper, matchPath: "/blogs" },
      { href: "/feature-flags", label: "Feature Flags", icon: Sliders, matchPath: "/feature-flags" },
      { href: "/audit", label: "Audit Logs", icon: FileText, matchPath: "/audit" },
    ],
  },
];

const OPS_PORTAL_URL =
  process.env.NEXT_PUBLIC_OPS_URL?.trim().replace(/\/+$/, "") || "";

function isChildActive(
  child: NavChildItem,
  pathname: string,
  currentContext: string | null,
): boolean {
  const pathMatch =
    pathname === child.matchPath ||
    pathname.startsWith(`${child.matchPath}/`) ||
    (child.matchPath === "/vendors" && pathname.startsWith("/users"));

  if (!pathMatch) return false;
  if (child.matchContext) {
    return currentContext === child.matchContext;
  }
  return true;
}

const SidebarContent: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentContext = searchParams.get("context");

  const [adminUser, setAdminUser] = React.useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [hoveredGroup, setHoveredGroup] = React.useState<string | null>(null);
  const [pinnedGroup, setPinnedGroup] = React.useState<string | null>(null);

  React.useEffect(() => {
    const user = getStoredAdminUser();
    if (user) {
      setAdminUser(user);
    }
  }, []);

  const activeRouteGroupId = React.useMemo(() => {
    const activeGroup = NAV_ITEMS.find((item) =>
      item.children?.some((child) => isChildActive(child, pathname, currentContext)),
    );
    return activeGroup?.id ?? null;
  }, [pathname, currentContext]);

  const toggleGroup = (id: string) => {
    setPinnedGroup((prev) => (prev === id ? null : id));
  };

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
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredGroup(null);
        setPinnedGroup(null);
      }}
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
        <div className="sidebar-items-list">
          {NAV_ITEMS.map((item) => {
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const groupActive = hasChildren
              ? Boolean(
                  item.children?.some((child) =>
                    isChildActive(child, pathname, currentContext),
                  ),
                )
              : Boolean(
                  item.href &&
                    (pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(item.href))),
                );
            const isGroupExpanded =
              isHovered &&
              (hoveredGroup !== null
                ? hoveredGroup === item.id
                : pinnedGroup !== null
                  ? pinnedGroup === item.id
                  : activeRouteGroupId === item.id);

            if (!hasChildren && item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={item.label}
                  className={`sidebar-nav-item ${groupActive ? "is-active" : ""}`}
                >
                  <div className="sidebar-item-content">
                    <item.icon size={17} className="sidebar-item-icon" />
                    {isHovered && (
                      <span className="sidebar-item-label">{item.label}</span>
                    )}
                  </div>
                  {isHovered && item.badge && (
                    <span className="sidebar-badge">{item.badge}</span>
                  )}
                </Link>
              );
            }

            return (
              <div
                key={item.id}
                className="sidebar-group-wrapper"
                onMouseEnter={() => setHoveredGroup(item.id)}
                onMouseLeave={() =>
                  setHoveredGroup((prev) => (prev === item.id ? null : prev))
                }
              >
                <button
                  type="button"
                  title={item.label}
                  onClick={() => toggleGroup(item.id)}
                  aria-expanded={isGroupExpanded}
                  className={`sidebar-nav-item sidebar-group-btn ${groupActive ? "is-active" : ""}`}
                >
                  <div className="sidebar-item-content">
                    <item.icon size={17} className="sidebar-item-icon" />
                    {isHovered && (
                      <span className="sidebar-item-label">{item.label}</span>
                    )}
                  </div>
                  {isHovered && (
                    <span
                      className={`sidebar-chevron ${isGroupExpanded ? "is-open" : ""}`}
                    >
                      <ChevronRight size={14} />
                    </span>
                  )}
                </button>

                <div
                  className={`sidebar-submenu-collapse ${isGroupExpanded ? "is-open" : ""}`}
                >
                  <div className="sidebar-submenu-inner">
                    {item.children && (
                      <div className="sidebar-submenu">
                        {item.children.map((child) => {
                          const active = isChildActive(child, pathname, currentContext);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              title={child.label}
                              className={`sidebar-subitem ${active ? "is-active" : ""}`}
                            >
                              <div className="sidebar-item-content">
                                <child.icon size={14} className="sidebar-item-icon" />
                                <span className="sidebar-item-label">{child.label}</span>
                              </div>
                              {child.badge && (
                                <span className="sidebar-badge">{child.badge}</span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Bottom Sticky/Fixed Wrapper */}
      <div className="sidebar-bottom-fixed-wrapper">
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
            <div className="sidebar-avatar">AD</div>
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

export const Sidebar: React.FC = () => {
  return (
    <Suspense fallback={<aside className="admin-sidebar" aria-label="Admin Navigation Sidebar" />}>
      <SidebarContent />
    </Suspense>
  );
};
