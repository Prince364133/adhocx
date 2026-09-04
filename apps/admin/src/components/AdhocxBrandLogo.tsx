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
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="adminIconBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0F172A" />
          <stop offset="50%" stopColor="#090E1A" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        <linearGradient id="adminIconBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7C68F5" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#5B42F3" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
        </linearGradient>

        <linearGradient id="adminBladePrimary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="35%" stopColor="#6347F9" />
          <stop offset="70%" stopColor="#5B42F3" />
          <stop offset="100%" stopColor="#3727A6" />
        </linearGradient>

        <linearGradient id="adminBladeUpper" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="40%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#6347F9" />
        </linearGradient>

        <linearGradient id="adminBladeLower" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5B42F3" />
          <stop offset="60%" stopColor="#4328E0" />
          <stop offset="100%" stopColor="#311B92" />
        </linearGradient>

        <filter id="adminShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.5" />
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#5B42F3" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Outer rounded squircle */}
      <rect
        x="16"
        y="16"
        width="480"
        height="480"
        rx="108"
        fill="url(#adminIconBg)"
        stroke="url(#adminIconBorder)"
        strokeWidth="6"
      />

      {/* The X glyph */}
      <g filter="url(#adminShadow)">
        {/* Lower Left Wing */}
        <path
          d="M 226 286 L 140 404 C 134 412 140 424 150 424 L 206 424 C 214 424 222 420 226 414 L 290 326 Z"
          fill="url(#adminBladeLower)"
        />

        {/* Main continuous beam */}
        <path
          d="M 150 88 C 140 88 134 100 140 108 L 362 404 C 368 412 376 416 386 416 L 442 416 C 452 416 458 404 452 396 L 230 100 C 224 92 216 88 206 88 Z"
          fill="url(#adminBladePrimary)"
        />

        {/* Upper Right Wing */}
        <path
          d="M 362 108 L 286 212 L 222 172 L 276 98 C 280 92 288 88 296 88 L 352 88 C 362 88 368 100 362 108 Z"
          fill="url(#adminBladeUpper)"
        />

        {/* Top highlight */}
        <path
          d="M 372 96 L 316 172 L 302 162 L 348 96 C 352 90 358 88 364 88 L 372 88 C 376 88 378 92 372 96 Z"
          fill="#FFFFFF"
          opacity="0.35"
        />

        {/* Energy Core */}
        <polygon points="256,220 286,256 256,292 226,256" fill="#38BDF8" opacity="0.4" />
      </g>
    </svg>
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
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <AdhocxBrandIcon size={size} />
      <div>
        <div
          style={{
            fontWeight: 800,
            fontSize: `${(size / 36) * 1.125}rem`,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1.1,
          }}
        >
          <span style={{ color: 'var(--text-primary, #F8FAFC)' }}>Adhoc</span>
          <span
            style={{
              background: 'linear-gradient(135deg, #38BDF8 0%, #7C68F5 40%, #5B42F3 100%)',
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
              fontSize: `${(size / 36) * 0.6875}rem`,
              color: 'var(--text-muted, #94A3B8)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              marginTop: '0.125rem',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
