'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Inbox, Lock, RefreshCw, WifiOff } from 'lucide-react';
import { ApiError } from '../../lib/api/client';
import { Button } from './Button';

const boxStyle: React.CSSProperties = {
  padding: 'var(--space-12) var(--space-6)',
  textAlign: 'center',
  backgroundColor: 'var(--bg-surface-elevated)',
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--border-subtle)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--space-2)',
};

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div style={boxStyle} role="status" aria-live="polite">
      <RefreshCw size={22} className="spin" color="var(--brand-blue-400)" />
      <span className="small-text muted">{label}</span>
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div style={boxStyle}>
      <Inbox size={32} color="var(--text-muted)" />
      <h3 className="h4-text">{title}</h3>
      {message && <p className="small-text muted" style={{ maxWidth: 520 }}>{message}</p>}
      {action}
    </div>
  );
}

export function UnauthorizedState({ message }: { message?: string }) {
  return (
    <div style={boxStyle}>
      <Lock size={30} color="var(--brand-amber-500)" />
      <h3 className="h4-text">You do not have access to this</h3>
      <p className="small-text muted" style={{ maxWidth: 520 }}>
        {message ?? 'Your corporate role or office scope does not include this screen. Ask your corporate Super Admin to change your role.'}
      </p>
    </div>
  );
}

/** Error view. A 403 renders as the unauthorized state; a network failure says so explicitly. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof ApiError && error.status === 403) {
    return <UnauthorizedState message={error.message} />;
  }
  const network = error instanceof ApiError && error.status === 0;
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  return (
    <div style={{ ...boxStyle, borderColor: 'var(--color-danger-border)' }} role="alert">
      {network ? <WifiOff size={30} color="#F87171" /> : <AlertTriangle size={30} color="#F87171" />}
      <h3 className="h4-text">{network ? 'Cannot reach AdhocX' : 'Could not load this data'}</h3>
      <p className="small-text muted" style={{ maxWidth: 560 }}>{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" leftIcon={<RefreshCw size={13} />} onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Inline banner for a failed mutation or a failed background refresh. */
export function InlineAlert({ tone = 'danger', children }: { tone?: 'danger' | 'warning' | 'success' | 'info'; children: React.ReactNode }) {
  const map = {
    danger: ['var(--color-danger-bg)', 'var(--color-danger-border)', '#F87171'],
    warning: ['var(--color-warning-bg)', 'var(--color-warning-border)', '#FBBF24'],
    success: ['var(--color-success-bg)', 'var(--color-success-border)', '#4ADE80'],
    info: ['var(--color-info-bg)', 'var(--color-info-border)', '#93C5FD'],
  }[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      style={{
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: map[0],
        border: `1px solid ${map[1]}`,
        color: map[2],
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Request failed';
}

/**
 * "Updated 12s ago" stamp for live data. `asOf` is the server stamp when the endpoint returns one,
 * otherwise the time the response arrived. Shows a stale warning when the last refresh failed.
 */
export function RefreshStamp({
  asOf,
  refreshing,
  error,
  onRefresh,
  live,
}: {
  asOf: string | Date | null | undefined;
  refreshing?: boolean;
  error?: unknown;
  onRefresh?: () => void;
  live?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const at = asOf ? new Date(asOf) : null;
  const age = at ? Math.max(0, Math.round((now - at.getTime()) / 1000)) : null;
  const ageLabel = age === null ? 'never' : age < 60 ? `${age}s ago` : `${Math.floor(age / 60)}m ago`;
  const time = at
    ? at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
    : '—';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }} className="muted">
      <span title={at ? at.toISOString() : undefined}>
        {live ? 'Live · ' : ''}Updated <strong style={{ color: 'var(--text-primary)' }}>{time} IST</strong> ({ageLabel})
      </span>
      {error ? <span style={{ color: '#FBBF24' }}>· last refresh failed, showing older data</span> : null}
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw size={12} className={refreshing ? 'spin' : ''} />}
          onClick={onRefresh}
          disabled={refreshing}
        >
          Refresh
        </Button>
      )}
    </div>
  );
}
