'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ContentLoadingSkeleton, PageLoadingSkeleton, SkeletonBone } from '@adhocx/ui/page-loading';
import {
  LayoutDashboard,
  Users,
  Route,
  LifeBuoy,
  Receipt,
  BarChart3,
  Bell,
  CheckCheck,
  LogOut,
  Building,
  Building2,
  CalendarX,
  Headphones,
  ShieldAlert,
  X,
  ChevronDown,
  List,
  Scale,
} from 'lucide-react';
import { SessionProvider, useSession } from '../../lib/auth/SessionContext';
import { CorporatePermission } from '../../lib/auth/permissions';
import { notificationsApi } from '../../lib/api/corporate';
import type { InAppNotificationItem } from '../../lib/api/types';
import { ThemeToggle } from '../common/ThemeToggle';

const CorporateFaqDropdown = dynamic(
  () => import('./CorporateFaqDropdown').then((mod) => mod.CorporateFaqDropdown),
  { ssr: false },
);

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { href: '/routes', label: 'Routes', icon: <Route size={18} /> },
  { href: '/employees', label: 'Employees', icon: <Users size={18} /> },
  { href: '/cancellations', label: 'Cancellation Requests', icon: <CalendarX size={18} /> },
  {
    href: '/billing',
    label: 'Billing & Invoices',
    icon: <Receipt size={18} />,
    children: [
      { href: '/billing/invoices', label: 'Invoice List', icon: <List size={16} /> },
      { href: '/billing/disputes', label: 'Billing Disputes', icon: <Scale size={16} /> },
    ],
  },
  { href: '/employee-support', label: 'Employee Support', icon: <Headphones size={18} /> },
  { href: '/support', label: 'Support', icon: <LifeBuoy size={18} /> },
  { href: '/dashboard/analytics', label: 'Transport Analytics', icon: <BarChart3 size={15} /> },
  { href: '/company-profile', label: 'Company Profile', icon: <Building size={18} /> },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  if (pathname === href) return true;
  return pathname.startsWith(href + '/');
}

function isPhoneLike(value?: string | null): boolean {
  const trimmed = (value || '').trim();
  return Boolean(trimmed) && /^[+\d\s().-]{6,}$/.test(trimmed);
}

function computeProfileInitials(companyName?: string | null, fallbackName?: string | null, email?: string | null): string {
  const label = (companyName || '').trim() || (!isPhoneLike(fallbackName) ? (fallbackName || '').trim() : '');
  if (label) {
    const parts = label.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  const mail = (email || '').trim();
  if (mail) {
    return mail[0].toUpperCase();
  }
  return 'C';
}

function Sidebar() {
  const pathname = usePathname() ?? '';
  const [billingOpen, setBillingOpen] = useState(() => pathname.startsWith('/billing'));

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
            if (item.children) {
              return (
                <div key={item.href}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Link
                      href={item.href}
                      aria-current={active && pathname === item.href ? 'page' : undefined}
                      onClick={() => setBillingOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flex: 1,
                        minWidth: 0,
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
                      <span style={{ color: active ? 'var(--sidebar-active-text)' : 'var(--text-muted)', display: 'flex', marginRight: 10 }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                    <button
                      type="button"
                      aria-label={`${billingOpen ? 'Collapse' : 'Expand'} ${item.label}`}
                      aria-expanded={billingOpen}
                      onClick={() => setBillingOpen((open) => !open)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 34,
                        height: 36,
                        marginLeft: 2,
                        border: 0,
                        borderRadius: 'var(--radius-md)',
                        color: active ? 'var(--sidebar-active-text)' : 'var(--text-muted)',
                        backgroundColor: active ? 'var(--sidebar-active-bg)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <ChevronDown
                        size={16}
                        style={{
                          transform: billingOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.15s ease',
                        }}
                      />
                    </button>
                  </div>
                  {billingOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0 4px 16px' }}>
                      {item.children.map((child) => {
                        const childActive = isActive(pathname, child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={childActive ? 'page' : undefined}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 9,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-md)',
                              textDecoration: 'none',
                              fontSize: 12,
                              fontWeight: childActive ? 600 : 500,
                              color: childActive ? 'var(--sidebar-active-text)' : 'var(--text-secondary)',
                              backgroundColor: childActive ? 'var(--sidebar-active-bg)' : 'transparent',
                              transition: 'background-color 0.15s ease, color 0.15s ease',
                            }}
                          >
                            <span style={{ color: childActive ? 'var(--sidebar-active-text)' : 'var(--text-muted)', display: 'flex' }}>
                              {child.icon}
                            </span>
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
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
    </aside>
  );
}

function TopBar() {
  const { user, tenant, tenantError, logout, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsInFlightRef = useRef(false);
  const notificationsMountedRef = useRef(true);

  useEffect(() => {
    notificationsMountedRef.current = true;
    return () => {
      notificationsMountedRef.current = false;
    };
  }, []);

  const loadNotifications = useCallback(async (showLoading = false) => {
    if (notificationsInFlightRef.current) return;
    notificationsInFlightRef.current = true;
    if (showLoading) setNotificationsLoading(true);
    setNotificationError(null);
    try {
      const result = await notificationsApi.list();
      if (!notificationsMountedRef.current) return;
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
    } catch (error) {
      if (!notificationsMountedRef.current) return;
      setNotificationError(
        error instanceof Error ? error.message : 'Unable to load notifications.',
      );
    } finally {
      notificationsInFlightRef.current = false;
      if (showLoading && notificationsMountedRef.current) {
        setNotificationsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    const refreshNotifications = () => void loadNotifications();
    void loadNotifications(true);

    let interval: number | null = null;
    const stopPolling = () => {
      if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }
    };
    const startPolling = () => {
      stopPolling();
      if (typeof document !== 'undefined' && document.hidden) return;
      interval = window.setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        void loadNotifications();
      }, 20000);
    };
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        stopPolling();
      } else {
        void loadNotifications();
        startPolling();
      }
    };

    startPolling();
    window.addEventListener('adhocx:notifications-updated', refreshNotifications);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopPolling();
      window.removeEventListener('adhocx:notifications-updated', refreshNotifications);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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

  useEffect(() => {
    if (!showUserMenu) return;

    function handleOutsidePointerDown(event: PointerEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowUserMenu(false);
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showUserMenu]);

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

  const companyName = tenant?.name?.trim() || tenant?.legalEntityName?.trim() || '';
  const nonPhoneUserName = !isPhoneLike(user?.fullName) ? (user?.fullName?.trim() || '') : '';
  const profileLoading = status === 'ready' && !tenant && !tenantError && !nonPhoneUserName;
  const profileDisplayName = companyName || nonPhoneUserName || user?.email?.trim() || 'Company Profile';
  const profileInitials = computeProfileInitials(companyName, nonPhoneUserName, user?.email);
  const profileSubtitle =
    [tenant?.industry?.trim(), tenant?.city?.trim()].filter(Boolean).join(' · ') ||
    tenant?.primaryContactEmail?.trim() ||
    user?.email?.trim() ||
    tenant?.code?.trim() ||
    '';

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
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--brand-primary)' }}>
            Adhoc<span style={{ color: '#FF5F09', fontWeight: 900 }}>X</span>
          </span>
        </Link>

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
                  <div style={{ padding: 12 }}>
                    <ContentLoadingSkeleton kind="list" count={4} label="Loading notifications…" />
                  </div>
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

        {/* Company Profile Avatar & Dropdown */}
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            aria-label={profileLoading ? 'Company profile' : `${profileDisplayName} profile menu`}
            onClick={() => setShowUserMenu((open) => !open)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              padding: 0,
              textAlign: 'left',
            }}
          >
            {profileLoading ? (
              <>
                <SkeletonBone style={{ width: 36, height: 36, borderRadius: '50%' }} />
                <div className="hide-narrow">
                  <SkeletonBone style={{ width: 88, height: 14, borderRadius: 6 }} />
                </div>
              </>
            ) : (
              <>
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
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    flexShrink: 0,
                  }}
                >
                  {profileInitials}
                </div>
                <div className="hide-narrow" style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {profileDisplayName}
                  </div>
                </div>
              </>
            )}
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 48,
                width: 228,
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-elevated)',
                border: '1px solid var(--border-subtle)',
                padding: '6px',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {profileDisplayName}
                </div>
                {profileSubtitle && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {profileSubtitle}
                  </div>
                )}
              </div>
              <Link
                href="/company-profile"
                role="menuitem"
                onClick={() => setShowUserMenu(false)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: '4px',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: 'none',
                  marginTop: 2,
                }}
              >
                <Building2 size={14} />
                <span>Company Profile</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowUserMenu(false);
                  void logout();
                }}
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

function PortalShellFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { status, logout } = useSession();

  useEffect(() => {
    if (status === 'anonymous' && !pathname.startsWith('/login')) {
      const target = pathname && pathname !== '/' ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.replace(target);
    }
  }, [pathname, router, status]);

  if (status === 'loading' || status === 'anonymous') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-canvas)',
          padding: '24px 32px',
        }}
      >
        <PageLoadingSkeleton />
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: 'var(--bg-canvas)',
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            padding: '28px 32px',
            borderRadius: 12,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            boxShadow: 'var(--shadow-elevated)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger, #DC2626)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            Access Denied — Corporate account required
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Your signed-in account does not have Corporate Portal access or is not linked to a corporate tenant. Please sign out and sign in with an authorized corporate account.
          </p>
          <button
            type="button"
            onClick={() => void logout()}
            style={{
              marginTop: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: 'var(--color-danger, #DC2626)',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', transition: 'background-color 0.2s ease' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, padding: '24px 32px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const onLogin = pathname.startsWith('/login');

  if (onLogin) {
    return <SessionProvider>{children}</SessionProvider>;
  }

  return (
    <SessionProvider>
      <PortalShellFrame>{children}</PortalShellFrame>
    </SessionProvider>
  );
}

export function RequirePermission({
  permission,
  fallback,
  children,
}: {
  permission: CorporatePermission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { status, can } = useSession();
  if (status === 'loading') return null;
  if (!can(permission)) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <div
        role="alert"
        className="surface-card"
        style={{
          padding: '28px 24px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <ShieldAlert size={22} color="var(--color-danger, #DC2626)" />
        <strong style={{ color: 'var(--text-primary)', fontSize: 15 }}>Permission required</strong>
        <span style={{ fontSize: 13 }}>
          Your corporate role does not include the <code>{permission}</code> permission needed to access this view.
        </span>
      </div>
    );
  }
  return <>{children}</>;
}
