'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AdhocxBrandLogo } from './AdhocxBrandLogo';
import {
  adminApi,
  getStoredAdminToken,
  clearAdminSession,
} from '../lib/api/client';
import { Loader2, ShieldAlert } from 'lucide-react';

export const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  const [isVerifying, setIsVerifying] = useState(!isLoginPage);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // If on the login page, no shell authentication verification is needed
    if (isLoginPage) {
      setIsVerifying(false);
      return;
    }

    let isMounted = true;

    async function checkAdministrativeSession() {
      const token = getStoredAdminToken();
      if (!token) {
        if (isMounted) {
          const redirect = encodeURIComponent(pathname);
          router.replace(`/login?redirect=${redirect}`);
        }
        return;
      }

      try {
        await adminApi.verifyAdminSession();
        if (isMounted) {
          setIsVerifying(false);
        }
      } catch (err: any) {
        if (isMounted) {
          clearAdminSession();
          const redirect = encodeURIComponent(pathname);
          router.replace(`/login?redirect=${redirect}`);
        }
      }
    }

    checkAdministrativeSession();

    return () => {
      isMounted = false;
    };
  }, [pathname, isLoginPage, router]);

  // If on login route, render standalone login screen without sidebar & header
  if (isLoginPage) {
    return <>{children}</>;
  }

  // When verifying protected routes, show secure loading gate to prevent UI flashing
  if (isVerifying) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ transform: 'scale(1.1)' }}>
          <AdhocxBrandLogo size={44} subtitle="Control Portal" />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.6rem 1.2rem',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            fontWeight: 600,
          }}
        >
          <Loader2 size={16} className="spin-animation" color="var(--brand-primary)" />
          <span>Verifying Server Administrative Session...</span>
        </div>
      </div>
    );
  }

  // Authenticated layout with Sidebar & Header
  return (
    <div className="admin-layout">
      <Sidebar />
      <div className="admin-main">
        <Header />
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
};
