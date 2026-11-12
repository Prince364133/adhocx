'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  ShieldAlert,
  ExternalLink,
  Truck,
  Radio,
  LifeBuoy,
  Users,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/',
    label: 'Company Hub',
    icon: <Building2 size={18} />,
  },
];

const OPERATIONS_ITEMS: NavItem[] = [
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
];

export const OpsSidebar: React.FC = () => {
  const pathname = usePathname();

  const renderNavItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== '/' && pathname.startsWith(`${item.href}/`));

    return (
      <Link
        key={item.href}
        href={item.href}
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
          backgroundColor: isActive ? 'var(--brand-blue-500, #5728B2)' : 'transparent',
          transition: 'all 0.15s ease-in-out',
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: isActive ? '#FFFFFF' : 'var(--brand-blue-500, #5728B2)' }}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </div>

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
      </Link>
    );
  };

  return (
    <aside
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
      <div style={{ padding: 'var(--space-4, 16px) var(--space-3, 12px)' }}>
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
      </div>

      {/* Bottom Switcher: Jump to Super Admin Finance/Governance */}
      <div
        style={{
          padding: 'var(--space-4, 16px) var(--space-3, 12px)',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface-muted)',
        }}
      >
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
          GOVERNANCE & FINANCE
        </div>
        <a
          href="http://localhost:7002/dashboard"
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
          <span>Super Admin (:7002)</span>
          <ExternalLink size={14} />
        </a>
      </div>
    </aside>
  );
};
