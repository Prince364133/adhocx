'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdhocxBrandLogo } from './AdhocxBrandLogo';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/verifications', label: 'Verification Center', icon: '🛡️' },
  { href: '/drivers', label: 'Driver Fleet', icon: '🪪' },
  { href: '/users', label: 'Users', icon: '🏢' },
  { href: '/requirements', label: 'Requirements', icon: '📋' },
  { href: '/assignments', label: 'Assignments', icon: '🎯' },
  { href: '/trips', label: 'Trips & Telemetry', icon: '🚗' },
  { href: '/coupons', label: 'Coupons & Promos', icon: '🏷️' },
  { href: '/blogs', label: 'Blog & Content', icon: '📝' },
  { href: '/settlements', label: 'Settlements', icon: '💰' },
  { href: '/disputes', label: 'Disputes & Support', icon: '⚖️' },
  { href: '/reports', label: 'Reports & Analytics', icon: '📈' },
  { href: '/audit', label: 'Audit Logs', icon: '📜' },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <AdhocxBrandLogo size={36} subtitle="Control Portal" />
      </div>

      <nav style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.625rem 0.875rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.125rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--accent-primary)',
          }}
        >
          SA
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Super Admin
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            platform@adhocx.com
          </div>
        </div>
      </div>
    </aside>
  );
};
