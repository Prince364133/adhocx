'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdhocxBrandLogo } from './AdhocxBrandLogo';

interface NavSection {
  title?: string;
  items: {
    href: string;
    label: string;
    icon: string;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { href: '/requirements', label: 'Requirements', icon: '📋' },
      { href: '/trips', label: 'Trips & Telemetry', icon: '🗺️' },
      { href: '/assignments', label: 'Assignments', icon: '🚚' },
    ],
  },
  {
    title: 'MARKETPLACE',
    items: [
      { href: '/verifications', label: 'Verification Center', icon: '🛡️' },
      { href: '/drivers', label: 'Driver Fleet', icon: '🚘' },
      { href: '/users', label: 'Users & Vendors', icon: '👥' },
    ],
  },
  {
    title: 'FINANCE & BILLING',
    items: [
      { href: '/settlements', label: 'Settlements', icon: '💳' },
      { href: '/payments', label: 'Payments & Escrow', icon: '💰' },
      { href: '/pricing', label: 'Pricing & Tariffs', icon: '🏷️' },
    ],
  },
  {
    title: 'GROWTH & CONTENT',
    items: [
      { href: '/coupons', label: 'Coupons & Promos', icon: '🎟️' },
      { href: '/blogs', label: 'Blog & Content', icon: '📰' },
      { href: '/disputes', label: 'Disputes & Support', icon: '⚖️' },
    ],
  },
  {
    title: 'GOVERNANCE',
    items: [
      { href: '/reports', label: 'Reports & Analytics', icon: '📈' },
      { href: '/audit', label: 'Audit Logs', icon: '📜' },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}
      >
        <AdhocxBrandLogo size={34} subtitle="Control Portal" />
      </div>

      <nav
        style={{
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {navSections.map((sec, sIdx) => (
          <div key={sIdx}>
            {sec.title && (
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  padding: '0 0.75rem',
                  marginBottom: '0.4rem',
                }}
              >
                {sec.title}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {sec.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.84rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                      boxShadow: isActive ? 'var(--shadow-glow-purple)' : 'none',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.transform = 'translateX(2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.1rem 0.45rem',
                          borderRadius: 'var(--radius-pill)',
                          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--brand-primary-subtle)',
                          color: isActive ? '#ffffff' : 'var(--brand-primary)',
                        }}
                      >
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

      <div
        style={{
          padding: '0.875rem 1.25rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'var(--bg-surface)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 800,
            color: '#ffffff',
          }}
        >
          AX
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Operations Lead
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            ops@adhocx.com
          </div>
        </div>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)', boxShadow: '0 0 6px var(--color-success)' }} />
      </div>
    </aside>
  );
};
