import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to Load Operational Data',
  message,
  onRetry,
}) => {
  return (
    <div
      className="card"
      style={{
        borderColor: 'var(--color-danger-border)',
        backgroundColor: 'var(--color-danger-bg)',
        padding: '2rem',
        textAlign: 'center',
        borderRadius: 'var(--radius-xl)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
        <AlertCircle size={32} color="var(--color-danger)" />
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-danger)', marginBottom: '0.25rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn btn-secondary btn-sm"
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          Retry Operation
        </button>
      )}
    </div>
  );
};
