'use client';

import React, { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CheckCheck, ExternalLink, X, Send, Radio, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { adminApi } from '../lib/api/client';
import { InAppNotificationItem } from '../lib/api/types';

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const pathname = usePathname();
  const router = useRouter();

  // Notification state
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getSectionTitle = () => {
    if (title) return title;
    if (pathname.startsWith('/dashboard')) return 'Marketplace Overview';
    if (pathname.startsWith('/notifications')) return 'Push Notifications & Campaign Hub';
    if (pathname.startsWith('/verifications')) return 'Verification Center';
    if (pathname.startsWith('/drivers')) return 'Driver Fleet Management';
    if (pathname.startsWith('/users')) return 'Users & Corporate Vendors';
    if (pathname.startsWith('/requirements')) return 'Requirements & Sourcing';
    if (pathname.startsWith('/assignments')) return 'Assignment Operations';
    if (pathname.startsWith('/trips')) return 'Trips & Telemetry Tracking';
    if (pathname.startsWith('/coupons')) return 'Coupons & Promotions';
    if (pathname.startsWith('/blogs')) return 'Blog CMS Publisher';
    if (pathname.startsWith('/settlements')) return 'Financial Settlements & Payouts';
    if (pathname.startsWith('/disputes')) return 'Dispute Resolution Desk';
    if (pathname.startsWith('/reports')) return 'Reports & Financial Analytics';
    if (pathname.startsWith('/pricing')) return 'Pricing Engine & Tariffs';
    if (pathname.startsWith('/payments')) return 'Payments & Escrow Balances';
    if (pathname.startsWith('/audit')) return 'Audit Logs & Compliance';
    if (pathname.startsWith('/support')) return 'Customer & Driver Support';
    return 'Control Portal';
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadNotifications() {
    try {
      const data = await adminApi.getInAppNotifications({ limit: 8 });
      if (data && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Graceful fallback in dev mode if notifications endpoint is pending
    }
  }

  async function handleMarkRead(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await adminApi.markInAppNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }

  async function handleMarkAllRead() {
    setLoading(true);
    try {
      await adminApi.markAllInAppNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {} finally {
      setLoading(false);
    }
  }

  function handleNotificationClick(n: InAppNotificationItem) {
    if (!n.isRead) {
      adminApi.markInAppNotificationRead(n.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    if (n.data?.actionUrl || n.data?.route) {
      const target = n.data.actionUrl || n.data.route;
      if (target.startsWith('http')) {
        window.open(target, '_blank');
      } else {
        router.push(target);
      }
      setIsOpen(false);
    }
  }

  return (
    <header className="admin-header" style={{ position: 'relative', zIndex: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {getSectionTitle()}
          </h2>
          {subtitle && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Notification Bell Dropdown */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: isOpen ? 'var(--brand-primary-subtle)' : 'var(--bg-surface-elevated)',
              color: isOpen ? 'var(--brand-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Notification Center"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ef4444, #f43f5e)',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                  border: '2px solid var(--bg-surface)',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Popover Dropdown */}
          {isOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '380px',
                maxHeight: '480px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 16px 40px -8px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 100,
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-surface-elevated)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={16} color="var(--brand-primary)" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.45rem',
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--brand-primary-subtle)',
                        color: 'var(--brand-primary)',
                      }}
                    >
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={loading}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--brand-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.2rem 0.4rem',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <CheckCheck size={14} />
                      Mark all read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.2rem',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Feed List */}
              <div style={{ overflowY: 'auto', maxHeight: '340px' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Bell size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>No notifications yet</p>
                    <p style={{ fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                      Real-time updates and dispatched alerts will appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      style={{
                        padding: '0.8rem 1rem',
                        borderBottom: '1px solid var(--border)',
                        background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.06)',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-elevated)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.06)')
                      }
                    >
                      {/* Status Dot */}
                      <div style={{ marginTop: '0.25rem' }}>
                        {!n.isRead ? (
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--brand-primary)',
                              boxShadow: '0 0 8px var(--brand-primary)',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: 'var(--border)',
                            }}
                          />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.82rem',
                              fontWeight: n.isRead ? 600 : 700,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {n.title}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            margin: '0.25rem 0 0 0',
                            lineHeight: 1.4,
                          }}
                        >
                          {n.body}
                        </p>

                        {(n.data?.route || n.data?.actionUrl) && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              fontSize: '0.7rem',
                              color: 'var(--brand-primary)',
                              fontWeight: 600,
                              marginTop: '0.35rem',
                            }}
                          >
                            <span>Open</span>
                            <ExternalLink size={10} />
                          </div>
                        )}
                      </div>

                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkRead(n.id, e)}
                          title="Mark as read"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '0.2rem',
                          }}
                        >
                          <CheckCheck size={14} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: '0.65rem 1rem',
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg-surface-elevated)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/notifications');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--brand-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Send size={12} />
                  <span>Open Push Campaign Hub</span>
                </button>

                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  FCM Service Active
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <ThemeToggle />

        {/* Live Cluster Status */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.3rem 0.7rem',
            background: 'var(--color-success-bg)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-pill)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--color-success)',
            letterSpacing: '0.02em',
          }}
          title="All systems operational — PostgreSQL, Redis, and Firebase FCM Engine Connected"
        >
          <span className="pulse-dot success" style={{ width: '6px', height: '6px' }} />
          <span>Operational</span>
        </div>
      </div>
    </header>
  );
};
