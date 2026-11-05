'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  Users,
  Building2,
  CalendarClock,
  Ticket,
  Navigation,
  ShieldAlert,
  LifeBuoy,
  Receipt,
  BarChart3,
  Settings,
  Search,
  Bell,
  HelpCircle,
  ChevronDown,
  LogOut,
  Building,
} from 'lucide-react';
import { SessionProvider, useSession } from '../../lib/auth/SessionContext';
import { CORPORATE_ROLE_LABELS, CorporatePermission } from '../../lib/auth/permissions';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { href: '/live', label: 'Live Operations', icon: <Radio size={18} />, badge: 'Live' },
  { href: '/employees', label: 'Employees', icon: <Users size={18} /> },
  { href: '/offices', label: 'Offices & Sites', icon: <Building2 size={18} /> },
  { href: '/rosters', label: 'Shifts & Rosters', icon: <CalendarClock size={18} /> },
  { href: '/bookings', label: 'Bookings', icon: <Ticket size={18} /> },
  { href: '/routes', label: 'Routes & Trips', icon: <Navigation size={18} /> },
  { href: '/safety', label: 'Safety & Incidents', icon: <ShieldAlert size={18} />, badge: 3 },
  { href: '/support', label: 'Support & SLA', icon: <LifeBuoy size={18} /> },
  { href: '/billing', label: 'Billing & Invoices', icon: <Receipt size={18} /> },
  { href: '/reports', label: 'Reports & Analytics', icon: <BarChart3 size={18} /> },
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
      }}
      className="hide-narrow"
    >
      <div>
        {/* Brand Label inside Sidebar */}
        <div style={{ padding: '0 8px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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
                  color: active ? '#FFFFFF' : '#94A3B8',
                  backgroundColor: active ? 'var(--sidebar-active-bg)' : 'transparent',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: active ? '#FFFFFF' : '#64748B', display: 'flex' }}>
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
                      backgroundColor: item.badge === 'Live' ? '#16A34A' : '#DC2626',
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
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '12px',
          color: '#94A3B8',
        }}
      >
        <div style={{ fontWeight: 600, color: '#FFFFFF', marginBottom: 2 }}>AdhocX ETS v2.0</div>
        <div style={{ fontSize: 11 }}>Hyderabad Enterprise Operations</div>
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
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        gap: 16,
      }}
    >
      {/* Left: Brand + Tenant Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #1167EE 0%, #0948AC 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 16,
              color: '#FFFFFF',
            }}
          >
            A
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em', color: '#0F172A' }}>
            Adhoc<span style={{ color: '#1167EE' }}>X</span>
          </span>
        </Link>

        <div style={{ height: 20, width: 1, backgroundColor: '#E2E8F0' }} />

        {/* Tenant Selector Dropdown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0F172A',
            cursor: 'pointer',
          }}
        >
          <Building size={14} color="#1167EE" />
          <span>{tenant?.name || 'HiTEC Technologies'}</span>
          <ChevronDown size={14} color="#64748B" />
        </div>
      </div>

      {/* Middle: Global Omnisearch */}
      <div style={{ flex: 1, maxWidth: 440, position: 'relative' }} className="hide-narrow">
        <Search
          size={15}
          color="#94A3B8"
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
            backgroundColor: '#F1F5F9',
            border: '1px solid transparent',
            borderRadius: '6px',
            fontSize: 13,
            color: '#0F172A',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = '#FFFFFF';
            e.target.style.borderColor = '#1167EE';
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = '#F1F5F9';
            e.target.style.borderColor = 'transparent';
          }}
        />
      </div>

      {/* Right: Actions, Alerts, User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Notification Bell with Badge */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={16} color="#475569" />
          </div>
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 17,
              height: 17,
              borderRadius: '50%',
              backgroundColor: '#DC2626',
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
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          title="Support & Guidelines"
        >
          <HelpCircle size={16} color="#475569" />
        </div>

        <div style={{ height: 20, width: 1, backgroundColor: '#E2E8F0' }} />

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
                backgroundColor: '#1E293B',
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
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                {user?.fullName || 'Rakesh Kumar'}
              </div>
              <div style={{ fontSize: 11, color: '#64748B' }}>
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
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                border: '1px solid #E2E8F0',
                padding: '6px',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{user?.fullName}</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>{user?.email}</div>
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
                  color: '#DC2626',
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
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
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
