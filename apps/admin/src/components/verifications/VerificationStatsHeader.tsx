'use client';

import React from 'react';
import { Clock, BadgeCheck, Building2, CheckCircle2 } from 'lucide-react';

interface StatsProps {
  stats: {
    underReview: number;
    driversPending: number;
    vendorsPending: number;
    verifiedTotal: number;
    rejectedTotal: number;
    totalQueue: number;
  };
}

export const VerificationStatsHeader: React.FC<StatsProps> = ({ stats }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {/* 1. Active Review Queue */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-warning-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-warning)',
          }}
        >
          <Clock size={22} />
        </div>
        <div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Under Review Queue
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-warning)' }}>
            {stats.underReview}
          </div>
        </div>
      </div>

      {/* 2. Drivers Pending KYC */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-primary-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-primary)',
          }}
        >
          <BadgeCheck size={22} />
        </div>
        <div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Drivers Pending KYC
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-primary)' }}>
            {stats.driversPending}
          </div>
        </div>
      </div>

      {/* 3. Vendors Pending Verification */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(14, 165, 233, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-info)',
          }}
        >
          <Building2 size={22} />
        </div>
        <div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Vendors Pending
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-info)' }}>
            {stats.vendorsPending}
          </div>
        </div>
      </div>

      {/* 4. Verified Total */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-success-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-success)',
          }}
        >
          <CheckCircle2 size={22} />
        </div>
        <div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Approved & Verified
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>
            {stats.verifiedTotal}
          </div>
        </div>
      </div>
    </div>
  );
};
