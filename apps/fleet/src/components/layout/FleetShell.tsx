'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import type { FleetAuthUserDto } from '@adhocx/contracts';
import { fleetApi } from '../../lib/api/client';
import { clearFleetSession, getFleetToken, getStoredFleetUser } from '../../lib/auth/session';
import { Sidebar } from './Sidebar';
import { ConfirmDialog, ErrorState } from '../common/StatePrimitives';
import { DashboardSkeleton } from '../common/Skeletons';

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/drivers': 'Driver Management',
  '/live-operations': 'Live Operations',
  '/earnings': 'Earnings & Payouts',
  '/incentives': 'Driver Incentives',
  '/shifts': 'Shift & Ride Management',
  '/support': 'Support Center',
  '/notifications': 'Notifications',
};

export const FleetShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  const [user, setUser] = useState<FleetAuthUserDto | null>(null);
  const [verifying, setVerifying] = useState(!isLoginPage);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!getFleetToken()) return;
    try {
      const res = await fleetApi.listNotifications({ unreadOnly: true, limit: 1 });
      setUnreadNotifications(res.unreadCount || 0);
    } catch {
      // Non-blocking badge refresh
    }
  }, []);

  const verifySession = useCallback(async () => {
    const token = getFleetToken();
    if (!token) {
      clearFleetSession();
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    try {
      setAuthError(null);
      const me = await fleetApi.getMe();
      setUser(me);
      setVerifying(false);
      void refreshUnreadCount();
    } catch (err: unknown) {
      setVerifying(false);
      setAuthError(err instanceof Error ? err.message : 'Unable to verify fleet session.');
    }
  }, [pathname, refreshUnreadCount, router]);

  useEffect(() => {
    if (isLoginPage) {
      setVerifying(false);
      return;
    }
    setUser(getStoredFleetUser());
    void verifySession();
  }, [isLoginPage, verifySession]);

  useEffect(() => {
    if (typeof window === 'undefined' || isLoginPage) return;
    const onUpdated = () => {
      void refreshUnreadCount();
    };
    window.addEventListener('fleet:notifications-updated', onUpdated);
    return () => window.removeEventListener('fleet:notifications-updated', onUpdated);
  }, [isLoginPage, refreshUnreadCount]);

  const handleConfirmLogout = async () => {
    setLoggingOut(true);
    try {
      await fleetApi.logout().catch(() => {});
    } finally {
      clearFleetSession();
      setLoggingOut(false);
      setShowLogoutConfirm(false);
      router.replace('/login');
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  const pageTitle =
    Object.entries(ROUTE_TITLES).find(([prefix]) => pathname.startsWith(prefix))?.[1] ||
    'Fleet Portal';

  return (
    <div className="fleet-layout">
      <Sidebar
        fleetName={user?.fleetName}
        userRole={user?.role}
        unreadNotifications={unreadNotifications}
        onRequestLogout={() => setShowLogoutConfirm(true)}
      />
      <div className="fleet-main">
        <header className="fleet-header">
          <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{pageTitle}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link
              href="/notifications"
              aria-label={`Notifications (${unreadNotifications} unread)`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '9999px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                textDecoration: 'none',
              }}
            >
              <Bell size={15} />
              <span>{unreadNotifications}</span>
            </Link>
            {user && (
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                {user.fullName} · Code: <strong>{user.fleetCode}</strong>
              </div>
            )}
          </div>
        </header>

        <main className="fleet-content">
          {verifying ? (
            <DashboardSkeleton />
          ) : authError ? (
            <ErrorState message={authError} onRetry={() => { setVerifying(true); void verifySession(); }} />
          ) : (
            children
          )}
        </main>
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Sign Out of AdhocX Fleet?"
        description="You will be signed out of your current fleet administrator session."
        confirmLabel="Sign Out"
        isLoading={loggingOut}
        onConfirm={handleConfirmLogout}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
};
