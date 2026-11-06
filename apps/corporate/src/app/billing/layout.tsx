'use client';

import React from 'react';
import { Receipt, List, FileSpreadsheet, Scale } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const BILLING_TABS: SubNavTab[] = [
  { href: '/billing', label: 'Billing Overview', icon: <Receipt size={15} /> },
  { href: '/billing/invoices', label: 'Invoice List', icon: <List size={15} /> },
  { href: '/billing/details', label: 'Invoice Details', icon: <FileSpreadsheet size={15} /> },
  { href: '/billing/disputes', label: 'Billing Disputes', icon: <Scale size={15} /> },
];

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Billing & Invoices" tabs={BILLING_TABS} />
      {children}
    </div>
  );
}
