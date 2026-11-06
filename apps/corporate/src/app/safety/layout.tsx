'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const SAFETY_TABS: SubNavTab[] = [
  { href: '/safety', label: 'Safety Overview', icon: <ShieldAlert size={15} /> },
  { href: '/safety/incidents/details', label: 'Incident Details & SOS', icon: <AlertTriangle size={15} /> },
  { href: '/safety/incidents/resolve', label: 'Incident Resolution', icon: <CheckCircle2 size={15} /> },
  { href: '/safety/reports', label: 'Safety Reports', icon: <FileText size={15} /> },
];

export default function SafetyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Safety & Incident Management" tabs={SAFETY_TABS} />
      {children}
    </div>
  );
}
