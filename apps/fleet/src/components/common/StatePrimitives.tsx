'use client';

import React from 'react';

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="fleet-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
    <p style={{ margin: '0.45rem auto 0', maxWidth: '420px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
      {description}
    </p>
    {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
  </div>
);

export const ErrorState: React.FC<{
  message: string;
  onRetry?: () => void;
}> = ({ message, onRetry }) => (
  <div
    className="fleet-card"
    style={{
      borderColor: 'var(--color-danger)',
      background: 'var(--color-danger-bg)',
      color: 'var(--color-danger)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      flexWrap: 'wrap',
    }}
  >
    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{message}</span>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: '0.45rem 0.9rem',
          borderRadius: '8px',
          border: '1px solid var(--color-danger)',
          background: '#ffffff',
          color: 'var(--color-danger)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    )}
  </div>
);

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const normalized = (status || '').toUpperCase();
  const isSuccess = ['ACTIVE', 'VERIFIED', 'COMPLETED', 'SETTLED', 'RESOLVED', 'QUALIFIED'].includes(normalized);
  const isWarn = ['PENDING', 'UNDER_REVIEW', 'REQUESTED', 'PAUSED', 'IN_PROGRESS', 'ON_TRIP'].includes(normalized);
  const bg = isSuccess ? 'var(--color-success-bg)' : isWarn ? 'var(--color-warning-bg)' : 'var(--bg-surface-muted)';
  const fg = isSuccess ? 'var(--color-success)' : isWarn ? 'var(--color-warning)' : 'var(--text-secondary)';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.2rem 0.55rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: bg,
        color: fg,
      }}
    >
      {normalized.replace(/_/g, ' ')}
    </span>
  );
};

export const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ isOpen, title, description, confirmLabel = 'Confirm', isLoading, onConfirm, onClose }) => {
  if (!isOpen) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        zIndex: 100,
      }}
    >
      <div className="fleet-card" style={{ maxWidth: '420px', width: '100%' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: '0.6rem 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '0.5rem 0.95rem',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--brand-primary)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
