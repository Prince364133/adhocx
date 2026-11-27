'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ChevronRight,
  MapPin,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  Truck,
  Radio,
  LifeBuoy,
  Users,
  LayoutDashboard,
  Route,
} from 'lucide-react';
import { opsApi } from '../../lib/api/opsClient';
import { CorporateTenantOption } from '../../lib/api/opsTypes';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

type SidebarPanel = 'operations' | 'safety' | 'company';

type CompanyNavKey = 'routes' | 'map' | 'manual' | 'employees' | 'optimizer';

interface SafetySubNavItem {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface CompanySubNavItem {
  key: CompanyNavKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  featured?: boolean;
}

const COMPANY_STORAGE_KEY = 'adhocx_ops_selected_tenant';

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Company Hub',
    icon: <Building2 size={18} />,
  },
];

const OPERATIONS_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Command Dashboard',
    icon: <LayoutDashboard size={18} />,
  },
  {
    href: '/live',
    label: 'Live Operations',
    icon: <Radio size={18} />,
    badge: 'LIVE',
  },
  {
    href: '/drivers',
    label: 'Drivers',
    icon: <Users size={18} />,
  },
  {
    href: '/safety',
    label: 'Safety & Incidents',
    icon: <ShieldAlert size={18} />,
    badgeColor: '#DC2626',
  },
  {
    href: '/support',
    label: 'Support Tickets',
    icon: <LifeBuoy size={18} />,
  },
  {
    href: '/assignments',
    label: 'Assignments',
    icon: <Truck size={18} />,
  },
  {
    href: '/test-optimization',
    label: 'Test Optimization',
    icon: <Route size={18} />,
    badge: 'LAB',
    badgeColor: '#16A34A',
  },
];

const SAFETY_SUB_ITEMS: SafetySubNavItem[] = [
  {
    href: '/safety',
    label: 'Safety Overview',
    description: 'Alerts, incidents & metrics',
    icon: <Shield size={17} />,
  },
  {
    href: '/safety/cockpit',
    label: 'SOS Cockpit',
    description: 'Live crisis response center',
    icon: <AlertTriangle size={17} />,
  },
];

const COMPANY_SUB_ITEMS: CompanySubNavItem[] = [
  {
    key: 'routes',
    label: 'Routes & Trips',
    description: 'Scoped routes & manifests',
    icon: <Route size={17} />,
  },
  {
    key: 'map',
    label: 'Fleet Live Map',
    description: 'Real-time vehicle tracking',
    icon: <MapPin size={17} />,
  },
  {
    key: 'manual',
    label: 'Create Manual Route',
    description: 'Custom cab & stop builder',
    icon: <Plus size={17} />,
  },
  {
    key: 'employees',
    label: 'Employees',
    description: 'Commuters & office hubs',
    icon: <Users size={17} />,
  },
  {
    key: 'optimizer',
    label: 'Open Route Optimizer',
    description: 'AI shift & fleet planner',
    icon: <Sparkles size={17} />,
    featured: true,
  },
];

function isSafetyPath(pathname: string): boolean {
  return pathname === '/safety' || pathname.startsWith('/safety/');
}

function isCompanyWorkspacePath(pathname: string): boolean {
  return (
    pathname === '/routes' ||
    pathname.startsWith('/routes/') ||
    pathname === '/map' ||
    pathname.startsWith('/map/') ||
    pathname === '/employees' ||
    pathname.startsWith('/employees/') ||
    pathname === '/planner' ||
    pathname.startsWith('/planner/')
  );
}

function resolveSidebarPanel(pathname: string): SidebarPanel {
  if (isSafetyPath(pathname)) return 'safety';
  if (isCompanyWorkspacePath(pathname)) return 'company';
  return 'operations';
}

function resolveSafetyActiveHref(pathname: string): string {
  if (pathname === '/safety/cockpit' || pathname.startsWith('/safety/cockpit/')) {
    return '/safety/cockpit';
  }
  return '/safety';
}

function resolveCompanyNavKey(pathname: string, searchTab?: string): CompanyNavKey {
  if (pathname === '/map' || pathname.startsWith('/map/')) return 'map';
  if (pathname === '/employees' || pathname.startsWith('/employees/')) return 'employees';
  if (pathname === '/planner' || pathname.startsWith('/planner/')) {
    return searchTab === 'MANUAL' ? 'manual' : 'optimizer';
  }
  return 'routes';
}

function readStoredTenantId(): string {
  if (typeof window === 'undefined') return '';
  try {
    const urlTenant = new URLSearchParams(window.location.search).get('tenantId')?.trim();
    if (urlTenant) return urlTenant;
    return localStorage.getItem(COMPANY_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export const OpsSidebar: React.FC = () => {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>(() =>
    resolveSidebarPanel(pathname),
  );
  const [activeSafetyHref, setActiveSafetyHref] = useState<string>(() =>
    resolveSafetyActiveHref(pathname),
  );
  const [activeCompanyKey, setActiveCompanyKey] = useState<CompanyNavKey>(() =>
    resolveCompanyNavKey(pathname),
  );
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [companyInfo, setCompanyInfo] = useState<CorporateTenantOption | null>(null);
  const [routesRefreshing, setRoutesRefreshing] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  useEffect(() => {
    const syncRouteAndTenant = () => {
      setSidebarPanel(resolveSidebarPanel(pathname));
      if (isSafetyPath(pathname)) {
        setActiveSafetyHref(resolveSafetyActiveHref(pathname));
      }
      if (isCompanyWorkspacePath(pathname)) {
        const searchTab =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('tab')?.trim() || ''
            : '';
        setActiveCompanyKey(resolveCompanyNavKey(pathname, searchTab));
      }
      setSelectedTenantId(readStoredTenantId());
    };

    syncRouteAndTenant();
    window.addEventListener('adhocx:ops-tenant-changed', syncRouteAndTenant);
    window.addEventListener('popstate', syncRouteAndTenant);
    return () => {
      window.removeEventListener('adhocx:ops-tenant-changed', syncRouteAndTenant);
      window.removeEventListener('popstate', syncRouteAndTenant);
    };
  }, [pathname]);

  useEffect(() => {
    const handleRoutesLoading = (event: Event) => {
      const detail = (event as CustomEvent<{ loading?: boolean }>).detail;
      if (typeof detail?.loading === 'boolean') {
        setRoutesRefreshing(detail.loading);
      }
    };
    window.addEventListener('adhocx:ops-routes-loading', handleRoutesLoading);
    return () => window.removeEventListener('adhocx:ops-routes-loading', handleRoutesLoading);
  }, []);

  useEffect(() => {
    if (sidebarPanel !== 'company' || !selectedTenantId) {
      if (!selectedTenantId) setCompanyInfo(null);
      return;
    }

    let cancelled = false;
    void opsApi
      .getTenant(selectedTenantId)
      .then((res) => {
        if (!cancelled) setCompanyInfo(res);
      })
      .catch(() => {
        if (!cancelled) setCompanyInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [sidebarPanel, selectedTenantId]);

  const activeSafetyItem =
    SAFETY_SUB_ITEMS.find((item) => item.href === activeSafetyHref) ?? SAFETY_SUB_ITEMS[0];

  const activeCompanyItem =
    COMPANY_SUB_ITEMS.find((item) => item.key === activeCompanyKey) ?? COMPANY_SUB_ITEMS[0];

  const getCompanyItemHref = (key: CompanyNavKey): string => {
    const tenantQuery = selectedTenantId
      ? `tenantId=${encodeURIComponent(selectedTenantId)}`
      : '';
    switch (key) {
      case 'map':
        return tenantQuery ? `/map?${tenantQuery}` : '/map';
      case 'manual':
        return tenantQuery ? `/planner?${tenantQuery}&tab=MANUAL` : '/planner?tab=MANUAL';
      case 'employees':
        return tenantQuery ? `/employees?${tenantQuery}` : '/employees';
      case 'optimizer':
        return tenantQuery ? `/planner?${tenantQuery}` : '/planner';
      case 'routes':
      default:
        return tenantQuery ? `/routes?${tenantQuery}` : '/routes';
    }
  };

  const handleCompanyRefresh = () => {
    if (pathname === '/routes') {
      setRoutesRefreshing(true);
      window.dispatchEvent(new CustomEvent('adhocx:ops-routes-refresh'));
      return;
    }
    setRoutesRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRoutesRefreshing(false), 450);
  };

  const renderNavItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== '/' && pathname.startsWith(`${item.href}/`));
    const isSafetyEntry = item.href === '/safety';
    const isHovered = hoveredKey === `op:${item.href}`;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          if (isSafetyEntry) {
            setSidebarPanel('safety');
            setActiveSafetyHref('/safety');
          }
        }}
        onMouseEnter={() => setHoveredKey(`op:${item.href}`)}
        onMouseLeave={() => setHoveredKey((prev) => (prev === `op:${item.href}` ? null : prev))}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md, 8px)',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: isActive ? 600 : 500,
          color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
          backgroundColor: isActive
            ? 'var(--brand-blue-500, #5728B2)'
            : isHovered
              ? 'var(--bg-surface-hover)'
              : 'transparent',
          transition: 'all 0.15s ease-in-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: isActive ? '#FFFFFF' : 'var(--brand-blue-500, #5728B2)', display: 'flex' }}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {item.badge && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: item.badgeColor
                  ? `rgba(${item.badgeColor === '#DC2626' ? '220, 38, 38' : '22, 163, 74'}, 0.15)`
                  : isActive
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'var(--bg-surface-muted)',
                color: item.badgeColor || (isActive ? '#FFFFFF' : 'var(--text-secondary)'),
              }}
            >
              {item.badge}
            </span>
          )}
          {isSafetyEntry && (
            <ChevronRight
              size={14}
              style={{ color: isActive ? '#FFFFFF' : 'var(--text-muted)', flexShrink: 0 }}
            />
          )}
        </div>
      </Link>
    );
  };

  const renderSafetySubItem = (item: SafetySubNavItem) => {
    const isActive = activeSafetyHref === item.href;
    const isHovered = hoveredKey === `safety:${item.href}`;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => setActiveSafetyHref(item.href)}
        onMouseEnter={() => setHoveredKey(`safety:${item.href}`)}
        onMouseLeave={() => setHoveredKey((prev) => (prev === `safety:${item.href}` ? null : prev))}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '11px 12px',
          borderRadius: '12px',
          textDecoration: 'none',
          background: isActive
            ? 'linear-gradient(135deg, #6232C4 0%, #5728B2 100%)'
            : isHovered
              ? 'var(--bg-surface-hover)'
              : 'transparent',
          color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
          boxShadow: isActive ? '0 6px 14px -4px rgba(87, 40, 178, 0.35)' : 'none',
          transition: 'all 0.15s ease-in-out',
        }}
      >
        <span
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            backgroundColor: isActive
              ? 'rgba(255, 255, 255, 0.16)'
              : 'var(--brand-primary-subtle)',
            color: isActive ? '#FFFFFF' : 'var(--brand-blue-500, #5728B2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background-color 0.15s ease-in-out, color 0.15s ease-in-out',
          }}
        >
          {item.icon}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '13.5px',
              fontWeight: 600,
              lineHeight: 1.25,
              color: isActive ? '#FFFFFF' : 'var(--text-primary)',
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              fontSize: '11.5px',
              lineHeight: 1.3,
              marginTop: '2px',
              color: isActive ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.description}
          </div>
        </div>
      </Link>
    );
  };

  const renderCompanySubItem = (item: CompanySubNavItem) => {
    const isActive = activeCompanyKey === item.key;
    const isHovered = hoveredKey === `company:${item.key}`;
    const href = getCompanyItemHref(item.key);

    return (
      <Link
        key={item.key}
        href={href}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => setActiveCompanyKey(item.key)}
        onMouseEnter={() => setHoveredKey(`company:${item.key}`)}
        onMouseLeave={() => setHoveredKey((prev) => (prev === `company:${item.key}` ? null : prev))}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
          padding: '9px 11px',
          borderRadius: '11px',
          textDecoration: 'none',
          border: isActive
            ? '1px solid transparent'
            : item.featured
              ? '1px solid var(--color-info-border, rgba(87, 40, 178, 0.24))'
              : '1px solid transparent',
          background: isActive
            ? 'linear-gradient(135deg, #6232C4 0%, #5728B2 100%)'
            : item.featured
              ? isHovered
                ? 'rgba(87, 40, 178, 0.14)'
                : 'var(--brand-primary-subtle)'
              : isHovered
                ? 'var(--bg-surface-hover)'
                : 'transparent',
          color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
          boxShadow: isActive ? '0 6px 14px -4px rgba(87, 40, 178, 0.35)' : 'none',
          transition: 'all 0.15s ease-in-out',
        }}
      >
        <span
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            backgroundColor: isActive
              ? 'rgba(255, 255, 255, 0.16)'
              : item.featured
                ? 'var(--bg-surface)'
                : 'var(--brand-primary-subtle)',
            color: isActive ? '#FFFFFF' : 'var(--brand-blue-500, #5728B2)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background-color 0.15s ease-in-out, color 0.15s ease-in-out',
          }}
        >
          {item.icon}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              lineHeight: 1.25,
              color: isActive
                ? '#FFFFFF'
                : item.featured
                  ? 'var(--brand-blue-500, #5728B2)'
                  : 'var(--text-primary)',
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              fontSize: '11px',
              lineHeight: 1.3,
              marginTop: '1px',
              color: isActive ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {item.description}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <aside
      aria-label="Operations Navigation Sidebar"
      style={{
        width: '240px',
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        height: 'calc(100vh - 56px)',
        position: 'sticky',
        top: '56px',
        transition: 'background-color 0.2s, border-color 0.2s',
      }}
    >
      {/* Navigation Links */}
      <div style={{ padding: 'var(--space-4, 16px) var(--space-3, 12px)', overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {sidebarPanel === 'safety' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Back Navigation */}
            <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setSidebarPanel('operations')}
                onMouseEnter={() => setHoveredKey('safety:back')}
                onMouseLeave={() => setHoveredKey((prev) => (prev === 'safety:back' ? null : prev))}
                aria-label="Back to Corporate Operations menu"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  borderRadius: '10px',
                  border: `1px solid ${hoveredKey === 'safety:back' ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                  backgroundColor:
                    hoveredKey === 'safety:back' ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                  boxShadow: 'var(--shadow-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                  WebkitFontSmoothing: 'antialiased',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '7px',
                    backgroundColor: 'var(--bg-surface-muted)',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transform: hoveredKey === 'safety:back' ? 'translateX(-2px)' : 'translateX(0)',
                    transition: 'transform 0.15s ease-in-out',
                  }}
                >
                  <ArrowLeft size={14} />
                </span>
                <span>Back to Operations</span>
              </button>
            </div>

            {/* Active Module Context Header */}
            <div
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--brand-primary-subtle) 0%, var(--bg-surface-muted) 100%)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
              }}
            >
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--color-danger-border, rgba(220, 38, 38, 0.25))',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-danger, #DC2626)',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={18} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.25,
                    letterSpacing: '-0.01em',
                  }}
                >
                  Safety &amp; Incidents
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '3px',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--brand-blue-500, #5728B2)',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {activeSafetyItem.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Safety Sub-Navigation */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  padding: '0 4px',
                  marginBottom: '10px',
                }}
              >
                SAFETY WORKSPACE
              </div>
              <nav aria-label="Safety & Incidents navigation" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {SAFETY_SUB_ITEMS.map(renderSafetySubItem)}
              </nav>
            </div>
          </div>
        ) : sidebarPanel === 'company' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Back to Company Hub */}
            <div style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
              <Link
                href="/"
                onClick={() => setSidebarPanel('operations')}
                onMouseEnter={() => setHoveredKey('company:back')}
                onMouseLeave={() => setHoveredKey((prev) => (prev === 'company:back' ? null : prev))}
                aria-label="Back to Company Hub"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '7px 10px',
                  borderRadius: '10px',
                  border: `1px solid ${hoveredKey === 'company:back' ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                  backgroundColor:
                    hoveredKey === 'company:back' ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
                  boxShadow: 'var(--shadow-sm)',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontFamily: 'inherit',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '7px',
                    backgroundColor: 'var(--bg-surface-muted)',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transform: hoveredKey === 'company:back' ? 'translateX(-2px)' : 'translateX(0)',
                    transition: 'transform 0.15s ease-in-out',
                  }}
                >
                  <ArrowLeft size={14} />
                </span>
                <span>Company Hub</span>
              </Link>
            </div>

            {/* Active Company Context Header */}
            <div
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--brand-primary-subtle) 0%, var(--bg-surface-muted) 100%)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
              }}
            >
              <span
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-blue-500, #5728B2)',
                  flexShrink: 0,
                }}
              >
                <Building2 size={18} />
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  title={companyInfo?.name || 'Selected Company'}
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.25,
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {companyInfo?.name || 'Selected Company'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '3px',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: 'var(--brand-blue-500, #5728B2)',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {companyInfo?.code
                      ? `${companyInfo.code} · ${activeCompanyItem.label}`
                      : activeCompanyItem.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Company Routes & Tools */}
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  padding: '0 4px',
                  marginBottom: '8px',
                }}
              >
                COMPANY WORKSPACE
              </div>
              <nav aria-label="Company Routes navigation" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {COMPANY_SUB_ITEMS.map(renderCompanySubItem)}
              </nav>
            </div>

            {/* Quick Sync Action */}
            <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={handleCompanyRefresh}
                disabled={routesRefreshing}
                onMouseEnter={() => setHoveredKey('company:refresh')}
                onMouseLeave={() => setHoveredKey((prev) => (prev === 'company:refresh' ? null : prev))}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '11px',
                  padding: '9px 11px',
                  borderRadius: '11px',
                  border: `1px solid ${hoveredKey === 'company:refresh' ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
                  backgroundColor:
                    hoveredKey === 'company:refresh' ? 'var(--bg-surface-hover)' : 'var(--bg-surface-muted)',
                  color: 'var(--text-primary)',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: routesRefreshing ? 'wait' : 'pointer',
                  opacity: routesRefreshing ? 0.75 : 1,
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <RefreshCw
                    size={15}
                    style={{
                      transform: routesRefreshing ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.4s ease',
                    }}
                  />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.25 }}>
                    {routesRefreshing ? 'Refreshing...' : 'Refresh'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                    Sync latest route feed
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0 8px',
                marginBottom: '8px',
              }}
            >
              CORPORATE OPERATIONS
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              {OPERATIONS_ITEMS.map(renderNavItem)}
            </nav>

            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0 8px',
                marginBottom: '8px',
              }}
            >
              TACTICAL AIR-TRAFFIC
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {NAV_ITEMS.map(renderNavItem)}
            </nav>
          </>
        )}
      </div>

      {/* Bottom Switcher: Jump to Super Admin Finance/Governance (only when configured) */}
      {process.env.NEXT_PUBLIC_ADMIN_URL?.trim() && (
        <div
          style={{
            padding: 'var(--space-4, 16px) var(--space-3, 12px)',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-muted)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
            GOVERNANCE &amp; FINANCE
          </div>
          <a
            href={process.env.NEXT_PUBLIC_ADMIN_URL.trim()}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: 'var(--radius-md, 8px)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 500,
              transition: 'border-color 0.15s ease',
            }}
          >
            <span>Super Admin Portal</span>
            <ExternalLink size={14} />
          </a>
        </div>
      )}
    </aside>
  );
};
