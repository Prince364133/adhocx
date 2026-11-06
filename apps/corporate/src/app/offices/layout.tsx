'use client';

import React from 'react';
import { Building2, ShieldCheck, MapPin, Network } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const OFFICES_TABS: SubNavTab[] = [
  { href: '/offices', label: 'Offices Directory', icon: <Building2 size={15} /> },
  { href: '/offices/details', label: 'Office Details & Gates', icon: <ShieldCheck size={15} /> },
  { href: '/offices/geofences', label: 'Geofences & Pickup Points', icon: <MapPin size={15} /> },
  { href: '/offices/cost-centers', label: 'Cost Centers & Org Structure', icon: <Network size={15} /> },
];

export default function OfficesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Offices, Buildings & Organization" tabs={OFFICES_TABS} />
      {children}
    </div>
  );
}
