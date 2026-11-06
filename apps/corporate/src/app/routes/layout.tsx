'use client';

import React from 'react';
import { Navigation, Route, MapPin, Truck } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const ROUTES_TABS: SubNavTab[] = [
  { href: '/routes', label: 'Route Planning Master', icon: <Navigation size={15} /> },
  { href: '/routes/active', label: 'Active Routes List', icon: <Route size={15} /> },
  { href: '/routes/details', label: 'Route Details & Stops', icon: <MapPin size={15} /> },
  { href: '/routes/allocation', label: 'Fleet & Driver Allocation', icon: <Truck size={15} /> },
];

export default function RoutesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Routes & Trip Management" tabs={ROUTES_TABS} />
      {children}
    </div>
  );
}
