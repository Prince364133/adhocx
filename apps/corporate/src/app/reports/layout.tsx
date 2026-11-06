'use client';

import React from 'react';
import { BarChart3, Users, Route, DollarSign } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const REPORTS_TABS: SubNavTab[] = [
  { href: '/reports', label: 'Transport Performance', icon: <BarChart3 size={15} /> },
  { href: '/reports/usage', label: 'Employee Usage Report', icon: <Users size={15} /> },
  { href: '/reports/fleet', label: 'Vehicle & Route Analytics', icon: <Route size={15} /> },
  { href: '/reports/costs', label: 'Cost & Department Reports', icon: <DollarSign size={15} /> },
];

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Reports & Analytics" tabs={REPORTS_TABS} />
      {children}
    </div>
  );
}
