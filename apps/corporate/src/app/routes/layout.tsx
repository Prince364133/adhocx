'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Navigation, Route, MapPin, Truck } from 'lucide-react';

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { href: '/routes', label: '7.1 Route Planning Master', icon: <Navigation size={15} /> },
  { href: '/routes/active', label: '7.2 Active Routes List', icon: <Route size={15} /> },
  { href: '/routes/details', label: '7.3 Route Details & Stops', icon: <MapPin size={15} /> },
  { href: '/routes/allocation', label: '7.4 Fleet & Driver Allocation', icon: <Truck size={15} /> },
];

export default function RoutesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Batch 07 Header Banner */}
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
            BATCH 07
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Routes & Trip Management (4 Screens)
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Corridor routing, stop sequence optimization, real-time fleet allocation & driver assignments
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

