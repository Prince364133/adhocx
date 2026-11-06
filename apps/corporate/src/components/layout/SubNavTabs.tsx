'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SubNavTab {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

interface SubNavTabsProps {
  title: string;
  tabs: SubNavTab[];
}

export function SubNavTabs({ title, tabs }: SubNavTabsProps) {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-surface, #FFFFFF)',
        padding: '10px 18px',
        borderRadius: 'var(--radius-xl, 12px)',
        border: '1px solid var(--border-subtle, #E2E8F0)',
        boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05))',
        flexWrap: 'wrap',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #0F172A)', margin: 0, letterSpacing: '-0.01em' }}>
          {title}
        </h2>
      </div>

      <nav aria-label={`${title} navigation`} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md, 8px)',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                textDecoration: 'none',
                backgroundColor: isActive ? 'var(--brand-primary, #5728B2)' : 'var(--bg-surface-muted, #F8FAFC)',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary, #475569)',
                border: `1px solid ${isActive ? 'var(--brand-primary, #5728B2)' : 'var(--border-subtle, #E2E8F0)'}`,
                boxShadow: isActive ? '0 2px 6px rgba(87, 40, 178, 0.25)' : 'none',
                transition: 'all 0.15s ease',
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

