'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ApiState<T> {
  data: T | null;
  error: unknown;
  /** First load (no data yet). */
  loading: boolean;
  /** Reload while data is already shown. */
  refreshing: boolean;
  /** When the last successful response arrived. */
  lastUpdated: Date | null;
  reload: () => Promise<void>;
}

/**
 * Loads `fetcher` whenever `deps` change, optionally polling every `pollMs`.
 * Pass `enabled: false` to skip the call (e.g. the role lacks the permission).
 * A failed poll keeps the last data on screen and exposes the error, so a screen can show
 * "last updated" plus a stale warning instead of going blank.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: { pollMs?: number; enabled?: boolean } = {},
): ApiState<T> {
  const { pollMs, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const seq = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const hasData = useRef(false);

  const run = useCallback(async () => {
    if (!enabled) return;
    const id = ++seq.current;
    if (hasData.current) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await fetcherRef.current();
      if (id !== seq.current) return;
      setData(result);
      hasData.current = true;
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (id !== seq.current) return;
      setError(err);
    } finally {
      if (id === seq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    hasData.current = false;
    setData(null);
    setError(null);
    setLastUpdated(null);
    if (!enabled) {
      setLoading(false);
      return;
    }
    void run();
    if (!pollMs) return;
    const timer = setInterval(() => void run(), pollMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, pollMs, run]);

  return { data, error, loading, refreshing, lastUpdated, reload: run };
}
