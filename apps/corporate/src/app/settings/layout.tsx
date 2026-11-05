'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Database, FileSpreadsheet, Activity, Shield } from 'lucide-react';

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { href: '/settings', label: '12.1 HRMS Integration', icon: <Database size={15} /> },
  { href: '/settings/mapping', label: '12.2 Import Mapping Engine', icon: <FileSpreadsheet size={15} /> },
  { href: '/settings/health', label: '12.3 Integration Health & Webhooks', icon: <Activity size={15} /> },
  { href: '/settings/organization', label: '12.4 Organization Settings & Audit', icon: <Shield size={15} /> },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Batch 12 Header Banner */}
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
              backgroundColor: 'var(--brand-primary-subtle, rgba(87, 40, 178, 0.1))',
              color: 'var(--brand-primary, #5728B2)',
              border: '1px solid var(--brand-blue-200, rgba(87, 40, 178, 0.25))',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            BATCH 12
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Integrations, Settings & Access Control (4 Screens)
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            HRMS automated sync, CSV field mapping, webhook health monitoring, RBAC policies & audit logs
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

