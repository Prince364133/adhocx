'use client';

import React from 'react';
import { Users, User, UploadCloud, CheckCircle2 } from 'lucide-react';
import { SubNavTabs, SubNavTab } from '../../components/layout/SubNavTabs';

const EMPLOYEE_TABS: SubNavTab[] = [
  { href: '/employees', label: 'Employee Directory', icon: <Users size={15} /> },
  { href: '/employees/profile', label: 'Employee Profile', icon: <User size={15} /> },
  { href: '/employees/import', label: 'Import Wizard', icon: <UploadCloud size={15} /> },
  { href: '/employees/import/results', label: 'Import Validation Results', icon: <CheckCircle2 size={15} /> },
];

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SubNavTabs title="Employee Directory & Management" tabs={EMPLOYEE_TABS} />
      {children}
    </div>
  );
}
