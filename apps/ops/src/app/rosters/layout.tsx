import React from 'react';
import { OpsModuleTabs } from '../../components/layout/OpsModuleTabs';

export default function RostersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <OpsModuleTabs module="rosters" />
      {children}
    </div>
  );
}
