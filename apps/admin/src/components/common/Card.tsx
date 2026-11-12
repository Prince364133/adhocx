'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'accent';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  title,
  subtitle,
  actions,
  className = '',
  style = {},
  ...props
}) => {
  const paddingMap = {
    none: '0',
    sm: '0.68rem',
    md: '0.9rem',
    lg: '1.1rem',
    xl: '1.35rem',
  };

  const isInteractive = variant === 'interactive';
  const isElevated = variant === 'elevated';
  const isAccent = variant === 'accent';

  return (
    <div
      {...props}
      className={`card${isInteractive ? ' interactive-card' : ''} ${className}`}
      style={{
        backgroundColor: isElevated ? 'var(--bg-card-elevated)' : 'var(--bg-card)',
        border: isAccent ? '1px solid var(--brand-primary-border)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: paddingMap[padding],
        boxShadow: isElevated ? 'var(--shadow-elevated)' : 'var(--shadow-card)',
        transition: 'border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
        ...style,
      }}
    >
      {(title || subtitle || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: padding === 'none' ? 0 : '0.82rem',
            padding: padding === 'none' ? '1.08rem 1.1rem 0.88rem' : '0.18rem 0 0',
            borderBottom: padding === 'none' ? '1px solid var(--border)' : 'none',
          }}
        >
          <div style={{ minWidth: 0 }}>
            {title && (
              <h3 style={{ margin: 0, fontSize: '1.06rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ margin: '0.18rem 0 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div style={{ flexShrink: 0 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
