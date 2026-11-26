'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  enabled: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
}

/**
 * Invokes `onLoadMore` when the returned sentinel element enters the viewport.
 */
export function useInfiniteScroll({
  enabled,
  onLoadMore,
  rootMargin = '200px',
}: UseInfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!enabled || !node) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}

/**
 * Incrementally reveals slices of a client-side list as the user scrolls.
 * Pass a primitive `resetKey` (e.g. concatenated active filters) to reset back to the first batch.
 */
export function useLazySlice<T>(
  items: readonly T[],
  resetKey: string | number | boolean = '',
  batchSize = 20,
) {
  const [visibleCount, setVisibleCount] = useState(batchSize);

  useEffect(() => {
    setVisibleCount(batchSize);
  }, [resetKey, batchSize]);

  const effectiveCount = Math.min(items.length, visibleCount);
  const hasMore = effectiveCount < items.length;

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(items.length, current + batchSize));
  }, [items.length, batchSize]);

  const sentinelRef = useInfiniteScroll({
    enabled: hasMore,
    onLoadMore: loadMore,
  });

  const visibleItems = useMemo(
    () => items.slice(0, effectiveCount),
    [items, effectiveCount],
  );

  return {
    visibleItems,
    hasMore,
    totalCount: items.length,
    visibleCount: effectiveCount,
    loadMore,
    sentinelRef,
  };
}
