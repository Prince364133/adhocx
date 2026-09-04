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
        borderRadius: '10px',
        background: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: `${size * 0.46}px`,
        fontFamily: "'Inter', sans-serif",
        boxShadow: '0 3px 10px rgba(75, 34, 182, 0.15)',
        flexShrink: 0,
      }}
    >
      <span style={{ color: '#5B42F3', fontWeight: 900 }}>A</span>
      <span style={{ color: '#FF6200', fontWeight: 900 }}>X</span>
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
        <span style={{ color: '#FFFFFF' }}>Adhoc</span>
        <span style={{ color: '#FF6200', fontWeight: 900 }}>X</span>
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: `${(size / 36) * 0.65}rem`,
            color: 'var(--text-muted, #94A3B8)',
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
