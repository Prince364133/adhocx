'use client';

import React from 'react';
import { Map, UserCheck, Car, AlertTriangle } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const LIVE_TABS: SubNavTab[] = [
  { href: '/live', label: 'Live Operations Map', icon: <Map size={15} /> },
  { href: '/live/employees', label: 'Employee Live Tracking', icon: <UserCheck size={15} /> },
  { href: '/live/trips', label: 'Live Trip Details', icon: <Car size={15} /> },
  { href: '/live/exceptions', label: 'Tracking Exceptions', icon: <AlertTriangle size={15} /> },
];

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Live Operations & Commuter Tracking" tabs={LIVE_TABS} />
      {children}
    </div>
  );
}
