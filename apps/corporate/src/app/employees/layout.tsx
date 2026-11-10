'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const EMPLOYEE_TABS: SubNavTab[] = [
  { href: '/employees', label: 'Employee Directory', icon: <Users size={15} /> },
];

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Employee Directory" tabs={EMPLOYEE_TABS} />
      {children}
    </div>
  );
}
