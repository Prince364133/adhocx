'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LifeBuoy, ListOrdered, MessageSquare, Clock } from 'lucide-react';

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { href: '/support', label: '9.1 Support Overview', icon: <LifeBuoy size={15} /> },
  { href: '/support/tickets', label: '9.2 Support Ticket List', icon: <ListOrdered size={15} /> },
  { href: '/support/tickets/details', label: '9.3 Ticket Details & Thread', icon: <MessageSquare size={15} /> },
  { href: '/support/sla', label: '9.4 SLA Performance Report', icon: <Clock size={15} /> },
];

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Batch 09 Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 16px',
          background: 'linear-gradient(90deg, #FFFFFF 0%, #F8FAFC 100%)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              padding: '3px 8px',
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            BATCH 09
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Support & SLA Management (4 Screens)
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Employee complaints, missed pickups, cab comfort tickets, resolution chat threads and SLA tracking
          </span>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: 'none',
                  backgroundColor: active ? 'var(--corporate-blue)' : '#FFFFFF',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                  border: `1px solid ${active ? 'var(--corporate-blue)' : 'var(--border-color)'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.icon}
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}

