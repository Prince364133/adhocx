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
    if (pathname.startsWith('/drivers')) return 'Driver KYC & Compliance';
    if (pathname.startsWith('/vendors')) return 'Vendor Onboarding & Verification';
    if (pathname.startsWith('/requirements')) return 'Requirements & Live Demand';
    if (pathname.startsWith('/trips')) return 'Trip Operations & Geolocation Telemetry';
    if (pathname.startsWith('/settlements')) return 'Financial Settlements & Payouts';
    if (pathname.startsWith('/audit')) return 'Platform Audit Logs & Security';
    return 'Operational Overview';
  };

  return (
    <header className="admin-header">
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {getSectionTitle()}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            background: 'var(--color-success-bg)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '9999px',
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
              boxShadow: '0 0 8px var(--color-success)',
            }}
          />
          Live API: Connected
        </div>
      </div>
    </header>
  );
};
