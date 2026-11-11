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
    <div className="empty-state" style={{ padding: '1.75rem 1rem 1.6rem', textAlign: 'center' }}>
      <div
        className="empty-state-icon"
        style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 0.65rem',
          color: 'var(--text-muted)',
        }}
      >
        {icon || <Inbox size={18} />}
      </div>
      <h3
        className="empty-state-title"
        style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.24rem' }}
      >
        {title}
      </h3>
      <p
        className="empty-state-desc"
        style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 0.85rem', lineHeight: 1.45 }}
      >
        {description}
      </p>
      {action && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
