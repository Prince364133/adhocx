'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  LifeBuoy,
  LogOut,
  Navigation,
  Receipt,
  ShieldAlert,
  Users,
  UserCog,
  Scale,
  Radio,
} from 'lucide-react';
import { SessionProvider, useSession } from '../../lib/auth/SessionContext';
import { CORPORATE_ROLE_LABELS, CorporatePermission } from '../../lib/auth/permissions';
import { clearSession } from '../../lib/auth/session';
import { LoadingState, UnauthorizedState } from '../common/StateViews';
import { Button } from '../common/Button';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Closest corporate permission for the screen; the item is hidden without it. */
  permission: CorporatePermission;
}

const NAV: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: 'Overview',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: <BarChart3 size={18} />, permission: 'reports:read' }],
  },
  {
    heading: 'People & demand',
    items: [
      { href: '/employees', label: 'Employees', icon: <Users size={18} />, permission: 'employees:read' },
      { href: '/rosters', label: 'Rosters', icon: <FileSpreadsheet size={18} />, permission: 'rosters:read' },
      { href: '/rosters/shifts', label: 'Shifts & holidays', icon: <CalendarClock size={18} />, permission: 'shifts:read' },
    ],
  },
  {
    heading: 'Operations',
    items: [
      { href: '/routes', label: 'Routes', icon: <Navigation size={18} />, permission: 'routes:read' },
      { href: '/routes/live', label: 'Live trips', icon: <Radio size={18} />, permission: 'routes:read' },
      { href: '/reports', label: 'Attendance & reports', icon: <ClipboardList size={18} />, permission: 'reports:read' },
    ],
  },
  {
    heading: 'Safety & support',
    items: [
      { href: '/safety', label: 'SOS alerts', icon: <ShieldAlert size={18} />, permission: 'safety:read' },
      { href: '/support', label: 'Support tickets', icon: <LifeBuoy size={18} />, permission: 'tenant:read' },
    ],
  },
  {
    heading: 'Billing',
    items: [
      { href: '/billing/invoices', label: 'Invoices', icon: <Receipt size={18} />, permission: 'invoices:read' },
      { href: '/billing/disputes', label: 'Disputes & credits', icon: <Scale size={18} />, permission: 'invoices:read' },
      { href: '/billing/rate-card', label: 'Rate card', icon: <FileText size={18} />, permission: 'invoices:read' },
    ],
  },
  {
    heading: 'Administration',
    items: [{ href: '/settings/users', label: 'Users & roles', icon: <UserCog size={18} />, permission: 'users:read' }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  // /rosters/shifts and /routes/live are their own nav items; don't highlight the parent for them.
  if (href === '/rosters' && pathname.startsWith('/rosters/shifts')) return false;
  if (href === '/routes' && pathname.startsWith('/routes/live')) return false;
  return pathname.startsWith(href + '/');
}

function Sidebar() {
  const pathname = usePathname() ?? '';
  const { can } = useSession();
  return (
    <aside
      style={{
        width: 240,
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        flexShrink: 0,
        height: 'calc(100vh - 56px)',
        position: 'sticky',
        top: 56,
        overflowY: 'auto',
        padding: 'var(--space-4) var(--space-3)',
      }}
      className="hide-narrow"
    >
      {NAV.map((group) => {
        const items = group.items.filter((i) => can(i.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.heading} style={{ marginBottom: 'var(--space-4)' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '0 8px',
                marginBottom: 6,
              }}
            >
              {group.heading}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      color: active ? '#FFFFFF' : 'var(--text-secondary)',
                      backgroundColor: active ? 'var(--brand-blue-500)' : 'transparent',
                    }}
                  >
                    <span style={{ color: active ? '#FFFFFF' : 'var(--brand-blue-400)', display: 'flex' }}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        );
      })}
    </aside>
  );
}

function TopBar() {
  const { tenant, user, corporateRole, officeScope, offices, logout } = useSession();
  const scopeLabel = officeScope
    ? offices
        .filter((o) => officeScope.includes(o.id))
        .map((o) => o.code)
        .join(', ') || `${officeScope.length} office(s)`
    : 'All offices';
  return (
    <header
      style={{
        height: 56,
        backgroundColor: 'var(--bg-surface-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-5)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #1167EE 0%, #0948AC 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: 15,
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          A
        </div>
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
          ADHOCX <span style={{ color: 'var(--brand-amber-500)' }}>CORPORATE</span>
        </span>
        <div style={{ height: 20, width: 1, backgroundColor: 'var(--border-strong)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, minWidth: 0 }}>
          <Building2 size={14} color="var(--brand-blue-400)" />
          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tenant ? tenant.name : '…'}
          </span>
          {tenant && <span className="code-tag">{tenant.code}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'right', lineHeight: 1.25 }} className="hide-narrow">
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.fullName || user?.email || user?.phone || 'Signed in'}</div>
          <div style={{ fontSize: 11 }} className="muted">
            {corporateRole ? CORPORATE_ROLE_LABELS[corporateRole] : '—'} · {scopeLabel}
          </div>
        </div>
        <Button variant="outline" size="sm" leftIcon={<LogOut size={13} />} onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    </header>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const pathname = usePathname() ?? '';
  const onLogin = pathname.startsWith('/login');

  useEffect(() => {
    if (!onLogin && session.status === 'anonymous') {
      clearSession();
      window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
    }
  }, [onLogin, session.status, pathname]);

  if (onLogin) return <>{children}</>;

  if (session.status === 'loading' || session.status === 'anonymous') {
    return (
      <div style={{ padding: 48 }}>
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  if (session.status === 'forbidden') {
    return (
      <div style={{ padding: 48, maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <UnauthorizedState message="This portal is for corporate client users (Corporate Admin / Manager) linked to a corporate tenant. Your account is not." />
        <div style={{ textAlign: 'center' }}>
          <Button variant="outline" onClick={() => void session.logout()}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, padding: 'var(--space-6) var(--space-8)' }}>{children}</main>
      </div>
    </div>
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Gate>{children}</Gate>
    </SessionProvider>
  );
}

/** Wraps a page that needs a permission: renders the unauthorized state instead of calling the API. */
export function RequirePermission({ permission, children }: { permission: CorporatePermission; children: React.ReactNode }) {
  const { can } = useSession();
  if (!can(permission)) return <UnauthorizedState />;
  return <>{children}</>;
}
