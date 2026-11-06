'use client';

import React from 'react';
import { LifeBuoy, ListOrdered, MessageSquare, Clock } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const SUPPORT_TABS: SubNavTab[] = [
  { href: '/support', label: 'Support Overview', icon: <LifeBuoy size={15} /> },
  { href: '/support/tickets', label: 'Support Ticket List', icon: <ListOrdered size={15} /> },
  { href: '/support/tickets/details', label: 'Ticket Details & Thread', icon: <MessageSquare size={15} /> },
  { href: '/support/sla', label: 'SLA Performance Report', icon: <Clock size={15} /> },
];

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Support & SLA Management" tabs={SUPPORT_TABS} />
      {children}
    </div>
  );
}
