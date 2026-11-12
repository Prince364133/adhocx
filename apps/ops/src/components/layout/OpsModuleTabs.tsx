'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { SubNavTab, SubNavTabs } from '../../../../corporate/src/components/layout/SubNavTabs';

type Module = 'safety';

const TABS: Record<Module, { title: string; tabs: SubNavTab[] }> = {
  safety: {
    title: 'Safety & Incident Management',
    tabs: [
      { href: '/safety', label: 'Safety Overview', icon: <ShieldAlert size={15} /> },
      { href: '/safety/cockpit', label: 'SOS Cockpit', icon: <AlertTriangle size={15} /> },
      { href: '/safety/incidents/details', label: 'Incident Details', icon: <FileText size={15} /> },
      { href: '/safety/incidents/resolve', label: 'Incident Resolution', icon: <CheckCircle2 size={15} /> },
      { href: '/safety/reports', label: 'Safety Reports', icon: <FileText size={15} /> },
    ],
  },
};

export function OpsModuleTabs({ module }: { module: Module }) {
  const { title, tabs } = TABS[module];
  return <SubNavTabs title={title} tabs={tabs} />;
}
