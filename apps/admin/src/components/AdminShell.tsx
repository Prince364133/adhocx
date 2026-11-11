'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from './common/ToastProvider';
import { AdhocxBrandLogo } from './AdhocxBrandLogo';
import {
  adminApi,
  getStoredAdminToken,
  clearAdminSession,
} from '../lib/api/client';
import { Loader2 } from 'lucide-react';

export const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  const [isVerifying, setIsVerifying] = useState(!isLoginPage);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const retryVerification = () => {
    setErrorMessage(null);
    setIsVerifying(true);
    checkSession();
  };

  const handleGoToLogin = () => {
    clearAdminSession();
    window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
  };

  async function checkSession() {
    const token = getStoredAdminToken();
    if (!token) {
      clearAdminSession();
      const redirect = encodeURIComponent(pathname);
      window.location.replace(`/login?redirect=${redirect}`);
      return;
    }

    try {
      await adminApi.verifyAdminSession();
      setIsVerifying(false);
      setErrorMessage(null);
    } catch {
      clearAdminSession();
      const redirect = encodeURIComponent(pathname);
      window.location.replace(`/login?redirect=${redirect}`);
    }
  }

  useEffect(() => {
    // If on the login page, no shell authentication verification is needed
    if (isLoginPage) {
      setIsVerifying(false);
      return;
    }

    checkSession();

    // Safety timeout to prevent getting permanently stuck if backend is slow
    const timeout = setTimeout(() => {
      setIsVerifying((prev) => {
        if (prev) {
          setErrorMessage('Session verification is taking longer than expected. The API server may be restarting or unreachable.');
        }
        return prev;
      });
    }, 4500);

    return () => {
      clearTimeout(timeout);
    };
  }, [pathname, isLoginPage]);

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
          padding: '1.5rem',
        }}
      >
        <div style={{ transform: 'scale(1.1)' }}>
          <AdhocxBrandLogo size={44} subtitle="Control Portal" />
        </div>

        {!errorMessage ? (
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
        ) : (
          <div
            style={{
              maxWidth: '420px',
              textAlign: 'center',
              background: 'var(--bg-surface)',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {errorMessage}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleGoToLogin}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#5728B2',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Sign In to Admin
              </button>
              <button
                type="button"
                onClick={retryVerification}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Authenticated layout with Sidebar & Header
  return (
    <ToastProvider>
      <div className="admin-layout">
        <Sidebar />
        <div className="admin-main">
          <Header />
          <div className="admin-content">{children}</div>
        </div>
      </div>
    </ToastProvider>
  );
};
