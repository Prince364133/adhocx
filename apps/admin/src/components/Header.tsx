'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const pathname = usePathname();

  const getSectionTitle = () => {
    if (title) return title;
    if (pathname.startsWith('/verifications')) return 'Verification Center';
    if (pathname.startsWith('/disputes')) return 'Dispute Management & Resolution';
    if (pathname.startsWith('/requirements')) return 'Operations — Requirements & Demand';
    if (pathname.startsWith('/trips')) return 'Operations — Trips & Live Telemetry';
    if (pathname.startsWith('/assignments')) return 'Operations — Driver Assignments';
    if (pathname.startsWith('/drivers')) return 'Marketplace — Driver Fleet & KYC';
    if (pathname.startsWith('/users')) return 'Marketplace — Users & Onboarding';
    if (pathname.startsWith('/vendors')) return 'Marketplace — Enterprise Vendors';
    if (pathname.startsWith('/payments')) return 'Finance — Customer Payments';
    if (pathname.startsWith('/settlements')) return 'Finance — Driver Settlements';
    if (pathname.startsWith('/pricing')) return 'Finance — Marketplace Pricing';
    if (pathname.startsWith('/reports')) return 'Analytics — Operational Reports';
    if (pathname.startsWith('/support')) return 'Support & Interventions';
    if (pathname.startsWith('/audit')) return 'System — Immutable Audit Logs';
    return 'Dashboard — Operational Command Center';
  };

  return (
    <header className="admin-header">
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {getSectionTitle()}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Connection Status (05_UI_UX_GUIDELINES.md § 48) */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.25rem 0.625rem',
            background: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--color-success)',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success)',
            }}
          />
          Live System Connected
        </div>
      </div>
    </header>
  );
};
