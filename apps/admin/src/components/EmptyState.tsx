import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="empty-state" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <div
        className="empty-state-icon"
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius-xl)',
          backgroundColor: 'var(--bg-card-elevated)',
          color: 'var(--text-muted)',
          marginBottom: '1rem',
        }}
      >
        {icon || <Inbox size={28} />}
      </div>
      <h3 className="empty-state-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
        {title}
      </h3>
      <p className="empty-state-desc" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
        {description}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="btn btn-secondary btn-sm"
          style={{
            padding: '0.45rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
