'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { href: '/safety', label: '8.1 Safety Overview', icon: <ShieldAlert size={15} /> },
  { href: '/safety/incidents/details', label: '8.2 Incident Details & SOS', icon: <AlertTriangle size={15} /> },
  { href: '/safety/incidents/resolve', label: '8.3 Incident Resolution', icon: <CheckCircle2 size={15} /> },
  { href: '/safety/reports', label: '8.4 Safety Reports', icon: <FileText size={15} /> },
];

export default function SafetyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Batch 08 Header Banner */}
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
            BATCH 08
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Safety & Incident Management (4 Screens)
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            SOS panic triggers, live audio streaming, route deviations, telemetry infractions and resolution audit
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

