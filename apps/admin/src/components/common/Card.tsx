import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'accent';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'lg',
  className = '',
  style,
  ...props
}) => {
  const getPaddingStyles = (): React.CSSProperties => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'sm':
        return { padding: '0.75rem' };
      case 'md':
        return { padding: '1rem' };
      case 'xl':
        return { padding: '2rem' };
      case 'lg':
      default:
        return { padding: '1.5rem' };
    }
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'elevated':
        return {
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-elevated)',
        };
      case 'interactive':
        return {
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        };
      case 'accent':
        return {
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderTop: '3px solid var(--brand-primary)',
          boxShadow: 'var(--shadow-card)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        };
      case 'default':
      default:
        return {
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-card)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        };
    }
  };

  return (
    <div
      className={`card ${className}`}
      style={{
        borderRadius: 'var(--radius-xl)',
        ...getVariantStyles(),
        ...getPaddingStyles(),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (variant === 'interactive') {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.borderColor = 'var(--brand-primary)';
          e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'interactive') {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};
