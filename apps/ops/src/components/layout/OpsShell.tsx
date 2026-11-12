'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { OpsTopBar } from './OpsTopBar';
import { OpsSidebar } from './OpsSidebar';
import {
  clearOpsSession,
  getStoredOpsRefreshToken,
  getStoredOpsToken,
  getStoredOpsUser,
  opsApi,
  updateOpsTokens,
} from '../../lib/api/opsClient';
import { SessionProvider } from '../../../../corporate/src/lib/auth/SessionContext';
import { configureCorporateApiSession } from '../../../../corporate/src/lib/api/client';

export const OpsShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [tenantLoadError, setTenantLoadError] = useState('');

  useEffect(() => {
    setTenantLoadError('');
    const isLogin = pathname === '/login';
    const token = getStoredOpsToken();

    if (isLogin) return;

    const user = getStoredOpsUser();
    const role = user?.role.toUpperCase();
    if (!token || !user || (role !== 'OPS' && role !== 'ADMIN')) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
      return;
    }

    configureCorporateApiSession({
      getToken: getStoredOpsToken,
      getRefreshToken: getStoredOpsRefreshToken,
      updateTokens: updateOpsTokens,
      clearSession: clearOpsSession,
    });

    const isMigratedModule = ['/live', '/routes', '/safety'].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
    if (isMigratedModule) {
      try {
        const selectedTenantId = localStorage.getItem('adhocx_ops_selected_tenant');
        if (selectedTenantId) {
          setIsReady(true);
          return;
        }
      } catch {
        setTenantLoadError('Unable to read the selected corporate tenant from browser storage.');
        setIsReady(true);
        return;
      }

      void opsApi
        .getTenants({ limit: 100 })
        .then((response) => {
          const firstTenantId = response.items?.[0]?.id;
          if (firstTenantId) {
            localStorage.setItem('adhocx_ops_selected_tenant', firstTenantId);
            window.dispatchEvent(new Event('adhocx:ops-tenant-changed'));
          } else {
            setTenantLoadError('No corporate tenants are available for this Ops account.');
          }
        })
        .catch((error: unknown) => {
          setTenantLoadError(error instanceof Error ? error.message : 'Unable to load corporate tenants.');
        })
        .finally(() => setIsReady(true));
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
    <SessionProvider
      opsMode
      opsSession={{ token: getStoredOpsToken(), user: getStoredOpsUser() }}
    >
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
            {tenantLoadError && (
              <div role="alert" style={{ color: 'var(--color-danger)', marginBottom: 16 }}>
                {tenantLoadError}
              </div>
            )}
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
};
