'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Route,
  LifeBuoy,
  Receipt,
  BarChart3,
  Search,
  Bell,
  CheckCheck,
  LogOut,
  Building,
  CalendarX,
  Headphones,
  X,
} from 'lucide-react';
import { SessionProvider, useSession } from '../../lib/auth/SessionContext';
import { CORPORATE_ROLE_LABELS, CorporatePermission } from '../../lib/auth/permissions';
import { notificationsApi } from '../../lib/api/corporate';
import type { InAppNotificationItem } from '../../lib/api/types';
import { ThemeToggle } from '../common/ThemeToggle';
import { CorporateFaqDropdown } from './CorporateFaqDropdown';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { href: '/employees', label: 'Employees', icon: <Users size={18} /> },
  { href: '/cancellations', label: 'Cancellation Requests', icon: <CalendarX size={18} /> },
  { href: '/routes-list', label: 'Routes', icon: <Route size={18} /> },
  { href: '/support', label: 'Support', icon: <LifeBuoy size={18} /> },
  { href: '/billing', label: 'Billing & Invoices', icon: <Receipt size={18} /> },
  { href: '/dashboard/analytics', label: 'Transport Analytics', icon: <BarChart3 size={15} /> },
  { href: '/company-profile', label: 'Company Profile', icon: <Building size={18} /> },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
  }
  if (pathname === href) return true;
  return pathname.startsWith(href + '/');
}

function Sidebar() {
  const pathname = usePathname() ?? '';

  return (
    <aside
      style={{
        width: 240,
        backgroundColor: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        flexShrink: 0,
        height: 'calc(100vh - 60px)',
        position: 'sticky',
        top: 60,
        overflowY: 'auto',
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
      className="hide-narrow"
    >
      <div>
        {/* Brand Label inside Sidebar */}
        <div style={{ padding: '0 8px 16px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sidebar-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Corporate Portal
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
                  backgroundColor: active ? 'var(--sidebar-active-bg)' : 'transparent',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: active ? 'var(--sidebar-active-text)' : 'var(--text-muted)', display: 'flex' }}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-pill)',
                      backgroundColor: item.badge === 'Live' ? 'var(--color-success)' : 'var(--color-danger)',
                      color: '#FFFFFF',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Help Box */}
      <div
        style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-muted)',
          border: '1px solid var(--border-subtle)',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>AdhocX ETS v2.0</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hyderabad Enterprise Operations</div>
      </div>
    </aside>
  );
}

function TopBar() {
  const { user, corporateRole, logout, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setNotificationsLoading(true);
    setNotificationError(null);
    try {
      const result = await notificationsApi.list();
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : 'Unable to load notifications.',
      );
    } finally {
      if (showLoading) setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    const refreshNotifications = () => void loadNotifications();
    void loadNotifications(true);
    const interval = window.setInterval(() => void loadNotifications(), 20000);
    window.addEventListener('adhocx:notifications-updated', refreshNotifications);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('adhocx:notifications-updated', refreshNotifications);
    };
  }, [loadNotifications, status]);

  useEffect(() => {
    if (!showNotifications) return;

    function handleOutsidePointerDown(event: PointerEvent) {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowNotifications(false);
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showNotifications]);

  async function handleMarkNotificationRead(notification: InAppNotificationItem) {
    if (notification.isRead) return;
    setNotificationError(null);
    try {
      await notificationsApi.markRead(notification.id);
      setNotifications((current) =>
        current.map((item) => item.id === notification.id ? { ...item, isRead: true } : item),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : 'Unable to mark this notification as read.',
      );
    }
  }

  async function handleMarkAllNotificationsRead() {
    setMarkingAllRead(true);
    setNotificationError(null);
    try {
      await notificationsApi.markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : 'Unable to mark notifications as read.',
      );
    } finally {
      setMarkingAllRead(false);
    }
  }

  return (
    <header
      style={{
        height: 60,
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        gap: 16,
        transition: 'background-color 0.2s ease, border-color 0.2s ease',
      }}
    >
      {/* Left: Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img
            src="/adhocx_icon.svg"
            alt="AdhocX"
            style={{
              width: 30,
              height: 30,
              borderRadius: '6px',
              display: 'block',
            }}
          />
          <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Adhoc<span style={{ color: '#FF5F09', fontWeight: 900 }}>X</span>
          </span>
        </Link>

      </div>

      {/* Middle: Global Omnisearch */}
      <div style={{ flex: 1, maxWidth: 440, position: 'relative' }} className="hide-narrow">
        <Search
          size={15}
          color="var(--text-muted)"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Search employees, trips, drivers..."
          style={{
            width: '100%',
            height: 36,
            paddingLeft: 36,
            paddingRight: 12,
            backgroundColor: 'var(--bg-surface-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            fontSize: 13,
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'all 0.15s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
            e.currentTarget.style.borderColor = 'var(--brand-primary)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(var(--brand-primary-rgb), 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-surface-muted)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      {/* Right: Actions, Alerts, ThemeToggle, User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Notification Bell with Badge */}
        <div style={{ position: 'relative' }} ref={notificationDropdownRef}>
          <button
            type="button"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
            aria-haspopup="dialog"
            aria-expanded={showNotifications}
            aria-controls="corporate-notification-panel"
            onClick={() => setShowNotifications((isOpen) => !isOpen)}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              padding: 0,
              cursor: 'pointer',
              backgroundColor: showNotifications ? 'var(--brand-primary-subtle)' : 'var(--bg-surface-muted)',
              border: `1px solid ${showNotifications ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
              boxShadow: showNotifications ? '0 0 0 3px var(--focus-ring)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bell size={16} color={showNotifications ? 'var(--brand-primary)' : 'var(--text-secondary)'} />
            {unreadCount > 0 && (
              <span
                aria-live="polite"
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  minWidth: 17,
                  height: 17,
                  padding: '0 3px',
                  boxSizing: 'border-box',
                  borderRadius: 10,
                  backgroundColor: 'var(--color-danger, #DC2626)',
                  color: '#FFFFFF',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <section
              id="corporate-notification-panel"
              role="dialog"
              aria-label="Notifications"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 'min(380px, calc(100vw - 32px))',
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'min(480px, calc(100vh - 84px))',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 100,
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                backgroundColor: 'var(--bg-surface)',
                boxShadow: 'var(--shadow-elevated)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  padding: '13px 15px',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-muted)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 150px' }}>
                  <Bell size={16} color="var(--brand-primary)" />
                  <strong style={{ color: 'var(--text-primary)', fontSize: 14 }}>Notifications</strong>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        borderRadius: 999,
                        padding: '3px 7px',
                        color: 'var(--brand-primary)',
                        backgroundColor: 'var(--color-info-bg)',
                        fontSize: 11,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 'auto' }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleMarkAllNotificationsRead()}
                      disabled={markingAllRead}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        border: 0,
                        borderRadius: 6,
                        padding: '6px 7px',
                        color: 'var(--brand-primary)',
                        backgroundColor: 'transparent',
                        font: 'inherit',
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        cursor: markingAllRead ? 'wait' : 'pointer',
                      }}
                    >
                      <CheckCheck size={14} />
                      Mark all as read
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Close notifications"
                    onClick={() => setShowNotifications(false)}
                    style={{
                      display: 'grid',
                      width: 28,
                      height: 28,
                      placeItems: 'center',
                      border: 0,
                      borderRadius: 6,
                      color: 'var(--text-muted)',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {notificationError && (
                <div
                  role="alert"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '9px 14px',
                    color: 'var(--color-danger)',
                    backgroundColor: 'var(--color-danger-bg)',
                    fontSize: 12,
                  }}
                >
                  <span>{notificationError}</span>
                  <button
                    type="button"
                    onClick={() => void loadNotifications(true)}
                    style={{
                      border: 0,
                      padding: 0,
                      color: 'inherit',
                      backgroundColor: 'transparent',
                      font: 'inherit',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}

              <div style={{ overflowY: 'auto', minHeight: 0 }}>
                {notificationsLoading && notifications.length === 0 ? (
                  <p role="status" style={{ margin: 0, padding: 24, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                    Loading notifications…
                  </p>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '32px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    <Bell size={26} style={{ opacity: 0.35 }} />
                    <p style={{ margin: '8px 0 0', fontSize: 13, fontWeight: 600 }}>
                      {notificationError ? 'Notifications are unavailable' : 'No notifications yet'}
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      aria-label={`${notification.isRead ? 'Read' : 'Unread'} notification: ${notification.title}`}
                      onClick={() => void handleMarkNotificationRead(notification)}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'flex-start',
                        gap: 10,
                        border: 0,
                        borderBottom: '1px solid var(--border-subtle)',
                        padding: '12px 14px',
                        color: 'var(--text-primary)',
                        backgroundColor: notification.isRead ? 'transparent' : 'rgba(var(--brand-primary-rgb), 0.06)',
                        font: 'inherit',
                        textAlign: 'left',
                        cursor: notification.isRead ? 'default' : 'pointer',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: 8,
                          height: 8,
                          flex: '0 0 8px',
                          marginTop: 5,
                          borderRadius: '50%',
                          backgroundColor: notification.isRead ? 'var(--border-strong)' : 'var(--brand-primary)',
                        }}
                      />
                      <span style={{ display: 'block', minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <strong style={{ fontSize: 12, fontWeight: notification.isRead ? 600 : 700 }}>
                            {notification.title}
                          </strong>
                          <span
                            style={{
                              flexShrink: 0,
                              color: notification.isRead ? 'var(--text-muted)' : 'var(--brand-primary)',
                              fontSize: 10,
                              fontWeight: 600,
                            }}
                          >
                            {notification.isRead ? 'Read' : 'Unread'}
                          </span>
                        </span>
                        <span
                          style={{
                            display: 'block',
                            marginTop: 4,
                            color: 'var(--text-secondary)',
                            fontSize: 12,
                            lineHeight: 1.45,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {notification.body}
                        </span>
                        <time
                          dateTime={notification.createdAt}
                          style={{
                            display: 'block',
                            marginTop: 6,
                            color: 'var(--text-muted)',
                            fontSize: 10,
                          }}
                        >
                          {formatNotificationDateTime(notification.createdAt)}
                        </time>
                      </span>
                    </button>
                  ))
                )}
              </div>
              <Link
                href="/notifications"
                onClick={() => setShowNotifications(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderTop: '1px solid var(--border-subtle)',
                  padding: '12px 14px',
                  color: 'var(--brand-primary)',
                  backgroundColor: 'var(--bg-surface)',
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                View All Notifications
              </Link>
            </section>
          )}
        </div>

        <CorporateFaqDropdown />

        {/* Theme Toggle (Light / Black & Gray Dark / System) */}
        <ThemeToggle />

        <div style={{ height: 20, width: 1, backgroundColor: 'var(--border-subtle)' }} />

        {/* User Initials Avatar & Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'var(--brand-action)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              RK
            </div>
            <div className="hide-narrow" style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {user?.fullName || 'Rakesh Kumar'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {corporateRole ? CORPORATE_ROLE_LABELS[corporateRole] : 'Corporate Admin'}
              </div>
            </div>
          </div>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 48,
                width: 200,
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-elevated)',
                border: '1px solid var(--border-subtle)',
                padding: '6px',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <button
                onClick={() => void logout()}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'var(--color-danger, #DC2626)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function formatNotificationDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const onLogin = pathname.startsWith('/login');

  if (onLogin) {
    return <SessionProvider>{children}</SessionProvider>;
  }

  return (
    <SessionProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', transition: 'background-color 0.2s ease' }}>
        <TopBar />
        <div style={{ display: 'flex', flex: 1 }}>
          <Sidebar />
          <main style={{ flex: 1, minWidth: 0, padding: '24px 32px' }}>
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}

export function RequirePermission({
  permission: _p,
  children,
}: {
  permission: CorporatePermission;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
