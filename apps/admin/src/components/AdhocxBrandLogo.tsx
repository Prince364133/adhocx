import React from 'react';

interface AdhocxBrandLogoProps {
  variant?: 'full' | 'icon';
  size?: number;
  subtitle?: string;
  className?: string;
}

export const AdhocxBrandIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => {
  return (
    <div
      className={className}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9px',
        background: 'linear-gradient(135deg, #6347F9 0%, #4328E0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: `${size * 0.44}px`,
        fontFamily: "'Inter', sans-serif",
        boxShadow: '0 3px 10px rgba(99, 71, 249, 0.25)',
        flexShrink: 0,
        color: '#FFFFFF',
      }}
    >
      <span>A</span>
      <span style={{ color: '#FF6200' }}>X</span>
    </div>
  );
};

export const AdhocxBrandLogo: React.FC<AdhocxBrandLogoProps> = ({
  variant = 'full',
  size = 36,
  subtitle = 'Control Portal',
  className = '',
}) => {
  if (variant === 'icon') {
    return <AdhocxBrandIcon size={size} className={className} />;
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontWeight: 900,
          fontSize: `${(size / 36) * 1.55}rem`,
          letterSpacing: '-0.04em',
          display: 'flex',
          alignItems: 'center',
          lineHeight: 1,
        }}
      >
        <span style={{ color: 'var(--text-primary)' }}>Adhoc</span>
        <span style={{ color: '#FF6200', fontWeight: 900 }}>X</span>
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: `${(size / 36) * 0.65}rem`,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            fontWeight: 700,
            marginTop: '0.25rem',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
