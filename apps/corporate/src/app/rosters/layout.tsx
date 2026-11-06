'use client';

import React from 'react';
import { CalendarClock, Calendar, UploadCloud, CheckCircle } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const ROSTERS_TABS: SubNavTab[] = [
  { href: '/rosters/shifts', label: 'Shift Templates', icon: <CalendarClock size={15} /> },
  { href: '/rosters/calendar', label: 'Roster Calendar', icon: <Calendar size={15} /> },
  { href: '/rosters/import', label: 'Import & Preview', icon: <UploadCloud size={15} /> },
  { href: '/rosters/approve', label: 'Approval & Publish', icon: <CheckCircle size={15} /> },
];

export default function RostersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Shifts & Employee Rosters" tabs={ROSTERS_TABS} />
      {children}
    </div>
  );
}
