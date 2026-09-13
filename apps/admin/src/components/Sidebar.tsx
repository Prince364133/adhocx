'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { AdhocxBrandLogo } from './AdhocxBrandLogo';

// SVG Icon components for clean navigation
const NavIcon = ({ children }: { children: React.ReactNode }) => (
  <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.85 }}>
    {children}
  </span>
);

const Icons = {
  Dashboard: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></NavIcon>,
  Verifications: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg></NavIcon>,
  Requirements: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></NavIcon>,
  Trips: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></NavIcon>,
  Assignments: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg></NavIcon>,
  Drivers: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></NavIcon>,
  Users: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></NavIcon>,
  Vendors: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></NavIcon>,
  Payments: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></NavIcon>,
  Settlements: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg></NavIcon>,
  Pricing: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></NavIcon>,
  Reports: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></NavIcon>,
  Support: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></NavIcon>,
  Disputes: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></NavIcon>,
  Audit: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></NavIcon>,
  Blogs: <NavIcon><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg></NavIcon>,
};

interface NavGroup {
  groupName?: string;
  items: {
    href: string;
    label: string;
    icon: React.ReactNode;
  }[];
}

const navStructure: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Icons.Dashboard },
      { href: '/verifications', label: 'Verifications', icon: Icons.Verifications },
    ],
  },
  {
    groupName: 'Operations',
    items: [
      { href: '/requirements', label: 'Requirements', icon: Icons.Requirements },
      { href: '/trips', label: 'Trips', icon: Icons.Trips },
      { href: '/assignments', label: 'Assignments', icon: Icons.Assignments },
    ],
  },
  {
    groupName: 'Marketplace',
    items: [
      { href: '/drivers', label: 'Drivers', icon: Icons.Drivers },
      { href: '/users', label: 'Users', icon: Icons.Users },
      { href: '/vendors', label: 'Vendors', icon: Icons.Vendors },
    ],
  },
  {
    groupName: 'Finance',
    items: [
      { href: '/payments', label: 'Payments', icon: Icons.Payments },
      { href: '/settlements', label: 'Settlements', icon: Icons.Settlements },
      { href: '/pricing', label: 'Pricing', icon: Icons.Pricing },
    ],
  },
  {
    groupName: 'Growth & SEO',
    items: [
      { href: '/blogs', label: 'Blog Posts', icon: Icons.Blogs },
      { href: '/reports', label: 'Reports', icon: Icons.Reports },
    ],
  },
  {
    items: [
      { href: '/support', label: 'Support', icon: Icons.Support },
      { href: '/disputes', label: 'Disputes', icon: Icons.Disputes },
    ],
  },
  {
    groupName: 'System',
    items: [
      { href: '/audit', label: 'Audit Logs', icon: Icons.Audit },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      {/* Brand Header — Real AdhocX Logo */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <AdhocxBrandLogo size={34} subtitle="Control Portal" />
      </div>

      {/* Navigation */}
      <nav
        style={{
          padding: '1rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          flex: 1,
          overflowY: 'auto',
        }}
      >
        {navStructure.map((group, gIdx) => (
          <div key={gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {group.groupName && (
              <div
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '0.25rem 0.75rem',
                  marginBottom: '0.125rem',
                }}
              >
                {group.groupName}
              </div>
            )}
            {group.items.map((item) => {
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
                    gap: '0.625rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.84rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--primary-600)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--primary-50)' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: 'var(--bg-surface-muted)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--primary-50)',
            border: '1px solid var(--border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--primary-600)',
            flexShrink: 0,
          }}
        >
          OP
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Operations Lead
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ops@adhocx.com
          </div>
        </div>
      </div>
    </aside>
  );
};
