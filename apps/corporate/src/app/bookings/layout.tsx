'use client';

import React from 'react';
import { Ticket, ListFilter, FileText, CheckSquare } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const BOOKINGS_TABS: SubNavTab[] = [
  { href: '/bookings/overview', label: 'Bookings Overview', icon: <Ticket size={15} /> },
  { href: '/bookings', label: 'Booking Queue', icon: <ListFilter size={15} /> },
  { href: '/bookings/details', label: 'Booking Details', icon: <FileText size={15} /> },
  { href: '/bookings/approvals', label: 'Approval Inbox', icon: <CheckSquare size={15} /> },
];

export default function BookingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Bookings & Commute Requests" tabs={BOOKINGS_TABS} />
      {children}
    </div>
  );
}
