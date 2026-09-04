import React from 'react';

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
    <div className="card" style={{ borderColor: 'var(--color-error-border)', backgroundColor: 'var(--color-error-bg)', padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-error)', marginBottom: '0.25rem' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
        {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm">
          Retry Operation
        </button>
      )}
    </div>
  );
};
