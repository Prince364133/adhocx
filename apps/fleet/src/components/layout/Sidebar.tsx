'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type LucideIcon,
  LayoutDashboard,
  Users,
  Activity,
  Wallet,
  Target,
  CalendarClock,
  LifeBuoy,
  Bell,
  LogOut,
} from 'lucide-react';

interface FleetNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const SHIFTS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_FLEET_SHIFTS === 'true';

const FLEET_NAV_ITEMS: FleetNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/drivers', label: 'Driver Management', icon: Users },
  { href: '/live-operations', label: 'Live Operations', icon: Activity },
  { href: '/earnings', label: 'Earnings & Payouts', icon: Wallet },
  { href: '/incentives', label: 'Driver Incentives', icon: Target },
  ...(SHIFTS_ENABLED
    ? [{ href: '/shifts', label: 'Shift & Ride Management', icon: CalendarClock }]
    : []),
  { href: '/support', label: 'Support Center', icon: LifeBuoy },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

export const Sidebar: React.FC<{
  fleetName?: string;
  userRole?: string;
  unreadNotifications?: number;
  onRequestLogout: () => void;
}> = ({ fleetName, userRole, unreadNotifications = 0, onRequestLogout }) => {
  const pathname = usePathname();

  return (
    <aside className="fleet-sidebar" aria-label="Fleet Portal Navigation">
      <div>
        <div style={{ padding: '0.4rem 0.6rem 1rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
            AdhocX Fleet
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
            {fleetName || 'Fleet Operations Portal'}
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {FLEET_NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            const showUnreadBadge = item.href === '/notifications' && unreadNotifications > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`fleet-nav-link ${active ? 'is-active' : ''}`}
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                </span>
                {showUnreadBadge && (
                  <span
                    aria-label={`${unreadNotifications} unread notifications`}
                    style={{
                      minWidth: '20px',
                      height: '20px',
                      padding: '0 6px',
                      borderRadius: '9999px',
                      background: 'var(--brand-primary)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {userRole && (
          <div style={{ padding: '0 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Role: {userRole.replace(/_/g, ' ')}
          </div>
        )}
        <button
          type="button"
          onClick={onRequestLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--color-danger)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
