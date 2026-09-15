import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  style,
  ...props
}) => {
  const activeLoading = isLoading || loading;
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: 'var(--brand-primary)',
          color: '#ffffff',
          border: '1px solid transparent',
          boxShadow: 'var(--shadow-sm)',
        };
      case 'secondary':
        return {
          background: 'var(--bg-surface-elevated)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-light)',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-light)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid transparent',
        };
      case 'danger':
        return {
          background: 'var(--color-danger)',
          color: '#ffffff',
          border: '1px solid transparent',
        };
      case 'success':
        return {
          background: 'var(--color-success)',
          color: '#ffffff',
          border: '1px solid transparent',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '0.35rem 0.75rem',
          fontSize: '0.8125rem',
          borderRadius: 'var(--radius-sm)',
          gap: '0.375rem',
        };
      case 'lg':
        return {
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
          borderRadius: 'var(--radius-md)',
          gap: '0.625rem',
        };
      case 'md':
      default:
        return {
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          borderRadius: 'var(--radius-md)',
          gap: '0.5rem',
        };
    }
  };

  return (
    <button
      disabled={disabled || activeLoading}
      className={`btn btn-${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontFamily: 'inherit',
        cursor: disabled || activeLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || activeLoading ? 0.6 : 1,
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        textDecoration: 'none',
        userSelect: 'none',
        ...getSizeStyles(),
        ...getVariantStyles(),
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled && !activeLoading) {
          if (variant === 'primary') {
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(91, 66, 243, 0.35)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          } else if (variant === 'danger') {
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(239, 68, 68, 0.3)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          } else if (variant === 'success') {
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 185, 129, 0.3)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          } else {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !activeLoading) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = getVariantStyles().boxShadow || 'none';
        }
      }}
      {...props}
    >
      {activeLoading ? (
        <span
          style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
          }}
        />
      ) : (
        leftIcon && (
          <span
            style={{
              display: 'inline-flex',
              transition: 'transform 0.15s ease',
            }}
          >
            {leftIcon}
          </span>
        )
      )}
      {children}
      {!activeLoading && rightIcon && (
        <span
          style={{
            display: 'inline-flex',
            transition: 'transform 0.15s ease',
          }}
        >
          {rightIcon}
        </span>
      )}
    </button>
  );
};
