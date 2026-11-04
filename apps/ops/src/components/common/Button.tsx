import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  className = '',
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontWeight: 600,
    fontFamily: 'inherit',
    borderRadius: 'var(--radius-md, 8px)',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'all 0.15s ease-in-out',
    border: '1px solid transparent',
    outline: 'none',
    whiteSpace: 'nowrap',
    ...style,
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '4px 10px', fontSize: '12px', height: '28px' },
    md: { padding: '8px 14px', fontSize: '13px', height: '36px' },
    lg: { padding: '10px 18px', fontSize: '14px', height: '42px' },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--brand-blue-500, #1167EE)',
      color: '#FFFFFF',
      borderColor: 'var(--brand-blue-600, #0948AC)',
    },
    secondary: {
      backgroundColor: 'var(--bg-surface-elevated, #111D3D)',
      color: 'var(--text-primary, #F8FAFC)',
      borderColor: 'var(--border-subtle, #1E3060)',
    },
    danger: {
      backgroundColor: 'var(--color-danger, #DC2626)',
      color: '#FFFFFF',
      borderColor: '#B91C1C',
    },
    success: {
      backgroundColor: 'var(--color-success, #16A34A)',
      color: '#FFFFFF',
      borderColor: '#15803D',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--text-primary, #F8FAFC)',
      borderColor: 'var(--border-strong, #2D4685)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-secondary, #94A3B8)',
      borderColor: 'transparent',
    },
  };

  return (
    <button
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
      }}
      disabled={disabled || isLoading}
      className={`ops-btn ${className}`}
      {...props}
    >
      {isLoading ? (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#FFFFFF',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};

