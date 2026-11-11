'use client';

import React from 'react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const DASHBOARD_TABS: SubNavTab[] = [
  //{ href: '/dashboard', label: 'Company Overview', icon: <LayoutDashboard size={15} /> },
  //{ href: '/dashboard/analytics', label: 'Transport Analytics', icon: <BarChart3 size={15} /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Overview & Executive Dashboard" tabs={DASHBOARD_TABS} />
      {children}
    </div>
  );
}
