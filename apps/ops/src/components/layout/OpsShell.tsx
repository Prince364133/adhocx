'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OpsTopBar } from './OpsTopBar';
import { OpsSidebar } from './OpsSidebar';
import { getStoredOpsToken } from '../../lib/api/opsClient';

export const OpsShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const isLogin = pathname === '/login';
    const token = getStoredOpsToken();

    if (!token && !isLogin) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    setIsReady(true);
  }, [pathname, router]);

  // Dedicated full-screen layout for login page without top bar and sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!isReady) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }} />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-canvas)' }}>
      <OpsTopBar />
      <div style={{ display: 'flex', flex: 1 }}>
        <OpsSidebar />
        <main
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-canvas)',
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
