'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ticket, ListFilter, FileText, CheckSquare } from 'lucide-react';

const BATCH_06_TABS = [
  { href: '/bookings/overview', label: '1. Booking Overview', icon: <Ticket size={15} /> },
  { href: '/bookings', label: '2. Booking Queue', icon: <ListFilter size={15} /> },
  { href: '/bookings/details', label: '3. Booking Details', icon: <FileText size={15} /> },
  { href: '/bookings/approvals', label: '4. Approval Inbox', icon: <CheckSquare size={15} /> },
];

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Batch 06 Header Banner & Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface, #FFFFFF)',
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
              backgroundColor: 'var(--brand-primary-subtle, rgba(87, 40, 178, 0.1))',
              color: 'var(--brand-primary, #5728B2)',
              border: '1px solid var(--brand-blue-200, rgba(87, 40, 178, 0.25))',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}
          >
            Batch 06
          </span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Bookings & Transport Requests
          </span>
        </div>

        {/* 4 Screen Switcher Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {BATCH_06_TABS.map((tab) => {
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
                  backgroundColor: isActive ? 'var(--brand-primary, #5728B2)' : 'var(--bg-surface-muted, #F8FAFC)',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary, #475569)',
                  border: `1px solid ${isActive ? 'var(--brand-primary, #5728B2)' : 'var(--border-subtle, #E2E8F0)'}`,
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

