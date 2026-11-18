'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  tone?: ToastTone;
  title?: string;
  message: string;
  durationMs?: number;
}

interface ToastItem {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
  closing?: boolean;
}

interface ToastContextValue {
  showToast: (opts: ToastOptions) => void;
  success: (message: string, title?: string, id?: string) => void;
  error: (message: string, title?: string, id?: string) => void;
  warning: (message: string, title?: string, id?: string) => void;
  info: (message: string, title?: string, id?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_CONFIG: Record<
  ToastTone,
  { border: string; accent: string; bg: string; icon: React.ReactNode; role: 'alert' | 'status' }
> = {
  success: {
    border: 'var(--color-success-border, #86EFAC)',
    accent: 'var(--color-success, #16A34A)',
    bg: 'var(--color-success-bg, #DCFCE7)',
    icon: <CheckCircle2 size={16} />,
    role: 'status',
  },
  error: {
    border: 'var(--color-danger-border, #FCA5A5)',
    accent: 'var(--color-danger, #DC2626)',
    bg: 'var(--color-danger-bg, #FEE2E2)',
    icon: <AlertCircle size={16} />,
    role: 'alert',
  },
  warning: {
    border: 'var(--color-warning-border, #FEC98E)',
    accent: 'var(--color-warning, #EE9811)',
    bg: 'var(--color-warning-bg, #FFFBF7)',
    icon: <AlertTriangle size={16} />,
    role: 'alert',
  },
  info: {
    border: 'var(--color-info-border, #B794F4)',
    accent: 'var(--color-info, #5728B2)',
    bg: 'var(--color-info-bg, #F3E8FF)',
    icon: <Info size={16} />,
    role: 'status',
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const removeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimersFor = useCallback((id: string) => {
    const activeTimer = timersRef.current.get(id);
    if (activeTimer) {
      clearTimeout(activeTimer);
      timersRef.current.delete(id);
    }
    const removeTimer = removeTimersRef.current.get(id);
    if (removeTimer) {
      clearTimeout(removeTimer);
      removeTimersRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const activeTimers = timersRef.current;
    const removeTimers = removeTimersRef.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      removeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
      removeTimers.clear();
    };
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimersFor(id);
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
      const removeTimer = setTimeout(() => {
        removeTimersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 200);
      removeTimersRef.current.set(id, removeTimer);
    },
    [clearTimersFor],
  );

  const showToast = useCallback(
    ({ id, tone = 'info', title, message, durationMs = 5000 }: ToastOptions) => {
      const toastId = id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      clearTimersFor(toastId);

      setToasts((prev) => {
        const filtered = prev.filter((item) => item.id !== toastId);
        return [...filtered.slice(-3), { id: toastId, tone, title, message, closing: false }];
      });

      if (durationMs > 0) {
        const timer = setTimeout(() => dismiss(toastId), durationMs);
        timersRef.current.set(toastId, timer);
      }
    },
    [clearTimersFor, dismiss],
  );

  const api = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismiss,
      success: (message, title, id) =>
        showToast({ id, tone: 'success', title, message, durationMs: 4200 }),
      error: (message, title, id) =>
        showToast({ id, tone: 'error', title, message, durationMs: 6000 }),
      warning: (message, title, id) =>
        showToast({ id, tone: 'warning', title, message, durationMs: 6000 }),
      info: (message, title, id) =>
        showToast({ id, tone: 'info', title, message, durationMs: 4500 }),
    }),
    [showToast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="false"
          style={{
            position: 'fixed',
            top: '72px',
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '420px',
            width: 'calc(100vw - 32px)',
            pointerEvents: 'none',
          }}
        >
          {toasts.map((toast) => {
            const st = TONE_CONFIG[toast.tone];
            return (
              <div
                key={toast.id}
                role={st.role}
                className={toast.closing ? 'ops-toast-out' : 'ops-toast-in'}
                style={{
                  pointerEvents: 'auto',
                  backgroundColor: 'var(--bg-surface, #FFFFFF)',
                  border: `1px solid ${st.border}`,
                  borderLeft: `4px solid ${st.accent}`,
                  borderRadius: 'var(--radius-lg, 10px)',
                  boxShadow: 'var(--shadow-elevated, 0 10px 15px -3px rgba(0, 0, 0, 0.12))',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-sm, 6px)',
                    backgroundColor: st.bg,
                    color: st.accent,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  {st.icon}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {toast.title && (
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--text-primary, #191B1C)',
                        lineHeight: 1.35,
                        marginBottom: '2px',
                      }}
                    >
                      {toast.title}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--text-secondary, #595F61)',
                      lineHeight: 1.45,
                    }}
                  >
                    {toast.message}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #94A3B8)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    borderRadius: '4px',
                    flexShrink: 0,
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return {
    showToast: () => {},
    success: () => {},
    error: () => {},
    warning: () => {},
    info: () => {},
    dismiss: () => {},
  };
}
