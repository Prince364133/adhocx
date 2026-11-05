'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ShieldCheck, MapPin, Network } from 'lucide-react';

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { href: '/offices', label: '4.1 Offices Directory', icon: <Building2 size={15} /> },
  { href: '/offices/details', label: '4.2 Office Details & Gates', icon: <ShieldCheck size={15} /> },
  { href: '/offices/geofences', label: '4.3 Geofences & Pickup Points', icon: <MapPin size={15} /> },
  { href: '/offices/cost-centers', label: '4.4 Org Structure & Cost Centers', icon: <Network size={15} /> },
];

export default function OfficesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Batch 04 Header Banner */}
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
            BATCH 04
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Offices, Buildings & Organization (4 Screens)
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Campus sites, entry/exit gates, RFID boom barriers, pickup geofences and cost centers
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

