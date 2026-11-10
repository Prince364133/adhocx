'use client';

import React from 'react';
import { Database, Shield } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const SETTINGS_TABS: SubNavTab[] = [
  { href: '/settings', label: 'HRMS Integration', icon: <Database size={15} /> },
  //{ href: '/settings/mapping', label: 'Import Mapping Engine', icon: <FileSpreadsheet size={15} /> },
  //{ href: '/settings/health', label: 'Integration Health & Webhooks', icon: <Activity size={15} /> },
  { href: '/settings/organization', label: 'Organization Settings & Audit', icon: <Shield size={15} /> },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Settings & Integrations" tabs={SETTINGS_TABS} />
      {children}
    </div>
  );
}
