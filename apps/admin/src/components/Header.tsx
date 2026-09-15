'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const pathname = usePathname();

  const getSectionTitle = () => {
    if (title) return title;
    if (pathname.startsWith('/dashboard')) return 'Marketplace Overview';
    if (pathname.startsWith('/verifications')) return 'Verification Center';
    if (pathname.startsWith('/drivers')) return 'Driver Fleet Management';
    if (pathname.startsWith('/users')) return 'Users & Corporate Vendors';
    if (pathname.startsWith('/requirements')) return 'Requirements & Sourcing';
    if (pathname.startsWith('/assignments')) return 'Assignment Operations';
    if (pathname.startsWith('/trips')) return 'Trips & Telemetry Tracking';
    if (pathname.startsWith('/coupons')) return 'Coupons & Promotions';
    if (pathname.startsWith('/blogs')) return 'Blog CMS Publisher';
    if (pathname.startsWith('/settlements')) return 'Financial Settlements & Payouts';
    if (pathname.startsWith('/disputes')) return 'Dispute Resolution Desk';
    if (pathname.startsWith('/reports')) return 'Reports & Financial Analytics';
    if (pathname.startsWith('/pricing')) return 'Pricing Engine & Tariffs';
    if (pathname.startsWith('/payments')) return 'Payments & Escrow Balances';
    if (pathname.startsWith('/audit')) return 'Audit Logs & Compliance';
    if (pathname.startsWith('/support')) return 'Customer & Driver Support';
    return 'Control Portal';
  };

  return (
    <header className="admin-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {getSectionTitle()}
          </h2>
          {subtitle && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Theme Switcher */}
        <ThemeToggle />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.3rem 0.65rem',
            background: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-success)',
            letterSpacing: '0.02em',
          }}
        >
          <span className="pulse-dot success" style={{ width: '6px', height: '6px' }} />
          <span>API 7001 Live</span>
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            background: 'var(--bg-card-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          <span>Port 7002</span>
        </div>
      </div>
    </header>
  );
};
