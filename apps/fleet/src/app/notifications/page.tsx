'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { FleetNotificationDto } from '@adhocx/contracts';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { fleetApi } from '../../lib/api/client';
import { TablePageSkeleton } from '../../components/common/Skeletons';
import { EmptyState, ErrorState } from '../../components/common/StatePrimitives';

export default function FleetNotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FleetNotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fleetApi.listNotifications({
        unreadOnly,
        page,
        limit: 20,
      });
      setItems(res.items || []);
      setUnreadCount(res.unreadCount || 0);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to fetch fleet notifications.');
    } finally {
      setLoading(false);
    }
  }, [page, unreadOnly]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const emitBadgeRefresh = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('fleet:notifications-updated'));
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fleetApi.markNotificationRead(id);
      emitBadgeRefresh();
      await loadNotifications();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to mark notification as read.');
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await fleetApi.markAllNotificationsRead();
      emitBadgeRefresh();
      await loadNotifications();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to mark notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        className="fleet-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Bell size={18} color="var(--brand-primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            {unreadCount} unread notification{unreadCount === 1 ? '' : 's'}
          </span>
          <div style={{ display: 'flex', gap: '0.35rem', marginLeft: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setUnreadOnly(false);
                setPage(1);
              }}
              style={{
                padding: '0.35rem 0.7rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: !unreadOnly ? 'var(--brand-primary)' : 'var(--bg-surface)',
                color: !unreadOnly ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setUnreadOnly(true);
                setPage(1);
              }}
              style={{
                padding: '0.35rem 0.7rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: unreadOnly ? 'var(--brand-primary)' : 'var(--bg-surface)',
                color: unreadOnly ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Unread Only
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={markingAll || unreadCount === 0}
          onClick={() => void handleMarkAllRead()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            fontWeight: 600,
            fontSize: '0.825rem',
            cursor: unreadCount === 0 ? 'not-allowed' : 'pointer',
            opacity: unreadCount === 0 ? 0.5 : 1,
          }}
        >
          <CheckCheck size={16} />
          <span>{markingAll ? 'Updating...' : 'Mark all read'}</span>
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={loadNotifications} />}

      {loading ? (
        <TablePageSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title={unreadOnly ? 'All Caught Up' : 'No Notifications Yet'}
          description="Driver joins, Fleet Code rotations, support replies, and incentive milestones will appear here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.map((n) => (
            <div
              key={n.id}
              className="fleet-card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                borderLeft: n.isRead ? '1px solid var(--border-subtle)' : '4px solid var(--brand-primary)',
                opacity: n.isRead ? 0.85 : 1,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {!n.isRead && (
                    <span
                      aria-label="Unread"
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '9999px',
                        background: 'var(--brand-primary)',
                        display: 'inline-block',
                      }}
                    />
                  )}
                  <strong style={{ fontSize: '0.9rem' }}>{n.title}</strong>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '0.12rem 0.45rem',
                      borderRadius: '9999px',
                      background: 'var(--bg-surface-muted)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {n.eventType.replace(/_/g, ' ')}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {n.message}
                </p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                {n.actionUrl && n.actionUrl.startsWith('/') && (
                  <Link
                    href={n.actionUrl}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--brand-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Open</span>
                    <ExternalLink size={12} />
                  </Link>
                )}

                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => void handleMarkRead(n.id)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                      background: 'transparent',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Page {page} of {totalPages}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
