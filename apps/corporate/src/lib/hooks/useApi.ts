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
 * Polling automatically pauses when `document.hidden` is true, refreshes when
 * the tab becomes visible again, skips overlapping in-flight polls, and aborts /
 * ignores stale responses on unmount or dependency changes.
 * A failed poll keeps the last data on screen and exposes the error, so a screen can show
 * "last updated" plus a stale warning instead of going blank.
 */
export function useApi<T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
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
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      seq.current += 1;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      inFlightRef.current = false;
    };
  }, []);

  const execute = useCallback(async (opts?: { isPoll?: boolean }) => {
    if (!enabled) return;
    const isPoll = opts?.isPoll ?? false;
    if (isPoll && inFlightRef.current) return;
    if (isPoll && typeof document !== 'undefined' && document.hidden) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const id = ++seq.current;
    inFlightRef.current = true;
    if (hasData.current) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await fetcherRef.current(controller.signal);
      if (!mountedRef.current || id !== seq.current || controller.signal.aborted) return;
      setData(result);
      hasData.current = true;
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current || id !== seq.current || controller.signal.aborted) return;
      setError(err);
    } finally {
      if (id === seq.current) {
        inFlightRef.current = false;
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }
  }, [enabled]);

  const reload = useCallback(() => execute({ isPoll: false }), [execute]);

  useEffect(() => {
    hasData.current = false;
    setData(null);
    setError(null);
    setLastUpdated(null);
    if (!enabled) {
      setLoading(false);
      return () => {
        seq.current += 1;
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        inFlightRef.current = false;
      };
    }

    void execute({ isPoll: false });

    if (!pollMs) {
      return () => {
        seq.current += 1;
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;
        inFlightRef.current = false;
      };
    }

    let timer: ReturnType<typeof setInterval> | null = null;
    const stopPolling = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const startPolling = () => {
      stopPolling();
      if (typeof document !== 'undefined' && document.hidden) return;
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        void execute({ isPoll: true });
      }, pollMs);
    };
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        stopPolling();
      } else {
        void execute({ isPoll: true });
        startPolling();
      }
    };

    startPolling();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      seq.current += 1;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      inFlightRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, pollMs, execute]);

  return { data, error, loading, refreshing, lastUpdated, reload };
}
