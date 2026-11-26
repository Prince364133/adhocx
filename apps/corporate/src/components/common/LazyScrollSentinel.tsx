'use client';

import React from 'react';
import { SkeletonBone } from '@adhocx/ui/page-loading';

interface LazyScrollSentinelProps {
  sentinelRef: React.RefObject<HTMLDivElement>;
  hasMore: boolean;
  loadingMore?: boolean;
  error?: string | null;
  onRetry?: () => void;
  label?: string;
}

export function LazyScrollSentinel({
  sentinelRef,
  hasMore,
  loadingMore = false,
  error = null,
  onRetry,
  label = 'Loading more items…',
}: LazyScrollSentinelProps) {
  if (!hasMore && !loadingMore && !error) return null;

  return (
    <div
      ref={sentinelRef}
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minHeight: 36,
        padding: '10px 16px',
        borderTop: '1px solid var(--border-subtle)',
        color: 'var(--text-muted)',
        fontSize: 12,
      }}
    >
      {error ? (
        <>
          <span>{error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                border: '1px solid var(--border-strong)',
                borderRadius: 6,
                padding: '4px 10px',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          )}
        </>
      ) : (
        <>
          <SkeletonBone style={{ width: 140, height: 10, borderRadius: 999 }} />
          {loadingMore && <span>{label}</span>}
        </>
      )}
    </div>
  );
}

export default LazyScrollSentinel;
