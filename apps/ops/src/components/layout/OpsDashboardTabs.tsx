'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, BarChart3, LayoutDashboard, Radio } from 'lucide-react';

const TABS = [
  { href: '/dashboard', label: 'Operations Overview', icon: <LayoutDashboard size={15} /> },
  { href: '/dashboard/analytics', label: 'Operations Analytics', icon: <BarChart3 size={15} /> },
  { href: '/dashboard/live', label: 'Live Dispatch', icon: <Radio size={15} /> },
  { href: '/dashboard/exceptions', label: 'Exceptions & Safety', icon: <AlertTriangle size={15} /> },
];

export function OpsDashboardTabs() {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-surface)',
        padding: '10px 18px',
        borderRadius: 'var(--radius-xl, 12px)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <h2
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: 0,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        Overview &amp; Executive Dashboard
      </h2>
      <nav aria-label="Operations dashboard navigation" style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
        {TABS.map((tab) => {
          const active = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(`${tab.href}/`));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '12px',
                fontWeight: active ? 600 : 500,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                backgroundColor: active ? 'var(--brand-primary, #5728B2)' : 'var(--bg-surface-muted)',
                color: active ? '#FFFFFF' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'var(--brand-primary, #5728B2)' : 'var(--border-subtle)'}`,
                boxShadow: active ? '0 2px 6px rgba(87, 40, 178, 0.25)' : 'none',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
