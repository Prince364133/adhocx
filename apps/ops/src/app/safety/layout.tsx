import React from 'react';
import { OpsModuleTabs } from '../../components/layout/OpsModuleTabs';

export default function SafetyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <OpsModuleTabs module="safety" />
      {children}
    </div>
  );
}
