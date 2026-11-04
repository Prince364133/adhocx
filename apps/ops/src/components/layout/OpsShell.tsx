'use client';

import React from 'react';
import { OpsTopBar } from './OpsTopBar';
import { OpsSidebar } from './OpsSidebar';

export const OpsShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <OpsTopBar />
      <div style={{ display: 'flex', flex: 1 }}>
        <OpsSidebar />
        <main
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-canvas, #010D2D)',
            overflowY: 'auto',
            padding: 'var(--space-6, 24px) var(--space-8, 32px)',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
