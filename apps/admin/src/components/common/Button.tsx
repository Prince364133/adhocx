'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  style = {},
  ...props
}) => {
  const activeLoading = isLoading || loading;
  const isDisabled = disabled || activeLoading;

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0.28rem 0.62rem', fontSize: '0.725rem', minHeight: '27px' },
    md: { padding: '0.38rem 0.8rem', fontSize: '0.775rem', minHeight: '32px' },
    lg: { padding: '0.5rem 1rem', fontSize: '0.825rem', minHeight: '36px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--brand-primary)',
      color: '#ffffff',
      border: '1px solid var(--brand-primary)',
      boxShadow: 'var(--shadow-sm)',
    },
    secondary: {
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--brand-primary)',
      border: '1px solid var(--brand-primary-border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
    },
    danger: {
      background: 'var(--color-danger-bg)',
      color: 'var(--color-danger)',
      border: '1px solid var(--color-danger-border)',
    },
    success: {
      background: 'var(--color-success-bg)',
      color: 'var(--color-success)',
      border: '1px solid var(--color-success-border)',
    },
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) return;
    if (variant === 'primary') {
      e.currentTarget.style.background = 'var(--brand-primary-hover)';
      e.currentTarget.style.borderColor = 'var(--brand-primary-hover)';
    } else if (variant === 'secondary') {
      e.currentTarget.style.background = 'var(--bg-surface-elevated)';
      e.currentTarget.style.borderColor = 'var(--border-light)';
    } else if (variant === 'outline') {
      e.currentTarget.style.background = 'var(--brand-primary-subtle)';
    } else if (variant === 'ghost') {
      e.currentTarget.style.background = 'var(--bg-surface-elevated)';
      e.currentTarget.style.color = 'var(--text-primary)';
    } else if (variant === 'danger') {
      e.currentTarget.style.background = 'var(--color-danger)';
      e.currentTarget.style.borderColor = 'var(--color-danger)';
      e.currentTarget.style.color = '#ffffff';
    } else if (variant === 'success') {
      e.currentTarget.style.background = 'var(--color-success)';
      e.currentTarget.style.borderColor = 'var(--color-success)';
      e.currentTarget.style.color = '#ffffff';
    }
    props.onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      const base = variantStyles[variant];
      if (base) {
        e.currentTarget.style.background = String(base.background || '');
        e.currentTarget.style.color = String(base.color || '');
        if (base.border) e.currentTarget.style.border = String(base.border);
      }
    }
    props.onMouseLeave?.(e);
  };

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`btn btn-${variant} ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem',
        fontWeight: 600,
        borderRadius: 'var(--radius-md)',
        width: fullWidth ? '100%' : undefined,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.58 : 1,
        transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.1s ease',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
    >
      {activeLoading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        leftIcon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{leftIcon}</span>
      )}
      {children}
      {!activeLoading && rightIcon && (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{rightIcon}</span>
      )}
    </button>
  );
};
