import React from 'react';
import { OpsDashboardTabs } from '../../components/layout/OpsDashboardTabs';

export default function OperationsDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <OpsDashboardTabs />
      {children}
    </div>
  );
}
