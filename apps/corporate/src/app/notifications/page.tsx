'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  CarFront,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  FileText,
  Headphones,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { notificationsApi } from '../../lib/api/corporate';
import type { InAppNotificationItem } from '../../lib/api/types';
import styles from './Notifications.module.css';

type NotificationCategory =
  | 'Trip Notifications'
  | 'Employee Notifications'
  | 'Employee Support'
  | 'Billing Notifications'
  | 'Contract Notifications'
  | 'Approval Notifications'
  | 'General';
type ReadTab = 'All' | 'Unread' | 'Read';
type DateFilter = 'any' | 'today' | '7' | '30' | 'custom';

const PAGE_SIZE = 20;
const CATEGORY_OPTIONS: NotificationCategory[] = [
  'Trip Notifications',
  'Employee Notifications',
  'Employee Support',
  'Billing Notifications',
  'Contract Notifications',
  'Approval Notifications',
  'General',
];

const CATEGORY_STYLES: Record<NotificationCategory, { icon: React.ReactNode; className: string }> = {
  'Trip Notifications': { icon: <CarFront size={17} />, className: styles.tripIcon },
  'Employee Notifications': { icon: <Users size={17} />, className: styles.employeeIcon },
  'Employee Support': { icon: <Headphones size={17} />, className: styles.supportIcon },
  'Billing Notifications': { icon: <Receipt size={17} />, className: styles.billingIcon },
  'Contract Notifications': { icon: <FileText size={17} />, className: styles.contractIcon },
  'Approval Notifications': { icon: <ClipboardList size={17} />, className: styles.approvalIcon },
  General: { icon: <Bell size={17} />, className: styles.generalIcon },
};

const ALLOWED_DESTINATIONS = new Set([
  '/dashboard',
  '/employees',
  '/employee-support',
  '/billing',
  '/billing/invoices',
  '/routes-list',
  '/cancellations',
  '/support',
  '/rosters',
  '/bookings',
  '/live',
  '/safety',
  '/reports',
  '/company-profile',
  '/offices',
  '/help',
  '/settings',
]);

function getCategory(notification: InAppNotificationItem): NotificationCategory {
  const type = notification.type.toUpperCase();
  const text = `${notification.title} ${notification.body}`.toLocaleLowerCase();

  if (['TRIP_STATUS', 'TRIP_OFFER', 'TRIP_ASSIGNED'].includes(type)) {
    return 'Trip Notifications';
  }
  if (type.includes('SUPPORT') || type.includes('COMPLAINT') || /complaint|employee support|support ticket/.test(text)) {
    return 'Employee Support';
  }
  if (/invoice|billing|bill due|payment due/.test(text)) return 'Billing Notifications';
  if (/contract|service period|agreement|renewal/.test(text)) return 'Contract Notifications';
  if (type === 'REQUIREMENT_UPDATE' || /approval|approved|rejected|roster request|booking request/.test(text)) {
    return 'Approval Notifications';
  }
  if (/employee|staff member|directory|imported/.test(text)) return 'Employee Notifications';
  if (/\btrip\b|\bcab\b|\bdriver\b/.test(text)) return 'Trip Notifications';
  return 'General';
}

function getDestination(notification: InAppNotificationItem): string | null {
  const candidate = notification.data?.actionUrl ?? notification.data?.route;
  if (typeof candidate !== 'string' || !candidate.trim()) return null;

  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const isInvoiceDetail = /^\/billing\/invoices\/[^/]+$/.test(path);
    if (!ALLOWED_DESTINATIONS.has(path) && !isInvoiceDetail) return null;
    return `${path}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function isSameLocalDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function dispatchNotificationChange() {
  window.dispatchEvent(new Event('adhocx:notifications-updated'));
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [apiPage, setApiPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReadTab>('All');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('any');
  const [customDate, setCustomDate] = useState('');

  const loadFirstPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await notificationsApi.list(PAGE_SIZE, 1);
      setNotifications(result.notifications);
      setUnreadCount(result.unreadCount);
      setTotal(result.total);
      setApiPage(result.page ?? 1);
      setHasMore((result.page ?? 1) * (result.limit ?? PAGE_SIZE) < result.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const now = new Date();
    const startDate = dateFilter === '7'
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      : dateFilter === '30'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
        : null;

    return notifications.filter((notification) => {
      const category = getCategory(notification);
      const matchesTab = activeTab === 'All'
        || (activeTab === 'Unread' && !notification.isRead)
        || (activeTab === 'Read' && notification.isRead);
      const matchesQuery = !query
        || notification.title.toLocaleLowerCase().includes(query)
        || notification.body.toLocaleLowerCase().includes(query);
      const matchesCategory = !categoryFilter || category === categoryFilter;
      const createdAt = new Date(notification.createdAt);
      let matchesDate = true;
      if (dateFilter === 'today') matchesDate = !Number.isNaN(createdAt.getTime()) && isSameLocalDay(createdAt, now);
      if (startDate) matchesDate = !Number.isNaN(createdAt.getTime()) && createdAt >= startDate;
      if (dateFilter === 'custom') {
        matchesDate = Boolean(customDate)
          && !Number.isNaN(createdAt.getTime())
          && isSameLocalDay(createdAt, new Date(`${customDate}T00:00:00`));
      }
      return matchesTab && matchesQuery && matchesCategory && matchesDate;
    });
  }, [notifications, activeTab, search, categoryFilter, dateFilter, customDate]);

  async function handleLoadMore() {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setActionError(null);
    const nextPage = apiPage + 1;
    try {
      const result = await notificationsApi.list(PAGE_SIZE, nextPage);
      setNotifications((current) => {
        const knownIds = new Set(current.map((notification) => notification.id));
        return [
          ...current,
          ...result.notifications.filter((notification) => !knownIds.has(notification.id)),
        ];
      });
      setUnreadCount(result.unreadCount);
      setTotal(result.total);
      setApiPage(result.page ?? nextPage);
      setHasMore((result.page ?? nextPage) * (result.limit ?? PAGE_SIZE) < result.total);
    } catch (loadError) {
      setActionError(loadError instanceof Error ? loadError.message : 'Unable to load more notifications.');
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleMarkRead(notification: InAppNotificationItem) {
    if (notification.isRead || busyIds.has(notification.id)) return;
    setActionError(null);
    setBusyIds((current) => new Set(current).add(notification.id));
    try {
      await notificationsApi.markRead(notification.id);
      setNotifications((current) => current.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item,
      ));
      setUnreadCount((current) => Math.max(0, current - 1));
      dispatchNotificationChange();
    } catch (readError) {
      setActionError(readError instanceof Error ? readError.message : 'Unable to mark this notification as read.');
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
    }
  }

  async function handleActivate(notification: InAppNotificationItem) {
    if (busyIds.has(notification.id)) return;
    setActionError(null);
    setBusyIds((current) => new Set(current).add(notification.id));
    try {
      if (!notification.isRead) {
        await notificationsApi.markRead(notification.id);
        setNotifications((current) => current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ));
        setUnreadCount((current) => Math.max(0, current - 1));
        dispatchNotificationChange();
      }
      const destination = getDestination(notification);
      if (destination) router.push(destination);
    } catch (readError) {
      setActionError(readError instanceof Error ? readError.message : 'Unable to open this notification.');
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
    }
  }

  async function handleMarkAllRead() {
    if (!unreadCount || isMarkingAllRead) return;
    setActionError(null);
    setIsMarkingAllRead(true);
    try {
      await notificationsApi.markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      dispatchNotificationChange();
    } catch (readError) {
      setActionError(readError instanceof Error ? readError.message : 'Unable to mark notifications as read.');
    } finally {
      setIsMarkingAllRead(false);
    }
  }

  async function handleDelete(notification: InAppNotificationItem) {
    if (busyIds.has(notification.id)) return;
    const shouldDelete = window.confirm(`Delete "${notification.title}" from your notifications?`);
    if (!shouldDelete) return;

    setActionError(null);
    setBusyIds((current) => new Set(current).add(notification.id));
    try {
      const result = await notificationsApi.delete(notification.id);
      if (!result.success || result.deletedCount === 0) {
        throw new Error('This notification could not be deleted. Refresh the list and try again.');
      }
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      setTotal((current) => Math.max(0, current - 1));
      setUnreadCount((current) => result.unreadCount ?? Math.max(0, current - (notification.isRead ? 0 : 1)));
      dispatchNotificationChange();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this notification.');
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(notification.id);
        return next;
      });
    }
  }

  async function handleClearAll() {
    if (!total || isClearingAll) return;
    const shouldClear = window.confirm('Clear all notifications? This cannot be undone.');
    if (!shouldClear) return;

    setActionError(null);
    setIsClearingAll(true);
    try {
      const result = await notificationsApi.clearAll();
      if (!result.success) throw new Error('Notifications could not be cleared. Please try again.');
      setNotifications([]);
      setTotal(0);
      setUnreadCount(result.unreadCount ?? 0);
      setApiPage(1);
      setHasMore(false);
      dispatchNotificationChange();
    } catch (clearError) {
      setActionError(clearError instanceof Error ? clearError.message : 'Unable to clear notifications.');
    } finally {
      setIsClearingAll(false);
    }
  }

  function clearFilters() {
    setSearch('');
    setCategoryFilter('');
    setDateFilter('any');
    setCustomDate('');
    setActiveTab('All');
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>CORPORATE PORTAL <span>/</span> UPDATES</div>
          <h1>Notifications</h1>
          <p>Stay updated on your company's transportation activities.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void handleClearAll()}
            disabled={total === 0 || isClearingAll}
          >
            <Trash2 size={15} /> {isClearingAll ? 'Clearing…' : 'Clear all'}
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void handleMarkAllRead()}
            disabled={unreadCount === 0 || isMarkingAllRead}
          >
            <CheckCheck size={16} /> {isMarkingAllRead ? 'Marking…' : 'Mark All as Read'}
          </button>
        </div>
      </header>

      <section className={styles.summaryCard} aria-label="Notification summary">
        <span className={styles.summaryIcon}><Bell size={19} /></span>
        <span className={styles.summaryText}>
          <strong>{isLoading ? '—' : unreadCount}</strong>
          <span>Unread notifications</span>
        </span>
        <span className={styles.summaryDivider} />
        <span className={styles.totalCount}>{isLoading ? 'Loading' : `${total} total notifications`}</span>
      </section>

      <section className={styles.listPanel} aria-label="Notifications list">
        <div className={styles.tabsRow}>
          <div className={styles.tabs} role="tablist" aria-label="Notification read status">
            {(['All', 'Unread', 'Read'] as ReadTab[]).map((tab) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                key={tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tab === 'Unread' && unreadCount > 0 && <span className={styles.tabCount}>{unreadCount}</span>}
              </button>
            ))}
          </div>
          <span className={styles.resultsCount}>
            {isLoading ? 'Loading…' : `Showing ${filteredNotifications.length} of ${notifications.length} loaded`}
          </span>
        </div>

        <div className={styles.filters}>
          <label className={styles.searchBox}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search title or description"
              aria-label="Search notifications"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className={styles.selectWrap}>
            <span className={styles.srOnly}>Filter by category</span>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map((category) => <option value={category} key={category}>{category}</option>)}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
          <label className={styles.selectWrap}>
            <span className={styles.srOnly}>Filter by date</span>
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}>
              <option value="any">Any date</option>
              <option value="today">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="custom">Choose date</option>
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </label>
          {dateFilter === 'custom' && (
            <label className={styles.customDate}>
              <CalendarDays size={15} aria-hidden="true" />
              <span className={styles.srOnly}>Choose notification date</span>
              <input type="date" value={customDate} onChange={(event) => setCustomDate(event.target.value)} />
            </label>
          )}
        </div>

        {(error || actionError) && (
          <div className={styles.errorBanner} role="alert">
            <CircleAlert size={16} />
            <span>{error || actionError}</span>
            {error && <button type="button" onClick={() => void loadFirstPage()}><RefreshCw size={14} /> Retry</button>}
          </div>
        )}

        {isLoading ? (
          <div className={styles.stateBlock} role="status"><span className={styles.spinner} /> Loading notifications…</div>
        ) : error ? (
          <div className={styles.stateBlock}>
            <Bell size={28} />
            <strong>Notifications are unavailable</strong>
            <span>Try again to reload your notifications.</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.stateBlock}>
            <Bell size={28} />
            <strong>No notifications yet</strong>
            <span>Company transportation updates will appear here.</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className={styles.stateBlock}>
            <Search size={25} />
            <strong>No matching notifications</strong>
            <span>Try a different search or clear the selected filters.</span>
            <button type="button" className={styles.linkButton} onClick={clearFilters}>Clear filters</button>
          </div>
        ) : (
          <div className={styles.notificationList}>
            {filteredNotifications.map((notification) => {
              const category = getCategory(notification);
              const categoryStyle = CATEGORY_STYLES[category];
              const canNavigate = Boolean(getDestination(notification));
              const isBusy = busyIds.has(notification.id);
              return (
                <article
                  className={`${styles.notificationRow} ${notification.isRead ? '' : styles.unreadRow}`}
                  key={notification.id}
                >
                  <span className={`${styles.categoryIcon} ${categoryStyle.className}`} aria-hidden="true">
                    {categoryStyle.icon}
                  </span>
                  <button
                    type="button"
                    className={styles.notificationContent}
                    onClick={() => void handleActivate(notification)}
                    disabled={isBusy}
                    aria-label={`${notification.isRead ? 'Read' : 'Unread'}: ${notification.title}${canNavigate ? ', open destination' : ', mark as read'}`}
                  >
                    <span className={styles.notificationHeading}>
                      <strong>{notification.title}</strong>
                      {!notification.isRead && <span className={styles.unreadLabel}><span />Unread</span>}
                    </span>
                    <span className={styles.description}>{notification.body}</span>
                    <span className={styles.metadata}>
                      <span className={styles.categoryLabel}>{category}</span>
                      <time dateTime={notification.createdAt}>{formatDateTime(notification.createdAt)}</time>
                    </span>
                  </button>
                  <div className={styles.rowActions}>
                    {!notification.isRead && (
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label={`Mark ${notification.title} as read`}
                        title="Mark as read"
                        onClick={() => void handleMarkRead(notification)}
                        disabled={isBusy}
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`Delete ${notification.title}`}
                      title="Delete notification"
                      onClick={() => void handleDelete(notification)}
                      disabled={isBusy}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!isLoading && !error && hasMore && (
          <div className={styles.loadMore}>
            <button type="button" className={styles.secondaryButton} onClick={() => void handleLoadMore()} disabled={isLoadingMore}>
              <RefreshCw size={15} className={isLoadingMore ? styles.spin : ''} />
              {isLoadingMore ? 'Loading more…' : 'Load More Notifications'}
            </button>
            <span>{notifications.length} of {total} loaded</span>
          </div>
        )}
        {!isLoading && !error && !hasMore && total > 0 && notifications.length > PAGE_SIZE && (
          <p className={styles.endOfList}>All {notifications.length} notifications are loaded.</p>
        )}
      </section>
    </main>
  );
}
