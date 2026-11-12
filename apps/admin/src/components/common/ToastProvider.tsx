'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
  closing?: boolean;
}

interface ToastContextValue {
  showToast: (opts: { tone?: ToastTone; title?: string; message: string; durationMs?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 180);
  }, []);

  const showToast = useCallback(
    ({
      tone = 'info',
      title,
      message,
      durationMs = 4200,
    }: {
      tone?: ToastTone;
      title?: string;
      message: string;
      durationMs?: number;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, tone, title, message }]);
      if (durationMs > 0) {
        setTimeout(() => dismiss(id), durationMs);
      }
    },
    [dismiss]
  );

  const api = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, title) => showToast({ tone: 'success', title, message }),
      error: (message, title) => showToast({ tone: 'error', title, message, durationMs: 5500 }),
      warning: (message, title) => showToast({ tone: 'warning', title, message }),
      info: (message, title) => showToast({ tone: 'info', title, message }),
    }),
    [showToast]
  );

  const toneStyle: Record<ToastTone, { border: string; accent: string; bg: string; icon: React.ReactNode }> = {
    success: {
      border: 'var(--color-success-border)',
      accent: 'var(--color-success)',
      bg: 'var(--color-success-bg)',
      icon: <CheckCircle2 size={16} />,
    },
    error: {
      border: 'var(--color-danger-border)',
      accent: 'var(--color-danger)',
      bg: 'var(--color-danger-bg)',
      icon: <AlertCircle size={16} />,
    },
    warning: {
      border: 'var(--color-warning-border)',
      accent: 'var(--color-warning)',
      bg: 'var(--color-warning-bg)',
      icon: <AlertTriangle size={16} />,
    },
    info: {
      border: 'var(--color-info-border)',
      accent: 'var(--color-info)',
      bg: 'var(--color-info-bg)',
      icon: <Info size={16} />,
    },
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '68px',
            right: '1.25rem',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            maxWidth: '380px',
            width: 'calc(100vw - 2rem)',
            pointerEvents: 'none',
          }}
        >
          {toasts.map((t) => {
            const st = toneStyle[t.tone];
            return (
              <div
                key={t.id}
                className={t.closing ? 'animate-toast-out' : 'animate-toast'}
                style={{
                  pointerEvents: 'auto',
                  background: 'var(--bg-surface)',
                  border: `1px solid ${st.border}`,
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-elevated)',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                }}
              >
                <span
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: 'var(--radius-md)',
                    background: st.bg,
                    color: st.accent,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {st.icon}
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {t.title && (
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t.title}
                    </div>
                  )}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {t.message}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Close toast"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.15rem',
                    display: 'inline-flex',
                  }}
                >
                  <X size={14} />
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
  };
}

