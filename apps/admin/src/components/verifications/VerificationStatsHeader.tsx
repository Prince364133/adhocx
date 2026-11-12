'use client';

import React from 'react';
import { Clock, BadgeCheck, Building2, CheckCircle2 } from 'lucide-react';
import { KpiStrip } from '../common/KpiStrip';

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
    <KpiStrip
      columns={4}
      style={{ marginBottom: '1rem' }}
      items={[
        {
          id: 'under-review',
          label: 'Under Review Queue',
          value: stats.underReview,
          subtext: `${stats.totalQueue} total queue records`,
          tone: 'warning',
          icon: <Clock size={14} />,
        },
        {
          id: 'drivers-pending',
          label: 'Drivers Pending KYC',
          value: stats.driversPending,
          subtext: 'Driver license & RC checks',
          tone: 'primary',
          icon: <BadgeCheck size={14} />,
        },
        {
          id: 'vendors-pending',
          label: 'Vendors Pending',
          value: stats.vendorsPending,
          subtext: 'Enterprise KYC & GST',
          tone: 'info',
          icon: <Building2 size={14} />,
        },
        {
          id: 'approved-verified',
          label: 'Approved & Verified',
          value: stats.verifiedTotal,
          subtext: `${stats.rejectedTotal} declined in cycle`,
          tone: 'success',
          icon: <CheckCircle2 size={14} />,
        },
      ]}
    />
  );
};
