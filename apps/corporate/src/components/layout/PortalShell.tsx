'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CalendarX,
  LifeBuoy,
  Receipt,
  BarChart3,
  Settings,
  Navigation,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  Building,
} from 'lucide-react';
import { SessionProvider, useSession } from '../../lib/auth/SessionContext';
import { CORPORATE_ROLE_LABELS, CorporatePermission } from '../../lib/auth/permissions';
import { ThemeToggle } from '../common/ThemeToggle';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { href: '/routes', label: 'Routes & Dispatch', icon: <Navigation size={18} /> },
  { href: '/employees', label: 'Employees', icon: <Users size={18} /> },
  { href: '/cancellations', label: 'Cancellation Requests', icon: <CalendarX size={18} /> },
  { href: '/support', label: 'Support & SLA', icon: <LifeBuoy size={18} /> },
  { href: '/billing', label: 'Billing & Invoices', icon: <Receipt size={18} /> },
  { href: '/reports', label: 'Reports & Analytics', icon: <BarChart3 size={18} /> },
  { href: '/dashboard/analytics', label: 'Transport Analytics', icon: <BarChart3 size={15} /> },
  { href: '/settings', label: 'Organization Settings', icon: <Settings size={18} /> },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  }
  if (pathname === href) return true;
  return pathname.startsWith(href + '/');
}

function Sidebar() {
  const pathname = usePathname() ?? '';

  return (
    <aside
      style={{
        width: 240,
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        flexShrink: 0,
        height: 'calc(100vh - 60px)',
        position: 'sticky',
        top: 60,
        overflowY: 'auto',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
      className="hide-narrow"
    >
      <div>
        {/* Brand Label inside Sidebar */}
        <div style={{ padding: '0 8px 16px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sidebar-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Corporate Portal
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
                  backgroundColor: active ? 'var(--sidebar-active-bg)' : 'transparent',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: active ? 'var(--sidebar-active-text)' : 'var(--text-muted)', display: 'flex' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: item.badge === 'Live' ? 'var(--color-success)' : 'var(--color-danger)',
                      color: '#FFFFFF',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Help Box */}
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-subtle)',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>AdhocX ETS v2.0</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hyderabad Enterprise Operations</div>
      </div>
    </aside>
  );
}

function TopBar() {
  const { tenant, user, corporateRole, logout } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header
      style={{
        height: 60,
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        gap: 16,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Left: Brand + Tenant Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img
            src="/adhocx_icon.svg"
            alt="AdhocX"
            style={{
              width: 30,
              height: 30,
              borderRadius: '6px',
              display: 'block',
            }}
          />
          <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Adhoc<span style={{ color: '#FF5F09', fontWeight: 900 }}>X</span>
          </span>
        </Link>

        <div style={{ height: 20, width: 1, backgroundColor: 'var(--border-subtle)' }} />

        {/* Tenant Selector Dropdown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <Building size={14} color="var(--brand-primary, #5728B2)" />
          <span>{tenant?.name || 'HiTEC Technologies'}</span>
          <ChevronDown size={14} color="var(--text-muted)" />
        </div>
      </div>

      {/* Middle: Global Omnisearch */}
      <div style={{ flex: 1, maxWidth: 440, position: 'relative' }} className="hide-narrow">
        <Search
          size={15}
          color="var(--text-muted)"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Search employees, trips, drivers..."
          style={{
            width: '100%',
            height: 36,
            paddingLeft: 36,
            paddingRight: 12,
            backgroundColor: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
            e.currentTarget.style.borderColor = 'var(--brand-primary, #5728B2)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(87, 40, 178, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface-muted)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Right: Actions, Alerts, ThemeToggle, User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Notification Bell with Badge */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface-muted)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={16} color="var(--text-secondary)" />
          </div>
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 17,
              height: 17,
              borderRadius: '50%',
              backgroundColor: 'var(--color-danger, #DC2626)',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            4
          </span>
        </div>

        {/* Help Center */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Support & Guidelines"
        >
          <HelpCircle size={16} color="var(--text-secondary)" />
        </div>

        {/* Theme Toggle (Light / Black & Gray Dark / System) */}
        <ThemeToggle />

        <div style={{ height: 20, width: 1, backgroundColor: 'var(--border-subtle)' }} />

        {/* User Initials Avatar & Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'var(--brand-primary, #5728B2)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              RK
            </div>
            <div className="hide-narrow" style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {user?.fullName || 'Rakesh Kumar'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {corporateRole ? CORPORATE_ROLE_LABELS[corporateRole] : 'Corporate Admin'}
              </div>
            </div>
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 48,
                width: 200,
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-elevated)',
                border: '1px solid var(--border-subtle)',
                padding: '6px',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <button
                onClick={() => void logout()}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--color-danger, #DC2626)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const onLogin = pathname.startsWith('/login');

  if (onLogin) {
    return <SessionProvider>{children}</SessionProvider>;
  }

  return (
    <SessionProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', transition: 'background-color 0.2s ease' }}>
        <TopBar />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar />
          <main style={{ flex: 1, minWidth: 0, padding: '24px 32px' }}>
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}

export function RequirePermission({
  permission: _p,
  children,
}: {
  permission: CorporatePermission;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
