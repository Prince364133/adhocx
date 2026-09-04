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
        background: 'var(--bg-surface-elevated, #1E293B)',
        border: '1.5px solid rgba(99, 102, 241, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: `${size * 0.46}px`,
        fontFamily: "'Inter', sans-serif",
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
        flexShrink: 0,
      }}
    >
      <span style={{ color: '#FFFFFF', fontWeight: 800 }}>A</span>
      <span
        style={{
          background: 'linear-gradient(135deg, #38BDF8 0%, #818CF8 50%, #6366F1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 900,
        }}
      >
        X
      </span>
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
          fontWeight: 800,
          fontSize: `${(size / 36) * 1.5}rem`,
          letterSpacing: '-0.03em',
          display: 'flex',
          alignItems: 'center',
          lineHeight: 1,
        }}
      >
        <span style={{ color: 'var(--text-primary, #F8FAFC)' }}>Adhoc</span>
        <span
          style={{
            background: 'linear-gradient(135deg, #38BDF8 0%, #818CF8 40%, #6366F1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 900,
          }}
        >
          X
        </span>
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: `${(size / 36) * 0.65}rem`,
            color: 'var(--text-muted, #94A3B8)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontWeight: 600,
            marginTop: '0.25rem',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
