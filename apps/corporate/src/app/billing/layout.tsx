'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Receipt, List, FileSpreadsheet, Scale } from 'lucide-react';

const BATCH_10_TABS = [
  { href: '/billing', label: '10.1 Billing Overview', icon: <Receipt size={15} /> },
  { href: '/billing/invoices', label: '10.2 Invoice List', icon: <List size={15} /> },
  { href: '/billing/details', label: '10.3 Invoice Details', icon: <FileSpreadsheet size={15} /> },
  { href: '/billing/disputes', label: '10.4 Billing Disputes', icon: <Scale size={15} /> },
];

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Batch 10 Header Banner & Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: '#4338CA',
              color: '#EEF2FF',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}
          >
            Batch 10
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
            Billing & Invoice Management
          </span>
        </div>

        {/* 4 Screen Switcher Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {BATCH_10_TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  fontWeight: isActive ? 700 : 500,
                  textDecoration: 'none',
                  backgroundColor: isActive ? '#5728B2' : '#F8FAFC',
                  color: isActive ? '#FFFFFF' : '#475569',
                  border: `1px solid ${isActive ? '#5728B2' : '#E2E8F0'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}

